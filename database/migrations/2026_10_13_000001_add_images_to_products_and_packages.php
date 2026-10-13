<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('products', function (Blueprint $table) {
            $table->json('images')->nullable()->after('image');
        });

        Schema::table('packages', function (Blueprint $table) {
            $table->json('images')->nullable()->after('image');
        });

        foreach (DB::table('products')->whereNotNull('image')->get(['id', 'image']) as $product) {
            DB::table('products')->where('id', $product->id)->update([
                'images' => json_encode([$product->image]),
            ]);
        }

        foreach (DB::table('packages')->whereNotNull('image')->get(['id', 'image']) as $package) {
            DB::table('packages')->where('id', $package->id)->update([
                'images' => json_encode([$package->image]),
            ]);
        }
    }

    public function down(): void
    {
        Schema::table('products', function (Blueprint $table) {
            $table->dropColumn('images');
        });

        Schema::table('packages', function (Blueprint $table) {
            $table->dropColumn('images');
        });
    }
};
