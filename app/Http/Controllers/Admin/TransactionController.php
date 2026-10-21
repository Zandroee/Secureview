<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Order;
use App\Models\InvoiceRecord;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;
use Inertia\Inertia;

class TransactionController extends Controller
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
        $filters = $this->validateFilters($request);
        $query = $this->buildQuery($filters);

        if ($request->query('export') === 'csv') {
            return $this->downloadCsv($query);
        }

        $transactions = (clone $query)
            ->paginate(12)
            ->withQueryString()
            ->through(fn (Order $order) => $this->formatTransaction($order));

        $summaryQuery = $this->buildQuery($filters);

        return Inertia::render('Admin/Transactions', [
            'transactions' => $transactions,
            'filters' => [
                'search' => $filters['search'] ?? '',
                'payment_status' => $filters['payment_status'] ?? '',
                'payment_method' => $filters['payment_method'] ?? '',
                'order_status' => $filters['order_status'] ?? '',
                'date_from' => $filters['date_from'] ?? '',
                'date_to' => $filters['date_to'] ?? '',
            ],
            'summary' => [
                'total' => (clone $summaryQuery)->count(),
                'paid' => (clone $summaryQuery)->where('payment_status', 'paid')->count(),
                'pending' => (clone $summaryQuery)->where('payment_status', 'pending')->count(),
                'failed' => (clone $summaryQuery)->where('payment_status', 'failed')->count(),
                'paid_amount' => (float) (clone $summaryQuery)
                    ->where('payment_status', 'paid')
                    ->sum('total'),
            ],
        ]);
    }

    /**
     * Validate the filters shared by the table and CSV export.
     */
    private function validateFilters(Request $request): array
    {
        return $request->validate([
            'search' => ['nullable', 'string', 'max:120'],
            'payment_status' => ['nullable', 'in:pending,paid,failed'],
            'payment_method' => ['nullable', 'in:cash,gcash,card,maya'],
            'order_status' => ['nullable', 'in:' . implode(',', self::ORDER_STATUSES)],
            'date_from' => ['nullable', 'date'],
            'date_to' => ['nullable', 'date', 'after_or_equal:date_from'],
        ]);
    }

    /**
     * Build one shared query so on-screen results, summary cards, and export
     * apply exactly the same filters.
     */
    private function buildQuery(array $filters): Builder
    {
        $query = Order::query()
            ->select('orders.*')
            ->with(['events.actor', 'invoiceRecord'])
            ->addSelect([
                'internal_invoice_record_number' => InvoiceRecord::query()
                    ->select('record_number')
                    ->whereColumn('order_id', 'orders.id')
                    ->limit(1),
            ])
            ->latest();

        if (!empty($filters['search'])) {
            $search = trim($filters['search']);

            $query->where(function (Builder $builder) use ($search) {
                $builder
                    ->where('order_number', 'like', '%' . $search . '%')
                    ->orWhere('customer_name', 'like', '%' . $search . '%')
                    ->orWhere('customer_email', 'like', '%' . $search . '%')
                    ->orWhere('paymongo_payment_id', 'like', '%' . $search . '%')
                    ->orWhere('paymongo_checkout_session_id', 'like', '%' . $search . '%');
            });
        }

        if (!empty($filters['payment_status'])) {
            $query->where('payment_status', $filters['payment_status']);
        }

        if (!empty($filters['payment_method'])) {
            $query->where('payment_method', $filters['payment_method']);
        }

        if (!empty($filters['order_status'])) {
            $query->where('order_status', $filters['order_status']);
        }

        if (!empty($filters['date_from'])) {
            $query->whereDate('created_at', '>=', $filters['date_from']);
        }

        if (!empty($filters['date_to'])) {
            $query->whereDate('created_at', '<=', $filters['date_to']);
        }

        return $query;
    }

    private function formatTransaction(Order $order): array
    {
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
            'invoice_record' => $order->invoiceRecord ? [
                'record_number' => $order->invoiceRecord->record_number,
                'issued_at' => $order->invoiceRecord->issued_at?->format('M d, Y h:i A'),
            ] : null,
            'invoice_url' => route('admin.purchases.invoice', $order),
            'created_at' => $order->created_at?->format('M d, Y h:i A'),
            'paid_at' => $order->paid_at?->format('M d, Y h:i A'),
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
        ];
    }

    private function downloadCsv(Builder $query)
    {
        $filename = 'secureview-transaction-records-' . now()->format('Ymd-His') . '.csv';

        return response()->streamDownload(function () use ($query) {
            $output = fopen('php://output', 'w');

            if ($output === false) {
                return;
            }

            // Helps spreadsheet applications read customer names correctly.
            fwrite($output, "\xEF\xBB\xBF");

            fputcsv($output, [
                'Order Number',
                'Payment Transaction ID',
                'Checkout Session ID',
                'Customer Name',
                'Customer Email',
                'Payment Method',
                'Payment Status',
                'Order Status',
                'Amount (PHP)',
                'Internal Invoice Record',
                'Order Created At',
                'Paid At',
            ]);

            foreach ($query->cursor() as $order) {
                fputcsv($output, [
                    $this->safeCsvCell($order->order_number),
                    $this->safeCsvCell($order->paymongo_payment_id),
                    $this->safeCsvCell($order->paymongo_checkout_session_id),
                    $this->safeCsvCell($order->customer_name),
                    $this->safeCsvCell($order->customer_email),
                    $order->payment_method,
                    $order->payment_status,
                    $order->order_status,
                    number_format((float) $order->total, 2, '.', ''),
                    $this->safeCsvCell($order->internal_invoice_record_number),
                    $order->created_at?->format('Y-m-d H:i:s'),
                    $order->paid_at?->format('Y-m-d H:i:s'),
                ]);
            }

            fclose($output);
        }, $filename, [
            'Content-Type' => 'text/csv; charset=UTF-8',
        ]);
    }

    /**
     * Prevent spreadsheet formulas from being evaluated from text fields.
     */
    private function safeCsvCell(?string $value): string
    {
        $value = (string) $value;

        if ($value !== '' && preg_match('/^[=+@\-\t\r]/', $value) === 1) {
            return "'" . $value;
        }

        return $value;
    }
}
