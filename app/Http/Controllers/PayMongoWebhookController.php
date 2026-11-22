<?php

namespace App\Http\Controllers;

use App\Models\CustomerNotification;
use App\Models\Order;
use App\Models\PendingInquiryCheckout;
use App\Services\PendingInquiryCheckoutService;
use App\Services\InventoryService;
use App\Services\RefundService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class PayMongoWebhookController extends Controller
{
    public function handle(Request $request, InventoryService $inventory, RefundService $refunds)
    {
        $rawBody = $request->getContent();
        $signatureHeader = $request->header('Paymongo-Signature');
        $webhookSecret = config('services.paymongo.webhook_secret');

        if (!$webhookSecret || !$signatureHeader) {
            return response()->json([
                'message' => 'Webhook signature is not configured.',
            ], 401);
        }

        $parts = [];

        foreach (explode(',', $signatureHeader) as $part) {
            [$key, $value] = array_pad(explode('=', $part, 2), 2, null);
            $parts[$key] = $value;
        }

        $timestamp = $parts['t'] ?? null;
        $testSignature = $parts['te'] ?? null;
        $liveSignature = $parts['li'] ?? null;

        if (!$timestamp) {
            return response()->json([
                'message' => 'Invalid webhook signature.',
            ], 401);
        }

        if (abs(time() - (int) $timestamp) > 300) {
            return response()->json([
                'message' => 'Webhook signature has expired.',
            ], 401);
        }

        $signedPayload = $timestamp . '.' . $rawBody;

        $expectedSignature = hash_hmac(
            'sha256',
            $signedPayload,
            $webhookSecret
        );

        $signatureMatches =
            ($testSignature && hash_equals($expectedSignature, $testSignature)) ||
            ($liveSignature && hash_equals($expectedSignature, $liveSignature));

        if (!$signatureMatches) {
            return response()->json([
                'message' => 'Invalid webhook signature.',
            ], 401);
        }

        $payload = json_decode($rawBody, true);

        if (!is_array($payload)) {
            return response()->json([
                'message' => 'Invalid webhook payload.',
            ], 400);
        }

        // PayMongo's current event envelope stores the event type and resource
        // inside data.attributes. Retain support for the older envelope during
        // transition, but prioritize the documented current payload format.
        $eventEnvelope = $payload['data']['attributes'] ?? null;

        if (is_array($eventEnvelope)) {
            $event = $eventEnvelope['type'] ?? null;
            $session = $eventEnvelope['data'] ?? [];
        } else {
            $event = $payload['data']['type'] ?? null;
            $session = $payload['data']['data'] ?? [];
        }

        if (in_array($event, ['payment.refund.updated', 'payment.refunded'], true)) {
            $refundResource = is_array($session) ? $session : [];
            $refundResourceId = $refundResource['id'] ?? null;
            $refundAttributes = $refundResource['attributes'] ?? [];

            if ($refundResourceId && is_array($refundAttributes)) {
                $matchedRefund = $refunds->syncProviderStatus((string) $refundResourceId, $refundAttributes);

                // The create-refund API response can save the provider ID
                // between the initial lookup and this status check. Re-read it
                // once to close that narrow webhook/API race.
                if (!$matchedRefund && $refunds->hasProviderRefundId((string) $refundResourceId)) {
                    $matchedRefund = $refunds->syncProviderStatus((string) $refundResourceId, $refundAttributes);
                }

                $paymentId = (string) ($refundAttributes['payment_id'] ?? '');

                // A newly-created refund can emit its webhook before the create
                // API response has saved the provider refund ID locally. Ask
                // PayMongo to retry only when a matching submission is in flight.
                if (!$matchedRefund && $refunds->hasProviderRefundId((string) $refundResourceId)) {
                    // The refund ID is known locally, but its payment/amount
                    // did not match. Reject this event rather than silently
                    // acknowledging a financial mismatch.
                    return response()->json([
                        'message' => 'Refund resource does not match its linked SecureView payment.',
                    ], 409);
                }

                if (
                    !$matchedRefund &&
                    $paymentId !== '' &&
                    $refunds->hasUnlinkedSubmittedRefundForPayment($paymentId)
                ) {
                    return response()->json([
                        'message' => 'Refund mapping is not available yet. Retry this webhook shortly.',
                    ], 503);
                }
            }

            return response()->json(['received' => true]);
        }

        if ($event !== 'checkout_session.payment.paid') {
            return response()->json([
                'received' => true,
            ]);
        }

        if (!is_array($session)) {
            $session = [];
        }

        $sessionId = $session['id'] ?? null;
        $attributes = $session['attributes'] ?? [];
        if (!is_array($attributes)) {
            $attributes = [];
        }

        $referenceNumber = $attributes['reference_number'] ?? null;

        $order = null;

        if ($referenceNumber) {
            $order = Order::where('order_number', $referenceNumber)->first();
        }

        if (!$order && $sessionId) {
            $order = Order::where(
                'paymongo_checkout_session_id',
                $sessionId
            )->first();
        }

        if (!$order) {
            return response()->json([
                'received' => true,
            ]);
        }

        if ($order->order_status === 'cancelled') {
            // Cancellation expires any open checkout session before it is saved
            // locally. Never let a late duplicate webhook reopen a cancelled order.
            return response()->json([
                'received' => true,
            ]);
        }

        if (in_array($order->payment_status, ['paid', 'partially_refunded', 'refunded'], true)) {
            // A delayed duplicate checkout-paid event must never overwrite a
            // later refund state and turn a partially/full-refunded order paid.
            return $this->finalizePaidOrder($order, $inventory, false)
                ?? response()->json(['received' => true]);
        }

        $paymentId = data_get($attributes, 'payments.0.id');

        // Serialize the payment transition. Only the request that first moves
        // this order to paid may clear the existing cart; concurrent duplicate
        // deliveries must not erase items added after that first request.
        $transition = DB::transaction(function () use ($order, $paymentId) {
            $lockedOrder = Order::query()
                ->lockForUpdate()
                ->findOrFail($order->id);

            if ($lockedOrder->order_status === 'cancelled') {
                return [
                    'order' => $lockedOrder,
                    'cancelled' => true,
                    'clear_cart' => false,
                ];
            }

            if (in_array($lockedOrder->payment_status, ['paid', 'partially_refunded', 'refunded'], true)) {
                return [
                    'order' => $lockedOrder,
                    'cancelled' => false,
                    'clear_cart' => false,
                ];
            }

            $lockedOrder->update([
                'payment_status' => 'paid',
                'order_status' => 'processing',
                'paymongo_payment_id' => $paymentId,
                'paid_at' => now(),
            ]);

            return [
                'order' => $lockedOrder->fresh(),
                'cancelled' => false,
                'clear_cart' => true,
            ];
        });

        if ($transition['cancelled']) {
            return response()->json(['received' => true]);
        }

        return $this->finalizePaidOrder(
            $transition['order'],
            $inventory,
            $transition['clear_cart']
        ) ?? response()->json(['received' => true]);
    }

    /**
     * Finalize a payment in an idempotent way.
     *
     * Keep the confirmed payment state even if inventory is temporarily unable
     * to be deducted. Returning a non-2xx response lets PayMongo retry; repeated
     * deliveries safely retry inventory while the order's marker prevents a
     * second deduction after a successful attempt.
     */
    private function finalizePaidOrder(Order $order, InventoryService $inventory, bool $clearCart)
    {
        CustomerNotification::firstOrCreate(
            ['dedupe_key' => 'payment-paid:order:' . $order->id],
            [
                'user_id' => $order->user_id,
                'type' => 'payment_paid',
                'title' => 'Payment successful',
                'message' => 'Payment for order ' . $order->order_number . ' was successful.',
                'action_url' => route('purchases.show', $order),
                'related_type' => Order::class,
                'related_id' => $order->id,
            ]
        );

        $isInstallationCheckout = PendingInquiryCheckout::query()
            ->where('order_id', $order->id)
            ->exists();

        if ($isInstallationCheckout) {
            // Finalize the service request even if inventory reconciliation needs
            // another webhook delivery; the payment itself has been confirmed.
            app(PendingInquiryCheckoutService::class)->completePaidOrder($order);
        } elseif ($clearCart) {
            // Clear the cart only on the first transition to paid. A duplicate
            // webhook must not remove new items the customer added afterward.
            $order->user?->cart?->items()->delete();
        }

        try {
            // InventoryService locks the order and checks stock_deducted_at,
            // making this safe for repeated or concurrent webhook delivery.
            $inventory->deductForOrder($order);
        } catch (\Throwable $exception) {
            report($exception);

            return response()->json([
                'message' => 'Payment is confirmed, but inventory processing failed. The event can be retried.',
            ], 500);
        }

        return null;
    }
}
