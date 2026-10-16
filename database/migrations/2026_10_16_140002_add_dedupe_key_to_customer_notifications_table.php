<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('customer_notifications', function (Blueprint $table) {
            $table->string('dedupe_key', 191)->nullable()->unique();
        });
    }

    public function down(): void
    {
        Schema::table('customer_notifications', function (Blueprint $table) {
            $table->dropUnique(['dedupe_key']);
            $table->dropColumn('dedupe_key');
        });
    }
};
