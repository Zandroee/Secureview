<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('inquiries', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('inquiry_number')->unique();
            $table->string('inquirable_type')->nullable();
            $table->unsignedBigInteger('inquirable_id')->nullable();
            $table->string('item_name')->nullable();
            $table->string('customer_name');
            $table->string('customer_phone', 30);
            $table->string('customer_email');
            $table->string('street_address');
            $table->string('city');
            $table->string('service_type');
            $table->date('preferred_date');
            $table->text('notes')->nullable();
            $table->string('status')->default('pending');
            $table->timestamps();

            $table->index(['inquirable_type', 'inquirable_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('inquiries');
    }
};
