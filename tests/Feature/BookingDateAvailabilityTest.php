<?php

namespace Tests\Feature;

use App\Models\BlockedBookingDate;
use App\Models\BlockedBookingTimeSlot;
use App\Models\Inquiry;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class BookingDateAvailabilityTest extends TestCase
{
    use RefreshDatabase;

    public function test_admin_can_block_and_reopen_a_booking_date(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);
        $date = today()->addDays(4)->toDateString();

        $this->actingAs($admin)
            ->post(route('admin.booking-availability.store'), [
                'booking_date' => $date,
                'reason' => 'No technicians available',
            ])
            ->assertRedirect(route('admin.schedules.index'));

        $this->assertDatabaseHas('blocked_booking_dates', [
            'booking_date' => $date,
            'reason' => 'No technicians available',
            'blocked_by' => $admin->id,
        ]);

        $this->actingAs($admin)
            ->get(route('admin.schedules.index'))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('Admin/Schedules')
                ->where('blockedBookingDates.0.booking_date', $date)
                ->where('blockedBookingDates.0.reason', 'No technicians available')
            );

        $blockedDate = BlockedBookingDate::query()
            ->whereDate('booking_date', $date)
            ->firstOrFail();

        $this->actingAs($admin)
            ->delete(route('admin.booking-availability.destroy', $blockedDate))
            ->assertRedirect(route('admin.schedules.index'));

        $this->assertDatabaseMissing('blocked_booking_dates', [
            'booking_date' => $date,
        ]);
    }

    public function test_booking_page_receives_dates_blocked_by_admin(): void
    {
        $customer = User::factory()->create(['role' => 'user']);
        $date = today()->addDays(5)->toDateString();

        BlockedBookingDate::create([
            'booking_date' => $date,
            'reason' => 'Office closed',
            'blocked_by' => null,
        ]);

        $this->actingAs($customer)
            ->get(route('inquiries.create'))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('inquiry')
                ->where('unavailableDates.0', $date)
            );
    }

    public function test_admin_can_block_and_reopen_a_specific_booking_time_slot(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);
        $date = today()->addDays(6)->toDateString();
        $timeSlot = '11:00 AM - 02:00 PM';

        $this->actingAs($admin)
            ->post(route('admin.booking-availability.store'), [
                'block_type' => 'time_slot',
                'booking_date' => $date,
                'booking_time' => $timeSlot,
                'reason' => 'Technician unavailable',
            ])
            ->assertRedirect(route('admin.schedules.index'));

        $this->assertDatabaseHas('blocked_booking_time_slots', [
            'booking_date' => $date,
            'booking_time' => $timeSlot,
            'reason' => 'Technician unavailable',
            'blocked_by' => $admin->id,
        ]);

        $this->actingAs($admin)
            ->get(route('admin.schedules.index'))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('Admin/Schedules')
                ->where('blockedBookingTimeSlots.0.booking_date', $date)
                ->where('blockedBookingTimeSlots.0.booking_time', $timeSlot)
                ->where('blockedBookingTimeSlots.0.reason', 'Technician unavailable')
            );

        $blockedSlot = BlockedBookingTimeSlot::query()
            ->whereDate('booking_date', $date)
            ->where('booking_time', $timeSlot)
            ->firstOrFail();

        $this->actingAs($admin)
            ->delete(route('admin.booking-time-slots.destroy', $blockedSlot))
            ->assertRedirect(route('admin.schedules.index'));

        $this->assertDatabaseMissing('blocked_booking_time_slots', [
            'booking_date' => $date,
            'booking_time' => $timeSlot,
        ]);
    }

    public function test_booking_page_receives_individually_blocked_time_slots(): void
    {
        $customer = User::factory()->create(['role' => 'user']);
        $date = today()->addDays(7)->toDateString();
        $timeSlot = '02:00 PM - 05:00 PM';

        BlockedBookingTimeSlot::create([
            'booking_date' => $date,
            'booking_time' => $timeSlot,
            'reason' => 'No technician available',
            'blocked_by' => null,
        ]);

        $this->actingAs($customer)
            ->get(route('inquiries.create'))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('inquiry')
                ->where("unavailableTimeSlots.{$date}.0", $timeSlot)
            );
    }

    public function test_customer_cannot_submit_an_individually_blocked_time_slot(): void
    {
        $customer = User::factory()->create(['role' => 'user']);
        $date = today()->addDays(8)->toDateString();
        $timeSlot = '11:00 AM - 02:00 PM';

        BlockedBookingTimeSlot::create([
            'booking_date' => $date,
            'booking_time' => $timeSlot,
            'reason' => 'Technician unavailable',
            'blocked_by' => null,
        ]);

        $this->actingAs($customer)
            ->post(route('inquiries.store'), array_merge(
                $this->validInquiryPayload($date, $customer->email),
                ['preferred_time' => $timeSlot]
            ))
            ->assertSessionHasErrors('preferred_time');

        $this->assertDatabaseMissing('inquiries', [
            'customer_email' => $customer->email,
            'preferred_date' => $date,
            'preferred_time' => $timeSlot,
        ]);
    }

    public function test_customer_cannot_submit_an_inquiry_for_a_fully_booked_date(): void
    {
        $customer = User::factory()->create(['role' => 'user']);
        $date = today()->addDays(3)->toDateString();

        BlockedBookingDate::create([
            'booking_date' => $date,
            'reason' => 'Fully booked',
            'blocked_by' => null,
        ]);

        $payload = $this->validInquiryPayload($date, $customer->email);

        $this->actingAs($customer)
            ->post(route('inquiries.store'), $payload)
            ->assertSessionHasErrors('preferred_date');

        $this->assertDatabaseMissing('inquiries', [
            'customer_email' => $customer->email,
            'preferred_date' => $date,
        ]);
    }

    public function test_booking_accepts_three_hour_slots_and_rejects_old_one_hour_slots(): void
    {
        $customer = User::factory()->create(['role' => 'user']);
        $date = today()->addDays(3)->toDateString();

        $this->actingAs($customer)
            ->post(route('inquiries.store'), array_merge(
                $this->validInquiryPayload($date, $customer->email),
                ['preferred_time' => '08:00 AM - 09:00 AM']
            ))
            ->assertSessionHasErrors('preferred_time');

        $timeSlots = [
            '08:00 AM - 11:00 AM',
            '11:00 AM - 02:00 PM',
            '02:00 PM - 05:00 PM',
        ];

        foreach ($timeSlots as $index => $timeSlot) {
            $slotDate = today()->addDays($index + 3)->toDateString();

            $this->actingAs($customer)
                ->post(route('inquiries.store'), array_merge(
                    $this->validInquiryPayload($slotDate, $customer->email),
                    ['preferred_time' => $timeSlot]
                ))
                ->assertRedirect();

            $this->assertDatabaseHas('inquiries', [
                'customer_email' => $customer->email,
                'preferred_date' => $slotDate,
                'preferred_time' => $timeSlot,
            ]);
        }
    }

    private function validInquiryPayload(string $date, string $email = 'booking-test@example.com'): array
    {
        return [
            'item_type' => null,
            'item_id' => null,
            'customer_name' => 'Test Customer',
            'customer_phone' => '09171234567',
            'customer_email' => $email,
            'street_address' => '123 Test Street',
            'city' => 'Taguig',
            'service_type' => 'Installation',
            'urgency' => 'normal',
            'preferred_date' => $date,
            'preferred_time' => '08:00 AM - 11:00 AM',
            'notes' => null,
        ];
    }
}
