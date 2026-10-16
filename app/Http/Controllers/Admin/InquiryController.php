<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\BlockedBookingDate;
use App\Models\BlockedBookingTimeSlot;
use App\Models\CustomerNotification;
use App\Models\Inquiry;
use App\Models\User;
use App\Services\AdminActivityLogger;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;

class InquiryController extends Controller
{
    private const BOOKING_TIME_SLOTS = [
        '08:00 AM - 11:00 AM',
        '11:00 AM - 02:00 PM',
        '02:00 PM - 05:00 PM',
    ];

    public function index(Request $request)
    {
        $filters = $request->validate([
            'search' => ['nullable', 'string', 'max:120'],
            'status' => ['nullable', 'in:pending,confirmed,in_progress,completed,cancelled'],
            'urgency' => ['nullable', 'in:normal,urgent,emergency'],
        ]);

        $query = Inquiry::with(['user', 'inquirable', 'technician']);

        if (!empty($filters['search'])) {
            $search = $filters['search'];

            $query->where(function ($builder) use ($search) {
                $builder
                    ->where('inquiry_number', 'like', '%' . $search . '%')
                    ->orWhere('customer_name', 'like', '%' . $search . '%')
                    ->orWhere('customer_email', 'like', '%' . $search . '%')
                    ->orWhere('service_type', 'like', '%' . $search . '%');
            });
        }

        if (!empty($filters['status'])) {
            $query->where('status', $filters['status']);
        }

        if (!empty($filters['urgency'])) {
            $query->where('urgency', $filters['urgency']);
        }

        $inquiries = $query
            ->orderByRaw("CASE urgency WHEN 'emergency' THEN 1 WHEN 'urgent' THEN 2 ELSE 3 END")
            ->orderByRaw("CASE status WHEN 'pending' THEN 1 WHEN 'confirmed' THEN 2 WHEN 'in_progress' THEN 3 WHEN 'completed' THEN 4 WHEN 'cancelled' THEN 5 ELSE 6 END")
            ->orderBy('preferred_date')
            ->orderByDesc('created_at')
            ->paginate(10)
            ->withQueryString()
            ->through(function (Inquiry $inquiry) {
                return [
                    'id' => $inquiry->id,
                    'inquiry_number' => $inquiry->inquiry_number,
                    'customer_name' => $inquiry->customer_name,
                    'customer_email' => $inquiry->customer_email,
                    'customer_phone' => $inquiry->customer_phone,
                    'technician' => $inquiry->technician
                        ? [
                            'id' => $inquiry->technician->id,
                            'name' => $inquiry->technician->name,
                            'email' => $inquiry->technician->email,
                        ]
                        : null,
                    'service_type' => $inquiry->service_type,
                    'urgency' => $inquiry->urgency,
                    'preferred_date' => $inquiry->preferred_date?->format('M d, Y'),
                    'preferred_date_value' => $inquiry->preferred_date?->format('Y-m-d'),
                    'preferred_time' => $inquiry->preferred_time,
                    'city' => $inquiry->city,
                    'status' => $inquiry->status,
                    'item_name' => $inquiry->item_name,
                    'created_at' => $inquiry->created_at?->format('M d, Y h:i A'),
                ];
            });

        $technicians = User::where('role', 'technician')
            ->orderBy('name')
            ->get(['id', 'name', 'email'])
            ->values();
            

        return Inertia::render('Admin/Inquiries', [
            'inquiries' => $inquiries,
            'technicians' => $technicians,
            'bookingTimeSlots' => self::BOOKING_TIME_SLOTS,
            'todayDate' => today()->toDateString(),
            'filters' => [
                'search' => $filters['search'] ?? '',
                'status' => $filters['status'] ?? '',
                'urgency' => $filters['urgency'] ?? '',
            ],
        ]);
    }

    public function show(Inquiry $inquiry)
    {
        $inquiry->load(['user', 'inquirable', 'technician']);

        $technicians = User::where('role', 'technician')
            ->orderBy('name')
            ->get(['id', 'name', 'email'])
            ->values();

        return Inertia::render('Admin/InquiryDetails', [
            'inquiry' => [
                'id' => $inquiry->id,
                'inquiry_number' => $inquiry->inquiry_number,
                'item_name' => $inquiry->item_name,
                'item_type' => $inquiry->inquirable_type
                    ? class_basename($inquiry->inquirable_type)
                    : null,
                'item_image' => $inquiry->inquirable?->image,
                'customer_name' => $inquiry->customer_name,
                'customer_phone' => $inquiry->customer_phone,
                'customer_email' => $inquiry->customer_email,
                'technician' => $inquiry->technician
                    ? [
                        'id' => $inquiry->technician->id,
                        'name' => $inquiry->technician->name,
                        'email' => $inquiry->technician->email,
                    ]
                    : null,
                'street_address' => $inquiry->street_address,
                'city' => $inquiry->city,
                'service_type' => $inquiry->service_type,
                'urgency' => $inquiry->urgency,
                'preferred_date' => $inquiry->preferred_date?->format('M d, Y'),
                'preferred_date_value' => $inquiry->preferred_date?->format('Y-m-d'),
                'preferred_time' => $inquiry->preferred_time,
                'notes' => $inquiry->notes,
                'status' => $inquiry->status,
                'created_at' => $inquiry->created_at?->format('M d, Y h:i A'),
                'user_id' => $inquiry->user_id,
            ],
            'technicians' => $technicians,
            'bookingTimeSlots' => self::BOOKING_TIME_SLOTS,
            'todayDate' => today()->toDateString(),
        ]);
    }

    public function assignTechnician(
        Request $request,
        Inquiry $inquiry,
        AdminActivityLogger $activityLogger
    ) {
        $validated = $request->validate([
            'technician_id' => ['nullable', 'integer', 'exists:users,id'],
        ]);

        $technicianId = $validated['technician_id'] ?? null;

        if ($technicianId) {
            $technicianExists = User::where('id', $technicianId)
                ->where('role', 'technician')
                ->exists();

            if (!$technicianExists) {
                return back()->withErrors([
                    'technician_id' => 'Selected user is not a technician.',
                ]);
            }
        }

        if (in_array($inquiry->status, ['confirmed', 'in_progress'], true) && !$technicianId) {
            return back()->withErrors([
                'technician_id' => 'Confirmed and in-progress jobs must have an assigned technician.',
            ]);
        }

        if ($technicianId && in_array($inquiry->status, ['confirmed', 'in_progress'], true)) {
            $technicianHasConflict = Inquiry::query()
                ->where('technician_id', $technicianId)
                ->whereDate('preferred_date', $inquiry->preferred_date)
                ->where('preferred_time', $inquiry->preferred_time)
                ->whereIn('status', ['confirmed', 'in_progress'])
                ->whereKeyNot($inquiry->getKey())
                ->exists();

            if ($technicianHasConflict) {
                return back()->withErrors([
                    'technician_id' => 'This technician is already assigned to another job during that time slot.',
                ]);
            }
        }

        $oldTechnicianId = $inquiry->technician_id;

        if ((int) $oldTechnicianId !== (int) $technicianId) {
            $oldTechnician = $oldTechnicianId ? User::find($oldTechnicianId) : null;
            $newTechnician = $technicianId ? User::find($technicianId) : null;
            $oldTechnicianName = $oldTechnician?->name ?? 'Unassigned';
            $newTechnicianName = $newTechnician?->name ?? 'Unassigned';

            DB::transaction(function () use (
                $request,
                $inquiry,
                $technicianId,
                $oldTechnicianId,
                $oldTechnicianName,
                $newTechnicianName,
                $activityLogger
            ) {
                $inquiry->update([
                    'technician_id' => $technicianId,
                ]);

                $message = $technicianId
                    ? 'A technician has been assigned to your inquiry ' . $inquiry->inquiry_number . '.'
                    : 'The technician assignment for your inquiry ' . $inquiry->inquiry_number . ' has been removed.';

                CustomerNotification::create([
                    'user_id' => $inquiry->user_id,
                    'type' => 'technician_assignment',
                    'title' => 'Technician assignment updated',
                    'message' => $message,
                    'action_url' => route('inquiries.show', $inquiry),
                    'related_type' => Inquiry::class,
                    'related_id' => $inquiry->id,
                ]);

                $activityLogger->record(
                    $request,
                    'inquiry_technician_assigned',
                    "Changed technician assignment for inquiry {$inquiry->inquiry_number} from {$oldTechnicianName} to {$newTechnicianName}.",
                    $inquiry,
                    ['technician_id' => $oldTechnicianId],
                    ['technician_id' => $technicianId]
                );
            });
        }

        return back()->with('success', 'Technician assignment updated successfully.');
    }

    public function confirm(
        Request $request,
        Inquiry $inquiry,
        AdminActivityLogger $activityLogger
    ) {
        if (!in_array($inquiry->status, ['pending', 'confirmed'], true)) {
            return back()->withErrors([
                'status' => 'Only pending inquiries can be confirmed, and completed or cancelled inquiries cannot be rescheduled here.',
            ]);
        }

        $validated = $request->validate([
            'preferred_date' => ['required', 'date_format:Y-m-d', 'after_or_equal:today'],
            'preferred_time' => ['required', 'in:' . implode(',', self::BOOKING_TIME_SLOTS)],
            'technician_id' => ['required', 'integer', 'exists:users,id'],
        ]);

        $technician = User::query()
            ->whereKey($validated['technician_id'])
            ->where('role', 'technician')
            ->first();

        if (!$technician) {
            return back()->withErrors([
                'technician_id' => 'Choose a valid technician account.',
            ]);
        }

        $bookingDate = $validated['preferred_date'];
        $bookingTime = $validated['preferred_time'];

        if (BlockedBookingDate::query()->whereDate('booking_date', $bookingDate)->exists()) {
            return back()->withErrors([
                'preferred_date' => 'This date is marked fully booked. Choose another date.',
            ]);
        }

        if (BlockedBookingTimeSlot::query()
            ->whereDate('booking_date', $bookingDate)
            ->where('booking_time', $bookingTime)
            ->exists()) {
            return back()->withErrors([
                'preferred_time' => 'This time slot is marked fully booked. Choose another time.',
            ]);
        }

        $technicianHasConflict = Inquiry::query()
            ->where('technician_id', $technician->id)
            ->whereDate('preferred_date', $bookingDate)
            ->where('preferred_time', $bookingTime)
            ->whereIn('status', ['confirmed', 'in_progress'])
            ->whereKeyNot($inquiry->getKey())
            ->exists();

        if ($technicianHasConflict) {
            return back()->withErrors([
                'technician_id' => 'This technician already has a job scheduled for that date and time. Choose another technician or time slot.',
            ]);
        }

        $oldStatus = $inquiry->status;
        $oldTechnicianId = $inquiry->technician_id;

        DB::transaction(function () use (
            $request,
            $inquiry,
            $technician,
            $bookingDate,
            $bookingTime,
            $oldStatus,
            $oldTechnicianId,
            $activityLogger
        ) {
            $inquiry->update([
                'preferred_date' => $bookingDate,
                'preferred_time' => $bookingTime,
                'technician_id' => $technician->id,
                'status' => 'confirmed',
            ]);

            CustomerNotification::create([
                'user_id' => $inquiry->user_id,
                'type' => 'inquiry_status',
                'title' => 'Service inquiry confirmed',
                'message' => 'Your inquiry ' . $inquiry->inquiry_number
                    . ' has been confirmed for ' . $inquiry->preferred_date->format('F j, Y')
                    . ' (' . $inquiry->preferred_time . '). Assigned technician: ' . $technician->name . '.',
                'action_url' => route('inquiries.show', $inquiry),
                'related_type' => Inquiry::class,
                'related_id' => $inquiry->id,
            ]);

            $activityLogger->record(
                $request,
                'inquiry_confirmed_and_scheduled',
                "Confirmed inquiry {$inquiry->inquiry_number} for {$bookingDate} {$bookingTime} and assigned technician {$technician->name}.",
                $inquiry,
                [
                    'status' => $oldStatus,
                    'technician_id' => $oldTechnicianId,
                ],
                [
                    'status' => 'confirmed',
                    'technician_id' => $technician->id,
                ]
            );
        });

        return back()->with(
            'success',
            'Inquiry confirmed, schedule saved, and technician assigned successfully.'
        );
    }

    public function updateStatus(
        Request $request,
        Inquiry $inquiry,
        AdminActivityLogger $activityLogger
    ) {
        $validated = $request->validate([
            'status' => ['required', 'in:pending,confirmed,in_progress,completed,cancelled'],
        ]);

        $oldStatus = $inquiry->status;
        $newStatus = $validated['status'];

        if ($newStatus === 'confirmed' && $oldStatus !== 'confirmed') {
            return back()->withErrors([
                'status' => 'Use Confirm & Assign Technician to set the schedule before confirming this inquiry.',
            ]);
        }

        if ($oldStatus === 'pending' && $newStatus === 'in_progress') {
            return back()->withErrors([
                'status' => 'Confirm and schedule this inquiry before marking the job in progress.',
            ]);
        }

        if (in_array($newStatus, ['confirmed', 'in_progress'], true) && !$inquiry->technician_id) {
            return back()->withErrors([
                'status' => 'Assign a technician before confirming or starting this job.',
            ]);
        }

        if ($oldStatus !== $newStatus) {
            DB::transaction(function () use (
                $request,
                $inquiry,
                $oldStatus,
                $newStatus,
                $activityLogger
            ) {
                $inquiry->update([
                    'status' => $newStatus,
                ]);

                CustomerNotification::create([
                    'user_id' => $inquiry->user_id,
                    'type' => 'inquiry_status',
                    'title' => 'Inquiry status updated',
                    'message' => 'Your inquiry ' . $inquiry->inquiry_number . ' is now marked as ' . str_replace('_', ' ', $newStatus) . '.',
                    'action_url' => route('inquiries.show', $inquiry),
                    'related_type' => Inquiry::class,
                    'related_id' => $inquiry->id,
                ]);

                $activityLogger->record(
                    $request,
                    'inquiry_status_updated',
                    "Changed inquiry {$inquiry->inquiry_number} status from {$oldStatus} to {$newStatus}.",
                    $inquiry,
                    ['status' => $oldStatus],
                    ['status' => $newStatus]
                );
            });
        }

        return back()->with('success', 'Inquiry status updated successfully.');
    }
}
