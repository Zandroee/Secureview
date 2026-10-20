<?php

namespace Tests\Feature;

use App\Models\Order;
use App\Models\OrderEvent;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class OrderTimelineTest extends TestCase
{
    use RefreshDatabase;

    public function test_order_creation_payment_transitions_and_payment_retries_are_recorded(): void
    {
        $customer = User::factory()->create([
            'role' => 'user',
            'email_verified_at' => now(),
        ]);

        $this->actingAs($customer);

        $order = Order::create([
            'user_id' => $customer->id,
            'order_number' => 'SV-TIMELINE-001',
            'subtotal' => 1200,
            'shipping_fee' => 0,
            'total' => 1200,
            'payment_method' => 'gcash',
            'payment_status' => 'pending',
            'order_status' => 'awaiting_payment',
            'customer_name' => $customer->name,
            'customer_phone' => '09171234567',
            'customer_email' => $customer->email,
            'delivery_address' => '123 Test Street, Taguig',
        ]);

        $order->update([
            'paymongo_checkout_session_id' => 'cs_timeline_first',
        ]);

        $order->update([
            'payment_status' => 'failed',
            'order_status' => 'payment_failed',
        ]);

        $order->update([
            'paymongo_checkout_session_id' => 'cs_timeline_retry',
            'payment_status' => 'pending',
            'order_status' => 'awaiting_payment',
        ]);

        $order->update([
            'payment_status' => 'paid',
            'order_status' => 'processing',
            'paymongo_payment_id' => 'pay_timeline_confirmed',
            'paid_at' => now(),
        ]);

        $this->assertDatabaseHas('order_events', [
            'order_id' => $order->id,
            'event_key' => 'order_created',
            'actor_user_id' => $customer->id,
            'payment_status_after' => 'pending',
            'order_status_after' => 'awaiting_payment',
        ]);

        $this->assertDatabaseHas('order_events', [
            'order_id' => $order->id,
            'event_key' => 'checkout_session_created',
        ]);

        $this->assertDatabaseHas('order_events', [
            'order_id' => $order->id,
            'event_key' => 'payment_status_changed',
            'payment_status_before' => 'pending',
            'payment_status_after' => 'failed',
        ]);

        $this->assertDatabaseHas('order_events', [
            'order_id' => $order->id,
            'event_key' => 'payment_retry_started',
        ]);

        $paymentConfirmedEvent = OrderEvent::query()
            ->where('order_id', $order->id)
            ->where('event_key', 'payment_status_changed')
            ->where('payment_status_after', 'paid')
            ->firstOrFail();

        $this->assertSame('pending', $paymentConfirmedEvent->payment_status_before);
        $this->assertSame('pay_timeline_confirmed', $paymentConfirmedEvent->metadata['payment_reference']);

        $this->assertDatabaseHas('order_events', [
            'order_id' => $order->id,
            'event_key' => 'order_status_changed',
            'order_status_before' => 'payment_failed',
            'order_status_after' => 'awaiting_payment',
        ]);

        $this->assertDatabaseHas('order_events', [
            'order_id' => $order->id,
            'event_key' => 'order_status_changed',
            'order_status_before' => 'awaiting_payment',
            'order_status_after' => 'processing',
        ]);
    }

    public function test_customer_order_details_receive_order_timeline(): void
    {
        $customer = User::factory()->create([
            'role' => 'user',
            'email_verified_at' => now(),
        ]);

        $this->actingAs($customer);

        $order = $this->createOrder($customer);
        $order->update([
            'payment_status' => 'paid',
            'order_status' => 'processing',
            'paid_at' => now(),
        ]);

        $this->get(route('purchases.show', $order))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('purchase_details')
                ->has('order.timeline', 3)
                ->where('order.timeline.0.title', 'Order placed')
                ->where('order.timeline.1.title', 'Payment confirmed')
                ->where('order.timeline.2.title', 'Order status changed to processing')
                ->where('order.timeline.0.actor_label', $customer->name)
            );

        $otherCustomer = User::factory()->create([
            'role' => 'user',
            'email_verified_at' => now(),
        ]);

        $this->actingAs($otherCustomer)
            ->get(route('purchases.show', $order))
            ->assertNotFound();
    }

    public function test_admin_purchase_and_transaction_details_include_the_same_timeline(): void
    {
        $admin = User::factory()->create([
            'role' => 'admin',
            'email_verified_at' => now(),
        ]);
        $customer = User::factory()->create([
            'role' => 'user',
            'email_verified_at' => now(),
        ]);

        $order = $this->createOrder($customer);
        $order->update([
            'payment_status' => 'paid',
            'order_status' => 'processing',
            'paid_at' => now(),
        ]);

        $this->actingAs($admin)
            ->get(route('admin.purchases.index'))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('Admin/Purchases')
                ->where('orders.data.0.id', $order->id)
                ->has('orders.data.0.timeline', 3));

        $this->actingAs($admin)
            ->get(route('admin.transactions.index'))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('Admin/Transactions')
                ->where('transactions.data.0.id', $order->id)
                ->has('transactions.data.0.timeline', 3));
    }

    private function createOrder(User $customer): Order
    {
        return Order::create([
            'user_id' => $customer->id,
            'order_number' => 'SV-TIMELINE-' . uniqid(),
            'subtotal' => 1200,
            'shipping_fee' => 0,
            'total' => 1200,
            'payment_method' => 'gcash',
            'payment_status' => 'pending',
            'order_status' => 'awaiting_payment',
            'customer_name' => $customer->name,
            'customer_phone' => '09171234567',
            'customer_email' => $customer->email,
            'delivery_address' => '123 Test Street, Taguig',
        ]);
    }
}
