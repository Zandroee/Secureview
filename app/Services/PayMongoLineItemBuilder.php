<?php

namespace App\Services;

use App\Models\Order;

class PayMongoLineItemBuilder
{
    /**
     * Allocate the merchandise discount across order items so the cent-exact
     * provider line-item total matches the amount stored on the order.
     */
    public function buildDiscounted(Order $order): array
    {
        $order->loadMissing('items');
        $items = $order->items->values();
        $itemSubtotals = $items->map(fn ($item) => max(0, (int) round((float) $item->subtotal * 100)));
        $sourceTotal = (int) $itemSubtotals->sum();
        $targetTotal = max(100, (int) round(((float) $order->subtotal - (float) $order->discount_amount) * 100));

        if ($sourceTotal < 1 || $targetTotal < 1 || $items->isEmpty()) {
            return [];
        }

        // Largest-remainder allocation avoids cent drift across multiple item rows.
        $allocated = [];
        $fractions = [];
        $allocatedTotal = 0;

        foreach ($itemSubtotals as $index => $lineSubtotal) {
            $raw = $targetTotal * ($lineSubtotal / $sourceTotal);
            $floor = (int) floor($raw);
            $allocated[$index] = $floor;
            $fractions[$index] = $raw - $floor;
            $allocatedTotal += $floor;
        }

        $remainder = $targetTotal - $allocatedTotal;
        $indices = array_keys($allocated);
        usort($indices, function ($left, $right) use ($fractions) {
            return $fractions[$right] <=> $fractions[$left] ?: $left <=> $right;
        });
        for ($index = 0; $index < $remainder; $index++) {
            $allocated[$indices[$index % count($indices)]]++;
        }

        $lines = [];
        foreach ($items as $index => $item) {
            $amount = (int) ($allocated[$index] ?? 0);
            if ($amount < 1) {
                continue;
            }

            $quantity = max(1, (int) $item->quantity);
            $lines[] = [
                'name' => $quantity > 1 ? $item->name . ' × ' . $quantity : $item->name,
                'amount' => $amount,
                'currency' => 'PHP',
                'quantity' => 1,
            ];
        }

        return $lines;
    }
}
