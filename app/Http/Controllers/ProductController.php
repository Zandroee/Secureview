<?php

namespace App\Http\Controllers;

use App\Models\OrderItem;
use App\Models\Product;
use Illuminate\Http\Request;
use Inertia\Inertia;

class ProductController extends Controller
{
    public function index()
    {
        $products = Product::withCount('reviews')->get()->map(function (Product $product) {
            $product->setAttribute('original_price', (float) $product->price);
            $product->setAttribute('sale_active', $product->isOnSale());
            $product->setAttribute('sale_discount_percent', $product->saleDiscountPercent());
            $product->setAttribute('price', $product->effectivePrice());

            return $product;
        });

        return Inertia::render('products', [
            'products' => $products,
        ]);
    }

    public function show(Request $request, $id)
    {
        $product = Product::findOrFail($id);
        $product->setAttribute('original_price', (float) $product->price);
        $product->setAttribute('sale_active', $product->isOnSale());
        $product->setAttribute('sale_discount_percent', $product->saleDiscountPercent());
        $product->setAttribute('price', $product->effectivePrice());
        $reviews = $product->reviews()->with('user')->latest()->get();
        $userId = $request->user()?->id;

        $canReview = $userId !== null && OrderItem::query()
            ->where('purchasable_type', Product::class)
            ->where('purchasable_id', $product->id)
            ->whereHas('order', function ($query) use ($userId) {
                $query->where('user_id', $userId)
                    ->where('payment_status', 'paid')
                    ->where('order_status', '!=', 'cancelled');
            })
            ->exists();

        $userReview = $userId !== null
            ? $product->reviews()->where('user_id', $userId)->first()
            : null;

        return Inertia::render('product_details', [
            'product' => $product,
            'reviews' => $reviews,
            'canReview' => $canReview,
            'userReview' => $userReview,
        ]);
    }
}