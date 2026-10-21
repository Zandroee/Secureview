<?php

namespace Tests\Feature;

use App\Models\Cart;
use App\Models\Order;
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
}
