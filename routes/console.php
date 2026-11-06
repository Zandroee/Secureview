<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Schedule;
use App\Mail\PendingPaymentReminderMail;
use App\Models\CustomerNotification;
use App\Models\Order;
use App\Models\User;
use App\Models\Voucher;
use App\Models\Product;
use App\Models\Package;
use App\Models\NewsletterPromotionSend;
use App\Mail\NewsletterPromotionMail;
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



/**
 * Send each currently active voucher or scheduled product/package sale to
 * customers who explicitly opted in. Per-recipient campaign fingerprints make
 * retries safe and prevent duplicate sends when the scheduler runs again.
 */
Artisan::command('netmax:send-promotion-newsletters', function () {
    $sent = 0;
    $skipped = 0;
    $failed = 0;
    $timezone = config('app.timezone', 'Asia/Manila');
    $now = now($timezone);

    $sendPromotion = function (array $promotion) use (&$sent, &$skipped, &$failed) {
        $fingerprintData = $promotion['fingerprint'];
        $version = hash('sha256', json_encode($fingerprintData, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE));
        unset($promotion['fingerprint']);

        User::query()
            ->where('newsletter_opt_in', true)
            ->whereNotNull('email_verified_at')
            ->whereNotNull('email')
            ->orderBy('id')
            ->chunkById(100, function ($recipients) use ($promotion, $version, &$sent, &$skipped, &$failed) {
                foreach ($recipients as $recipient) {
                    $delivery = NewsletterPromotionSend::firstOrCreate([
                        'promotion_type' => $promotion['type'],
                        'promotion_id' => $promotion['id'],
                        'promotion_version' => $version,
                        'user_id' => $recipient->id,
                    ]);

                    if ($delivery->sent_at !== null) {
                        $skipped++;
                        continue;
                    }

                    // Recheck consent immediately before sending; a customer may
                    // have opted out after the recipients were chunked.
                    $recipient->refresh();
                    if (!$recipient->newsletter_opt_in || !$recipient->hasVerifiedEmail()) {
                        $skipped++;
                        continue;
                    }

                    try {
                        \Illuminate\Support\Facades\Mail::to($recipient->email)
                            ->send(new NewsletterPromotionMail($promotion, $recipient));

                        $delivery->forceFill([
                            'sent_at' => now(),
                            'last_error' => null,
                        ])->save();
                        $sent++;
                    } catch (\Throwable $exception) {
                        $delivery->forceFill([
                            'last_error' => \Illuminate\Support\Str::limit($exception->getMessage(), 2000),
                        ])->save();
                        report($exception);
                        $failed++;
                    }
                }
            });
    };

    $activeVouchers = Voucher::query()
        ->where('is_active', true)
        ->where(fn ($query) => $query->whereNull('starts_at')->orWhere('starts_at', '<=', $now))
        ->where(fn ($query) => $query->whereNull('expires_at')->orWhere('expires_at', '>', $now))
        ->orderBy('id')
        ->get();

    foreach ($activeVouchers as $voucher) {
        $discountLabel = $voucher->discount_type === 'percentage'
            ? rtrim(rtrim(number_format((float) $voucher->discount_value, 2), '0'), '.') . '% off'
            : '₱' . number_format((float) $voucher->discount_value, 2) . ' off';

        $sendPromotion([
            'type' => 'voucher',
            'id' => $voucher->id,
            'subject' => 'Netmax Trading voucher: ' . $voucher->code,
            'headline' => 'A voucher is available for you',
            'description' => $voucher->description ?: 'Use this voucher code at checkout to save on eligible Netmax Trading products and packages.',
            'code' => $voucher->code,
            'discount_label' => $discountLabel,
            'price_label' => null,
            'image_url' => url('/images/netmax-favicon.png'),
            'action_url' => url('/products'),
            'button_label' => 'SHOP PRODUCTS',
            'ends_at' => $voucher->expires_at
                ? \Illuminate\Support\Carbon::parse($voucher->expires_at, $timezone)->format('F j, Y g:i A')
                : null,
            'fingerprint' => [
                $voucher->code,
                $voucher->name,
                $voucher->description,
                $voucher->discount_type,
                $voucher->discount_value,
                $voucher->minimum_subtotal,
                $voucher->maximum_discount,
                $voucher->starts_at,
                $voucher->expires_at,
                $voucher->is_active,
            ],
        ]);
    }

    $buildSalePromotion = function ($item, string $type) use ($timezone) {
        $originalPrice = (float) $item->price;
        $salePrice = (float) $item->sale_price;
        $discount = $originalPrice > 0
            ? (int) round((1 - ($salePrice / $originalPrice)) * 100)
            : 0;

        $image = trim((string) ($item->image ?? ''));
        if ($image !== '') {
            if (filter_var($image, FILTER_VALIDATE_URL)) {
                $imageUrl = $image;
            } elseif (str_starts_with($image, '/')) {
                $imageUrl = url($image);
            } else {
                $imageUrl = url('/storage/' . ltrim($image, '/'));
            }
        } else {
            $imageUrl = url('/images/netmax-favicon.png');
        }

        $isPackage = $type === 'package_sale';
        $label = $isPackage ? 'package' : 'camera';

        return [
            'type' => $type,
            'id' => $item->id,
            'subject' => 'Sale on ' . $item->name . ' at Netmax Trading',
            'headline' => 'A Netmax Trading ' . $label . ' is on sale',
            'description' => 'Save on ' . $item->name . '. This limited-time offer is available while the sale is active and stock remains.',
            'code' => null,
            'discount_label' => $discount . '% OFF',
            'price_label' => 'Was ₱' . number_format($originalPrice, 2) . '; now ₱' . number_format($salePrice, 2) . '.',
            'image_url' => $imageUrl,
            'action_url' => url(($isPackage ? '/packages/' : '/products/') . $item->id),
            'button_label' => 'VIEW ' . ($isPackage ? 'PACKAGE' : 'CAMERA'),
            'ends_at' => $item->sale_ends_at
                ? \Illuminate\Support\Carbon::parse($item->sale_ends_at, $timezone)->format('F j, Y g:i A')
                : null,
            'fingerprint' => [
                $item->name,
                $item->price,
                $item->sale_price,
                $item->sale_starts_at,
                $item->sale_ends_at,
                $item->image,
            ],
        ];
    };

    Product::query()
        ->whereNotNull('sale_price')
        ->where('sale_price', '>', 0)
        ->whereColumn('sale_price', '<', 'price')
        ->where(fn ($query) => $query->whereNull('sale_starts_at')->orWhere('sale_starts_at', '<=', $now))
        ->where(fn ($query) => $query->whereNull('sale_ends_at')->orWhere('sale_ends_at', '>', $now))
        ->orderBy('id')
        ->get()
        ->each(fn (Product $product) => $product->isOnSale()
            ? $sendPromotion($buildSalePromotion($product, 'product_sale'))
            : null);

    Package::query()
        ->whereNotNull('sale_price')
        ->where('sale_price', '>', 0)
        ->whereColumn('sale_price', '<', 'price')
        ->where(fn ($query) => $query->whereNull('sale_starts_at')->orWhere('sale_starts_at', '<=', $now))
        ->where(fn ($query) => $query->whereNull('sale_ends_at')->orWhere('sale_ends_at', '>', $now))
        ->orderBy('id')
        ->get()
        ->each(fn (Package $package) => $package->isOnSale()
            ? $sendPromotion($buildSalePromotion($package, 'package_sale'))
            : null);

    $this->info("Promotional newsletters: {$sent} sent; {$skipped} already sent or opted out; {$failed} failed.");
})->purpose('Send active voucher and sale announcements to customers who opted in');

Schedule::command('netmax:send-promotion-newsletters')
    ->everyFifteenMinutes()
    ->name('send-netmax-promotion-newsletters')
    ->withoutOverlapping();
