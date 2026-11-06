<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('newsletter_promotion_sends', function (Blueprint $table) {
            $table->id();
            $table->string('promotion_type', 32);
            $table->unsignedBigInteger('promotion_id');
            $table->char('promotion_version', 64);
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->timestamp('sent_at')->nullable();
            $table->text('last_error')->nullable();
            $table->timestamps();

            $table->unique(
                ['promotion_type', 'promotion_id', 'promotion_version', 'user_id'],
                'newsletter_promotion_user_unique'
            );
            $table->index(['promotion_type', 'promotion_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('newsletter_promotion_sends');
    }
};
