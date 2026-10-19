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
                ->has('orderStatusData', 7)
                ->where('orderStatusData.3.key', 'processing')
                ->where('orderStatusData.3.count', 1)
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


    public function test_dashboard_metric_cards_can_use_independent_time_filters(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);
        $currentCustomer = User::factory()->create(['role' => 'user']);
        $oldCustomer = User::factory()->create(['role' => 'user']);
        $oldCustomer->forceFill([
            'created_at' => now()->subMonths(2),
            'updated_at' => now()->subMonths(2),
        ])->save();

        Order::create([
            'user_id' => $currentCustomer->id,
            'order_number' => 'ORD-FILTER-CURRENT',
            'subtotal' => 1500,
            'shipping_fee' => 0,
            'total' => 1500,
            'payment_method' => 'cash',
            'payment_status' => 'paid',
            'order_status' => 'processing',
            'paid_at' => now(),
            'customer_name' => $currentCustomer->name,
            'customer_phone' => '09171234567',
            'customer_email' => $currentCustomer->email,
            'delivery_address' => '123 Test Street',
        ]);

        $oldOrder = Order::create([
            'user_id' => $oldCustomer->id,
            'order_number' => 'ORD-FILTER-OLD',
            'subtotal' => 2000,
            'shipping_fee' => 0,
            'total' => 2000,
            'payment_method' => 'cash',
            'payment_status' => 'paid',
            'order_status' => 'processing',
            'paid_at' => now(),
            'customer_name' => $oldCustomer->name,
            'customer_phone' => '09171234567',
            'customer_email' => $oldCustomer->email,
            'delivery_address' => '123 Test Street',
        ]);
        $oldOrder->forceFill([
            'created_at' => now()->subMonths(2),
            'updated_at' => now()->subMonths(2),
            'paid_at' => now()->subMonths(2),
        ])->save();

        $currentInquiry = Inquiry::create([
            'user_id' => $currentCustomer->id,
            'technician_id' => null,
            'inquiry_number' => 'INQ-FILTER-CURRENT',
            'item_name' => 'CCTV Camera',
            'customer_name' => $currentCustomer->name,
            'customer_phone' => '09171234567',
            'customer_email' => $currentCustomer->email,
            'street_address' => '123 Test Street',
            'city' => 'Taguig',
            'service_type' => 'CCTV Installation',
            'urgency' => 'normal',
            'preferred_date' => today(),
            'preferred_time' => '10:00',
            'notes' => null,
            'status' => 'confirmed',
        ]);

        Inquiry::create([
            'user_id' => $oldCustomer->id,
            'technician_id' => null,
            'inquiry_number' => 'INQ-FILTER-OLD',
            'item_name' => 'CCTV Camera',
            'customer_name' => $oldCustomer->name,
            'customer_phone' => '09171234567',
            'customer_email' => $oldCustomer->email,
            'street_address' => '123 Test Street',
            'city' => 'Taguig',
            'service_type' => 'CCTV Installation',
            'urgency' => 'normal',
            'preferred_date' => today()->subMonths(2),
            'preferred_time' => '10:00',
            'notes' => null,
            'status' => 'confirmed',
        ]);

        $this->actingAs($admin)
            ->get(route('dashboard', [
                'sales_period' => 'all_time',
                'orders_period' => 'today',
                'installations_period' => 'today',
                'customers_period' => 'today',
                'chart_period' => 'last_30_days',
            ]))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('Dashboard')
                ->where('stats.0.value', '₱3,500.00')
                ->where('stats.0.period', 'all_time')
                ->where('stats.1.value', '1')
                ->where('stats.1.period', 'today')
                ->where('stats.2.value', '1')
                ->where('stats.2.period', 'today')
                ->where('stats.3.value', '1')
                ->where('stats.3.period', 'today')
                ->where('dashboardFilters.sales_period', 'all_time')
                ->where('dashboardFilters.chart_period', 'last_30_days')
                ->has('revenueData', 30)
            );
    }

    public function test_dashboard_chart_supports_multi_year_and_all_time_ranges(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);

        $this->actingAs($admin)
            ->get(route('dashboard', ['chart_period' => 'five_years']))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('Dashboard')
                ->where('chartPeriod', 'five_years')
                ->has('revenueData', 60)
                ->has('chartPeriodOptions', 12)
                ->where('chartPeriodOptions.11.value', 'all_time')
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
