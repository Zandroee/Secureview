<?php

namespace App\Http\Controllers;

use App\Models\Package;
use App\Models\Product;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class SearchController extends Controller
{
    /**
     * Return public catalog suggestions for the global navigation search.
     * Only public-facing fields are included in the response.
     */
    public function suggestions(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'q' => ['required', 'string', 'min:2', 'max:100'],
        ]);

        $term = trim($validated['q']);
        $like = '%' . addcslashes($term, '\\%_') . '%';

        $products = Product::query()
            ->where(function ($query) use ($like) {
                $query->where('name', 'like', $like)
                    ->orWhere('category', 'like', $like)
                    ->orWhere('badge', 'like', $like);
            })
            ->orderByDesc('is_featured')
            ->orderBy('name')
            ->limit(6)
            ->get(['id', 'name', 'category', 'price', 'image', 'badge'])
            ->map(fn (Product $product) => [
                'id' => $product->id,
                'name' => $product->name,
                'category' => $product->category,
                'price' => $product->price,
                'image' => $product->image,
                'badge' => $product->badge,
                'href' => '/products/' . $product->id,
            ])
            ->values();

        $packages = Package::query()
            ->where(function ($query) use ($like) {
                $query->where('packages.name', 'like', $like)
                    ->orWhere('packages.category', 'like', $like)
                    ->orWhere('packages.badge', 'like', $like);
            })
            ->orWhereHas('packageItems.product', function ($query) use ($like) {
                $query->where('name', 'like', $like)
                    ->orWhere('category', 'like', $like);
            })
            ->orderByDesc('is_featured')
            ->orderBy('name')
            ->limit(6)
            ->get(['id', 'name', 'category', 'price', 'image', 'badge'])
            ->map(fn (Package $package) => [
                'id' => $package->id,
                'name' => $package->name,
                'category' => $package->category,
                'price' => $package->price,
                'image' => $package->image,
                'badge' => $package->badge,
                'href' => '/packages/' . $package->id,
            ])
            ->values();

        return response()->json([
            'products' => $products,
            'packages' => $packages,
        ]);
    }
}
