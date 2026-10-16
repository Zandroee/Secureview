<?php

namespace App\Http\Controllers\Staff;

use App\Http\Controllers\Controller;
use App\Models\InventoryStockMovement;
use App\Models\Product;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;

class InventoryController extends Controller
{
    public function index(Request $request)
    {
        $filters = $request->validate([
            'search' => ['nullable', 'string', 'max:120'],
            'stock' => ['nullable', 'in:all,low,out'],
        ]);

        $query = Product::query();

        if (!empty($filters['search'])) {
            $search = $filters['search'];
            $query->where(function ($builder) use ($search) {
                $builder->where('name', 'like', '%' . $search . '%')
                    ->orWhere('category', 'like', '%' . $search . '%');
            });
        }

        if (($filters['stock'] ?? 'all') === 'low') {
            $query->whereBetween('stock_quantity', [1, 5]);
        } elseif (($filters['stock'] ?? 'all') === 'out') {
            $query->where('stock_quantity', 0);
        }

        $products = $query
            ->orderBy('name')
            ->paginate(15)
            ->withQueryString()
            ->through(fn (Product $product) => [
                'id' => $product->id,
                'name' => $product->name,
                'category' => $product->category,
                'stock_quantity' => (int) $product->stock_quantity,
                'image' => $product->image,
                'low_stock' => (int) $product->stock_quantity <= 5,
            ]);

        return Inertia::render('Staff/Inventory', [
            'products' => $products,
            'filters' => [
                'search' => $filters['search'] ?? '',
                'stock' => $filters['stock'] ?? 'all',
            ],
            'summary' => [
                'products' => Product::count(),
                'low_stock' => Product::whereBetween('stock_quantity', [1, 5])->count(),
                'out_of_stock' => Product::where('stock_quantity', 0)->count(),
            ],
        ]);
    }

    public function updateStock(Request $request, Product $product)
    {
        $validated = $request->validate([
            'stock_quantity' => ['required', 'integer', 'min:0', 'max:1000000'],
            'reason' => ['required', 'string', 'max:255'],
        ]);

        DB::transaction(function () use ($request, $product, $validated) {
            $lockedProduct = Product::query()->lockForUpdate()->findOrFail($product->id);
            $oldQuantity = (int) $lockedProduct->stock_quantity;
            $newQuantity = (int) $validated['stock_quantity'];

            if ($oldQuantity === $newQuantity) {
                return;
            }

            $lockedProduct->update(['stock_quantity' => $newQuantity]);

            InventoryStockMovement::create([
                'product_id' => $lockedProduct->id,
                'product_name' => $lockedProduct->name,
                'user_id' => $request->user()->id,
                'previous_quantity' => $oldQuantity,
                'new_quantity' => $newQuantity,
                'reason' => trim($validated['reason']),
                'source' => 'technician',
            ]);
        });

        return back()->with('success', $product->name . ' stock was updated.');
    }
}
