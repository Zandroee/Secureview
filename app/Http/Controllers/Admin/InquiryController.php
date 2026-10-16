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
use Illuminate\Validation\ValidationException;
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
                    'allow_additional_technicians' => $inquiry->allow_additional_technicians,
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
                'allow_additional_technicians' => $inquiry->allow_additional_technicians,
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
        JobNotificationService $jobNotifications
    ) {
        $validated = $request->validate([
            'technician_ids' => ['sometimes', 'array', 'max:10'],
            'technician_ids.*' => ['required', 'integer', 'distinct', 'exists:users,id'],
            'lead_technician_id' => ['nullable', 'integer', 'exists:users,id'],
            'technician_id' => ['nullable', 'integer', 'exists:users,id'],
            'allow_additional_technicians' => ['sometimes', 'boolean'],
        ]);

        $technicianIds = array_map('intval', $validated['technician_ids'] ?? []);
        if (!$technicianIds && !empty($validated['technician_id'])) {
            $technicianIds = [(int) $validated['technician_id']];
        }

        if (in_array($inquiry->status, ['confirmed', 'in_progress'], true) && !$technicianIds) {
            return back()->withErrors([
                'technician_ids' => 'Confirmed and in-progress jobs must have at least one assigned technician.',
                'technician_id' => 'Confirmed and in-progress jobs must have at least one assigned technician.',
            ]);
        }

        $leadTechnicianId = $technicianIds ? (int) ($validated['lead_technician_id'] ?? $technicianIds[0]) : 0;
        if ($technicianIds && !in_array($leadTechnicianId, $technicianIds, true)) {
            return back()->withErrors([
                'lead_technician_id' => 'The lead technician must be included in the assigned team.',
            ]);
        }

        $technicians = User::query()->whereIn('id', $technicianIds)->where('role', 'technician')->get();
        if ($technicians->count() !== count($technicianIds)) {
            return back()->withErrors([
                'technician_ids' => 'Every selected team member must have a technician account.',
            ]);
        }

        $conflictingTechnicians = User::query()
            ->whereIn('id', $technicianIds)
            ->whereHas('assignedInquiries', function ($query) use ($inquiry) {
                $query->whereDate('preferred_date', $inquiry->preferred_date)
                    ->where('preferred_time', $inquiry->preferred_time)
                    ->whereIn('status', ['confirmed', 'in_progress'])
                    ->where('inquiries.id', '!=', $inquiry->getKey());
            })
            ->pluck('name')
            ->all();

        if (in_array($inquiry->status, ['confirmed', 'in_progress'], true) && $conflictingTechnicians) {
            return back()->withErrors([
                'technician_ids' => 'These technicians already have jobs in that time slot: ' . implode(', ', $conflictingTechnicians) . '.',
            ]);
        }

        $oldTechnicianIds = $inquiry->technicians()->pluck('users.id')->map(fn ($id) => (int) $id)->all();
        $oldLeadTechnicianId = $inquiry->technician_id;
        $allowAdditional = (bool) ($validated['allow_additional_technicians'] ?? $inquiry->allow_additional_technicians);

        DB::transaction(function () use (
            $request,
            $inquiry,
            $technicianIds,
            $leadTechnicianId,
            $allowAdditional,
            $oldTechnicianIds,
            $oldLeadTechnicianId,
            $activityLogger,
            $jobNotifications
        ) {
            if (in_array($inquiry->status, ['confirmed', 'in_progress'], true) && $technicianIds) {
                User::query()
                    ->whereIn('id', $technicianIds)
                    ->orderBy('id')
                    ->lockForUpdate()
                    ->get();

                $conflictsAfterLock = User::query()
                    ->whereIn('id', $technicianIds)
                    ->whereHas('assignedInquiries', function ($query) use ($inquiry) {
                        $query->whereDate('preferred_date', $inquiry->preferred_date)
                            ->where('preferred_time', $inquiry->preferred_time)
                            ->whereIn('status', ['confirmed', 'in_progress'])
                            ->where('inquiries.id', '!=', $inquiry->getKey());
                    })
                    ->pluck('name')
                    ->all();

                if ($conflictsAfterLock) {
                    throw ValidationException::withMessages([
                        'technician_ids' => 'These technicians were assigned to conflicting jobs while you were updating the team: ' . implode(', ', $conflictsAfterLock) . '.',
                    ]);
                }
            }

            $sync = [];
            foreach ($technicianIds as $technicianId) {
                $sync[$technicianId] = [
                    'is_lead' => $technicianId === $leadTechnicianId,
                    'assigned_by' => $request->user()->id,
                ];
            }

            $inquiry->technicians()->sync($sync);
            $inquiry->update([
                'technician_id' => $leadTechnicianId ?: null,
                'allow_additional_technicians' => $allowAdditional,
            ]);

            $inquiry->load('technicians');
            $names = $inquiry->technicians->pluck('name')->join(', ');
            $newIds = array_values(array_diff($technicianIds, $oldTechnicianIds));
            $removedIds = array_values(array_diff($oldTechnicianIds, $technicianIds));
            $jobNotifications->notifyAssignmentsChanged($inquiry, $newIds);
            $jobNotifications->notifyAssignmentsRemoved($removedIds, $inquiry);

            if ($inquiry->user_id) {
                CustomerNotification::create([
                    'user_id' => $inquiry->user_id,
                    'type' => 'technician_assignment',
                    'title' => 'Technician team updated',
                    'message' => 'The team assigned to inquiry ' . $inquiry->inquiry_number . ' is now: ' . ($names ?: 'not assigned') . '.',
                    'action_url' => route('inquiries.show', $inquiry),
                    'related_type' => Inquiry::class,
                    'related_id' => $inquiry->id,
                ]);
            }

            $activityLogger->record(
                $request,
                'inquiry_technician_team_updated',
                "Updated technician team for inquiry {$inquiry->inquiry_number}: {$names}.",
                $inquiry,
                ['technician_id' => $oldLeadTechnicianId ?: null],
                ['technician_id' => $leadTechnicianId ?: null]
            );
        });

        return back()->with('success', 'Technician team updated successfully.');
    }

    public function confirm(
        Request $request,
        Inquiry $inquiry,
        AdminActivityLogger $activityLogger,
        JobNotificationService $jobNotifications
    ) {
        if ($inquiry->status !== 'pending') {
            return back()->withErrors([
                'status' => 'Only pending inquiries can use the confirmation workflow.',
            ]);
        }

        $validated = $request->validate([
            'preferred_date' => ['required', 'date_format:Y-m-d', 'after_or_equal:today'],
            'preferred_time' => ['required', 'in:' . implode(',', self::BOOKING_TIME_SLOTS)],
            'technician_ids' => ['required', 'array', 'min:1', 'max:10'],
            'technician_ids.*' => ['required', 'integer', 'distinct', 'exists:users,id'],
            'lead_technician_id' => ['required', 'integer', 'exists:users,id'],
            'allow_additional_technicians' => ['sometimes', 'boolean'],
        ]);

        $technicianIds = array_map('intval', $validated['technician_ids']);
        $leadTechnicianId = (int) $validated['lead_technician_id'];

        if (!in_array($leadTechnicianId, $technicianIds, true)) {
            return back()->withErrors([
                'lead_technician_id' => 'The lead technician must be included in the assigned team.',
            ]);
        }

        $technicians = User::query()
            ->whereIn('id', $technicianIds)
            ->where('role', 'technician')
            ->get();

        if ($technicians->count() !== count($technicianIds)) {
            return back()->withErrors([
                'technician_ids' => 'Every selected team member must have a technician account.',
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

        $conflictingTechnicians = User::query()
            ->whereIn('id', $technicianIds)
            ->whereHas('assignedInquiries', function ($query) use ($bookingDate, $bookingTime, $inquiry) {
                $query->whereDate('preferred_date', $bookingDate)
                    ->where('preferred_time', $bookingTime)
                    ->whereIn('status', ['confirmed', 'in_progress'])
                    ->where('inquiries.id', '!=', $inquiry->getKey());
            })
            ->pluck('name')
            ->all();

        if ($conflictingTechnicians) {
            return back()->withErrors([
                'technician_ids' => 'These technicians already have jobs in that time slot: ' . implode(', ', $conflictingTechnicians) . '.',
            ]);
        }

        $oldStatus = $inquiry->status;
        $oldTechnicianIds = $inquiry->technicians()->pluck('users.id')->all();
        $allowAdditionalTechnicians = (bool) ($validated['allow_additional_technicians'] ?? false);

        DB::transaction(function () use (
            $request,
            $inquiry,
            $technicianIds,
            $leadTechnicianId,
            $bookingDate,
            $bookingTime,
            $allowAdditionalTechnicians,
            $oldStatus,
            $oldTechnicianIds,
            $activityLogger,
            $jobNotifications
        ) {
            User::query()
                ->whereIn('id', $technicianIds)
                ->orderBy('id')
                ->lockForUpdate()
                ->get();

            $conflictsAfterLock = User::query()
                ->whereIn('id', $technicianIds)
                ->whereHas('assignedInquiries', function ($query) use ($bookingDate, $bookingTime, $inquiry) {
                    $query->whereDate('preferred_date', $bookingDate)
                        ->where('preferred_time', $bookingTime)
                        ->whereIn('status', ['confirmed', 'in_progress'])
                        ->where('inquiries.id', '!=', $inquiry->getKey());
                })
                ->pluck('name')
                ->all();

            if ($conflictsAfterLock) {
                throw ValidationException::withMessages([
                    'technician_ids' => 'These technicians were assigned to conflicting jobs while you were confirming: ' . implode(', ', $conflictsAfterLock) . '.',
                ]);
            }

            $inquiry->update([
                'preferred_date' => $bookingDate,
                'preferred_time' => $bookingTime,
                'technician_id' => $leadTechnicianId,
                'allow_additional_technicians' => $allowAdditionalTechnicians,
                'status' => 'confirmed',
            ]);

            $sync = [];
            foreach ($technicianIds as $technicianId) {
                $sync[$technicianId] = [
                    'is_lead' => $technicianId === $leadTechnicianId,
                    'assigned_by' => $request->user()->id,
                ];
            }
            $inquiry->technicians()->sync($sync);

            $inquiry->load('technicians');
            $technicianNames = $inquiry->technicians->pluck('name')->join(', ');

            CustomerNotification::create([
                'user_id' => $inquiry->user_id,
                'type' => 'inquiry_status',
                'title' => 'Service inquiry confirmed',
                'message' => 'Your inquiry ' . $inquiry->inquiry_number
                    . ' has been confirmed for ' . $inquiry->preferred_date->format('F j, Y')
                    . ' (' . $inquiry->preferred_time . '). Assigned team: ' . $technicianNames . '.',
                'action_url' => route('inquiries.show', $inquiry),
                'related_type' => Inquiry::class,
                'related_id' => $inquiry->id,
            ]);

            $jobNotifications->notifyConfirmation($inquiry);

            $activityLogger->record(
                $request,
                'inquiry_confirmed_and_scheduled',
                "Confirmed inquiry {$inquiry->inquiry_number} for {$bookingDate} {$bookingTime}; lead technician ID {$leadTechnicianId}; team: {$technicianNames}.",
                $inquiry,
                ['status' => $oldStatus],
                [
                    'status' => 'confirmed',
                    'technician_id' => $leadTechnicianId,
                    'allow_additional_technicians' => $allowAdditionalTechnicians,
                ]
            );
        });

        return back()->with('success', 'Inquiry confirmed, schedule saved, and technician team assigned successfully.');
    }

    public function updateStatus(
        Request $request,
        Inquiry $inquiry,
        AdminActivityLogger $activityLogger,
        JobNotificationService $jobNotifications
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

        if ($newStatus === 'in_progress' && $oldStatus !== 'confirmed') {
            return back()->withErrors([
                'status' => 'Only a confirmed job can be marked in progress.',
            ]);
        }

        if ($newStatus === 'completed' && $oldStatus !== 'in_progress') {
            return back()->withErrors([
                'status' => 'A job must be in progress before it can be completed.',
            ]);
        }

        if (in_array($oldStatus, ['completed', 'cancelled'], true) && $newStatus !== $oldStatus) {
            return back()->withErrors([
                'status' => 'Completed or cancelled inquiries cannot be reopened through a status change.',
            ]);
        }

        if (in_array($oldStatus, ['confirmed', 'in_progress'], true) && $newStatus === 'pending') {
            return back()->withErrors([
                'status' => 'An active scheduled job cannot be moved back to pending. Cancel the inquiry if the service will not proceed.',
            ]);
        }

        if (in_array($newStatus, ['confirmed', 'in_progress'], true) && !$inquiry->technicians()->exists()) {
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
                $activityLogger,
                $jobNotifications
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

                $jobNotifications->notifyStatusChanged($inquiry, $oldStatus, $newStatus, $request->user());

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
