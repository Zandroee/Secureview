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

        $query = Inquiry::with(['user', 'inquirable', 'technician', 'assignedTechnicians']);

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
                    'technicians' => $this->technicianTeam($inquiry),
                    'allow_technician_self_assignment' => (bool) $inquiry->allow_technician_self_assignment,
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
        $inquiry->load(['user', 'inquirable', 'technician', 'assignedTechnicians']);

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
                'technicians' => $this->technicianTeam($inquiry),
                'allow_technician_self_assignment' => (bool) $inquiry->allow_technician_self_assignment,
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
                ->where('id', '!=', $inquiry->getKey())
                ->exists();

            if ($technicianHasConflict) {
                return back()->withErrors([
                    'technician_id' => 'This technician is already assigned to another job during that time slot.',
                ]);
            }
        }

        if ($inquiry->status !== 'pending') {
            return back()->withErrors([
                'technician_id' => 'Use Manage Technician Team to change the staff assigned to an active job.',
            ]);
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

                $team = [];
                if ($technicianId) {
                    $team[$technicianId] = [
                        'is_lead' => true,
                        'assigned_by' => $request->user()->id,
                        'assignment_source' => 'admin',
                        'assigned_at' => now(),
                    ];
                }
                $inquiry->assignedTechnicians()->sync($team);

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
        AdminActivityLogger $activityLogger,
        JobNotificationService $notifications
    ) {
        if ($inquiry->status !== 'pending') {
            return back()->withErrors([
                'status' => 'Only pending inquiries can use the confirmation workflow.',
            ]);
        }

        $ids = $request->input('technician_ids');
        if (!is_array($ids)) {
            $legacyId = $request->input('technician_id');
            $ids = $legacyId ? [$legacyId] : [];
        }

        $request->merge([
            'technician_ids' => $ids,
            'lead_technician_id' => $request->input('lead_technician_id', $request->input('technician_id')),
            'allow_technician_self_assignment' => $request->input('allow_technician_self_assignment', false),
            'max_technicians' => $request->input('max_technicians', max(count($ids), 1)),
        ]);

        $validated = $request->validate([
            'preferred_date' => ['required', 'date_format:Y-m-d', 'after_or_equal:today'],
            'preferred_time' => ['required', 'in:' . implode(',', self::BOOKING_TIME_SLOTS)],
            'technician_ids' => ['required', 'array', 'min:1', 'max:10'],
            'technician_ids.*' => ['required', 'integer', 'distinct', 'exists:users,id'],
            'lead_technician_id' => ['required', 'integer', 'exists:users,id'],
            'allow_technician_self_assignment' => ['required', 'boolean'],
            'max_technicians' => ['required', 'integer', 'min:1', 'max:10'],
        ]);

        $technicianIds = array_values(array_unique(array_map('intval', $validated['technician_ids'])));
        $leadTechnicianId = (int) $validated['lead_technician_id'];
        $allowSelfAssignment = (bool) $validated['allow_technician_self_assignment'];
        $maxTechnicians = $allowSelfAssignment ? (int) $validated['max_technicians'] : count($technicianIds);

        if (!in_array($leadTechnicianId, $technicianIds, true)) {
            return back()->withErrors([
                'lead_technician_id' => 'The lead technician must be part of the selected team.',
            ]);
        }

        if (count($technicianIds) > $maxTechnicians) {
            return back()->withErrors([
                'max_technicians' => 'Maximum team size cannot be smaller than the selected team.',
            ]);
        }

        $technicians = User::query()
            ->where('role', 'technician')
            ->whereIn('id', $technicianIds)
            ->get(['id', 'name', 'email']);

        if ($technicians->count() !== count($technicianIds)) {
            return back()->withErrors([
                'technician_ids' => 'Every selected team member must be a technician account.',
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

        foreach ($technicianIds as $technicianId) {
            $hasConflict = Inquiry::query()
                ->whereIn('status', ['confirmed', 'in_progress'])
                ->whereDate('preferred_date', $bookingDate)
                ->where('preferred_time', $bookingTime)
                ->where('id', '!=', $inquiry->getKey())
                ->where(function ($builder) use ($technicianId) {
                    $builder->where('technician_id', $technicianId)
                        ->orWhereHas('assignedTechnicians', fn ($team) => $team->where('users.id', $technicianId));
                })
                ->exists();

            if ($hasConflict) {
                $technician = $technicians->firstWhere('id', $technicianId);

                return back()->withErrors([
                    'technician_ids' => ($technician?->name ?? 'A selected technician')
                        . ' already has a job scheduled for this date and time. Choose another technician or time slot.',
                ]);
            }
        }

        $oldStatus = $inquiry->status;
        $oldTechnicianId = $inquiry->technician_id;
        $leadTechnician = $technicians->firstWhere('id', $leadTechnicianId);
        $teamNames = $technicians->pluck('name')->join(', ');

        DB::transaction(function () use (
            $request,
            $inquiry,
            $technicianIds,
            $leadTechnicianId,
            $allowSelfAssignment,
            $maxTechnicians,
            $bookingDate,
            $bookingTime,
            $oldStatus,
            $oldTechnicianId,
            $leadTechnician,
            $teamNames,
            $activityLogger,
            $notifications
        ) {
            $team = [];
            foreach ($technicianIds as $technicianId) {
                $team[$technicianId] = [
                    'is_lead' => $technicianId === $leadTechnicianId,
                    'assigned_by' => $request->user()->id,
                    'assignment_source' => 'admin',
                    'assigned_at' => now(),
                ];
            }

            $inquiry->update([
                'preferred_date' => $bookingDate,
                'preferred_time' => $bookingTime,
                'technician_id' => $leadTechnicianId,
                'allow_technician_self_assignment' => $allowSelfAssignment,
                'max_technicians' => $maxTechnicians,
                'status' => 'confirmed',
            ]);
            $inquiry->assignedTechnicians()->sync($team);

            CustomerNotification::create([
                'user_id' => $inquiry->user_id,
                'type' => 'inquiry_status',
                'title' => 'Service inquiry confirmed',
                'message' => 'Your inquiry ' . $inquiry->inquiry_number
                    . ' has been confirmed for ' . $inquiry->preferred_date->format('F j, Y')
                    . ' (' . $inquiry->preferred_time . '). Assigned team: ' . $teamNames
                    . '. Lead technician: ' . ($leadTechnician?->name ?? 'Not available') . '.',
                'action_url' => route('inquiries.show', $inquiry),
                'related_type' => Inquiry::class,
                'related_id' => $inquiry->id,
            ]);

            $notifications->notifyAdmins(
                $inquiry,
                'job_upcoming',
                'Service job confirmed',
                'Inquiry ' . $inquiry->inquiry_number . ' is scheduled for '
                    . $inquiry->preferred_date->format('F j, Y') . ' (' . $inquiry->preferred_time
                    . '). Lead technician: ' . ($leadTechnician?->name ?? 'Not available') . '.'
            );

            $notifications->notifyTechnicians(
                $inquiry,
                $technicianIds,
                'job_assigned',
                'New service assignment',
                'You have been assigned to inquiry ' . $inquiry->inquiry_number
                    . ' on ' . $inquiry->preferred_date->format('F j, Y')
                    . ' (' . $inquiry->preferred_time . '). Lead technician: '
                    . ($leadTechnician?->name ?? 'Not available') . '.'
            );

            $activityLogger->record(
                $request,
                'inquiry_confirmed_and_scheduled',
                'Confirmed inquiry ' . $inquiry->inquiry_number . ' for '
                    . $bookingDate . ' ' . $bookingTime . '; lead technician '
                    . $leadTechnicianId . '; team size ' . count($technicianIds) . '.',
                $inquiry,
                ['status' => $oldStatus, 'technician_id' => $oldTechnicianId],
                ['status' => 'confirmed', 'technician_id' => $leadTechnicianId, 'items_count' => count($technicianIds)]
            );
        });

        return back()->with('success', 'Inquiry confirmed, schedule saved, and technician team assigned successfully.');
    }

    public function syncTechnicians(
        Request $request,
        Inquiry $inquiry,
        AdminActivityLogger $activityLogger,
        JobNotificationService $notifications
    ) {
        if (!in_array($inquiry->status, ['confirmed', 'in_progress'], true)) {
            return back()->withErrors([
                'status' => 'Use the confirmation workflow to assign the initial team. Only active scheduled jobs can be edited here.',
            ]);
        }

        $validated = $request->validate([
            'technician_ids' => ['required', 'array', 'min:1', 'max:10'],
            'technician_ids.*' => ['required', 'integer', 'distinct', 'exists:users,id'],
            'lead_technician_id' => ['required', 'integer', 'exists:users,id'],
            'allow_technician_self_assignment' => ['required', 'boolean'],
            'max_technicians' => ['required', 'integer', 'min:1', 'max:10'],
        ]);

        $technicianIds = array_values(array_unique(array_map('intval', $validated['technician_ids'])));
        $leadTechnicianId = (int) $validated['lead_technician_id'];
        $allowSelfAssignment = (bool) $validated['allow_technician_self_assignment'];
        $maxTechnicians = $allowSelfAssignment ? (int) $validated['max_technicians'] : count($technicianIds);

        if (!in_array($leadTechnicianId, $technicianIds, true)) {
            return back()->withErrors([
                'lead_technician_id' => 'The lead technician must be part of the selected team.',
            ]);
        }

        if (count($technicianIds) > $maxTechnicians) {
            return back()->withErrors([
                'max_technicians' => 'Maximum team size cannot be smaller than the selected team.',
            ]);
        }

        $technicians = User::query()
            ->where('role', 'technician')
            ->whereIn('id', $technicianIds)
            ->get(['id', 'name', 'email']);

        if ($technicians->count() !== count($technicianIds)) {
            return back()->withErrors([
                'technician_ids' => 'Every selected team member must be a technician account.',
            ]);
        }

        foreach ($technicianIds as $technicianId) {
            $conflict = Inquiry::query()
                ->whereIn('status', ['confirmed', 'in_progress'])
                ->whereDate('preferred_date', $inquiry->preferred_date)
                ->where('preferred_time', $inquiry->preferred_time)
                ->where('id', '!=', $inquiry->id)
                ->where(function ($builder) use ($technicianId) {
                    $builder->where('technician_id', $technicianId)
                        ->orWhereHas('assignedTechnicians', fn ($team) => $team->where('users.id', $technicianId));
                })
                ->exists();

            if ($conflict) {
                $conflicted = $technicians->firstWhere('id', $technicianId);
                return back()->withErrors([
                    'technician_ids' => ($conflicted?->name ?? 'A selected technician')
                        . ' already has another job at this date and time.',
                ]);
            }
        }

        $oldTechnicianIds = $inquiry->assignedTechnicians()->pluck('users.id')->map(fn ($id) => (int) $id)->all();
        if ($inquiry->technician_id && !in_array((int) $inquiry->technician_id, $oldTechnicianIds, true)) {
            $oldTechnicianIds[] = (int) $inquiry->technician_id;
        }

        $addedIds = array_values(array_diff($technicianIds, $oldTechnicianIds));
        $removedIds = array_values(array_diff($oldTechnicianIds, $technicianIds));
        $leadTechnician = $technicians->firstWhere('id', $leadTechnicianId);
        $teamNames = $technicians->pluck('name')->join(', ');
        $oldLeadId = $inquiry->technician_id;

        DB::transaction(function () use (
            $request,
            $inquiry,
            $technicianIds,
            $leadTechnicianId,
            $allowSelfAssignment,
            $maxTechnicians,
            $oldLeadId,
            $teamNames,
            $activityLogger,
            $notifications,
            $addedIds,
            $removedIds,
            $leadTechnician
        ) {
            $pivot = [];
            foreach ($technicianIds as $technicianId) {
                $pivot[$technicianId] = [
                    'is_lead' => $technicianId === $leadTechnicianId,
                    'assigned_by' => $request->user()->id,
                    'assignment_source' => 'admin',
                    'assigned_at' => now(),
                ];
            }

            $inquiry->assignedTechnicians()->sync($pivot);
            $inquiry->update([
                'technician_id' => $leadTechnicianId,
                'allow_technician_self_assignment' => $allowSelfAssignment,
                'max_technicians' => $maxTechnicians,
            ]);

            if ($addedIds) {
                $notifications->notifyTechnicians(
                    $inquiry,
                    $addedIds,
                    'job_assigned',
                    'Added to service team',
                    'You have been assigned to inquiry ' . $inquiry->inquiry_number
                        . ' for ' . $inquiry->preferred_date->format('F j, Y')
                        . ' (' . $inquiry->preferred_time . ').'
                );
            }

            if ($removedIds) {
                $notifications->notifyTechnicians(
                    $inquiry,
                    $removedIds,
                    'job_unassigned',
                    'Service assignment updated',
                    'You are no longer assigned to inquiry ' . $inquiry->inquiry_number . '.'
                );
            }

            $notifications->notifyAdmins(
                $inquiry,
                'job_team_updated',
                'Service team updated',
                'The assigned team for inquiry ' . $inquiry->inquiry_number . ' is now ' . $teamNames . '.'
            );

            CustomerNotification::create([
                'user_id' => $inquiry->user_id,
                'type' => 'technician_assignment',
                'title' => 'Service team updated',
                'message' => 'The technician team for inquiry ' . $inquiry->inquiry_number
                    . ' has been updated. Lead technician: ' . ($leadTechnician?->name ?? 'Not available') . '.',
                'action_url' => route('inquiries.show', $inquiry),
                'related_type' => Inquiry::class,
                'related_id' => $inquiry->id,
            ]);

            $activityLogger->record(
                $request,
                'inquiry_technician_team_updated',
                'Updated technician team for inquiry ' . $inquiry->inquiry_number . '.',
                $inquiry,
                ['technician_id' => $oldLeadId, 'items_count' => count($removedIds)],
                ['technician_id' => $leadTechnicianId, 'items_count' => count($technicianIds)]
            );
        });

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
                $activityLogger,
                $notifications
            ) {
                $inquiry->update([
                    'status' => $newStatus,
                ]);

                $notificationType = match ($newStatus) {
                    'in_progress' => 'job_ongoing',
                    'completed' => 'job_completed',
                    'cancelled' => 'job_cancelled',
                    default => 'job_status',
                };

                $notifications->notifyJobTeam(
                    $inquiry,
                    $notificationType,
                    'Service job ' . str_replace('_', ' ', $newStatus),
                    'Inquiry ' . $inquiry->inquiry_number . ' is now ' . str_replace('_', ' ', $newStatus) . '.'
                );

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
    private function technicianTeam(Inquiry $inquiry): array
    {
        $team = $inquiry->assignedTechnicians->map(fn (User $technician) => [
            'id' => $technician->id,
            'name' => $technician->name,
            'email' => $technician->email,
            'is_lead' => (bool) $technician->pivot->is_lead,
        ])->values();

        if ($team->isEmpty() && $inquiry->technician) {
            return [[
                'id' => $inquiry->technician->id,
                'name' => $inquiry->technician->name,
                'email' => $inquiry->technician->email,
                'is_lead' => true,
            ]];
        }

        return $team->all();
    }
}
