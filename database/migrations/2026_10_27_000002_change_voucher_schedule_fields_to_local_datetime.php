<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        $this->changeScheduleColumnTypes(toTimestamp: false);
    }

    public function down(): void
    {
        $this->changeScheduleColumnTypes(toTimestamp: true);
    }

    /**
     * Voucher schedules are Manila-local wall-clock values from datetime-local inputs.
     *
     * The earlier migration used TIMESTAMP, which made MySQL apply connection-timezone
     * conversion to those wall-clock values. Force UTC while converting the old columns
     * so the text currently shown to administrators is preserved, then use DATETIME to
     * prevent future implicit timezone conversion.
     */
    private function changeScheduleColumnTypes(bool $toTimestamp): void
    {
        $connection = DB::connection();
        $driver = $connection->getDriverName();
        $isMysql = in_array($driver, ['mysql', 'mariadb'], true);
        $previousTimezone = null;

        if ($isMysql) {
            $timezoneResult = $connection->selectOne('SELECT @@session.time_zone AS timezone');
            $previousTimezone = (string) ($timezoneResult->timezone ?? 'SYSTEM');

            // Preserve the existing wall-clock fields while TIMESTAMP is converted to
            // DATETIME. This also makes the down migration deterministic.
            $connection->statement("SET SESSION time_zone = '+00:00'");
        }

        try {
            Schema::table('vouchers', function (Blueprint $table) use ($toTimestamp): void {
                if ($toTimestamp) {
                    $table->timestamp('starts_at')->nullable()->change();
                    $table->timestamp('expires_at')->nullable()->change();
                } else {
                    $table->dateTime('starts_at')->nullable()->change();
                    $table->dateTime('expires_at')->nullable()->change();
                }
            });
        } finally {
            if ($isMysql && $previousTimezone !== null) {
                $quotedTimezone = $connection->getPdo()->quote($previousTimezone);
                $connection->statement("SET SESSION time_zone = {$quotedTimezone}");
            }
        }
    }
};
