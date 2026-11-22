<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('orders') && !Schema::hasColumn('orders', 'service_priority_fee')) {
            Schema::table('orders', function (Blueprint $table) {
                $table->decimal('service_priority_fee', 10, 2)->default(0)->after('installation_fee');
            });
        }

        if (Schema::hasTable('inquiries') && !Schema::hasColumn('inquiries', 'urgency_fee')) {
            Schema::table('inquiries', function (Blueprint $table) {
                $table->decimal('urgency_fee', 10, 2)->default(0)->after('urgency');
            });
        }

        if (Schema::hasTable('pending_inquiry_checkouts') && !Schema::hasColumn('pending_inquiry_checkouts', 'booking_request_token')) {
            Schema::table('pending_inquiry_checkouts', function (Blueprint $table) {
                $table->string('booking_request_token', 36)->nullable()->unique();
            });
        }
    }

    public function down(): void
    {
        // Keep financial history intact on rollback. These additive columns are
        // intentionally not dropped automatically after fees have been recorded.
    }
};
