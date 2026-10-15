<?php

namespace Tests\Feature;

use App\Models\BlockedBookingDate;
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

    public function test_customer_cannot_submit_an_inquiry_for_a_fully_booked_date(): void
    {
        $customer = User::factory()->create(['role' => 'user']);
        $date = today()->addDays(3)->toDateString();

        BlockedBookingDate::create([
            'booking_date' => $date,
            'reason' => 'Fully booked',
            'blocked_by' => null,
        ]);

        $this->actingAs($customer)
            ->post(route('inquiries.store'), $this->validInquiryPayload($date))
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
                $this->validInquiryPayload($date),
                ['preferred_time' => '08:00 AM - 09:00 AM']
            ))
            ->assertSessionHasErrors('preferred_time');

        $this->actingAs($customer)
            ->post(route('inquiries.store'), array_merge(
                $this->validInquiryPayload($date),
                ['preferred_time' => '08:00 AM - 11:00 AM']
            ))
            ->assertRedirect();

        $this->assertDatabaseHas('inquiries', [
            'customer_email' => $customer->email,
            'preferred_date' => $date,
            'preferred_time' => '08:00 AM - 11:00 AM',
        ]);
    }

    private function validInquiryPayload(string $date): array
    {
        return [
            'item_type' => null,
            'item_id' => null,
            'customer_name' => 'Test Customer',
            'customer_phone' => '09171234567',
            'customer_email' => 'booking-test@example.com',
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
