<?php

namespace Tests\Feature;

use App\Models\Inquiry;
use App\Models\Order;
use App\Models\PendingInquiryCheckout;
use App\Models\Product;
use App\Models\Refund;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class RefundManagementTest extends TestCase
{
    use RefreshDatabase;

    private const WEBHOOK_SECRET = 'refund-webhook-secret';

    protected function setUp(): void
    {
        parent::setUp();

        config([
            'services.paymongo.secret_key' => 'sk_test_refunds',
            'services.paymongo.webhook_secret' => self::WEBHOOK_SECRET,
            'services.paymongo.base_url' => 'https://api.paymongo.com',
        ]);
    }

    public function test_customer_can_request_a_partial_refund_and_the_balance_is_reserved(): void
    {
        $customer = $this->createCustomer();
        $product = $this->createProduct();
        $order = $this->createPaidOrder($customer, $product);

        $this->actingAs($customer)
            ->post(route('purchases.refunds.store', $order), [
                'amount' => 1500,
                'reason' => 'The package arrived with a damaged component.',
            ])
            ->assertRedirect()
            ->assertSessionHasNoErrors();

        $this->assertDatabaseHas('refunds', [
            'order_id' => $order->id,
            'customer_id' => $customer->id,
            'amount_requested' => 1500,
            'status' => 'pending',
            'source' => 'customer_request',
        ]);

        $this->assertSame(1000.0, app(\App\Services\RefundService::class)->availableAmount($order->fresh()));

        $this->actingAs($customer)
            ->post(route('purchases.refunds.store', $order), [
                'amount' => 1000.01,
                'reason' => 'Another refund request would exceed the available balance.',
            ])
            ->assertRedirect()
            ->assertSessionHasErrors('amount');
    }

    public function test_customer_cannot_request_a_refund_for_another_customers_order(): void
    {
        $owner = $this->createCustomer();
        $otherCustomer = $this->createCustomer();
        $product = $this->createProduct();
        $order = $this->createPaidOrder($owner, $product);

        $this->actingAs($otherCustomer)
            ->post(route('purchases.refunds.store', $order), [
                'amount' => 100,
                'reason' => 'I want a refund for this order.',
            ])
            ->assertNotFound();

        $this->assertDatabaseCount('refunds', 0);
    }

    public function test_admin_approval_submits_partial_paymongo_refund_and_updates_payment_status_only_after_success(): void
    {
        $admin = $this->createAdmin();
        $customer = $this->createCustomer();
        $product = $this->createProduct();
        $order = $this->createPaidOrder($customer, $product, [
            'paymongo_payment_id' => 'pay_refund_partial_001',
        ]);

        $this->actingAs($customer)
            ->post(route('purchases.refunds.store', $order), [
                'amount' => 500,
                'reason' => 'One of the purchased accessories is defective.',
            ])
            ->assertRedirect();

        $refund = Refund::query()->firstOrFail();

        Http::fake([
            'https://api.paymongo.com/v1/refunds' => Http::response([
                'data' => [
                    'id' => 're_partial_001',
                    'type' => 'refund',
                    'attributes' => [
                        'amount' => 50000,
                        'payment_id' => 'pay_refund_partial_001',
                        'status' => 'succeeded',
                        'reason' => 'others',
                    ],
                ],
            ], 200),
        ]);

        $this->actingAs($admin)
            ->patch(route('admin.refunds.approve', $refund), [
                'approved_amount' => 500,
                'admin_notes' => 'Verified the reported accessory issue.',
            ])
            ->assertRedirect()
            ->assertSessionHasNoErrors();

        $this->assertDatabaseHas('refunds', [
            'id' => $refund->id,
            'provider' => 'paymongo',
            'provider_refund_id' => 're_partial_001',
            'status' => 'completed',
            'provider_status' => 'succeeded',
            'amount_approved' => 500,
        ]);

        $this->assertSame('partially_refunded', $order->fresh()->payment_status);

        Http::assertSent(function ($request) {
            return $request->method() === 'POST'
                && str_ends_with($request->url(), '/v1/refunds')
                && ($request['data']['attributes']['amount'] ?? null) === 50000
                && ($request['data']['attributes']['payment_id'] ?? null) === 'pay_refund_partial_001'
                && ($request['data']['attributes']['reason'] ?? null) === 'others';
        });
    }

    public function test_cash_refund_requires_admin_confirmation_after_money_is_physically_returned(): void
    {
        $admin = $this->createAdmin();
        $customer = $this->createCustomer();
        $product = $this->createProduct();
        $order = $this->createPaidOrder($customer, $product, [
            'payment_method' => 'cash',
            'paymongo_payment_id' => null,
        ]);

        $this->actingAs($customer)
            ->post(route('purchases.refunds.store', $order), [
                'amount' => 250,
                'reason' => 'A component was missing from the delivered package.',
            ])
            ->assertRedirect();

        $refund = Refund::query()->firstOrFail();

        $this->actingAs($admin)
            ->patch(route('admin.refunds.approve', $refund), [
                'approved_amount' => 250,
            ])
            ->assertRedirect()
            ->assertSessionHasNoErrors();

        $this->assertSame('approved', $refund->fresh()->status);
        $this->assertSame('paid', $order->fresh()->payment_status);

        $this->actingAs($admin)
            ->patch(route('admin.refunds.complete-manual', $refund), [
                'reference' => 'CASH-RETURN-RECEIPT-001',
            ])
            ->assertRedirect()
            ->assertSessionHasNoErrors();

        $this->assertSame('completed', $refund->fresh()->status);
        $this->assertSame('partially_refunded', $order->fresh()->payment_status);
    }

    public function test_business_cancellation_of_paid_order_automatically_creates_a_full_remaining_refund(): void
    {
        $admin = $this->createAdmin();
        $customer = $this->createCustomer();
        $product = $this->createProduct();
        $order = $this->createPaidOrder($customer, $product, [
            'paymongo_payment_id' => 'pay_business_cancel_001',
        ]);
        $product->decrement('stock_quantity');
        $order->update(['stock_deducted_at' => now()]);

        Http::fake([
            'https://api.paymongo.com/v1/refunds' => Http::response([
                'data' => [
                    'id' => 're_business_cancel_001',
                    'type' => 'refund',
                    'attributes' => [
                        'amount' => 250000,
                        'payment_id' => 'pay_business_cancel_001',
                        'status' => 'processing',
                        'reason' => 'others',
                    ],
                ],
            ], 200),
        ]);

        $this->actingAs($admin)
            ->patch(route('admin.purchases.cancel', $order), [
                'reason' => 'Netmax Trading cannot fulfill this order.',
            ])
            ->assertRedirect()
            ->assertSessionHasNoErrors();

        $this->assertDatabaseHas('orders', [
            'id' => $order->id,
            'order_status' => 'cancelled',
            'payment_status' => 'paid',
        ]);

        $this->assertSame(10, (int) $product->fresh()->stock_quantity);
        $this->assertNull($order->fresh()->stock_deducted_at);

        $this->assertDatabaseHas('refunds', [
            'order_id' => $order->id,
            'source' => 'business_cancellation',
            'amount_approved' => 2500,
            'provider_refund_id' => 're_business_cancel_001',
            'status' => 'processing',
        ]);
    }

    public function test_business_cancellation_of_installation_refunds_only_installation_and_priority_fees(): void
    {
        $admin = $this->createAdmin();
        $customer = $this->createCustomer();
        $product = $this->createProduct();
        $order = $this->createPaidOrder($customer, $product, [
            'total' => 2850,
            'installation_fee' => 300,
            'service_priority_fee' => 50,
            'paymongo_payment_id' => 'pay_service_cancel_001',
        ]);

        $inquiry = Inquiry::create([
            'user_id' => $customer->id,
            'inquirable_type' => Product::class,
            'inquirable_id' => $product->id,
            'inquiry_number' => 'INQ-REFUND-SERVICE-' . $customer->id,
            'item_name' => $product->name,
            'customer_name' => $customer->name,
            'customer_phone' => '09171234567',
            'customer_email' => $customer->email,
            'street_address' => '123 Test Street',
            'city' => 'Taguig',
            'service_type' => 'Installation',
            'urgency' => 'urgent',
            'urgency_fee' => 50,
            'preferred_date' => today()->addDays(5)->toDateString(),
            'preferred_time' => '08:00 AM - 11:00 AM',
            'status' => 'pending',
        ]);

        PendingInquiryCheckout::create([
            'user_id' => $customer->id,
            'order_id' => $order->id,
            'inquiry_id' => $inquiry->id,
            'payload' => [],
            'status' => 'paid',
        ]);

        Http::fake([
            'https://api.paymongo.com/v1/refunds' => Http::response([
                'data' => [
                    'id' => 're_service_cancel_001',
                    'type' => 'refund',
                    'attributes' => [
                        'amount' => 35000,
                        'payment_id' => 'pay_service_cancel_001',
                        'status' => 'processing',
                        'reason' => 'others',
                    ],
                ],
            ], 200),
        ]);

        $this->actingAs($admin)
            ->patch(route('admin.inquiries.status', $inquiry), [
                'status' => 'cancelled',
            ])
            ->assertRedirect()
            ->assertSessionHasNoErrors();

        $this->assertSame('cancelled', $inquiry->fresh()->status);
        $this->assertDatabaseHas('refunds', [
            'order_id' => $order->id,
            'inquiry_id' => $inquiry->id,
            'amount_approved' => 350,
            'status' => 'processing',
        ]);
        $this->assertSame('processing', $order->fresh()->order_status);
        $this->assertSame('paid', $order->fresh()->payment_status);
    }

    public function test_business_cancellation_of_priority_only_service_cancels_and_refunds_the_fee_only_order(): void
    {
        $admin = $this->createAdmin();
        $customer = $this->createCustomer();
        $product = $this->createProduct();
        $order = $this->createPaidOrder($customer, $product, [
            'subtotal' => 0,
            'installation_fee' => 0,
            'service_priority_fee' => 350,
            'total' => 350,
            'paymongo_payment_id' => 'pay_priority_cancel_001',
        ]);
        $order->items()->delete();

        $inquiry = Inquiry::create([
            'user_id' => $customer->id,
            'inquirable_type' => Product::class,
            'inquirable_id' => $product->id,
            'inquiry_number' => 'INQ-REFUND-PRIORITY-' . $customer->id,
            'item_name' => $product->name,
            'customer_name' => $customer->name,
            'customer_phone' => '09171234567',
            'customer_email' => $customer->email,
            'street_address' => '123 Test Street',
            'city' => 'Taguig',
            'service_type' => 'Repair',
            'urgency' => 'urgent',
            'urgency_fee' => 350,
            'preferred_date' => today()->addDays(5)->toDateString(),
            'preferred_time' => '08:00 AM - 11:00 AM',
            'status' => 'pending',
        ]);

        PendingInquiryCheckout::create([
            'user_id' => $customer->id,
            'order_id' => $order->id,
            'inquiry_id' => $inquiry->id,
            'payload' => [],
            'status' => 'paid',
        ]);

        Http::fake([
            'https://api.paymongo.com/v1/refunds' => Http::response([
                'data' => [
                    'id' => 're_priority_cancel_001',
                    'type' => 'refund',
                    'attributes' => [
                        'amount' => 35000,
                        'payment_id' => 'pay_priority_cancel_001',
                        'status' => 'processing',
                        'reason' => 'others',
                    ],
                ],
            ], 200),
        ]);

        $this->actingAs($admin)
            ->patch(route('admin.inquiries.status', $inquiry), [
                'status' => 'cancelled',
            ])
            ->assertRedirect()
            ->assertSessionHasNoErrors();

        $this->assertSame('cancelled', $inquiry->fresh()->status);
        $this->assertSame('cancelled', $order->fresh()->order_status);
        $this->assertDatabaseHas('refunds', [
            'order_id' => $order->id,
            'inquiry_id' => $inquiry->id,
            'amount_approved' => 350,
            'status' => 'processing',
        ]);
    }

    public function test_signed_paymongo_refund_webhook_marks_refund_completed_and_updates_order(): void
    {
        $customer = $this->createCustomer();
        $product = $this->createProduct();
        $order = $this->createPaidOrder($customer, $product, [
            'paymongo_payment_id' => 'pay_webhook_refund_001',
        ]);

        $refund = Refund::create([
            'order_id' => $order->id,
            'customer_id' => $customer->id,
            'requested_by_user_id' => $customer->id,
            'source' => 'customer_request',
            'amount_requested' => 300,
            'amount_approved' => 300,
            'reason_code' => 'others',
            'reason' => 'A requested partial refund.',
            'status' => 'processing',
            'provider' => 'paymongo',
            'provider_refund_id' => 're_webhook_refund_001',
            'idempotency_key' => 'refund-webhook-test-001',
            'provider_status' => 'processing',
            'requested_at' => now(),
            'approved_at' => now(),
            'submitted_at' => now(),
        ]);

        $body = json_encode([
            'data' => [
                'id' => 'evt_refund_update_001',
                'type' => 'event',
                'attributes' => [
                    'type' => 'payment.refund.updated',
                    'livemode' => false,
                    'data' => [
                        'id' => 're_webhook_refund_001',
                        'type' => 'refund',
                        'attributes' => [
                            'amount' => 30000,
                            'payment_id' => 'pay_webhook_refund_001',
                            'status' => 'succeeded',
                        ],
                    ],
                ],
            ],
        ], JSON_UNESCAPED_SLASHES);

        $timestamp = (string) time();
        $signature = hash_hmac('sha256', $timestamp . '.' . $body, self::WEBHOOK_SECRET);

        $this->call(
            'POST',
            '/api/webhooks/paymongo',
            [],
            [],
            [],
            [
                'CONTENT_TYPE' => 'application/json',
                'HTTP_PAYMONGO_SIGNATURE' => 't=' . $timestamp . ',te=' . $signature,
            ],
            $body
        )->assertOk();

        $this->assertSame('completed', $refund->fresh()->status);
        $this->assertSame('partially_refunded', $order->fresh()->payment_status);
    }

    public function test_signed_paymongo_refund_webhook_rejects_an_amount_mismatch(): void
    {
        $customer = $this->createCustomer();
        $product = $this->createProduct();
        $order = $this->createPaidOrder($customer, $product, [
            'paymongo_payment_id' => 'pay_webhook_amount_mismatch_001',
        ]);

        $refund = Refund::create([
            'order_id' => $order->id,
            'customer_id' => $customer->id,
            'requested_by_user_id' => $customer->id,
            'source' => 'customer_request',
            'amount_requested' => 300,
            'amount_approved' => 300,
            'reason_code' => 'others',
            'reason' => 'A requested partial refund.',
            'status' => 'processing',
            'provider' => 'paymongo',
            'provider_refund_id' => 're_webhook_amount_mismatch_001',
            'idempotency_key' => 'refund-webhook-amount-mismatch-test-001',
            'provider_status' => 'processing',
            'requested_at' => now(),
            'approved_at' => now(),
            'submitted_at' => now(),
        ]);

        $body = json_encode([
            'data' => [
                'id' => 'evt_refund_amount_mismatch_001',
                'type' => 'event',
                'attributes' => [
                    'type' => 'payment.refund.updated',
                    'livemode' => false,
                    'data' => [
                        'id' => 're_webhook_amount_mismatch_001',
                        'type' => 'refund',
                        'attributes' => [
                            'amount' => 15000,
                            'payment_id' => 'pay_webhook_amount_mismatch_001',
                            'status' => 'succeeded',
                        ],
                    ],
                ],
            ],
        ], JSON_UNESCAPED_SLASHES);

        $timestamp = (string) time();
        $signature = hash_hmac('sha256', $timestamp . '.' . $body, self::WEBHOOK_SECRET);

        $this->call(
            'POST',
            '/api/webhooks/paymongo',
            [],
            [],
            [],
            [
                'CONTENT_TYPE' => 'application/json',
                'HTTP_PAYMONGO_SIGNATURE' => 't=' . $timestamp . ',te=' . $signature,
            ],
            $body
        )->assertStatus(409);

        $this->assertSame('processing', $refund->fresh()->status);
        $this->assertSame('paid', $order->fresh()->payment_status);
    }

    public function test_unknown_paymongo_refund_is_not_retried_after_the_idempotency_window(): void
    {
        $admin = $this->createAdmin();
        $customer = $this->createCustomer();
        $product = $this->createProduct();
        $order = $this->createPaidOrder($customer, $product, [
            'paymongo_payment_id' => 'pay_refund_unknown_expired_001',
        ]);

        $refund = Refund::create([
            'order_id' => $order->id,
            'customer_id' => $customer->id,
            'requested_by_user_id' => $admin->id,
            'source' => 'customer_request',
            'amount_requested' => 500,
            'amount_approved' => 500,
            'reason_code' => 'others',
            'reason' => 'A refund request with an unknown provider outcome.',
            'status' => 'processing',
            'provider' => 'paymongo',
            'idempotency_key' => 'refund-unknown-expired-001',
            'provider_error' => 'The connection ended before PayMongo confirmed the result.',
            'requested_at' => now()->subDays(2),
            'approved_at' => now()->subDays(2),
            'submitted_at' => now()->subHours(24),
        ]);

        Http::fake();

        $this->actingAs($admin)
            ->patch(route('admin.refunds.retry', $refund))
            ->assertRedirect()
            ->assertSessionHasErrors('refund');

        Http::assertNothingSent();
        $this->assertSame('processing', $refund->fresh()->status);
        $this->assertSame('refund-unknown-expired-001', $refund->fresh()->idempotency_key);
    }

    public function test_unmatched_refund_webhook_is_retried_when_a_refund_submission_is_waiting_for_its_id(): void
    {
        $customer = $this->createCustomer();
        $product = $this->createProduct();
        $order = $this->createPaidOrder($customer, $product, [
            'paymongo_payment_id' => 'pay_refund_early_webhook_001',
        ]);

        $refund = Refund::create([
            'order_id' => $order->id,
            'customer_id' => $customer->id,
            'requested_by_user_id' => $customer->id,
            'source' => 'customer_request',
            'amount_requested' => 300,
            'amount_approved' => 300,
            'reason_code' => 'others',
            'reason' => 'A refund whose provider response is still being saved.',
            'status' => 'processing',
            'provider' => 'paymongo',
            'idempotency_key' => 'refund-early-webhook-001',
            'provider_error' => 'Waiting for the PayMongo create response.',
            'requested_at' => now(),
            'approved_at' => now(),
            'submitted_at' => now(),
        ]);

        $body = json_encode([
            'data' => [
                'id' => 'evt_refund_early_webhook_001',
                'type' => 'event',
                'attributes' => [
                    'type' => 'payment.refund.updated',
                    'livemode' => false,
                    'data' => [
                        'id' => 're_early_webhook_001',
                        'type' => 'refund',
                        'attributes' => [
                            'amount' => 30000,
                            'payment_id' => 'pay_refund_early_webhook_001',
                            'status' => 'succeeded',
                        ],
                    ],
                ],
            ],
        ], JSON_UNESCAPED_SLASHES);

        $timestamp = (string) time();
        $signature = hash_hmac('sha256', $timestamp . '.' . $body, self::WEBHOOK_SECRET);

        $sendWebhook = function () use ($body, $timestamp, $signature) {
            return $this->call(
                'POST',
                '/api/webhooks/paymongo',
                [],
                [],
                [],
                [
                    'CONTENT_TYPE' => 'application/json',
                    'HTTP_PAYMONGO_SIGNATURE' => 't=' . $timestamp . ',te=' . $signature,
                ],
                $body
            );
        };

        $sendWebhook()->assertStatus(503);

        // The API response is now persisted; PayMongo's retry can be matched.
        $refund->update(['provider_refund_id' => 're_early_webhook_001']);

        $sendWebhook()->assertOk();

        $this->assertSame('completed', $refund->fresh()->status);
        $this->assertSame('partially_refunded', $order->fresh()->payment_status);
    }

    public function test_admin_can_reconcile_an_unlinked_paymongo_refund_without_creating_a_new_refund(): void
    {
        $admin = $this->createAdmin();
        $customer = $this->createCustomer();
        $product = $this->createProduct();
        $order = $this->createPaidOrder($customer, $product, [
            'paymongo_payment_id' => 'pay_refund_reconcile_001',
        ]);

        $refund = Refund::create([
            'order_id' => $order->id,
            'customer_id' => $customer->id,
            'requested_by_user_id' => $customer->id,
            'source' => 'customer_request',
            'amount_requested' => 500,
            'amount_approved' => 500,
            'reason_code' => 'others',
            'reason' => 'The initial PayMongo response timed out.',
            'status' => 'processing',
            'provider' => 'paymongo',
            'idempotency_key' => 'refund-reconcile-001',
            'provider_error' => 'The connection ended before PayMongo confirmed the result.',
            'requested_at' => now()->subDays(2),
            'approved_at' => now()->subDays(2),
            'submitted_at' => now()->subHours(24),
        ]);

        Http::fake([
            'https://api.paymongo.com/v1/refunds/re_reconcile_001' => Http::response([
                'data' => [
                    'id' => 're_reconcile_001',
                    'type' => 'refund',
                    'attributes' => [
                        'amount' => 50000,
                        'payment_id' => 'pay_refund_reconcile_001',
                        'livemode' => false,
                        'status' => 'succeeded',
                        'reason' => 'others',
                    ],
                ],
            ], 200),
        ]);

        $this->actingAs($admin)
            ->patch(route('admin.refunds.reconcile', $refund), [
                'provider_refund_id' => 're_reconcile_001',
            ])
            ->assertRedirect()
            ->assertSessionHasNoErrors();

        $this->assertDatabaseHas('refunds', [
            'id' => $refund->id,
            'provider_refund_id' => 're_reconcile_001',
            'provider_status' => 'succeeded',
            'status' => 'completed',
        ]);
        $this->assertSame('partially_refunded', $order->fresh()->payment_status);

        Http::assertSent(fn ($request) =>
            $request->method() === 'GET' &&
            str_ends_with($request->url(), '/refunds/re_reconcile_001')
        );
    }

    public function test_paymongo_reconciliation_rejects_a_refund_for_a_different_payment(): void
    {
        $admin = $this->createAdmin();
        $customer = $this->createCustomer();
        $product = $this->createProduct();
        $order = $this->createPaidOrder($customer, $product, [
            'paymongo_payment_id' => 'pay_refund_reconcile_mismatch_001',
        ]);

        $refund = Refund::create([
            'order_id' => $order->id,
            'customer_id' => $customer->id,
            'requested_by_user_id' => $customer->id,
            'source' => 'customer_request',
            'amount_requested' => 500,
            'amount_approved' => 500,
            'reason_code' => 'others',
            'reason' => 'The refund ID must belong to this order.',
            'status' => 'processing',
            'provider' => 'paymongo',
            'idempotency_key' => 'refund-reconcile-mismatch-001',
            'provider_error' => 'The original API response was unavailable.',
            'requested_at' => now()->subDays(2),
            'approved_at' => now()->subDays(2),
            'submitted_at' => now()->subHours(24),
        ]);

        Http::fake([
            'https://api.paymongo.com/v1/refunds/re_wrong_payment_001' => Http::response([
                'data' => [
                    'id' => 're_wrong_payment_001',
                    'type' => 'refund',
                    'attributes' => [
                        'amount' => 50000,
                        'payment_id' => 'pay_another_order_001',
                        'livemode' => false,
                        'status' => 'succeeded',
                    ],
                ],
            ], 200),
        ]);

        $this->actingAs($admin)
            ->patch(route('admin.refunds.reconcile', $refund), [
                'provider_refund_id' => 're_wrong_payment_001',
            ])
            ->assertRedirect()
            ->assertSessionHasErrors('provider_refund_id');

        $this->assertNull($refund->fresh()->provider_refund_id);
        $this->assertSame('processing', $refund->fresh()->status);
        $this->assertSame('paid', $order->fresh()->payment_status);
    }

    public function test_admin_can_view_refund_management_page_and_old_unknown_attempts_require_reconciliation(): void
    {
        $admin = $this->createAdmin();
        $customer = $this->createCustomer();
        $product = $this->createProduct();
        $order = $this->createPaidOrder($customer, $product);

        Refund::create([
            'order_id' => $order->id,
            'customer_id' => $customer->id,
            'requested_by_user_id' => $customer->id,
            'source' => 'customer_request',
            'amount_requested' => 300,
            'amount_approved' => 300,
            'reason_code' => 'others',
            'reason' => 'A refund with an expired idempotency retry window.',
            'status' => 'processing',
            'provider' => 'paymongo',
            'idempotency_key' => 'refund-admin-reconciliation-001',
            'provider_error' => 'The original refund outcome is unknown.',
            'requested_at' => now()->subDays(2),
            'approved_at' => now()->subDays(2),
            'submitted_at' => now()->subHours(24),
        ]);

        $this->actingAs($admin)
            ->get(route('admin.refunds.index'))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('Admin/Refunds')
                ->has('refunds.data', 1)
                ->where('refunds.data.0.requires_reconciliation', true)
                ->where('refunds.data.0.can_retry', false)
                ->where('refunds.data.0.can_reconcile', true)
                ->where('summary.reconciliation_required', 1));
    }

    private function createAdmin(): User
    {
        return User::factory()->create([
            'role' => 'admin',
            'email_verified_at' => now(),
        ]);
    }

    private function createCustomer(): User
    {
        return User::factory()->create([
            'role' => 'user',
            'email_verified_at' => now(),
        ]);
    }

    private function createProduct(): Product
    {
        return Product::create([
            'name' => 'Refund Test CCTV Camera',
            'category' => 'CCTV',
            'warranty' => '1 year',
            'price' => 2500,
            'stock_quantity' => 10,
            'specifications' => [],
            'rating' => 0,
            'is_featured' => false,
        ]);
    }

    private function createPaidOrder(User $customer, Product $product, array $overrides = []): Order
    {
        $order = Order::create(array_merge([
            'user_id' => $customer->id,
            'order_number' => 'ORD-REFUND-' . fake()->unique()->numerify('######'),
            'subtotal' => 2500,
            'shipping_fee' => 0,
            'installation_fee' => 0,
            'service_priority_fee' => 0,
            'total' => 2500,
            'payment_method' => 'gcash',
            'payment_status' => 'paid',
            'order_status' => 'processing',
            'paid_at' => now(),
            'paymongo_payment_id' => 'pay_refund_' . $customer->id . '_' . $product->id,
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
