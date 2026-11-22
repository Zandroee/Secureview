<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('invoice_settings', function (Blueprint $table) {
            $table->text('pickup_address')->nullable()->after('address');
        });

        Schema::table('orders', function (Blueprint $table) {
            $table->text('pickup_address')->nullable()->after('fulfillment_method');
        });
    }

    public function down(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            $table->dropColumn('pickup_address');
        });

        Schema::table('invoice_settings', function (Blueprint $table) {
            $table->dropColumn('pickup_address');
        });
    }
};
