<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Restore feature tables that are recorded as migrated but are absent
     * from some deployed databases. Every creation is guarded so this is
     * safe on environments where the tables already exist.
     */
    public function up(): void
    {
        if (!Schema::hasColumn('order_items', 'warranty_period')) {
            Schema::table('order_items', function (Blueprint $table) {
                $table->string('warranty_period')->nullable()->after('name');
            });
        }

        if (!Schema::hasTable('pending_inquiry_checkouts')) {
            Schema::create('pending_inquiry_checkouts', function (Blueprint $table) {
                $table->id();
                $table->foreignId('user_id')->constrained()->cascadeOnDelete();
                $table->foreignId('order_id')->unique()->constrained()->cascadeOnDelete();
                $table->json('payload');
                $table->string('status')->default('pending_payment')->index();
                $table->foreignId('inquiry_id')->nullable()->constrained('inquiries')->nullOnDelete();
                $table->timestamps();
            });
        }

        if (!Schema::hasTable('order_events')) {
            Schema::create('order_events', function (Blueprint $table) {
                $table->id();
                $table->foreignId('order_id')->constrained()->cascadeOnDelete();
                $table->foreignId('actor_user_id')->nullable()->constrained('users')->nullOnDelete();
                $table->string('event_key', 80);
                $table->string('title', 160);
                $table->text('description')->nullable();
                $table->string('payment_status_before')->nullable();
                $table->string('payment_status_after')->nullable();
                $table->string('order_status_before')->nullable();
                $table->string('order_status_after')->nullable();
                $table->json('metadata')->nullable();
                $table->timestamps();

                $table->index(['order_id', 'created_at']);
                $table->index('event_key');
            });
        }

        if (!Schema::hasTable('invoice_settings')) {
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

        if (!Schema::hasTable('invoice_records')) {
            $tableCreated = false;

            Schema::create('invoice_records', function (Blueprint $table) use (&$tableCreated) {
                $table->id();
                $table->foreignId('order_id')->unique()->constrained()->restrictOnDelete();
                $table->string('record_number', 80)->unique();
                $table->json('snapshot');
                $table->timestamp('issued_at');
                $table->foreignId('issued_by')->nullable()->constrained('users')->nullOnDelete();
                $table->timestamps();

                $table->index('issued_at');
                $tableCreated = true;
            });
        }

        if (!Schema::hasTable('warranty_claims')) {
            Schema::create('warranty_claims', function (Blueprint $table) {
                $table->id();
                $table->foreignId('user_id')->constrained()->cascadeOnDelete();
                $table->foreignId('order_id')->constrained()->cascadeOnDelete();
                $table->foreignId('order_item_id')->constrained()->cascadeOnDelete();
                $table->string('claim_number')->unique();
                $table->text('issue_description');
                $table->string('status')->default('submitted');
                $table->text('admin_notes')->nullable();
                $table->timestamp('reviewed_at')->nullable();
                $table->timestamp('resolved_at')->nullable();
                $table->timestamps();

                $table->index(['status', 'created_at']);
                $table->index(['user_id', 'created_at']);
            });
        }
    }

    /**
     * Intentionally leave repaired tables intact on rollback to prevent
     * accidental deletion of production records created after repair.
     */
    public function down(): void
    {
        // Non-destructive repair migration; no automatic rollback.
    }
};
