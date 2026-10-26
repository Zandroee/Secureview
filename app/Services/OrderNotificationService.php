<?php

namespace App\Services;

use App\Models\CustomerNotification;
use App\Models\Order;
use App\Models\User;

class OrderNotificationService
{
    /**
     * Notify administrators when a new order is created.
     * Technicians receive service assignment alerts rather than order/payment notifications.
     * The recipient-specific dedupe key prevents duplicate alerts for the same order.
     */
    public function notifyNewOrderPlaced(Order $order): int
    {
        $paymentMethod = $this->paymentMethodLabel($order->payment_method);
        $paymentStatus = $this->statusLabel($order->payment_status);
        $total = '₱' . number_format((float) $order->total, 2);
        $sent = 0;

        User::query()
            ->where('role', 'admin')
            ->get()
            ->each(function (User $recipient) use ($order, $paymentMethod, $paymentStatus, $total, &$sent) {
                $dedupeKey = 'new-order:' . $order->id . ':' . $recipient->id;

                $notification = CustomerNotification::firstOrCreate(
                    ['dedupe_key' => $dedupeKey],
                    [
                        'user_id' => $recipient->id,
                        'type' => 'new_order',
                        'title' => 'New order received',
                        'message' => "Order {$order->order_number} from {$order->customer_name} was placed. Total: {$total}. Payment method: {$paymentMethod}. Payment status: {$paymentStatus}.",
                        'action_url' => route('admin.purchases.index'),
                        'related_type' => Order::class,
                        'related_id' => $order->id,
                    ]
                );

                if ($notification->wasRecentlyCreated) {
                    $sent++;
                }
            });

        return $sent;
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

    private function statusLabel(?string $status): string
    {
        return $status ? ucfirst(str_replace('_', ' ', $status)) : 'not set';
    }
}
