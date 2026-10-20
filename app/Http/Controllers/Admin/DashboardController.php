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

    private const METRIC_PERIOD_OPTIONS = [
        'today' => 'Today',
        'yesterday' => 'Yesterday',
        'week' => 'This week',
        'last_7_days' => 'Last 7 days',
        'month' => 'This month',
        'last_30_days' => 'Last 30 days',
        'year' => 'This year',
        'last_90_days' => 'Last 90 days',
        'last_12_months' => 'Last 12 months',
        'all_time' => 'All time',
    ];

    private const CHART_PERIOD_OPTIONS = [
        'today' => 'Today (hourly)',
        'last_7_days' => 'Last 7 days',
        'last_30_days' => 'Last 30 days',
        'this_month' => 'This month',
        'last_90_days' => 'Last 90 days',
        'last_3_months' => 'Last 3 months',
        'six_months' => 'Last 6 months',
        'twelve_months' => 'Last 12 months',
        'year' => 'This year',
        'two_years' => 'Last 2 years',
        'five_years' => 'Last 5 years',
        'all_time' => 'All time',
    ];

    public function index(Request $request)
    {
        Inquiry::escalateOverdueUrgency();

        $filters = $request->validate([
            'sales_period' => ['nullable', 'in:' . implode(',', array_keys(self::METRIC_PERIOD_OPTIONS))],
            'orders_period' => ['nullable', 'in:' . implode(',', array_keys(self::METRIC_PERIOD_OPTIONS))],
            'installations_period' => ['nullable', 'in:' . implode(',', array_keys(self::METRIC_PERIOD_OPTIONS))],
            'customers_period' => ['nullable', 'in:' . implode(',', array_keys(self::METRIC_PERIOD_OPTIONS))],
            'chart_period' => ['nullable', 'in:' . implode(',', array_keys(self::CHART_PERIOD_OPTIONS))],
        ]);

        $metricPeriods = [
            'sales' => $filters['sales_period'] ?? 'week',
            'orders' => $filters['orders_period'] ?? 'week',
            'installations' => $filters['installations_period'] ?? 'week',
            'customers' => $filters['customers_period'] ?? 'week',
        ];

        $metricOptions = collect(self::METRIC_PERIOD_OPTIONS)
            ->map(fn (string $label, string $value) => [
                'value' => $value,
                'label' => $label,
            ])
            ->values()
            ->all();

        $salesWindow = $this->periodWindow($metricPeriods['sales']);
        $currentSales = (float) $this->paidOrdersBetween(
            $salesWindow['start'],
            $salesWindow['end']
        )->sum('total');
        $previousSales = $salesWindow['previous_start']
            ? (float) $this->paidOrdersBetween(
                $salesWindow['previous_start'],
                $salesWindow['previous_end']
            )->sum('total')
            : null;

        $ordersWindow = $this->periodWindow($metricPeriods['orders']);
        $currentOrders = Order::query()
            ->whereBetween('created_at', [$ordersWindow['start'], $ordersWindow['end']])
            ->count();
        $previousOrders = $ordersWindow['previous_start']
            ? Order::query()
                ->whereBetween('created_at', [$ordersWindow['previous_start'], $ordersWindow['previous_end']])
                ->count()
            : null;

        $installationsWindow = $this->periodWindow($metricPeriods['installations']);
        $currentInstallations = $this->installationInquiriesBetween(
            $installationsWindow['start'],
            $installationsWindow['end']
        )->count();
        $previousInstallations = $installationsWindow['previous_start']
            ? $this->installationInquiriesBetween(
                $installationsWindow['previous_start'],
                $installationsWindow['previous_end']
            )->count()
            : null;

        $customersWindow = $this->periodWindow($metricPeriods['customers']);
        $currentCustomers = User::query()
            ->where('role', 'user')
            ->whereBetween('created_at', [$customersWindow['start'], $customersWindow['end']])
            ->count();
        $previousCustomers = $customersWindow['previous_start']
            ? User::query()
                ->where('role', 'user')
                ->whereBetween('created_at', [$customersWindow['previous_start'], $customersWindow['previous_end']])
                ->count()
            : null;

        $stats = [
            $this->makeStat(
                'Total Sales',
                '₱' . number_format($currentSales, 2),
                $currentSales,
                $previousSales,
                $salesWindow,
                'sales_period',
                $metricPeriods['sales'],
                $metricOptions
            ),
            $this->makeStat(
                'Total Orders',
                (string) $currentOrders,
                $currentOrders,
                $previousOrders,
                $ordersWindow,
                'orders_period',
                $metricPeriods['orders'],
                $metricOptions
            ),
            $this->makeStat(
                'Total Installation',
                (string) $currentInstallations,
                $currentInstallations,
                $previousInstallations,
                $installationsWindow,
                'installations_period',
                $metricPeriods['installations'],
                $metricOptions
            ),
            $this->makeStat(
                'New Customers',
                (string) $currentCustomers,
                $currentCustomers,
                $previousCustomers,
                $customersWindow,
                'customers_period',
                $metricPeriods['customers'],
                $metricOptions
            ),
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
            ->whereIn('order_status', ['pending', 'awaiting_payment', 'payment_failed'])
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

        $chartPeriod = $filters['chart_period'] ?? 'year';
        $chartConfiguration = $this->revenueChartConfiguration($chartPeriod);
        $chartStart = $chartConfiguration['start'];
        $paidOrdersForChart = $this->paidOrdersBetween($chartStart, now()->copy())
            ->get(['total', 'paid_at', 'created_at']);

        $revenueByBucket = [];
        foreach ($chartConfiguration['bins'] as $bin) {
            $revenueByBucket[$bin['key']] = 0.0;
        }

        foreach ($paidOrdersForChart as $order) {
            $recognizedAt = $order->paid_at ?? $order->created_at;

            if (!$recognizedAt) {
                continue;
            }

            $bucketKey = match ($chartConfiguration['unit']) {
                'hour' => $recognizedAt->format('Y-m-d H'),
                'day' => $recognizedAt->format('Y-m-d'),
                'week' => $recognizedAt->format('o-W'),
                'month' => $recognizedAt->format('Y-m'),
                default => $recognizedAt->format('Y'),
            };

            if (array_key_exists($bucketKey, $revenueByBucket)) {
                $revenueByBucket[$bucketKey] += (float) $order->total;
            }
        }

        $revenueData = collect($chartConfiguration['bins'])
            ->map(fn (array $bin) => [
                'month' => $bin['label'],
                'revenue' => round($revenueByBucket[$bin['key']] ?? 0, 2),
            ])
            ->values();

        $orderStatusDefinitions = [
            'pending' => [
                'label' => 'Pending',
                'color' => 'warning',
                'icon' => 'bi-hourglass-split',
                'description' => 'Payment not confirmed',
            ],
            'awaiting_payment' => [
                'label' => 'Awaiting Payment',
                'color' => 'warning',
                'icon' => 'bi-wallet2',
                'description' => 'Checkout in progress',
            ],
            'payment_failed' => [
                'label' => 'Payment Failed',
                'color' => 'danger',
                'icon' => 'bi-exclamation-triangle',
                'description' => 'Payment needs attention',
            ],
            'processing' => [
                'label' => 'Processing',
                'color' => 'primary',
                'icon' => 'bi-box-seam',
                'description' => 'Order being prepared',
            ],
            'delivered' => [
                'label' => 'Delivered',
                'color' => 'info',
                'icon' => 'bi-truck',
                'description' => 'Order delivered',
            ],
            'completed' => [
                'label' => 'Completed',
                'color' => 'success',
                'icon' => 'bi-check-circle',
                'description' => 'Order fulfilled',
            ],
            'cancelled' => [
                'label' => 'Cancelled',
                'color' => 'secondary',
                'icon' => 'bi-x-circle',
                'description' => 'Order cancelled',
            ],
        ];

        $orderStatusCounts = Order::query()
            ->select('order_status')
            ->selectRaw('COUNT(*) as order_count')
            ->groupBy('order_status')
            ->pluck('order_count', 'order_status');

        $orderStatusData = collect($orderStatusDefinitions)
            ->map(function (array $definition, string $status) use ($orderStatusCounts) {
                return [
                    'key' => $status,
                    'label' => $definition['label'],
                    'count' => (int) ($orderStatusCounts[$status] ?? 0),
                    'color' => $definition['color'],
                    'icon' => $definition['icon'],
                    'description' => $definition['description'],
                ];
            })
            // There is no delivery-tracking workflow yet. Keep legacy delivered
            // records visible if any exist, but don't advertise an unused stage.
            ->reject(fn (array $status) => $status['key'] === 'delivered' && $status['count'] === 0)
            ->values();

        return Inertia::render('Dashboard', [
            'stats' => $stats,
            'revenueData' => $revenueData,
            'chartPeriod' => $chartPeriod,
            'dashboardFilters' => [
                'sales_period' => $metricPeriods['sales'],
                'orders_period' => $metricPeriods['orders'],
                'installations_period' => $metricPeriods['installations'],
                'customers_period' => $metricPeriods['customers'],
                'chart_period' => $chartPeriod,
            ],
            'chartPeriodOptions' => collect(self::CHART_PERIOD_OPTIONS)
                ->map(fn (string $label, string $value) => ['value' => $value, 'label' => $label])
                ->values(),
            'orderStatusData' => $orderStatusData,
            'lowStockData' => $lowStockData,
            'pendingPaymentData' => $pendingPaymentData,
            'scheduleData' => $scheduleData,
            'recentInquiries' => $recentInquiries,
            'lowStockThreshold' => self::LOW_STOCK_THRESHOLD,
        ]);
    }

    /**
     * Return a current date window and its directly-preceding comparison window.
     *
     * @return array{start: Carbon, end: Carbon, previous_start: ?Carbon, previous_end: ?Carbon, comparison_label: string}
     */
    private function periodWindow(string $period): array
    {
        $now = now()->copy();
        $previousStart = null;
        $previousEnd = null;
        $comparisonLabel = 'No comparison available';

        switch ($period) {
            case 'today':
                $start = $now->copy()->startOfDay();
                $end = $now->copy()->endOfDay();
                $previousStart = $start->copy()->subDay();
                $previousEnd = $previousStart->copy()->endOfDay();
                $comparisonLabel = 'vs yesterday';
                break;

            case 'yesterday':
                $start = $now->copy()->subDay()->startOfDay();
                $end = $start->copy()->endOfDay();
                $previousStart = $start->copy()->subDay();
                $previousEnd = $previousStart->copy()->endOfDay();
                $comparisonLabel = 'vs previous day';
                break;

            case 'week':
                $start = $now->copy()->startOfWeek();
                $end = $now->copy()->endOfWeek();
                $previousStart = $start->copy()->subWeek();
                $previousEnd = $end->copy()->subWeek();
                $comparisonLabel = 'vs last week';
                break;

            case 'last_7_days':
                $start = $now->copy()->startOfDay()->subDays(6);
                $end = $now->copy()->endOfDay();
                $previousStart = $start->copy()->subDays(7);
                $previousEnd = $start->copy()->subSecond();
                $comparisonLabel = 'vs previous 7 days';
                break;

            case 'month':
                $start = $now->copy()->startOfMonth();
                $end = $now->copy()->endOfMonth();
                $previousStart = $start->copy()->subMonth()->startOfMonth();
                $previousEnd = $start->copy()->subSecond();
                $comparisonLabel = 'vs last month';
                break;

            case 'last_30_days':
                $start = $now->copy()->startOfDay()->subDays(29);
                $end = $now->copy()->endOfDay();
                $previousStart = $start->copy()->subDays(30);
                $previousEnd = $start->copy()->subSecond();
                $comparisonLabel = 'vs previous 30 days';
                break;

            case 'year':
                $start = $now->copy()->startOfYear();
                $end = $now->copy()->endOfYear();
                $previousStart = $start->copy()->subYear()->startOfYear();
                $previousEnd = $start->copy()->subSecond();
                $comparisonLabel = 'vs last year';
                break;

            case 'last_90_days':
                $start = $now->copy()->startOfDay()->subDays(89);
                $end = $now->copy()->endOfDay();
                $previousStart = $start->copy()->subDays(90);
                $previousEnd = $start->copy()->subSecond();
                $comparisonLabel = 'vs previous 90 days';
                break;

            case 'last_12_months':
                $start = $now->copy()->startOfMonth()->subMonths(11);
                $end = $now->copy()->endOfDay();
                $previousStart = $start->copy()->subMonths(12);
                $previousEnd = $start->copy()->subSecond();
                $comparisonLabel = 'vs previous 12 months';
                break;

            case 'all_time':
                $start = Carbon::create(1970, 1, 1)->startOfDay();
                $end = $now->copy()->endOfDay();
                $comparisonLabel = 'all time';
                break;

            default:
                $start = $now->copy()->startOfWeek();
                $end = $now->copy()->endOfWeek();
                $previousStart = $start->copy()->subWeek();
                $previousEnd = $end->copy()->subWeek();
                $comparisonLabel = 'vs last week';
                break;
        }

        return [
            'start' => $start,
            'end' => $end,
            'previous_start' => $previousStart,
            'previous_end' => $previousEnd,
            'comparison_label' => $comparisonLabel,
        ];
    }

    private function makeStat(
        string $title,
        string $value,
        float|int $current,
        float|int|null $previous,
        array $window,
        string $filterKey,
        string $period,
        array $periodOptions
    ): array {
        return [
            'title' => $title,
            'value' => $value,
            'growth' => $previous === null ? null : $this->growthPercentage($current, $previous),
            'growthLabel' => $window['comparison_label'],
            'filterKey' => $filterKey,
            'period' => $period,
            'periodOptions' => $periodOptions,
        ];
    }

    /**
     * Build a compact revenue time series with suitable bucket sizes for each range.
     *
     * @return array{start: Carbon, unit: string, bins: array<int, array{key: string, label: string}>}
     */
    private function revenueChartConfiguration(string $period): array
    {
        $now = now()->copy();

        switch ($period) {
            case 'today':
                $unit = 'hour';
                $start = $now->copy()->startOfDay();
                $count = 24;
                break;

            case 'last_7_days':
                $unit = 'day';
                $start = $now->copy()->startOfDay()->subDays(6);
                $count = 7;
                break;

            case 'last_30_days':
                $unit = 'day';
                $start = $now->copy()->startOfDay()->subDays(29);
                $count = 30;
                break;

            case 'this_month':
                $unit = 'day';
                $start = $now->copy()->startOfMonth();
                $count = (int) $now->format('j');
                break;

            case 'last_90_days':
                $unit = 'week';
                $start = $now->copy()->startOfWeek()->subWeeks(12);
                $count = 13;
                break;

            case 'last_3_months':
                $unit = 'month';
                $start = $now->copy()->startOfMonth()->subMonths(2);
                $count = 3;
                break;

            case 'six_months':
                $unit = 'month';
                $start = $now->copy()->startOfMonth()->subMonths(5);
                $count = 6;
                break;

            case 'twelve_months':
                $unit = 'month';
                $start = $now->copy()->startOfMonth()->subMonths(11);
                $count = 12;
                break;

            case 'two_years':
                $unit = 'month';
                $start = $now->copy()->startOfMonth()->subMonths(23);
                $count = 24;
                break;

            case 'five_years':
                $unit = 'month';
                $start = $now->copy()->startOfMonth()->subMonths(59);
                $count = 60;
                break;

            case 'all_time':
                $unit = 'year';
                $firstPaidOrder = Order::query()
                    ->where('payment_status', 'paid')
                    ->orderByRaw('COALESCE(paid_at, created_at) ASC')
                    ->first(['paid_at', 'created_at']);
                $firstPaidDate = $firstPaidOrder
                    ? ($firstPaidOrder->paid_at ?? $firstPaidOrder->created_at)
                    : $now;
                $start = $firstPaidDate->copy()->startOfYear();
                $count = max(1, (int) $now->format('Y') - (int) $start->format('Y') + 1);
                break;

            case 'year':
            default:
                $unit = 'month';
                $start = $now->copy()->startOfYear();
                $count = 12;
                break;
        }

        $bins = [];
        $cursor = $start->copy();

        for ($index = 0; $index < $count; $index++) {
            $key = match ($unit) {
                'hour' => $cursor->format('Y-m-d H'),
                'day' => $cursor->format('Y-m-d'),
                'week' => $cursor->format('o-W'),
                'month' => $cursor->format('Y-m'),
                default => $cursor->format('Y'),
            };

            $label = match ($unit) {
                'hour' => $cursor->format('g A'),
                'day' => $cursor->format('M j'),
                'week' => 'Week of ' . $cursor->format('M j'),
                'month' => $period === 'year' ? $cursor->format('M') : $cursor->format('M y'),
                default => $cursor->format('Y'),
            };

            $bins[] = ['key' => $key, 'label' => $label];

            $cursor = match ($unit) {
                'hour' => $cursor->addHour(),
                'day' => $cursor->addDay(),
                'week' => $cursor->addWeek(),
                'month' => $cursor->addMonth(),
                default => $cursor->addYear(),
            };
        }

        return [
            'start' => $start,
            'unit' => $unit,
            'bins' => $bins,
        ];
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
            ->whereDate('preferred_date', '>=', $start->toDateString())
            ->whereDate('preferred_date', '<=', $end->toDateString());
    }

    private function growthPercentage(float|int $current, float|int|null $previous): ?float
    {
        if ($previous === null) {
            return null;
        }

        if ($previous <= 0) {
            return $current > 0 ? null : 0.0;
        }

        return round((($current - $previous) / $previous) * 100, 1);
    }
}
