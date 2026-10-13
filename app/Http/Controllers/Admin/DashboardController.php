<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Inquiry;
use App\Models\Order;
use App\Models\Product;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;
use Inertia\Inertia;

class DashboardController extends Controller
{
    private const LOW_STOCK_THRESHOLD = 5;

    public function index(Request $request)
    {
        $currentWeekStart = now()->startOfWeek();
        $currentWeekEnd = now()->endOfWeek();
        $previousWeekStart = $currentWeekStart->copy()->subWeek();
        $previousWeekEnd = $currentWeekEnd->copy()->subWeek();

        $currentSales = (float) $this->paidOrdersBetween($currentWeekStart, $currentWeekEnd)
            ->sum('total');
        $previousSales = (float) $this->paidOrdersBetween($previousWeekStart, $previousWeekEnd)
            ->sum('total');

        $currentOrders = Order::query()
            ->whereBetween('created_at', [$currentWeekStart, $currentWeekEnd])
            ->count();
        $previousOrders = Order::query()
            ->whereBetween('created_at', [$previousWeekStart, $previousWeekEnd])
            ->count();

        $currentInstallations = $this->installationInquiriesBetween($currentWeekStart, $currentWeekEnd)->count();
        $previousInstallations = $this->installationInquiriesBetween($previousWeekStart, $previousWeekEnd)->count();

        $currentCustomers = User::query()
            ->where('role', 'user')
            ->whereBetween('created_at', [$currentWeekStart, $currentWeekEnd])
            ->count();
        $previousCustomers = User::query()
            ->where('role', 'user')
            ->whereBetween('created_at', [$previousWeekStart, $previousWeekEnd])
            ->count();

        $stats = [
            [
                'title' => 'Total Sales',
                'value' => '₱' . number_format($currentSales, 2),
                'growth' => $this->growthPercentage($currentSales, $previousSales),
            ],
            [
                'title' => 'Total Orders',
                'value' => (string) $currentOrders,
                'growth' => $this->growthPercentage($currentOrders, $previousOrders),
            ],
            [
                'title' => 'Total Installation',
                'value' => (string) $currentInstallations,
                'growth' => $this->growthPercentage($currentInstallations, $previousInstallations),
            ],
            [
                'title' => 'New Customers',
                'value' => (string) $currentCustomers,
                'growth' => $this->growthPercentage($currentCustomers, $previousCustomers),
            ],
        ];

        $lowStockData = Product::query()
            ->where('stock_quantity', '<=', self::LOW_STOCK_THRESHOLD)
            ->orderBy('stock_quantity')
            ->orderBy('name')
            ->paginate(5, ['id', 'name', 'stock_quantity'], 'low_stock_page')
            ->withQueryString()
            ->through(fn (Product $product) => [
                str_pad((string) $product->id, 7, '0', STR_PAD_LEFT),
                $product->name,
                (string) $product->stock_quantity,
            ]);

        $pendingPaymentData = Order::query()
            ->whereIn('payment_status', ['pending', 'failed'])
            ->latest()
            ->paginate(5, ['order_number', 'customer_name', 'total'], 'pending_payments_page')
            ->withQueryString()
            ->through(fn (Order $order) => [
                $order->order_number,
                $order->customer_name,
                '₱' . number_format((float) $order->total, 2),
            ]);

        $scheduleData = Inquiry::query()
            ->whereIn('status', ['confirmed', 'in_progress'])
            ->whereDate('preferred_date', '>=', today())
            ->orderBy('preferred_date')
            ->orderBy('preferred_time')
            ->limit(5)
            ->get([
                'id',
                'inquiry_number',
                'customer_name',
                'service_type',
                'preferred_date',
                'preferred_time',
                'status',
            ])
            ->map(fn (Inquiry $inquiry) => [
                'id' => $inquiry->id,
                'title' => $inquiry->service_type ?: 'Service appointment',
                'date' => $inquiry->preferred_date?->format('F j, Y') ?? 'Date not set',
                'time' => $inquiry->preferred_time,
                'description' => $inquiry->customer_name . ' · ' . str_replace('_', ' ', $inquiry->status),
                'inquiry_number' => $inquiry->inquiry_number,
            ])
            ->values();

        $recentInquiries = Inquiry::query()
            ->latest()
            ->limit(4)
            ->get(['id', 'inquiry_number', 'customer_name', 'service_type', 'status', 'created_at'])
            ->map(fn (Inquiry $inquiry) => [
                'title' => $inquiry->service_type ?: ('Inquiry ' . $inquiry->inquiry_number),
                'message' => $inquiry->customer_name . ' · ' . str_replace('_', ' ', $inquiry->status),
                'date' => $inquiry->created_at?->diffForHumans() ?? '',
            ])
            ->values();

        $chartFilters = $request->validate([
            'chart_period' => ['nullable', 'in:year,six_months,twelve_months'],
        ]);
        $chartPeriod = $chartFilters['chart_period'] ?? 'year';
        $chartMonthCount = match ($chartPeriod) {
            'six_months' => 6,
            'twelve_months' => 12,
            default => 12,
        };
        $chartStart = match ($chartPeriod) {
            'six_months' => now()->copy()->startOfMonth()->subMonths(5),
            'twelve_months' => now()->copy()->startOfMonth()->subMonths(11),
            default => now()->copy()->startOfYear(),
        };
        $chartEnd = now();
        $paidOrdersForChart = $this->paidOrdersBetween($chartStart, $chartEnd)
            ->get(['total', 'paid_at', 'created_at']);

        $revenueByMonth = [];
        foreach (range(0, $chartMonthCount - 1) as $offset) {
            $month = $chartStart->copy()->addMonths($offset);
            $revenueByMonth[$month->format('Y-m')] = 0.0;
        }

        foreach ($paidOrdersForChart as $order) {
            $recognizedAt = $order->paid_at ?? $order->created_at;

            if ($recognizedAt) {
                $monthKey = $recognizedAt->format('Y-m');

                if (array_key_exists($monthKey, $revenueByMonth)) {
                    $revenueByMonth[$monthKey] += (float) $order->total;
                }
            }
        }

        $revenueData = collect(range(0, $chartMonthCount - 1))
            ->map(function (int $offset) use ($chartStart, $chartPeriod, $revenueByMonth) {
                $month = $chartStart->copy()->addMonths($offset);
                $labelFormat = $chartPeriod === 'year' ? 'M' : 'M y';

                return [
                    'month' => $month->format($labelFormat),
                    'revenue' => round($revenueByMonth[$month->format('Y-m')] ?? 0, 2),
                ];
            })
            ->values();

        $orderStatusLabels = [
            'pending' => 'Pending',
            'awaiting_payment' => 'Awaiting payment',
            'payment_failed' => 'Payment failed',
            'processing' => 'Processing',
            'delivered' => 'Delivered',
            'completed' => 'Completed',
            'cancelled' => 'Cancelled',
        ];
        $orderStatusCounts = Order::query()
            ->select('order_status')
            ->selectRaw('COUNT(*) as order_count')
            ->groupBy('order_status')
            ->pluck('order_count', 'order_status');
        $orderStatusData = collect($orderStatusLabels)
            ->map(fn (string $label, string $status) => [
                $label,
                (string) ($orderStatusCounts[$status] ?? 0),
            ])
            ->filter(fn (array $row) => (int) $row[1] > 0)
            ->values();

        return Inertia::render('Dashboard', [
            'stats' => $stats,
            'revenueData' => $revenueData,
            'chartPeriod' => $chartPeriod,
            'orderStatusData' => $orderStatusData,
            'lowStockData' => $lowStockData,
            'pendingPaymentData' => $pendingPaymentData,
            'scheduleData' => $scheduleData,
            'recentInquiries' => $recentInquiries,
            'lowStockThreshold' => self::LOW_STOCK_THRESHOLD,
        ]);
    }

    private function paidOrdersBetween(Carbon $start, Carbon $end): Builder
    {
        return Order::query()
            ->where('payment_status', 'paid')
            ->whereRaw('DATE(COALESCE(paid_at, created_at)) BETWEEN ? AND ?', [
                $start->toDateString(),
                $end->toDateString(),
            ]);
    }

    private function installationInquiriesBetween(Carbon $start, Carbon $end): Builder
    {
        return Inquiry::query()
            ->whereIn('status', ['confirmed', 'in_progress'])
            ->whereRaw('LOWER(service_type) LIKE ?', ['%install%'])
            ->whereBetween('preferred_date', [$start->toDateString(), $end->toDateString()]);
    }

    private function growthPercentage(float|int $current, float|int $previous): ?float
    {
        if ($previous <= 0) {
            return $current > 0 ? null : 0.0;
        }

        return round((($current - $previous) / $previous) * 100, 1);
    }
}
