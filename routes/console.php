<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;
use App\Models\CustomerNotification;
use App\Models\Order;
use App\Services\InventoryService;
use App\Services\OrderCancellationService;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

Schedule::command('secureview:send-upcoming-job-reminders')
    ->everyFifteenMinutes()
    ->name('send-upcoming-job-reminders')
    ->withoutOverlapping();
Schedule::call(fn () => \App\Models\Inquiry::escalateOverdueUrgency())
    ->name('escalate-overdue-inquiry-urgency')
    ->dailyAt('00:01')
    ->withoutOverlapping();

Artisan::command('secureview:cancel-expired-unpaid-orders', function (
    OrderCancellationService $cancellation,
    InventoryService $inventory
) {
    $hours = max(1, (int) config('services.secureview.unpaid_order_expiry_hours', 48));
    $cutoff = now()->subHours($hours);
    $cancelled = 0;
    $deferred = 0;

    Order::query()
        ->whereNull('paid_at')
        ->whereIn('payment_status', ['pending', 'failed'])
        ->whereIn('order_status', ['pending', 'awaiting_payment', 'payment_failed'])
        ->where('created_at', '<=', $cutoff)
        ->orderBy('id')
        ->chunkById(100, function ($orders) use ($cancellation, $inventory, $hours, &$cancelled, &$deferred) {
            foreach ($orders as $order) {
                $previousStatus = $order->order_status;
                $previousPaymentStatus = $order->payment_status;
                $reason = "Automatically cancelled after {$hours} hours without confirmed payment.";

                try {
                    $cancellation->cancel($order, $inventory, $reason);
                    $order->refresh();

                    if ($order->order_status !== 'cancelled') {
                        continue;
                    }

                    CustomerNotification::firstOrCreate(
                        ['dedupe_key' => 'unpaid-order-expired:' . $order->id . ':' . $order->user_id],
                        [
                            'user_id' => $order->user_id,
                            'type' => 'order_cancelled',
                            'title' => 'Unpaid order automatically cancelled',
                            'message' => "Order {$order->order_number} was automatically cancelled after {$hours} hours without confirmed payment.",
                            'action_url' => route('purchases.show', $order),
                            'related_type' => Order::class,
                            'related_id' => $order->id,
                        ]
                    );

                    $order->events()->create([
                        'actor_user_id' => null,
                        'event_key' => 'unpaid_order_auto_cancelled',
                        'title' => 'Unpaid order automatically cancelled',
                        'description' => $reason,
                        'payment_status_before' => $previousPaymentStatus,
                        'payment_status_after' => $order->payment_status,
                        'order_status_before' => $previousStatus,
                        'order_status_after' => $order->order_status,
                        'metadata' => ['expiry_hours' => $hours],
                    ]);

                    $cancelled++;
                } catch (\Throwable $exception) {
                    // Payment providers may still be processing the checkout. Leave the
                    // order untouched and retry on the next scheduled run.
                    report($exception);
                    logger()->warning('SecureView deferred expiry of unpaid order.', [
                        'order_id' => $order->id,
                        'order_number' => $order->order_number,
                    ]);
                    $deferred++;
                }
            }
        });

    $this->info("Expired unpaid orders: {$cancelled} cancelled; {$deferred} deferred. Deadline: {$hours} hours.");
})->purpose('Automatically cancel unpaid orders 48 hours after placement if payment is still unconfirmed');

Schedule::command('secureview:cancel-expired-unpaid-orders')
    ->hourly()
    ->name('cancel-expired-unpaid-orders')
    ->withoutOverlapping();

