<?php

namespace App\Http\Controllers;

use App\Models\CustomerNotification;
use App\Models\Order;
use App\Models\PendingInquiryCheckout;
use App\Services\InventoryService;
use App\Services\OrderCancellationService;
use App\Services\PendingInquiryCheckoutService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Str;
use Inertia\Inertia;

class PurchaseController extends Controller
{
    public function index(Request $request)
    {
        $orders = $request->user()
            ->orders()
            ->with(['items.purchasable'])
            ->latest()
            ->get()
            ->map(function (Order $order) {
                return [
                    'id' => $order->id,
                    'order_number' => $order->order_number,
                    'subtotal' => (float) $order->subtotal,
                    'installation_fee' => (float) $order->installation_fee,
                    'service_priority_fee' => (float) $order->service_priority_fee,
                    'shipping_fee' => (float) $order->shipping_fee,
                    'total' => (float) $order->total,
                    'payment_method' => $order->payment_method,
                    'payment_status' => $order->payment_status,
                    'order_status' => $order->order_status,
                    'cancellation_reason' => $order->cancellation_reason,
                    'can_cancel' => $this->canCancel($order),
                    'created_at' => $order->created_at?->format('M d, Y h:i A'),
                    'items' => $order->items->map(function ($item) {
                        return [
                            'id' => $item->id,
                            'name' => $item->name,
                            'warranty_period' => $item->warranty_period,
                            'price' => (float) $item->price,
                            'quantity' => (int) $item->quantity,
                            'subtotal' => (float) $item->subtotal,
                            'type' => $item->purchasable_type === \App\Models\Package::class
                                ? 'package'
                                : 'product',
                            'purchasable_id' => (int) $item->purchasable_id,
                            'can_review' => $item->purchasable !== null,
                            'image' => $item->purchasable?->image,
                        ];
                    })->values(),
                ];
            })->values();

        return Inertia::render('purchases', [
            'orders' => $orders,
        ]);
    }

    public function show(Request $request, Order $order)
    {
        if ($order->user_id !== $request->user()->id) {
            abort(404);
        }

        $order->load(['items.purchasable', 'events.actor']);

        return Inertia::render('purchase_details', [
            'order' => [
                'id' => $order->id,
                'order_number' => $order->order_number,
                'subtotal' => (float) $order->subtotal,
                'installation_fee' => (float) $order->installation_fee,
                'service_priority_fee' => (float) $order->service_priority_fee,
                'shipping_fee' => (float) $order->shipping_fee,
                'total' => (float) $order->total,
                'payment_method' => $order->payment_method,
                'payment_status' => $order->payment_status,
                'order_status' => $order->order_status,
                'cancellation_reason' => $order->cancellation_reason,
                'timeline' => $order->events->map(fn ($event) => [
                    'id' => $event->id,
                    'event_key' => $event->event_key,
                    'title' => $event->title,
                    'description' => $event->description,
                    'payment_status_before' => $event->payment_status_before,
                    'payment_status_after' => $event->payment_status_after,
                    'order_status_before' => $event->order_status_before,
                    'order_status_after' => $event->order_status_after,
                    'actor_label' => $event->actor?->role === 'admin'
                        ? 'SecureView'
                        : ($event->actor?->name ?? 'SecureView system'),
                    'created_at' => $event->created_at?->format('M d, Y h:i A'),
                ])->values(),
                'can_cancel' => $this->canCancel($order),
                'customer_name' => $order->customer_name,
                'customer_phone' => $order->customer_phone,
                'customer_email' => $order->customer_email,
                'delivery_address' => $order->delivery_address,
                'delivery_address_details' => $order->delivery_address_details,
                'delivery_city' => $order->delivery_city,
                'delivery_latitude' => $order->delivery_latitude,
                'delivery_longitude' => $order->delivery_longitude,
                'notes' => $order->notes,
                'created_at' => $order->created_at?->format('M d, Y h:i A'),
                'items' => $order->items->map(function ($item) {
                    return [
                        'id' => $item->id,
                        'name' => $item->name,
                        'warranty_period' => $item->warranty_period,
                        'price' => (float) $item->price,
                        'quantity' => (int) $item->quantity,
                        'subtotal' => (float) $item->subtotal,
                        'type' => $item->purchasable_type === \App\Models\Package::class
                            ? 'package'
                            : 'product',
                        'purchasable_id' => (int) $item->purchasable_id,
                        'can_review' => $item->purchasable !== null,
                        'image' => $item->purchasable?->image,
                    ];
                })->values(),
            ],
        ]);
    }

    public function cancel(
        Request $request,
        Order $order,
        OrderCancellationService $cancellation,
        InventoryService $inventory
    ) {
        if ((int) $order->user_id !== (int) $request->user()->id) {
            abort(404);
        }

        $validated = $request->validate([
            'reason' => ['nullable', 'string', 'min:5', 'max:500'],
        ]);
        $reason = trim((string) ($validated['reason'] ?? '')) ?: 'Cancelled by customer.';

        $cancellation->cancel($order, $inventory, $reason);

        return back()->with('success', 'Order ' . $order->order_number . ' was cancelled.');
    }

    private function canCancel(Order $order): bool
    {
        return $order->payment_status !== 'paid'
            && $order->paid_at === null
            && in_array($order->payment_status, ['pending', 'failed'], true)
            && in_array($order->order_status, ['pending', 'awaiting_payment', 'payment_failed'], true);
    }

    public function pay(Request $request, Order $order, InventoryService $inventory)
    {
        if ($order->user_id !== $request->user()->id) {
            abort(404);
        }

        if ($order->payment_method === 'cash') {
            return back()->withErrors([
                'payment' => 'This order uses Cash and does not require online payment.',
            ]);
        }

        if (!in_array($order->payment_status, ['pending', 'failed'], true)) {
            return back()->withErrors([
                'payment' => 'This order is no longer waiting for payment.',
            ]);
        }

        if (!in_array($order->order_status, ['awaiting_payment', 'payment_failed'], true)) {
            return back()->withErrors([
                'payment' => 'This order is no longer available for payment.',
            ]);
        }

        $stockError = null;

        foreach ($order->items()->get() as $orderItem) {
            $purchasable = $orderItem->purchasable;

            if (!$purchasable) {
                $stockError = 'An item in this order is no longer available.';
                break;
            }

            $stockError = $inventory->getAvailabilityError(
                $purchasable,
                (int) $orderItem->quantity
            );

            if ($stockError) {
                break;
            }
        }

        if ($stockError) {
            return back()->withErrors([
                'stock' => $stockError,
            ]);
        }

        $secretKey = config('services.paymongo.secret_key');

        if (!$secretKey) {
            return back()->withErrors([
                'payment' => 'Online payments are not configured yet.',
            ]);
        }

        try {
            $paymentMethod = match ($order->payment_method) {
                'gcash' => 'gcash',
                'card' => 'card',
                'maya' => 'paymaya',
                default => null,
            };

            if (!$paymentMethod) {
                return back()->withErrors([
                    'payment' => 'This payment method is not supported for online payment.',
                ]);
            }

            $baseUrl = rtrim(config('services.paymongo.base_url'), '/');

            if ($order->paymongo_checkout_session_id) {
                $existingResponse = Http::withBasicAuth($secretKey, '')
                    ->acceptJson()
                    ->get(
                        $baseUrl .
                        '/v1/checkout_sessions/' .
                        $order->paymongo_checkout_session_id
                    );

                if ($existingResponse->successful()) {
                    $existingSession = $existingResponse->json('data');
                    $existingAttributes = is_array($existingSession)
                        ? ($existingSession['attributes'] ?? [])
                        : [];
                    $existingStatus = $existingAttributes['status'] ?? null;
                    $existingCheckoutUrl = $existingAttributes['checkout_url'] ?? null;
                    $paidPayment = null;

                    foreach (($existingAttributes['payments'] ?? []) as $existingPayment) {
                        if (($existingPayment['attributes']['status'] ?? null) === 'paid') {
                            $paidPayment = $existingPayment;
                            break;
                        }
                    }

                    // A checkout revisit must reconcile an already-paid session before
                    // considering a new session. Otherwise a late webhook could make a
                    // second checkout available for the same priority surcharge.
                    if ($paidPayment !== null) {
                        $order->update([
                            'payment_status' => 'paid',
                            'order_status' => 'processing',
                            'paymongo_payment_id' => $paidPayment['id'] ?? null,
                            'paid_at' => $order->paid_at ?? now(),
                        ]);

                        try {
                            $inventory->deductForOrder($order);
                        } catch (\Throwable $exception) {
                            report($exception);
                        }

                        CustomerNotification::create([
                            'user_id' => $order->user_id,
                            'type' => 'payment_paid',
                            'title' => 'Payment successful',
                            'message' => 'Payment for order ' . $order->order_number . ' was successful.',
                            'action_url' => route('purchases.show', $order),
                            'related_type' => Order::class,
                            'related_id' => $order->id,
                        ]);

                        if (PendingInquiryCheckout::query()->where('order_id', $order->id)->exists()) {
                            $inquiry = app(PendingInquiryCheckoutService::class)->completePaidOrder($order);
                            if ($inquiry) {
                                return redirect()->route('inquiries.show', $inquiry)->with(
                                    'success',
                                    'Payment confirmed. Your ' . strtolower($inquiry->service_type) . ' service request ' . $inquiry->inquiry_number . ' is awaiting review.'
                                );
                            }
                        }

                        return redirect()->route('purchases.show', $order)
                            ->with('success', 'Payment confirmed for order ' . $order->order_number . '.');
                    }

                    if ($existingStatus === 'active' && $existingCheckoutUrl) {
                        return Inertia::location($existingCheckoutUrl);
                    }
                }
            }

            $order->load('items');

            $lineItems = $order->items->map(function ($item) {
                return [
                    'name' => $item->name,
                    'amount' => (int) round($item->price * 100),
                    'currency' => 'PHP',
                    'quantity' => (int) $item->quantity,
                ];
            })->values()->all();

            if ((float) $order->installation_fee > 0) {
                $lineItems[] = [
                    'name' => 'Installation fee',
                    'amount' => (int) round((float) $order->installation_fee * 100),
                    'currency' => 'PHP',
                    'quantity' => 1,
                ];
            }

            if ((float) $order->service_priority_fee > 0) {
                $lineItems[] = [
                    'name' => 'Service booking priority fee',
                    'amount' => (int) round((float) $order->service_priority_fee * 100),
                    'currency' => 'PHP',
                    'quantity' => 1,
                ];
            }

            $response = Http::withBasicAuth($secretKey, '')
                ->acceptJson()
                ->asJson()
                ->withHeaders([
                    'Idempotency-Key' => 'secureview-retry-' . $order->id . '-' . Str::lower(Str::random(12)),
                ])
                ->post(
                    $baseUrl . '/v2/checkout_sessions',
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
                return back()->withErrors([
                    'payment' => 'Unable to start the payment. Please try again.',
                ]);
            }

            $session = $response->json('data');
            $checkoutSessionId = $session['id'] ?? null;
            $checkoutUrl = $session['attributes']['checkout_url'] ?? null;

            if (!$checkoutSessionId || !$checkoutUrl) {
                return back()->withErrors([
                    'payment' => 'PayMongo returned an invalid payment session.',
                ]);
            }

            $order->update([
                'paymongo_checkout_session_id' => $checkoutSessionId,
                'payment_status' => 'pending',
                'order_status' => 'awaiting_payment',
            ]);

            return Inertia::location($checkoutUrl);
        } catch (\Throwable $exception) {
            report($exception);

            return back()->withErrors([
                'payment' => 'Unable to connect to the payment gateway. Please try again.',
            ]);
        }
    }
}
