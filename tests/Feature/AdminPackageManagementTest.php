<?php

namespace Tests\Feature;

use App\Models\AdminActivityLog;
use App\Models\Order;
use App\Models\Package;
use App\Models\Product;
use App\Models\User;
use Inertia\Testing\AssertableInertia as Assert;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class AdminPackageManagementTest extends TestCase
{
    use RefreshDatabase;

    public function test_admin_can_view_package_management(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);

        $this->actingAs($admin)
            ->get(route('admin.packages.index'))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('Admin/Packages')
                ->has('packages.data', 0)
                ->has('categoryOptions')
                ->has('warrantyOptions')
                ->has('badgeOptions')
                ->where('summary.total', 0)
            );
    }

    public function test_non_admin_cannot_view_package_management(): void
    {
        $user = User::factory()->create(['role' => 'user']);

        $this->actingAs($user)
            ->get(route('admin.packages.index'))
            ->assertForbidden();
    }

    public function test_admin_can_create_a_package_and_its_components_are_logged(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);
        $product = $this->createProduct('4K Camera', 20);

        $this->actingAs($admin)
            ->post(route('admin.packages.store'), [
                'name' => 'Home CCTV Starter Kit',
                'category' => 'CCTV',
                'warranty' => '1 year',
                'price' => '12999.00',
                'badge' => 'Best Value',
                'image' => 'https://example.com/package.png',
                'specifications' => ['4K recording', 'Mobile viewing'],
                'is_featured' => true,
                'items' => [
                    ['product_id' => $product->id, 'quantity' => 2],
                ],
            ])
            ->assertRedirect(route('admin.packages.index'));

        $package = Package::query()->where('name', 'Home CCTV Starter Kit')->firstOrFail();

        $this->assertSame('CCTV', $package->category);
        $this->assertTrue($package->is_featured);
        $this->assertSame(['4K recording', 'Mobile viewing'], $package->specifications);
        $this->assertDatabaseHas('package_items', [
            'package_id' => $package->id,
            'product_id' => $product->id,
            'quantity' => 2,
            'price' => '2500.00',
        ]);

        $log = AdminActivityLog::query()
            ->where('action', 'package_created')
            ->where('subject_id', $package->id)
            ->firstOrFail();

        $this->assertSame($admin->id, $log->admin_id);
        $this->assertSame('Home CCTV Starter Kit', $log->new_values['name']);
        $this->assertSame(1, $log->new_values['items_count']);
    }

    public function test_admin_can_update_package_metadata_and_bundle_components(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);
        $firstProduct = $this->createProduct('4K Camera', 20);
        $secondProduct = $this->createProduct('NVR Recorder', 10);
        $package = $this->createPackage('Old Kit');
        $package->packageItems()->create([
            'product_id' => $firstProduct->id,
            'quantity' => 1,
            'price' => $firstProduct->price,
        ]);

        $this->actingAs($admin)
            ->patch(route('admin.packages.update', $package), [
                'name' => 'Advanced CCTV Kit',
                'category' => 'CCTV',
                'warranty' => '2 years',
                'price' => '15999.00',
                'badge' => 'Popular',
                'image' => null,
                'specifications' => ['Night vision', 'Mobile alerts'],
                'is_featured' => false,
                'items' => [
                    ['product_id' => $firstProduct->id, 'quantity' => 2],
                    ['product_id' => $secondProduct->id, 'quantity' => 1],
                ],
            ])
            ->assertRedirect(route('admin.packages.index'));

        $package->refresh();

        $this->assertSame('Advanced CCTV Kit', $package->name);
        $this->assertSame('2 years', $package->warranty);
        $this->assertFalse($package->is_featured);
        $this->assertDatabaseHas('package_items', [
            'package_id' => $package->id,
            'product_id' => $firstProduct->id,
            'quantity' => 2,
        ]);
        $this->assertDatabaseHas('package_items', [
            'package_id' => $package->id,
            'product_id' => $secondProduct->id,
            'quantity' => 1,
        ]);
        $this->assertSame(2, $package->packageItems()->count());

        $log = AdminActivityLog::query()
            ->where('action', 'package_updated')
            ->where('subject_id', $package->id)
            ->firstOrFail();

        $this->assertSame('Old Kit', $log->old_values['name']);
        $this->assertSame('Advanced CCTV Kit', $log->new_values['name']);
        $this->assertSame(1, $log->old_values['items_count']);
        $this->assertSame(2, $log->new_values['items_count']);
    }

    public function test_package_with_review_history_cannot_be_deleted(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);
        $customer = User::factory()->create(['role' => 'user']);
        $package = $this->createPackage('Reviewed Kit');

        $package->reviews()->create([
            'user_id' => $customer->id,
            'rating' => 5,
            'comment' => 'Great package',
        ]);

        $this->actingAs($admin)
            ->from(route('admin.packages.index'))
            ->delete(route('admin.packages.destroy', $package))
            ->assertRedirect(route('admin.packages.index'))
            ->assertSessionHasErrors('package');

        $this->assertDatabaseHas('packages', ['id' => $package->id]);
        $this->assertDatabaseMissing('admin_activity_logs', [
            'action' => 'package_deleted',
            'subject_id' => $package->id,
        ]);
    }

    public function test_package_with_order_history_cannot_be_deleted(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);
        $customer = User::factory()->create(['role' => 'user']);
        $package = $this->createPackage('Purchased Kit');

        $order = Order::create([
            'user_id' => $customer->id,
            'order_number' => 'ORD-' . fake()->unique()->numerify('######'),
            'subtotal' => 9999,
            'shipping_fee' => 0,
            'total' => 9999,
            'payment_method' => 'cash',
            'payment_status' => 'paid',
            'order_status' => 'processing',
            'customer_name' => $customer->name,
            'customer_phone' => '09171234567',
            'customer_email' => $customer->email,
            'delivery_address' => '123 Test Street, Taguig',
        ]);

        $order->items()->create([
            'purchasable_type' => Package::class,
            'purchasable_id' => $package->id,
            'name' => $package->name,
            'price' => $package->price,
            'quantity' => 1,
            'subtotal' => $package->price,
        ]);

        $this->actingAs($admin)
            ->from(route('admin.packages.index'))
            ->delete(route('admin.packages.destroy', $package))
            ->assertRedirect(route('admin.packages.index'))
            ->assertSessionHasErrors('package');

        $this->assertDatabaseHas('packages', ['id' => $package->id]);
        $this->assertDatabaseMissing('admin_activity_logs', [
            'action' => 'package_deleted',
            'subject_id' => $package->id,
        ]);
    }

    public function test_package_bundle_cannot_change_after_an_order_references_it(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);
        $customer = User::factory()->create(['role' => 'user']);
        $existingProduct = $this->createProduct('Existing Camera', 20);
        $replacementProduct = $this->createProduct('Replacement Camera', 10);
        $package = $this->createPackage('Purchased Kit');

        $package->packageItems()->create([
            'product_id' => $existingProduct->id,
            'quantity' => 1,
            'price' => $existingProduct->price,
        ]);

        $order = Order::create([
            'user_id' => $customer->id,
            'order_number' => 'ORD-' . fake()->unique()->numerify('######'),
            'subtotal' => 9999,
            'shipping_fee' => 0,
            'total' => 9999,
            'payment_method' => 'gcash',
            'payment_status' => 'pending',
            'order_status' => 'awaiting_payment',
            'customer_name' => $customer->name,
            'customer_phone' => '09171234567',
            'customer_email' => $customer->email,
            'delivery_address' => '123 Test Street, Taguig',
        ]);

        $order->items()->create([
            'purchasable_type' => Package::class,
            'purchasable_id' => $package->id,
            'name' => $package->name,
            'price' => $package->price,
            'quantity' => 1,
            'subtotal' => $package->price,
        ]);

        $this->actingAs($admin)
            ->from(route('admin.packages.index'))
            ->patch(route('admin.packages.update', $package), [
                'name' => 'Purchased Kit',
                'category' => 'CCTV',
                'warranty' => '1 year',
                'price' => '9999.00',
                'badge' => null,
                'image' => null,
                'specifications' => [],
                'is_featured' => false,
                'items' => [
                    ['product_id' => $replacementProduct->id, 'quantity' => 1],
                ],
            ])
            ->assertRedirect(route('admin.packages.index'))
            ->assertSessionHasErrors('items');

        $this->assertDatabaseHas('package_items', [
            'package_id' => $package->id,
            'product_id' => $existingProduct->id,
            'quantity' => 1,
        ]);
        $this->assertDatabaseMissing('package_items', [
            'package_id' => $package->id,
            'product_id' => $replacementProduct->id,
        ]);
    }

    public function test_admin_can_delete_unused_package_and_deletion_is_logged(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);
        $product = $this->createProduct('Indoor Camera', 8);
        $package = $this->createPackage('Unused Kit');
        $package->packageItems()->create([
            'product_id' => $product->id,
            'quantity' => 1,
            'price' => $product->price,
        ]);

        $this->actingAs($admin)
            ->delete(route('admin.packages.destroy', $package))
            ->assertRedirect(route('admin.packages.index'));

        $this->assertDatabaseMissing('packages', ['id' => $package->id]);
        $this->assertDatabaseHas('admin_activity_logs', [
            'admin_id' => $admin->id,
            'action' => 'package_deleted',
            'subject_id' => $package->id,
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

    public function test_admin_can_upload_a_package_image_from_a_file(): void
    {
        Storage::fake('public');
        $admin = User::factory()->create(['role' => 'admin']);
        $product = $this->createProduct('Image Bundle Camera', 10);

        $this->actingAs($admin)
            ->post(route('admin.packages.store'), [
                'name' => 'Image Bundle Kit',
                'category' => 'CCTV',
                'warranty' => '1 year',
                'price' => '2500.00',
                'badge' => 'New',
                'image' => null,
                'image_file' => UploadedFile::fake()->create('package.png', 10, 'image/png'),
                'specifications' => ['Camera included'],
                'is_featured' => false,
                'items' => [
                    ['product_id' => $product->id, 'quantity' => 1],
                ],
            ])
            ->assertRedirect(route('admin.packages.index'));

        $package = Package::query()->where('name', 'Image Bundle Kit')->firstOrFail();

        $this->assertStringStartsWith('/storage/packages/', $package->image);
        Storage::disk('public')->assertExists(
            preg_replace('#^/storage/#', '', $package->image)
        );
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

    private function createPackage(string $name): Package
    {
        return Package::create([
            'name' => $name,
            'category' => 'CCTV',
            'warranty' => '1 year',
            'price' => 9999,
            'specifications' => [],
            'rating' => 0,
            'is_featured' => false,
        ]);
    }
}
