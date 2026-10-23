<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\CatalogOption;
use App\Models\InventoryAdjustment;
use App\Models\Package;
use App\Models\Product;
use App\Services\AdminActivityLogger;
use App\Services\InventoryService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\ValidationException;
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
            ->paginate(12)
            ->withQueryString()
            ->through(function (Product $product) {
                $product->setAttribute(
                    'can_delete',
                    (int) $product->package_items_count === 0
                        && (int) $product->reviews_count === 0
                        && (int) $product->cart_items_count === 0
                );

                return $product;
            });

        $categories = Product::query()
            ->select('category')
            ->distinct()
            ->orderBy('category')
            ->pluck('category')
            ->values();

        $allProducts = Product::all();

        $allPackagesForOptions = Package::query()->get(['category', 'warranty', 'badge']);

        // Include values already in the catalog and explicitly-added options, except
        // options that an admin has removed from the shared dropdown.
        $catalogOptions = static function (string $field) use ($allProducts, $allPackagesForOptions) {
            $removed = CatalogOption::query()
                ->where('field', $field)
                ->where('is_active', false)
                ->pluck('value')
                ->map(fn ($value) => mb_strtolower(trim((string) $value)))
                ->all();

            return CatalogOption::query()
                ->where('field', $field)
                ->where('is_active', true)
                ->pluck('value')
                ->merge($allProducts->pluck($field))
                ->merge($allPackagesForOptions->pluck($field))
                ->filter(fn ($value) => filled($value))
                ->map(fn ($value) => trim((string) $value))
                ->filter(fn ($value) => $value !== '' && !in_array(mb_strtolower($value), $removed, true))
                ->unique()
                ->sort()
                ->values();
        };

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
            'categoryOptions' => $catalogOptions('category'),
            'warrantyOptions' => $catalogOptions('warranty'),
            'badgeOptions' => $catalogOptions('badge'),
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
        $legacyImage = filled($fields['image'] ?? null) ? $fields['image'] : null;
        $fields['images'] = $this->resolveImages($request, [], $legacyImage, 'products');
        $fields['image'] = $fields['images'][0] ?? null;

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
        $oldImages = $this->currentImages($product);
        $existingImages = $request->boolean('gallery_managed') || $request->exists('existing_images')
            ? collect($request->input('existing_images', []))
                ->filter(fn ($image) => is_string($image) && in_array($image, $oldImages, true))
                ->unique()
                ->values()
                ->all()
            : $oldImages;
        $legacyImage = filled($fields['image'] ?? null) ? $fields['image'] : null;
        $fields['images'] = $this->resolveImages($request, $existingImages, $legacyImage, 'products');
        $fields['image'] = $fields['images'][0] ?? null;
        $stockReason = trim((string) ($validated['stock_reason'] ?? 'Updated via product editor')) ?: 'Updated via product editor';

        DB::transaction(function () use (
            $request,
            $product,
            $fields,
            $stockReason,
            $activityLogger
        ) {
            $lockedProduct = Product::query()
                ->whereKey($product->id)
                ->lockForUpdate()
                ->firstOrFail();

            $oldSnapshot = $this->snapshot($lockedProduct);
            $oldName = $lockedProduct->name;
            $oldStockQuantity = (int) $lockedProduct->stock_quantity;
            $priceChanged = (float) $lockedProduct->price !== (float) $fields['price'];

            $lockedProduct->update($fields);

            if ($oldStockQuantity !== (int) $lockedProduct->stock_quantity) {
                InventoryAdjustment::create([
                    'product_id' => $lockedProduct->id,
                    'product_name' => $lockedProduct->name,
                    'user_id' => $request->user()->id,
                    'previous_quantity' => $oldStockQuantity,
                    'new_quantity' => (int) $lockedProduct->stock_quantity,
                    'quantity_change' => (int) $lockedProduct->stock_quantity - $oldStockQuantity,
                    'reason' => $stockReason,
                ]);
            }

            // Keep items already in carts consistent with the updated product price.
            // Completed order items remain unchanged as purchase-history snapshots.
            if ($priceChanged) {
                $lockedProduct->cartItems()->update([
                    'price' => $lockedProduct->price,
                ]);
            }

            $activityLogger->record(
                $request,
                'product_updated',
                "Updated product {$oldName}.",
                $lockedProduct,
                $oldSnapshot,
                $this->snapshot($lockedProduct)
            );
        });

        foreach (array_diff($oldImages, $fields['images']) as $removedImage) {
            $this->deleteStoredImage($removedImage);
        }

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
                'product' => 'This product is still used by a package, cart, or review. Run the catalog reference cleanup before removing the old catalog.',
            ]);
        }

        $oldImages = $this->currentImages($product);

        DB::transaction(function () use ($request, $product, $activityLogger) {
            // Lock the parent row before rechecking references to reduce race conditions with new cart/package/order items.
            $lockedProduct = Product::query()
                ->lockForUpdate()
                ->findOrFail($product->id);

            if ($this->hasReferences($lockedProduct)) {
                abort(409, 'This product became referenced and cannot be deleted.');
            }

            $oldSnapshot = $this->snapshot($lockedProduct);

            // Stock adjustments are catalog maintenance records; purchase line items remain as
            // historical snapshots so invoices and transaction records keep their descriptions.
            InventoryAdjustment::query()
                ->where('product_id', $lockedProduct->id)
                ->delete();

            $activityLogger->record(
                $request,
                'product_deleted',
                "Deleted product {$lockedProduct->name}; historical order line items were retained.",
                $lockedProduct,
                $oldSnapshot,
                []
            );

            $lockedProduct->delete();
        });

        foreach ($oldImages as $oldImage) {
            $this->deleteStoredImage($oldImage);
        }

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
            'reason' => ['nullable', 'string', 'max:255'],
        ]);

        $newQuantity = (int) $validated['stock_quantity'];
        $reason = trim((string) ($validated['reason'] ?? 'Admin stock adjustment')) ?: 'Admin stock adjustment';

        $updatedProduct = DB::transaction(function () use (
            $request,
            $product,
            $newQuantity,
            $reason,
            $activityLogger
        ) {
            $lockedProduct = Product::query()
                ->whereKey($product->id)
                ->lockForUpdate()
                ->firstOrFail();

            $oldQuantity = (int) $lockedProduct->stock_quantity;
            $lockedProduct->update(['stock_quantity' => $newQuantity]);

            if ($oldQuantity !== $newQuantity) {
                InventoryAdjustment::create([
                    'product_id' => $lockedProduct->id,
                    'product_name' => $lockedProduct->name,
                    'user_id' => $request->user()->id,
                    'previous_quantity' => $oldQuantity,
                    'new_quantity' => $newQuantity,
                    'quantity_change' => $newQuantity - $oldQuantity,
                    'reason' => $reason,
                ]);

                $activityLogger->record(
                    $request,
                    'product_stock_updated',
                    "Changed stock for {$lockedProduct->name} from {$oldQuantity} to {$newQuantity} units.",
                    $lockedProduct,
                    ['stock_quantity' => $oldQuantity],
                    ['stock_quantity' => $newQuantity]
                );
            }

            return $lockedProduct;
        });

        return back()->with('success', $updatedProduct->name . ' stock was updated successfully.');
    }

    private function validateProduct(Request $request): array
    {
        return $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'category' => ['required', 'string', 'max:120'],
            'warranty' => ['required', 'string', 'max:120'],
            'price' => ['required', 'numeric', 'min:0.01', 'max:99999999.99'],
            'installation_fee' => ['nullable', 'numeric', 'min:0', 'max:99999999.99'],
            'stock_quantity' => ['required', 'integer', 'min:0'],
            'stock_reason' => ['nullable', 'string', 'max:255'],
            'badge' => ['nullable', 'string', 'max:80'],
            'image' => ['nullable', 'string', 'max:2048'],
            'image_file' => ['nullable', 'image', 'mimes:jpeg,jpg,png,webp', 'max:5120'],
            'image_files' => ['nullable', 'array', 'max:10'],
            'image_files.*' => ['image', 'mimes:jpeg,jpg,png,webp', 'max:5120'],
            'gallery_managed' => ['sometimes', 'boolean'],
            'existing_images' => ['sometimes', 'array', 'max:10'],
            'existing_images.*' => ['string', 'max:2048'],
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
            'installation_fee' => filled($validated['installation_fee'] ?? null) ? (float) $validated['installation_fee'] : null,
            'stock_quantity' => (int) $validated['stock_quantity'],
            'badge' => filled($validated['badge'] ?? null) ? trim($validated['badge']) : null,
            'image' => filled($validated['image'] ?? null) ? trim($validated['image']) : null,
            'specifications' => $specifications ?: null,
            'is_featured' => (bool) $validated['is_featured'],
        ];
    }

    /**
     * Resolve the ordered gallery from retained existing images and newly uploaded files.
     * The first image is the primary image for older storefront components.
     */
    private function resolveImages(Request $request, array $existingImages, ?string $legacyImage, string $directory): array
    {
        if (!$request->boolean('gallery_managed') && !$request->exists('existing_images') && $legacyImage && !in_array($legacyImage, $existingImages, true)) {
            array_unshift($existingImages, $legacyImage);
        }

        $files = array_values(array_filter((array) $request->file('image_files', [])));
        if ($request->hasFile('image_file')) {
            $files[] = $request->file('image_file');
        }

        if (count($existingImages) + count($files) > 10) {
            throw ValidationException::withMessages([
                'image_files' => 'You can keep or upload a maximum of 10 images per catalog item.',
            ]);
        }

        $diskName = config('filesystems.catalog_disk', 'public');
        $disk = Storage::disk($diskName);
        $uploadedImages = collect($files)
            ->map(function ($file) use ($directory, $diskName, $disk) {
                $path = $file->storePublicly($directory, $diskName);

                // Keep local development URLs compatible; use full object URLs in production.
                return $diskName === 'public'
                    ? '/storage/' . $path
                    : $disk->url($path);
            })
            ->all();

        return collect(array_merge($existingImages, $uploadedImages))
            ->filter(fn ($image) => is_string($image) && trim($image) !== '')
            ->unique()
            ->values()
            ->all();
    }

    private function currentImages(Product $product): array
    {
        $images = is_array($product->images) ? $product->images : [];

        if (!$images && filled($product->image)) {
            $images = [$product->image];
        }

        return array_values(array_unique(array_filter($images, fn ($image) => is_string($image) && trim($image) !== '')));
    }

    private function deleteStoredImage(?string $image): void
    {
        if (!$image) {
            return;
        }

        $diskName = config('filesystems.catalog_disk', 'public');
        $disk = Storage::disk($diskName);
        $path = $image;

        if (preg_match('#^https?://#i', $image)) {
            // Never delete third-party images or images from another storage provider.
            $diskBaseUrl = rtrim($disk->url('/'), '/') . '/';
            if (!str_starts_with($image, $diskBaseUrl)) {
                return;
            }

            $path = substr($image, strlen($diskBaseUrl));
        } else {
            $path = preg_replace('#^/?storage/#', '', $image);
        }

        if ($path && $disk->exists($path)) {
            $disk->delete($path);
        }
    }

    private function hasReferences(Product $product): bool
    {
        return $product->packageItems()->exists()
            || $product->reviews()->exists()
            || $product->cartItems()->exists();
    }

    private function snapshot(Product $product): array
    {
        return [
            'name' => $product->name,
            'category' => $product->category,
            'warranty' => $product->warranty,
            'price' => (float) $product->price,
            'installation_fee' => $product->installation_fee === null ? null : (float) $product->installation_fee,
            'stock_quantity' => (int) $product->stock_quantity,
            'badge' => $product->badge,
            'is_featured' => (bool) $product->is_featured,
        ];
    }
}
