<?php

namespace Tests\Feature;

use App\Models\ServiceBookingFeeSetting;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class AdminServiceBookingFeesTest extends TestCase
{
    use RefreshDatabase;

    public function test_admin_can_edit_priority_fees_and_new_booking_form_uses_saved_values(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);

        $this->actingAs($admin)
            ->get('/admin/inquiries')
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('Admin/Inquiries')
                ->where('bookingFees.urgent', (int) config('services.secureview.booking_fees.urgent', 500))
                ->where('bookingFees.emergency', (int) config('services.secureview.booking_fees.emergency', 1500))
            );

        $this->actingAs($admin)
            ->patch('/admin/service-booking-fees', [
                'urgent_fee' => '725.50',
                'emergency_fee' => '2100.00',
            ])
            ->assertRedirect(route('admin.inquiries.index'))
            ->assertSessionHas('success');

        $saved = ServiceBookingFeeSetting::current();
        $this->assertSame(725.5, (float) $saved->urgent_fee);
        $this->assertSame(2100.0, (float) $saved->emergency_fee);

        $this->actingAs($admin)
            ->get('/inquiry')
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('inquiry')
                ->where('urgencyFees.urgent', 725.5)
                ->where('urgencyFees.emergency', 2100)
            );
    }

    public function test_admin_cannot_save_negative_or_excessive_priority_fees(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);
        $before = ServiceBookingFeeSetting::current();

        $this->actingAs($admin)
            ->from('/admin/inquiries')
            ->patch('/admin/service-booking-fees', [
                'urgent_fee' => '-1',
                'emergency_fee' => '1000001',
            ])
            ->assertSessionHasErrors(['urgent_fee', 'emergency_fee']);

        $after = ServiceBookingFeeSetting::current();
        $this->assertSame((float) $before->urgent_fee, (float) $after->urgent_fee);
        $this->assertSame((float) $before->emergency_fee, (float) $after->emergency_fee);
    }
}
