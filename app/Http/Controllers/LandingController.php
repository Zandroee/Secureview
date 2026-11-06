<?php

namespace App\\Http\\Controllers;

use App\\Models\\Package;
use App\\Models\\Product;
use App\\Services\\InventoryService;
use Inertia\\Inertia;

class LandingController extends Controller
{
    public function index(InventoryService $inventory)
    {
        $now = now(config('app.timezone', 'Asia/Manila'));

        $activeSale = function ($query) use ($now) {
            $query->whereNotNull('sale_price')
                ->where('sale_price', '>', 0)
                ->whereColumn('sale_price', '<', 'price')
                ->where(function ($window) use ($now) {
                    $window->whereNull('sale_starts_at')->orWhere('sale_starts_at', '<=', $now);
                })
                ->where(function ($window) use ($now) {
                    $window->whereNull('sale_ends_at')->orWhere('sale_ends_at', '>', $now);
                });
        };

        $prioritizeActiveSales = function ($query) use ($now) {
            $query->orderByRaw(
                "CASE WHEN sale_price IS NOT NULL
                    AND sale_price > 0
                    AND sale_price < price
                    AND (sale_starts_at IS NULL OR sale_starts_at <= ?)
                    AND (sale_ends_at IS NULL OR sale_ends_at > ?)
                    THEN 0 ELSE 1 END",
                [$now, $now]
            )->orderBy('id');
        };

        $packageQuery = Package::withCount('reviews')
            ->with('packageItems.product')
            ->where(function ($query) use ($activeSale) {
                $query->where('is_featured', true)
                    ->orWhere(fn ($sale) => $activeSale($sale));
            });
        $prioritizeActiveSales($packageQuery);

        $cctvPackages = $packageQuery
            ->take(8)
            ->get()
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

        $cameraQuery = Product::withCount('reviews')
            ->where(function ($query) use ($activeSale) {
                $query->where('is_featured', true)
                    ->orWhere(fn ($sale) => $activeSale($sale));
            });
        $prioritizeActiveSales($cameraQuery);

        $cameras = $cameraQuery
            ->take(8)
            ->get()
            ->map(function (Product $product) {
                $product->setAttribute(
                    'available',
                    max(0, (int) $product->stock_quantity) > 0
                );
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
