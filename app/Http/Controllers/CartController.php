<?php

namespace App\Http\Controllers;

use App\Models\CartItem;
use App\Models\Package;
use App\Models\Product;
use App\Services\InventoryService;
use Illuminate\Http\Request;
use Inertia\Inertia;

class CartController extends Controller
{
    public function index(Request $request, InventoryService $inventory)
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
                'available_stock' => $purchasable
                    ? $inventory->getAvailableStock($purchasable)
                    : 0,
            ];
        })->values();

        return Inertia::render('cart', [
            'cart' => [
                'id' => $cart->id,
                'items' => $items,
            ],
        ]);
    }

    public function store(Request $request, InventoryService $inventory)
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

        $newQuantity = $item
            ? min(99, $item->quantity + $validated['quantity'])
            : $validated['quantity'];

        $stockError = $inventory->getAvailabilityError($purchasable, $newQuantity);

        if ($stockError) {
            return back()->withErrors([
                'stock' => $stockError,
            ]);
        }

        if ($item) {
            $item->update([
                'quantity' => $newQuantity,
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

    public function update(Request $request, CartItem $cartItem, InventoryService $inventory)
    {
        $validated = $request->validate([
            'quantity' => ['required', 'integer', 'min:1', 'max:99'],
        ]);

        $cart = $request->user()->cart;

        if (!$cart || $cartItem->cart_id !== $cart->id) {
            abort(404);
        }

        $purchasable = $cartItem->purchasable;

        if (!$purchasable) {
            return back()->withErrors([
                'stock' => 'This cart item is no longer available.',
            ]);
        }

        $stockError = $inventory->getAvailabilityError(
            $purchasable,
            $validated['quantity']
        );

        if ($stockError) {
            return back()->withErrors([
                'stock' => $stockError,
            ]);
        }

        $cartItem->update([
            'quantity' => $validated['quantity'],
            'price' => $purchasable->price,
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
