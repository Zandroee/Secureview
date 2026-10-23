<?php

namespace App\Services;

use App\Models\Order;
use App\Models\PendingInquiryCheckout;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Illuminate\Validation\ValidationException;

class OrderCancellationService
{
    private const CANCELLABLE_STATUSES = [
        'pending',
        'awaiting_payment',
        'payment_failed',
    ];

    public function cancel(Order $order, InventoryService $inventory, string $reason): void
    {
        $order->refresh();
        $this->ensureCancellable($order);

        if ($order->paymongo_checkout_session_id) {
            $this->expireOnlineCheckout($order, $inventory);
        }

        DB::transaction(function () use ($order, $inventory, $reason) {
            $lockedOrder = Order::query()
                ->lockForUpdate()
                ->findOrFail($order->id);

            $this->ensureCancellable($lockedOrder);

            $lockedOrder->update([
                'order_status' => 'cancelled',
                'payment_status' => 'cancelled',
                'cancellation_reason' => $reason,
            ]);

            PendingInquiryCheckout::query()
                ->where('order_id', $lockedOrder->id)
                ->where('status', 'pending_payment')
                ->update(['status' => 'cancelled']);

            if ($lockedOrder->pendingInquiryCheckout?->inquiry) {
                $lockedOrder->pendingInquiryCheckout->inquiry->update(['status' => 'cancelled']);
            }

            if ($lockedOrder->stock_deducted_at) {
                $inventory->restoreForCancelledOrder($lockedOrder);
            }
        });
    }

    private function ensureCancellable(Order $order): void
    {
        if ($order->payment_status === 'paid' || $order->paid_at !== null) {
            throw ValidationException::withMessages([
                'order' => 'This order has already been paid. It cannot be cancelled here because refunds are not yet supported.',
            ]);
        }

        if (!in_array($order->order_status, self::CANCELLABLE_STATUSES, true)) {
            throw ValidationException::withMessages([
                'order' => 'Only unpaid orders that are pending, awaiting payment, or payment failed can be cancelled.',
            ]);
        }

        if (!in_array($order->payment_status, ['pending', 'failed'], true)) {
            throw ValidationException::withMessages([
                'order' => 'Only unpaid orders can be cancelled.',
            ]);
        }
    }

    private function expireOnlineCheckout(Order $order, InventoryService $inventory): void
    {
        $secretKey = config('services.paymongo.secret_key');

        if (!$secretKey) {
            throw ValidationException::withMessages([
                'order' => 'The PayMongo secret key is not configured, so SecureView cannot safely expire this checkout session yet.',
            ]);
        }

        $baseUrl = rtrim(config('services.paymongo.base_url'), '/');
        $sessionUrl = $baseUrl . '/v1/checkout_sessions/' . $order->paymongo_checkout_session_id;

        try {
            $expireResponse = Http::withBasicAuth($secretKey, '')
                ->acceptJson()
                ->post($sessionUrl . '/expire');

            if ($expireResponse->successful()) {
                return;
            }

            // An already-expired session can still be cancelled locally. Retrieve
            // the session to distinguish that from a paid or still-active checkout.
            $sessionResponse = Http::withBasicAuth($secretKey, '')
                ->acceptJson()
                ->get($sessionUrl);

            if (!$sessionResponse->successful()) {
                throw ValidationException::withMessages([
                    'order' => 'SecureView could not verify the PayMongo checkout. The order was not cancelled; please try again.',
                ]);
            }

            $session = $sessionResponse->json('data');
            $attributes = $session['attributes'] ?? [];
            $payments = $attributes['payments'] ?? [];
            $paidPayment = collect($payments)->first(
                fn (array $payment) => data_get($payment, 'attributes.status') === 'paid'
            );

            if ($paidPayment) {
                $order->update([
                    'payment_status' => 'paid',
                    'order_status' => 'processing',
                    'paymongo_payment_id' => $paidPayment['id'] ?? null,
                    'paid_at' => $order->paid_at ?? now(),
                ]);

                $order->refresh();

                try {
                    $inventory->deductForOrder($order);
                } catch (\Throwable $exception) {
                    report($exception);
                }

                if (PendingInquiryCheckout::query()->where('order_id', $order->id)->exists()) {
                    app(PendingInquiryCheckoutService::class)->completePaidOrder($order);
                }

                throw ValidationException::withMessages([
                    'order' => 'PayMongo confirms this order was paid. Its status has been restored to Processing instead of cancelling a paid order.',
                ]);
            }

            if (($attributes['status'] ?? null) === 'expired') {
                return;
            }

            throw ValidationException::withMessages([
                'order' => 'PayMongo could not expire this checkout because payment may still be in progress. The order was not cancelled; wait for the payment result and try again.',
            ]);
        } catch (ValidationException $exception) {
            throw $exception;
        } catch (\Throwable $exception) {
            report($exception);

            throw ValidationException::withMessages([
                'order' => 'SecureView could not safely expire the PayMongo checkout. The order was not cancelled; please try again.',
            ]);
        }
    }
}
