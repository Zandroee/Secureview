<?php

namespace App\Observers;

use App\Models\Order;
use App\Models\OrderEvent;
use App\Services\OrderNotificationService;
use Illuminate\Support\Facades\Auth;

class OrderObserver
{
    public function __construct(private OrderNotificationService $orderNotifications)
    {
    }

    public function created(Order $order): void
    {
        $this->orderNotifications->notifyNewOrderPlaced($order);

        $method = $this->paymentMethodLabel($order->payment_method);

        $this->record(
            $order,
            'order_created',
            'Order placed',
            "Order was placed using {$method}.",
            null,
            $order->payment_status,
            null,
            $order->order_status,
            ['payment_method' => $order->payment_method]
        );
    }

    public function updated(Order $order): void
    {
        $changes = $order->getChanges();

        $previousPaymentStatus = $order->getRawOriginal('payment_status');
        $currentPaymentStatus = $order->payment_status;
        $previousOrderStatus = $order->getRawOriginal('order_status');
        $currentOrderStatus = $order->order_status;

        if (
            array_key_exists('payment_status', $changes) &&
            $previousPaymentStatus !== $currentPaymentStatus
        ) {
            $title = match ($currentPaymentStatus) {
                'paid' => 'Payment confirmed',
                'failed' => 'Payment failed',
                default => 'Payment status changed',
            };

            $description = sprintf(
                'Payment status changed from %s to %s.',
                $this->statusLabel($previousPaymentStatus),
                $this->statusLabel($currentPaymentStatus)
            );

            $metadata = [];

            if (!empty($changes['paymongo_payment_id'])) {
                $metadata['payment_reference'] = $changes['paymongo_payment_id'];
            }

            $this->record(
                $order,
                'payment_status_changed',
                $title,
                $description,
                $previousPaymentStatus,
                $currentPaymentStatus,
                $previousOrderStatus,
                $currentOrderStatus,
                $metadata
            );
        }

        if (
            array_key_exists('order_status', $changes) &&
            $previousOrderStatus !== $currentOrderStatus
        ) {
            $isCancelled = $currentOrderStatus === 'cancelled';
            $title = $isCancelled
                ? 'Order cancelled'
                : 'Order status changed to ' . $this->statusLabel($currentOrderStatus);

            $description = $isCancelled
                ? (trim((string) $order->cancellation_reason) ?: 'Order was cancelled.')
                : sprintf(
                    'Order status changed from %s to %s.',
                    $this->statusLabel($previousOrderStatus),
                    $this->statusLabel($currentOrderStatus)
                );

            $this->record(
                $order,
                $isCancelled ? 'order_cancelled' : 'order_status_changed',
                $title,
                $description,
                $previousPaymentStatus,
                $currentPaymentStatus,
                $previousOrderStatus,
                $currentOrderStatus,
                $isCancelled && $order->cancellation_reason
                    ? ['cancellation_reason' => $order->cancellation_reason]
                    : []
            );
        }

        if (
            array_key_exists('paymongo_checkout_session_id', $changes) &&
            filled($order->paymongo_checkout_session_id) &&
            $order->paymongo_checkout_session_id !== $order->getRawOriginal('paymongo_checkout_session_id')
        ) {
            $isRetry = filled($order->getRawOriginal('paymongo_checkout_session_id'));

            $this->record(
                $order,
                $isRetry ? 'payment_retry_started' : 'checkout_session_created',
                $isRetry ? 'Payment retry started' : 'Checkout session created',
                $isRetry
                    ? 'A new PayMongo checkout session was created for another payment attempt.'
                    : 'A PayMongo checkout session was created for this order.',
                $previousPaymentStatus,
                $currentPaymentStatus,
                $previousOrderStatus,
                $currentOrderStatus,
                [
                    'checkout_session_id' => $order->paymongo_checkout_session_id,
                    'previous_checkout_session_id' => $order->getRawOriginal('paymongo_checkout_session_id'),
                ]
            );
        }
    }

    private function record(
        Order $order,
        string $eventKey,
        string $title,
        ?string $description,
        ?string $paymentStatusBefore,
        ?string $paymentStatusAfter,
        ?string $orderStatusBefore,
        ?string $orderStatusAfter,
        array $metadata = []
    ): void {
        OrderEvent::create([
            'order_id' => $order->id,
            'actor_user_id' => Auth::id(),
            'event_key' => $eventKey,
            'title' => $title,
            'description' => $description,
            'payment_status_before' => $paymentStatusBefore,
            'payment_status_after' => $paymentStatusAfter,
            'order_status_before' => $orderStatusBefore,
            'order_status_after' => $orderStatusAfter,
            'metadata' => $metadata ?: null,
        ]);
    }

    private function statusLabel(?string $status): string
    {
        return $status ? ucfirst(str_replace('_', ' ', $status)) : 'not set';
    }

    private function paymentMethodLabel(?string $method): string
    {
        return match ($method) {
            'gcash' => 'GCash',
            'card' => 'Card',
            'maya' => 'Maya',
            'cash' => 'Cash',
            default => 'the selected payment method',
        };
    }
}
