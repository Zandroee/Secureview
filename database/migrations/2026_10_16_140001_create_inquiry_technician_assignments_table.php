<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('inquiry_technician_assignments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('inquiry_id')->constrained()->cascadeOnDelete();
            $table->foreignId('technician_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('assigned_by')->nullable()->constrained('users')->nullOnDelete();
            $table->boolean('is_lead')->default(false);
            $table->string('assignment_source', 20)->default('admin');
            $table->timestamp('assigned_at')->nullable();
            $table->timestamps();
            $table->unique(['inquiry_id', 'technician_id']);
            $table->index(['technician_id', 'is_lead']);
        });

        // Preserve the existing single-technician assignments as the lead technician.
        DB::table('inquiries')
            ->whereNotNull('technician_id')
            ->orderBy('id')
            ->get(['id', 'technician_id', 'created_at', 'updated_at'])
            ->each(function ($inquiry) {
                DB::table('inquiry_technician_assignments')->insertOrIgnore([
                    'inquiry_id' => $inquiry->id,
                    'technician_id' => $inquiry->technician_id,
                    'assigned_by' => null,
                    'is_lead' => true,
                    'assignment_source' => 'legacy',
                    'assigned_at' => $inquiry->updated_at ?? now(),
                    'created_at' => $inquiry->created_at ?? now(),
                    'updated_at' => $inquiry->updated_at ?? now(),
                ]);
            });
    }

    public function down(): void
    {
        Schema::dropIfExists('inquiry_technician_assignments');
    }
};
