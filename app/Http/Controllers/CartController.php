<?php

namespace App\Http\Controllers;

use App\Models\CartItem;
use App\Models\Package;
use App\Models\Product;
use Illuminate\Http\Request;
use Inertia\Inertia;

class CartController extends Controller
{
    public function index(Request $request)
    {
        $cart = $request->user()->cart;

        if (!$cart) {
            return Inertia::render('cart', [
                'cart' => [
                    'id' => null,
                    'items' => [],
                ],
            ]);
        }

        $cart->load('items.purchasable');

        $items = $cart->items->map(function (CartItem $item) {
            $purchasable = $item->purchasable;

            return [
                'id' => $item->id,
                'quantity' => $item->quantity,
                'price' => (float) $item->price,
                'type' => $purchasable instanceof Package ? 'package' : 'product',
                'name' => $purchasable?->name,
                'image' => $purchasable?->image,
            ];
        })->values();

        return Inertia::render('cart', [
            'cart' => [
                'id' => $cart->id,
                'items' => $items,
            ],
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'item_type' => ['required', 'in:product,package'],
            'item_id' => ['required', 'integer', 'min:1'],
            'quantity' => ['required', 'integer', 'min:1', 'max:99'],
        ]);

        $modelClass = $validated['item_type'] === 'product'
            ? Product::class
            : Package::class;

        $purchasable = $modelClass::findOrFail($validated['item_id']);

        $cart = $request->user()->cart()->firstOrCreate();

        $item = $cart->items()
            ->where('purchasable_type', $modelClass)
            ->where('purchasable_id', $purchasable->id)
            ->first();

        if ($item) {
            $item->update([
                'quantity' => min(99, $item->quantity + $validated['quantity']),
                'price' => $purchasable->price,
            ]);
        } else {
            $cart->items()->create([
                'purchasable_type' => $modelClass,
                'purchasable_id' => $purchasable->id,
                'quantity' => $validated['quantity'],
                'price' => $purchasable->price,
            ]);
        }

        return back();
    }

    public function update(Request $request, CartItem $cartItem)
    {
        $validated = $request->validate([
            'quantity' => ['required', 'integer', 'min:1', 'max:99'],
        ]);

        $cart = $request->user()->cart;

        if (!$cart || $cartItem->cart_id !== $cart->id) {
            abort(404);
        }

        $cartItem->update([
            'quantity' => $validated['quantity'],
            'price' => $cartItem->purchasable?->price ?? $cartItem->price,
        ]);

        return back();
    }

    public function destroy(Request $request, CartItem $cartItem)
    {
        $cart = $request->user()->cart;

        if (!$cart || $cartItem->cart_id !== $cart->id) {
            abort(404);
        }

        $cartItem->delete();

        return back();
    }

    public function clear(Request $request)
    {
        $cart = $request->user()->cart;

        if ($cart) {
            $cart->items()->delete();
        }

        return back();
    }
}
