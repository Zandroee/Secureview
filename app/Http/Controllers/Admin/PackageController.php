<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\CatalogOption;
use App\Models\Package;
use App\Models\Product;
use App\Services\AdminActivityLogger;
use App\Services\InventoryService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;

class PackageController extends Controller
{
    public function index(Request $request, InventoryService $inventory)
    {
        $filters = $request->validate([
            'search' => ['nullable', 'string', 'max:120'],
            'category' => ['nullable', 'string', 'max:120'],
            'featured' => ['nullable', 'in:yes,no'],
        ]);

        $query = Package::query()
            ->with(['packageItems.product'])
            ->withCount(['reviews', 'orderItems', 'cartItems', 'inquiryReferences']);

        if (!empty($filters['search'])) {
            $search = $filters['search'];

            $query->where(function ($builder) use ($search) {
                $builder
                    ->where('name', 'like', '%' . $search . '%')
                    ->orWhere('category', 'like', '%' . $search . '%')
                    ->orWhere('badge', 'like', '%' . $search . '%')
                    ->orWhereHas('packageItems.product', function ($productQuery) use ($search) {
                        $productQuery->where('name', 'like', '%' . $search . '%');
                    });
            });
        }

        if (!empty($filters['category'])) {
            $query->where('category', $filters['category']);
        }

        if (($filters['featured'] ?? '') === 'yes') {
            $query->where('is_featured', true);
        } elseif (($filters['featured'] ?? '') === 'no') {
            $query->where('is_featured', false);
        }

        $packages = $query
            ->orderByDesc('is_featured')
            ->orderBy('name')
            ->paginate(12)
            ->withQueryString()
            ->through(function (Package $package) use ($inventory) {
                $availableStock = $inventory->getAvailableStock($package);

                return [
                    'id' => $package->id,
                    'name' => $package->name,
                    'category' => $package->category,
                    'warranty' => $package->warranty,
                    'price' => (float) $package->price,
                    'badge' => $package->badge,
                    'image' => $package->image,
                    'images' => $this->currentImages($package),
                    'specifications' => $package->specifications ?? [],
                    'rating' => (float) $package->rating,
                    'is_featured' => (bool) $package->is_featured,
                    'reviews_count' => (int) $package->reviews_count,
                    'can_edit_components' => (
                        (int) $package->order_items_count === 0 &&
                        (int) $package->cart_items_count === 0 &&
                        (int) $package->inquiry_references_count === 0 &&
                        (int) $package->reviews_count === 0
                    ),
                    'available_stock' => $availableStock,
                    'items' => $package->packageItems->map(function ($item) {
                        return [
                            'product_id' => (int) $item->product_id,
                            'product_name' => $item->product?->name ?? 'Unavailable product',
                            'quantity' => (int) $item->quantity,
                            'unit_price' => (float) $item->price,
                            'product_stock' => (int) ($item->product?->stock_quantity ?? 0),
                        ];
                    })->values(),
                ];
            });

        $categories = Package::query()
            ->select('category')
            ->distinct()
            ->orderBy('category')
            ->pluck('category')
            ->values();

        $allPackages = Package::with('packageItems.product')->get();

        $allProductsForOptions = Product::query()->get(['category', 'warranty', 'badge']);

        // Include values already in the catalog and explicitly-added options, except
        // options that an admin has removed from the shared dropdown.
        $catalogOptions = static function (string $field) use ($allPackages, $allProductsForOptions) {
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
                ->merge($allPackages->pluck($field))
                ->merge($allProductsForOptions->pluck($field))
                ->filter(fn ($value) => filled($value))
                ->map(fn ($value) => trim((string) $value))
                ->filter(fn ($value) => $value !== '' && !in_array(mb_strtolower($value), $removed, true))
                ->unique()
                ->sort()
                ->values();
        };
        $stockCounts = $allPackages->map(
            fn (Package $package) => $inventory->getAvailableStock($package)
        );

        return Inertia::render('Admin/Packages', [
            'packages' => $packages,
            'products' => Product::query()
                ->orderBy('name')
                ->get(['id', 'name', 'category', 'price', 'stock_quantity'])
                ->map(fn (Product $product) => [
                    'id' => $product->id,
                    'name' => $product->name,
                    'category' => $product->category,
                    'price' => (float) $product->price,
                    'stock_quantity' => (int) $product->stock_quantity,
                ])
                ->values(),
            'categories' => $categories,
            'categoryOptions' => $catalogOptions('category'),
            'warrantyOptions' => $catalogOptions('warranty'),
            'badgeOptions' => $catalogOptions('badge'),
            'filters' => [
                'search' => $filters['search'] ?? '',
                'category' => $filters['category'] ?? '',
                'featured' => $filters['featured'] ?? '',
            ],
            'summary' => [
                'total' => $allPackages->count(),
                'featured' => $allPackages->where('is_featured', true)->count(),
                'in_stock' => $stockCounts->filter(fn (int $stock) => $stock > 0)->count(),
                'out_of_stock' => $stockCounts->filter(fn (int $stock) => $stock === 0)->count(),
            ],
            'success' => $request->session()->get('success'),
        ]);
    }

    public function store(Request $request, AdminActivityLogger $activityLogger)
    {
        $validated = $this->validatePackage($request);
        $items = $validated['items'];
        unset($validated['items']);

        $fields = $this->packageFields($validated);
        $legacyImage = filled($fields['image'] ?? null) ? $fields['image'] : null;
        $fields['images'] = $this->resolveImages($request, [], $legacyImage, 'packages');
        $fields['image'] = $fields['images'][0] ?? null;

        DB::transaction(function () use ($request, $fields, $items, $activityLogger) {
            $package = Package::create($fields);
            $this->replaceItems($package, $items);

            $activityLogger->record(
                $request,
                'package_created',
                "Created package {$package->name} with " . count($items) . ' component product line(s).',
                $package,
                [],
                $this->snapshot($package)
            );
        });

        return redirect()
            ->route('admin.packages.index')
            ->with('success', 'Package created successfully.');
    }

    public function update(
        Request $request,
        Package $package,
        AdminActivityLogger $activityLogger
    ) {
        $validated = $this->validatePackage($request);
        $items = $validated['items'];
        unset($validated['items']);

        $oldImages = $this->currentImages($package);
        $oldSnapshot = $this->snapshot($package);
        $oldComponents = $this->componentSummary($package);
        $oldName = $package->name;
        $fields = $this->packageFields($validated);

        $oldComposition = $package->packageItems()
            ->orderBy('product_id')
            ->get(['product_id', 'quantity'])
            ->map(fn ($item) => [(int) $item->product_id, (int) $item->quantity])
            ->values()
            ->all();

        $newComposition = collect($items)
            ->map(fn ($item) => [(int) $item['product_id'], (int) $item['quantity']])
            ->sortBy(fn ($item) => $item[0])
            ->values()
            ->all();

        $componentsChanged = $oldComposition !== $newComposition;

        if ($componentsChanged && $this->hasReferences($package)) {
            return back()->withErrors([
                'items' => 'This package has existing purchase, cart, inquiry, or review history. Its bundle contents are locked. Create a new package to use different components.',
            ]);
        }

        $existingImages = $request->exists('existing_images')
            ? collect($request->input('existing_images', []))
                ->filter(fn ($image) => is_string($image) && in_array($image, $oldImages, true))
                ->unique()
                ->values()
                ->all()
            : $oldImages;
        $legacyImage = filled($fields['image'] ?? null) ? $fields['image'] : null;
        $fields['images'] = $this->resolveImages($request, $existingImages, $legacyImage, 'packages');
        $fields['image'] = $fields['images'][0] ?? null;

        $priceChanged = (float) $oldSnapshot['price'] !== (float) $fields['price'];

        DB::transaction(function () use (
            $request,
            $package,
            $fields,
            $items,
            $oldSnapshot,
            $oldComponents,
            $oldName,
            $componentsChanged,
            $priceChanged,
            $activityLogger
        ) {
            $package->update($fields);

            if ($componentsChanged) {
                $this->replaceItems($package, $items);
            }

            // Keep any existing cart display prices in sync with the package's current price.
            if ($priceChanged) {
                $package->cartItems()->update([
                    'price' => $package->price,
                ]);
            }

            $newSnapshot = $this->snapshot($package);
            $newComponents = $this->componentSummary($package);

            $activityLogger->record(
                $request,
                'package_updated',
                "Updated package {$oldName}. Components changed from [{$oldComponents}] to [{$newComponents}].",
                $package,
                $oldSnapshot,
                $newSnapshot
            );
        });

        foreach (array_diff($oldImages, $fields['images']) as $removedImage) {
            $this->deleteStoredImage($removedImage);
        }

        return redirect()
            ->route('admin.packages.index')
            ->with('success', 'Package updated successfully.');
    }

    public function destroy(Request $request, Package $package, AdminActivityLogger $activityLogger)
    {
        if ($this->hasReferences($package)) {
            return back()->withErrors([
                'package' => 'This package has purchase, cart, inquiry, or review history and cannot be deleted. Edit the package instead.',
            ]);
        }

        $oldImages = $this->currentImages($package);
        $oldSnapshot = $this->snapshot($package);
        $oldComponents = $this->componentSummary($package);

        DB::transaction(function () use ($request, $package, $oldSnapshot, $oldComponents, $activityLogger) {
            $activityLogger->record(
                $request,
                'package_deleted',
                "Deleted package {$package->name} and its components [{$oldComponents}].",
                $package,
                $oldSnapshot,
                []
            );

            $package->delete();
        });

        foreach ($oldImages as $oldImage) {
            $this->deleteStoredImage($oldImage);
        }

        return redirect()
            ->route('admin.packages.index')
            ->with('success', 'Package deleted successfully.');
    }

    private function resolveImages(Request $request, array $existingImages, ?string $legacyImage, string $directory): array
    {
        if (!$request->exists('existing_images') && $legacyImage && !in_array($legacyImage, $existingImages, true)) {
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

        $uploadedImages = collect($files)
            ->map(fn ($file) => '/storage/' . $file->store($directory, 'public'))
            ->all();

        return collect(array_merge($existingImages, $uploadedImages))
            ->filter(fn ($image) => is_string($image) && trim($image) !== '')
            ->unique()
            ->values()
            ->all();
    }

    private function currentImages(Package $package): array
    {
        $images = is_array($package->images) ? $package->images : [];

        if (!$images && filled($package->image)) {
            $images = [$package->image];
        }

        return array_values(array_unique(array_filter($images, fn ($image) => is_string($image) && trim($image) !== '')));
    }

    private function deleteStoredImage(?string $image): void
    {
        if (!$image || preg_match('#^https?://#i', $image)) {
            return;
        }

        $path = preg_replace('#^/?storage/#', '', $image);

        if ($path && Storage::disk('public')->exists($path)) {
            Storage::disk('public')->delete($path);
        }
    }

    private function hasReferences(Package $package): bool
    {
        return $package->orderItems()->exists()
            || $package->cartItems()->exists()
            || $package->inquiryReferences()->exists()
            || $package->reviews()->exists();
    }

    private function validatePackage(Request $request): array
    {
        return $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'category' => ['required', 'string', 'max:120'],
            'warranty' => ['required', 'string', 'max:120'],
            'price' => ['required', 'numeric', 'min:0.01', 'max:99999999.99'],
            'badge' => ['nullable', 'string', 'max:80'],
            'image' => ['nullable', 'string', 'max:2048'],
            'image_file' => ['nullable', 'image', 'mimes:jpeg,jpg,png,webp', 'max:5120'],
            'image_files' => ['nullable', 'array', 'max:10'],
            'image_files.*' => ['image', 'mimes:jpeg,jpg,png,webp', 'max:5120'],
            'existing_images' => ['sometimes', 'array', 'max:10'],
            'existing_images.*' => ['string', 'max:2048'],
            'specifications' => ['nullable', 'array', 'max:30'],
            'specifications.*' => ['required', 'string', 'max:255'],
            'is_featured' => ['required', 'boolean'],
            'items' => ['required', 'array', 'min:1', 'max:50'],
            'items.*.product_id' => ['required', 'integer', 'distinct', 'exists:products,id'],
            'items.*.quantity' => ['required', 'integer', 'min:1', 'max:99'],
        ]);
    }

    private function packageFields(array $validated): array
    {
        $specifications = collect($validated['specifications'] ?? [])
            ->map(fn ($value) => trim($value))
            ->filter(fn ($value) => $value !== '')
            ->values()
            ->all();

        return [
            'name' => $validated['name'],
            'category' => $validated['category'],
            'warranty' => $validated['warranty'],
            'price' => $validated['price'],
            'badge' => $validated['badge'] ?? null,
            'image' => $validated['image'] ?? null,
            'specifications' => $specifications ?: null,
            'is_featured' => (bool) $validated['is_featured'],
        ];
    }

    private function replaceItems(Package $package, array $items): void
    {
        $productIds = collect($items)->pluck('product_id')->map(fn ($id) => (int) $id);
        $products = Product::query()
            ->whereIn('id', $productIds)
            ->get()
            ->keyBy('id');

        if ($products->count() !== $productIds->unique()->count()) {
            abort(422, 'One or more selected products are no longer available.');
        }

        $package->packageItems()->delete();

        foreach ($items as $item) {
            $product = $products->get((int) $item['product_id']);

            $package->packageItems()->create([
                'product_id' => $product->id,
                'quantity' => (int) $item['quantity'],
                'price' => $product->price,
            ]);
        }
    }

    private function snapshot(Package $package): array
    {
        return [
            'name' => $package->name,
            'category' => $package->category,
            'warranty' => $package->warranty,
            'price' => (float) $package->price,
            'badge' => $package->badge,
            'is_featured' => (bool) $package->is_featured,
            'items_count' => $package->packageItems()->count(),
        ];
    }

    private function componentSummary(Package $package): string
    {
        return $package->packageItems()
            ->with('product:id,name')
            ->get()
            ->map(fn ($item) => ($item->product?->name ?? 'Unavailable product') . ' × ' . $item->quantity)
            ->implode(', ');
    }
}
