<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('products', function (Blueprint $table) {
            $table->decimal('installation_fee', 10, 2)->nullable()->after('price');
        });

        Schema::table('packages', function (Blueprint $table) {
            $table->decimal('installation_fee', 10, 2)->nullable()->after('price');
        });

        Schema::table('orders', function (Blueprint $table) {
            $table->decimal('installation_fee', 10, 2)->default(0)->after('shipping_fee');
        });

        Schema::create('pending_inquiry_checkouts', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignId('order_id')->unique()->constrained()->cascadeOnDelete();
            $table->json('payload');
            $table->string('status')->default('pending_payment')->index();
            $table->foreignId('inquiry_id')->nullable()->constrained('inquiries')->nullOnDelete();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('pending_inquiry_checkouts');

        Schema::table('orders', function (Blueprint $table) {
            $table->dropColumn('installation_fee');
        });

        Schema::table('packages', function (Blueprint $table) {
            $table->dropColumn('installation_fee');
        });

        Schema::table('products', function (Blueprint $table) {
            $table->dropColumn('installation_fee');
        });
    }
};