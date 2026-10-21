<?php

namespace Tests\Feature;

use App\Models\Cart;
use App\Models\Order;
use App\Models\Package;
use App\Models\PackageItem;
use App\Models\Product;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class CheckoutDeliveryLocationTest extends TestCase
{
    use RefreshDatabase;

    public function test_checkout_saves_the_openstreetmap_delivery_address_and_pin(): void
    {
        $customer = User::factory()->create([
            'role' => 'user',
            'email_verified_at' => now(),
            'phone' => '09171234567',
        ]);

        $product = Product::create([
            'name' => 'Test CCTV Camera',
            'category' => 'bullet',
            'warranty' => '1 year',
            'price' => 500,
            'stock_quantity' => 5,
            'badge' => null,
            'image' => null,
            'specifications' => [],
            'rating' => 0,
            'is_featured' => false,
        ]);

        $cart = Cart::create(['user_id' => $customer->id]);
        $cart->items()->create([
            'purchasable_type' => Product::class,
            'purchasable_id' => $product->id,
            'quantity' => 1,
            'price' => 500,
        ]);

        $this->actingAs($customer)
            ->post(route('checkout.store'), [
                'customer_name' => $customer->name,
                'customer_phone' => '09171234567',
                'customer_email' => $customer->email,
                'delivery_street_address' => '123 Sample Street, Barangay San Miguel',
                'delivery_address_details' => 'Unit 4B, blue gate',
                'delivery_city' => 'Taguig, Metro Manila',
                'delivery_latitude' => 14.5176001,
                'delivery_longitude' => 121.0509002,
                'payment_method' => 'cash',
                'notes' => '',
            ])
            ->assertRedirect(route('checkout'))
            ->assertSessionHasNoErrors();

        $order = Order::query()
            ->where('user_id', $customer->id)
            ->firstOrFail();

        $this->assertSame(
            '123 Sample Street, Barangay San Miguel, Unit 4B, blue gate, Taguig, Metro Manila',
            $order->delivery_address
        );
        $this->assertSame('Unit 4B, blue gate', $order->delivery_address_details);
        $this->assertSame('Taguig, Metro Manila', $order->delivery_city);
        $this->assertEquals(14.5176001, $order->delivery_latitude);
        $this->assertEquals(121.0509002, $order->delivery_longitude);
    }

    public function test_checkout_requires_a_complete_delivery_pin_when_coordinates_are_started(): void
    {
        $customer = User::factory()->create([
            'role' => 'user',
            'email_verified_at' => now(),
        ]);

        $this->actingAs($customer)
            ->post(route('checkout.store'), [
                'customer_name' => $customer->name,
                'customer_phone' => '09171234567',
                'customer_email' => $customer->email,
                'delivery_street_address' => '123 Sample Street',
                'delivery_city' => 'Taguig',
                'delivery_latitude' => 14.5176,
                'payment_method' => 'cash',
            ])
            ->assertSessionHasErrors('delivery_longitude');

        $this->assertSame(0, Order::query()->where('user_id', $customer->id)->count());
    }
    public function test_buy_now_checks_out_only_the_selected_product_and_preserves_the_existing_cart(): void
    {
        $customer = User::factory()->create([
            'role' => 'user',
            'email_verified_at' => now(),
            'phone' => '09171234567',
        ]);

        $selectedProduct = Product::create([
            'name' => 'Selected Buy Now Camera',
            'category' => 'bullet',
            'warranty' => '1 year',
            'price' => 800,
            'stock_quantity' => 8,
            'badge' => null,
            'image' => null,
            'specifications' => [],
            'rating' => 0,
            'is_featured' => false,
        ]);
        $cartProduct = Product::create([
            'name' => 'Keep in Cart Camera',
            'category' => 'dome',
            'warranty' => '1 year',
            'price' => 500,
            'stock_quantity' => 8,
            'badge' => null,
            'image' => null,
            'specifications' => [],
            'rating' => 0,
            'is_featured' => false,
        ]);

        $cart = Cart::create(['user_id' => $customer->id]);
        $cartItem = $cart->items()->create([
            'purchasable_type' => Product::class,
            'purchasable_id' => $cartProduct->id,
            'quantity' => 3,
            'price' => 500,
        ]);

        $this->actingAs($customer)
            ->post(route('checkout.buy-now'), [
                'item_type' => 'product',
                'item_id' => $selectedProduct->id,
                'quantity' => 2,
            ])
            ->assertRedirect(route('checkout'))
            ->assertSessionHas('buy_now', [
                'item_type' => 'product',
                'item_id' => $selectedProduct->id,
                'quantity' => 2,
            ]);

        $this->actingAs($customer)
            ->get(route('checkout'))
            ->assertOk()
            ->assertInertia(fn (\Inertia\Testing\AssertableInertia $page) => $page
                ->component('checkout')
                ->has('cart.items', 1)
                ->where('cart.items.0.type', 'product')
                ->where('cart.items.0.name', 'Selected Buy Now Camera')
                ->where('cart.items.0.quantity', 2)
                ->where('cart.subtotal', 1600));

        $this->actingAs($customer)
            ->post(route('checkout.store'), [
                'customer_name' => $customer->name,
                'customer_phone' => '09171234567',
                'customer_email' => $customer->email,
                'delivery_street_address' => '123 Sample Street, Barangay San Miguel',
                'delivery_city' => 'Taguig, Metro Manila',
                'payment_method' => 'cash',
                'notes' => '',
            ])
            ->assertRedirect(route('checkout'))
            ->assertSessionHasNoErrors();

        $order = Order::query()->where('user_id', $customer->id)->firstOrFail();
        $this->assertSame(1, $order->items()->count());
        $this->assertDatabaseHas('order_items', [
            'order_id' => $order->id,
            'purchasable_type' => Product::class,
            'purchasable_id' => $selectedProduct->id,
            'quantity' => 2,
            'price' => 800,
        ]);
        $this->assertDatabaseHas('cart_items', [
            'id' => $cartItem->id,
            'cart_id' => $cart->id,
            'purchasable_id' => $cartProduct->id,
            'quantity' => 3,
        ]);
        $this->assertDatabaseHas('products', [
            'id' => $selectedProduct->id,
            'stock_quantity' => 6,
        ]);
        $this->assertDatabaseHas('products', [
            'id' => $cartProduct->id,
            'stock_quantity' => 8,
        ]);
    }

    public function test_buy_now_can_open_checkout_for_a_package(): void
    {
        $customer = User::factory()->create([
            'role' => 'user',
            'email_verified_at' => now(),
            'phone' => '09171234567',
        ]);

        $product = Product::create([
            'name' => 'Package Included Camera',
            'category' => 'bullet',
            'warranty' => '1 year',
            'price' => 700,
            'stock_quantity' => 10,
            'badge' => null,
            'image' => null,
            'specifications' => [],
            'rating' => 0,
            'is_featured' => false,
        ]);
        $package = Package::create([
            'name' => 'Buy Now Test Package',
            'category' => 'Home Security',
            'warranty' => '1 year',
            'price' => 2500,
            'installation_fee' => 0,
            'badge' => null,
            'image' => null,
            'specifications' => [],
            'rating' => 0,
            'is_featured' => false,
        ]);
        PackageItem::create([
            'package_id' => $package->id,
            'product_id' => $product->id,
            'quantity' => 2,
            'price' => 700,
        ]);

        $this->actingAs($customer)
            ->post(route('checkout.buy-now'), [
                'item_type' => 'package',
                'item_id' => $package->id,
                'quantity' => 1,
            ])
            ->assertRedirect(route('checkout'))
            ->assertSessionHasNoErrors();

        $this->actingAs($customer)
            ->get(route('checkout'))
            ->assertOk()
            ->assertInertia(fn (\Inertia\Testing\AssertableInertia $page) => $page
                ->component('checkout')
                ->has('cart.items', 1)
                ->where('cart.items.0.type', 'package')
                ->where('cart.items.0.name', 'Buy Now Test Package')
                ->where('cart.items.0.quantity', 1)
                ->where('cart.subtotal', 2500));
    }

}
