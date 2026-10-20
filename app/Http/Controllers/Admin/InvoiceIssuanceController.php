<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\InvoiceRecord;
use App\Models\InvoiceSetting;
use App\Models\Order;
use App\Services\AdminActivityLogger;
use App\Services\InvoiceDocumentService;
use Illuminate\Database\QueryException;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class InvoiceIssuanceController extends Controller
{
    public function store(
        Request $request,
        Order $order,
        InvoiceDocumentService $documents,
        AdminActivityLogger $activityLogger
    ): RedirectResponse {
        $result = DB::transaction(function () use ($request, $order, $documents) {
            // Lock the order before checking for an existing record so two
            // concurrent clicks cannot snapshot the same order twice.
            $lockedOrder = Order::query()
                ->with(['items', 'user'])
                ->whereKey($order->getKey())
                ->lockForUpdate()
                ->firstOrFail();

            $existing = InvoiceRecord::query()
                ->where('order_id', $lockedOrder->id)
                ->lockForUpdate()
                ->first();

            if ($existing) {
                return ['record' => $existing, 'created' => false];
            }

            $eligibleStatuses = ['processing', 'completed', 'delivered'];
            if (
                $lockedOrder->payment_status !== 'paid'
                || !in_array($lockedOrder->order_status, $eligibleStatuses, true)
            ) {
                throw ValidationException::withMessages([
                    'invoice' => 'An internal invoice record can only be saved for a paid order that is Processing or already completed.',
                ]);
            }

            $settings = InvoiceSetting::query()->find(1);
            if (!$documents->profileReady($settings)) {
                throw ValidationException::withMessages([
                    'invoice' => 'Complete the seller business profile in Invoice Settings before saving a permanent invoice record.',
                ]);
            }

            $issuedAt = now();
            // This is an internal archive reference. It does not consume or
            // replace a number from the BIR-authorized invoice series.
            $recordNumber = sprintf(
                'SV-INT-INV-%s-%08d',
                $issuedAt->format('Y'),
                $lockedOrder->id
            );

            $snapshot = $documents->buildSnapshot($lockedOrder);
            $snapshot['record_number'] = $recordNumber;
            $snapshot['record_issued_at'] = $issuedAt->format('F j, Y h:i A');

            $record = InvoiceRecord::create([
                'order_id' => $lockedOrder->id,
                'record_number' => $recordNumber,
                'snapshot' => $snapshot,
                'issued_at' => $issuedAt,
                'issued_by' => $request->user()->id,
            ]);

            $lockedOrder->events()->create([
                'actor_user_id' => $request->user()->id,
                'event_key' => 'internal_invoice_recorded',
                'title' => 'Internal invoice record saved',
                'description' => 'Saved immutable internal invoice record ' . $recordNumber . '. This is not a BIR-registered tax invoice and does not consume an authorized BIR serial number.',
                'payment_status_before' => $lockedOrder->payment_status,
                'payment_status_after' => $lockedOrder->payment_status,
                'order_status_before' => $lockedOrder->order_status,
                'order_status_after' => $lockedOrder->order_status,
                'metadata' => ['record_number' => $recordNumber],
            ]);

            return ['record' => $record, 'created' => true];
        });

        if ($result['created']) {
            $activityLogger->record(
                $request,
                'internal_invoice_recorded',
                'Saved internal invoice record ' . $result['record']->record_number . ' for order ' . $order->order_number . '.',
                $order,
                [],
                ['status' => 'recorded']
            );
        }

        return back()->with(
            'success',
            $result['created']
                ? 'Internal invoice record saved. The snapshot is now preserved and can be printed again later.'
                : 'This order already has an internal invoice record. Its saved snapshot was left unchanged.'
        );
    }
}
