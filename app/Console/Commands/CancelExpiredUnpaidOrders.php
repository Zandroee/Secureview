<?php

namespace App\Console\Commands;

use App\Models\CustomerNotification;
use App\Models\Order;
use App\Services\InventoryService;
use App\Services\OrderCancellationService;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Log;
use Throwable;

class CancelExpiredUnpaidOrders extends Command
{
    protected $signature = 'secureview:cancel-expired-unpaid-orders {--days=14 : Number of days allowed to complete payment}';

    protected $description = 'Cancel unpaid orders after the configured payment deadline';

    public function handle(OrderCancellationService $cancellation, InventoryService $inventory): int
    {
        $days = max(1, min(90, (int) $this->option('days')));
        $deadline = now()->subDays($days);
        $cancelled = 0;
        $skipped = 0;

        Order::query()
            ->whereNull('paid_at')
            ->whereIn('payment_status', ['pending', 'failed'])
            ->whereIn('order_status', ['pending', 'awaiting_payment', 'payment_failed'])
            ->where('created_at', '<=', $deadline)
            ->orderBy('id')
            ->chunkById(100, function ($orders) use ($cancellation, $inventory, &$cancelled, &$skipped, $days) {
                foreach ($orders as $order) {
                    try {
                        $cancellation->cancel(
                            $order,
                            $inventory,
                            "Automatically cancelled after {$days} days without payment."
                        );

                        $order->refresh();
                        if ($order->order_status !== 'cancelled' || $order->payment_status === 'paid') {
                            $skipped++;
                            continue;
                        }

                        CustomerNotification::firstOrCreate(
                            [
                                'user_id' => $order->user_id,
                                'dedupe_key' => 'order-payment-expired:' . $order->id,
                            ],
                            [
                                'type' => 'order_cancelled',
                                'title' => 'Unpaid order cancelled',
                                'message' => "Order {$order->order_number} was automatically cancelled because payment was not completed within {$days} days.",
                                'action_url' => route('purchases.show', $order),
                                'related_type' => Order::class,
                                'related_id' => $order->id,
                            ]
                        );

                        $cancelled++;
                    } catch (Throwable $exception) {
                        $skipped++;
                        Log::warning('SecureView could not automatically cancel an expired unpaid order.', [
                            'order_id' => $order->id,
                            'order_number' => $order->order_number,
                            'error' => $exception->getMessage(),
                        ]);
                    }
                }
            });

        $this->info("Payment expiry check complete. Cancelled: {$cancelled}; skipped for safe review: {$skipped}; deadline: {$days} days.");

        return self::SUCCESS;
    }
}
