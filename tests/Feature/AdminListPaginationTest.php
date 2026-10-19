<?php

namespace Tests\Feature;

use App\Models\Inquiry;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class AdminListPaginationTest extends TestCase
{
    use RefreshDatabase;

    public function test_admin_users_are_paginated_and_role_filter_is_kept(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);
        User::factory()->count(12)->create(['role' => 'user']);

        $this->actingAs($admin)
            ->get(route('admin.users.index', ['role' => 'user']))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('Admin/Users')
                ->has('users.data', 10)
                ->where('users.total', 12)
                ->where('users.current_page', 1)
                ->where('filters.role', 'user')
                ->has('users.next_page_url')
            );
    }

    public function test_admin_inquiries_are_paginated(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);
        $customer = User::factory()->create(['role' => 'user']);
        $this->createInquiries($customer, 12, 'pending');

        $this->actingAs($admin)
            ->get(route('admin.inquiries.index', ['status' => 'pending']))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('Admin/Inquiries')
                ->has('inquiries.data', 10)
                ->where('inquiries.total', 12)
                ->where('inquiries.current_page', 1)
                ->where('filters.status', 'pending')
            );
    }

    public function test_admin_schedules_are_paginated(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);
        $customer = User::factory()->create(['role' => 'user']);
        $this->createInquiries($customer, 12, 'confirmed');

        $this->actingAs($admin)
            ->get(route('admin.schedules.index', ['status' => 'confirmed']))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('Admin/Schedules')
                ->has('schedules.data', 10)
                ->where('schedules.total', 12)
                ->where('schedules.current_page', 1)
                ->where('filters.status', 'confirmed')
            );
    }

    private function createInquiries(User $customer, int $count, string $status): void
    {
        for ($index = 1; $index <= $count; $index++) {
            Inquiry::create([
                'user_id' => $customer->id,
                'technician_id' => null,
                'inquiry_number' => sprintf('INQ-PAGE-%03d', $index),
                'item_name' => 'Security Camera',
                'customer_name' => $customer->name,
                'customer_phone' => '09171234567',
                'customer_email' => $customer->email,
                'street_address' => '123 Test Street',
                'city' => 'Taguig',
                'service_type' => 'CCTV Installation',
                'urgency' => 'normal',
                'preferred_date' => today()->addDays($index),
                'preferred_time' => '10:00',
                'notes' => null,
                'status' => $status,
            ]);
        }
    }
}
