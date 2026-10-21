<?php

namespace App\Http\Controllers;

use App\Models\Order;
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
