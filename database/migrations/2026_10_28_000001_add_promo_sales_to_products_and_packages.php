<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        foreach (['products', 'packages'] as $tableName) {
            Schema::table($tableName, function (Blueprint $table): void {
                $table->decimal('sale_price', 10, 2)->nullable()->after('price');
                $table->dateTime('sale_starts_at')->nullable()->after('sale_price');
                $table->dateTime('sale_ends_at')->nullable()->after('sale_starts_at');
            });
        }
    }

    public function down(): void
    {
        foreach (['products', 'packages'] as $tableName) {
            Schema::table($tableName, function (Blueprint $table): void {
                $table->dropColumn(['sale_price', 'sale_starts_at', 'sale_ends_at']);
            });
        }
    }
};
