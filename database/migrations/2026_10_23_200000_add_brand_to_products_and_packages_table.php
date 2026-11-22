<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('products', function (Blueprint $table) {
            $table->string('brand', 120)->nullable();
        });

        Schema::table('packages', function (Blueprint $table) {
            $table->string('brand', 120)->nullable();
        });
    }

    public function down(): void
    {
        Schema::table('products', function (Blueprint $table) {
            $table->dropColumn('brand');
        });

        Schema::table('packages', function (Blueprint $table) {
            $table->dropColumn('brand');
        });
    }
};
