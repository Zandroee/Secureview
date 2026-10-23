<?php

namespace App\Services;

use App\Models\CustomerNotification;
use App\Models\Inquiry;
use App\Models\Order;
use App\Models\Package;
use App\Models\PendingInquiryCheckout;
use App\Models\Product;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class PendingInquiryCheckoutService
{
    /**
     * Finalize an Installation inquiry after the order is confirmed paid.
     *
     * This method is intentionally idempotent so both the payment-return route
     * and a PayMongo webhook can safely call it for the same order.
     */
    public function completePaidOrder(Order $order): ?Inquiry
    {
        return DB::transaction(function () use ($order) {
            $pending = PendingInquiryCheckout::query()
                ->where('order_id', $order->id)
                ->lockForUpdate()
                ->first();

            if (!$pending) {
                return null;
            }

            if ((int) $pending->user_id !== (int) $order->user_id) {
                report(new \RuntimeException(
                    'Pending installation checkout user does not match its order.'
                ));

                return null;
            }

            if ($pending->inquiry_id) {
                return Inquiry::query()
                    ->where('user_id', $pending->user_id)
                    ->find($pending->inquiry_id);
            }

            if ($pending->status !== 'pending_payment' || $order->payment_status !== 'paid') {
                return null;
            }

            $payload = $pending->payload ?? [];
            $itemType = $payload['item_type'] ?? null;
            $itemId = $payload['item_id'] ?? null;

            if (!$itemType || !$itemId || !in_array($itemType, ['product', 'package'], true)) {
                report(new \RuntimeException(
                    'Paid installation order is missing its selected catalog item.'
                ));

                return null;
            }

            $modelClass = $itemType === 'product' ? Product::class : Package::class;
            $item = $modelClass::find($itemId);

            if (!$item) {
                report(new \RuntimeException(
                    'Paid installation order references a missing catalog item.'
                ));

                return null;
            }

            do {
                $inquiryNumber = 'INQ-' . now()->format('Ymd') . '-' . Str::upper(Str::random(6));
            } while (Inquiry::where('inquiry_number', $inquiryNumber)->exists());

            $inquiry = Inquiry::create([
                'user_id' => $pending->user_id,
                'inquiry_number' => $inquiryNumber,
                'inquirable_type' => get_class($item),
                'inquirable_id' => $item->id,
                'item_name' => $item->name,
                'customer_name' => $payload['customer_name'],
                'customer_phone' => $payload['customer_phone'],
                'customer_email' => $payload['customer_email'],
                'street_address' => $payload['street_address'],
                'address_details' => $payload['address_details'] ?? null,
                'city' => $payload['city'],
                'service_latitude' => $payload['service_latitude'] ?? null,
                'service_longitude' => $payload['service_longitude'] ?? null,
                'google_place_id' => $payload['google_place_id'] ?? null,
                'service_type' => 'Installation',
                'urgency' => $payload['urgency'],
                'preferred_date' => $payload['preferred_date'],
                'preferred_time' => $payload['preferred_time'],
                'notes' => $payload['notes'] ?? null,
                'status' => 'pending',
            ]);

            $pending->update([
                'status' => 'paid',
                'inquiry_id' => $inquiry->id,
            ]);

            app(JobNotificationService::class)->notifyNewInquirySubmitted($inquiry);

            return $inquiry;
        });
    }
}
