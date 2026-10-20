<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('order_events', function (Blueprint $table) {
            $table->id();
            $table->foreignId('order_id')->constrained()->cascadeOnDelete();
            $table->foreignId('actor_user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('event_key', 80);
            $table->string('title', 160);
            $table->text('description')->nullable();
            $table->string('payment_status_before')->nullable();
            $table->string('payment_status_after')->nullable();
            $table->string('order_status_before')->nullable();
            $table->string('order_status_after')->nullable();
            $table->json('metadata')->nullable();
            $table->timestamps();

            $table->index(['order_id', 'created_at']);
            $table->index('event_key');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('order_events');
    }
};
