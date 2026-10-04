<?php

namespace App\Http\Controllers;

use App\Models\Order;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
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

        if ($validated['payment_method'] !== 'cash' && !config('services.paymongo.secret_key')) {
            return back()->withErrors([
                'payment' => 'Online payments are not configured yet. Add the PayMongo test secret key first.',
            ])->withInput();
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
            $subtotal = 0;

            foreach ($cart->items as $cartItem) {
                if (!$cartItem->purchasable) {
                    abort(422, 'An item in your cart is no longer available.');
                }

                $price = (float) $cartItem->purchasable->price;
                $quantity = (int) $cartItem->quantity;

                $subtotal += $price * $quantity;
            }

            $shippingFee = 0;

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
                'payment_status' => 'pending',
                'order_status' => $validated['payment_method'] === 'cash'
                    ? 'pending'
                    : 'awaiting_payment',
                'customer_name' => $validated['customer_name'],
                'customer_phone' => $validated['customer_phone'],
                'customer_email' => $validated['customer_email'],
                'delivery_address' => $validated['delivery_address'],
                'notes' => $validated['notes'] ?? null,
            ]);

            foreach ($cart->items as $cartItem) {
                $purchasable = $cartItem->purchasable;
                $price = (float) $purchasable->price;
                $quantity = (int) $cartItem->quantity;

                $order->items()->create([
                    'purchasable_type' => $cartItem->purchasable_type,
                    'purchasable_id' => $cartItem->purchasable_id,
                    'name' => $purchasable->name,
                    'price' => $price,
                    'quantity' => $quantity,
                    'subtotal' => $price * $quantity,
                ]);
            }

            return $order;
        });

        if ($validated['payment_method'] === 'cash') {
            $cart->items()->delete();

            return redirect()->route('checkout')->with([
                'orderNumber' => $order->order_number,
                'paymentMethod' => $order->payment_method,
            ]);
        }

        try {
            $order->load('items');

            $paymentMethod = match ($validated['payment_method']) {
                'gcash' => 'gcash',
                'card' => 'card',
                'maya' => 'paymaya',
            };

            $lineItems = $order->items->map(function ($item) {
                return [
                    'name' => $item->name,
                    'amount' => (int) round($item->price * 100),
                    'currency' => 'PHP',
                    'quantity' => (int) $item->quantity,
                ];
            })->values()->all();

            $response = Http::withBasicAuth(
                config('services.paymongo.secret_key'),
                ''
            )
                ->acceptJson()
                ->asJson()
                ->withHeaders([
                    'Idempotency-Key' => 'secureview-' . $order->order_number,
                ])
                ->post(
                    rtrim(config('services.paymongo.base_url'), '/') . '/v2/checkout_sessions',
                    [
                        'data' => [
                            'attributes' => [
                                'line_items' => $lineItems,
                                'payment_method_types' => [$paymentMethod],
                                'billing' => [
                                    'name' => $order->customer_name,
                                    'email' => $order->customer_email,
                                    'phone' => $order->customer_phone,
                                ],
                                'description' => 'SecureView Order ' . $order->order_number,
                                'reference_number' => $order->order_number,
                                'metadata' => [
                                    'order_id' => (string) $order->id,
                                    'order_number' => $order->order_number,
                                ],
                                'send_email_receipt' => true,
                                'show_description' => true,
                                'show_line_items' => true,
                                'success_url' => route(
                                    'checkout.payment.success',
                                    ['order' => $order->id],
                                    true
                                ),
                                'cancel_url' => route(
                                    'checkout.payment.cancel',
                                    ['order' => $order->id],
                                    true
                                ),
                            ],
                        ],
                    ]
                );

            if (!$response->successful()) {
                $order->update([
                    'payment_status' => 'failed',
                    'order_status' => 'payment_failed',
                ]);

                return back()->withErrors([
                    'payment' => 'Unable to start the online payment. Please try again.',
                ])->withInput();
            }

            $session = $response->json('data');

            $checkoutSessionId = $session['id'] ?? null;
            $checkoutUrl = $session['attributes']['checkout_url'] ?? null;

            if (!$checkoutSessionId || !$checkoutUrl) {
                $order->update([
                    'payment_status' => 'failed',
                    'order_status' => 'payment_failed',
                ]);

                return back()->withErrors([
                    'payment' => 'PayMongo returned an invalid checkout response. Please try again.',
                ])->withInput();
            }

            $order->update([
                'paymongo_checkout_session_id' => $checkoutSessionId,
            ]);

            return Inertia::location($checkoutUrl);
        } catch (\Throwable $exception) {
            report($exception);

            $order->update([
                'payment_status' => 'failed',
                'order_status' => 'payment_failed',
            ]);

            return back()->withErrors([
                'payment' => 'Unable to connect to the payment gateway. Please try again.',
            ])->withInput();
        }
    }

    public function paymentSuccess(Request $request, Order $order)
    {
        if ($order->user_id !== $request->user()->id) {
            abort(404);
        }

        return redirect()->route('purchases.show', $order);
    }

    public function paymentCancel(Request $request, Order $order)
    {
        if ($order->user_id !== $request->user()->id) {
            abort(404);
        }

        return redirect()->route('purchases.show', $order)->with([
            'paymentCancelled' => true,
        ]);
    }
}
