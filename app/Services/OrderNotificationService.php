<?php

namespace App\Services;

use App\Models\CustomerNotification;
use App\Models\Order;
use App\Models\User;

class OrderNotificationService
{
    /**
     * Notify every administrator and technician when a new order is created.
     * The recipient-specific dedupe key prevents duplicate alerts for the same order.
     */
    public function notifyNewOrderPlaced(Order $order): int
    {
        $paymentMethod = $this->paymentMethodLabel($order->payment_method);
        $paymentStatus = $this->statusLabel($order->payment_status);
        $total = '₱' . number_format((float) $order->total, 2);
        $sent = 0;

        User::query()
            ->whereIn('role', ['admin', 'technician'])
            ->get()
            ->each(function (User $recipient) use ($order, $paymentMethod, $paymentStatus, $total, &$sent) {
                $isAdmin = $recipient->role === 'admin';
                $dedupeKey = 'new-order:' . $order->id . ':' . $recipient->id;

                $notification = CustomerNotification::firstOrCreate(
                    ['dedupe_key' => $dedupeKey],
                    [
                        'user_id' => $recipient->id,
                        'type' => 'new_order',
                        'title' => $isAdmin ? 'New order received' : 'New customer order placed',
                        'message' => $isAdmin
                            ? "Order {$order->order_number} from {$order->customer_name} was placed. Total: {$total}. Payment method: {$paymentMethod}. Payment status: {$paymentStatus}."
                            : "Order {$order->order_number} was placed. Total: {$total}. Payment method: {$paymentMethod}. Payment status: {$paymentStatus}.",
                        'action_url' => $isAdmin
                            ? route('admin.purchases.index')
                            : route('technician.dashboard'),
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
