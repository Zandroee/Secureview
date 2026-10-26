<?php

namespace Tests\Feature;

use App\Models\CustomerNotification;
use App\Models\Order;
use App\Models\Product;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PayMongoWebhookReliabilityTest extends TestCase
{
    use RefreshDatabase;

    private const WEBHOOK_SECRET = 'whsec_secureview_phase_c_test';

    protected function setUp(): void
    {
        parent::setUp();

        config(['services.paymongo.webhook_secret' => self::WEBHOOK_SECRET]);
    }

    public function test_duplicate_paid_webhooks_do_not_deduct_stock_or_notify_twice(): void
    {
        $customer = User::factory()->create(['role' => 'user']);
        $product = $this->makeProduct(stock: 5);
        $order = $this->makeOrder($customer, $product, quantity: 2);

        $this->sendPaidWebhook($order)->assertOk();

        // A later cart can contain new, unrelated items. A duplicate event must
        // not empty that cart simply because the paid order is being retried.
        $unrelatedProduct = $this->makeProduct(stock: 4);
        $cart = $customer->cart()->create();
        $cart->items()->create([
            'purchasable_type' => Product::class,
            'purchasable_id' => $unrelatedProduct->id,
            'quantity' => 1,
            'price' => $unrelatedProduct->price,
        ]);

        $this->sendPaidWebhook($order)->assertOk();

        $this->assertDatabaseHas('cart_items', [
            'cart_id' => $cart->id,
            'purchasable_type' => Product::class,
            'purchasable_id' => $unrelatedProduct->id,
        ]);
        $this->assertSame(3, (int) $product->fresh()->stock_quantity);
        $this->assertSame('paid', $order->fresh()->payment_status);
        $this->assertNotNull($order->fresh()->stock_deducted_at);
        $this->assertSame(
            1,
            CustomerNotification::query()
                ->where('dedupe_key', 'payment-paid:order:' . $order->id)
                ->count()
        );
    }

    public function test_webhook_failure_retries_inventory_deduction_after_stock_is_reconciled(): void
    {
        $customer = User::factory()->create(['role' => 'user']);
        $product = $this->makeProduct(stock: 1);
        $order = $this->makeOrder($customer, $product, quantity: 2);

        // The provider has confirmed payment, but current stock is not enough to
        // fulfill the order. Do not acknowledge the webhook as successfully done.
        $this->sendPaidWebhook($order)->assertStatus(500);

        $this->assertSame('paid', $order->fresh()->payment_status);
        $this->assertNull($order->fresh()->stock_deducted_at);
        $this->assertSame(1, (int) $product->fresh()->stock_quantity);
        $this->assertSame(
            1,
            CustomerNotification::query()
                ->where('dedupe_key', 'payment-paid:order:' . $order->id)
                ->count()
        );

        // After stock is reconciled, a provider retry can complete the deduction.
        $product->update(['stock_quantity' => 3]);

        $this->sendPaidWebhook($order)->assertOk();

        $this->assertSame('paid', $order->fresh()->payment_status);
        $this->assertNotNull($order->fresh()->stock_deducted_at);
        $this->assertSame(1, (int) $product->fresh()->stock_quantity);
        $this->assertSame(
            1,
            CustomerNotification::query()
                ->where('dedupe_key', 'payment-paid:order:' . $order->id)
                ->count()
        );
    }

    public function test_invalid_webhook_signature_cannot_mark_an_order_paid(): void
    {
        $customer = User::factory()->create(['role' => 'user']);
        $product = $this->makeProduct(stock: 5);
        $order = $this->makeOrder($customer, $product, quantity: 2);

        $this->sendPaidWebhook($order, validSignature: false)->assertUnauthorized();

        $this->assertSame('pending', $order->fresh()->payment_status);
        $this->assertNull($order->fresh()->stock_deducted_at);
        $this->assertSame(5, (int) $product->fresh()->stock_quantity);
        $this->assertDatabaseMissing('customer_notifications', [
            'dedupe_key' => 'payment-paid:order:' . $order->id,
        ]);
    }

    private function makeProduct(int $stock): Product
    {
        return Product::create([
            'name' => 'Phase C webhook camera',
            'category' => 'CCTV',
            'warranty' => '1 year',
            'price' => 1000,
            'stock_quantity' => $stock,
            'is_featured' => false,
        ]);
    }

    private function makeOrder(User $customer, Product $product, int $quantity): Order
    {
        $order = Order::create([
            'user_id' => $customer->id,
            'order_number' => 'SV-PHASE-C-' . $customer->id . '-' . $product->id,
            'subtotal' => 1000 * $quantity,
            'shipping_fee' => 0,
            'total' => 1000 * $quantity,
            'payment_method' => 'gcash',
            'paymongo_checkout_session_id' => 'cs_phase_c_' . $customer->id . '_' . $product->id,
            'payment_status' => 'pending',
            'order_status' => 'awaiting_payment',
            'customer_name' => $customer->name,
            'customer_phone' => '09123456789',
            'customer_email' => $customer->email,
            'delivery_address' => '31 Molave Street, Taguig',
        ]);

        $order->items()->create([
            'purchasable_type' => Product::class,
            'purchasable_id' => $product->id,
            'name' => $product->name,
            'price' => $product->price,
            'quantity' => $quantity,
            'subtotal' => $product->price * $quantity,
        ]);

        return $order;
    }

    private function sendPaidWebhook(Order $order, bool $validSignature = true)
    {
        $rawBody = json_encode([
            'data' => [
                'id' => 'evt_phase_c_' . $order->id,
                'type' => 'event',
                'attributes' => [
                    'type' => 'checkout_session.payment.paid',
                    'livemode' => false,
                    'data' => [
                        'id' => $order->paymongo_checkout_session_id,
                        'type' => 'checkout_session',
                        'attributes' => [
                            'reference_number' => $order->order_number,
                            'payments' => [
                                [
                                    'id' => 'pay_phase_c_' . $order->id,
                                    'type' => 'payment',
                                    'attributes' => ['status' => 'paid'],
                                ],
                            ],
                        ],
                    ],
                ],
            ],
        ], JSON_UNESCAPED_SLASHES);

        $timestamp = (string) time();
        $signature = hash_hmac(
            'sha256',
            $timestamp . '.' . $rawBody,
            self::WEBHOOK_SECRET
        );

        if (!$validSignature) {
            $signature = str_repeat('a', 64);
        }

        $server = [
            'CONTENT_TYPE' => 'application/json',
            'HTTP_ACCEPT' => 'application/json',
            'HTTP_PAYMONGO_SIGNATURE' => 't=' . $timestamp . ',te=' . $signature,
        ];

        return $this->call(
            'POST',
            '/api/webhooks/paymongo',
            [],
            [],
            [],
            $server,
            $rawBody
        );
    }
}
