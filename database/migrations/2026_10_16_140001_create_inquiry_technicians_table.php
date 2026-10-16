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
            $table->boolean('accepting_technician_signups')
                ->default(false)
                ->after('technician_id');
            $table->unsignedTinyInteger('max_technicians')
                ->default(3)
                ->after('accepting_technician_signups');
        });

        Schema::create('inquiry_technicians', function (Blueprint $table) {
            $table->id();
            $table->foreignId('inquiry_id')->constrained()->cascadeOnDelete();
            $table->foreignId('technician_id')->constrained('users')->cascadeOnDelete();
            $table->boolean('is_lead')->default(false);
            $table->string('assignment_source', 30)->default('admin');
            $table->foreignId('assigned_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();

            $table->unique(['inquiry_id', 'technician_id']);
            $table->index(['technician_id', 'inquiry_id']);
        });

        // Preserve every existing single-technician assignment as the lead.
        DB::table('inquiries')
            ->whereNotNull('technician_id')
            ->orderBy('id')
            ->get(['id', 'technician_id', 'created_at', 'updated_at'])
            ->each(function ($inquiry) {
                DB::table('inquiry_technicians')->insertOrIgnore([
                    'inquiry_id' => $inquiry->id,
                    'technician_id' => $inquiry->technician_id,
                    'is_lead' => true,
                    'assignment_source' => 'legacy_migration',
                    'assigned_by' => null,
                    'created_at' => $inquiry->created_at ?? now(),
                    'updated_at' => $inquiry->updated_at ?? now(),
                ]);
            });
    }

    public function down(): void
    {
        Schema::dropIfExists('inquiry_technicians');

        Schema::table('inquiries', function (Blueprint $table) {
            $table->dropColumn(['accepting_technician_signups', 'max_technicians']);
        });
    }
};
