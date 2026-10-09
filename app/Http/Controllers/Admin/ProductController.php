<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Package;
use App\Models\Product;
use App\Services\InventoryService;
use Illuminate\Http\Request;
use Inertia\Inertia;

class ProductController extends Controller
{
    public function index(Request $request, InventoryService $inventory)
    {
        $filters = $request->validate([
            'search' => ['nullable', 'string', 'max:120'],
            'category' => ['nullable', 'string', 'max:80'],
        ]);

        $query = Product::query();

        if (!empty($filters['search'])) {
            $search = $filters['search'];

            $query->where(function ($builder) use ($search) {
                $builder
                    ->where('name', 'like', '%' . $search . '%')
                    ->orWhere('category', 'like', '%' . $search . '%');
            });
        }

        if (!empty($filters['category'])) {
            $query->where('category', $filters['category']);
        }

        $products = $query
            ->orderBy('name')
            ->get();

        $categories = Product::query()
            ->select('category')
            ->distinct()
            ->orderBy('category')
            ->pluck('category')
            ->values();

        $allProducts = Product::all();

        $packages = Package::with('packageItems.product')
            ->orderBy('name')
            ->get()
            ->map(function (Package $package) use ($inventory) {
                $package->setAttribute(
                    'available_stock',
                    $inventory->getAvailableStock($package)
                );

                return [
                    'id' => $package->id,
                    'name' => $package->name,
                    'available_stock' => $package->available_stock,
                    'in_stock' => $package->available_stock > 0,
                ];
            })
            ->values();

        return Inertia::render('Admin/Products', [
            'products' => $products,
            'categories' => $categories,
            'packages' => $packages,
            'summary' => [
                'total_products' => $allProducts->count(),
                'out_of_stock' => $allProducts->where('stock_quantity', '<=', 0)->count(),
                'low_stock' => $allProducts->whereBetween('stock_quantity', [1, 5])->count(),
                'total_units' => $allProducts->sum('stock_quantity'),
            ],
            'filters' => [
                'search' => $filters['search'] ?? '',
                'category' => $filters['category'] ?? '',
            ],
            'success' => $request->session()->get('success'),
        ]);
    }

    public function updateStock(Request $request, Product $product)
    {
        $validated = $request->validate([
            'stock_quantity' => ['required', 'integer', 'min:0'],
        ]);

        $product->update([
            'stock_quantity' => $validated['stock_quantity'],
        ]);

        return back()->with('success', $product->name . ' stock was updated successfully.');
    }
}
