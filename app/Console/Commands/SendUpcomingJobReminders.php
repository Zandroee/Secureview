<?php

namespace App\Console\Commands;

use App\Models\Inquiry;
use App\Services\JobNotificationService;
use Illuminate\Console\Command;
use Illuminate\Support\Carbon;

class SendUpcomingJobReminders extends Command
{
    protected $signature = 'secureview:send-job-reminders';

    protected $description = 'Send deduplicated reminders for confirmed service jobs';

    public function handle(JobNotificationService $notifications): int
    {
        $now = now();

        $jobs = Inquiry::query()
            ->with(['technicians', 'user'])
            ->where('status', 'confirmed')
            ->whereDate('preferred_date', '>=', today())
            ->get();

        $remindersSent = 0;

        foreach ($jobs as $inquiry) {
            if (!preg_match('/^(\d{1,2}:\d{2}\s[AP]M)/i', (string) $inquiry->preferred_time, $matches)) {
                continue;
            }

            try {
                $startsAt = Carbon::createFromFormat(
                    'Y-m-d h:i A',
                    $inquiry->preferred_date->format('Y-m-d') . ' ' . strtoupper($matches[1]),
                    config('app.timezone')
                );
            } catch (\Throwable) {
                continue;
            }

            if (!$startsAt || $startsAt->lessThan($now)) {
                continue;
            }

            foreach ([24 => '24-hour', 1 => '1-hour'] as $hours => $label) {
                // The command runs every 15 minutes. A small early tolerance avoids
                // missing the window if cron starts a few seconds after the boundary.
                $windowStart = $now->copy()->addHours($hours)->subMinute();
                $windowEnd = $now->copy()->addHours($hours)->addMinutes(15);

                if ($startsAt->lessThan($windowStart) || !$startsAt->lessThan($windowEnd)) {
                    continue;
                }

                $notifications->notifyJobParticipants(
                    $inquiry,
                    'schedule',
                    $label === '24-hour' ? 'Service job tomorrow' : 'Service job starts in one hour',
                    'Reminder: inquiry ' . $inquiry->inquiry_number . ' is scheduled for '
                        . $startsAt->format('F j, Y') . ' at ' . $startsAt->format('h:i A')
                        . ' (' . $inquiry->preferred_time . ').',
                    'inquiry:' . $inquiry->id . ':reminder:' . $label . ':' . $startsAt->format('YmdHi'),
                    true
                );

                $remindersSent++;
            }
        }

        $this->info("Processed {$jobs->count()} confirmed jobs; created {$remindersSent} reminder events.");
        return self::SUCCESS;
    }
}
