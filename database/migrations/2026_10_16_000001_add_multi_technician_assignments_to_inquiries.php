<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('inquiries', function (Blueprint $table) {
            $table->boolean('allow_additional_technicians')->default(false)->after('technician_id');
        });

        Schema::create('inquiry_technician', function (Blueprint $table) {
            $table->id();
            $table->foreignId('inquiry_id')->constrained()->cascadeOnDelete();
            $table->foreignId('technician_id')->constrained('users')->cascadeOnDelete();
            $table->boolean('is_lead')->default(false);
            $table->foreignId('assigned_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
            $table->unique(['inquiry_id', 'technician_id']);
            $table->index(['technician_id', 'is_lead']);
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
                    'is_lead' => true,
                    'assigned_by' => null,
                    'created_at' => $now,
                    'updated_at' => $now,
                ]);
            });
    }

    public function down(): void
    {
        Schema::dropIfExists('inquiry_technician');

        Schema::table('inquiries', function (Blueprint $table) {
            $table->dropColumn('allow_additional_technicians');
        });
    }
};
