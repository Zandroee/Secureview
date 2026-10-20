<?php

namespace Tests\Feature;

use App\Models\InvoiceSetting;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class InvoiceSettingsTest extends TestCase
{
    use RefreshDatabase;

    public function test_only_admin_can_open_invoice_settings(): void
    {
        $customer = User::factory()->create([
            'role' => 'user',
            'email_verified_at' => now(),
        ]);

        $this->actingAs($customer)
            ->get(route('admin.invoice-settings.index'))
            ->assertForbidden();
    }

    public function test_admin_can_save_business_profile_and_authorized_invoice_series(): void
    {
        $admin = User::factory()->create([
            'role' => 'admin',
            'email_verified_at' => now(),
        ]);

        $this->actingAs($admin)
            ->patch(route('admin.invoice-settings.update'), [
                'business_name' => 'SecureView',
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
                'first_invoice_number' => '1',
                'last_invoice_number' => '999',
                'invoice_number_padding' => '6',
                'pti_einvoice_number' => '',
                'eis_certification_reference' => '',
            ])
            ->assertRedirect()
            ->assertSessionHas('success', 'Invoice profile settings saved.');

        $this->assertDatabaseHas('invoice_settings', [
            'id' => 1,
            'registered_name' => 'SecureView Test Company',
            'vat_status' => 'non_vat',
            'invoice_number_prefix' => 'TEST-',
            'first_invoice_number' => 1,
            'last_invoice_number' => 999,
            'next_invoice_number' => 1,
            'updated_by' => $admin->id,
        ]);
    }

    public function test_invoice_series_rejects_a_last_number_below_the_first_number(): void
    {
        $admin = User::factory()->create([
            'role' => 'admin',
            'email_verified_at' => now(),
        ]);

        $this->actingAs($admin)
            ->from(route('admin.invoice-settings.index'))
            ->patch(route('admin.invoice-settings.update'), [
                'vat_status' => 'not_configured',
                'invoice_number_prefix' => 'TEST-',
                'first_invoice_number' => '200',
                'last_invoice_number' => '100',
                'invoice_number_padding' => '6',
            ])
            ->assertSessionHasErrors('last_invoice_number');
    }

    public function test_admin_invoice_settings_page_exposes_profile_and_series_status(): void
    {
        $admin = User::factory()->create([
            'role' => 'admin',
            'email_verified_at' => now(),
        ]);

        $this->actingAs($admin)
            ->get(route('admin.invoice-settings.index'))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('Admin/InvoiceSettings')
                ->where('profile_ready', false)
                ->where('series_ready', false)
                ->has('settings'));
    }

    public function test_next_number_tracks_a_new_start_before_any_invoices_are_issued(): void
    {
        $admin = User::factory()->create([
            'role' => 'admin',
            'email_verified_at' => now(),
        ]);

        $this->actingAs($admin)->patch(route('admin.invoice-settings.update'), [
            'business_name' => 'SecureView',
            'vat_status' => 'non_vat',
            'invoice_number_prefix' => 'SERIES-A-',
            'first_invoice_number' => '100',
            'last_invoice_number' => '199',
            'invoice_number_padding' => '6',
        ])->assertRedirect();

        $this->assertDatabaseHas('invoice_settings', [
            'first_invoice_number' => 100,
            'last_invoice_number' => 199,
            'next_invoice_number' => 100,
        ]);

        $this->actingAs($admin)->patch(route('admin.invoice-settings.update'), [
            'business_name' => 'SecureView',
            'vat_status' => 'non_vat',
            'invoice_number_prefix' => 'SERIES-B-',
            'first_invoice_number' => '500',
            'last_invoice_number' => '599',
            'invoice_number_padding' => '6',
        ])->assertRedirect();

        $this->assertDatabaseHas('invoice_settings', [
            'first_invoice_number' => 500,
            'last_invoice_number' => 599,
            'next_invoice_number' => 500,
        ]);
    }

}
