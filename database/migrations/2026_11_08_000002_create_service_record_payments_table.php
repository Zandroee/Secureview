<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('service_record_payments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('service_record_id')->constrained('service_records')->restrictOnDelete();
            $table->decimal('amount', 12, 2);
            $table->string('payment_method', 24)->nullable();
            $table->string('reference', 120)->nullable();
            $table->text('notes')->nullable();
            $table->timestamp('paid_at')->nullable();
            $table->foreignId('recorded_by_user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->boolean('is_legacy_import')->default(false);
            $table->timestamps();

            $table->index(['service_record_id', 'paid_at']);
        });

        // Earlier versions stored only a cumulative amount on service_records.
        // Preserve that balance as one explicitly identified legacy entry. The
        // original individual receipts cannot be reconstructed from that field.
        DB::table('service_records')
            ->where('amount_paid', '>', 0)
            ->orderBy('id')
            ->chunkById(200, function ($records) {
                foreach ($records as $record) {
                    $timestamp = $record->paid_at ?: ($record->updated_at ?: now()->toDateTimeString());

                    DB::table('service_record_payments')->insert([
                        'service_record_id' => $record->id,
                        'amount' => $record->amount_paid,
                        'payment_method' => $record->payment_method,
                        'reference' => null,
                        'notes' => 'Legacy cumulative balance imported during the service payment ledger migration. Original individual receipts were not available.',
                        'paid_at' => $timestamp,
                        'recorded_by_user_id' => null,
                        'is_legacy_import' => true,
                        'created_at' => now(),
                        'updated_at' => now(),
                    ]);
                }
            });
    }

    public function down(): void
    {
        if (DB::table('service_record_payments')->exists()) {
            throw new RuntimeException(
                'Cannot roll back the service payment ledger while payment history exists. Export or deliberately migrate the payment records first.'
            );
        }

        Schema::dropIfExists('service_record_payments');
    }
};
