<?php

namespace App\Services;

use App\Models\CustomerNotification;
use App\Models\Inquiry;
use App\Models\User;
use Illuminate\Support\Carbon;

class JobNotificationService
{
    public function notifyConfirmation(Inquiry $inquiry): void
    {
        $inquiry->loadMissing('technicians');

        $date = $inquiry->preferred_date?->format('F j, Y') ?? 'the scheduled date';
        $message = "Job {$inquiry->inquiry_number} is scheduled for {$date} ({$inquiry->preferred_time}).";

        $this->notifyAdmins(
            'job_upcoming',
            'Upcoming service scheduled',
            "{$message} Assigned technicians: " . $inquiry->technicians->pluck('name')->join(', ') . '.',
            $inquiry
        );

        foreach ($inquiry->technicians as $technician) {
            $this->notify(
                $technician,
                'job_upcoming',
                'You have an upcoming service',
                "{$message} You are assigned to this job.",
                $inquiry,
                route('technician.dashboard')
            );
        }
    }

    public function notifyStatusChanged(Inquiry $inquiry, string $oldStatus, string $newStatus, ?User $actor = null): void
    {
        $inquiry->loadMissing('technicians');
        $labels = [
            'in_progress' => 'Ongoing service',
            'completed' => 'Service completed',
            'cancelled' => 'Service cancelled',
        ];
        $title = $labels[$newStatus] ?? 'Service updated';
        $message = "Job {$inquiry->inquiry_number} changed from " . str_replace('_', ' ', $oldStatus)
            . ' to ' . str_replace('_', ' ', $newStatus) . '.';

        $this->notifyAdmins('job_' . $newStatus, $title, $message, $inquiry);

        foreach ($inquiry->technicians as $technician) {
            if ($actor && $actor->id === $technician->id) {
                continue;
            }

            $this->notify(
                $technician,
                'job_' . $newStatus,
                $title,
                $message,
                $inquiry,
                route('technician.dashboard')
            );
        }
    }

    public function notifyAssignmentsChanged(Inquiry $inquiry, array $technicianIds): void
    {
        $inquiry->loadMissing('technicians');
        $date = $inquiry->preferred_date?->format('F j, Y') ?? 'the scheduled date';

        foreach ($inquiry->technicians as $technician) {
            if (!in_array($technician->id, $technicianIds, true)) {
                continue;
            }

            $this->notify(
                $technician,
                'job_assignment',
                'You have been assigned to a service',
                "You are assigned to job {$inquiry->inquiry_number} on {$date} ({$inquiry->preferred_time}).",
                $inquiry,
                route('technician.dashboard')
            );
        }
    }

    public function notifyTechnicianJoined(Inquiry $inquiry, User $technician): void
    {
        $message = "{$technician->name} joined the technician team for job {$inquiry->inquiry_number}.";

        $this->notifyAdmins(
            'job_team_updated',
            'Technician joined a service team',
            $message,
            $inquiry
        );
    }

    public function sendUpcomingReminders(): int
    {
        $sent = 0;
        $now = now();

        foreach ([24, 1] as $hours) {
            $start = $now->copy()->addHours($hours);
            $end = $start->copy()->addMinutes(15);

            Inquiry::query()
                ->with('technicians')
                ->where('status', 'confirmed')
                ->whereDate('preferred_date', $start->toDateString())
                ->get()
                ->filter(function (Inquiry $inquiry) use ($start, $end) {
                    $appointment = $this->appointmentDateTime($inquiry);

                    return $appointment && $appointment->betweenIncluded($start, $end);
                })
                ->each(function (Inquiry $inquiry) use ($hours, &$sent) {
                    $type = $hours === 24 ? 'job_reminder_24h' : 'job_reminder_1h';
                    $title = $hours === 24 ? 'Service scheduled for tomorrow' : 'Service starting in about one hour';
                    $message = "Reminder: job {$inquiry->inquiry_number} is scheduled for "
                        . $inquiry->preferred_date->format('F j, Y') . ' (' . $inquiry->preferred_time . ').';

                    foreach ($inquiry->technicians as $technician) {
                        $sent += $this->notifyOnce($technician, $type, $title, $message, $inquiry, route('technician.dashboard'));
                    }

                    $sent += $this->notifyAdminsOnce($type, $title, $message, $inquiry);
                });
        }

        return $sent;
    }

    private function appointmentDateTime(Inquiry $inquiry): ?Carbon
    {
        if (!$inquiry->preferred_date || !$inquiry->preferred_time) {
            return null;
        }

        $start = trim(explode('-', $inquiry->preferred_time)[0] ?? '');

        try {
            return Carbon::parse($inquiry->preferred_date->format('Y-m-d') . ' ' . $start);
        } catch (\Throwable) {
            return null;
        }
    }

    private function notifyAdmins(string $type, string $title, string $message, Inquiry $inquiry): void
    {
        User::query()->where('role', 'admin')->get()->each(function (User $admin) use ($type, $title, $message, $inquiry) {
            $this->notify($admin, $type, $title, $message, $inquiry, route('admin.schedules.index'));
        });
    }

    private function notifyAdminsOnce(string $type, string $title, string $message, Inquiry $inquiry): int
    {
        $sent = 0;

        User::query()->where('role', 'admin')->get()->each(function (User $admin) use ($type, $title, $message, $inquiry, &$sent) {
            $sent += $this->notifyOnce($admin, $type, $title, $message, $inquiry, route('admin.schedules.index'));
        });

        return $sent;
    }

    private function notify(User $user, string $type, string $title, string $message, Inquiry $inquiry, string $url): void
    {
        $user->customerNotifications()->create([
            'type' => $type,
            'title' => $title,
            'message' => $message,
            'action_url' => $url,
            'related_type' => Inquiry::class,
            'related_id' => $inquiry->id,
        ]);
    }

    private function notifyOnce(User $user, string $type, string $title, string $message, Inquiry $inquiry, string $url): int
    {
        $exists = $user->customerNotifications()
            ->where('type', $type)
            ->where('related_type', Inquiry::class)
            ->where('related_id', $inquiry->id)
            ->where('created_at', '>=', now()->subDay())
            ->exists();

        if ($exists) {
            return 0;
        }

        $this->notify($user, $type, $title, $message, $inquiry, $url);

        return 1;
    }
}
