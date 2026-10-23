<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\CustomerNotification;
use App\Models\Order;
use App\Services\AdminActivityLogger;
use App\Services\InventoryService;
use App\Services\InvoiceDocumentService;
use App\Services\OrderCancellationService;
use App\Services\PendingInquiryCheckoutService;
use Illuminate\Http\Request;
use Inertia\Inertia;

class PurchaseController extends Controller
{
    private const ORDER_STATUSES = [
        'pending',
        'awaiting_payment',
        'payment_failed',
        'processing',
        'delivered',
        'completed',
        'cancelled',
    ];

    public function index(Request $request)
    {
        $filters = $request->validate([
            'search' => ['nullable', 'string', 'max:120'],
            'payment_status' => ['nullable', 'in:pending,paid,failed,cancelled'],
            'order_status' => ['nullable', 'in:' . implode(',', self::ORDER_STATUSES)],
            'payment_method' => ['nullable', 'in:cash,gcash,card,maya'],
            'attention' => ['nullable', 'in:stale'],
        ]);

        $invoiceProfileReady = app(InvoiceDocumentService::class)->profileReady();

        $query = Order::with(['user', 'items', 'events.actor', 'invoiceRecord'])
            ->latest();

        // Keep the active Orders workspace focused on actionable orders by default.
        // Completed and cancelled orders live on the dedicated Orders History page.
        if (empty($filters['order_status'])) {
            $query->whereNotIn('order_status', ['completed', 'cancelled']);
        }

        if (!empty($filters['search'])) {
            $search = $filters['search'];

            $query->where(function ($builder) use ($search) {
                $builder
                    ->where('order_number', 'like', '%' . $search . '%')
                    ->orWhere('customer_name', 'like', '%' . $search . '%')
                    ->orWhere('customer_email', 'like', '%' . $search . '%')
                    ->orWhere('customer_phone', 'like', '%' . $search . '%');
            });
        }

        if (!empty($filters['payment_status'])) {
            $query->where('payment_status', $filters['payment_status']);
        }

        if (!empty($filters['order_status'])) {
            $query->where('order_status', $filters['order_status']);
        }

        if (!empty($filters['payment_method'])) {
            $query->where('payment_method', $filters['payment_method']);
        }

        if (($filters['attention'] ?? null) === 'stale') {
            $query->whereNull('paid_at')
                ->whereIn('payment_status', ['pending', 'failed'])
                ->whereIn('order_status', ['pending', 'awaiting_payment', 'payment_failed'])
                ->where('updated_at', '<=', now()->subHours(24));
        }

        $orders = $query
            ->paginate(12)
            ->withQueryString()
            ->through(fn (Order $order) => $this->formatOrder($order, $invoiceProfileReady));

        $unpaidOrderQuery = Order::query()
            ->whereNull('paid_at')
            ->whereIn('payment_status', ['pending', 'failed'])
            ->whereIn('order_status', ['pending', 'awaiting_payment', 'payment_failed']);

        $attentionOrders = (clone $unpaidOrderQuery)
            ->with(['user', 'items', 'events.actor', 'invoiceRecord'])
            ->orderByRaw("CASE WHEN payment_status = 'failed' OR order_status = 'payment_failed' THEN 0 WHEN payment_method = 'cash' THEN 1 ELSE 2 END")
            ->orderBy('updated_at')
            ->limit(6)
            ->get()
            ->map(fn (Order $order) => $this->formatOrder($order, $invoiceProfileReady))
            ->values();

        return Inertia::render('Admin/Purchases', [
            'orders' => $orders,
            'attentionOrders' => $attentionOrders,
            'filters' => [
                'search' => $filters['search'] ?? '',
                'payment_status' => $filters['payment_status'] ?? '',
                'order_status' => $filters['order_status'] ?? '',
                'payment_method' => $filters['payment_method'] ?? '',
                'attention' => $filters['attention'] ?? '',
            ],
            'summary' => [
                'total_orders' => Order::count(),
                'paid_orders' => Order::where('payment_status', 'paid')->count(),
                'pending_payments' => (clone $unpaidOrderQuery)->where('payment_status', 'pending')->count(),
                'pending_online_payments' => (clone $unpaidOrderQuery)
                    ->where('payment_status', 'pending')
                    ->where('order_status', 'awaiting_payment')
                    ->whereIn('payment_method', ['gcash', 'card', 'maya'])
                    ->count(),
                'failed_payments' => (clone $unpaidOrderQuery)
                    ->where(fn ($builder) => $builder->where('payment_status', 'failed')->orWhere('order_status', 'payment_failed'))
                    ->count(),
                'cash_awaiting_confirmation' => (clone $unpaidOrderQuery)
                    ->where('payment_method', 'cash')
                    ->where('payment_status', 'pending')
                    ->where('order_status', 'pending')
                    ->count(),
                'stale_unpaid_orders' => (clone $unpaidOrderQuery)
                    ->where('updated_at', '<=', now()->subHours(24))
                    ->count(),
                'revenue' => (float) Order::where('payment_status', 'paid')->sum('total'),
            ],
        ]);
    }

    public function history(Request $request)
    {
        $filters = $request->validate([
            'search' => ['nullable', 'string', 'max:120'],
            'order_status' => ['nullable', 'in:completed,cancelled'],
        ]);

        $invoiceProfileReady = app(InvoiceDocumentService::class)->profileReady();
        $query = Order::with(['user', 'items', 'events.actor', 'invoiceRecord'])
            ->whereIn('order_status', ['completed', 'cancelled'])
            ->latest();

        if (!empty($filters['search'])) {
            $search = $filters['search'];
            $query->where(function ($builder) use ($search) {
                $builder->where('order_number', 'like', '%' . $search . '%')
                    ->orWhere('customer_name', 'like', '%' . $search . '%')
                    ->orWhere('customer_email', 'like', '%' . $search . '%')
                    ->orWhere('customer_phone', 'like', '%' . $search . '%');
            });
        }

        if (!empty($filters['order_status'])) {
            $query->where('order_status', $filters['order_status']);
        }

        $orders = $query->paginate(12)->withQueryString()
            ->through(fn (Order $order) => $this->formatOrder($order, $invoiceProfileReady));

        return Inertia::render('Admin/OrderHistory', [
            'orders' => $orders,
            'filters' => [
                'search' => $filters['search'] ?? '',
                'order_status' => $filters['order_status'] ?? '',
            ],
            'summary' => [
                'completed_orders' => Order::query()->where('order_status', 'completed')->count(),
                'cancelled_orders' => Order::query()->where('order_status', 'cancelled')->count(),
                'completed_paid_revenue' => (float) Order::query()->where('order_status', 'completed')->where('payment_status', 'paid')->sum('total'),
            ],
        ]);
    }

    public function cancel(
        Request $request,
        Order $order,
        OrderCancellationService $cancellation,
        InventoryService $inventory,
        AdminActivityLogger $activityLogger
    ) {
        $validated = $request->validate([
            'reason' => ['required', 'string', 'min:5', 'max:500'],
        ]);
        $reason = trim($validated['reason']);
        $oldStatus = $order->order_status;

        $cancellation->cancel($order, $inventory, $reason);
        $order->refresh();

        $activityLogger->record(
            $request,
            'order_cancelled',
            'Cancelled unpaid order ' . $order->order_number . '. Reason: ' . $reason,
            $order,
            ['status' => $oldStatus],
            ['status' => $order->order_status, 'cancellation_reason' => $reason]
        );

        CustomerNotification::create([
            'user_id' => $order->user_id,
            'type' => 'order_cancelled',
            'title' => 'Order cancelled',
            'message' => 'Your unpaid order ' . $order->order_number . ' was cancelled by SecureView. Reason: ' . $reason,
            'action_url' => route('purchases.show', $order),
            'related_type' => Order::class,
            'related_id' => $order->id,
        ]);

        return back()->with('success', 'Order ' . $order->order_number . ' was cancelled.');
    }

    public function confirmCashPayment(
        Request $request,
        Order $order,
        InventoryService $inventory,
        AdminActivityLogger $activityLogger
    ) {
        if (
            $order->payment_method !== 'cash' ||
            $order->payment_status !== 'pending' ||
            $order->order_status !== 'pending'
        ) {
            return back()->withErrors([
                'order' => 'Only an unpaid cash order in Pending status can be confirmed as paid. Do not use this action for online payments.',
            ]);
        }

        // Ensure inventory is reserved/deducted before recording the cash
        // payment. Existing checkout stock deductions are idempotent.
        $inventory->deductForOrder($order);

        $oldStatus = $order->order_status;
        $order->update([
            'payment_status' => 'paid',
            'paid_at' => now(),
            'order_status' => 'processing',
        ]);

        app(PendingInquiryCheckoutService::class)->completePaidOrder($order->fresh());

        $activityLogger->record(
            $request,
            'order_cash_payment_confirmed',
            'Confirmed cash received for order ' . $order->order_number . '.',
            $order,
            ['status' => $oldStatus],
            ['status' => 'processing']
        );

        CustomerNotification::create([
            'user_id' => $order->user_id,
            'type' => 'payment_paid',
            'title' => 'Cash payment confirmed',
            'message' => 'SecureView confirmed receipt of cash payment for order ' . $order->order_number . '.',
            'action_url' => route('purchases.show', $order),
            'related_type' => Order::class,
            'related_id' => $order->id,
        ]);

        return back()->with('success', 'Cash payment confirmed. Order ' . $order->order_number . ' is now Processing.');
    }

    public function markCompleted(
        Request $request,
        Order $order,
        AdminActivityLogger $activityLogger
    ) {
        if ($order->payment_status !== 'paid' || $order->order_status !== 'processing') {
            return back()->withErrors([
                'order' => 'Only paid orders in Processing status can be marked Completed.',
            ]);
        }

        $installationCheckout = \App\Models\PendingInquiryCheckout::query()
            ->with('inquiry')
            ->where('order_id', $order->id)
            ->first();

        if (
            $installationCheckout &&
            (!$installationCheckout->inquiry || $installationCheckout->inquiry->status !== 'completed')
        ) {
            return back()->withErrors([
                'order' => 'This order includes an installation service. Complete the related service from Schedules and Service History before marking the order Completed.',
            ]);
        }

        $order->update(['order_status' => 'completed']);

        $activityLogger->record(
            $request,
            'order_completed',
            'Marked order ' . $order->order_number . ' as completed.',
            $order,
            ['status' => 'processing'],
            ['status' => 'completed']
        );

        CustomerNotification::create([
            'user_id' => $order->user_id,
            'type' => 'order_completed',
            'title' => 'Order completed',
            'message' => 'Your order ' . $order->order_number . ' has been marked Completed by SecureView.',
            'action_url' => route('purchases.show', $order),
            'related_type' => Order::class,
            'related_id' => $order->id,
        ]);

        return back()->with('success', 'Order ' . $order->order_number . ' has been marked Completed.');
    }

    private function formatOrder(Order $order, bool $invoiceProfileReady): array
    {
        $invoiceRecord = $order->invoiceRecord;
        $canRecordInvoice = $invoiceProfileReady
            && $order->payment_status === 'paid'
            && in_array($order->order_status, ['processing', 'completed', 'delivered'], true)
            && !$invoiceRecord;

        return [
            'id' => $order->id,
            'order_number' => $order->order_number,
            'customer_name' => $order->customer_name,
            'customer_email' => $order->customer_email,
            'customer_phone' => $order->customer_phone,
            'delivery_address' => $order->delivery_address,
            'delivery_address_details' => $order->delivery_address_details,
            'delivery_city' => $order->delivery_city,
            'delivery_latitude' => $order->delivery_latitude,
            'delivery_longitude' => $order->delivery_longitude,
            'notes' => $order->notes,
            'subtotal' => (float) $order->subtotal,
            'shipping_fee' => (float) $order->shipping_fee,
            'total' => (float) $order->total,
            'payment_method' => $order->payment_method,
            'payment_status' => $order->payment_status,
            'order_status' => $order->order_status,
            'cancellation_reason' => $order->cancellation_reason,
            'timeline' => $order->events->map(fn ($event) => [
                'id' => $event->id,
                'event_key' => $event->event_key,
                'title' => $event->title,
                'description' => $event->description,
                'payment_status_before' => $event->payment_status_before,
                'payment_status_after' => $event->payment_status_after,
                'order_status_before' => $event->order_status_before,
                'order_status_after' => $event->order_status_after,
                'actor_name' => $event->actor?->name ?? 'SecureView system',
                'created_at' => $event->created_at?->format('M d, Y h:i A'),
            ])->values(),
            'paid_at' => $order->paid_at?->format('M d, Y h:i A'),
            'created_at' => $order->created_at?->format('M d, Y h:i A'),
            'updated_at' => $order->updated_at?->format('M d, Y h:i A'),
            'invoice_record' => $invoiceRecord ? [
                'record_number' => $invoiceRecord->record_number,
                'issued_at' => $invoiceRecord->issued_at?->format('M d, Y h:i A'),
            ] : null,
            'can_record_invoice' => $canRecordInvoice,
            'age_hours' => $order->updated_at ? (int) $order->updated_at->diffInHours(now()) : 0,
            'is_stale_unpaid' => $order->payment_status !== 'paid'
                && $order->paid_at === null
                && in_array($order->payment_status, ['pending', 'failed'], true)
                && in_array($order->order_status, ['pending', 'awaiting_payment', 'payment_failed'], true)
                && $order->updated_at?->lte(now()->subHours(24)),
            'next_action' => $order->payment_status === 'paid' || $order->paid_at !== null
                ? 'none'
                : ($order->payment_method === 'cash' && $order->order_status === 'pending'
                    ? 'confirm_cash_payment'
                    : ($order->payment_status === 'failed' || $order->order_status === 'payment_failed'
                        ? 'retry_or_cancel'
                        : (in_array($order->order_status, ['pending', 'awaiting_payment'], true)
                            ? 'awaiting_payment'
                            : 'review'))),
            'can_cancel' => $order->payment_status !== 'paid'
                && $order->paid_at === null
                && in_array($order->payment_status, ['pending', 'failed'], true)
                && in_array($order->order_status, ['pending', 'awaiting_payment', 'payment_failed'], true),
            'can_confirm_cash_payment' => $order->payment_method === 'cash'
                && $order->payment_status === 'pending'
                && $order->order_status === 'pending',
            'can_mark_completed' => $order->payment_status === 'paid'
                && $order->order_status === 'processing'
                && !\App\Models\PendingInquiryCheckout::query()
                    ->where('order_id', $order->id)
                    ->where(function ($query) {
                        $query->whereNull('inquiry_id')
                            ->orWhereHas('inquiry', fn ($inquiryQuery) => $inquiryQuery->where('status', '!=', 'completed'));
                    })
                    ->exists(),
            'items' => $order->items->map(fn ($item) => [
                'id' => $item->id,
                'name' => $item->name,
                'price' => (float) $item->price,
                'quantity' => (int) $item->quantity,
                'subtotal' => (float) $item->subtotal,
            ])->values(),
        ];
    }
}
