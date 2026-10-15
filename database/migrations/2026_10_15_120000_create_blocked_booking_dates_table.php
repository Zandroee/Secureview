<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('blocked_booking_dates', function (Blueprint $table) {
            $table->id();
            $table->date('booking_date')->unique();
            $table->string('reason', 255)->nullable();
            $table->foreignId('blocked_by')
                ->nullable()
                ->constrained('users')
                ->nullOnDelete();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('blocked_booking_dates');
    }
};
