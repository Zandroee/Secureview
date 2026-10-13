<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Package;
use App\Models\Product;
use App\Services\AdminActivityLogger;
use App\Services\InventoryService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;

class ProductController extends Controller
{
    public function index(Request $request, InventoryService $inventory)
    {
        $filters = $request->validate([
            'search' => ['nullable', 'string', 'max:120'],
            'category' => ['nullable', 'string', 'max:80'],
        ]);

        $query = Product::query()
            ->withCount(['packageItems', 'reviews', 'orderItems', 'cartItems']);

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

        $products->each(function (Product $product) {
            $product->setAttribute(
                'can_delete',
                (int) $product->package_items_count === 0
                    && (int) $product->reviews_count === 0
                    && (int) $product->order_items_count === 0
                    && (int) $product->cart_items_count === 0
            );
        });

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
                $availableStock = $inventory->getAvailableStock($package);

                return [
                    'id' => $package->id,
                    'name' => $package->name,
                    'available_stock' => $availableStock,
                    'in_stock' => $availableStock > 0,
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

    public function store(Request $request, AdminActivityLogger $activityLogger)
    {
        $validated = $this->validateProduct($request);
        $fields = $this->productFields($validated);

        DB::transaction(function () use ($request, $fields, $activityLogger) {
            $product = Product::create($fields);

            $activityLogger->record(
                $request,
                'product_created',
                "Created product {$product->name}.",
                $product,
                [],
                $this->snapshot($product)
            );
        });

        return redirect()
            ->route('admin.products.index')
            ->with('success', 'Product created successfully.');
    }

    public function update(
        Request $request,
        Product $product,
        AdminActivityLogger $activityLogger
    ) {
        $validated = $this->validateProduct($request);
        $fields = $this->productFields($validated);
        $oldSnapshot = $this->snapshot($product);
        $oldName = $product->name;
        $priceChanged = (float) $product->price !== (float) $fields['price'];

        DB::transaction(function () use (
            $request,
            $product,
            $fields,
            $oldSnapshot,
            $oldName,
            $priceChanged,
            $activityLogger
        ) {
            $product->update($fields);

            // Keep items already in carts consistent with the updated product price.
            // Completed order items remain unchanged as purchase-history snapshots.
            if ($priceChanged) {
                $product->cartItems()->update([
                    'price' => $product->price,
                ]);
            }

            $activityLogger->record(
                $request,
                'product_updated',
                "Updated product {$oldName}.",
                $product,
                $oldSnapshot,
                $this->snapshot($product)
            );
        });

        return redirect()
            ->route('admin.products.index')
            ->with('success', 'Product updated successfully.');
    }

    public function destroy(
        Request $request,
        Product $product,
        AdminActivityLogger $activityLogger
    ) {
        if ($this->hasReferences($product)) {
            return back()->withErrors([
                'product' => 'This product is used by a package, cart, order, or review and cannot be deleted. Remove or resolve those references first.',
            ]);
        }

        DB::transaction(function () use ($request, $product, $activityLogger) {
            // Lock the parent row before rechecking references to reduce race conditions with new cart/package/order items.
            $lockedProduct = Product::query()
                ->lockForUpdate()
                ->findOrFail($product->id);

            if ($this->hasReferences($lockedProduct)) {
                abort(409, 'This product became referenced and cannot be deleted.');
            }

            $oldSnapshot = $this->snapshot($lockedProduct);

            $activityLogger->record(
                $request,
                'product_deleted',
                "Deleted product {$lockedProduct->name}.",
                $lockedProduct,
                $oldSnapshot,
                []
            );

            $lockedProduct->delete();
        });

        return redirect()
            ->route('admin.products.index')
            ->with('success', 'Product deleted successfully.');
    }

    public function updateStock(
        Request $request,
        Product $product,
        AdminActivityLogger $activityLogger
    ) {
        $validated = $request->validate([
            'stock_quantity' => ['required', 'integer', 'min:0'],
        ]);

        $oldQuantity = (int) $product->stock_quantity;
        $newQuantity = (int) $validated['stock_quantity'];

        DB::transaction(function () use (
            $request,
            $product,
            $oldQuantity,
            $newQuantity,
            $activityLogger
        ) {
            $product->update([
                'stock_quantity' => $newQuantity,
            ]);

            if ($oldQuantity !== $newQuantity) {
                $activityLogger->record(
                    $request,
                    'product_stock_updated',
                    "Changed stock for {$product->name} from {$oldQuantity} to {$newQuantity} units.",
                    $product,
                    ['stock_quantity' => $oldQuantity],
                    ['stock_quantity' => $newQuantity]
                );
            }
        });

        return back()->with('success', $product->name . ' stock was updated successfully.');
    }

    private function validateProduct(Request $request): array
    {
        return $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'category' => ['required', 'string', 'max:120'],
            'warranty' => ['required', 'string', 'max:120'],
            'price' => ['required', 'numeric', 'min:0.01', 'max:99999999.99'],
            'stock_quantity' => ['required', 'integer', 'min:0'],
            'badge' => ['nullable', 'string', 'max:80'],
            'image' => ['nullable', 'string', 'max:255'],
            'specifications' => ['nullable', 'array', 'max:30'],
            'specifications.*' => ['nullable', 'string', 'max:255'],
            'is_featured' => ['required', 'boolean'],
        ]);
    }

    private function productFields(array $validated): array
    {
        $specifications = collect($validated['specifications'] ?? [])
            ->map(fn ($value) => trim((string) $value))
            ->filter(fn ($value) => $value !== '')
            ->values()
            ->all();

        return [
            'name' => trim($validated['name']),
            'category' => trim($validated['category']),
            'warranty' => trim($validated['warranty']),
            'price' => $validated['price'],
            'stock_quantity' => (int) $validated['stock_quantity'],
            'badge' => filled($validated['badge'] ?? null) ? trim($validated['badge']) : null,
            'image' => filled($validated['image'] ?? null) ? trim($validated['image']) : null,
            'specifications' => $specifications ?: null,
            'is_featured' => (bool) $validated['is_featured'],
        ];
    }

    private function hasReferences(Product $product): bool
    {
        return $product->packageItems()->exists()
            || $product->reviews()->exists()
            || $product->orderItems()->exists()
            || $product->cartItems()->exists();
    }

    private function snapshot(Product $product): array
    {
        return [
            'name' => $product->name,
            'category' => $product->category,
            'warranty' => $product->warranty,
            'price' => (float) $product->price,
            'stock_quantity' => (int) $product->stock_quantity,
            'badge' => $product->badge,
            'is_featured' => (bool) $product->is_featured,
        ];
    }
}
