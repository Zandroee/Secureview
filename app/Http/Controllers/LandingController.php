<?php

namespace App\Http\Controllers;

use App\Models\Package;
use App\Models\Product;
use App\Services\InventoryService;
use Inertia\Inertia;

class LandingController extends Controller
{
    public function index(InventoryService $inventory)
    {
        $now = now(config('app.timezone', 'UTC'))->format('Y-m-d H:i:s');

        $cctvPackages = Package::query()
            ->withCount('reviews')
            ->with('packageItems.product')
            ->where(function ($query) use ($now) {
                $query->where('is_featured', true)
                    ->orWhere(function ($sale) use ($now) {
                        $sale->whereNotNull('sale_price')
                            ->where('sale_price', '>', 0)
                            ->whereColumn('sale_price', '<', 'price')
                            ->where(fn ($dates) => $dates->whereNull('sale_starts_at')->orWhere('sale_starts_at', '<=', $now))
                            ->where(fn ($dates) => $dates->whereNull('sale_ends_at')->orWhere('sale_ends_at', '>', $now));
                    });
            })
            ->get()
            ->sortBy(fn (Package $package) => [$package->isOnSale() ? 0 : 1, $package->id])
            ->take(8)
            ->values()
            ->map(function (Package $package) use ($inventory) {
                $availableStock = $inventory->getAvailableStock($package);
                $package->setAttribute('available_stock', $availableStock);
                $package->setAttribute('available', $availableStock > 0);
                $package->setAttribute('original_price', (float) $package->price);
                $package->setAttribute('sale_active', $package->isOnSale());
                $package->setAttribute('sale_discount_percent', $package->saleDiscountPercent());
                $package->setAttribute('price', $package->effectivePrice());
                $package->setAttribute(
                    'inclusions',
                    $package->packageItems
                        ->filter(fn ($item) => $item->product !== null)
                        ->map(fn ($item) => [
                            'id' => $item->id,
                            'name' => $item->product->name,
                            'quantity' => (int) $item->quantity,
                        ])
                        ->values()
                );

                return $package;
            });

        $cameras = Product::query()
            ->withCount('reviews')
            ->where(function ($query) use ($now) {
                $query->where('is_featured', true)
                    ->orWhere(function ($sale) use ($now) {
                        $sale->whereNotNull('sale_price')
                            ->where('sale_price', '>', 0)
                            ->whereColumn('sale_price', '<', 'price')
                            ->where(fn ($dates) => $dates->whereNull('sale_starts_at')->orWhere('sale_starts_at', '<=', $now))
                            ->where(fn ($dates) => $dates->whereNull('sale_ends_at')->orWhere('sale_ends_at', '>', $now));
                    });
            })
            ->get()
            ->sortBy(fn (Product $product) => [$product->isOnSale() ? 0 : 1, $product->id])
            ->take(8)
            ->values()
            ->map(function (Product $product) {
                $product->setAttribute('available', max(0, (int) $product->stock_quantity) > 0);
                $product->setAttribute('original_price', (float) $product->price);
                $product->setAttribute('sale_active', $product->isOnSale());
                $product->setAttribute('sale_discount_percent', $product->saleDiscountPercent());
                $product->setAttribute('price', $product->effectivePrice());

                return $product;
            });

        return Inertia::render('landing', [
            'cctvPackages' => $cctvPackages,
            'cameras' => $cameras,
        ]);
    }
}
