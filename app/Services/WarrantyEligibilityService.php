<?php

namespace App\Services;

use App\Models\Order;
use App\Models\OrderItem;
use Illuminate\Support\Carbon;

class WarrantyEligibilityService
{
    public function periodFor(OrderItem $item): ?string
    {
        $item->loadMissing('purchasable');

        $period = $item->warranty_period ?: ($item->purchasable?->warranty ?? null);

        return filled($period) ? trim((string) $period) : null;
    }

    public function startDateFor(Order $order): ?Carbon
    {
        $date = $order->paid_at ?? $order->created_at;

        return $date ? Carbon::parse($date)->startOfDay() : null;
    }

    public function expiryDateFor(OrderItem $item): ?Carbon
    {
        $period = $this->periodFor($item);
        $startDate = $item->order
            ? $this->startDateFor($item->order)
            : null;

        if (!$period || !$startDate || preg_match('/\blifetime\b/i', $period)) {
            return null;
        }

        if (!preg_match('/\b(\d+)\s*(years?|yrs?|months?|mos?|weeks?|wks?|days?)\b/i', $period, $matches)) {
            return null;
        }

        $amount = (int) $matches[1];
        if ($amount < 1) {
            return null;
        }

        $unit = strtolower($matches[2]);

        if (str_starts_with($unit, 'y')) {
            return $startDate->copy()->addYears($amount);
        }

        if (str_starts_with($unit, 'mo')) {
            return $startDate->copy()->addMonths($amount);
        }

        if (str_starts_with($unit, 'w')) {
            return $startDate->copy()->addWeeks($amount);
        }

        return $startDate->copy()->addDays($amount);
    }

    public function isCovered(OrderItem $item): bool
    {
        $item->loadMissing(['order', 'purchasable']);

        $order = $item->order;
        if (
            !$order ||
            $order->payment_status !== 'paid' ||
            in_array($order->order_status, ['cancelled', 'payment_failed'], true)
        ) {
            return false;
        }

        $period = $this->periodFor($item);
        if (
            !$period ||
            preg_match('/\b(no warranty|not covered|none|n\/a)\b/i', $period)
        ) {
            return false;
        }

        if (preg_match('/\blifetime\b/i', $period)) {
            return true;
        }

        $expiresAt = $this->expiryDateFor($item);

        return $expiresAt !== null && $expiresAt->toDateString() >= today()->toDateString();
    }
}
