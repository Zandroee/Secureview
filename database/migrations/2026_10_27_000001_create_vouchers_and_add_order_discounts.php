<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('vouchers', function (Blueprint $table) {
            $table->id();
            $table->string('code', 50)->unique();
            $table->string('name', 120);
            $table->text('description')->nullable();
            $table->string('discount_type', 20);
            $table->decimal('discount_value', 10, 2);
            $table->decimal('minimum_subtotal', 10, 2)->default(0);
            $table->decimal('maximum_discount', 10, 2)->nullable();
            $table->timestamp('starts_at')->nullable();
            $table->timestamp('expires_at')->nullable();
            $table->unsignedInteger('usage_limit')->nullable();
            $table->unsignedInteger('per_user_limit')->nullable();
            $table->boolean('is_active')->default(true)->index();
            $table->timestamps();
            $table->index(['is_active', 'starts_at', 'expires_at']);
        });

        Schema::table('orders', function (Blueprint $table) {
            $table->foreignId('voucher_id')->nullable()->after('user_id')->constrained('vouchers')->nullOnDelete();
            $table->string('voucher_code', 50)->nullable()->after('voucher_id');
            $table->decimal('discount_amount', 10, 2)->default(0)->after('subtotal');
        });
    }

    public function down(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            $table->dropConstrainedForeignId('voucher_id');
            $table->dropColumn(['voucher_code', 'discount_amount']);
        });
        Schema::dropIfExists('vouchers');
    }
};
