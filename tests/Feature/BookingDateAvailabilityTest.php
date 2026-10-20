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

        $this->assertTrue(
            BlockedBookingDate::query()
                ->whereDate('booking_date', $date)
                ->where('reason', 'No technicians available')
                ->where('blocked_by', $admin->id)
                ->exists()
        );

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

        $this->assertFalse(
            BlockedBookingDate::query()
                ->whereDate('booking_date', $date)
                ->exists()
        );
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

        $this->assertTrue(
            BlockedBookingTimeSlot::query()
                ->whereDate('booking_date', $date)
                ->where('booking_time', $timeSlot)
                ->where('reason', 'Technician unavailable')
                ->where('blocked_by', $admin->id)
                ->exists()
        );

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

        $this->assertFalse(
            BlockedBookingTimeSlot::query()
                ->whereDate('booking_date', $date)
                ->where('booking_time', $timeSlot)
                ->exists()
        );
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

    public function test_day_is_marked_unavailable_when_all_three_time_slots_are_blocked(): void
    {
        $customer = User::factory()->create(['role' => 'user']);
        $date = today()->addDays(9)->toDateString();

        foreach ([
            '08:00 AM - 11:00 AM',
            '11:00 AM - 02:00 PM',
            '02:00 PM - 05:00 PM',
        ] as $timeSlot) {
            BlockedBookingTimeSlot::create([
                'booking_date' => $date,
                'booking_time' => $timeSlot,
                'reason' => 'No availability',
                'blocked_by' => null,
            ]);
        }

        $this->actingAs($customer)
            ->get(route('inquiries.create'))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('inquiry')
                ->where('unavailableDates.0', $date)
                ->where("unavailableTimeSlots.{$date}.2", '02:00 PM - 05:00 PM')
            );
    }

    public function test_customer_cannot_submit_an_individually_blocked_time_slot(): void
    {
        $customer = User::factory()->create(['role' => 'user']);
        User::factory()->create(['role' => 'technician']);
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

        $this->assertFalse(
            Inquiry::query()
                ->where('customer_email', $customer->email)
                ->whereDate('preferred_date', $date)
                ->where('preferred_time', $timeSlot)
                ->exists()
        );
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

        $this->assertFalse(
            Inquiry::query()
                ->where('customer_email', $customer->email)
                ->whereDate('preferred_date', $date)
                ->exists()
        );
    }

    public function test_booking_accepts_three_hour_slots_and_rejects_old_one_hour_slots(): void
    {
        $customer = User::factory()->create(['role' => 'user']);
        User::factory()->create(['role' => 'technician']);
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

            $this->assertTrue(
                Inquiry::query()
                    ->where('customer_email', $customer->email)
                    ->whereDate('preferred_date', $slotDate)
                    ->where('preferred_time', $timeSlot)
                    ->exists()
            );
        }
    }

    public function test_entire_day_is_unavailable_when_every_technician_has_a_job_in_a_different_slot(): void
    {
        $customer = User::factory()->create(['role' => 'user']);
        $admin = User::factory()->create(['role' => 'admin']);
        $technicians = [
            User::factory()->create(['role' => 'technician']),
            User::factory()->create(['role' => 'technician']),
            User::factory()->create(['role' => 'technician']),
        ];
        $date = today()->addDays(10)->toDateString();
        $timeSlots = [
            '08:00 AM - 11:00 AM',
            '11:00 AM - 02:00 PM',
            '02:00 PM - 05:00 PM',
        ];

        foreach ($timeSlots as $index => $timeSlot) {
            $this->createConfirmedBooking(
                $customer,
                $technicians[$index],
                $admin,
                $date,
                $timeSlot,
                'TEST-' . $index . '-' . $date
            );
        }

        $this->actingAs($customer)
            ->get(route('inquiries.create'))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('inquiry')
                ->where('unavailableDates.0', $date)
            );

        $this->actingAs($customer)
            ->post(route('inquiries.store'), $this->validInquiryPayload($date, $customer->email))
            ->assertSessionHasErrors('preferred_date');

        $this->assertSame(3, Inquiry::query()
            ->whereDate('preferred_date', $date)
            ->where('status', 'confirmed')
            ->count());
    }

    private function createConfirmedBooking(
        User $customer,
        User $technician,
        User $admin,
        string $date,
        string $time,
        string $number
    ): Inquiry {
        $inquiry = Inquiry::create([
            'user_id' => $customer->id,
            'technician_id' => $technician->id,
            'inquiry_number' => $number,
            'customer_name' => $customer->name,
            'customer_phone' => '09171234567',
            'customer_email' => $customer->email,
            'street_address' => '123 Test Street',
            'city' => 'Taguig',
            'service_type' => 'Maintenance',
            'urgency' => 'normal',
            'preferred_date' => $date,
            'preferred_time' => $time,
            'status' => 'confirmed',
        ]);

        $inquiry->technicians()->attach($technician->id, ['assigned_by' => $admin->id]);

        return $inquiry;
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
            'service_type' => 'Maintenance',
            'urgency' => 'normal',
            'preferred_date' => $date,
            'preferred_time' => '08:00 AM - 11:00 AM',
            'notes' => null,
        ];
    }
}
