<?php

namespace App\Http\Controllers;

use App\Models\Package;
use App\Services\InventoryService;
use Inertia\Inertia;

class PackageController extends Controller
{
    public function index(InventoryService $inventory)
    {
        $packages = Package::with('packageItems.product')
            ->get()
            ->map(function (Package $package) use ($inventory) {
                $package->setAttribute(
                    'available_stock',
                    $inventory->getAvailableStock($package)
                );

                return $package;
            });

        return Inertia::render('packages', [
            'packages' => $packages,
        ]);
    }

    public function show($id, InventoryService $inventory)
    {
        $package = Package::with('packageItems.product')->findOrFail($id);
        $package->setAttribute(
            'available_stock',
            $inventory->getAvailableStock($package)
        );
        $reviews = $package->reviews()->with('user')->latest()->get();

        return Inertia::render('package_details', [
            'package' => $package,
            'reviews' => $reviews,
        ]);
    }
}