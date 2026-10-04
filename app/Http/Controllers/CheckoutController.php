<?php

namespace App\Http\Controllers;

use App\Models\Order;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Inertia\Inertia;

class CheckoutController extends Controller
{
    public function index(Request $request)
    {
        $orderNumber = $request->session()->get('orderNumber');

        if ($orderNumber) {
            return Inertia::render('checkout', [
                'customer' => [
                    'name' => $request->user()->name,
                    'email' => $request->user()->email,
                    'phone' => $request->user()->phone ?? '',
                ],
                'cart' => [
                    'items' => [],
                    'subtotal' => 0,
                    'shipping_fee' => 0,
                    'total' => 0,
                ],
                'success' => true,
                'orderNumber' => $orderNumber,
                'paymentMethod' => $request->session()->get('paymentMethod'),
            ]);
        }

        $cart = $request->user()->cart;

        if (!$cart) {
            return redirect()->route('cart.index')->withErrors([
                'cart' => 'Your cart is empty.',
            ]);
        }

        $cart->load('items.purchasable');

        if ($cart->items->isEmpty()) {
            return redirect()->route('cart.index')->withErrors([
                'cart' => 'Your cart is empty.',
            ]);
        }

        $items = $cart->items->map(function ($item) {
            $purchasable = $item->purchasable;

            return [
                'id' => $item->id,
                'type' => $purchasable instanceof \App\Models\Package ? 'package' : 'product',
                'name' => $purchasable?->name,
                'image' => $purchasable?->image,
                'price' => (float) $item->price,
                'quantity' => (int) $item->quantity,
                'subtotal' => (float) $item->price * (int) $item->quantity,
            ];
        })->values();

        $subtotal = $items->sum('subtotal');
        $shippingFee = 0;

        return Inertia::render('checkout', [
            'customer' => [
                'name' => $request->user()->name,
                'email' => $request->user()->email,
                'phone' => $request->user()->phone ?? '',
            ],
            'cart' => [
                'items' => $items,
                'subtotal' => (float) $subtotal,
                'shipping_fee' => (float) $shippingFee,
                'total' => (float) ($subtotal + $shippingFee),
            ],
            'success' => false,
            'orderNumber' => null,
            'paymentMethod' => null,
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'customer_name' => ['required', 'string', 'max:120'],
            'customer_phone' => [
                'required',
                'string',
                'regex:/^09\d{9}$/',
            ],
            'customer_email' => ['required', 'email', 'max:255'],
            'delivery_address' => ['required', 'string', 'min:10', 'max:1000'],
            'notes' => ['nullable', 'string', 'max:1000'],
            'payment_method' => ['required', 'in:cash,gcash,card,maya'],
        ]);

        $cart = $request->user()->cart;

        if (!$cart) {
            return back()->withErrors([
                'cart' => 'Your cart is empty.',
            ]);
        }

        $cart->load('items.purchasable');

        if ($cart->items->isEmpty()) {
            return back()->withErrors([
                'cart' => 'Your cart is empty.',
            ]);
        }

        $order = DB::transaction(function () use ($request, $validated, $cart) {
            $snapshots = [];
            $subtotal = 0;

            foreach ($cart->items as $cartItem) {
                $purchasable = $cartItem->purchasable;

                if (!$purchasable) {
                    abort(422, 'An item in your cart is no longer available.');
                }

                $price = (float) $purchasable->price;
                $quantity = (int) $cartItem->quantity;
                $lineSubtotal = $price * $quantity;

                $snapshots[] = [
                    'purchasable_type' => $cartItem->purchasable_type,
                    'purchasable_id' => $cartItem->purchasable_id,
                    'name' => $purchasable->name,
                    'price' => $price,
                    'quantity' => $quantity,
                    'subtotal' => $lineSubtotal,
                ];

                $subtotal += $lineSubtotal;
            }

            $shippingFee = 0;
            $paymentStatus = 'pending';
            $orderStatus = $validated['payment_method'] === 'cash'
                ? 'pending'
                : 'awaiting_payment';

            do {
                $orderNumber = 'SV-' . now()->format('Ymd') . '-' . Str::upper(Str::random(6));
            } while (Order::where('order_number', $orderNumber)->exists());

            $order = Order::create([
                'user_id' => $request->user()->id,
                'order_number' => $orderNumber,
                'subtotal' => $subtotal,
                'shipping_fee' => $shippingFee,
                'total' => $subtotal + $shippingFee,
                'payment_method' => $validated['payment_method'],
                'payment_status' => $paymentStatus,
                'order_status' => $orderStatus,
                'customer_name' => $validated['customer_name'],
                'customer_phone' => $validated['customer_phone'],
                'customer_email' => $validated['customer_email'],
                'delivery_address' => $validated['delivery_address'],
                'notes' => $validated['notes'] ?? null,
            ]);

            foreach ($snapshots as $snapshot) {
                $order->items()->create($snapshot);
            }

            $cart->items()->delete();

            return $order;
        });

        return redirect()->route('checkout')->with([
            'orderNumber' => $order->order_number,
            'paymentMethod' => $order->payment_method,
        ]);
    }
}
