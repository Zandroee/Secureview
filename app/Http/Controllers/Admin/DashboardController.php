<?php

namespace App\\Http\\Controllers\\Admin;

use App\\Http\\Controllers\\Controller;
use App\\Models\\Inquiry;
use App\\Models\\Order;
use App\\Models\\Product;
use App\\Models\\User;
use Carbon\\Carbon;
use Illuminate\\Database\\Eloquent\\Builder;
use Inertia\\Inertia;

class DashboardController extends Controller
{
    private const LOW_STOCK_THRESHOLD = 5;

    public function index()
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
            ->limit(5)
            ->get(['id', 'name', 'stock_quantity'])
            ->map(fn (Product $product) => [
                str_pad((string) $product->id, 7, '0', STR_PAD_LEFT),
                $product->name,
                (string) $product->stock_quantity,
            ])
            ->values();

        $pendingPaymentData = Order::query()
            ->whereIn('payment_status', ['pending', 'failed'])
            ->latest()
            ->limit(5)
            ->get(['order_number', 'customer_name', 'total'])
            ->map(fn (Order $order) => [
                $order->order_number,
                $order->customer_name,
                '₱' . number_format((float) $order->total, 2),
            ])
            ->values();

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

        $yearStart = now()->startOfYear();
        $yearEnd = now();
        $paidOrdersForYear = $this->paidOrdersBetween($yearStart, $yearEnd)
            ->get(['total', 'paid_at', 'created_at']);

        $revenueByMonth = array_fill(1, 12, 0.0);

        foreach ($paidOrdersForYear as $order) {
            $recognizedAt = $order->paid_at ?? $order->created_at;

            if ($recognizedAt) {
                $month = (int) $recognizedAt->format('n');
                $revenueByMonth[$month] += (float) $order->total;
            }
        }

        $revenueData = collect(range(1, 12))
            ->map(fn (int $month) => [
                'month' => Carbon::create((int) now()->format('Y'), $month, 1)->format('M'),
                'revenue' => round($revenueByMonth[$month], 2),
            ])
            ->values();

        return Inertia::render('Dashboard', [
            'stats' => $stats,
            'revenueData' => $revenueData,
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

    private function growthPercentage(float|int $current, float|int $previous): float
    {
        if ($previous <= 0) {
            return $current > 0 ? 100.0 : 0.0;
        }

        return round((($current - $previous) / $previous) * 100, 1);
    }
}
