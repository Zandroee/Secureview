<?php

namespace Tests\Feature;

use App\Models\Order;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class AdminOrderHistoryTest extends TestCase
{
    use RefreshDatabase;

    public function test_admin_can_view_and_filter_completed_and_cancelled_orders_history(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);
        $customer = User::factory()->create(['role' => 'user']);

        $completed = $this->makeOrder($customer, 'SV-HISTORY-COMPLETE', 'paid', 'completed');
        $cancelled = $this->makeOrder($customer, 'SV-HISTORY-CANCELLED', 'pending', 'cancelled');
        $pending = $this->makeOrder($customer, 'SV-HISTORY-PENDING', 'pending', 'awaiting_payment');

        $this->actingAs($admin)
            ->get(route('admin.order-history.index'))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('Admin/OrderHistory')
                ->has('orders.data', 2)
                ->where('summary.completed_orders', 1)
                ->where('summary.cancelled_orders', 1)
                ->where('orders.data.0.order_number', $cancelled->order_number)
                ->where('orders.data.1.order_number', $completed->order_number)
            );

        $this->actingAs($admin)
            ->get(route('admin.order-history.index', ['search' => 'SV-HISTORY-COMPLETE', 'order_status' => 'completed']))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('Admin/OrderHistory')
                ->has('orders.data', 1)
                ->where('orders.data.0.id', $completed->id)
            );

        $this->actingAs($admin)
            ->get(route('admin.purchases.index'))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('Admin/Purchases')
                ->where('orders.total', 1)
                ->where('orders.data.0.id', $pending->id)
            );
    }

    private function makeOrder(User $customer, string $number, string $paymentStatus, string $status): Order
    {
        return Order::create([
            'user_id' => $customer->id,
            'order_number' => $number,
            'subtotal' => 1200,
            'shipping_fee' => 0,
            'total' => 1200,
            'payment_method' => 'cash',
            'payment_status' => $paymentStatus,
            'order_status' => $status,
            'paid_at' => $paymentStatus === 'paid' ? now() : null,
            'customer_name' => $customer->name,
            'customer_phone' => '09171234567',
            'customer_email' => $customer->email,
            'delivery_address' => '123 Test Street, Taguig',
        ]);
    }
}
