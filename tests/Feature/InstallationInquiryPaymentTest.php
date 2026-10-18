<?php

namespace Tests\Feature;

use App\Models\Inquiry;
use App\Models\Order;
use App\Models\Package;
use App\Models\PendingInquiryCheckout;
use App\Models\Product;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class InstallationInquiryPaymentTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        config([
            'services.paymongo.secret_key' => 'sk_test_secureview',
            'services.paymongo.base_url' => 'https://api.paymongo.com',
        ]);
    }

    public function test_service_card_selection_is_prefilled_in_the_inquiry_form(): void
    {
        $customer = User::factory()->create([
            'role' => 'user',
            'email_verified_at' => now(),
        ]);

        $this->actingAs($customer)
            ->get('/inquiry?service_type=Repair')
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('inquiry')
                ->where('initialServiceType', 'Repair')
                ->has('catalogItems'));
    }

    public function test_installation_requires_a_product_or_package_before_checkout(): void
    {
        $customer = User::factory()->create([
            'role' => 'user',
            'email_verified_at' => now(),
        ]);

        $this->actingAs($customer)
            ->from('/inquiry?service_type=Installation')
            ->post('/inquiries', $this->inquiryPayload())
            ->assertSessionHasErrors(['item_type', 'item_id']);

        $this->assertDatabaseCount('inquiries', 0);
        $this->assertDatabaseCount('orders', 0);
        $this->assertDatabaseCount('pending_inquiry_checkouts', 0);
    }

    public function test_installation_inquiry_is_created_only_after_paymongo_confirms_payment_and_fee_is_charged(): void
    {
        $customer = User::factory()->create([
            'role' => 'user',
            'email_verified_at' => now(),
        ]);

        $product = Product::create([
            'name' => 'CCTV Camera',
            'category' => 'CCTV',
            'warranty' => '1 year',
            'price' => 1000,
            'installation_fee' => 250,
            'stock_quantity' => 4,
            'is_featured' => false,
        ]);

        Http::fake([
            'https://api.paymongo.com/v2/checkout_sessions' => Http::response([
                'data' => [
                    'id' => 'cs_installation_test',
                    'attributes' => ['checkout_url' => 'https://checkout.paymongo.com/cs_installation_test'],
                ],
            ], 200),
            'https://api.paymongo.com/v1/checkout_sessions/cs_installation_test' => Http::response([
                'data' => [
                    'id' => 'cs_installation_test',
                    'attributes' => [
                        'payments' => [[
                            'id' => 'pay_installation_test',
                            'attributes' => ['status' => 'paid'],
                        ]],
                    ],
                ],
            ], 200),
        ]);

        $this->actingAs($customer)
            ->post('/inquiries', $this->inquiryPayload([
                'item_type' => 'product',
                'item_id' => $product->id,
            ]));

        // Checkout preparation is not a submitted inquiry yet.
        $this->assertDatabaseCount('inquiries', 0);
        $this->assertDatabaseCount('pending_inquiry_checkouts', 1);

        $order = Order::query()->where('order_number', 'like', 'SV-%')->firstOrFail();
        $this->assertEquals(1000.00, (float) $order->subtotal);
        $this->assertEquals(250.00, (float) $order->installation_fee);
        $this->assertEquals(1250.00, (float) $order->total);

        Http::assertSent(function (\Illuminate\Http\Client\Request $request) {
            if (!str_ends_with($request->url(), '/v2/checkout_sessions')) {
                return false;
            }

            $lineItems = $request['data']['attributes']['line_items'] ?? [];

            return count($lineItems) === 2
                && (int) $lineItems[0]['amount'] === 100000
                && (int) $lineItems[1]['amount'] === 25000;
        });

        $this->actingAs($customer)
            ->get(route('checkout.payment.success', $order))
            ->assertRedirect();

        $this->assertDatabaseCount('inquiries', 1);
        $inquiry = Inquiry::query()->firstOrFail();
        $this->assertSame('Installation', $inquiry->service_type);
        $this->assertSame('CCTV Camera', $inquiry->item_name);
        $this->assertSame('pending', $inquiry->status);

        $pending = PendingInquiryCheckout::query()->where('order_id', $order->id)->firstOrFail();
        $this->assertSame('paid', $pending->status);
        $this->assertSame($inquiry->id, $pending->inquiry_id);
        $this->assertSame('paid', $order->fresh()->payment_status);
    }

    public function test_an_unpaid_paymongo_return_does_not_create_an_installation_inquiry(): void
    {
        $customer = User::factory()->create([
            'role' => 'user',
            'email_verified_at' => now(),
        ]);

        $product = Product::create([
            'name' => 'Free Installation Camera',
            'category' => 'CCTV',
            'warranty' => '6 months',
            'price' => 2500,
            'installation_fee' => null,
            'stock_quantity' => 4,
            'is_featured' => false,
        ]);

        Http::fake([
            'https://api.paymongo.com/v2/checkout_sessions' => Http::response([
                'data' => [
                    'id' => 'cs_unpaid_installation_test',
                    'attributes' => ['checkout_url' => 'https://checkout.paymongo.com/cs_unpaid_installation_test'],
                ],
            ], 200),
            'https://api.paymongo.com/v1/checkout_sessions/cs_unpaid_installation_test' => Http::response([
                'data' => [
                    'id' => 'cs_unpaid_installation_test',
                    'attributes' => [
                        'payments' => [[
                            'id' => 'pay_unpaid_installation_test',
                            'attributes' => ['status' => 'awaiting_payment'],
                        ]],
                    ],
                ],
            ], 200),
        ]);

        $this->actingAs($customer)
            ->post('/inquiries', $this->inquiryPayload([
                'item_type' => 'product',
                'item_id' => $product->id,
            ]));

        $order = Order::query()->where('order_number', 'like', 'SV-%')->firstOrFail();
        $this->actingAs($customer)->get(route('checkout.payment.success', $order));

        Http::assertSent(function (\\Illuminate\\Http\\Client\\Request $request) {
            if (!str_ends_with($request->url(), '/v2/checkout_sessions')) {
                return false;
            }

            $lineItems = $request['data']['attributes']['line_items'] ?? [];

            return count($lineItems) === 1
                && (int) $lineItems[0]['amount'] === 250000;
        });

        $this->assertDatabaseCount('inquiries', 0);
        $this->assertSame('pending', $order->fresh()->payment_status);
        $this->assertDatabaseHas('pending_inquiry_checkouts', [
            'order_id' => $order->id,
            'status' => 'pending_payment',
            'inquiry_id' => null,
        ]);
        $this->assertEquals(2500.00, (float) $order->fresh()->total);
    }

    private function inquiryPayload(array $overrides = []): array
    {
        return array_merge([
            'customer_name' => 'SecureView Test Customer',
            'customer_phone' => '09123456789',
            'customer_email' => 'customer@example.com',
            'street_address' => '31 Molave Street',
            'address_details' => null,
            'city' => 'Taguig',
            'service_latitude' => null,
            'service_longitude' => null,
            'google_place_id' => null,
            'service_type' => 'Installation',
            'urgency' => 'normal',
            'preferred_date' => today()->addDays(5)->toDateString(),
            'preferred_time' => '08:00 AM - 11:00 AM',
            'notes' => null,
            'payment_method' => 'gcash',
        ], $overrides);
    }
}
