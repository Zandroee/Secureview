<?php

namespace Tests\Feature;

use App\Models\CustomerNotification;
use App\Models\Inquiry;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class InquiryNotificationsAndUrgencyTest extends TestCase
{
    use RefreshDatabase;

    public function test_new_inquiry_notifies_admins_and_technicians(): void
    {
        $customer = User::factory()->create(['role' => 'user']);
        $admin = User::factory()->create(['role' => 'admin']);
        $technician = User::factory()->create(['role' => 'technician']);
        $date = today()->addDays(3)->toDateString();

        $response = $this->actingAs($customer)
            ->post(route('inquiries.store'), [
                'customer_name' => $customer->name,
                'customer_phone' => '09171234567',
                'customer_email' => $customer->email,
                'street_address' => '123 Test Street',
                'city' => 'Taguig',
                'service_type' => 'Maintenance',
                'urgency' => 'normal',
                'preferred_date' => $date,
                'preferred_time' => '08:00 AM - 11:00 AM',
            ])
            ->assertRedirect();

        $inquiry = Inquiry::query()->where('customer_email', $customer->email)->firstOrFail();

        $this->assertDatabaseHas('customer_notifications', [
            'user_id' => $admin->id,
            'type' => 'new_inquiry',
            'related_type' => Inquiry::class,
            'related_id' => $inquiry->id,
        ]);

        $this->assertDatabaseHas('customer_notifications', [
            'user_id' => $technician->id,
            'type' => 'new_inquiry',
            'related_type' => Inquiry::class,
            'related_id' => $inquiry->id,
        ]);

        $response->assertSessionHas('serviceNotification.title', 'Service request submitted');
        $response->assertSessionHas('serviceNotification.action_url', route('inquiries.show', $inquiry));

        $this->assertDatabaseMissing('customer_notifications', [
            'user_id' => $customer->id,
            'title' => 'Inquiry received',
            'related_id' => $inquiry->id,
        ]);
    }

    public function test_overdue_open_inquiries_become_urgent_but_completed_or_emergency_inquiries_keep_their_status(): void
    {
        $customer = User::factory()->create(['role' => 'user']);
        $admin = User::factory()->create(['role' => 'admin']);
        $yesterday = today()->subDay()->toDateString();

        $overdue = $this->makeInquiry($customer, 'OVERDUE-NORMAL', $yesterday, 'pending', 'normal');
        $completed = $this->makeInquiry($customer, 'OVERDUE-COMPLETED', $yesterday, 'completed', 'normal');
        $emergency = $this->makeInquiry($customer, 'OVERDUE-EMERGENCY', $yesterday, 'pending', 'emergency');

        $this->actingAs($admin)->get(route('admin.inquiries.index'))->assertOk();

        $this->assertDatabaseHas('inquiries', [
            'id' => $overdue->id,
            'urgency' => 'urgent',
        ]);

        $this->assertDatabaseHas('inquiries', [
            'id' => $completed->id,
            'urgency' => 'normal',
        ]);

        $this->assertDatabaseHas('inquiries', [
            'id' => $emergency->id,
            'urgency' => 'emergency',
        ]);
    }

    private function makeInquiry(
        User $customer,
        string $number,
        string $date,
        string $status,
        string $urgency
    ): Inquiry {
        return Inquiry::create([
            'user_id' => $customer->id,
            'inquiry_number' => $number,
            'customer_name' => $customer->name,
            'customer_phone' => '09171234567',
            'customer_email' => $customer->email,
            'street_address' => '123 Test Street',
            'city' => 'Taguig',
            'service_type' => 'Maintenance',
            'urgency' => $urgency,
            'preferred_date' => $date,
            'preferred_time' => '08:00 AM - 11:00 AM',
            'status' => $status,
        ]);
    }
}
