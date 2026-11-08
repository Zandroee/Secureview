<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            $table->dropForeign(['user_id']);
            $table->unsignedBigInteger('user_id')->nullable()->change();
            $table->foreign('user_id')->references('id')->on('users')->nullOnDelete();
            $table->string('customer_email')->nullable()->change();
            $table->text('delivery_address')->nullable()->change();
            $table->string('sales_channel', 20)->default('online')->after('notes');
            $table->foreignId('created_by')->nullable()->after('sales_channel')->constrained('users')->nullOnDelete();
            $table->index('sales_channel');
        });

        Schema::table('inquiries', function (Blueprint $table) {
            $table->dropForeign(['user_id']);
            $table->unsignedBigInteger('user_id')->nullable()->change();
            $table->foreign('user_id')->references('id')->on('users')->nullOnDelete();
            $table->string('customer_email')->nullable()->change();
            $table->string('intake_channel', 20)->default('online');
            $table->string('service_location_type', 24)->default('customer_site');
            $table->index(['intake_channel', 'service_location_type']);
        });

        if (!Schema::hasColumn('order_items', 'warranty_period')) {
            Schema::table('order_items', function (Blueprint $table) {
                $table->string('warranty_period', 120)->nullable()->after('name');
            });
        }

        Schema::table('service_records', function (Blueprint $table) {
            $table->string('payment_method', 24)->nullable();
            $table->string('payment_status', 24)->default('pending');
            $table->decimal('amount_paid', 12, 2)->default(0);
            $table->timestamp('paid_at')->nullable();
        });

        Schema::table('invoice_records', function (Blueprint $table) {
            $table->dropForeign(['order_id']);
            $table->dropUnique(['order_id']);
            $table->unsignedBigInteger('order_id')->nullable()->change();
            $table->foreign('order_id')->references('id')->on('orders')->restrictOnDelete();
            $table->foreignId('service_record_id')->nullable()->unique()->constrained('service_records')->restrictOnDelete();
        });
    }

    public function down(): void
    {
        // A rollback must never silently discard walk-in sales, walk-in service
        // intake, or service invoice records. Migrate those records deliberately
        // before rolling back this schema change.
        if (\Illuminate\Support\Facades\DB::table('orders')->whereNull('user_id')->exists()
            || \Illuminate\Support\Facades\DB::table('inquiries')->whereNull('user_id')->exists()
            || \Illuminate\Support\Facades\DB::table('invoice_records')->whereNotNull('service_record_id')->exists()
            || \Illuminate\Support\Facades\DB::table('service_records')->where('amount_paid', '>', 0)->exists()
            || \Illuminate\Support\Facades\DB::table('service_record_items')->where('is_warranty_covered', true)->exists()) {
            throw new \RuntimeException(
                'Cannot roll back walk-in POS/service invoicing while walk-in records, service payments, warranty-covered parts, or service invoices exist.'
            );
        }

        Schema::table('invoice_records', function (Blueprint $table) {
            $table->dropForeign(['service_record_id']);
            $table->dropUnique(['service_record_id']);
            $table->dropColumn('service_record_id');
            $table->dropForeign(['order_id']);
            $table->unsignedBigInteger('order_id')->nullable(false)->change();
            $table->foreign('order_id')->references('id')->on('orders')->restrictOnDelete();
            $table->unique('order_id');
        });

        Schema::table('service_records', function (Blueprint $table) {
            $table->dropColumn(['payment_method', 'payment_status', 'amount_paid', 'paid_at']);
        });

        Schema::table('inquiries', function (Blueprint $table) {
            $table->dropIndex(['intake_channel', 'service_location_type']);
            $table->dropColumn(['intake_channel', 'service_location_type']);
            $table->string('customer_email')->nullable(false)->change();
            $table->dropForeign(['user_id']);
            $table->unsignedBigInteger('user_id')->nullable(false)->change();
            $table->foreign('user_id')->references('id')->on('users')->cascadeOnDelete();
        });

        Schema::table('order_items', function (Blueprint $table) {
            $table->dropColumn('warranty_period');
        });

        Schema::table('orders', function (Blueprint $table) {
            $table->dropIndex(['sales_channel']);
            $table->dropForeign(['created_by']);
            $table->dropColumn(['sales_channel', 'created_by']);
            $table->string('customer_email')->nullable(false)->change();
            $table->text('delivery_address')->nullable(false)->change();
            $table->dropForeign(['user_id']);
            $table->unsignedBigInteger('user_id')->nullable(false)->change();
            $table->foreign('user_id')->references('id')->on('users')->cascadeOnDelete();
        });
    }
};
