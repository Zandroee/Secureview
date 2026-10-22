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
        $cctvPackages = Package::with('packageItems.product')
            ->where('is_featured', true)
            ->orderBy('id')
            ->take(8)
            ->get()
            ->map(function (Package $package) use ($inventory) {
                $availableStock = $inventory->getAvailableStock($package);

                $package->setAttribute('available_stock', $availableStock);
                $package->setAttribute('available', $availableStock > 0);
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

        $cameras = Product::where('is_featured', true)
            ->orderBy('id')
            ->take(8)
            ->get()
            ->map(function (Product $product) {
                $product->setAttribute(
                    'available',
                    max(0, (int) $product->stock_quantity) > 0
                );

                return $product;
            });

        return Inertia::render('landing', [
            'cctvPackages' => $cctvPackages,
            'cameras' => $cameras,
        ]);
    }
}