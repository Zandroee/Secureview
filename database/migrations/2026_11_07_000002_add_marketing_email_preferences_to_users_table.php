<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->boolean('marketing_emails_enabled')->default(false);
            $table->timestamp('marketing_emails_consented_at')->nullable();
            $table->timestamp('marketing_emails_withdrawn_at')->nullable();
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn([
                'marketing_emails_enabled',
                'marketing_emails_consented_at',
                'marketing_emails_withdrawn_at',
            ]);
        });
    }
};
