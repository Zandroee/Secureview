<?php

namespace Tests\Feature;

use App\Models\CatalogOption;
use App\Models\Inquiry;
use App\Models\InventoryAdjustment;
use App\Models\Order;
use App\Models\Package;
use App\Models\PackageItem;
use App\Models\Product;
use App\Models\User;
use App\Models\CartItem;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ProductPackageCatalogResetTest extends TestCase
{
    use RefreshDatabase;

    public function test_catalog_cleanup_clears_live_references_but_preserves_orders_and_service_history(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);
        $customer = User::factory()->create([
            'role' => 'user',
            'phone' => '09171234567',
        ]);

        $product = $this->createProduct('Old Camera');
        $package = $this->createPackage('Old Bundle');

        $package->packageItems()->create([
            'product_id' => $product->id,
            'quantity' => 2,
            'price' => $product->price,
        ]);

        $product->reviews()->create([
            'user_id' => $customer->id,
            'rating' => 4,
            'comment' => 'Old product review',
        ]);
        $package->reviews()->create([
            'user_id' => $customer->id,
            'rating' => 5,
            'comment' => 'Old package review',
        ]);

        $cart = $customer->cart()->create();
        $cart->items()->create([
            'purchasable_type' => Product::class,
            'purchasable_id' => $product->id,
            'quantity' => 1,
            'price' => $product->price,
        ]);
        $cart->items()->create([
            'purchasable_type' => Package::class,
            'purchasable_id' => $package->id,
            'quantity' => 1,
            'price' => $package->price,
        ]);

        InventoryAdjustment::create([
            'product_id' => $product->id,
            'product_name' => $product->name,
            'user_id' => $admin->id,
            'previous_quantity' => 5,
            'new_quantity' => 4,
            'quantity_change' => -1,
            'reason' => 'Test stock adjustment',
        ]);
        CatalogOption::create([
            'field' => 'category',
            'value' => 'Old CCTV Category',
            'is_active' => true,
        ]);

        $inquiry = Inquiry::create([
            'user_id' => $customer->id,
            'inquiry_number' => 'TEST-' . strtoupper(bin2hex(random_bytes(4))),
            'inquirable_type' => Package::class,
            'inquirable_id' => $package->id,
            'item_name' => $package->name,
            'customer_name' => $customer->name,
            'customer_phone' => '09171234567',
            'customer_email' => $customer->email,
            'street_address' => '123 Test Street',
            'city' => 'Taguig',
            'service_type' => 'Installation',
            'preferred_date' => now()->addDay()->toDateString(),
            'status' => 'pending',
        ]);

        $order = Order::create([
            'user_id' => $customer->id,
            'order_number' => 'ORD-' . fake()->unique()->numerify('######'),
            'subtotal' => 3500,
            'shipping_fee' => 0,
            'total' => 3500,
            'payment_method' => 'cash',
            'payment_status' => 'paid',
            'order_status' => 'completed',
            'customer_name' => $customer->name,
            'customer_phone' => '09171234567',
            'customer_email' => $customer->email,
            'delivery_address' => '123 Test Street, Taguig',
        ]);
        $productOrderItem = $order->items()->create([
            'purchasable_type' => Product::class,
            'purchasable_id' => $product->id,
            'name' => $product->name,
            'price' => $product->price,
            'quantity' => 1,
            'subtotal' => $product->price,
        ]);
        $packageOrderItem = $order->items()->create([
            'purchasable_type' => Package::class,
            'purchasable_id' => $package->id,
            'name' => $package->name,
            'price' => $package->price,
            'quantity' => 1,
            'subtotal' => $package->price,
        ]);

        $this->artisan('catalog:clear-product-package-references', ['--force' => true])
            ->assertSuccessful();

        $this->assertDatabaseCount('package_items', 0);
        $this->assertDatabaseCount('cart_items', 0);
        $this->assertDatabaseCount('reviews', 0);
        $this->assertDatabaseCount('inventory_adjustments', 0);
        $this->assertDatabaseCount('catalog_options', 0);
        $this->assertDatabaseHas('inquiries', [
            'id' => $inquiry->id,
            'inquirable_type' => null,
            'inquirable_id' => null,
            'item_name' => $package->name,
        ]);
        $this->assertDatabaseHas('order_items', [
            'id' => $productOrderItem->id,
            'name' => $product->name,
            'price' => $product->price,
            'subtotal' => $product->price,
        ]);
        $this->assertDatabaseHas('order_items', [
            'id' => $packageOrderItem->id,
            'name' => $package->name,
            'price' => $package->price,
            'subtotal' => $package->price,
        ]);
        $this->assertDatabaseHas('orders', ['id' => $order->id]);

        $this->actingAs($admin)
            ->delete(route('admin.packages.destroy', $package))
            ->assertRedirect(route('admin.packages.index'))
            ->assertSessionHasNoErrors();

        $this->actingAs($admin)
            ->delete(route('admin.products.destroy', $product))
            ->assertRedirect(route('admin.products.index'))
            ->assertSessionHasNoErrors();

        $this->assertDatabaseMissing('packages', ['id' => $package->id]);
        $this->assertDatabaseMissing('products', ['id' => $product->id]);
        $this->assertDatabaseHas('inquiries', [
            'id' => $inquiry->id,
            'item_name' => 'Old Bundle',
        ]);
        $this->assertDatabaseHas('order_items', [
            'id' => $productOrderItem->id,
            'name' => 'Old Camera',
        ]);
        $this->assertDatabaseHas('order_items', [
            'id' => $packageOrderItem->id,
            'name' => 'Old Bundle',
        ]);
    }

    private function createProduct(string $name): Product
    {
        return Product::create([
            'name' => $name,
            'category' => 'CCTV',
            'warranty' => '1 year',
            'price' => 1500,
            'stock_quantity' => 5,
            'badge' => 'Old Item',
            'image' => null,
            'images' => [],
            'specifications' => ['1080p'],
            'rating' => 0,
            'is_featured' => false,
        ]);
    }

    private function createPackage(string $name): Package
    {
        return Package::create([
            'name' => $name,
            'category' => 'CCTV',
            'warranty' => '1 year',
            'price' => 2000,
            'badge' => 'Old Bundle',
            'image' => null,
            'images' => [],
            'specifications' => ['Night vision'],
            'rating' => 0,
            'is_featured' => false,
        ]);
    }
}
