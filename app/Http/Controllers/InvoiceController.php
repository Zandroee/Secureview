<?php

namespace App\Http\Controllers;

use App\Models\Order;
use App\Models\ServiceRecord;
use App\Services\InvoiceDocumentService;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class InvoiceController extends Controller
{
    public function customer(
        Request $request,
        Order $order,
        InvoiceDocumentService $documents
    ): Response {
        abort_unless((int) $order->user_id === (int) $request->user()->id, 404);

        return $this->renderInvoice($order, false, $documents);
    }

    public function admin(
        Request $request,
        Order $order,
        InvoiceDocumentService $documents
    ): Response {
        abort_unless($request->user()?->isAdmin(), 403);

        return $this->renderInvoice($order, true, $documents);
    }

    public function customerService(
        Request $request,
        ServiceRecord $serviceRecord,
        InvoiceDocumentService $documents
    ): Response {
        $serviceRecord->loadMissing('inquiry');
        abort_unless((int) $serviceRecord->inquiry?->user_id === (int) $request->user()->id, 404);
        abort_unless($serviceRecord->invoiceRecord()->exists(), 404);

        return $this->renderServiceInvoice($serviceRecord, false, $documents);
    }

    public function adminService(
        Request $request,
        ServiceRecord $serviceRecord,
        InvoiceDocumentService $documents
    ): Response {
        abort_unless($request->user()?->isAdmin(), 403);

        return $this->renderServiceInvoice($serviceRecord, true, $documents);
    }

    private function renderServiceInvoice(
        ServiceRecord $serviceRecord,
        bool $isAdmin,
        InvoiceDocumentService $documents
    ): Response {
        $serviceRecord->loadMissing([
            'inquiry',
            'technician',
            'items',
            'invoiceRecord',
            'payments.recordedBy',
        ]);

        if ($serviceRecord->invoiceRecord) {
            $invoice = $serviceRecord->invoiceRecord->snapshot ?? $documents->buildServiceSnapshot($serviceRecord);
            $invoice['record_number'] = $serviceRecord->invoiceRecord->record_number;
            $invoice['record_issued_at'] = $serviceRecord->invoiceRecord->issued_at?->format('F j, Y h:i A');
            $invoice['is_recorded'] = true;
        } else {
            $invoice = $documents->buildServiceSnapshot($serviceRecord);
            $invoice['record_number'] = null;
            $invoice['record_issued_at'] = null;
            $invoice['is_recorded'] = false;
        }

        // Charge lines are taken from the immutable invoice snapshot. Payment
        // progress is live and comes from the append-only payment ledger.
        $totalCents = (int) round((float) $invoice['total'] * 100);
        $amountPaidCents = (int) round((float) $serviceRecord->payments->sum('amount') * 100);
        $amountPaidCents = min($totalCents, max(0, $amountPaidCents));
        $invoice['payment_status'] = $totalCents <= 0 || $amountPaidCents >= $totalCents
            ? 'paid'
            : ($amountPaidCents <= 0 ? 'pending' : 'partially_paid');
        $invoice['payment_method'] = $serviceRecord->payments->last()?->payment_method
            ?? $serviceRecord->payment_method;
        $invoice['amount_paid'] = $amountPaidCents / 100;
        $invoice['balance_due'] = max(0, $totalCents - $amountPaidCents) / 100;
        $invoice['is_paid'] = $amountPaidCents >= $totalCents;
        $invoice['paid_at'] = $serviceRecord->paid_at?->format('F j, Y h:i A');
        $invoice['payments'] = $serviceRecord->payments
            ->map(fn ($payment) => [
                'id' => $payment->id,
                'amount' => (float) $payment->amount,
                'payment_method' => $payment->payment_method,
                'reference' => $payment->reference,
                'notes' => $payment->notes,
                'paid_at' => $payment->paid_at?->format('M d, Y h:i A'),
                'recorded_by' => $payment->recordedBy?->name
                    ?? ($payment->is_legacy_import ? 'Historical balance (legacy import)' : 'Staff account unavailable'),
                'is_legacy_import' => (bool) $payment->is_legacy_import,
            ])
            ->values()
            ->all();
        $invoice['viewer_role'] = $isAdmin ? 'admin' : 'customer';

        return Inertia::render('invoice', [
            'invoice' => $invoice,
        ]);
    }

    private function renderInvoice(
        Order $order,
        bool $isAdmin,
        InvoiceDocumentService $documents
    ): Response {
        $order->loadMissing(['items', 'user', 'invoiceRecord']);

        if ($order->invoiceRecord) {
            // The saved snapshot is authoritative for a recorded document:
            // edits to the order or seller profile must not rewrite its history.
            $invoice = $order->invoiceRecord->snapshot ?? $documents->buildSnapshot($order);
            $invoice['record_number'] = $order->invoiceRecord->record_number;
            $invoice['record_issued_at'] = $order->invoiceRecord->issued_at?->format('F j, Y h:i A');
            $invoice['is_recorded'] = true;
        } else {
            $invoice = $documents->buildSnapshot($order);
            $invoice['record_number'] = null;
            $invoice['record_issued_at'] = null;
            $invoice['is_recorded'] = false;
        }

        $invoice['viewer_role'] = $isAdmin ? 'admin' : 'customer';

        return Inertia::render('invoice', [
            'invoice' => $invoice,
        ]);
    }
}
