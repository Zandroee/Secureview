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
Schedule::call(function () {
    \App\Models\Inquiry::escalateOverdueUrgency();

    $urgentServices = \App\Models\Inquiry::query()
        ->with('user')
        ->whereIn('urgency', ['urgent', 'emergency'])
        ->whereNotIn('status', ['completed', 'cancelled'])
        ->get();

    app(\App\Services\JobNotificationService::class)
        ->notifyUrgencyEscalations($urgentServices);
})
    ->name('escalate-overdue-inquiry-urgency')
    ->dailyAt('00:02')
    ->withoutOverlapping();

Artisan::command('secureview:cancel-expired-unpaid-orders', function (
    OrderCancellationService $cancellation,
    InventoryService $inventory
) {
    $days = max(1, (int) config('services.secureview.unpaid_order_expiry_days', 14));
    $cutoff = now()->subDays($days);
    $cancelled = 0;
    $deferred = 0;

    Order::query()
        ->whereNull('paid_at')
        ->whereIn('payment_status', ['pending', 'failed'])
        ->whereIn('order_status', ['pending', 'awaiting_payment', 'payment_failed'])
        ->where('created_at', '<=', $cutoff)
        ->orderBy('id')
        ->chunkById(100, function ($orders) use ($cancellation, $inventory, $days, &$cancelled, &$deferred) {
            foreach ($orders as $order) {
                $previousStatus = $order->order_status;
                $previousPaymentStatus = $order->payment_status;
                $reason = "Automatically cancelled after {$days} days without confirmed payment.";

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
                            'message' => "Order {$order->order_number} was automatically cancelled after {$days} days without confirmed payment.",
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
                        'metadata' => ['expiry_days' => $days],
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

    $this->info("Expired unpaid orders: {$cancelled} cancelled; {$deferred} deferred. Deadline: {$days} days.");
})->purpose('Automatically cancel orders that remain unpaid beyond the configured business deadline');

Schedule::command('secureview:cancel-expired-unpaid-orders')
    ->hourly()
    ->name('cancel-expired-unpaid-orders')
    ->withoutOverlapping();

