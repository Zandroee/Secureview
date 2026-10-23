<?php

namespace Tests\Feature;

use App\Models\Order;
use App\Models\OrderItem;
use App\Models\Product;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class OrderCancellationTest extends TestCase
{
    use RefreshDatabase;

    public function test_customer_can_cancel_an_unpaid_cash_order_and_stock_is_restored(): void
    {
        $customer = $this->createCustomer();
        $product = $this->createProduct(4);
        $order = $this->createOrder($customer, $product, [
            'payment_method' => 'cash',
            'payment_status' => 'pending',
            'order_status' => 'pending',
            'stock_deducted_at' => now(),
        ]);

        $this->actingAs($customer)
            ->patch(route('purchases.cancel', $order))
            ->assertRedirect()
            ->assertSessionHasNoErrors();

        $this->assertDatabaseHas('orders', [
            'id' => $order->id,
            'order_status' => 'cancelled',
            'payment_status' => 'cancelled',
            'stock_deducted_at' => null,
            'cancellation_reason' => 'Cancelled by customer.',
        ]);
        $this->assertDatabaseHas('products', [
            'id' => $product->id,
            'stock_quantity' => 5,
        ]);
    }

    public function test_customer_cannot_cancel_another_customers_order(): void
    {
        $owner = $this->createCustomer();
        $otherCustomer = $this->createCustomer();
        $product = $this->createProduct(5);
        $order = $this->createOrder($owner, $product);

        $this->actingAs($otherCustomer)
            ->patch(route('purchases.cancel', $order))
            ->assertNotFound();

        $this->assertDatabaseHas('orders', [
            'id' => $order->id,
            'order_status' => 'awaiting_payment',
        ]);
    }

    public function test_customer_cannot_cancel_a_paid_order(): void
    {
        $customer = $this->createCustomer();
        $product = $this->createProduct(4);
        $order = $this->createOrder($customer, $product, [
            'payment_status' => 'paid',
            'order_status' => 'processing',
            'paid_at' => now(),
        ]);

        $this->actingAs($customer)
            ->from(route('purchases.show', $order))
            ->patch(route('purchases.cancel', $order))
            ->assertRedirect(route('purchases.show', $order))
            ->assertSessionHasErrors('order');

        $this->assertDatabaseHas('orders', [
            'id' => $order->id,
            'payment_status' => 'paid',
            'order_status' => 'processing',
        ]);
    }

    public function test_cancelling_online_order_expires_paymongo_checkout_session(): void
    {
        config([
            'services.paymongo.secret_key' => 'sk_test_secureview',
            'services.paymongo.base_url' => 'https://api.paymongo.com',
        ]);

        Http::fake([
            'https://api.paymongo.com/v1/checkout_sessions/cs_cancel_test/expire' => Http::response([
                'data' => ['id' => 'cs_cancel_test', 'attributes' => ['status' => 'expired']],
            ], 200),
        ]);

        $customer = $this->createCustomer();
        $product = $this->createProduct(5);
        $order = $this->createOrder($customer, $product, [
            'payment_method' => 'gcash',
            'payment_status' => 'pending',
            'order_status' => 'awaiting_payment',
            'paymongo_checkout_session_id' => 'cs_cancel_test',
        ]);

        $this->actingAs($customer)
            ->patch(route('purchases.cancel', $order))
            ->assertRedirect()
            ->assertSessionHasNoErrors();

        Http::assertSent(fn ($request) =>
            $request->method() === 'POST'
            && str_ends_with($request->url(), '/v1/checkout_sessions/cs_cancel_test/expire')
        );

        $this->assertDatabaseHas('orders', [
            'id' => $order->id,
            'order_status' => 'cancelled',
            'payment_status' => 'pending',
        ]);
    }

    public function test_order_is_not_cancelled_when_paymongo_says_checkout_is_still_active(): void
    {
        config([
            'services.paymongo.secret_key' => 'sk_test_secureview',
            'services.paymongo.base_url' => 'https://api.paymongo.com',
        ]);

        Http::fake([
            'https://api.paymongo.com/v1/checkout_sessions/cs_active_test/expire' => Http::response([
                'errors' => [['detail' => 'The checkout session cannot be expired.']],
            ], 400),
            'https://api.paymongo.com/v1/checkout_sessions/cs_active_test' => Http::response([
                'data' => [
                    'id' => 'cs_active_test',
                    'attributes' => [
                        'status' => 'active',
                        'payments' => [[
                            'id' => 'pay_waiting_test',
                            'attributes' => ['status' => 'pending'],
                        ]],
                    ],
                ],
            ], 200),
        ]);

        $customer = $this->createCustomer();
        $product = $this->createProduct(5);
        $order = $this->createOrder($customer, $product, [
            'payment_method' => 'gcash',
            'payment_status' => 'pending',
            'order_status' => 'awaiting_payment',
            'paymongo_checkout_session_id' => 'cs_active_test',
        ]);

        $this->actingAs($customer)
            ->from(route('purchases.show', $order))
            ->patch(route('purchases.cancel', $order))
            ->assertRedirect(route('purchases.show', $order))
            ->assertSessionHasErrors('order');

        $this->assertDatabaseHas('orders', [
            'id' => $order->id,
            'order_status' => 'awaiting_payment',
            'payment_status' => 'pending',
        ]);
    }

    public function test_admin_can_cancel_an_unpaid_order_and_action_is_logged(): void
    {
        $admin = User::factory()->create([
            'role' => 'admin',
            'email_verified_at' => now(),
        ]);
        $customer = $this->createCustomer();
        $product = $this->createProduct(5);
        $order = $this->createOrder($customer, $product, [
            'payment_method' => 'gcash',
            'payment_status' => 'failed',
            'order_status' => 'payment_failed',
        ]);

        $reason = 'Payment failed and customer did not proceed.';

        $this->actingAs($admin)
            ->patch(route('admin.purchases.cancel', $order), ['reason' => $reason])
            ->assertRedirect()
            ->assertSessionHasNoErrors();

        $this->assertDatabaseHas('orders', [
            'id' => $order->id,
            'order_status' => 'cancelled',
            'payment_status' => 'cancelled',
            'cancellation_reason' => 'Payment failed and customer did not proceed.',
        ]);
        $this->assertDatabaseHas('admin_activity_logs', [
            'admin_id' => $admin->id,
            'action' => 'order_cancelled',
            'subject_type' => 'Order',
            'subject_id' => $order->id,
        ]);
        $this->assertDatabaseHas('customer_notifications', [
            'user_id' => $customer->id,
            'type' => 'order_cancelled',
            'related_id' => $order->id,
        ]);
    }

    public function test_admin_cannot_cancel_an_unpaid_order_without_a_reason(): void
    {
        $admin = User::factory()->create([
            'role' => 'admin',
            'email_verified_at' => now(),
        ]);
        $customer = $this->createCustomer();
        $product = $this->createProduct(5);
        $order = $this->createOrder($customer, $product, [
            'payment_method' => 'gcash',
            'payment_status' => 'failed',
            'order_status' => 'payment_failed',
        ]);

        $this->actingAs($admin)
            ->from(route('admin.purchases.index'))
            ->patch(route('admin.purchases.cancel', $order))
            ->assertRedirect(route('admin.purchases.index'))
            ->assertSessionHasErrors('reason');

        $this->assertDatabaseHas('orders', [
            'id' => $order->id,
            'order_status' => 'payment_failed',
            'cancellation_reason' => null,
        ]);
    }

    public function test_admin_payment_queue_separates_pending_failed_cash_and_stale_orders(): void
    {
        $admin = User::factory()->create([
            'role' => 'admin',
            'email_verified_at' => now(),
        ]);
        $customer = $this->createCustomer();
        $product = $this->createProduct(20);

        $this->createOrder($customer, $product, [
            'order_number' => 'ORD-ATTN-PENDING',
            'payment_method' => 'gcash',
            'payment_status' => 'pending',
            'order_status' => 'awaiting_payment',
        ]);

        $this->createOrder($customer, $product, [
            'order_number' => 'ORD-ATTN-FAILED',
            'payment_method' => 'gcash',
            'payment_status' => 'failed',
            'order_status' => 'payment_failed',
        ]);

        $this->createOrder($customer, $product, [
            'order_number' => 'ORD-ATTN-CASH',
            'payment_method' => 'cash',
            'payment_status' => 'pending',
            'order_status' => 'pending',
        ]);

        $staleOrder = $this->createOrder($customer, $product, [
            'order_number' => 'ORD-ATTN-STALE',
            'payment_method' => 'gcash',
            'payment_status' => 'pending',
            'order_status' => 'awaiting_payment',
        ]);
        $staleOrder->timestamps = false;
        $staleOrder->forceFill(['updated_at' => now()->subHours(30)])->save();

        $this->actingAs($admin)
            ->get(route('admin.purchases.index'))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('Admin/Purchases')
                ->where('summary.pending_online_payments', 2)
                ->where('summary.failed_payments', 1)
                ->where('summary.cash_awaiting_confirmation', 1)
                ->where('summary.stale_unpaid_orders', 1)
                ->has('attentionOrders', 4)
                ->where('attentionOrders.0.order_number', 'ORD-ATTN-FAILED')
                ->where('attentionOrders.2.order_number', 'ORD-ATTN-STALE')
                ->where('attentionOrders.2.is_stale_unpaid', true));

        $this->actingAs($admin)
            ->get(route('admin.purchases.index', ['attention' => 'stale']))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('Admin/Purchases')
                ->where('filters.attention', 'stale')
                ->has('orders.data', 1)
                ->where('orders.data.0.order_number', 'ORD-ATTN-STALE'));
    }

    public function test_admin_order_management_is_paginated_and_filters_by_status(): void
    {
        $admin = User::factory()->create([
            'role' => 'admin',
            'email_verified_at' => now(),
        ]);
        $customer = $this->createCustomer();
        $product = $this->createProduct(20);

        for ($i = 1; $i <= 13; $i++) {
            $this->createOrder($customer, $product, [
                'order_number' => 'ORD-PAGE-' . $i,
                'order_status' => $i === 13 ? 'payment_failed' : 'awaiting_payment',
                'payment_status' => $i === 13 ? 'failed' : 'pending',
            ]);
        }

        $this->actingAs($admin)
            ->get(route('admin.purchases.index', [
                'order_status' => 'payment_failed',
            ]))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('Admin/Purchases')
                ->has('orders.data', 1)
                ->where('orders.total', 1)
                ->where('filters.order_status', 'payment_failed')
                ->where('orders.data.0.order_status', 'payment_failed'));
    }

    public function test_admin_can_confirm_cash_received_and_start_processing(): void
    {
        $admin = User::factory()->create([
            'role' => 'admin',
            'email_verified_at' => now(),
        ]);
        $customer = $this->createCustomer();
        $product = $this->createProduct(4);
        $order = $this->createOrder($customer, $product, [
            'payment_method' => 'cash',
            'payment_status' => 'pending',
            'order_status' => 'pending',
            'stock_deducted_at' => now(),
        ]);

        $this->actingAs($admin)
            ->patch(route('admin.purchases.confirm-cash-payment', $order))
            ->assertRedirect()
            ->assertSessionHasNoErrors();

        $this->assertDatabaseHas('orders', [
            'id' => $order->id,
            'payment_method' => 'cash',
            'payment_status' => 'paid',
            'order_status' => 'processing',
        ]);
        $this->assertDatabaseHas('customer_notifications', [
            'user_id' => $customer->id,
            'type' => 'payment_paid',
            'related_id' => $order->id,
        ]);
        $this->assertDatabaseHas('admin_activity_logs', [
            'admin_id' => $admin->id,
            'action' => 'order_cash_payment_confirmed',
            'subject_type' => 'Order',
            'subject_id' => $order->id,
        ]);
    }

    public function test_admin_can_mark_a_paid_fulfilled_order_completed(): void
    {
        $admin = User::factory()->create([
            'role' => 'admin',
            'email_verified_at' => now(),
        ]);
        $customer = $this->createCustomer();
        $product = $this->createProduct(4);
        $order = $this->createOrder($customer, $product, [
            'payment_status' => 'paid',
            'order_status' => 'processing',
            'paid_at' => now(),
        ]);

        $this->actingAs($admin)
            ->patch(route('admin.purchases.complete', $order))
            ->assertRedirect()
            ->assertSessionHasNoErrors();

        $this->assertDatabaseHas('orders', [
            'id' => $order->id,
            'payment_status' => 'paid',
            'order_status' => 'completed',
        ]);
        $this->assertDatabaseHas('customer_notifications', [
            'user_id' => $customer->id,
            'type' => 'order_completed',
            'related_id' => $order->id,
        ]);
        $this->assertDatabaseHas('admin_activity_logs', [
            'admin_id' => $admin->id,
            'action' => 'order_completed',
            'subject_type' => 'Order',
            'subject_id' => $order->id,
        ]);
    }

    private function createCustomer(): User
    {
        return User::factory()->create([
            'role' => 'user',
            'email_verified_at' => now(),
        ]);
    }

    private function createProduct(int $stock): Product
    {
        return Product::create([
            'name' => 'Order Cancellation Camera',
            'category' => 'CCTV',
            'warranty' => '1 year',
            'price' => 2500,
            'stock_quantity' => $stock,
            'specifications' => [],
            'rating' => 0,
            'is_featured' => false,
        ]);
    }

    private function createOrder(User $customer, Product $product, array $overrides = []): Order
    {
        $order = Order::create(array_merge([
            'user_id' => $customer->id,
            'order_number' => 'ORD-CANCEL-' . fake()->unique()->numerify('######'),
            'subtotal' => 2500,
            'shipping_fee' => 0,
            'installation_fee' => 0,
            'total' => 2500,
            'payment_method' => 'gcash',
            'payment_status' => 'pending',
            'order_status' => 'awaiting_payment',
            'customer_name' => $customer->name,
            'customer_phone' => '09171234567',
            'customer_email' => $customer->email,
            'delivery_address' => '123 Test Street, Taguig',
        ], $overrides));

        $order->items()->create([
            'purchasable_type' => Product::class,
            'purchasable_id' => $product->id,
            'name' => $product->name,
            'warranty_period' => $product->warranty,
            'price' => 2500,
            'quantity' => 1,
            'subtotal' => 2500,
        ]);

        return $order;
    }
}
