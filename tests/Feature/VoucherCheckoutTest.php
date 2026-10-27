<?php

namespace Tests\Feature;

use App\Models\Cart;
use App\Models\Order;
use App\Models\Product;
use App\Models\User;
use App\Models\Voucher;
use App\Services\PayMongoLineItemBuilder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class VoucherCheckoutTest extends TestCase
{
    use RefreshDatabase;

    public function test_customer_can_apply_percentage_voucher_and_checkout_with_the_exact_discount(): void
    {
        $customer = $this->customer();
        $product = $this->product('Test CCTV Camera', 500, 5);
        $this->addCartItem($customer, $product, 1);
        $voucher = Voucher::create([
            'code' => 'SAVE10',
            'name' => 'Ten percent off',
            'discount_type' => 'percentage',
            'discount_value' => 10,
            'maximum_discount' => 40,
            'minimum_subtotal' => 0,
            'is_active' => true,
        ]);

        $this->actingAs($customer)
            ->post(route('checkout.voucher'), ['code' => 'save10'])
            ->assertRedirect(route('checkout'))
            ->assertSessionHas('checkout_voucher_code', 'SAVE10')
            ->assertSessionHasNoErrors();

        $this->post(route('checkout.store'), $this->checkoutPayload($customer))
            ->assertRedirect(route('checkout'))
            ->assertSessionHasNoErrors();

        $order = Order::query()->where('user_id', $customer->id)->firstOrFail();
        $this->assertEquals($voucher->id, $order->voucher_id);
        $this->assertSame('SAVE10', $order->voucher_code);
        $this->assertEquals(500, $order->subtotal);
        $this->assertEquals(40, $order->discount_amount);
        $this->assertEquals(460, $order->total);

        $lines = app(PayMongoLineItemBuilder::class)->buildDiscounted($order);
        $providerTotalCents = array_sum(array_map(
            fn (array $line) => (int) $line['amount'] * (int) $line['quantity'],
            $lines
        ));
        $this->assertSame(46000, $providerTotalCents);
        $this->assertSame('PHP', $lines[0]['currency']);
    }

    public function test_voucher_minimum_subtotal_and_expiry_are_enforced(): void
    {
        $customer = $this->customer();
        $product = $this->product('Test CCTV Camera', 500, 5);
        $this->addCartItem($customer, $product, 1);
        $voucher = Voucher::create([
            'code' => 'MIN600',
            'name' => 'Minimum basket',
            'discount_type' => 'fixed',
            'discount_value' => 50,
            'minimum_subtotal' => 600,
            'is_active' => true,
        ]);

        $this->actingAs($customer)
            ->post(route('checkout.voucher'), ['code' => 'MIN600'])
            ->assertRedirect(route('checkout'))
            ->assertSessionHasErrors('voucher');

        $voucher->update([
            'minimum_subtotal' => 0,
            'expires_at' => now()->subMinute(),
        ]);

        $this->post(route('checkout.voucher'), ['code' => 'MIN600'])
            ->assertRedirect(route('checkout'))
            ->assertSessionHasErrors('voucher');

        $this->assertDatabaseCount('orders', 0);
    }

    public function test_fixed_voucher_is_applied_and_per_customer_limit_counts_existing_orders(): void
    {
        $customer = $this->customer();
        $product = $this->product('Test CCTV Camera', 500, 5);
        $this->addCartItem($customer, $product, 1);
        Voucher::create([
            'code' => 'LESS50',
            'name' => 'Fifty pesos off',
            'discount_type' => 'fixed',
            'discount_value' => 50,
            'minimum_subtotal' => 0,
            'per_user_limit' => 1,
            'is_active' => true,
        ]);

        $this->actingAs($customer)
            ->post(route('checkout.voucher'), ['code' => 'LESS50'])
            ->assertRedirect(route('checkout'))
            ->assertSessionHasNoErrors();

        $this->post(route('checkout.store'), $this->checkoutPayload($customer))
            ->assertRedirect(route('checkout'))
            ->assertSessionHasNoErrors();

        $order = Order::query()->where('user_id', $customer->id)->firstOrFail();
        $this->assertEquals(50, $order->discount_amount);
        $this->assertEquals(450, $order->total);

        // Refill the cart to attempt a second use from the same account.
        $this->addCartItem($customer, $product, 1);
        $this->post(route('checkout.voucher'), ['code' => 'LESS50'])
            ->assertRedirect(route('checkout'))
            ->assertSessionHasErrors('voucher');

        $this->assertSame(1, Order::query()->where('user_id', $customer->id)->count());
    }

    public function test_voucher_is_revalidated_when_it_is_deactivated_after_application(): void
    {
        $customer = $this->customer();
        $product = $this->product('Test CCTV Camera', 500, 5);
        $this->addCartItem($customer, $product, 1);
        $voucher = Voucher::create([
            'code' => 'GO10',
            'name' => 'Ten percent off',
            'discount_type' => 'percentage',
            'discount_value' => 10,
            'is_active' => true,
        ]);

        $this->actingAs($customer)
            ->post(route('checkout.voucher'), ['code' => 'GO10'])
            ->assertRedirect(route('checkout'))
            ->assertSessionHasNoErrors();

        $voucher->update(['is_active' => false]);

        $this->post(route('checkout.store'), $this->checkoutPayload($customer))
            ->assertRedirect()
            ->assertSessionHasErrors('voucher');

        $this->assertSame(0, Order::query()->where('user_id', $customer->id)->count());
    }

    public function test_only_admins_can_manage_vouchers(): void
    {
        $customer = $this->customer();

        $this->actingAs($customer)
            ->get(route('admin.vouchers.index'))
            ->assertForbidden();

        $admin = User::factory()->create([
            'role' => 'admin',
            'email_verified_at' => now(),
        ]);

        $this->actingAs($admin)
            ->get(route('admin.vouchers.index'))
            ->assertOk();
    }

    private function customer(): User
    {
        return User::factory()->create([
            'role' => 'user',
            'email_verified_at' => now(),
            'phone' => '09171234567',
        ]);
    }

    private function product(string $name, float $price, int $stock): Product
    {
        return Product::create([
            'name' => $name,
            'category' => 'bullet',
            'warranty' => '1 year',
            'price' => $price,
            'stock_quantity' => $stock,
            'badge' => null,
            'image' => null,
            'specifications' => [],
            'rating' => 0,
            'is_featured' => false,
        ]);
    }

    private function addCartItem(User $customer, Product $product, int $quantity): void
    {
        $cart = Cart::firstOrCreate(['user_id' => $customer->id]);
        $cart->items()->create([
            'purchasable_type' => Product::class,
            'purchasable_id' => $product->id,
            'quantity' => $quantity,
            'price' => (float) $product->price,
        ]);
    }

    private function checkoutPayload(User $customer): array
    {
        return [
            'customer_name' => $customer->name,
            'customer_phone' => '09171234567',
            'customer_email' => $customer->email,
            'delivery_street_address' => '123 Sample Street, Barangay San Miguel',
            'delivery_city' => 'Taguig, Metro Manila',
            'payment_method' => 'cash',
            'notes' => '',
        ];
    }
}
