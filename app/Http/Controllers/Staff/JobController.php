<?php

namespace App\Http\Controllers\Staff;

use App\Http\Controllers\Controller;
use App\Models\Inquiry;
use App\Models\User;
use App\Services\JobNotificationService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;

class JobController extends Controller
{
    public function index(Request $request)
    {
        $technicianId = (int) $request->user()->id;

        $assignedJobs = Inquiry::query()
            ->with(['technicians:id,name,email', 'technician:id,name,email'])
            ->whereIn('status', ['confirmed', 'in_progress', 'completed'])
            ->where(function ($query) use ($technicianId) {
                $query->where('technician_id', $technicianId)
                    ->orWhereHas('technicians', fn ($team) => $team->where('users.id', $technicianId));
            })
            ->orderByRaw("CASE status WHEN 'in_progress' THEN 1 WHEN 'confirmed' THEN 2 ELSE 3 END")
            ->orderBy('preferred_date')
            ->orderBy('preferred_time')
            ->paginate(12)
            ->withQueryString()
            ->through(fn (Inquiry $inquiry) => $this->summary($inquiry, $technicianId, true));

        $openJobs = Inquiry::query()
            ->with(['technicians:id,name,email', 'technician:id,name,email'])
            ->whereIn('status', ['confirmed', 'in_progress'])
            ->where('accepting_technician_signups', true)
            ->whereRaw('(SELECT COUNT(*) FROM inquiry_technicians WHERE inquiry_technicians.inquiry_id = inquiries.id) < inquiries.max_technicians')
            ->where(function ($query) use ($technicianId) {
                $query->whereNull('technician_id')
                    ->orWhere('technician_id', '!=', $technicianId);
            })
            ->whereDoesntHave('technicians', fn ($team) => $team->where('users.id', $technicianId))
            ->orderBy('preferred_date')
            ->orderBy('preferred_time')
            ->limit(30)
            ->get()
            ->map(fn (Inquiry $inquiry) => $this->summary($inquiry, $technicianId, false))
            ->values();

        return Inertia::render('Staff/Jobs', [
            'assignedJobs' => $assignedJobs,
            'openJobs' => $openJobs,
            'todayDate' => today()->toDateString(),
        ]);
    }

    public function show(Request $request, Inquiry $inquiry)
    {
        $technicianId = (int) $request->user()->id;
        $inquiry->load(['user', 'technicians:id,name,email', 'technician:id,name,email']);

        $isAssigned = $this->isAssigned($inquiry, $technicianId);
        $canJoin = !$isAssigned
            && $inquiry->accepting_technician_signups
            && in_array($inquiry->status, ['confirmed', 'in_progress'], true)
            && $inquiry->technicians->count() < (int) $inquiry->max_technicians;

        abort_unless($isAssigned || $canJoin, 403);

        return Inertia::render('Staff/JobDetails', [
            'job' => [
                'id' => $inquiry->id,
                'inquiry_number' => $inquiry->inquiry_number,
                'service_type' => $inquiry->service_type,
                'item_name' => $inquiry->item_name,
                'urgency' => $inquiry->urgency,
                'preferred_date' => $inquiry->preferred_date?->format('M d, Y'),
                'preferred_time' => $inquiry->preferred_time,
                'city' => $inquiry->city,
                'status' => $inquiry->status,
                'notes' => $isAssigned ? $inquiry->notes : null,
                'street_address' => $isAssigned ? $inquiry->street_address : null,
                'customer' => $isAssigned ? [
                    'name' => $inquiry->customer_name,
                    'phone' => $inquiry->customer_phone,
                    'email' => $inquiry->customer_email,
                ] : null,
                'technicians' => $inquiry->technicians->map(fn (User $technician) => [
                    'id' => $technician->id,
                    'name' => $technician->name,
                    'email' => $technician->email,
                    'is_lead' => (bool) $technician->pivot->is_lead,
                ])->values(),
                'is_assigned' => $isAssigned,
                'can_join' => $canJoin,
                'accepting_technician_signups' => (bool) $inquiry->accepting_technician_signups,
                'team_count' => $inquiry->technicians->count(),
                'max_technicians' => (int) $inquiry->max_technicians,
            ],
        ]);
    }

    public function join(Request $request, Inquiry $inquiry, JobNotificationService $notifications)
    {
        $technician = $request->user();

        DB::transaction(function () use ($inquiry, $technician) {
            $lockedInquiry = Inquiry::query()->whereKey($inquiry->id)->lockForUpdate()->firstOrFail();

            if (
                !$lockedInquiry->accepting_technician_signups
                || !in_array($lockedInquiry->status, ['confirmed', 'in_progress'], true)
            ) {
                throw ValidationException::withMessages([
                    'job' => 'This job is no longer accepting additional technicians.',
                ]);
            }

            if ($this->isAssigned($lockedInquiry, (int) $technician->id)) {
                throw ValidationException::withMessages([
                    'job' => 'You are already assigned to this job.',
                ]);
            }

            $teamCount = $lockedInquiry->technicians()->count();
            if ($teamCount >= (int) $lockedInquiry->max_technicians) {
                throw ValidationException::withMessages([
                    'job' => 'This job has reached its maximum team size.',
                ]);
            }

            $conflict = Inquiry::query()
                ->whereDate('preferred_date', $lockedInquiry->preferred_date)
                ->where('preferred_time', $lockedInquiry->preferred_time)
                ->whereIn('status', ['confirmed', 'in_progress'])
                ->where('id', '!=', $lockedInquiry->id)
                ->where(function ($query) use ($technician) {
                    $query->where('technician_id', $technician->id)
                        ->orWhereHas('technicians', fn ($team) => $team->where('users.id', $technician->id));
                })
                ->exists();

            if ($conflict) {
                throw ValidationException::withMessages([
                    'job' => 'You already have another job scheduled for this date and time.',
                ]);
            }

            $lockedInquiry->technicians()->syncWithoutDetaching([
                $technician->id => [
                    'is_lead' => false,
                    'assignment_source' => 'self_service',
                    'assigned_by' => null,
                ],
            ]);
        });

        $inquiry->load('technicians');
        $notifications->notifyJobParticipants(
            $inquiry,
            'schedule',
            'Technician joined service job',
            $technician->name . ' joined inquiry ' . $inquiry->inquiry_number . '.',
            'inquiry:' . $inquiry->id . ':technician-joined:' . $technician->id . ':' . now()->timestamp,
            false
        );

        return redirect()->route('staff.jobs.show', $inquiry)
            ->with('success', 'You have been assigned to this job.');
    }

    public function updateStatus(
        Request $request,
        Inquiry $inquiry,
        JobNotificationService $notifications
    ) {
        $validated = $request->validate([
            'status' => ['required', 'in:in_progress,completed'],
        ]);

        $technician = $request->user();
        $oldStatus = $inquiry->status;
        $newStatus = $validated['status'];

        DB::transaction(function () use ($inquiry, $technician, $oldStatus, $newStatus) {
            $lockedInquiry = Inquiry::query()->whereKey($inquiry->id)->lockForUpdate()->firstOrFail();

            abort_unless($this->isAssigned($lockedInquiry, (int) $technician->id), 403);

            if ($newStatus === 'in_progress' && $lockedInquiry->status !== 'confirmed') {
                throw ValidationException::withMessages([
                    'status' => 'Only a confirmed job can be started.',
                ]);
            }

            if ($newStatus === 'completed' && $lockedInquiry->status !== 'in_progress') {
                throw ValidationException::withMessages([
                    'status' => 'Start the job before marking it completed.',
                ]);
            }

            $lockedInquiry->update(['status' => $newStatus]);
        });

        if ($oldStatus !== $newStatus) {
            $inquiry->load('technicians');
            $notifications->notifyJobParticipants(
                $inquiry,
                'schedule',
                'Service job ' . ucfirst(str_replace('_', ' ', $newStatus)),
                'Inquiry ' . $inquiry->inquiry_number . ' is now ' . str_replace('_', ' ', $newStatus) . '. Updated by ' . $technician->name . '.',
                'inquiry:' . $inquiry->id . ':status:' . $newStatus . ':' . now()->timestamp,
                true
            );
        }

        return back()->with('success', 'Job status updated successfully.');
    }

    private function isAssigned(Inquiry $inquiry, int $technicianId): bool
    {
        return (int) $inquiry->technician_id === $technicianId
            || $inquiry->technicians()->where('users.id', $technicianId)->exists();
    }

    private function summary(Inquiry $inquiry, int $technicianId, bool $isAssigned): array
    {
        $assigned = $isAssigned || $this->isAssigned($inquiry, $technicianId);
        $team = $inquiry->technicians->map(fn (User $technician) => [
            'id' => $technician->id,
            'name' => $technician->name,
            'is_lead' => (bool) $technician->pivot->is_lead,
        ])->values();

        return [
            'id' => $inquiry->id,
            'inquiry_number' => $inquiry->inquiry_number,
            'service_type' => $inquiry->service_type,
            'item_name' => $inquiry->item_name,
            'urgency' => $inquiry->urgency,
            'preferred_date' => $inquiry->preferred_date?->format('M d, Y'),
            'preferred_time' => $inquiry->preferred_time,
            'city' => $inquiry->city,
            'status' => $inquiry->status,
            'technicians' => $team,
            'team_count' => $team->count(),
            'max_technicians' => (int) $inquiry->max_technicians,
            'is_assigned' => $assigned,
            'can_join' => !$assigned
                && $inquiry->accepting_technician_signups
                && $team->count() < (int) $inquiry->max_technicians,
        ];
    }
}
