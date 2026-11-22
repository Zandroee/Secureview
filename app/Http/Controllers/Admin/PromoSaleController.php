<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Package;
use App\Models\Product;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Validation\ValidationException;

class PromoSaleController extends Controller
{
    public function updateProduct(Request $request, Product $product)
    {
        return $this->saveSale($request, $product, 'Product');
    }

    public function updatePackage(Request $request, Package $package)
    {
        return $this->saveSale($request, $package, 'Package');
    }

    private function saveSale(Request $request, Product|Package $item, string $label)
    {
        $data = $request->validate([
            'sale_price' => ['nullable', 'numeric', 'min:0.01', 'max:99999999.99'],
            'sale_starts_at' => ['nullable', 'date'],
            'sale_ends_at' => ['nullable', 'date'],
        ]);

        $salePrice = filled($data['sale_price'] ?? null)
            ? round((float) $data['sale_price'], 2)
            : null;

        if ($salePrice !== null && $salePrice >= (float) $item->price) {
            throw ValidationException::withMessages([
                'sale_price' => 'The sale price must be lower than the regular price.',
            ]);
        }

        $timezone = config('app.timezone', 'UTC');
        $startsAt = $salePrice !== null && filled($data['sale_starts_at'] ?? null)
            ? Carbon::parse($data['sale_starts_at'], $timezone)
            : null;
        $endsAt = $salePrice !== null && filled($data['sale_ends_at'] ?? null)
            ? Carbon::parse($data['sale_ends_at'], $timezone)
            : null;

        if ($salePrice !== null && $startsAt && $endsAt && $endsAt->lessThanOrEqualTo($startsAt)) {
            throw ValidationException::withMessages([
                'sale_ends_at' => 'The sale end must be after the start date.',
            ]);
        }

        $item->forceFill([
            'sale_price' => $salePrice,
            'sale_starts_at' => $startsAt?->format('Y-m-d H:i:s'),
            'sale_ends_at' => $endsAt?->format('Y-m-d H:i:s'),
        ])->save();

        return back()->with('success', $label . ' promo sale saved successfully.');
    }
}
