<?php

namespace App\Services;

use App\Models\Order;
use App\Models\User;
use App\Models\Voucher;
use Illuminate\Support\Carbon;
use Illuminate\Validation\ValidationException;

class VoucherService
{
    /**
     * Validate a voucher and calculate its discount from the merchandise subtotal.
     *
     * @return array{voucher: Voucher, discount_amount: float, subtotal: float, total: float}
     */
    public function quote(string $code, User $user, float $subtotal, bool $lockForUpdate = false): array
    {
        $code = strtoupper(trim($code));

        if ($code === '') {
            $this->reject('Enter a voucher code.');
        }

        $query = Voucher::query()->where('code', $code);
        if ($lockForUpdate) {
            $query->lockForUpdate();
        }

        $voucher = $query->first();
        if (!$voucher) {
            $this->reject('That voucher code was not found.');
        }
        if (!$voucher->is_active) {
            $this->reject('That voucher is currently inactive.');
        }

        // These columns intentionally store Manila-local wall-clock values (DATETIME),
        // because the admin form uses datetime-local and promotions are scheduled in app time.
        $timezone = config('app.timezone', 'UTC');
        $now = now($timezone);
        $startsAt = $voucher->starts_at !== null
            ? Carbon::parse($voucher->starts_at, $timezone)
            : null;
        $expiresAt = $voucher->expires_at !== null
            ? Carbon::parse($voucher->expires_at, $timezone)
            : null;

        if ($startsAt && $now->lt($startsAt)) {
            $this->reject('That voucher is not available yet.');
        }
        if ($expiresAt && $now->gt($expiresAt)) {
            $this->reject('That voucher has expired.');
        }

        $subtotal = round(max(0, $subtotal), 2);
        if ($subtotal < (float) $voucher->minimum_subtotal) {
            $this->reject(
                'This voucher requires a merchandise subtotal of at least ₱' .
                number_format((float) $voucher->minimum_subtotal, 2) . '.'
            );
        }

        // Pending/failed orders reserve a use because their stored discounted total can be retried.
        // Only cancelled orders release that reserved use.
        $activeOrders = Order::query()
            ->where('voucher_id', $voucher->id)
            ->where('order_status', '!=', 'cancelled');

        if ($voucher->usage_limit !== null && (clone $activeOrders)->count() >= $voucher->usage_limit) {
            $this->reject('This voucher has reached its total-use limit.');
        }
        if ($voucher->per_user_limit !== null) {
            $userUses = (clone $activeOrders)
                ->where('user_id', $user->getAuthIdentifier())
                ->count();

            if ($userUses >= $voucher->per_user_limit) {
                $this->reject('You have already used this voucher the maximum number of times.');
            }
        }

        $discount = $voucher->discount_type === 'percentage'
            ? $subtotal * ((float) $voucher->discount_value / 100)
            : (float) $voucher->discount_value;

        if ($voucher->discount_type === 'percentage' && $voucher->maximum_discount !== null) {
            $discount = min($discount, (float) $voucher->maximum_discount);
        }

        $discount = round(min($subtotal, max(0, $discount)), 2);

        // PayMongo hosted checkout needs a positive amount due.
        if ($subtotal < 1 || $discount <= 0 || round($subtotal - $discount, 2) < 1.00) {
            $this->reject('This voucher must leave at least ₱1.00 due. Increase your subtotal or use a smaller discount.');
        }

        return [
            'voucher' => $voucher,
            'discount_amount' => $discount,
            'subtotal' => $subtotal,
            'total' => round($subtotal - $discount, 2),
        ];
    }

    private function reject(string $message): never
    {
        throw ValidationException::withMessages(['voucher' => $message]);
    }
}
