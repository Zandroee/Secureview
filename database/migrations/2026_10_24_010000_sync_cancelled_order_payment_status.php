<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Align legacy cancelled unpaid orders with the cancelled payment state.
     *
     * Only cancelled orders that still say pending or failed are changed.
     * Paid orders and active orders are never modified by this correction.
     */
    public function up(): void
    {
        DB::table('orders')
            ->where('order_status', 'cancelled')
            ->whereIn('payment_status', ['pending', 'failed'])
            ->update([
                'payment_status' => 'cancelled',
                'updated_at' => now(),
            ]);
    }

    /**
     * Intentionally irreversible: the previous inconsistent status is not
     * stored separately, so reverting would reintroduce the inconsistency.
     */
    public function down(): void
    {
        // No rollback.
    }
};
