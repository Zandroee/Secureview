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
        $products = Product::all();

        return Inertia::render('products', [
            'products' => $products,
        ]);
    }

    public function show(Request $request, $id)
    {
        $product = Product::findOrFail($id);
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