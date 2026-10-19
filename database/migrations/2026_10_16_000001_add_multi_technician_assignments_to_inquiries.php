<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('inquiry_technician', function (Blueprint $table) {
            $table->id();
            $table->foreignId('inquiry_id')->constrained()->cascadeOnDelete();
            $table->foreignId('technician_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('assigned_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
            $table->unique(['inquiry_id', 'technician_id']);
            $table->index('technician_id');
        });

        $now = now();
        DB::table('inquiries')
            ->whereNotNull('technician_id')
            ->orderBy('id')
            ->get(['id', 'technician_id'])
            ->each(function ($inquiry) use ($now) {
                DB::table('inquiry_technician')->insertOrIgnore([
                    'inquiry_id' => $inquiry->id,
                    'technician_id' => $inquiry->technician_id,
                    'assigned_by' => null,
                    'created_at' => $now,
                    'updated_at' => $now,
                ]);
            });
    }

    public function down(): void
    {
        Schema::dropIfExists('inquiry_technician');

    }
};
