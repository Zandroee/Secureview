<?php

namespace Tests\Feature;

use App\Models\InvoiceRecord;
use App\Models\InvoiceSetting;
use App\Models\Order;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class InvoiceIssuanceTest extends TestCase
{
    use RefreshDatabase;

    public function test_admin_can_save_an_immutable_internal_invoice_record(): void
    {
        $admin = User::factory()->create([
            'role' => 'admin',
            'email_verified_at' => now(),
        ]);
        $customer = User::factory()->create([
            'role' => 'user',
            'email_verified_at' => now(),
        ]);
        $order = $this->createPaidOrder($customer);
        $this->createReadyProfile();

        $this->actingAs($admin)
            ->post(route('admin.purchases.invoice-record.store', $order))
            ->assertRedirect()
            ->assertSessionHas('success', 'Internal invoice record saved. The snapshot is now preserved and can be printed again later.');

        $record = InvoiceRecord::query()->where('order_id', $order->id)->firstOrFail();

        $this->assertMatchesRegularExpression('/^SV-INT-INV-\d{4}-\d{8}$/', $record->record_number);
        $this->assertSame('SecureView CCTV', $record->snapshot['business']['name']);
        $this->assertSame('Test Camera', $record->snapshot['items'][0]['name']);
        $this->assertSame(1500.0, $record->snapshot['total']);
        $this->assertSame($admin->id, $record->issued_by);

        // Saving an internal record must never consume the authorized BIR
        // serial range configured for a future, separately-compliant issuer.
        $this->assertDatabaseHas('invoice_settings', [
            'id' => 1,
            'next_invoice_number' => 100,
        ]);

        $order->update(['total' => 2500, 'subtotal' => 2500]);
        $order->items()->first()->update([
            'name' => 'Changed Camera Name',
            'price' => 1250,
            'subtotal' => 2500,
        ]);
        InvoiceSetting::query()->whereKey(1)->update(['business_name' => 'Changed Business Name']);

        $this->actingAs($customer)
            ->get(route('purchases.invoice', $order))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('invoice')
                ->where('invoice.is_recorded', true)
                ->where('invoice.record_number', $record->record_number)
                ->where('invoice.total', 1500)
                ->where('invoice.items.0.name', 'Test Camera')
                ->where('invoice.business.name', 'SecureView CCTV'));
    }

    public function test_admin_cannot_save_an_invoice_record_for_an_unpaid_order(): void
    {
        $admin = User::factory()->create([
            'role' => 'admin',
            'email_verified_at' => now(),
        ]);
        $customer = User::factory()->create([
            'role' => 'user',
            'email_verified_at' => now(),
        ]);
        $order = $this->createPaidOrder($customer);
        $order->update([
            'payment_status' => 'pending',
            'order_status' => 'awaiting_payment',
            'paid_at' => null,
        ]);
        $this->createReadyProfile();

        $this->actingAs($admin)
            ->from(route('admin.purchases.index'))
            ->post(route('admin.purchases.invoice-record.store', $order))
            ->assertSessionHasErrors('invoice');

        $this->assertDatabaseMissing('invoice_records', ['order_id' => $order->id]);
    }

    public function test_only_admin_can_save_an_internal_invoice_record(): void
    {
        $customer = User::factory()->create([
            'role' => 'user',
            'email_verified_at' => now(),
        ]);
        $order = $this->createPaidOrder($customer);
        $this->createReadyProfile();

        $this->actingAs($customer)
            ->post(route('admin.purchases.invoice-record.store', $order))
            ->assertForbidden();

        $this->assertDatabaseMissing('invoice_records', ['order_id' => $order->id]);
    }

    public function test_internal_invoice_record_cannot_be_saved_until_seller_profile_is_complete(): void
    {
        $admin = User::factory()->create([
            'role' => 'admin',
            'email_verified_at' => now(),
        ]);
        $customer = User::factory()->create([
            'role' => 'user',
            'email_verified_at' => now(),
        ]);
        $order = $this->createPaidOrder($customer);

        $this->actingAs($admin)
            ->from(route('admin.purchases.index'))
            ->post(route('admin.purchases.invoice-record.store', $order))
            ->assertSessionHasErrors('invoice');

        $this->assertDatabaseMissing('invoice_records', ['order_id' => $order->id]);
    }

    public function test_repeating_the_action_does_not_create_a_second_record_or_rewrite_the_snapshot(): void
    {
        $admin = User::factory()->create([
            'role' => 'admin',
            'email_verified_at' => now(),
        ]);
        $customer = User::factory()->create([
            'role' => 'user',
            'email_verified_at' => now(),
        ]);
        $order = $this->createPaidOrder($customer);
        $this->createReadyProfile();

        $this->actingAs($admin)
            ->post(route('admin.purchases.invoice-record.store', $order))
            ->assertRedirect();

        $record = InvoiceRecord::query()->where('order_id', $order->id)->firstOrFail();
        $order->update(['total' => 2100]);

        $this->actingAs($admin)
            ->post(route('admin.purchases.invoice-record.store', $order))
            ->assertRedirect()
            ->assertSessionHas('success', 'This order already has an internal invoice record. Its saved snapshot was left unchanged.');

        $this->assertSame(1, InvoiceRecord::query()->where('order_id', $order->id)->count());
        $this->assertSame(1500.0, $record->fresh()->snapshot['total']);
        $this->assertSame(1, $order->events()->where('event_key', 'internal_invoice_recorded')->count());
    }

    private function createPaidOrder(User $customer): Order
    {
        $order = Order::create([
            'user_id' => $customer->id,
            'order_number' => 'SV-ISSUE-' . uniqid(),
            'subtotal' => 1500,
            'installation_fee' => 0,
            'shipping_fee' => 0,
            'total' => 1500,
            'payment_method' => 'cash',
            'payment_status' => 'paid',
            'order_status' => 'processing',
            'paid_at' => now(),
            'customer_name' => $customer->name,
            'customer_phone' => '09171234567',
            'customer_email' => $customer->email,
            'delivery_address' => '123 Test Street, Taguig',
        ]);

        $order->items()->create([
            'name' => 'Test Camera',
            'purchasable_type' => 'App\\Models\\Product',
            'purchasable_id' => 1,
            'warranty_period' => '1 year',
            'price' => 750,
            'quantity' => 2,
            'subtotal' => 1500,
        ]);

        return $order;
    }

    private function createReadyProfile(): InvoiceSetting
    {
        return InvoiceSetting::create([
            'id' => 1,
            'business_name' => 'SecureView CCTV',
            'registered_name' => 'SecureView Test Company',
            'address' => '123 Test Street, Taguig City',
            'email' => 'billing@example.test',
            'phone' => '02-8000-0000',
            'tin' => '000-000-000-000',
            'vat_status' => 'non_vat',
            'branch_code' => '000',
            'bir_permit_number' => 'TEST-PERMIT',
            'bir_atp_number' => 'TEST-ATP',
            'serial_number_range' => 'TEST-000001 to TEST-000999',
            'invoice_number_prefix' => 'TEST-',
            'first_invoice_number' => 100,
            'last_invoice_number' => 999,
            'next_invoice_number' => 100,
            'invoice_number_padding' => 6,
        ]);
    }
}
