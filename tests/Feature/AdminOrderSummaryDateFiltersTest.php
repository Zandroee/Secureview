<?php

namespace Tests\Feature;

use App\Models\Order;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class AdminOrderSummaryDateFiltersTest extends TestCase
{
    use RefreshDatabase;

    public function test_order_summary_cards_follow_the_selected_date_range(): void
    {
        $admin = User::factory()->create([
            'role' => 'admin',
            'email_verified_at' => now(),
        ]);
        $customer = User::factory()->create(['role' => 'user']);
        $from = now()->subDays(7)->toDateString();
        $to = now()->toDateString();

        $this->createOrder($customer, 'SV-SUMMARY-IN-RANGE-PAID', 'processing', 'paid', 1000, now()->subDays(3));
        $this->createOrder($customer, 'SV-SUMMARY-IN-RANGE-PENDING', 'awaiting_payment', 'pending', 600, now()->subDays(2));
        $this->createOrder($customer, 'SV-SUMMARY-OUT-OF-RANGE', 'processing', 'paid', 2500, now()->subDays(20));

        $this->actingAs($admin)
            ->get('/admin/purchases?' . http_build_query([
                'date_from' => $from,
                'date_to' => $to,
            ]))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('Admin/Purchases')
                ->where('summary.total_orders', 2)
                ->where('summary.paid_orders', 1)
                ->where('summary.pending_payments', 1)
                ->where('summary.revenue', 1000)
                ->where('filters.date_from', $from)
                ->where('filters.date_to', $to));
    }

    public function test_order_history_summary_cards_follow_the_selected_date_range(): void
    {
        $admin = User::factory()->create([
            'role' => 'admin',
            'email_verified_at' => now(),
        ]);
        $customer = User::factory()->create(['role' => 'user']);
        $from = now()->subDays(7)->toDateString();
        $to = now()->toDateString();

        $this->createOrder($customer, 'SV-HISTORY-IN-RANGE-DONE', 'completed', 'paid', 1200, now()->subDays(3));
        $this->createOrder($customer, 'SV-HISTORY-IN-RANGE-CANCEL', 'cancelled', 'cancelled', 500, now()->subDays(2));
        $this->createOrder($customer, 'SV-HISTORY-OUT-OF-RANGE', 'completed', 'paid', 3500, now()->subDays(20));

        $this->actingAs($admin)
            ->get('/admin/order-history?' . http_build_query([
                'date_from' => $from,
                'date_to' => $to,
            ]))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('Admin/OrderHistory')
                ->where('summary.completed_orders', 1)
                ->where('summary.cancelled_orders', 1)
                ->where('summary.completed_paid_revenue', 1200)
                ->where('filters.date_from', $from)
                ->where('filters.date_to', $to));
    }

    private function createOrder(
        User $customer,
        string $orderNumber,
        string $orderStatus,
        string $paymentStatus,
        float $total,
        \Illuminate\Support\Carbon|\Carbon\Carbon $createdAt
    ): Order {
        $order = Order::create([
            'user_id' => $customer->id,
            'order_number' => $orderNumber,
            'subtotal' => $total,
            'installation_fee' => 0,
            'service_priority_fee' => 0,
            'shipping_fee' => 0,
            'total' => $total,
            'payment_method' => 'cash',
            'payment_status' => $paymentStatus,
            'order_status' => $orderStatus,
            'customer_name' => $customer->name,
            'customer_phone' => '09171234567',
            'customer_email' => $customer->email,
            'delivery_address' => '123 Test Street, Taguig',
        ]);

        $order->forceFill([
            'created_at' => $createdAt,
            'updated_at' => $createdAt,
            'paid_at' => $paymentStatus === 'paid' ? $createdAt : null,
        ])->save();

        return $order;
    }
}
