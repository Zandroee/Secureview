<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        // Set Brand for existing records only when it is currently blank and
        // the manufacturer is explicit in the saved catalog name.
        DB::table('products')
            ->where(function ($query) {
                $query->whereNull('brand')->orWhere('brand', '');
            })
            ->where(function ($query) {
                $query->where('name', 'like', 'Dahua %')
                    ->orWhere('name', 'like', '%WizSense%')
                    ->orWhere('name', 'like', '%WizColor%');
            })
            ->update(['brand' => 'Dahua', 'updated_at' => now()]);

        DB::table('products')
            ->where(function ($query) {
                $query->whereNull('brand')->orWhere('brand', '');
            })
            ->where(function ($query) {
                $query->where('name', 'like', 'Hikvision %')
                    ->orWhere('name', 'like', 'HikVision %');
            })
            ->update(['brand' => 'Hikvision', 'updated_at' => now()]);

        DB::table('products')
            ->where(function ($query) {
                $query->whereNull('brand')->orWhere('brand', '');
            })
            ->where('name', 'like', 'WD Purple%')
            ->update(['brand' => 'Western Digital', 'updated_at' => now()]);

        DB::table('packages')
            ->where(function ($query) {
                $query->whereNull('brand')->orWhere('brand', '');
            })
            ->where('name', 'like', '%Dahua%')
            ->update(['brand' => 'Dahua', 'updated_at' => now()]);

        DB::table('packages')
            ->where(function ($query) {
                $query->whereNull('brand')->orWhere('brand', '');
            })
            ->where(function ($query) {
                $query->where('name', 'like', 'Hikvision %')
                    ->orWhere('name', 'like', 'HikVision %');
            })
            ->update(['brand' => 'Hikvision', 'updated_at' => now()]);
    }

    public function down(): void
    {
        // Brand backfill intentionally remains in place if this migration is rolled back.
    }
};
