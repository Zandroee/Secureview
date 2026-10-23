<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('inquiries', function (Blueprint $table) {
            $table->string('other_service_type', 120)->nullable()->after('service_type');
            $table->text('other_service_details')->nullable()->after('other_service_type');
            $table->foreignId('order_id')->nullable()->after('user_id')->constrained('orders')->nullOnDelete();
            $table->string('payment_status', 24)->default('not_required')->index()->after('status');
        });

        Schema::create('service_records', function (Blueprint $table) {
            $table->id();
            $table->foreignId('inquiry_id')->unique()->constrained('inquiries')->cascadeOnDelete();
            $table->foreignId('technician_id')->constrained('users')->restrictOnDelete();
            $table->string('service_outcome', 40);
            $table->text('work_summary');
            $table->text('recommendations')->nullable();
            $table->decimal('service_charge', 12, 2)->default(0);
            $table->string('payment_status', 24)->default('pending')->index();
            $table->string('payment_method', 24)->nullable();
            $table->timestamp('paid_at')->nullable();
            $table->timestamps();

            $table->index(['payment_status', 'created_at']);
        });

        Schema::create('service_record_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('service_record_id')->constrained('service_records')->cascadeOnDelete();
            $table->foreignId('product_id')->nullable()->constrained('products')->nullOnDelete();
            $table->string('product_name', 255);
            $table->unsignedInteger('quantity');
            $table->decimal('unit_price', 12, 2)->default(0);
            $table->string('notes', 255)->nullable();
            $table->timestamps();

            $table->index(['service_record_id', 'product_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('service_record_items');
        Schema::dropIfExists('service_records');

        Schema::table('inquiries', function (Blueprint $table) {
            $table->dropForeign(['order_id']);
            $table->dropColumn([
                'other_service_type',
                'other_service_details',
                'order_id',
                'payment_status',
            ]);
        });
    }
};
