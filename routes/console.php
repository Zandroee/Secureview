<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

Schedule::command('secureview:send-upcoming-job-reminders')->everyFifteenMinutes()->withoutOverlapping();
Schedule::call(fn () => \\App\\Models\\Inquiry::escalateOverdueUrgency())->dailyAt('00:01')->withoutOverlapping();
