<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Order;
use App\Models\Package;
use App\Models\Product;
use App\Models\Voucher;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Illuminate\Support\Carbon;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;

class VoucherController extends Controller
{
    public function index()
    {
        $vouchers = Voucher::query()
            ->withCount([
                'orders as uses_count' => fn ($query) => $query->where('order_status', '!=', 'cancelled'),
            ])
            ->orderByDesc('id')
            ->limit(200)
            ->get()
            ->map(fn (Voucher $voucher) => [
                'id' => $voucher->id,
                'code' => $voucher->code,
                'name' => $voucher->name,
                'description' => $voucher->description,
                'discount_type' => $voucher->discount_type,
                'discount_value' => (float) $voucher->discount_value,
                'minimum_subtotal' => (float) $voucher->minimum_subtotal,
                'maximum_discount' => $voucher->maximum_discount === null ? null : (float) $voucher->maximum_discount,
                'starts_at' => $voucher->starts_at !== null
                    ? Carbon::parse($voucher->starts_at, config('app.timezone', 'UTC'))->format('Y-m-d\\TH:i')
                    : null,
                'expires_at' => $voucher->expires_at !== null
                    ? Carbon::parse($voucher->expires_at, config('app.timezone', 'UTC'))->format('Y-m-d\\TH:i')
                    : null,
                'usage_limit' => $voucher->usage_limit,
                'per_user_limit' => $voucher->per_user_limit,
                'is_active' => (bool) $voucher->is_active,
                'uses_count' => (int) $voucher->uses_count,
                'created_at' => $voucher->created_at?->format('M d, Y'),
            ]);

        $saleProducts = Product::query()->orderBy('name')->get()->map(fn (Product $product) => [
            'id' => $product->id,
            'name' => $product->name,
            'brand' => $product->brand,
            'category' => $product->category,
            'price' => (float) $product->price,
            'sale_price' => $product->sale_price === null ? null : (float) $product->sale_price,
            'sale_starts_at' => $product->sale_starts_at !== null
                ? Carbon::parse($product->sale_starts_at, config('app.timezone', 'UTC'))->format('Y-m-d\\TH:i')
                : null,
            'sale_ends_at' => $product->sale_ends_at !== null
                ? Carbon::parse($product->sale_ends_at, config('app.timezone', 'UTC'))->format('Y-m-d\\TH:i')
                : null,
            'sale_active' => $product->isOnSale(),
        ])->values();

        $salePackages = Package::query()->orderBy('name')->get()->map(fn (Package $package) => [
            'id' => $package->id,
            'name' => $package->name,
            'brand' => $package->brand,
            'category' => $package->category,
            'price' => (float) $package->price,
            'sale_price' => $package->sale_price === null ? null : (float) $package->sale_price,
            'sale_starts_at' => $package->sale_starts_at !== null
                ? Carbon::parse($package->sale_starts_at, config('app.timezone', 'UTC'))->format('Y-m-d\\TH:i')
                : null,
            'sale_ends_at' => $package->sale_ends_at !== null
                ? Carbon::parse($package->sale_ends_at, config('app.timezone', 'UTC'))->format('Y-m-d\\TH:i')
                : null,
            'sale_active' => $package->isOnSale(),
        ])->values();

        return Inertia::render('Admin/Vouchers', [
            'vouchers' => $vouchers,
            'saleProducts' => $saleProducts,
            'salePackages' => $salePackages,
        ]);
    }

    public function store(Request $request)
    {
        $voucher = Voucher::create($this->validatedData($request));
        return back()->with('success', 'Voucher ' . $voucher->code . ' created successfully.');
    }

    public function update(Request $request, Voucher $voucher)
    {
        $voucher->update($this->validatedData($request, $voucher));
        return back()->with('success', 'Voucher ' . $voucher->code . ' updated successfully.');
    }

    public function destroy(Voucher $voucher)
    {
        if (Order::query()->where('voucher_id', $voucher->id)->exists()) {
            throw ValidationException::withMessages([
                'voucher' => 'This voucher is linked to order history and cannot be deleted. Deactivate it instead.',
            ]);
        }

        $code = $voucher->code;
        $voucher->delete();
        return back()->with('success', 'Voucher ' . $code . ' deleted.');
    }

    private function validatedData(Request $request, ?Voucher $voucher = null): array
    {
        $request->merge([
            'code' => Str::upper(trim((string) $request->input('code', ''))),
            'name' => trim((string) $request->input('name', '')),
        ]);

        $uniqueCode = Rule::unique('vouchers', 'code');
        if ($voucher) {
            $uniqueCode->ignore($voucher->id);
        }

        $isPercentage = $request->input('discount_type') === 'percentage';
        $data = $request->validate([
            'code' => ['required', 'string', 'min:3', 'max:50', 'regex:/^[A-Z0-9][A-Z0-9_-]*$/', $uniqueCode],
            'name' => ['required', 'string', 'min:2', 'max:120'],
            'description' => ['nullable', 'string', 'max:1000'],
            'discount_type' => ['required', Rule::in(['percentage', 'fixed'])],
            'discount_value' => ['required', 'numeric', 'gt:0', $isPercentage ? 'lte:99' : 'lte:1000000'],
            'minimum_subtotal' => ['required', 'numeric', 'min:0', 'lte:100000000'],
            'maximum_discount' => ['nullable', 'numeric', 'gt:0', 'lte:100000000'],
            'starts_at' => ['nullable', 'date'],
            'expires_at' => ['nullable', 'date'],
            'usage_limit' => ['nullable', 'integer', 'min:1', 'max:100000000'],
            'per_user_limit' => ['nullable', 'integer', 'min:1', 'max:100000000'],
            'is_active' => ['required', 'boolean'],
        ]);

        $timezone = config('app.timezone', 'UTC');
        $startsAt = filled($data['starts_at'] ?? null)
            ? Carbon::parse($data['starts_at'], $timezone)
            : null;
        $expiresAt = filled($data['expires_at'] ?? null)
            ? Carbon::parse($data['expires_at'], $timezone)
            : null;

        if ($startsAt && $expiresAt && $expiresAt->lt($startsAt)) {
            throw ValidationException::withMessages([
                'expires_at' => 'The expiration must be after the start date.',
            ]);
        }

        // HTML datetime-local values represent wall-clock time in the app timezone.
        // Store normalized Y-m-d H:i:s strings in DATETIME columns (no timezone shift).
        foreach (['starts_at', 'expires_at'] as $field) {
            $value = $data[$field] ?? null;
            $data[$field] = filled($value)
                ? Carbon::parse($value, $timezone)->format('Y-m-d H:i:s')
                : null;
        }

        if ($data['discount_type'] === 'fixed') {
            $data['maximum_discount'] = null;
        }

        return $data;
    }
}
