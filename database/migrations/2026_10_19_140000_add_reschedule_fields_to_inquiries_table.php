<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('inquiries', function (Blueprint $table) {
            $table->date('reschedule_requested_date')->nullable()->after('preferred_date');
            $table->string('reschedule_requested_time')->nullable()->after('preferred_time');
            $table->string('reschedule_request_status')->default('none')->after('reschedule_requested_time');
            $table->text('reschedule_request_note')->nullable()->after('reschedule_request_status');
            $table->timestamp('reschedule_requested_at')->nullable()->after('reschedule_request_note');
        });
    }

    public function down(): void
    {
        Schema::table('inquiries', function (Blueprint $table) {
            $table->dropColumn([
                'reschedule_requested_date',
                'reschedule_requested_time',
                'reschedule_request_status',
                'reschedule_request_note',
                'reschedule_requested_at',
            ]);
        });
    }
};
