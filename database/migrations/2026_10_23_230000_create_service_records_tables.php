<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('service_records', function (Blueprint $table) {
            $table->id();
            $table->foreignId('inquiry_id')->unique()->constrained('inquiries')->restrictOnDelete();
            $table->foreignId('technician_id')->constrained('users')->restrictOnDelete();
            $table->longText('work_summary');
            $table->text('customer_notes')->nullable();
            $table->decimal('labor_charge', 12, 2)->default(0);
            $table->decimal('additional_charge', 12, 2)->default(0);
            $table->decimal('total_income', 12, 2)->default(0);
            $table->timestamp('completed_at');
            $table->timestamps();
            $table->index(['technician_id', 'completed_at']);
        });

        Schema::create('service_record_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('service_record_id')->constrained('service_records')->cascadeOnDelete();
            $table->foreignId('product_id')->nullable()->constrained('products')->nullOnDelete();
            $table->string('product_name', 180);
            $table->string('action', 20); // used = pulled from shop stock; removed = taken off the customer's system
            $table->unsignedInteger('quantity');
            $table->decimal('unit_price', 12, 2)->default(0);
            $table->text('notes')->nullable();
            $table->timestamps();
            $table->index(['service_record_id', 'action']);
            $table->index(['product_id', 'created_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('service_record_items');
        Schema::dropIfExists('service_records');
    }
};
