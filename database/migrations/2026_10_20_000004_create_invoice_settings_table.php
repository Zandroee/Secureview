<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('invoice_settings', function (Blueprint $table) {
            $table->id();
            $table->string('business_name')->nullable();
            $table->string('registered_name')->nullable();
            $table->text('address')->nullable();
            $table->string('email')->nullable();
            $table->string('phone', 40)->nullable();
            $table->string('tin', 80)->nullable();
            $table->string('vat_status', 30)->default('not_configured');
            $table->string('branch_code', 10)->nullable();
            $table->string('bir_permit_number', 120)->nullable();
            $table->string('bir_atp_number', 120)->nullable();
            $table->string('serial_number_range', 160)->nullable();
            $table->string('invoice_number_prefix', 40)->nullable();
            $table->unsignedBigInteger('first_invoice_number')->nullable();
            $table->unsignedBigInteger('last_invoice_number')->nullable();
            $table->unsignedBigInteger('next_invoice_number')->nullable();
            $table->unsignedTinyInteger('invoice_number_padding')->default(6);
            $table->string('pti_einvoice_number', 120)->nullable();
            $table->string('eis_certification_reference', 160)->nullable();
            $table->foreignId('updated_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('invoice_settings');
    }
};
