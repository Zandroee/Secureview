<?php

namespace Tests\Feature;

use App\Models\Cart;
use App\Models\Package;
use App\Models\Product;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class PromoSalesTest extends TestCase
{
    use RefreshDatabase;

    public function test_sale_price_only_applies_inside_the_scheduled_window(): void
    {
        $originalTimezone = config('app.timezone');
        config(['app.timezone' => 'Asia/Manila']);
        Carbon::setTestNow(Carbon::parse('2026-10-28 11:00:00', 'Asia/Manila'));

        try {
            $product = Product::create([
                'name' => 'Scheduled Sale Camera',
                'category' => 'Camera',
                'warranty' => '1 year',
                'price' => 1000,
                'sale_price' => 800,
                'sale_starts_at' => '2026-10-28 11:05:00',
                'sale_ends_at' => '2026-10-28 12:00:00',
                'stock_quantity' => 5,
                'specifications' => [],
                'rating' => 0,
                'is_featured' => false,
            ]);

            $this->assertFalse($product->isOnSale());
            $this->assertSame(1000.0, $product->effectivePrice());

            Carbon::setTestNow(Carbon::parse('2026-10-28 11:05:00', 'Asia/Manila'));
            $product->refresh();
            $this->assertTrue($product->isOnSale());
            $this->assertSame(800.0, $product->effectivePrice());
            $this->assertSame(20, $product->saleDiscountPercent());

            Carbon::setTestNow(Carbon::parse('2026-10-28 12:00:01', 'Asia/Manila'));
            $product->refresh();
            $this->assertFalse($product->isOnSale());
            $this->assertSame(1000.0, $product->effectivePrice());
        } finally {
            Carbon::setTestNow();
            config(['app.timezone' => $originalTimezone]);
        }
    }

    public function test_storefront_shows_effective_and_original_prices_for_active_product_and_package_sales(): void
    {
        $originalTimezone = config('app.timezone');
        config(['app.timezone' => 'Asia/Manila']);
        Carbon::setTestNow(Carbon::parse('2026-10-28 11:30:00', 'Asia/Manila'));

        try {
            Product::create([
                'name' => 'Sale Camera',
                'category' => 'Camera',
                'warranty' => '1 year',
                'price' => 1000,
                'sale_price' => 800,
                'stock_quantity' => 5,
                'specifications' => [],
                'rating' => 0,
                'is_featured' => false,
            ]);
            Package::create([
                'name' => 'Sale Bundle',
                'category' => 'CCTV',
                'warranty' => '1 year',
                'price' => 5000,
                'sale_price' => 4000,
                'specifications' => [],
                'rating' => 0,
                'is_featured' => false,
            ]);

            $this->get('/products')->assertOk()
                ->assertInertia(fn (Assert $page) => $page
                    ->where('products.0.price', 800)
                    ->where('products.0.original_price', 1000)
                    ->where('products.0.sale_active', true)
                    ->where('products.0.sale_discount_percent', 20));

            $this->get('/packages')->assertOk()
                ->assertInertia(fn (Assert $page) => $page
                    ->where('packages.0.price', 4000)
                    ->where('packages.0.original_price', 5000)
                    ->where('packages.0.sale_active', true)
                    ->where('packages.0.sale_discount_percent', 20));
        } finally {
            Carbon::setTestNow();
            config(['app.timezone' => $originalTimezone]);
        }
    }

    public function test_checkout_and_order_snapshot_use_the_active_sale_price(): void
    {
        $originalTimezone = config('app.timezone');
        config(['app.timezone' => 'Asia/Manila']);
        Carbon::setTestNow(Carbon::parse('2026-10-28 11:30:00', 'Asia/Manila'));

        try {
            $customer = User::factory()->create([
                'role' => 'user',
                'email_verified_at' => now(),
                'phone' => '09171234567',
            ]);
            $product = Product::create([
                'name' => 'Sale Checkout Camera',
                'category' => 'Camera',
                'warranty' => '1 year',
                'price' => 1000,
                'sale_price' => 800,
                'stock_quantity' => 5,
                'specifications' => [],
                'rating' => 0,
                'is_featured' => false,
            ]);
            $cart = Cart::create(['user_id' => $customer->id]);
            $cart->items()->create([
                'purchasable_type' => Product::class,
                'purchasable_id' => $product->id,
                'quantity' => 1,
                'price' => 1000,
            ]);

            $this->actingAs($customer)->get(route('checkout'))
                ->assertOk()
                ->assertInertia(fn (Assert $page) => $page
                    ->where('cart.items.0.price', 800)
                    ->where('cart.subtotal', 800)
                    ->where('cart.total', 800));

            $this->post(route('checkout.store'), [
                'customer_name' => $customer->name,
                'customer_phone' => '09171234567',
                'customer_email' => $customer->email,
                'delivery_street_address' => '123 Sample Street',
                'delivery_city' => 'Taguig, Metro Manila',
                'payment_method' => 'cash',
                'notes' => '',
            ])->assertRedirect(route('checkout'))->assertSessionHasNoErrors();

            $order = \App\Models\Order::query()->where('user_id', $customer->id)->firstOrFail();
            $this->assertEquals(800, $order->subtotal);
            $this->assertEquals(800, $order->total);
            $this->assertDatabaseHas('order_items', [
                'order_id' => $order->id,
                'purchasable_type' => Product::class,
                'purchasable_id' => $product->id,
                'price' => 800,
                'subtotal' => 800,
            ]);
        } finally {
            Carbon::setTestNow();
            config(['app.timezone' => $originalTimezone]);
        }
    }
}
