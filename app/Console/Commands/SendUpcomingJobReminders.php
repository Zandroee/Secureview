<?php

namespace App\Console\Commands;

use App\Services\JobNotificationService;
use Illuminate\Console\Command;

class SendUpcomingJobReminders extends Command
{
    protected $signature = 'secureview:send-upcoming-job-reminders';

    protected $description = 'Notify assigned technicians and administrators about jobs starting soon';

    public function handle(JobNotificationService $notifications): int
    {
        $sent = $notifications->sendUpcomingReminders();
        $this->info("Sent {$sent} upcoming job reminder notifications.");

        return self::SUCCESS;
    }
}
