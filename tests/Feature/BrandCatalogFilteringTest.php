<?php

namespace Tests\Feature;

use App\Models\Package;
use App\Models\Product;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class BrandCatalogFilteringTest extends TestCase
{
    use RefreshDatabase;

    public function test_admin_can_manage_brand_options_and_filter_products_and_packages_by_brand(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);

        Product::create([
            'name' => 'Dahua Test Camera',
            'brand' => 'Dahua',
            'category' => 'Camera',
            'warranty' => '1 year',
            'price' => 3000,
            'stock_quantity' => 5,
            'specifications' => [],
            'rating' => 0,
            'is_featured' => false,
        ]);

        Product::create([
            'name' => 'Hikvision Test Camera',
            'brand' => 'Hikvision',
            'category' => 'Camera',
            'warranty' => '1 year',
            'price' => 3500,
            'stock_quantity' => 5,
            'specifications' => [],
            'rating' => 0,
            'is_featured' => false,
        ]);

        Package::create([
            'name' => 'Dahua Test Package',
            'brand' => 'Dahua',
            'category' => 'CCTV Package',
            'warranty' => '1 year',
            'price' => 12000,
            'specifications' => [],
            'rating' => 0,
            'is_featured' => false,
        ]);

        Package::create([
            'name' => 'Hikvision Test Package',
            'brand' => 'Hikvision',
            'category' => 'CCTV Package',
            'warranty' => '1 year',
            'price' => 13000,
            'specifications' => [],
            'rating' => 0,
            'is_featured' => false,
        ]);

        $this->actingAs($admin)
            ->post(route('admin.catalog-options.store'), [
                'field' => 'brand',
                'value' => 'Uniview',
            ])
            ->assertRedirect();

        $this->actingAs($admin)
            ->get(route('admin.products.index', ['brand' => 'Dahua']))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->has('products.data', 1)
                ->where('products.data.0.brand', 'Dahua')
                ->where('filters.brand', 'Dahua')
                ->where('brandOptions', ['Dahua', 'Hikvision', 'Uniview'])
            );

        $this->actingAs($admin)
            ->get(route('admin.packages.index', ['brand' => 'Hikvision']))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->has('packages.data', 1)
                ->where('packages.data.0.brand', 'Hikvision')
                ->where('filters.brand', 'Hikvision')
                ->where('brandOptions', ['Dahua', 'Hikvision', 'Uniview'])
            );

        $this->actingAs($admin)
            ->delete(route('admin.catalog-options.destroy'), [
                'field' => 'brand',
                'value' => 'Uniview',
            ])
            ->assertRedirect();

        $this->assertDatabaseHas('catalog_options', [
            'field' => 'brand',
            'value' => 'Uniview',
            'is_active' => false,
        ]);
    }
}
