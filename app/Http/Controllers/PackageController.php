<?php

namespace App\Http\Controllers;

use App\Models\OrderItem;
use App\Models\Package;
use App\Services\InventoryService;
use Illuminate\Http\Request;
use Inertia\Inertia;

class PackageController extends Controller
{
    public function index(InventoryService $inventory)
    {
        $packages = Package::withCount('reviews')->with('packageItems.product')
            ->get()
            ->map(function (Package $package) use ($inventory) {
                $package->setAttribute('available_stock', $inventory->getAvailableStock($package));
                $package->setAttribute('original_price', (float) $package->price);
                $package->setAttribute('sale_active', $package->isOnSale());
                $package->setAttribute('sale_discount_percent', $package->saleDiscountPercent());
                $package->setAttribute('price', $package->effectivePrice());

                return $package;
            });

        return Inertia::render('packages', [
            'packages' => $packages,
        ]);
    }

    public function show(Request $request, $id, InventoryService $inventory)
    {
        $package = Package::with('packageItems.product')->findOrFail($id);
        $package->setAttribute('available_stock', $inventory->getAvailableStock($package));
        $package->setAttribute('original_price', (float) $package->price);
        $package->setAttribute('sale_active', $package->isOnSale());
        $package->setAttribute('sale_discount_percent', $package->saleDiscountPercent());
        $package->setAttribute('price', $package->effectivePrice());
        $reviews = $package->reviews()->with('user')->latest()->get();
        $userId = $request->user()?->id;

        $canReview = $userId !== null && OrderItem::query()
            ->where('purchasable_type', Package::class)
            ->where('purchasable_id', $package->id)
            ->whereHas('order', function ($query) use ($userId) {
                $query->where('user_id', $userId)
                    ->where('payment_status', 'paid')
                    ->where('order_status', '!=', 'cancelled');
            })
            ->exists();

        $userReview = $userId !== null
            ? $package->reviews()->where('user_id', $userId)->first()
            : null;

        return Inertia::render('package_details', [
            'package' => $package,
            'reviews' => $reviews,
            'canReview' => $canReview,
            'userReview' => $userReview,
        ]);
    }
}