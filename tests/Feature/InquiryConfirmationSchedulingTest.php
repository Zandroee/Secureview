<?php

namespace Tests\Feature;

use App\Models\BlockedBookingDate;
use App\Models\BlockedBookingTimeSlot;
use App\Models\Inquiry;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class InquiryConfirmationSchedulingTest extends TestCase
{
    use RefreshDatabase;

    private const MORNING_SLOT = '08:00 AM - 11:00 AM';
    private const MIDDAY_SLOT = '11:00 AM - 02:00 PM';
    private const AFTERNOON_SLOT = '02:00 PM - 05:00 PM';

    public function test_admin_can_confirm_an_inquiry_with_a_schedule_and_technician(): void
    {
        $customer = User::factory()->create(['role' => 'user']);
        $admin = User::factory()->create(['role' => 'admin']);
        $technician = User::factory()->create(['role' => 'technician']);
        $requestedDate = today()->addDays(4)->toDateString();
        $confirmedDate = today()->addDays(6)->toDateString();
        $inquiry = $this->createPendingInquiry($customer, $requestedDate);

        $this->actingAs($admin)
            ->patch(route('admin.inquiries.confirm', $inquiry), [
                'preferred_date' => $confirmedDate,
                'preferred_time' => self::AFTERNOON_SLOT,
                // Retain the legacy field while submitting the team-assignment payload.
                'technician_id' => $technician->id,
                'technician_ids' => [$technician->id],
            ])
            ->assertRedirect()
            ->assertSessionHasNoErrors();

        $this->assertDatabaseHas('inquiry_technician', [
            'inquiry_id' => $inquiry->id,
            'technician_id' => $technician->id,
        ]);

        $this->assertDatabaseHas('inquiries', [
            'id' => $inquiry->id,
            'preferred_time' => self::AFTERNOON_SLOT,
            'technician_id' => $technician->id,
            'status' => 'confirmed',
        ]);

        $this->assertSame($confirmedDate, $inquiry->fresh()->preferred_date?->toDateString());
    }

    public function test_admin_cannot_confirm_without_assigning_a_technician(): void
    {
        $customer = User::factory()->create(['role' => 'user']);
        $admin = User::factory()->create(['role' => 'admin']);
        $date = today()->addDays(4)->toDateString();
        $inquiry = $this->createPendingInquiry($customer, $date);

        $this->actingAs($admin)
            ->patch(route('admin.inquiries.confirm', $inquiry), [
                'preferred_date' => $date,
                'preferred_time' => self::MORNING_SLOT,
                'technician_ids' => [],
            ])
            ->assertSessionHasErrors('technician_ids');

        $this->assertDatabaseHas('inquiries', [
            'id' => $inquiry->id,
            'status' => 'pending',
            'technician_id' => null,
        ]);
    }

    public function test_admin_cannot_confirm_a_blocked_date_or_time_slot(): void
    {
        $customer = User::factory()->create(['role' => 'user']);
        $admin = User::factory()->create(['role' => 'admin']);
        $technician = User::factory()->create(['role' => 'technician']);
        $date = today()->addDays(5)->toDateString();
        $inquiry = $this->createPendingInquiry($customer, $date);

        BlockedBookingTimeSlot::create([
            'booking_date' => $date,
            'booking_time' => self::MIDDAY_SLOT,
            'reason' => 'Unavailable',
            'blocked_by' => $admin->id,
        ]);

        $this->actingAs($admin)
            ->patch(route('admin.inquiries.confirm', $inquiry), [
                'preferred_date' => $date,
                'preferred_time' => self::MIDDAY_SLOT,
                'technician_ids' => [$technician->id],
            ])
            ->assertSessionHasErrors('preferred_time');

        BlockedBookingDate::create([
            'booking_date' => $date,
            'reason' => 'Office closed',
            'blocked_by' => $admin->id,
        ]);

        $this->actingAs($admin)
            ->patch(route('admin.inquiries.confirm', $inquiry), [
                'preferred_date' => $date,
                'preferred_time' => self::AFTERNOON_SLOT,
                'technician_ids' => [$technician->id],
            ])
            ->assertSessionHasErrors('preferred_date');

        $this->assertDatabaseHas('inquiries', [
            'id' => $inquiry->id,
            'status' => 'pending',
            'technician_id' => null,
        ]);
    }

    public function test_same_technician_cannot_be_confirmed_for_two_jobs_in_the_same_slot(): void
    {
        $firstCustomer = User::factory()->create(['role' => 'user']);
        $secondCustomer = User::factory()->create(['role' => 'user']);
        $admin = User::factory()->create(['role' => 'admin']);
        $technician = User::factory()->create(['role' => 'technician']);
        $date = today()->addDays(7)->toDateString();

        $existingJob = $this->createPendingInquiry($firstCustomer, $date);
        $existingJob->update([
            'status' => 'confirmed',
            'technician_id' => $technician->id,
            'preferred_time' => self::MORNING_SLOT,
        ]);
        $existingJob->technicians()->attach($technician->id, ['assigned_by' => $admin->id]);

        $newInquiry = $this->createPendingInquiry($secondCustomer, $date);

        $this->actingAs($admin)
            ->patch(route('admin.inquiries.confirm', $newInquiry), [
                'preferred_date' => $date,
                'preferred_time' => self::MORNING_SLOT,
                'technician_ids' => [$technician->id],
            ])
            ->assertSessionHasErrors('technician_ids');

        $this->assertDatabaseHas('inquiries', [
            'id' => $newInquiry->id,
            'status' => 'pending',
            'technician_id' => null,
        ]);
    }

    public function test_status_endpoint_cannot_bypass_confirmation_workflow(): void
    {
        $customer = User::factory()->create(['role' => 'user']);
        $admin = User::factory()->create(['role' => 'admin']);
        $inquiry = $this->createPendingInquiry($customer, today()->addDays(4)->toDateString());

        $this->actingAs($admin)
            ->patch(route('admin.inquiries.status', $inquiry), [
                'status' => 'confirmed',
            ])
            ->assertSessionHasErrors('status');

        $this->assertDatabaseHas('inquiries', [
            'id' => $inquiry->id,
            'status' => 'pending',
            'technician_id' => null,
        ]);
    }

    public function test_admin_cannot_unassign_a_technician_from_an_active_job(): void
    {
        $customer = User::factory()->create(['role' => 'user']);
        $admin = User::factory()->create(['role' => 'admin']);
        $technician = User::factory()->create(['role' => 'technician']);
        $inquiry = $this->createPendingInquiry($customer, today()->addDays(4)->toDateString());
        $inquiry->update([
            'status' => 'confirmed',
            'technician_id' => $technician->id,
        ]);

        $this->actingAs($admin)
            ->patch(route('admin.inquiries.technician', $inquiry), [
                'technician_id' => null,
            ])
            ->assertSessionHasErrors('technician_id');

        $this->assertDatabaseHas('inquiries', [
            'id' => $inquiry->id,
            'technician_id' => $technician->id,
            'status' => 'confirmed',
        ]);
    }

    private function createPendingInquiry(User $customer, string $date): Inquiry
    {
        $this->actingAs($customer)
            ->post(route('inquiries.store'), [
                'item_type' => null,
                'item_id' => null,
                'customer_name' => 'Test Customer ' . $customer->id,
                'customer_phone' => '09171234567',
                'customer_email' => $customer->email,
                'street_address' => '123 Test Street',
                'city' => 'Taguig',
                'service_type' => 'Installation',
                'urgency' => 'normal',
                'preferred_date' => $date,
                'preferred_time' => self::MORNING_SLOT,
                'notes' => null,
            ])
            ->assertRedirect()
            ->assertSessionHasNoErrors();

        return Inquiry::query()
            ->where('customer_email', $customer->email)
            ->whereDate('preferred_date', $date)
            ->latest('id')
            ->firstOrFail();
    }
}
