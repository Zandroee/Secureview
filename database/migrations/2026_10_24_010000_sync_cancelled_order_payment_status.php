<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Align legacy cancelled unpaid orders with the cancelled payment state.
     * The migration only changes orders whose order status is cancelled and
     * whose payment status still says pending or failed.
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
     * This data correction is intentionally irreversible because the prior
     * payment status is not stored separately for legacy cancelled orders.
     */
    public function down(): void
    {
        // No rollback: restoring the old payment status would recreate the inconsistency.
    }
};
