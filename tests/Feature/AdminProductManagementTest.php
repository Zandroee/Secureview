<?php

namespace Tests\Feature;

use App\Models\AdminActivityLog;
use App\Models\Cart;
use App\Models\Order;
use App\Models\Package;
use App\Models\Product;
use App\Models\User;
use Inertia\Testing\AssertableInertia as Assert;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class AdminProductManagementTest extends TestCase
{
    use RefreshDatabase;

    public function test_admin_can_view_products_with_create_and_edit_capability(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);

        $this->actingAs($admin)
            ->get(route('admin.products.index'))
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('Admin/Products')
                ->has('products.data', 0)
                ->where('products.total', 0)
                ->has('categoryOptions')
                ->has('warrantyOptions')
                ->has('badgeOptions')
                ->where('summary.total_products', 0)
            );
    }


    public function test_admin_products_are_paginated_and_keep_search_filters(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);

        for ($index = 1; $index <= 13; $index++) {
            $this->createProduct('Pagination Camera ' . $index, 10);
        }

        $this->actingAs($admin)
            ->get(route('admin.products.index', [
                'search' => 'Pagination Camera',
                'page' => 2,
            ]))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('Admin/Products')
                ->has('products.data', 1)
                ->where('products.total', 13)
                ->where('products.current_page', 2)
                ->where('filters.search', 'Pagination Camera')
            );
    }

    public function test_non_admin_cannot_create_a_product(): void
    {
        $user = User::factory()->create(['role' => 'user']);

        $this->actingAs($user)
            ->post(route('admin.products.store'), $this->validProduct())
            ->assertForbidden();

        $this->assertDatabaseCount('products', 0);
    }

    public function test_admin_can_create_a_product_and_action_is_logged(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);

        $this->actingAs($admin)
            ->post(route('admin.products.store'), $this->validProduct([
                'name' => '4K Outdoor Camera',
                'stock_quantity' => 18,
                'specifications' => ['4K recording', 'Night vision'],
                'is_featured' => true,
            ]))
            ->assertRedirect(route('admin.products.index'));

        $product = Product::query()
            ->where('name', '4K Outdoor Camera')
            ->firstOrFail();

        $this->assertSame('CCTV', $product->category);
        $this->assertSame(18, $product->stock_quantity);
        $this->assertSame(['4K recording', 'Night vision'], $product->specifications);
        $this->assertTrue($product->is_featured);

        $this->assertDatabaseHas('admin_activity_logs', [
            'admin_id' => $admin->id,
            'action' => 'product_created',
            'subject_type' => 'Product',
            'subject_id' => $product->id,
        ]);

        $log = AdminActivityLog::query()
            ->where('action', 'product_created')
            ->where('subject_id', $product->id)
            ->firstOrFail();

        $this->assertSame('4K Outdoor Camera', $log->new_values['name']);
        $this->assertSame(18, $log->new_values['stock_quantity']);
    }

    public function test_admin_can_update_product_details_and_change_is_logged(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);
        $product = $this->createProduct('Indoor Camera', 4);

        $this->actingAs($admin)
            ->patch(route('admin.products.update', $product), $this->validProduct([
                'name' => 'Indoor Camera Pro',
                'price' => '4599.00',
                'stock_quantity' => 10,
                'badge' => 'Best Seller',
                'specifications' => ['2K recording', 'Two-way audio'],
                'is_featured' => true,
            ]))
            ->assertRedirect(route('admin.products.index'));

        $product->refresh();

        $this->assertSame('Indoor Camera Pro', $product->name);
        $this->assertSame(10, $product->stock_quantity);
        $this->assertSame('Best Seller', $product->badge);
        $this->assertTrue($product->is_featured);

        $log = AdminActivityLog::query()
            ->where('action', 'product_updated')
            ->where('subject_id', $product->id)
            ->firstOrFail();

        $this->assertSame('Indoor Camera', $log->old_values['name']);
        $this->assertSame('Indoor Camera Pro', $log->new_values['name']);
        $this->assertSame(4, $log->old_values['stock_quantity']);
        $this->assertSame(10, $log->new_values['stock_quantity']);
    }

    public function test_admin_cannot_delete_a_product_used_by_a_package(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);
        $product = $this->createProduct('Package Camera', 12);
        $package = Package::create([
            'name' => 'Starter Kit',
            'category' => 'CCTV',
            'warranty' => '1 year',
            'price' => 9999,
            'specifications' => [],
            'rating' => 0,
            'is_featured' => false,
        ]);

        $package->packageItems()->create([
            'product_id' => $product->id,
            'quantity' => 1,
            'price' => $product->price,
        ]);

        $this->actingAs($admin)
            ->from(route('admin.products.index'))
            ->delete(route('admin.products.destroy', $product))
            ->assertRedirect(route('admin.products.index'))
            ->assertSessionHasErrors('product');

        $this->assertDatabaseHas('products', ['id' => $product->id]);
        $this->assertDatabaseMissing('admin_activity_logs', [
            'action' => 'product_deleted',
            'subject_id' => $product->id,
        ]);
    }

    public function test_admin_can_delete_an_unused_product_and_deletion_is_logged(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);
        $product = $this->createProduct('Unused Camera', 0);

        $this->actingAs($admin)
            ->delete(route('admin.products.destroy', $product))
            ->assertRedirect(route('admin.products.index'));

        $this->assertDatabaseMissing('products', ['id' => $product->id]);
        $this->assertDatabaseHas('admin_activity_logs', [
            'admin_id' => $admin->id,
            'action' => 'product_deleted',
            'subject_type' => 'Product',
            'subject_id' => $product->id,
        ]);
    }

    

    public function test_product_form_rejects_invalid_price_and_stock(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);

        $this->actingAs($admin)
            ->post(route('admin.products.store'), $this->validProduct([
                'price' => '0',
                'stock_quantity' => -1,
            ]))
            ->assertSessionHasErrors(['price', 'stock_quantity']);

        $this->actingAs($admin)
            ->post(route('admin.products.store'), $this->validProduct([
                'stock_quantity' => 100001,
            ]))
            ->assertSessionHasErrors(['stock_quantity']);

        $this->assertDatabaseCount('products', 0);
    }


    public function test_product_category_whitespace_is_normalized_when_created(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);

        $this->actingAs($admin)
            ->post(route('admin.products.store'), $this->validProduct([
                'name' => 'Category Normalization Camera',
                'category' => "  IP   Cameras  ",
            ]))
            ->assertRedirect(route('admin.products.index'));

        $product = Product::query()
            ->where('name', 'Category Normalization Camera')
            ->firstOrFail();

        $this->assertSame('IP Cameras', $product->category);
    }

    public function test_admin_cannot_delete_a_product_referenced_by_a_cart(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);
        $customer = User::factory()->create(['role' => 'user']);
        $product = $this->createProduct('Cart Camera', 6);
        $cart = Cart::create(['user_id' => $customer->id]);

        $cart->items()->create([
            'purchasable_type' => Product::class,
            'purchasable_id' => $product->id,
            'quantity' => 1,
            'price' => $product->price,
        ]);

        $this->actingAs($admin)
            ->from(route('admin.products.index'))
            ->delete(route('admin.products.destroy', $product))
            ->assertRedirect(route('admin.products.index'))
            ->assertSessionHasErrors('product');

        $this->assertDatabaseHas('products', ['id' => $product->id]);
    }

        public function test_admin_can_delete_a_product_referenced_by_an_order_and_preserve_snapshot(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);
        $customer = User::factory()->create(['role' => 'user']);
        $product = $this->createProduct('Purchased Camera', 3);

        $order = Order::create([
            'user_id' => $customer->id,
            'order_number' => 'ORD-' . fake()->unique()->numerify('######'),
            'subtotal' => 2500,
            'shipping_fee' => 0,
            'total' => 2500,
            'payment_method' => 'cash',
            'payment_status' => 'paid',
            'order_status' => 'processing',
            'customer_name' => $customer->name,
            'customer_phone' => '09171234567',
            'customer_email' => $customer->email,
            'delivery_address' => '123 Test Street, Taguig',
        ]);

        $orderItem = $order->items()->create([
            'purchasable_type' => Product::class,
            'purchasable_id' => $product->id,
            'name' => $product->name,
            'price' => $product->price,
            'quantity' => 1,
            'subtotal' => $product->price,
        ]);

        $this->actingAs($admin)
            ->from(route('admin.products.index'))
            ->delete(route('admin.products.destroy', $product))
            ->assertRedirect(route('admin.products.index'))
            ->assertSessionHasNoErrors();

        $this->assertDatabaseMissing('products', ['id' => $product->id]);
        $this->assertDatabaseHas('order_items', [
            'id' => $orderItem->id,
            'purchasable_type' => Product::class,
            'purchasable_id' => $product->id,
            'name' => 'Purchased Camera',
            'price' => $product->price,
            'quantity' => 1,
            'subtotal' => $product->price,
        ]);
    }

    public function test_admin_cannot_delete_a_product_with_reviews(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);
        $customer = User::factory()->create(['role' => 'user']);
        $product = $this->createProduct('Reviewed Camera', 2);

        $product->reviews()->create([
            'user_id' => $customer->id,
            'rating' => 5,
            'comment' => 'Excellent product',
        ]);

        $this->actingAs($admin)
            ->from(route('admin.products.index'))
            ->delete(route('admin.products.destroy', $product))
            ->assertRedirect(route('admin.products.index'))
            ->assertSessionHasErrors('product');

        $this->assertDatabaseHas('products', ['id' => $product->id]);
    }

    public function test_product_price_update_refreshes_cart_price_but_not_order_history(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);
        $customer = User::factory()->create(['role' => 'user']);
        $product = $this->createProduct('Price Update Camera', 8);
        $cart = Cart::create(['user_id' => $customer->id]);

        $cartItem = $cart->items()->create([
            'purchasable_type' => Product::class,
            'purchasable_id' => $product->id,
            'quantity' => 1,
            'price' => 2500,
        ]);

        $order = Order::create([
            'user_id' => $customer->id,
            'order_number' => 'ORD-' . fake()->unique()->numerify('######'),
            'subtotal' => 2500,
            'shipping_fee' => 0,
            'total' => 2500,
            'payment_method' => 'cash',
            'payment_status' => 'paid',
            'order_status' => 'processing',
            'customer_name' => $customer->name,
            'customer_phone' => '09171234567',
            'customer_email' => $customer->email,
            'delivery_address' => '123 Test Street, Taguig',
        ]);
        $orderItem = $order->items()->create([
            'purchasable_type' => Product::class,
            'purchasable_id' => $product->id,
            'name' => $product->name,
            'price' => 2500,
            'quantity' => 1,
            'subtotal' => 2500,
        ]);

        $this->actingAs($admin)
            ->patch(route('admin.products.update', $product), $this->validProduct([
                'name' => $product->name,
                'price' => '3299.00',
                'stock_quantity' => 8,
            ]))
            ->assertRedirect(route('admin.products.index'));

        $this->assertDatabaseHas('cart_items', [
            'id' => $cartItem->id,
            'price' => '3299.00',
        ]);
        $this->assertDatabaseHas('order_items', [
            'id' => $orderItem->id,
            'price' => '2500.00',
            'subtotal' => '2500.00',
        ]);
    }

    public function test_catalog_dropdown_options_include_values_from_products_and_packages(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);

        Product::create([
            'name' => 'Dropdown Camera',
            'category' => 'Camera Systems',
            'warranty' => '18 months',
            'price' => 3200,
            'stock_quantity' => 5,
            'badge' => 'Top Seller',
            'specifications' => [],
            'rating' => 0,
            'is_featured' => false,
        ]);

        Package::create([
            'name' => 'Dropdown Alarm Bundle',
            'category' => 'Alarm Bundles',
            'warranty' => '3 years',
            'price' => 9500,
            'badge' => 'Premium',
            'specifications' => [],
            'rating' => 0,
            'is_featured' => false,
        ]);

        $this->actingAs($admin)
            ->get(route('admin.products.index'))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->where('categoryOptions', ['Alarm Bundles', 'Camera Systems'])
                ->where('warrantyOptions', ['18 months', '3 years'])
                ->where('badgeOptions', ['Premium', 'Top Seller'])
            );

        $this->actingAs($admin)
            ->get(route('admin.packages.index'))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->where('categoryOptions', ['Alarm Bundles', 'Camera Systems'])
                ->where('warrantyOptions', ['18 months', '3 years'])
                ->where('badgeOptions', ['Premium', 'Top Seller'])
            );
    }

    public function test_admin_can_upload_a_product_image_from_a_file(): void
    {
        Storage::fake('public');
        $admin = User::factory()->create(['role' => 'admin']);

        $payload = $this->validProduct([
            'name' => 'Camera With Image',
            'image_file' => UploadedFile::fake()->create('camera.png', 10, 'image/png'),
        ]);

        $this->actingAs($admin)
            ->post(route('admin.products.store'), $payload)
            ->assertRedirect(route('admin.products.index'));

        $product = Product::query()->where('name', 'Camera With Image')->firstOrFail();

        $this->assertStringStartsWith('/storage/products/', $product->image);
        Storage::disk('public')->assertExists(
            preg_replace('#^/storage/#', '', $product->image)
        );
    }

    public function test_admin_can_upload_multiple_product_images(): void
    {
        Storage::fake('public');
        $admin = User::factory()->create(['role' => 'admin']);

        $this->actingAs($admin)
            ->post(route('admin.products.store'), $this->validProduct([
                'name' => 'Camera Gallery Test',
                'image_files' => [
                    UploadedFile::fake()->create('camera-front.png', 10, 'image/png'),
                    UploadedFile::fake()->create('camera-side.png', 10, 'image/png'),
                ],
            ]))
            ->assertRedirect(route('admin.products.index'));

        $product = Product::query()->where('name', 'Camera Gallery Test')->firstOrFail();
        $this->assertCount(2, $product->images);
        $this->assertSame($product->images[0], $product->image);

        foreach ($product->images as $image) {
            Storage::disk('public')->assertExists(
                preg_replace('#^/storage/#', '', $image)
            );
        }
    }

    public function test_admin_can_remove_a_dropdown_option_without_changing_existing_catalog_values(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);
        Product::create([
            'name' => 'Existing CCTV Camera',
            'category' => 'CCTV',
            'warranty' => '1 year',
            'price' => 2500,
            'stock_quantity' => 5,
            'specifications' => [],
            'rating' => 0,
            'is_featured' => false,
        ]);

        $this->actingAs($admin)
            ->post(route('admin.catalog-options.store'), [
                'field' => 'category',
                'value' => 'CCTV',
            ])
            ->assertRedirect();

        $this->actingAs($admin)
            ->delete(route('admin.catalog-options.destroy'), [
                'field' => 'category',
                'value' => 'CCTV',
            ])
            ->assertRedirect();

        $this->assertDatabaseHas('catalog_options', [
            'field' => 'category',
            'value' => 'CCTV',
            'is_active' => 0,
        ]);
        $this->assertDatabaseHas('products', [
            'name' => 'Existing CCTV Camera',
            'category' => 'CCTV',
        ]);

        $this->actingAs($admin)
            ->get(route('admin.products.index'))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page->where('categoryOptions', []));
    }

    private function validProduct(array $overrides = []): array
    {
        return array_merge([
            'name' => 'Test Camera',
            'category' => 'CCTV',
            'warranty' => '1 year',
            'price' => '2999.00',
            'stock_quantity' => 5,
            'badge' => null,
            'image' => null,
            'specifications' => [],
            'is_featured' => false,
        ], $overrides);
    }

    private function createProduct(string $name, int $stock): Product
    {
        return Product::create([
            'name' => $name,
            'category' => 'CCTV',
            'warranty' => '1 year',
            'price' => 2500,
            'stock_quantity' => $stock,
            'specifications' => [],
            'rating' => 0,
            'is_featured' => false,
        ]);
    }

    public function test_admin_can_schedule_a_product_promo_sale_in_manila_time(): void
    {
        config(['app.timezone' => 'Asia/Manila']);
        $admin = User::factory()->create(['role' => 'admin']);
        $product = $this->createProduct('Scheduled Sale Camera', 1000);

        $this->actingAs($admin)
            ->patch(route('admin.products.update', $product), $this->validProduct([
                'price' => '1000.00',
                'sale_price' => '750.00',
                'sale_starts_at' => '2026-10-29T10:30',
                'sale_ends_at' => '2026-10-30T18:00',
            ]))
            ->assertRedirect(route('admin.products.index'))
            ->assertSessionHasNoErrors();

        $this->assertDatabaseHas('products', [
            'id' => $product->id,
            'price' => '1000.00',
            'sale_price' => '750.00',
            'sale_starts_at' => '2026-10-29 10:30:00',
            'sale_ends_at' => '2026-10-30 18:00:00',
        ]);
    }

    public function test_product_promo_sale_price_must_be_below_regular_price(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);
        $product = $this->createProduct('Invalid Sale Camera', 1000);

        $this->actingAs($admin)
            ->from(route('admin.products.index'))
            ->patch(route('admin.products.update', $product), $this->validProduct([
                'price' => '1000.00',
                'sale_price' => '1000.00',
            ]))
            ->assertRedirect(route('admin.products.index'))
            ->assertSessionHasErrors('sale_price');

        $this->assertDatabaseHas('products', [
            'id' => $product->id,
            'price' => '2500.00',
            'sale_price' => null,
        ]);
    }

}
