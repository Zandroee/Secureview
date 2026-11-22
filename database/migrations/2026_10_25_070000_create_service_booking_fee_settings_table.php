<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('service_booking_fee_settings', function (Blueprint $table) {
            $table->id();
            $table->decimal('urgent_fee', 10, 2)->default(500.00);
            $table->decimal('emergency_fee', 10, 2)->default(1500.00);
            $table->timestamps();
        });

        DB::table('service_booking_fee_settings')->insert([
            'id' => 1,
            'urgent_fee' => max(0, (float) config('services.secureview.booking_fees.urgent', 500)),
            'emergency_fee' => max(0, (float) config('services.secureview.booking_fees.emergency', 1500)),
            'created_at' => now(),
            'updated_at' => now(),
        ]);
    }

    public function down(): void
    {
        Schema::dropIfExists('service_booking_fee_settings');
    }
};
