<?php

namespace App\Services;

use Carbon\CarbonImmutable;
use Illuminate\Validation\ValidationException;

class BookingSlotCutoff
{
    /**
     * Three-hour service slots are not bookable once they have started.
     * Always evaluate using the shop's local (Philippine) time.
     */
    private const START_TIMES = [
        '08:00 AM - 11:00 AM' => '08:00',
        '11:00 AM - 02:00 PM' => '11:00',
        '02:00 PM - 05:00 PM' => '14:00',
    ];

    public static function hasStarted(string $date, string $slot, ?CarbonImmutable $now = null): bool
    {
        if (!isset(self::START_TIMES[$slot])) {
            return true;
        }

        $now = ($now ?? CarbonImmutable::now('Asia/Manila'))->setTimezone('Asia/Manila');
        $start = CarbonImmutable::parse($date . ' ' . self::START_TIMES[$slot], 'Asia/Manila');

        return $start->lessThanOrEqualTo($now);
    }

    public static function assertBookable(string $date, string $slot): void
    {
        if (self::hasStarted($date, $slot)) {
            throw ValidationException::withMessages([
                'preferred_time' => 'This time slot has already started or passed (Philippine time). Please choose a later available slot.',
            ]);
        }
    }
}
