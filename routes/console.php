<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Schedule;
use App\Mail\PendingPaymentReminderMail;
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


Artisan::command('secureview:send-unpaid-order-payment-reminders', function () {
    $expiryHours = max(1, (int) config('services.secureview.unpaid_order_expiry_hours', 48));

    if ($expiryHours < 2) {
        $this->warn('Payment reminders are skipped because the unpaid-order expiry window is less than two hours.');
        return;
    }

    $reminderHours = min(
        max(1, (int) config('services.secureview.unpaid_order_reminder_after_hours', 24)),
        $expiryHours - 1
    );
    $reminderCutoff = now()->subHours($reminderHours);
    $expiryCutoff = now()->subHours($expiryHours);
    $sent = 0;
    $skipped = 0;
    $failed = 0;

    Order::query()
        ->whereNull('paid_at')
        ->where('payment_status', 'pending')
        ->whereIn('order_status', ['pending', 'awaiting_payment'])
        ->where('created_at', '<=', $reminderCutoff)
        ->where('created_at', '>', $expiryCutoff)
        ->whereDoesntHave('events', fn ($query) => $query->where('event_key', 'unpaid_payment_reminder_sent'))
        ->orderBy('id')
        ->chunkById(100, function ($orders) use ($expiryHours, $reminderHours, $reminderCutoff, $expiryCutoff, &$sent, &$skipped, &$failed) {
            foreach ($orders as $candidate) {
                try {
                    $wasSent = DB::transaction(function () use ($candidate, $expiryHours, $reminderHours, $reminderCutoff, $expiryCutoff) {
                        $order = Order::query()
                            ->with('user')
                            ->whereKey($candidate->id)
                            ->lockForUpdate()
                            ->first();

                        if (
                            !$order ||
                            $order->paid_at !== null ||
                            $order->payment_status !== 'pending' ||
                            !in_array($order->order_status, ['pending', 'awaiting_payment'], true) ||
                            !$order->created_at ||
                            $order->created_at->gt($reminderCutoff) ||
                            $order->created_at->lte($expiryCutoff)
                        ) {
                            return false;
                        }

                        if ($order->events()->where('event_key', 'unpaid_payment_reminder_sent')->exists()) {
                            return false;
                        }

                        $recipient = trim((string) ($order->customer_email ?: $order->user?->email));
                        if (!filter_var($recipient, FILTER_VALIDATE_EMAIL)) {
                            logger()->warning('Skipped pending-payment reminder because the order has no valid customer email.', [
                                'order_id' => $order->id,
                                'order_number' => $order->order_number,
                            ]);

                            return false;
                        }

                        $paymentDeadline = $order->created_at->copy()->addHours($expiryHours);
                        Mail::to($recipient)->send(new PendingPaymentReminderMail($order, $paymentDeadline));

                        $order->events()->create([
                            'actor_user_id' => null,
                            'event_key' => 'unpaid_payment_reminder_sent',
                            'title' => 'Pending-payment reminder email sent',
                            'description' => "Sent a payment reminder {$reminderHours} hours after order placement.",
                            'payment_status_before' => $order->payment_status,
                            'payment_status_after' => $order->payment_status,
                            'order_status_before' => $order->order_status,
                            'order_status_after' => $order->order_status,
                            'metadata' => [
                                'reminder_after_hours' => $reminderHours,
                                'expiry_after_hours' => $expiryHours,
                                'recipient' => $recipient,
                            ],
                        ]);

                        return true;
                    });

                    if ($wasSent) {
                        $sent++;
                    } else {
                        $skipped++;
                    }
                } catch (\Throwable $exception) {
                    report($exception);
                    logger()->warning('Failed to send pending-payment reminder email.', [
                        'order_id' => $candidate->id,
                        'order_number' => $candidate->order_number,
                    ]);
                    $failed++;
                }
            }
        });

    $this->info("Pending-payment reminders: {$sent} sent; {$skipped} skipped; {$failed} failed. Reminder: {$reminderHours} hours; expiry: {$expiryHours} hours.");
})->purpose('Send a one-time email reminder for unpaid orders before automatic cancellation');

Schedule::command('secureview:send-unpaid-order-payment-reminders')
    ->hourly()
    ->name('send-unpaid-order-payment-reminders')
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

