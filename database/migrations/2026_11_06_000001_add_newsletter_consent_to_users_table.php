<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->boolean('newsletter_opt_in')->default(false);
            $table->timestamp('newsletter_opted_in_at')->nullable();
            $table->timestamp('newsletter_opted_out_at')->nullable();
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn([
                'newsletter_opt_in',
                'newsletter_opted_in_at',
                'newsletter_opted_out_at',
            ]);
        });
    }
};
