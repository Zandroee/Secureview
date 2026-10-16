<?php

namespace App\Http\Controllers\Staff;

use App\Http\Controllers\Controller;
use App\Models\Product;
use App\Models\StockAdjustment;
use App\Models\User;
use App\Services\JobNotificationService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;

class InventoryController extends Controller
{
    public function index(Request $request)
    {
        $filters = $request->validate([
            'search' => ['nullable', 'string', 'max:120'],
        ]);

        $products = Product::query()
            ->when($filters['search'] ?? null, function ($query, $search) {
                $query->where(function ($builder) use ($search) {
                    $builder->where('name', 'like', '%' . $search . '%')
                        ->orWhere('category', 'like', '%' . $search . '%');
                });
            })
            ->orderBy('name')
            ->paginate(20)
            ->withQueryString()
            ->through(fn (Product $product) => [
                'id' => $product->id,
                'name' => $product->name,
                'category' => $product->category,
                'stock_quantity' => (int) $product->stock_quantity,
                'image' => $product->image,
            ]);

        return Inertia::render('Staff/Inventory', [
            'products' => $products,
            'filters' => ['search' => $filters['search'] ?? ''],
            'success' => $request->session()->get('success'),
        ]);
    }

    public function updateStock(Request $request, Product $product, JobNotificationService $notifications)
    {
        $validated = $request->validate([
            'stock_quantity' => ['required', 'integer', 'min:0', 'max:1000000'],
            'reason' => ['required', 'string', 'max:255'],
        ]);

        $adjustment = DB::transaction(function () use ($request, $product, $validated) {
            $lockedProduct = Product::query()->whereKey($product->id)->lockForUpdate()->firstOrFail();
            $oldQuantity = (int) $lockedProduct->stock_quantity;
            $newQuantity = (int) $validated['stock_quantity'];

            if ($oldQuantity === $newQuantity) {
                return null;
            }

            $lockedProduct->update(['stock_quantity' => $newQuantity]);

            return StockAdjustment::create([
                'product_id' => $lockedProduct->id,
                'product_name' => $lockedProduct->name,
                'changed_by' => $request->user()->id,
                'previous_quantity' => $oldQuantity,
                'new_quantity' => $newQuantity,
                'quantity_change' => $newQuantity - $oldQuantity,
                'reason' => trim($validated['reason']),
            ]);
        });

        if ($adjustment) {
            $admins = User::query()->where('role', 'admin')->get();
            foreach ($admins as $admin) {
                $notifications->notifyUser(
                    $admin,
                    'inventory',
                    'Product stock adjusted',
                    $request->user()->name . ' changed ' . $product->name . ' stock from '
                        . $adjustment->previous_quantity . ' to ' . $adjustment->new_quantity
                        . '. Reason: ' . $adjustment->reason,
                    'stock-adjustment:' . $adjustment->id . ':admin:' . $admin->id,
                    '/admin/products'
                );
            }
        }

        return back()->with('success', $adjustment
            ? 'Stock quantity updated and recorded.'
            : 'Stock quantity is unchanged; no adjustment was recorded.');
    }
}
