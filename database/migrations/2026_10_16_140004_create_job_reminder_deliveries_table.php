<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('job_reminder_deliveries', function (Blueprint $table) {
            $table->id();
            $table->foreignId('inquiry_id')->constrained()->cascadeOnDelete();
            $table->foreignId('recipient_id')->constrained('users')->cascadeOnDelete();
            $table->string('reminder_type', 20);
            $table->dateTime('scheduled_start');
            $table->timestamp('sent_at')->nullable();
            $table->timestamps();
            $table->unique(
                ['inquiry_id', 'recipient_id', 'reminder_type', 'scheduled_start'],
                'job_reminder_delivery_unique'
            );
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('job_reminder_deliveries');
    }
};
