<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\CustomerNotification;
use App\Models\Order;
use App\Services\AdminActivityLogger;
use App\Services\InventoryService;
use App\Services\OrderCancellationService;
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
            'payment_status' => ['nullable', 'in:pending,paid,failed'],
            'order_status' => ['nullable', 'in:' . implode(',', self::ORDER_STATUSES)],
            'payment_method' => ['nullable', 'in:cash,gcash,card,maya'],
        ]);

        $query = Order::with(['user', 'items'])
            ->latest();

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

        $orders = $query
            ->paginate(12)
            ->withQueryString()
            ->through(fn (Order $order) => $this->formatOrder($order));

        return Inertia::render('Admin/Purchases', [
            'orders' => $orders,
            'filters' => [
                'search' => $filters['search'] ?? '',
                'payment_status' => $filters['payment_status'] ?? '',
                'order_status' => $filters['order_status'] ?? '',
                'payment_method' => $filters['payment_method'] ?? '',
            ],
            'summary' => [
                'total_orders' => Order::count(),
                'paid_orders' => Order::where('payment_status', 'paid')->count(),
                'pending_payments' => Order::whereIn('payment_status', ['pending', 'failed'])
                    ->whereIn('order_status', ['pending', 'awaiting_payment', 'payment_failed'])
                    ->count(),
                'revenue' => (float) Order::where('payment_status', 'paid')->sum('total'),
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
        $oldStatus = $order->order_status;

        $cancellation->cancel($order, $inventory);
        $order->refresh();

        $activityLogger->record(
            $request,
            'order_cancelled',
            'Cancelled unpaid order ' . $order->order_number . '.',
            $order,
            ['status' => $oldStatus],
            ['status' => $order->order_status]
        );

        CustomerNotification::create([
            'user_id' => $order->user_id,
            'type' => 'order_cancelled',
            'title' => 'Order cancelled',
            'message' => 'Your unpaid order ' . $order->order_number . ' was cancelled by SecureView.',
            'action_url' => route('purchases.show', $order),
            'related_type' => Order::class,
            'related_id' => $order->id,
        ]);

        return back()->with('success', 'Order ' . $order->order_number . ' was cancelled.');
    }

    private function formatOrder(Order $order): array
    {
        return [
            'id' => $order->id,
            'order_number' => $order->order_number,
            'customer_name' => $order->customer_name,
            'customer_email' => $order->customer_email,
            'customer_phone' => $order->customer_phone,
            'delivery_address' => $order->delivery_address,
            'notes' => $order->notes,
            'subtotal' => (float) $order->subtotal,
            'shipping_fee' => (float) $order->shipping_fee,
            'total' => (float) $order->total,
            'payment_method' => $order->payment_method,
            'payment_status' => $order->payment_status,
            'order_status' => $order->order_status,
            'paid_at' => $order->paid_at?->format('M d, Y h:i A'),
            'created_at' => $order->created_at?->format('M d, Y h:i A'),
            'can_cancel' => $order->payment_status !== 'paid'
                && $order->paid_at === null
                && in_array($order->payment_status, ['pending', 'failed'], true)
                && in_array($order->order_status, ['pending', 'awaiting_payment', 'payment_failed'], true),
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
