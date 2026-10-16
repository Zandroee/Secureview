<?php

namespace App\Http\Controllers\Staff;

use App\Http\Controllers\Controller;
use App\Models\CustomerNotification;
use App\Models\Inquiry;
use App\Models\User;
use App\Services\JobNotificationService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;

class JobController extends Controller
{
    public function index(Request $request)
    {
        $user = $request->user();
        $filters = $request->validate([
            'status' => ['nullable', 'in:confirmed,in_progress,completed'],
            'search' => ['nullable', 'string', 'max:120'],
        ]);

        $query = Inquiry::query()
            ->with(['assignedTechnicians', 'technician'])
            ->whereIn('status', ['confirmed', 'in_progress', 'completed']);

        if ($user->isTechnician()) {
            $query->where(function ($builder) use ($user) {
                $builder->whereHas('assignedTechnicians', fn ($team) => $team->where('users.id', $user->id))
                    ->orWhere('technician_id', $user->id);
            });
        }

        if (!empty($filters['status'])) {
            $query->where('status', $filters['status']);
        }

        if (!empty($filters['search'])) {
            $search = $filters['search'];
            $query->where(function ($builder) use ($search) {
                $builder->where('inquiry_number', 'like', '%' . $search . '%')
                    ->orWhere('service_type', 'like', '%' . $search . '%')
                    ->orWhere('item_name', 'like', '%' . $search . '%')
                    ->orWhere('city', 'like', '%' . $search . '%');
            });
        }

        $jobs = $query
            ->orderByRaw("CASE status WHEN 'in_progress' THEN 1 WHEN 'confirmed' THEN 2 ELSE 3 END")
            ->orderBy('preferred_date')
            ->orderBy('preferred_time')
            ->paginate(10)
            ->withQueryString()
            ->through(fn (Inquiry $inquiry) => $this->presentJob($inquiry, true));

        $availableJobs = collect();

        if ($user->isTechnician()) {
            $busySlots = $user->assignedInquiries()
                ->whereIn('status', ['confirmed', 'in_progress'])
                ->get(['inquiries.preferred_date', 'inquiries.preferred_time'])
                ->map(fn (Inquiry $job) => $job->preferred_date?->format('Y-m-d') . '|' . $job->preferred_time)
                ->all();

            $availableJobs = Inquiry::query()
                ->with(['assignedTechnicians', 'technician'])
                ->where('status', 'confirmed')
                ->where('allow_technician_self_assignment', true)
                ->whereDoesntHave('assignedTechnicians', fn ($team) => $team->where('users.id', $user->id))
                ->where(function ($builder) use ($user) {
                    $builder->whereNull('technician_id')->orWhere('technician_id', '!=', $user->id);
                })
                ->whereDate('preferred_date', '>=', today())
                ->orderBy('preferred_date')
                ->orderBy('preferred_time')
                ->limit(20)
                ->get()
                ->filter(function (Inquiry $inquiry) use ($busySlots) {
                    $slotKey = $inquiry->preferred_date?->format('Y-m-d') . '|' . $inquiry->preferred_time;
                    $teamCount = max(
                        $inquiry->assignedTechnicians->count(),
                        $inquiry->technician_id ? 1 : 0
                    );

                    return !in_array($slotKey, $busySlots, true)
                        && $teamCount < (int) ($inquiry->max_technicians ?? 3);
                })
                ->map(fn (Inquiry $inquiry) => $this->presentJob($inquiry, false))
                ->values();
        }

        $summaryQuery = Inquiry::query()->whereIn('status', ['confirmed', 'in_progress', 'completed']);

        if ($user->isTechnician()) {
            $summaryQuery->where(function ($builder) use ($user) {
                $builder->whereHas('assignedTechnicians', fn ($team) => $team->where('users.id', $user->id))
                    ->orWhere('technician_id', $user->id);
            });
        }

        $summary = [
            'upcoming' => (clone $summaryQuery)->where('status', 'confirmed')->count(),
            'ongoing' => (clone $summaryQuery)->where('status', 'in_progress')->count(),
            'completed' => (clone $summaryQuery)->where('status', 'completed')->count(),
            'available' => $availableJobs->count(),
        ];

        return Inertia::render('Staff/Jobs', [
            'jobs' => $jobs,
            'availableJobs' => $availableJobs,
            'summary' => $summary,
            'filters' => [
                'search' => $filters['search'] ?? '',
                'status' => $filters['status'] ?? '',
            ],
            'isAdmin' => $user->isAdmin(),
        ]);
    }

    public function selfAssign(
        Request $request,
        Inquiry $inquiry,
        JobNotificationService $notifications
    ) {
        $user = $request->user();

        if (!$user->isTechnician()) {
            abort(403);
        }

        if (
            $inquiry->status !== 'confirmed'
            || !$inquiry->allow_technician_self_assignment
            || $inquiry->preferred_date?->isBefore(today())
        ) {
            return back()->withErrors([
                'self_assignment' => 'This job is not open for technician self-assignment.',
            ]);
        }

        if ($inquiry->assignedTechnicians()->where('users.id', $user->id)->exists()
            || (int) $inquiry->technician_id === (int) $user->id) {
            return back()->withErrors([
                'self_assignment' => 'You are already assigned to this job.',
            ]);
        }

        $teamCount = max(
            $inquiry->assignedTechnicians()->count(),
            $inquiry->technician_id ? 1 : 0
        );

        if ($teamCount >= (int) ($inquiry->max_technicians ?? 3)) {
            return back()->withErrors([
                'self_assignment' => 'This job already has the maximum number of technicians.',
            ]);
        }

        $hasConflict = Inquiry::query()
            ->whereIn('status', ['confirmed', 'in_progress'])
            ->whereDate('preferred_date', $inquiry->preferred_date)
            ->where('preferred_time', $inquiry->preferred_time)
            ->where(function ($builder) use ($user) {
                $builder->where('technician_id', $user->id)
                    ->orWhereHas('assignedTechnicians', fn ($team) => $team->where('users.id', $user->id));
            })
            ->where('id', '!=', $inquiry->id)
            ->exists();

        if ($hasConflict) {
            return back()->withErrors([
                'self_assignment' => 'You already have another job at this date and time.',
            ]);
        }

        DB::transaction(function () use ($inquiry, $user, $notifications) {
            $inquiry->assignedTechnicians()->syncWithoutDetaching([
                $user->id => [
                    'is_lead' => false,
                    'assigned_by' => $user->id,
                    'assignment_source' => 'self',
                    'assigned_at' => now(),
                ],
            ]);

            $notifications->notifyJobTeam(
                $inquiry,
                'job_team_updated',
                'Technician joined a service job',
                $user->name . ' joined inquiry ' . $inquiry->inquiry_number . '.'
            );
        });

        return back()->with('success', 'You have been assigned to this service job.');
    }

    public function updateStatus(
        Request $request,
        Inquiry $inquiry,
        JobNotificationService $notifications
    ) {
        $user = $request->user();
        $validated = $request->validate([
            'status' => ['required', 'in:in_progress,completed'],
        ]);

        if ($user->isTechnician()) {
            $assigned = $inquiry->assignedTechnicians()->where('users.id', $user->id)->exists()
                || (int) $inquiry->technician_id === (int) $user->id;

            if (!$assigned) {
                abort(403);
            }
        }

        $oldStatus = $inquiry->status;
        $newStatus = $validated['status'];

        $allowed = ($oldStatus === 'confirmed' && $newStatus === 'in_progress')
            || ($oldStatus === 'in_progress' && $newStatus === 'completed');

        if (!$allowed) {
            return back()->withErrors([
                'status' => 'Jobs must move from Confirmed to In Progress, then to Completed.',
            ]);
        }

        if (!$inquiry->technician_id && !$inquiry->assignedTechnicians()->exists()) {
            return back()->withErrors([
                'status' => 'A job cannot start without an assigned technician.',
            ]);
        }

        DB::transaction(function () use ($inquiry, $newStatus, $notifications) {
            $inquiry->update(['status' => $newStatus]);

            $title = $newStatus === 'in_progress' ? 'Service job started' : 'Service job completed';
            $message = 'Inquiry ' . $inquiry->inquiry_number . ' is now ' . str_replace('_', ' ', $newStatus) . '.';

            $notifications->notifyJobTeam(
                $inquiry,
                $newStatus === 'in_progress' ? 'job_ongoing' : 'job_completed',
                $title,
                $message
            );

            CustomerNotification::create([
                'user_id' => $inquiry->user_id,
                'type' => 'inquiry_status',
                'title' => $title,
                'message' => 'Your service inquiry ' . $inquiry->inquiry_number . ' is now ' . str_replace('_', ' ', $newStatus) . '.',
                'action_url' => route('inquiries.show', $inquiry),
                'related_type' => Inquiry::class,
                'related_id' => $inquiry->id,
            ]);
        });

        return back()->with(
            'success',
            $newStatus === 'completed' ? 'Job marked as completed.' : 'Job marked as in progress.'
        );
    }

    private function presentJob(Inquiry $inquiry, bool $includeCustomerDetails): array
    {
        $team = $inquiry->assignedTechnicians->map(fn (User $technician) => [
            'id' => $technician->id,
            'name' => $technician->name,
            'is_lead' => (bool) $technician->pivot->is_lead,
        ])->values();

        if ($team->isEmpty() && $inquiry->technician) {
            $team = collect([[
                'id' => $inquiry->technician->id,
                'name' => $inquiry->technician->name,
                'is_lead' => true,
            ]]);
        }

        $data = [
            'id' => $inquiry->id,
            'inquiry_number' => $inquiry->inquiry_number,
            'service_type' => $inquiry->service_type,
            'item_name' => $inquiry->item_name,
            'urgency' => $inquiry->urgency,
            'preferred_date' => $inquiry->preferred_date?->format('M d, Y'),
            'preferred_date_value' => $inquiry->preferred_date?->format('Y-m-d'),
            'preferred_time' => $inquiry->preferred_time,
            'city' => $inquiry->city,
            'status' => $inquiry->status,
            'technicians' => $team,
            'allow_technician_self_assignment' => (bool) $inquiry->allow_technician_self_assignment,
            'assigned_count' => $team->count(),
            'max_technicians' => (int) ($inquiry->max_technicians ?? 3),
            'notes' => $includeCustomerDetails ? $inquiry->notes : null,
        ];

        if ($includeCustomerDetails) {
            $data['customer_name'] = $inquiry->customer_name;
            $data['customer_phone'] = $inquiry->customer_phone;
            $data['customer_email'] = $inquiry->customer_email;
            $data['street_address'] = $inquiry->street_address;
        }

        return $data;
    }
}
