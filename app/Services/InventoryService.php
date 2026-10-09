<?php

namespace App\Services;

use App\Models\Order;
use App\Models\Package;
use App\Models\Product;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class InventoryService
{
    public function getAvailableStock(Model $purchasable): int
    {
        if ($purchasable instanceof Product) {
            return max(0, (int) $purchasable->stock_quantity);
        }

        if ($purchasable instanceof Package) {
            $purchasable->loadMissing('packageItems.product');

            if ($purchasable->packageItems->isEmpty()) {
                return 0;
            }

            $available = null;

            foreach ($purchasable->packageItems as $packageItem) {
                $required = max(1, (int) $packageItem->quantity);
                $productStock = max(0, (int) ($packageItem->product?->stock_quantity ?? 0));
                $packageStock = intdiv($productStock, $required);

                $available = $available === null
                    ? $packageStock
                    : min($available, $packageStock);
            }

            return $available ?? 0;
        }

        return 0;
    }

    public function getAvailabilityError(Model $purchasable, int $quantity): ?string
    {
        $available = $this->getAvailableStock($purchasable);

        if ($available >= $quantity) {
            return null;
        }

        $name = $purchasable->name ?? 'This item';

        if ($available === 0) {
            return "{$name} is currently out of stock.";
        }

        return "Only {$available} of {$name} is currently available.";
    }

    public function validateOrderStock(Order $order): void
    {
        $order->loadMissing('items');

        foreach ($order->items as $orderItem) {
            $purchasable = $orderItem->purchasable;

            if (!$purchasable) {
                throw ValidationException::withMessages([
                    'stock' => "An item in this order is no longer available.",
                ]);
            }

            $error = $this->getAvailabilityError(
                $purchasable,
                (int) $orderItem->quantity
            );

            if ($error) {
                throw ValidationException::withMessages([
                    'stock' => $error,
                ]);
            }
        }
    }

    public function deductForOrder(Order $order): void
    {
        DB::transaction(function () use ($order) {
            $lockedOrder = Order::query()
                ->lockForUpdate()
                ->findOrFail($order->id);

            if ($lockedOrder->stock_deducted_at) {
                return;
            }

            $lockedOrder->load('items');

            foreach ($lockedOrder->items as $orderItem) {
                if ($orderItem->purchasable_type === Package::class) {
                    $package = Package::with('packageItems')->find($orderItem->purchasable_id);

                    if (!$package) {
                        throw ValidationException::withMessages([
                            'stock' => "A package in this order is no longer available.",
                        ]);
                    }

                    foreach ($package->packageItems as $packageItem) {
                        $product = Product::query()
                            ->lockForUpdate()
                            ->find($packageItem->product_id);

                        $required = (int) $packageItem->quantity * (int) $orderItem->quantity;

                        if (!$product || $product->stock_quantity < $required) {
                            throw ValidationException::withMessages([
                                'stock' => "There is not enough stock to complete this order.",
                            ]);
                        }

                        $product->decrement('stock_quantity', $required);
                    }

                    continue;
                }

                $product = Product::query()
                    ->lockForUpdate()
                    ->find($orderItem->purchasable_id);

                $required = (int) $orderItem->quantity;

                if (!$product || $product->stock_quantity < $required) {
                    throw ValidationException::withMessages([
                        'stock' => "There is not enough stock to complete this order.",
                    ]);
                }

                $product->decrement('stock_quantity', $required);
            }

            $lockedOrder->update([
                'stock_deducted_at' => now(),
            ]);
        });
    }
}
