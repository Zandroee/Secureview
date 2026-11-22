<?php

namespace Tests\Feature;

use App\Models\Package;
use App\Models\Product;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class AdminPromoSaleManagementTest extends TestCase
{
    use RefreshDatabase;

    public function test_promo_sales_management_page_lists_products_and_packages(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);
        Product::create([
            'name' => 'Promo Manager Camera',
            'category' => 'CCTV',
            'warranty' => '1 year',
            'price' => 1000,
            'stock_quantity' => 5,
            'specifications' => [],
            'rating' => 0,
            'is_featured' => false,
        ]);
        Package::create([
            'name' => 'Promo Manager Bundle',
            'category' => 'CCTV',
            'warranty' => '1 year',
            'price' => 5000,
            'specifications' => [],
            'rating' => 0,
            'is_featured' => false,
        ]);

        $this->actingAs($admin)
            ->get(route('admin.vouchers.index'))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('Admin/Vouchers')
                ->has('saleProducts', 1)
                ->where('saleProducts.0.name', 'Promo Manager Camera')
                ->has('salePackages', 1)
                ->where('salePackages.0.name', 'Promo Manager Bundle'));
    }

    public function test_admin_can_schedule_product_promo_sale_from_promotions_page_in_manila_time(): void
    {
        config(['app.timezone' => 'Asia/Manila']);
        $admin = User::factory()->create(['role' => 'admin']);
        $product = Product::create([
            'name' => 'Scheduled Promo Camera',
            'category' => 'CCTV',
            'warranty' => '1 year',
            'price' => 1000,
            'stock_quantity' => 5,
            'specifications' => [],
            'rating' => 0,
            'is_featured' => false,
        ]);

        $this->actingAs($admin)
            ->patch(route('admin.promotions.products.sale.update', $product), [
                'sale_price' => '750.00',
                'sale_starts_at' => '2026-10-29T10:30',
                'sale_ends_at' => '2026-10-30T18:00',
            ])
            ->assertRedirect()
            ->assertSessionHasNoErrors();

        $this->assertDatabaseHas('products', [
            'id' => $product->id,
            'price' => '1000.00',
            'sale_price' => '750.00',
            'sale_starts_at' => '2026-10-29 10:30:00',
            'sale_ends_at' => '2026-10-30 18:00:00',
        ]);
    }

    public function test_admin_can_schedule_package_promo_sale_and_clear_it_later(): void
    {
        config(['app.timezone' => 'Asia/Manila']);
        $admin = User::factory()->create(['role' => 'admin']);
        $package = Package::create([
            'name' => 'Scheduled Promo Bundle',
            'category' => 'CCTV',
            'warranty' => '1 year',
            'price' => 5000,
            'specifications' => [],
            'rating' => 0,
            'is_featured' => false,
        ]);

        $this->actingAs($admin)
            ->patch(route('admin.promotions.packages.sale.update', $package), [
                'sale_price' => '4250.00',
                'sale_starts_at' => '2026-10-29T10:30',
                'sale_ends_at' => '2026-10-30T18:00',
            ])
            ->assertRedirect()
            ->assertSessionHasNoErrors();

        $this->assertDatabaseHas('packages', [
            'id' => $package->id,
            'price' => '5000.00',
            'sale_price' => '4250.00',
            'sale_starts_at' => '2026-10-29 10:30:00',
            'sale_ends_at' => '2026-10-30 18:00:00',
        ]);

        $this->actingAs($admin)
            ->patch(route('admin.promotions.packages.sale.update', $package), [
                'sale_price' => '',
                'sale_starts_at' => '',
                'sale_ends_at' => '',
            ])
            ->assertRedirect()
            ->assertSessionHasNoErrors();

        $this->assertDatabaseHas('packages', [
            'id' => $package->id,
            'sale_price' => null,
            'sale_starts_at' => null,
            'sale_ends_at' => null,
        ]);
    }

    public function test_promo_sale_price_must_be_lower_than_regular_catalog_price(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);
        $product = Product::create([
            'name' => 'Invalid Promo Camera',
            'category' => 'CCTV',
            'warranty' => '1 year',
            'price' => 1000,
            'stock_quantity' => 5,
            'specifications' => [],
            'rating' => 0,
            'is_featured' => false,
        ]);

        $this->actingAs($admin)
            ->from(route('admin.vouchers.index'))
            ->patch(route('admin.promotions.products.sale.update', $product), [
                'sale_price' => '1000.00',
                'sale_starts_at' => '',
                'sale_ends_at' => '',
            ])
            ->assertRedirect(route('admin.vouchers.index'))
            ->assertSessionHasErrors('sale_price');

        $this->assertDatabaseHas('products', [
            'id' => $product->id,
            'price' => '1000.00',
            'sale_price' => null,
        ]);
    }
}
