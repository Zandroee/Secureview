<?php

namespace Tests\Feature;

use App\Models\Package;
use App\Models\Product;
use Database\Seeders\CatalogExpansionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class CatalogExpansionSeederTest extends TestCase
{
    use RefreshDatabase;

    public function test_catalog_expansion_is_idempotent_and_saves_online_images_and_package_items(): void
    {
        $seeder = app(CatalogExpansionSeeder::class);

        $seeder->run();

        $this->assertSame(7, Product::query()->count());
        $this->assertSame(3, Package::query()->count());
        $this->assertSame(12, DB::table('package_items')->count());

        $product = Product::query()
            ->where('name', 'Dahua 8MP WizColor TiOC PRO Bullet Network Camera')
            ->firstOrFail();

        $this->assertStringStartsWith('https://', $product->image);
        $this->assertSame('Dahua', $product->brand);
        $this->assertNotEmpty($product->images);

        $package = Package::query()
            ->where('name', 'Dahua 4-Camera WizColor IP Security Package')
            ->firstOrFail();

        $this->assertStringStartsWith('https://', $package->image);
        $this->assertSame('Dahua', $package->brand);

        // A rerun must not duplicate rows or overwrite existing catalog details.
        $seeder->run();

        $this->assertSame(7, Product::query()->count());
        $this->assertSame(3, Package::query()->count());
        $this->assertSame(12, DB::table('package_items')->count());

        $product->refresh();
        $this->assertSame('Dahua', $product->brand);
        $this->assertStringStartsWith('https://', $product->image);
    }
}
