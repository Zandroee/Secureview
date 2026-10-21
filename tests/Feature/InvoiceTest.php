<?php

namespace Tests\Feature;

use App\Models\Order;
use App\Models\InvoiceSetting;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class InvoiceTest extends TestCase
{
    use RefreshDatabase;

    public function test_customer_can_view_an_invoice_preview_for_their_own_order(): void
    {
        $customer = User::factory()->create([
            'role' => 'user',
            'email_verified_at' => now(),
        ]);
        $order = $this->createOrder($customer);

        $this->actingAs($customer)
            ->get(route('purchases.invoice', $order))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('invoice')
                ->where('invoice.reference_number', $order->order_number)
                ->where('invoice.is_paid', false)
                ->where('invoice.total', 1500)
                ->where('invoice.amount_paid', 0)
                ->where('invoice.balance_due', 1500)
                ->where('invoice.viewer_role', 'customer')
                ->has('invoice.items', 1)
                ->where('invoice.items.0.name', 'Test Camera')
                ->where('invoice.items.0.quantity', 2)
                ->where('invoice.items.0.unit_price', 750)
            );
    }

    public function test_customer_cannot_view_another_customers_invoice(): void
    {
        $owner = User::factory()->create([
            'role' => 'user',
            'email_verified_at' => now(),
        ]);
        $otherCustomer = User::factory()->create([
            'role' => 'user',
            'email_verified_at' => now(),
        ]);
        $order = $this->createOrder($owner);

        $this->actingAs($otherCustomer)
            ->get(route('purchases.invoice', $order))
            ->assertNotFound();
    }

    public function test_admin_can_view_invoice_and_paid_order_shows_zero_balance(): void
    {
        $admin = User::factory()->create([
            'role' => 'admin',
            'email_verified_at' => now(),
        ]);
        $customer = User::factory()->create([
            'role' => 'user',
            'email_verified_at' => now(),
        ]);
        $order = $this->createOrder($customer);
        $order->update([
            'payment_status' => 'paid',
            'order_status' => 'processing',
            'paid_at' => now(),
        ]);

        $this->actingAs($admin)
            ->get(route('admin.purchases.invoice', $order))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('invoice')
                ->where('invoice.reference_number', $order->order_number)
                ->where('invoice.is_paid', true)
                ->where('invoice.amount_paid', 1500)
                ->where('invoice.balance_due', 0)
                ->where('invoice.viewer_role', 'admin'));
    }

    private function createOrder(User $customer): Order
    {
        $order = Order::create([
            'user_id' => $customer->id,
            'order_number' => 'SV-INVOICE-' . uniqid(),
            'subtotal' => 1500,
            'installation_fee' => 0,
            'shipping_fee' => 0,
            'total' => 1500,
            'payment_method' => 'cash',
            'payment_status' => 'pending',
            'order_status' => 'pending',
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

    public function test_invoice_preview_uses_saved_business_profile_settings(): void
    {
        $customer = User::factory()->create([
            'role' => 'user',
            'email_verified_at' => now(),
        ]);
        $order = $this->createOrder($customer);

        InvoiceSetting::create([
            'id' => 1,
            'business_name' => 'SecureView CCTV',
            'registered_name' => 'SecureView Demo Trading',
            'address' => '456 Registered Address, Taguig City',
            'email' => 'billing@example.test',
            'phone' => '02-8000-0000',
            'tin' => '000-000-000-000',
            'vat_status' => 'non_vat',
            'branch_code' => '000',
            'bir_atp_number' => 'DEMO-ATP',
            'serial_number_range' => 'DEMO-000001 to DEMO-000999',
            'invoice_number_padding' => 6,
        ]);

        $this->actingAs($customer)
            ->get(route('purchases.invoice', $order))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('invoice')
                ->where('invoice.business.name', 'SecureView CCTV')
                ->where('invoice.business.registered_name', 'SecureView Demo Trading')
                ->where('invoice.business.vat_status', 'non_vat')
                ->where('invoice.business.bir_atp_number', 'DEMO-ATP'));
    }

}
