<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('inquiries', function (Blueprint $table) {
            $table->string('address_details', 500)->nullable()->after('street_address');
            $table->decimal('service_latitude', 10, 7)->nullable()->after('city');
            $table->decimal('service_longitude', 10, 7)->nullable()->after('service_latitude');
            $table->string('google_place_id', 255)->nullable()->after('service_longitude')->index();
        });
    }

    public function down(): void
    {
        Schema::table('inquiries', function (Blueprint $table) {
            $table->dropIndex(['google_place_id']);
            $table->dropColumn([
                'address_details',
                'service_latitude',
                'service_longitude',
                'google_place_id',
            ]);
        });
    }
};
