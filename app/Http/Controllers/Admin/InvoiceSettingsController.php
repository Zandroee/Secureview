<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\InvoiceSetting;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

class InvoiceSettingsController extends Controller
{
    public function index(): Response
    {
        $settings = $this->settings();

        return Inertia::render('Admin/InvoiceSettings', [
            'settings' => $settings->only([
                'business_name',
                'registered_name',
                'address',
                'email',
                'phone',
                'tin',
                'vat_status',
                'branch_code',
                'bir_permit_number',
                'bir_atp_number',
                'serial_number_range',
                'invoice_number_prefix',
                'first_invoice_number',
                'last_invoice_number',
                'next_invoice_number',
                'invoice_number_padding',
                'pti_einvoice_number',
                'eis_certification_reference',
                'updated_at',
            ]),
            'series_ready' => $this->seriesReady($settings),
            'profile_ready' => $this->profileReady($settings),
        ]);
    }

    public function update(Request $request): RedirectResponse
    {
        $settings = $this->settings();

        $validated = $request->validate([
            'business_name' => ['nullable', 'string', 'max:255'],
            'registered_name' => ['nullable', 'string', 'max:255'],
            'address' => ['nullable', 'string', 'max:1000'],
            'email' => ['nullable', 'email', 'max:255'],
            'phone' => ['nullable', 'string', 'max:40'],
            'tin' => ['nullable', 'string', 'max:80'],
            'vat_status' => ['required', 'in:not_configured,vat,non_vat'],
            'branch_code' => ['nullable', 'string', 'max:10'],
            'bir_permit_number' => ['nullable', 'string', 'max:120'],
            'bir_atp_number' => ['nullable', 'string', 'max:120'],
            'serial_number_range' => ['nullable', 'string', 'max:160'],
            'invoice_number_prefix' => ['nullable', 'string', 'max:40'],
            'first_invoice_number' => ['nullable', 'integer', 'min:1', 'max:999999999999999'],
            'last_invoice_number' => ['nullable', 'integer', 'min:1', 'max:999999999999999'],
            'invoice_number_padding' => ['required', 'integer', 'min:1', 'max:12'],
            'pti_einvoice_number' => ['nullable', 'string', 'max:120'],
            'eis_certification_reference' => ['nullable', 'string', 'max:160'],
        ]);

        $first = $validated['first_invoice_number'] ?? null;
        $last = $validated['last_invoice_number'] ?? null;
        if (($first === null) !== ($last === null)) {
            throw ValidationException::withMessages([
                'last_invoice_number' => 'Enter both the first and last serial numbers in the authorized invoice series.',
            ]);
        }

        if ($first !== null && $last !== null && $last < $first) {
            throw ValidationException::withMessages([
                'last_invoice_number' => 'The last serial number must be greater than or equal to the first serial number.',
            ]);
        }

        if (filled($validated['invoice_number_prefix'] ?? null) && $first === null) {
            throw ValidationException::withMessages([
                'first_invoice_number' => 'Set both ends of the authorized invoice series when configuring a number prefix.',
            ]);
        }

        $previousFirst = $settings->first_invoice_number;
        $nextNumber = $settings->next_invoice_number;
        $seriesHasStarted = $previousFirst !== null
            && $nextNumber !== null
            && $nextNumber > $previousFirst;

        if ($seriesHasStarted && $first !== null) {
            if ($first !== $previousFirst || $last < $nextNumber) {
                throw ValidationException::withMessages([
                    'first_invoice_number' => 'The configured series cannot be reset or shortened after numbers have been reserved. Preserve the existing range and extend it through an approved series if needed.',
                ]);
            }
        }

        $settings->fill($validated);
        $settings->updated_by = $request->user()->id;

        // No numbers are issued by this setup page. Until the future issuance
        // workflow consumes a serial, keep the next number aligned with the
        // first number configured by the administrator.
        if (!$seriesHasStarted) {
            $settings->next_invoice_number = $first;
        }

        $settings->save();

        return back()->with('success', 'Invoice profile settings saved.');
    }

    private function settings(): InvoiceSetting
    {
        return InvoiceSetting::query()->firstOrCreate(
            ['id' => 1],
            [
                'business_name' => config('invoice.business_name', 'SecureView'),
                'registered_name' => config('invoice.registered_name'),
                'address' => config('invoice.address'),
                'email' => config('invoice.email'),
                'phone' => config('invoice.phone'),
                'tin' => config('invoice.tin'),
                'vat_status' => config('invoice.vat_status', 'not_configured'),
                'branch_code' => config('invoice.branch_code'),
                'bir_permit_number' => config('invoice.bir_permit_number'),
                'bir_atp_number' => config('invoice.bir_atp_number'),
                'serial_number_range' => config('invoice.serial_number_range'),
                'invoice_number_padding' => 6,
            ]
        );
    }

    private function profileReady(InvoiceSetting $settings): bool
    {
        return filled($settings->business_name)
            && filled($settings->registered_name)
            && filled($settings->address)
            && filled($settings->tin)
            && in_array($settings->vat_status, ['vat', 'non_vat'], true)
            && filled($settings->branch_code);
    }

    private function seriesReady(InvoiceSetting $settings): bool
    {
        return filled($settings->invoice_number_prefix)
            && $settings->first_invoice_number !== null
            && $settings->last_invoice_number !== null
            && $settings->last_invoice_number >= $settings->first_invoice_number
            && filled($settings->bir_atp_number)
            && filled($settings->serial_number_range);
    }
}
