<?php

namespace Tests\Feature;

use App\Models\Inquiry;
use App\Models\Order;
use App\Models\Product;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class AdminDashboardTest extends TestCase
{
    use RefreshDatabase;

    public function test_admin_dashboard_displays_live_store_data(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);
        $customer = User::factory()->create(['role' => 'user']);

        Product::create([
            'name' => 'Dahua Camera',
            'category' => 'CCTV',
            'warranty' => '1 year',
            'price' => 2500,
            'stock_quantity' => 2,
            'badge' => null,
            'image' => null,
            'images' => [],
            'specifications' => [],
            'rating' => 0,
            'is_featured' => false,
        ]);

        Order::create([
            'user_id' => $customer->id,
            'order_number' => 'ORD-DASH-PAID',
            'subtotal' => 1234.5,
            'shipping_fee' => 0,
            'total' => 1234.5,
            'payment_method' => 'cash',
            'payment_status' => 'paid',
            'order_status' => 'processing',
            'paid_at' => now(),
            'customer_name' => $customer->name,
            'customer_phone' => '09171234567',
            'customer_email' => $customer->email,
            'delivery_address' => '123 Test Street',
        ]);

        Order::create([
            'user_id' => $customer->id,
            'order_number' => 'ORD-DASH-PENDING',
            'subtotal' => 799,
            'shipping_fee' => 0,
            'total' => 799,
            'payment_method' => 'gcash',
            'payment_status' => 'pending',
            'order_status' => 'awaiting_payment',
            'customer_name' => $customer->name,
            'customer_phone' => '09171234567',
            'customer_email' => $customer->email,
            'delivery_address' => '123 Test Street',
        ]);

        Inquiry::create([
            'user_id' => $customer->id,
            'technician_id' => null,
            'inquiry_number' => 'INQ-DASH-001',
            'item_name' => 'Dahua Camera',
            'customer_name' => $customer->name,
            'customer_phone' => '09171234567',
            'customer_email' => $customer->email,
            'street_address' => '123 Test Street',
            'city' => 'Taguig',
            'service_type' => 'CCTV Installation',
            'urgency' => 'normal',
            'preferred_date' => today(),
            'preferred_time' => '10:00',
            'notes' => null,
            'status' => 'confirmed',
        ]);

        $this->actingAs($admin)
            ->get(route('dashboard'))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('Dashboard')
                ->where('stats.0.title', 'Total Sales')
                ->where('stats.0.value', '₱1,234.50')
                ->where('stats.0.growth', null)
                ->where('stats.1.title', 'Total Orders')
                ->where('stats.1.value', '2')
                ->where('stats.2.title', 'Total Installation')
                ->where('stats.2.value', '1')
                ->where('stats.3.title', 'New Customers')
                ->where('stats.3.value', '1')
                ->has('revenueData', 12)
                ->where('revenueData.0.month', 'Jan')
                ->where('chartPeriod', 'year')
                ->has('orderStatusData', 2)
                ->has('lowStockData.data', 1)
                ->where('lowStockData.data.0.1', 'Dahua Camera')
                ->has('pendingPaymentData.data', 1)
                ->has('scheduleData', 1)
                ->has('recentInquiries', 1)
            );
    }



    public function test_dashboard_notice_tables_have_independent_pagination(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);
        $customer = User::factory()->create(['role' => 'user']);

        for ($index = 1; $index <= 7; $index++) {
            Product::create([
                'name' => 'Low Stock Camera ' . $index,
                'category' => 'CCTV',
                'warranty' => '1 year',
                'price' => 2500,
                'stock_quantity' => 1,
                'badge' => null,
                'image' => null,
                'images' => [],
                'specifications' => [],
                'rating' => 0,
                'is_featured' => false,
            ]);

            Order::create([
                'user_id' => $customer->id,
                'order_number' => 'ORD-DASH-PAGE-' . $index,
                'subtotal' => 799,
                'shipping_fee' => 0,
                'total' => 799,
                'payment_method' => 'gcash',
                'payment_status' => 'pending',
                'order_status' => 'awaiting_payment',
                'customer_name' => $customer->name,
                'customer_phone' => '09171234567',
                'customer_email' => $customer->email,
                'delivery_address' => '123 Test Street',
            ]);
        }

        $this->actingAs($admin)
            ->get(route('dashboard', [
                'low_stock_page' => 2,
                'pending_payments_page' => 2,
            ]))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('Dashboard')
                ->where('lowStockData.current_page', 2)
                ->where('lowStockData.total', 7)
                ->has('lowStockData.data', 2)
                ->where('pendingPaymentData.current_page', 2)
                ->where('pendingPaymentData.total', 7)
                ->has('pendingPaymentData.data', 2)
            );
    }

    public function test_dashboard_chart_can_filter_to_the_last_six_months(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);

        $this->actingAs($admin)
            ->get(route('dashboard', ['chart_period' => 'six_months']))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('Dashboard')
                ->where('chartPeriod', 'six_months')
                ->has('revenueData', 6)
            );
    }

    public function test_non_admin_cannot_view_dashboard(): void
    {
        $user = User::factory()->create(['role' => 'user']);

        $this->actingAs($user)
            ->get(route('dashboard'))
            ->assertForbidden();
    }
}
