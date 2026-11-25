<?php

namespace Tests\Feature;

use App\Models\Order;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class DeliveryTrackingTest extends TestCase
{
    use RefreshDatabase;

    private function makeOrder(User $customer, array $changes = []): Order
    {
        return Order::create(array_merge([
            'user_id' => $customer->id,
            'order_number' => 'SV-SHIP-' . uniqid(),
            'subtotal' => 1200,
            'shipping_fee' => 0,
            'total' => 1200,
            'payment_method' => 'gcash',
            'payment_status' => 'paid',
            'paid_at' => now(),
            'order_status' => 'processing',
            'fulfillment_method' => 'delivery',
            'customer_name' => $customer->name,
            'customer_phone' => '09171234567',
            'customer_email' => $customer->email,
            'delivery_address' => '12 Test Road, Taguig City',
        ], $changes));
    }

    public function test_admin_can_mark_paid_delivery_out_for_delivery_then_delivered(): void
    {
        $admin = User::factory()->create(['role' => 'admin', 'email_verified_at' => now()]);
        $customer = User::factory()->create(['role' => 'user', 'email_verified_at' => now()]);
        $order = $this->makeOrder($customer);

        $this->actingAs($admin)
            ->patch(route('admin.purchases.delivery-status', [$order, 'out_for_delivery']))
            ->assertRedirect()
            ->assertSessionHasNoErrors();

        $this->assertSame('out_for_delivery', $order->fresh()->order_status);
        $this->assertDatabaseHas('order_events', [
            'order_id' => $order->id,
            'event_key' => 'shipment_status_changed',
            'order_status_before' => 'processing',
            'order_status_after' => 'out_for_delivery',
        ]);

        $this->actingAs($customer)
            ->get(route('purchases.show', $order))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->where('order.order_status', 'out_for_delivery')
                ->where('order.timeline.0.event_key', 'shipment_status_changed'));

        $this->actingAs($admin)
            ->patch(route('admin.purchases.delivery-status', [$order, 'delivered']))
            ->assertRedirect()
            ->assertSessionHasNoErrors();

        $this->assertSame('delivered', $order->fresh()->order_status);
        $this->assertSame(2, $order->events()->where('event_key', 'shipment_status_changed')->count());
        $this->assertDatabaseHas('customer_notifications', [
            'user_id' => $customer->id,
            'title' => 'Order delivered',
        ]);
    }

    public function test_shipping_rejects_unpaid_pickup_and_out_of_sequence_orders(): void
    {
        $admin = User::factory()->create(['role' => 'admin', 'email_verified_at' => now()]);
        $customer = User::factory()->create(['role' => 'user', 'email_verified_at' => now()]);
        $unpaid = $this->makeOrder($customer, ['payment_status' => 'pending', 'paid_at' => null]);
        $pickup = $this->makeOrder($customer, ['fulfillment_method' => 'pickup']);
        $normal = $this->makeOrder($customer);

        foreach ([[$unpaid, 'out_for_delivery'], [$pickup, 'out_for_delivery'], [$normal, 'delivered']] as [$order, $status]) {
            $this->actingAs($admin)
                ->patch(route('admin.purchases.delivery-status', [$order, $status]))
                ->assertSessionHasErrors('order');
            $this->assertSame('processing', $order->fresh()->order_status);
        }
    }

    public function test_customers_cannot_mark_shipments(): void
    {
        $customer = User::factory()->create(['role' => 'user', 'email_verified_at' => now()]);
        $order = $this->makeOrder($customer);

        $this->actingAs($customer)
            ->patch(route('admin.purchases.delivery-status', [$order, 'out_for_delivery']))
            ->assertForbidden();
    }
}
