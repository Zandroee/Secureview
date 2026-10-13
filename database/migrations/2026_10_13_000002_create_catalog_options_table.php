<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('catalog_options', function (Blueprint $table) {
            $table->id();
            $table->string('field', 20);
            $table->string('value', 120);
            $table->timestamps();
            $table->unique(['field', 'value']);
        });

        foreach (['products', 'packages'] as $table) {
            foreach (['category', 'warranty', 'badge'] as $field) {
                $values = DB::table($table)
                    ->whereNotNull($field)
                    ->where($field, '!=', '')
                    ->distinct()
                    ->pluck($field);

                foreach ($values as $value) {
                    $value = trim((string) $value);

                    if ($value !== '') {
                        DB::table('catalog_options')->insertOrIgnore([
                            'field' => $field,
                            'value' => $value,
                            'created_at' => now(),
                            'updated_at' => now(),
                        ]);
                    }
                }
            }
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('catalog_options');
    }
};
