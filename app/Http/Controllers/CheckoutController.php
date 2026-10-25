<?php

namespace App\Http\Controllers;

use App\Models\CustomerNotification;
use App\Models\Order;
use App\Models\Inquiry;
use App\Models\PendingInquiryCheckout;
use App\Models\Product;
use App\Models\Package;
use App\Services\InventoryService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Str;
use Inertia\Inertia;

class CheckoutController extends Controller
{
    public function buyNow(Request $request, InventoryService $inventory)
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

        $stockError = $inventory->getAvailabilityError(
            $purchasable,
            (int) $validated['quantity']
        );

        if ($stockError) {
            return back()->withErrors([
                'stock' => $stockError,
            ]);
        }

        // A Buy Now selection is session-backed and does not modify the user's cart.
        $request->session()->forget(['orderNumber', 'paymentMethod', 'buy_now']);
        $request->session()->put('buy_now', [
            'item_type' => $validated['item_type'],
            'item_id' => (int) $purchasable->id,
            'quantity' => (int) $validated['quantity'],
        ]);

        return redirect()->route('checkout');
    }

    private function selectedBuyNowItem(Request $request): ?array
    {
        $selection = $request->session()->get('buy_now');

        if (!is_array($selection)) {
            return null;
        }

        $itemType = $selection['item_type'] ?? '';
        $itemId = filter_var($selection['item_id'] ?? null, FILTER_VALIDATE_INT);
        $quantity = filter_var($selection['quantity'] ?? null, FILTER_VALIDATE_INT);

        if (
            !in_array($itemType, ['product', 'package'], true) ||
            $itemId === false ||
            $itemId < 1 ||
            $quantity === false ||
            $quantity < 1 ||
            $quantity > 99
        ) {
            return ['error' => 'Your Buy Now selection is invalid. Please select the item again.'];
        }

        $modelClass = $itemType === 'product' ? Product::class : Package::class;
        $purchasable = $modelClass::find($itemId);

        if (!$purchasable) {
            return ['error' => 'The selected item is no longer available. Please choose it again.'];
        }

        return [
            'item_type' => $itemType,
            'item_id' => $itemId,
            'quantity' => $quantity,
            'model_class' => $modelClass,
            'purchasable' => $purchasable,
        ];
    }

    public function index(Request $request, InventoryService $inventory)
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

        $buyNow = $this->selectedBuyNowItem($request);

        if ($buyNow !== null) {
            if (isset($buyNow['error'])) {
                $request->session()->forget('buy_now');

                return redirect('/products')->withErrors([
                    'cart' => $buyNow['error'],
                ]);
            }

            $purchasable = $buyNow['purchasable'];
            $stockError = $inventory->getAvailabilityError(
                $purchasable,
                (int) $buyNow['quantity']
            );

            if ($stockError) {
                $request->session()->forget('buy_now');

                return redirect(
                    '/' . ($buyNow['item_type'] === 'package' ? 'packages/' : 'products/') . $buyNow['item_id']
                )->withErrors([
                    'stock' => $stockError,
                ]);
            }

            $quantity = (int) $buyNow['quantity'];
            $items = collect([[
                'id' => 'buy-now-' . $purchasable->id,
                'type' => $buyNow['item_type'],
                'name' => $purchasable->name,
                'image' => $purchasable->image,
                'price' => (float) $purchasable->price,
                'quantity' => $quantity,
                'subtotal' => (float) $purchasable->price * $quantity,
                'available_stock' => $inventory->getAvailableStock($purchasable),
            ]]);

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

        $items = $cart->items->map(function ($item) use ($inventory) {
            $purchasable = $item->purchasable;

            return [
                'id' => $item->id,
                'type' => $purchasable instanceof \App\Models\Package ? 'package' : 'product',
                'name' => $purchasable?->name,
                'image' => $purchasable?->image,
                'price' => (float) $item->price,
                'quantity' => (int) $item->quantity,
                'subtotal' => (float) $item->price * (int) $item->quantity,
                'available_stock' => $purchasable
                    ? $inventory->getAvailableStock($purchasable)
                    : 0,
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

    public function store(Request $request, InventoryService $inventory)
    {
        $validated = $request->validate([
            'customer_name' => ['required', 'string', 'max:120'],
            'customer_phone' => [
                'required',
                'string',
                'regex:/^09\d{9}$/',
            ],
            'customer_email' => ['required', 'email', 'max:255'],
            // The structured address is used by the OpenStreetMap checkout picker.
            // Keep the old single-field address accepted for older clients during rollout.
            'delivery_street_address' => ['required_without:delivery_address', 'nullable', 'string', 'min:5', 'max:500'],
            'delivery_address_details' => ['nullable', 'string', 'max:500'],
            'delivery_city' => ['required_without:delivery_address', 'nullable', 'string', 'max:180'],
            'delivery_latitude' => ['nullable', 'numeric', 'between:-90,90', 'required_with:delivery_longitude'],
            'delivery_longitude' => ['nullable', 'numeric', 'between:-180,180', 'required_with:delivery_latitude'],
            'delivery_address' => ['nullable', 'string', 'min:10', 'max:1000'],
            'notes' => ['nullable', 'string', 'max:1000'],
            'payment_method' => ['required', 'in:cash,gcash,card,maya'],
        ]);

        $deliveryStreet = trim((string) ($validated['delivery_street_address'] ?? ''));
        $deliveryDetails = trim((string) ($validated['delivery_address_details'] ?? ''));
        $deliveryCity = trim((string) ($validated['delivery_city'] ?? ''));

        $formattedDeliveryAddress = collect([
            $deliveryStreet,
            $deliveryDetails,
            $deliveryCity,
        ])->filter(fn ($part) => $part !== '')->implode(', ');

        // Maintain compatibility with older checkout clients that still send delivery_address.
        $validated['delivery_address'] = $formattedDeliveryAddress !== ''
            ? $formattedDeliveryAddress
            : trim((string) ($validated['delivery_address'] ?? ''));

        if ($validated['payment_method'] !== 'cash' && !config('services.paymongo.secret_key')) {
            return back()->withErrors([
                'payment' => 'Online payments are not configured yet. Add the PayMongo test secret key first.',
            ])->withInput();
        }

        $isBuyNow = $request->session()->has('buy_now');
        $buyNow = $this->selectedBuyNowItem($request);
        $cart = null;

        if ($isBuyNow) {
            if ($buyNow === null || isset($buyNow['error'])) {
                $request->session()->forget('buy_now');

                return back()->withErrors([
                    'cart' => $buyNow['error'] ?? 'Your Buy Now selection is no longer available. Please choose the item again.',
                ]);
            }

            $purchasable = $buyNow['purchasable'];
            $stockError = $inventory->getAvailabilityError(
                $purchasable,
                (int) $buyNow['quantity']
            );

            if ($stockError) {
                return back()->withErrors([
                    'stock' => $stockError,
                ]);
            }

            $checkoutItems = collect([[
                'purchasable' => $purchasable,
                'purchasable_type' => $buyNow['model_class'],
                'purchasable_id' => $purchasable->id,
                'quantity' => (int) $buyNow['quantity'],
            ]]);
        } else {
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

            $checkoutItems = $cart->items->map(fn ($cartItem) => [
                'purchasable' => $cartItem->purchasable,
                'purchasable_type' => $cartItem->purchasable_type,
                'purchasable_id' => $cartItem->purchasable_id,
                'quantity' => (int) $cartItem->quantity,
            ])->values();
        }

        foreach ($checkoutItems as $checkoutItem) {
            $purchasable = $checkoutItem['purchasable'];

            if (!$purchasable) {
                return back()->withErrors([
                    'stock' => 'An item in your checkout is no longer available.',
                ]);
            }

            $stockError = $inventory->getAvailabilityError(
                $purchasable,
                (int) $checkoutItem['quantity']
            );

            if ($stockError) {
                return back()->withErrors([
                    'stock' => $stockError,
                ]);
            }
        }

        $order = DB::transaction(function () use ($request, $validated, $checkoutItems, $deliveryDetails, $deliveryCity) {
            $subtotal = 0;

            foreach ($checkoutItems as $checkoutItem) {
                $purchasable = $checkoutItem['purchasable'];

                if (!$purchasable) {
                    abort(422, 'An item in your checkout is no longer available.');
                }

                $price = (float) $purchasable->price;
                $quantity = (int) $checkoutItem['quantity'];

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
                'delivery_address_details' => $deliveryDetails !== '' ? $deliveryDetails : null,
                'delivery_city' => $deliveryCity !== '' ? $deliveryCity : null,
                'delivery_latitude' => $validated['delivery_latitude'] ?? null,
                'delivery_longitude' => $validated['delivery_longitude'] ?? null,
                'notes' => $validated['notes'] ?? null,
            ]);

            foreach ($checkoutItems as $checkoutItem) {
                $purchasable = $checkoutItem['purchasable'];
                $price = (float) $purchasable->price;
                $quantity = (int) $checkoutItem['quantity'];

                $order->items()->create([
                    'purchasable_type' => $checkoutItem['purchasable_type'],
                    'purchasable_id' => $checkoutItem['purchasable_id'],
                    'name' => $purchasable->name,
                    'warranty_period' => $purchasable->warranty ?? null,
                    'price' => $price,
                    'quantity' => $quantity,
                    'subtotal' => $price * $quantity,
                ]);
            }

            return $order;
        });

        if ($validated['payment_method'] === 'cash') {
            try {
                $inventory->deductForOrder($order);
            } catch (\Throwable $exception) {
                report($exception);

                return back()->withErrors([
                    'stock' => 'We could not confirm the stock for this order. Please try again.',
                ]);
            }

            CustomerNotification::create([
                'user_id' => $request->user()->id,
                'type' => 'order',
                'title' => 'Order placed',
                'message' => 'Your Cash order ' . $order->order_number . ' has been placed successfully.',
                'action_url' => route('purchases.show', $order),
                'related_type' => Order::class,
                'related_id' => $order->id,
            ]);

            if ($cart) {
                $cart->items()->delete();
            }

            if ($isBuyNow) {
                $request->session()->forget('buy_now');
            }

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

            CustomerNotification::create([
                'user_id' => $request->user()->id,
                'type' => 'order',
                'title' => 'Payment required',
                'message' => 'Your order ' . $order->order_number . ' is waiting for payment.',
                'action_url' => route('purchases.show', $order),
                'related_type' => Order::class,
                'related_id' => $order->id,
            ]);

            if ($isBuyNow) {
                $buyNowOrderIds = array_map(
                    'intval',
                    (array) $request->session()->get('buy_now_order_ids', [])
                );
                $buyNowOrderIds[] = (int) $order->id;
                $request->session()->put(
                    'buy_now_order_ids',
                    array_values(array_unique($buyNowOrderIds))
                );
                $request->session()->forget('buy_now');
            }

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

    public function paymentSuccess(Request $request, Order $order, InventoryService $inventory)
    {
        if ($order->user_id !== $request->user()->id) {
            abort(404);
        }

        if ($order->order_status === 'cancelled') {
            return redirect()->route('purchases.show', $order)->withErrors([
                'payment' => 'This order has been cancelled and can no longer be paid.',
            ]);
        }

        if (
            $order->payment_method !== 'cash' &&
            $order->payment_status !== 'paid' &&
            $order->paymongo_checkout_session_id &&
            config('services.paymongo.secret_key')
        ) {
            try {
                $response = Http::withBasicAuth(
                    config('services.paymongo.secret_key'),
                    ''
                )
                    ->acceptJson()
                    ->get(
                        rtrim(config('services.paymongo.base_url'), '/') .
                        '/v1/checkout_sessions/' .
                        $order->paymongo_checkout_session_id
                    );

                if ($response->successful()) {
                    $session = $response->json('data');
                    $payments = $session['attributes']['payments'] ?? [];

                    foreach ($payments as $payment) {
                        if (($payment['attributes']['status'] ?? null) !== 'paid') {
                            continue;
                        }

                        $order->update([
                            'payment_status' => 'paid',
                            'order_status' => 'processing',
                            'paymongo_payment_id' => $payment['id'] ?? null,
                            'paid_at' => now(),
                        ]);

                        try {
                            $inventory->deductForOrder($order);
                        } catch (\Throwable $exception) {
                            report($exception);
                        }

                        $isInstallationCheckout = PendingInquiryCheckout::query()
                            ->where('order_id', $order->id)
                            ->exists();

                        CustomerNotification::create([
                            'user_id' => $request->user()->id,
                            'type' => 'payment_paid',
                            'title' => 'Payment successful',
                            'message' => 'Payment for order ' . $order->order_number . ' was successful.',
                            'action_url' => route('purchases.show', $order),
                            'related_type' => Order::class,
                            'related_id' => $order->id,
                        ]);

                        $buyNowOrderIds = array_map(
                            'intval',
                            (array) $request->session()->get('buy_now_order_ids', [])
                        );
                        $isBuyNowOrder = in_array((int) $order->id, $buyNowOrderIds, true);

                        if (!$isInstallationCheckout && !$isBuyNowOrder) {
                            $request->user()->cart?->items()->delete();
                        }

                        break;
                    }
                }
            } catch (\Throwable $exception) {
                report($exception);
            }
        }

        $order->refresh();

        if ($order->payment_status === 'paid') {
            $buyNowOrderIds = array_map(
                'intval',
                (array) $request->session()->get('buy_now_order_ids', [])
            );
            $buyNowOrderIds = array_values(array_filter(
                $buyNowOrderIds,
                fn ($id) => $id !== (int) $order->id
            ));

            if ($buyNowOrderIds) {
                $request->session()->put('buy_now_order_ids', $buyNowOrderIds);
            } else {
                $request->session()->forget('buy_now_order_ids');
            }
        }

        // Finalize any linked service inquiry idempotently after PayMongo confirms payment.
        if ($order->payment_status === 'paid') {
            $inquiry = $this->completePaidInstallationInquiry($request, $order);

            if ($inquiry) {
                $serviceType = strtolower($inquiry->service_type);
                $isInstallation = $inquiry->service_type === 'Installation';

                return redirect()->route('inquiries.show', $inquiry)
                    ->with('success', 'Payment confirmed. Your ' . $serviceType . ' service request ' . $inquiry->inquiry_number . ' has been submitted for review.')
                    ->with('serviceNotification', [
                        'title' => $isInstallation ? 'Installation service booked' : 'Service booking fee paid',
                        'message' => 'Payment is confirmed and service request ' . $inquiry->inquiry_number . ' is awaiting review.',
                        'action_url' => route('inquiries.show', $inquiry),
                    ]);
            }
        }

        return redirect()->route('purchases.show', $order);
    }

    private function completePaidInstallationInquiry(Request $request, Order $order): ?Inquiry
    {
        if (!$request->user() || (int) $order->user_id !== (int) $request->user()->id) {
            return null;
        }

        return app(\App\Services\PendingInquiryCheckoutService::class)
            ->completePaidOrder($order);
    }

    public function paymentCancel(Request $request, Order $order)
    {
        if ($order->user_id !== $request->user()->id) {
            abort(404);
        }

        // Keep the pending checkout so the customer can retry payment from order details.
        // No Installation inquiry is created unless the gateway later confirms payment.
        return redirect()->route('purchases.show', $order)->with([
            'paymentCancelled' => true,
        ]);
    }
}
