<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\CustomerNotification;
use App\Models\ServiceRecord;
use Illuminate\Http\Request;
use Inertia\Inertia;

class ServiceRecordController extends Controller
{
    public function index(Request $request)
    {
        $filters = $request->validate([
            'search' => ['nullable', 'string', 'max:120'],
            'payment_status' => ['nullable', 'in:paid,pending'],
            'date_from' => ['nullable', 'date'],
            'date_to' => ['nullable', 'date', 'after_or_equal:date_from'],
        ]);

        $query = ServiceRecord::query()
            ->with(['inquiry.user', 'technician', 'items'])
            ->latest();

        if (filled($filters['search'] ?? null)) {
            $search = trim($filters['search']);
            $query->where(function ($builder) use ($search) {
                $builder->whereHas('inquiry', function ($inquiry) use ($search) {
                    $inquiry->where('inquiry_number', 'like', '%' . $search . '%')
                        ->orWhere('customer_name', 'like', '%' . $search . '%')
                        ->orWhere('service_type', 'like', '%' . $search . '%');
                })->orWhereHas('technician', fn ($technician) => $technician->where('name', 'like', '%' . $search . '%'))
                    ->orWhere('work_summary', 'like', '%' . $search . '%');
            });
        }

        if (filled($filters['payment_status'] ?? null)) {
            $query->where('payment_status', $filters['payment_status']);
        }
        if (filled($filters['date_from'] ?? null)) {
            $query->whereDate('created_at', '>=', $filters['date_from']);
        }
        if (filled($filters['date_to'] ?? null)) {
            $query->whereDate('created_at', '<=', $filters['date_to']);
        }

        $records = $query->paginate(12)->withQueryString()->through(
            fn (ServiceRecord $record) => $this->formatRecord($record)
        );

        $summaryQuery = ServiceRecord::query();
        return Inertia::render('Admin/ServiceRecords', [
            'records' => $records,
            'filters' => [
                'search' => $filters['search'] ?? '',
                'payment_status' => $filters['payment_status'] ?? '',
                'date_from' => $filters['date_from'] ?? '',
                'date_to' => $filters['date_to'] ?? '',
            ],
            'summary' => [
                'records' => (clone $summaryQuery)->count(),
                'paid_service_income' => (float) (clone $summaryQuery)->where('payment_status', 'paid')->sum('service_charge'),
                'pending_service_charges' => (float) (clone $summaryQuery)->where('payment_status', 'pending')->sum('service_charge'),
                'products_used' => (int) \App\Models\ServiceRecordItem::query()->sum('quantity'),
            ],
        ]);
    }

    public function confirmPayment(Request $request, ServiceRecord $record)
    {
        $validated = $request->validate([
            'payment_method' => ['required', 'in:cash,gcash,card,maya'],
        ]);

        if ((float) $record->service_charge <= 0) {
            return back()->withErrors(['payment' => 'A zero-charge service record has no service income to confirm.']);
        }

        if ($record->payment_status === 'paid') {
            return back()->with('success', 'Service payment was already confirmed.');
        }

        if ($record->payment_status !== 'pending') {
            return back()->withErrors(['payment' => 'Only a pending service charge can be confirmed as paid.']);
        }

        $record->update([
            'payment_status' => 'paid',
            'payment_method' => $validated['payment_method'],
            'paid_at' => now(),
        ]);

        $record->load('inquiry');

        if ($record->inquiry?->user_id) {
            CustomerNotification::create([
                'user_id' => $record->inquiry->user_id,
                'type' => 'service_payment',
                'title' => 'Service payment confirmed',
                'message' => 'Payment of ₱' . number_format((float) $record->service_charge, 2) . ' for service ' . $record->inquiry->inquiry_number . ' has been recorded by SecureView.',
                'action_url' => route('inquiries.show', $record->inquiry),
                'related_type' => ServiceRecord::class,
                'related_id' => $record->id,
            ]);
        }

        return back()->with('success', 'Service income payment confirmed.');
    }

    private function formatRecord(ServiceRecord $record): array
    {
        $inquiry = $record->inquiry;
        return [
            'id' => $record->id,
            'inquiry_id' => $record->inquiry_id,
            'inquiry_number' => $inquiry?->inquiry_number ?? 'Deleted service',
            'customer_name' => $inquiry?->customer_name ?? '—',
            'service_type' => $inquiry?->service_type ?? 'Service',
            'service_status' => $inquiry?->status ?? 'unknown',
            'technician_name' => $record->technician?->name ?? '—',
            'service_outcome' => $record->service_outcome,
            'work_summary' => $record->work_summary,
            'recommendations' => $record->recommendations,
            'service_charge' => (float) $record->service_charge,
            'payment_status' => $record->payment_status,
            'payment_method' => $record->payment_method,
            'paid_at' => $record->paid_at?->format('M d, Y h:i A'),
            'created_at' => $record->created_at?->format('M d, Y h:i A'),
            'items' => $record->items->map(fn ($item) => [
                'product_name' => $item->product_name,
                'quantity' => (int) $item->quantity,
                'unit_price' => (float) $item->unit_price,
                'notes' => $item->notes,
            ])->values(),
        ];
    }
}
