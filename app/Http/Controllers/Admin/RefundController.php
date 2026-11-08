<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Refund;
use App\Services\AdminActivityLogger;
use App\Services\RefundService;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;

class RefundController extends Controller
{
    public function index(Request $request)
    {
        $filters = $request->validate([
            'search' => ['nullable', 'string', 'max:120'],
            'status' => ['nullable', 'in:pending,approved,processing,completed,rejected,failed,cancelled'],
            'source' => ['nullable', 'in:customer_request,business_cancellation'],
        ]);

        $query = Refund::query()
            ->with(['order.items', 'order.invoiceRecord', 'inquiry', 'customer', 'processor'])
            ->latest();

        if (!empty($filters['search'])) {
            $search = $filters['search'];
            $query->where(function ($builder) use ($search) {
                $builder->whereHas('order', fn ($order) => $order->where('order_number', 'like', '%' . $search . '%'))
                    ->orWhereHas('customer', fn ($customer) => $customer->where('name', 'like', '%' . $search . '%')->orWhere('email', 'like', '%' . $search . '%'))
                    ->orWhere('reason', 'like', '%' . $search . '%');
            });
        }

        if (!empty($filters['status'])) {
            $query->where('status', $filters['status']);
        }

        if (!empty($filters['source'])) {
            $query->where('source', $filters['source']);
        }

        $refunds = $query->paginate(15)->withQueryString()->through(function (Refund $refund) {
            return [
                'id' => $refund->id,
                'order_id' => $refund->order_id,
                'order_number' => $refund->order?->order_number,
                'order_total' => $refund->order ? (float) $refund->order->total : null,
                'order_subtotal' => $refund->order ? (float) $refund->order->subtotal : null,
                'order_discount' => $refund->order ? (float) $refund->order->discount_amount : null,
                'order_shipping_fee' => $refund->order ? (float) $refund->order->shipping_fee : null,
                'order_payment_method' => $refund->order?->payment_method,
                'order_payment_status' => $refund->order?->payment_status,
                'order_status' => $refund->order?->order_status,
                'order_address' => $refund->order?->delivery_address,
                'order_created_at' => $refund->order?->created_at?->format('M d, Y h:i A'),
                'order_items' => $refund->order?->items?->map(fn ($item) => [
                    'name' => $item->name,
                    'quantity' => (int) $item->quantity,
                    'price' => (float) $item->price,
                    'subtotal' => (float) $item->subtotal,
                    'warranty_period' => $item->warranty_period,
                ])->values() ?? [],
                'invoice_record_number' => $refund->order?->invoiceRecord?->record_number,
                'invoice_issued_at' => $refund->order?->invoiceRecord?->issued_at?->format('M d, Y h:i A'),
                'invoice_url' => $refund->order ? route('admin.purchases.invoice', $refund->order) : null,
                'invoice_snapshot' => $refund->order?->invoiceRecord?->snapshot,
                'customer_name' => $refund->customer?->name ?? $refund->order?->customer_name,
                'customer_email' => $refund->customer?->email ?? $refund->order?->customer_email,
                'inquiry_number' => $refund->inquiry?->inquiry_number,
                'source' => $refund->source,
                'amount_requested' => (float) $refund->amount_requested,
                'amount_approved' => $refund->amount_approved === null ? null : (float) $refund->amount_approved,
                'reason' => $refund->reason,
                'admin_notes' => $refund->admin_notes,
                'rejection_reason' => $refund->rejection_reason,
                'status' => $refund->status,
                'provider' => $refund->provider,
                'provider_status' => $refund->provider_status,
                'provider_refund_id' => $refund->provider_refund_id,
                'provider_error' => $refund->provider_error,
                'requested_at' => $refund->requested_at?->format('M d, Y h:i A'),
                'approved_at' => $refund->approved_at?->format('M d, Y h:i A'),
                'completed_at' => $refund->completed_at?->format('M d, Y h:i A'),
                'processor_name' => $refund->processor?->name,
                'can_approve' => $refund->status === 'pending',
                'can_reject' => $refund->status === 'pending',
                'can_complete_manual' => $refund->provider === 'manual' && in_array($refund->status, ['approved', 'failed'], true),
                'can_retry' => $refund->provider === 'paymongo' && (
                    $refund->status === 'failed' ||
                    (
                        $refund->status === 'processing' &&
                        !$refund->provider_refund_id &&
                        $refund->provider_error &&
                        $refund->submitted_at &&
                        $refund->submitted_at->gt(now()->subHours(23))
                    )
                ),
                'requires_reconciliation' => $refund->provider === 'paymongo' &&
                    $refund->status === 'processing' &&
                    !$refund->provider_refund_id &&
                    $refund->provider_error &&
                    (!$refund->submitted_at || $refund->submitted_at->lte(now()->subHours(23))),
                'can_reconcile' => $refund->provider === 'paymongo' &&
                    $refund->status === 'processing' &&
                    !$refund->provider_refund_id &&
                    $refund->provider_error,
                'can_convert_to_manual' => $refund->provider === 'paymongo' && $refund->status === 'failed',
            ];
        });

        return Inertia::render('Admin/Refunds', [
            'refunds' => $refunds,
            'filters' => [
                'search' => $filters['search'] ?? '',
                'status' => $filters['status'] ?? '',
                'source' => $filters['source'] ?? '',
            ],
            'summary' => [
                'pending' => Refund::where('status', 'pending')->count(),
                'processing' => Refund::where('status', 'processing')->count(),
                'completed' => Refund::where('status', 'completed')->count(),
                'manual_action' => Refund::where('provider', 'manual')->whereIn('status', ['approved', 'failed'])->count(),
                'reconciliation_required' => Refund::where('provider', 'paymongo')
                    ->where('status', 'processing')
                    ->whereNull('provider_refund_id')
                    ->whereNotNull('provider_error')
                    ->where(function ($query) {
                        $query->whereNull('submitted_at')
                            ->orWhere('submitted_at', '<=', now()->subHours(23));
                    })
                    ->count(),
            ],
        ]);
    }

    public function approve(Request $request, Refund $refund, RefundService $refunds, AdminActivityLogger $activityLogger)
    {
        $validated = $request->validate([
            'approved_amount' => ['nullable', 'numeric', 'min:1', 'max:1000000'],
            'admin_notes' => ['nullable', 'string', 'max:1000'],
        ]);

        $updated = $refunds->approve(
            $refund,
            $request->user(),
            isset($validated['approved_amount']) ? (float) $validated['approved_amount'] : null,
            $validated['admin_notes'] ?? null
        );

        $activityLogger->record(
            $request,
            'refund_approved',
            'Approved refund #' . $refund->id . ' for order ' . $refund->order?->order_number . '.',
            $refund,
            ['status' => 'pending'],
            ['status' => $updated->status, 'amount' => (float) $updated->amount_approved]
        );

        return back()->with('success', 'Refund #' . $refund->id . ' was approved. Current status: ' . $updated->status . '.');
    }

    public function reject(Request $request, Refund $refund, RefundService $refunds, AdminActivityLogger $activityLogger)
    {
        $validated = $request->validate([
            'rejection_reason' => ['required', 'string', 'min:5', 'max:1000'],
        ]);

        $refunds->reject($refund, $request->user(), $validated['rejection_reason']);

        $activityLogger->record(
            $request,
            'refund_rejected',
            'Rejected refund #' . $refund->id . '.',
            $refund,
            ['status' => 'pending'],
            ['status' => 'rejected']
        );

        return back()->with('success', 'Refund request rejected.');
    }

    public function completeManual(Request $request, Refund $refund, RefundService $refunds, AdminActivityLogger $activityLogger)
    {
        $validated = $request->validate([
            'reference' => ['required', 'string', 'min:5', 'max:500'],
        ]);

        $refunds->markManualCompleted($refund, $request->user(), $validated['reference']);

        $activityLogger->record(
            $request,
            'refund_manual_completed',
            'Recorded manual refund completion for refund #' . $refund->id . '.',
            $refund,
            ['status' => $refund->status],
            ['status' => 'completed', 'reference' => $validated['reference']]
        );

        return back()->with('success', 'Manual refund completion recorded.');
    }

    public function retry(Request $request, Refund $refund, RefundService $refunds, AdminActivityLogger $activityLogger)
    {
        $updated = $refunds->retry($refund);

        $activityLogger->record(
            $request,
            'refund_retried',
            'Retried PayMongo refund #' . $refund->id . '.',
            $refund,
            ['status' => $refund->status],
            ['status' => $updated->status]
        );

        return back()->with('success', 'Refund retry submitted. Current status: ' . $updated->status . '.');
    }

    public function reconcile(Request $request, Refund $refund, RefundService $refunds, AdminActivityLogger $activityLogger)
    {
        $validated = $request->validate([
            'provider_refund_id' => ['required', 'string', 'min:8', 'max:255'],
        ]);

        $updated = $refunds->reconcileUnknownPayMongoRefund(
            $refund,
            $request->user(),
            trim($validated['provider_refund_id'])
        );

        $activityLogger->record(
            $request,
            'refund_reconciled',
            'Reconciled SecureView refund #' . $refund->id . ' against PayMongo refund ' . $updated->provider_refund_id . '.',
            $refund,
            ['status' => 'processing', 'provider_refund_id' => null],
            ['status' => $updated->status, 'provider_refund_id' => $updated->provider_refund_id]
        );

        return back()->with('success', 'PayMongo refund verified and linked. Current status: ' . $updated->status . '.');
    }

    public function convertToManual(Request $request, Refund $refund, RefundService $refunds, AdminActivityLogger $activityLogger)
    {
        $validated = $request->validate([
            'notes' => ['required', 'string', 'min:5', 'max:1000'],
        ]);

        $refunds->convertFailedPayMongoToManual($refund, $request->user(), $validated['notes']);

        $activityLogger->record(
            $request,
            'refund_moved_to_manual',
            'Moved failed PayMongo refund #' . $refund->id . ' to manual processing.',
            $refund,
            ['provider' => 'paymongo', 'status' => 'failed'],
            ['provider' => 'manual', 'status' => 'approved']
        );

        return back()->with('success', 'Refund moved to manual processing. Record completion only after the money has been returned.');
    }
}
