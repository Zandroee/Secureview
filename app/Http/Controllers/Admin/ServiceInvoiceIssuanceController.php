<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\InvoiceRecord;
use App\Models\InvoiceSetting;
use App\Models\ServiceRecord;
use App\Services\AdminActivityLogger;
use App\Services\InvoiceDocumentService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class ServiceInvoiceIssuanceController extends Controller
{
    public function store(
        Request $request,
        ServiceRecord $serviceRecord,
        InvoiceDocumentService $documents,
        AdminActivityLogger $activityLogger
    ) {
        $result = DB::transaction(function () use ($request, $serviceRecord, $documents) {
            $lockedRecord = ServiceRecord::query()
                ->with(['inquiry', 'technician', 'items'])
                ->whereKey($serviceRecord->getKey())
                ->lockForUpdate()
                ->firstOrFail();

            $existing = InvoiceRecord::query()
                ->where('service_record_id', $lockedRecord->id)
                ->lockForUpdate()
                ->first();

            if ($existing) {
                return ['record' => $existing, 'created' => false];
            }

            if ($lockedRecord->inquiry?->status !== 'completed') {
                throw ValidationException::withMessages([
                    'invoice' => 'A service invoice can only be issued after the service and Post-Service Record are completed.',
                ]);
            }

            $settings = InvoiceSetting::query()->find(1);
            if (!$documents->profileReady($settings)) {
                throw ValidationException::withMessages([
                    'invoice' => 'Complete the seller business profile in Invoice Settings before saving a permanent service invoice record.',
                ]);
            }

            $issuedAt = now();
            $recordNumber = sprintf('SV-INT-SVC-INV-%s-%08d', $issuedAt->format('Y'), $lockedRecord->id);
            $snapshot = $documents->buildServiceSnapshot($lockedRecord);
            $snapshot['record_number'] = $recordNumber;
            $snapshot['record_issued_at'] = $issuedAt->format('F j, Y h:i A');

            $record = InvoiceRecord::create([
                'order_id' => null,
                'service_record_id' => $lockedRecord->id,
                'record_number' => $recordNumber,
                'snapshot' => $snapshot,
                'issued_at' => $issuedAt,
                'issued_by' => $request->user()->id,
            ]);

            return ['record' => $record, 'created' => true];
        });

        if ($result['created']) {
            $activityLogger->record(
                $request,
                'service_invoice_recorded',
                'Saved internal service invoice ' . $result['record']->record_number . ' for service record #' . $serviceRecord->id . '.',
                $serviceRecord,
                [],
                ['status' => 'recorded']
            );
        }

        return back()->with(
            'success',
            $result['created']
                ? 'Internal service invoice saved. Its original charges are preserved and it can be printed again later.'
                : 'This Post-Service Record already has an invoice. Its saved snapshot was left unchanged.'
        );
    }

    public function updatePayment(Request $request, ServiceRecord $serviceRecord, InvoiceDocumentService $documents)
    {
        $serviceRecord->loadMissing(['inquiry', 'items']);
        $total = (float) $documents->buildServiceSnapshot($serviceRecord)['total'];

        $validated = $request->validate([
            'amount_paid' => ['required', 'numeric', 'min:0', 'max:' . number_format($total, 2, '.', '')],
            'payment_method' => ['required', 'in:cash,gcash,card,maya'],
        ]);

        $amountPaid = round((float) $validated['amount_paid'], 2);
        $status = $amountPaid <= 0 ? 'pending' : ($amountPaid >= $total ? 'paid' : 'partially_paid');

        $serviceRecord->update([
            'amount_paid' => $amountPaid,
            'payment_method' => $amountPaid > 0 ? $validated['payment_method'] : null,
            'payment_status' => $status,
            'paid_at' => $status === 'paid' ? ($serviceRecord->paid_at ?? now()) : null,
        ]);

        return back()->with('success', 'Service payment record updated. Current status: ' . str_replace('_', ' ', $status) . '.');
    }
}
