<?php

namespace App\Console\Commands;

use App\Models\Inquiry;
use App\Models\JobReminderDelivery;
use App\Models\User;
use App\Services\JobNotificationService;
use Carbon\Carbon;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

class SendUpcomingJobReminders extends Command
{
    protected $signature = 'secureview:send-job-reminders';

    protected $description = 'Notify admins and assigned technicians 24 hours and 1 hour before confirmed jobs.';

    public function handle(JobNotificationService $notifications): int
    {
        $now = now();
        $windows = [
            [
                'type' => '24_hours',
                'from' => $now->copy()->addHours(23)->addMinutes(45),
                'to' => $now->copy()->addHours(24),
                'label' => '24 hours',
            ],
            [
                'type' => '1_hour',
                'from' => $now->copy()->addMinutes(45),
                'to' => $now->copy()->addHour(),
                'label' => '1 hour',
            ],
        ];

        $remindersSent = 0;

        Inquiry::query()
            ->where('status', 'confirmed')
            ->whereDate('preferred_date', '>=', today())
            ->with(['assignedTechnicians', 'technician'])
            ->orderBy('id')
            ->chunkById(100, function ($inquiries) use ($windows, $notifications, &$remindersSent) {
                foreach ($inquiries as $inquiry) {
                    $scheduledStart = $this->scheduledStart($inquiry);

                    if (!$scheduledStart || $scheduledStart->isPast()) {
                        continue;
                    }

                    foreach ($windows as $window) {
                        if (!$scheduledStart->gt($window['from']) || !$scheduledStart->lte($window['to'])) {
                            continue;
                        }

                        $recipientIds = User::query()
                            ->where('role', 'admin')
                            ->pluck('id')
                            ->all();

                        $recipientIds = array_merge(
                            $recipientIds,
                            $inquiry->assignedTechnicians->pluck('id')->all()
                        );

                        if ($inquiry->technician_id) {
                            $recipientIds[] = (int) $inquiry->technician_id;
                        }

                        $recipientIds = array_values(array_unique(array_map('intval', $recipientIds)));

                        foreach ($recipientIds as $recipientId) {
                            $recipient = User::find($recipientId);

                            if (!$recipient) {
                                continue;
                            }

                            DB::transaction(function () use (
                                $inquiry,
                                $recipient,
                                $window,
                                $scheduledStart,
                                $notifications,
                                &$remindersSent
                            ) {
                                $delivery = JobReminderDelivery::firstOrCreate(
                                    [
                                        'inquiry_id' => $inquiry->id,
                                        'recipient_id' => $recipient->id,
                                        'reminder_type' => $window['type'],
                                        'scheduled_start' => $scheduledStart,
                                    ],
                                    ['sent_at' => now()]
                                );

                                if (!$delivery->wasRecentlyCreated) {
                                    return;
                                }

                                $notifications->notifyUser(
                                    $inquiry,
                                    $recipient,
                                    'job_reminder',
                                    'Upcoming service in ' . $window['label'],
                                    'Inquiry ' . $inquiry->inquiry_number . ' is scheduled for '
                                        . $scheduledStart->format('F j, Y g:i A')
                                        . '. Please review the job details before the appointment.'
                                );

                                $remindersSent++;
                            });
                        }
                    }
                }
            });

        $this->info("Sent {$remindersSent} upcoming-job reminders.");

        return self::SUCCESS;
    }

    private function scheduledStart(Inquiry $inquiry): ?Carbon
    {
        if (!$inquiry->preferred_date || !$inquiry->preferred_time || !str_contains($inquiry->preferred_time, ' - ')) {
            return null;
        }

        $startTime = trim(explode(' - ', $inquiry->preferred_time, 2)[0]);

        try {
            return Carbon::parse(
                $inquiry->preferred_date->format('Y-m-d') . ' ' . $startTime,
                config('app.timezone')
            );
        } catch (\Throwable) {
            return null;
        }
    }
}
