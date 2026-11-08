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

    public function updatePayment(
        Request $request,
        ServiceRecord $serviceRecord,
        InvoiceDocumentService $documents,
        AdminActivityLogger $activityLogger
    ) {
        $validated = $request->validate([
            'payment_amount' => ['required', 'numeric', 'gt:0', 'max:1000000'],
            'payment_method' => ['required', 'in:cash,gcash,card,maya'],
            'reference' => ['nullable', 'string', 'max:120'],
            'notes' => ['nullable', 'string', 'max:1000'],
        ]);

        $result = DB::transaction(function () use ($request, $serviceRecord, $documents, $validated) {
            $lockedRecord = ServiceRecord::query()
                ->with(['inquiry', 'technician', 'items'])
                ->whereKey($serviceRecord->getKey())
                ->lockForUpdate()
                ->firstOrFail();

            if ($lockedRecord->inquiry?->status !== 'completed') {
                throw ValidationException::withMessages([
                    'payment_amount' => 'Payments can only be recorded for a completed service.',
                ]);
            }

            if (!$lockedRecord->invoiceRecord()->exists()) {
                throw ValidationException::withMessages([
                    'payment_amount' => 'Issue the service invoice before recording a payment.',
                ]);
            }

            $totalCents = (int) round((float) $documents->buildServiceSnapshot($lockedRecord)['total'] * 100);
            $paidCents = (int) round((float) $lockedRecord->payments()->sum('amount') * 100);
            $paymentCents = (int) round((float) $validated['payment_amount'] * 100);
            $balanceCents = max(0, $totalCents - $paidCents);

            if ($paymentCents > $balanceCents) {
                throw ValidationException::withMessages([
                    'payment_amount' => 'The payment exceeds the remaining balance of ₱' . number_format($balanceCents / 100, 2) . '.',
                ]);
            }

            $payment = $lockedRecord->payments()->create([
                'amount' => number_format($paymentCents / 100, 2, '.', ''),
                'payment_method' => $validated['payment_method'],
                'reference' => filled($validated['reference'] ?? null) ? trim($validated['reference']) : null,
                'notes' => filled($validated['notes'] ?? null) ? trim($validated['notes']) : null,
                'paid_at' => now(),
                'recorded_by_user_id' => $request->user()->id,
                'is_legacy_import' => false,
            ]);

            $newPaidCents = $paidCents + $paymentCents;
            $status = $newPaidCents <= 0
                ? 'pending'
                : ($newPaidCents >= $totalCents ? 'paid' : 'partially_paid');

            $lockedRecord->update([
                'amount_paid' => number_format($newPaidCents / 100, 2, '.', ''),
                'payment_method' => $payment->payment_method,
                'payment_status' => $status,
                'paid_at' => $status === 'paid' ? $payment->paid_at : null,
            ]);

            return [
                'payment' => $payment,
                'amount_paid' => $newPaidCents / 100,
                'balance_due' => max(0, $totalCents - $newPaidCents) / 100,
                'status' => $status,
            ];
        });

        $activityLogger->record(
            $request,
            'service_payment_recorded',
            'Recorded a ₱' . number_format((float) $result['payment']->amount, 2) . ' ' . strtoupper($result['payment']->payment_method)
                . ' payment for service record #' . $serviceRecord->id . '. New balance: ₱' . number_format($result['balance_due'], 2) . '.',
            $serviceRecord,
            [],
            ['status' => $result['status']]
        );

        return back()->with(
            'success',
            'Payment of ₱' . number_format((float) $result['payment']->amount, 2)
                . ' recorded. Total paid: ₱' . number_format($result['amount_paid'], 2)
                . '; balance due: ₱' . number_format($result['balance_due'], 2) . '.'
        );
    }
}
