<?php

namespace App\Services;

use App\Models\CustomerNotification;
use App\Models\Inquiry;
use App\Models\User;
use Illuminate\Support\Carbon;

class JobNotificationService
{
    /**
     * Alert the admin team and technicians when a customer submits a new service inquiry.
     * Dedupe by inquiry and recipient so retrying a paid-installation callback cannot spam users.
     */
    public function notifyNewInquirySubmitted(Inquiry $inquiry): int
    {
        $date = $inquiry->preferred_date?->format('F j, Y') ?? 'a date to be confirmed';
        $sent = 0;

        User::query()
            ->whereIn('role', ['admin', 'technician'])
            ->get()
            ->each(function (User $recipient) use ($inquiry, $date, &$sent) {
                $isAdmin = $recipient->role === 'admin';
                $dedupeKey = 'new-inquiry:' . $inquiry->id . ':' . $recipient->id;

                $notification = CustomerNotification::firstOrCreate(
                    ['dedupe_key' => $dedupeKey],
                    [
                        'user_id' => $recipient->id,
                        'type' => 'new_inquiry',
                        'title' => $isAdmin ? 'New service request received' : 'New service request received',
                        'message' => $isAdmin
                            ? "Service request {$inquiry->inquiry_number} from {$inquiry->customer_name} ({$inquiry->service_type}) is waiting for review. Requested: {$date}, {$inquiry->preferred_time}. Priority: " . ucfirst($inquiry->urgency) . '.'
                            : "A new {$inquiry->service_type} request ({$inquiry->inquiry_number}) was submitted for {$date}, {$inquiry->preferred_time}. It is awaiting admin review; customer details become available if you are assigned to the service.",
                        'action_url' => $isAdmin
                            ? route('admin.inquiries.show', $inquiry)
                            : route('technician.dashboard'),
                        'related_type' => Inquiry::class,
                        'related_id' => $inquiry->id,
                    ]
                );

                if ($notification->wasRecentlyCreated) {
                    $sent++;
                }
            });

        return $sent;
    }

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

    public function notifyAssignmentsRemoved(array $technicianIds, Inquiry $inquiry): void
    {
        if (!$technicianIds) {
            return;
        }

        $date = $inquiry->preferred_date?->format('F j, Y') ?? 'the scheduled date';
        User::query()->whereIn('id', $technicianIds)->where('role', 'technician')->get()
            ->each(function (User $technician) use ($inquiry, $date) {
                $this->notify(
                    $technician,
                    'job_assignment_removed',
                    'You were removed from a service team',
                    "You are no longer assigned to job {$inquiry->inquiry_number} scheduled for {$date}.",
                    $inquiry,
                    route('technician.dashboard')
                );
            });

        $inquiry->loadMissing('technicians');
        $remainingMessage = 'The technician team for job ' . $inquiry->inquiry_number . ' was updated.';

        foreach ($inquiry->technicians as $teamMember) {
            $this->notify(
                $teamMember,
                'job_team_updated',
                'Your service team was updated',
                $remainingMessage,
                $inquiry,
                route('technician.dashboard')
            );
        }
    }

    public function notifyTechnicianJoined(Inquiry $inquiry, User $technician): void
    {
        $inquiry->loadMissing('technicians');
        $message = "{$technician->name} joined the technician team for job {$inquiry->inquiry_number}.";

        $this->notifyAdmins(
            'job_team_updated',
            'Technician joined a service team',
            $message,
            $inquiry
        );

        foreach ($inquiry->technicians as $teamMember) {
            if ($teamMember->id === $technician->id) {
                continue;
            }

            $this->notify(
                $teamMember,
                'job_team_updated',
                'A technician joined your service team',
                $message,
                $inquiry,
                route('technician.dashboard')
            );
        }
    }

    public function sendUpcomingReminders(): int
    {
        $sent = 0;
        $now = now();

        foreach ([24, 1] as $hours) {
            $end = $now->copy()->addHours($hours);
            $start = $end->copy()->subMinutes(15);

            Inquiry::query()
                ->with('technicians')
                ->where('status', 'confirmed')
                ->whereDate('preferred_date', '>=', $start->toDateString())
                ->whereDate('preferred_date', '<=', $end->toDateString())
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
        $url = in_array($type, ['job_completed', 'job_cancelled'], true)
            ? route('admin.inquiries.show', $inquiry)
            : route('admin.schedules.index');

        User::query()->where('role', 'admin')->get()->each(function (User $admin) use ($type, $title, $message, $inquiry, $url) {
            $this->notify($admin, $type, $title, $message, $inquiry, $url);
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
        $date = $inquiry->preferred_date?->format('Y-m-d') ?? 'no-date';
        $time = md5((string) ($inquiry->preferred_time ?? 'no-time'));
        $dedupeKey = implode(':', [
            'job-reminder',
            $type,
            $inquiry->id,
            $date,
            $time,
            $user->id,
        ]);

        $notification = CustomerNotification::firstOrCreate(
            ['dedupe_key' => $dedupeKey],
            [
                'user_id' => $user->id,
                'type' => $type,
                'title' => $title,
                'message' => $message,
                'action_url' => $url,
                'related_type' => Inquiry::class,
                'related_id' => $inquiry->id,
            ]
        );

        return $notification->wasRecentlyCreated ? 1 : 0;
    }
}
