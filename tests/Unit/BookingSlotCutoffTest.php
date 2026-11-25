<?php

namespace Tests\Unit;

use App\Services\BookingSlotCutoff;
use Carbon\CarbonImmutable;
use Illuminate\Validation\ValidationException;
use Tests\TestCase;

class BookingSlotCutoffTest extends TestCase
{
    public function test_same_day_slots_are_unavailable_once_they_begin_in_manila_time(): void
    {
        $now = CarbonImmutable::parse('2026-11-25 15:00:00', 'Asia/Manila');
        $this->assertTrue(BookingSlotCutoff::hasStarted('2026-11-25', '08:00 AM - 11:00 AM', $now));
        $this->assertTrue(BookingSlotCutoff::hasStarted('2026-11-25', '11:00 AM - 02:00 PM', $now));
        $this->assertTrue(BookingSlotCutoff::hasStarted('2026-11-25', '02:00 PM - 05:00 PM', $now));
        $this->assertFalse(BookingSlotCutoff::hasStarted('2026-11-26', '08:00 AM - 11:00 AM', $now));
    }

    public function test_same_day_afternoon_slot_remains_available_before_two_pm(): void
    {
        $now = CarbonImmutable::parse('2026-11-25 13:59:00', 'Asia/Manila');
        $this->assertTrue(BookingSlotCutoff::hasStarted('2026-11-25', '11:00 AM - 02:00 PM', $now));
        $this->assertFalse(BookingSlotCutoff::hasStarted('2026-11-25', '02:00 PM - 05:00 PM', $now));
    }

    public function test_booking_in_the_past_is_rejected_on_the_server(): void
    {
        CarbonImmutable::setTestNow(CarbonImmutable::parse('2026-11-25 15:00:00', 'Asia/Manila'));
        try {
            BookingSlotCutoff::assertBookable('2026-11-25', '11:00 AM - 02:00 PM');
            $this->fail('Past slot should have been rejected.');
        } catch (ValidationException $exception) {
            $this->assertArrayHasKey('preferred_time', $exception->errors());
        } finally {
            CarbonImmutable::setTestNow();
        }
    }
}
