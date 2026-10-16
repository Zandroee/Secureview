<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\BlockedBookingDate;
use App\Models\BlockedBookingTimeSlot;
use App\Models\CustomerNotification;
use App\Models\Inquiry;
use App\Models\User;
use App\Services\AdminActivityLogger;
use App\Services\JobNotificationService;
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

        $query = Inquiry::with(['user', 'inquirable', 'technician', 'technicians']);

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
                    'technicians' => $inquiry->technicians->map(fn (User $technician) => [
                        'id' => $technician->id,
                        'name' => $technician->name,
                        'email' => $technician->email,
                        'is_lead' => (bool) $technician->pivot->is_lead,
                    ])->values(),
                    'accepting_technician_signups' => (bool) $inquiry->accepting_technician_signups,
                    'max_technicians' => (int) ($inquiry->max_technicians ?? 3),
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
        $inquiry->load(['user', 'inquirable', 'technician', 'technicians']);

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
                'technicians' => $inquiry->technicians->map(fn (User $technician) => [
                    'id' => $technician->id,
                    'name' => $technician->name,
                    'email' => $technician->email,
                    'is_lead' => (bool) $technician->pivot->is_lead,
                ])->values(),
                'accepting_technician_signups' => (bool) $inquiry->accepting_technician_signups,
                'max_technicians' => (int) ($inquiry->max_technicians ?? 3),
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
        AdminActivityLogger $activityLogger,
        JobNotificationService $notifications
    ) {
        $validated = $request->validate([
            'technician_id' => ['nullable', 'integer', 'exists:users,id'],
        ]);

        $technicianId = $validated['technician_id'] ?? null;

        if ($technicianId && !User::whereKey($technicianId)->where('role', 'technician')->exists()) {
            return back()->withErrors([
                'technician_id' => 'Selected user is not a technician.',
            ]);
        }

        if (in_array($inquiry->status, ['confirmed', 'in_progress'], true) && !$technicianId) {
            return back()->withErrors([
                'technician_id' => 'Confirmed and in-progress jobs must have an assigned technician.',
            ]);
        }

        if ($technicianId && in_array($inquiry->status, ['confirmed', 'in_progress'], true)) {
            $technicianHasConflict = Inquiry::query()
                ->whereDate('preferred_date', $inquiry->preferred_date)
                ->where('preferred_time', $inquiry->preferred_time)
                ->whereIn('status', ['confirmed', 'in_progress'])
                ->where('id', '!=', $inquiry->getKey())
                ->where(function ($query) use ($technicianId) {
                    $query->where('technician_id', $technicianId)
                        ->orWhereHas('technicians', fn ($team) => $team->where('users.id', $technicianId));
                })
                ->exists();

            if ($technicianHasConflict) {
                return back()->withErrors([
                    'technician_id' => 'This technician is already assigned to another job during that time slot.',
                ]);
            }
        }

        $oldTechnicianId = $inquiry->technician_id;
        if ((int) $oldTechnicianId === (int) $technicianId) {
            return back();
        }

        DB::transaction(function () use ($request, $inquiry, $technicianId, $oldTechnicianId, $activityLogger) {
            $inquiry->update(['technician_id' => $technicianId]);

            if ($technicianId) {
                $inquiry->technicians()->sync([
                    $technicianId => [
                        'is_lead' => true,
                        'assignment_source' => 'admin',
                        'assigned_by' => $request->user()->id,
                    ],
                ]);
            } else {
                $inquiry->technicians()->detach();
            }

            $activityLogger->record(
                $request,
                'inquiry_technician_assigned',
                "Changed lead technician for inquiry {$inquiry->inquiry_number}.",
                $inquiry,
                ['technician_id' => $oldTechnicianId],
                ['technician_id' => $technicianId]
            );
        });

        $inquiry->load('technicians');
        $notifications->notifyJobParticipants(
            $inquiry,
            'schedule',
            'Technician assignment updated',
            'The technician team for inquiry ' . $inquiry->inquiry_number . ' has been updated.',
            'inquiry:' . $inquiry->id . ':legacy-team-update:' . now()->timestamp,
            true
        );

        return back()->with('success', 'Technician assignment updated successfully.');
    }

    public function confirm(
        Request $request,
        Inquiry $inquiry,
        AdminActivityLogger $activityLogger,
        JobNotificationService $notifications
    ) {
        if ($inquiry->status !== 'pending') {
            return back()->withErrors([
                'status' => 'Only pending inquiries can use the confirmation workflow.',
            ]);
        }

        $validated = $request->validate([
            'preferred_date' => ['required', 'date_format:Y-m-d', 'after_or_equal:today'],
            'preferred_time' => ['required', 'in:' . implode(',', self::BOOKING_TIME_SLOTS)],
            'technician_ids' => ['required', 'array', 'min:1', 'max:8'],
            'technician_ids.*' => ['required', 'integer', 'distinct', 'exists:users,id'],
            'lead_technician_id' => ['required', 'integer', 'exists:users,id'],
            'accepting_technician_signups' => ['required', 'boolean'],
            'max_technicians' => ['required', 'integer', 'min:1', 'max:8'],
        ]);

        $technicianIds = array_map('intval', $validated['technician_ids']);
        $leadTechnicianId = (int) $validated['lead_technician_id'];

        if (!in_array($leadTechnicianId, $technicianIds, true)) {
            return back()->withErrors([
                'lead_technician_id' => 'The lead technician must be part of the assigned team.',
            ]);
        }

        if ($validated['max_technicians'] < count($technicianIds)) {
            return back()->withErrors([
                'max_technicians' => 'The team limit cannot be lower than the number of assigned technicians.',
            ]);
        }

        $technicians = User::query()
            ->whereIn('id', $technicianIds)
            ->where('role', 'technician')
            ->get();

        if ($technicians->count() !== count($technicianIds)) {
            return back()->withErrors([
                'technician_ids' => 'Choose only valid technician accounts.',
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
            ->whereDate('preferred_date', $bookingDate)
            ->where('preferred_time', $bookingTime)
            ->whereIn('status', ['confirmed', 'in_progress'])
            ->where('id', '!=', $inquiry->getKey())
            ->where(function ($query) use ($technicianIds) {
                $query->whereIn('technician_id', $technicianIds)
                    ->orWhereHas('technicians', fn ($team) => $team->whereIn('users.id', $technicianIds));
            })
            ->exists();

        if ($technicianHasConflict) {
            return back()->withErrors([
                'technician_ids' => 'At least one selected technician already has a job in this time slot. Choose a different technician or time.',
            ]);
        }

        $oldStatus = $inquiry->status;
        $oldTechnicianId = $inquiry->technician_id;

        DB::transaction(function () use (
            $request,
            $inquiry,
            $technicianIds,
            $leadTechnicianId,
            $bookingDate,
            $bookingTime,
            $validated,
            $oldStatus,
            $oldTechnicianId,
            $activityLogger
        ) {
            $inquiry->update([
                'preferred_date' => $bookingDate,
                'preferred_time' => $bookingTime,
                'technician_id' => $leadTechnicianId,
                'accepting_technician_signups' => (bool) $validated['accepting_technician_signups'],
                'max_technicians' => (int) $validated['max_technicians'],
                'status' => 'confirmed',
            ]);

            $pivotRows = [];
            foreach ($technicianIds as $technicianId) {
                $pivotRows[$technicianId] = [
                    'is_lead' => $technicianId === $leadTechnicianId,
                    'assignment_source' => 'admin',
                    'assigned_by' => $request->user()->id,
                ];
            }
            $inquiry->technicians()->sync($pivotRows);

            $activityLogger->record(
                $request,
                'inquiry_confirmed_and_scheduled',
                "Confirmed inquiry {$inquiry->inquiry_number} for {$bookingDate} {$bookingTime} with " . count($technicianIds) . " technician(s).",
                $inquiry,
                [
                    'status' => $oldStatus,
                    'technician_id' => $oldTechnicianId,
                ],
                [
                    'status' => 'confirmed',
                    'technician_id' => $leadTechnicianId,
                ]
            );
        });

        $inquiry->load('technicians');
        $teamNames = $inquiry->technicians->pluck('name')->implode(', ');
        $message = 'Inquiry ' . $inquiry->inquiry_number . ' is confirmed for '
            . $inquiry->preferred_date->format('F j, Y') . ' (' . $inquiry->preferred_time
            . '). Assigned team: ' . $teamNames . '.';

        $notifications->notifyJobParticipants(
            $inquiry,
            'schedule',
            'Service job confirmed',
            $message,
            'inquiry:' . $inquiry->id . ':confirmed',
            true
        );

        return back()->with(
            'success',
            'Inquiry confirmed, schedule saved, and the technician team assigned successfully.'
        );
    }

    public function updateTechnicians(
        Request $request,
        Inquiry $inquiry,
        AdminActivityLogger $activityLogger,
        JobNotificationService $notifications
    ) {
        if (!in_array($inquiry->status, ['confirmed', 'in_progress'], true)) {
            return back()->withErrors([
                'status' => 'Only confirmed or in-progress jobs can have their team updated here.',
            ]);
        }

        $validated = $request->validate([
            'technician_ids' => ['required', 'array', 'min:1', 'max:8'],
            'technician_ids.*' => ['required', 'integer', 'distinct', 'exists:users,id'],
            'lead_technician_id' => ['required', 'integer', 'exists:users,id'],
            'accepting_technician_signups' => ['required', 'boolean'],
            'max_technicians' => ['required', 'integer', 'min:1', 'max:8'],
        ]);

        $technicianIds = array_map('intval', $validated['technician_ids']);
        $leadTechnicianId = (int) $validated['lead_technician_id'];

        if (!in_array($leadTechnicianId, $technicianIds, true)) {
            return back()->withErrors([
                'lead_technician_id' => 'The lead technician must be part of the assigned team.',
            ]);
        }

        if ($validated['max_technicians'] < count($technicianIds)) {
            return back()->withErrors([
                'max_technicians' => 'The team limit cannot be lower than the number of assigned technicians.',
            ]);
        }

        $validTechnicianCount = User::query()
            ->whereIn('id', $technicianIds)
            ->where('role', 'technician')
            ->count();

        if ($validTechnicianCount !== count($technicianIds)) {
            return back()->withErrors([
                'technician_ids' => 'Choose only valid technician accounts.',
            ]);
        }

        $conflict = Inquiry::query()
            ->whereDate('preferred_date', $inquiry->preferred_date)
            ->where('preferred_time', $inquiry->preferred_time)
            ->whereIn('status', ['confirmed', 'in_progress'])
            ->where('id', '!=', $inquiry->getKey())
            ->where(function ($query) use ($technicianIds) {
                $query->whereIn('technician_id', $technicianIds)
                    ->orWhereHas('technicians', fn ($team) => $team->whereIn('users.id', $technicianIds));
            })
            ->exists();

        if ($conflict) {
            return back()->withErrors([
                'technician_ids' => 'At least one selected technician already has a conflicting job at this time.',
            ]);
        }

        DB::transaction(function () use ($request, $inquiry, $technicianIds, $leadTechnicianId, $validated, $activityLogger) {
            $inquiry->update([
                'technician_id' => $leadTechnicianId,
                'accepting_technician_signups' => (bool) $validated['accepting_technician_signups'],
                'max_technicians' => (int) $validated['max_technicians'],
            ]);

            $pivotRows = [];
            foreach ($technicianIds as $technicianId) {
                $pivotRows[$technicianId] = [
                    'is_lead' => $technicianId === $leadTechnicianId,
                    'assignment_source' => 'admin',
                    'assigned_by' => $request->user()->id,
                ];
            }
            $inquiry->technicians()->sync($pivotRows);

            $activityLogger->record(
                $request,
                'inquiry_technician_assigned',
                "Updated technician team for inquiry {$inquiry->inquiry_number}.",
                $inquiry,
                ['technician_id' => null],
                ['technician_id' => $leadTechnicianId]
            );
        });

        $inquiry->load('technicians');
        $notifications->notifyJobParticipants(
            $inquiry,
            'schedule',
            'Technician team updated',
            'The technician team for inquiry ' . $inquiry->inquiry_number . ' has been updated.',
            'inquiry:' . $inquiry->id . ':team-updated:' . now()->timestamp,
            true
        );

        return back()->with('success', 'Technician team updated successfully.');
    }

    public function updateStatus(
        Request $request,
        Inquiry $inquiry,
        AdminActivityLogger $activityLogger,
        JobNotificationService $notifications
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

        if (in_array($oldStatus, ['confirmed', 'in_progress'], true) && $newStatus === 'pending') {
            return back()->withErrors([
                'status' => 'An active scheduled job cannot be moved back to pending. Cancel the inquiry if the service will not proceed.',
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

        if ($oldStatus !== $newStatus && in_array($newStatus, ['in_progress', 'completed', 'cancelled'], true)) {
            $inquiry->load('technicians');
            $label = str_replace('_', ' ', $newStatus);
            $notifications->notifyJobParticipants(
                $inquiry,
                'schedule',
                'Service job ' . ucfirst($label),
                'Inquiry ' . $inquiry->inquiry_number . ' is now ' . $label . '.',
                'inquiry:' . $inquiry->id . ':status:' . $newStatus . ':' . now()->timestamp,
                true
            );
        }

        return back()->with('success', 'Inquiry status updated successfully.');
    }
}
