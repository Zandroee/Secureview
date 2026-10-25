<?php

namespace Tests\Feature;

use App\Models\Order;
use App\Models\OrderItem;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class AdminOrderHistoryViewTest extends TestCase
{
    use RefreshDatabase;

    public function test_order_history_view_link_can_open_the_selected_order_details_in_the_orders_modal(): void
    {
        $admin = User::factory()->create([
            'role' => 'admin',
            'email_verified_at' => now(),
        ]);
        $customer = User::factory()->create(['role' => 'user']);

        $order = Order::create([
            'user_id' => $customer->id,
            'order_number' => 'SV-HISTORY-VIEW-' . uniqid(),
            'subtotal' => 2500,
            'shipping_fee' => 0,
            'installation_fee' => 0,
            'total' => 2500,
            'payment_method' => 'cash',
            'payment_status' => 'paid',
            'order_status' => 'completed',
            'paid_at' => now(),
            'customer_name' => $customer->name,
            'customer_phone' => '09171234567',
            'customer_email' => $customer->email,
            'delivery_address' => '123 Test Street, Taguig',
        ]);

        $order->items()->create([
            'purchasable_type' => \App\Models\Product::class,
            'purchasable_id' => 1,
            'name' => 'History test camera',
            'price' => 2500,
            'quantity' => 1,
            'subtotal' => 2500,
        ]);

        $this->actingAs($admin)
            ->get(route('admin.order-history.index'))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('Admin/OrderHistory')
                ->where('orders.data.0.id', $order->id)
                ->where('orders.data.0.order_number', $order->order_number)
                ->where('orders.data.0.payment_method', 'cash')
                ->where('orders.data.0.payment_status', 'paid')
                ->has('orders.data.0.items', 1)
                ->where('orders.data.0.items.0.name', 'History test camera'));

        // The View link sends the archived order ID along with its status and
        // exact order number; the existing Orders page returns that order's
        // full formatted details so its modal can open directly.
        $this->actingAs($admin)
            ->get('/admin/purchases?' . http_build_query([
                'search' => $order->order_number,
                'order_status' => 'completed',
                'view' => $order->id,
            ]))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('Admin/Purchases')
                ->where('orders.data.0.id', $order->id)
                ->where('orders.data.0.order_number', $order->order_number)
                ->where('orders.data.0.order_status', 'completed')
                ->has('orders.data.0.items', 1)
                ->where('orders.data.0.items.0.name', 'History test camera'));
    }
}
