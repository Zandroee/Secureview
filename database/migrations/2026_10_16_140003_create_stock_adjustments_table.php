<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('stock_adjustments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('product_id')->nullable()->constrained()->nullOnDelete();
            $table->string('product_name');
            $table->foreignId('changed_by')->nullable()->constrained('users')->nullOnDelete();
            $table->unsignedInteger('previous_quantity');
            $table->unsignedInteger('new_quantity');
            $table->integer('quantity_change');
            $table->string('reason', 255);
            $table->timestamps();

            $table->index(['product_id', 'created_at']);
            $table->index(['changed_by', 'created_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('stock_adjustments');
    }
};
