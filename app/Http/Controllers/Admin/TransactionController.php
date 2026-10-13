<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Order;
use Illuminate\Http\Request;
use Inertia\Inertia;

class TransactionController extends Controller
{
    public function index(Request $request)
    {
        $filters = $request->validate([
            'search' => ['nullable', 'string', 'max:120'],
            'payment_status' => ['nullable', 'in:pending,paid,failed'],
            'payment_method' => ['nullable', 'in:cash,gcash,card,maya'],
        ]);

        $query = Order::query()->latest();

        if (!empty($filters['search'])) {
            $search = $filters['search'];

            $query->where(function ($builder) use ($search) {
                $builder
                    ->where('order_number', 'like', '%' . $search . '%')
                    ->orWhere('customer_name', 'like', '%' . $search . '%')
                    ->orWhere('customer_email', 'like', '%' . $search . '%')
                    ->orWhere('paymongo_payment_id', 'like', '%' . $search . '%');
            });
        }

        if (!empty($filters['payment_status'])) {
            $query->where('payment_status', $filters['payment_status']);
        }

        if (!empty($filters['payment_method'])) {
            $query->where('payment_method', $filters['payment_method']);
        }

        $transactions = $query
            ->paginate(12)
            ->withQueryString()
            ->through(function (Order $order) {
                return [
                    'id' => $order->id,
                    'transaction_id' => $order->paymongo_payment_id,
                    'checkout_session_id' => $order->paymongo_checkout_session_id,
                    'order_number' => $order->order_number,
                    'customer_name' => $order->customer_name,
                    'customer_email' => $order->customer_email,
                    'payment_method' => $order->payment_method,
                    'payment_status' => $order->payment_status,
                    'order_status' => $order->order_status,
                    'amount' => (float) $order->total,
                    'created_at' => $order->created_at?->format('M d, Y h:i A'),
                    'paid_at' => $order->paid_at?->format('M d, Y h:i A'),
                ];
            });

        return Inertia::render('Admin/Transactions', [
            'transactions' => $transactions,
            'filters' => [
                'search' => $filters['search'] ?? '',
                'payment_status' => $filters['payment_status'] ?? '',
                'payment_method' => $filters['payment_method'] ?? '',
            ],
            'summary' => [
                'total' => Order::count(),
                'paid' => Order::where('payment_status', 'paid')->count(),
                'pending' => Order::where('payment_status', 'pending')->count(),
                'failed' => Order::where('payment_status', 'failed')->count(),
                'paid_amount' => (float) Order::where('payment_status', 'paid')->sum('total'),
            ],
        ]);
    }
}
