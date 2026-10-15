<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('blocked_booking_time_slots', function (Blueprint $table) {
            $table->id();
            $table->date('booking_date');
            $table->string('booking_time', 40);
            $table->string('reason', 255)->nullable();
            $table->foreignId('blocked_by')
                ->nullable()
                ->constrained('users')
                ->nullOnDelete();
            $table->timestamps();
            $table->unique(['booking_date', 'booking_time']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('blocked_booking_time_slots');
    }
};
