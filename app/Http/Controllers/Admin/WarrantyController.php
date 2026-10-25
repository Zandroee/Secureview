<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\CustomerNotification;
use App\Models\OrderItem;
use App\Models\WarrantyClaim;
use App\Services\WarrantyEligibilityService;
use Illuminate\Http\Request;
use Inertia\Inertia;

class WarrantyController extends Controller
{
    private const STATUSES = [
        'submitted',
        'under_review',
        'approved',
        'rejected',
        'in_service',
        'resolved',
        'cancelled',
    ];

    public function index(Request $request, WarrantyEligibilityService $warrantyEligibility)
    {
        $filters = $request->validate([
            'search' => ['nullable', 'string', 'max:120'],
            'status' => ['nullable', 'in:' . implode(',', self::STATUSES)],
            'date_from' => ['nullable', 'date'],
            'date_to' => ['nullable', 'date', 'after_or_equal:date_from'],
        ]);

        $warrantyQuery = OrderItem::query()
            ->with(['order', 'purchasable', 'warrantyClaims'])
            ->whereHas('warrantyClaims')
            ->whereHas('order', fn ($orderQuery) => $orderQuery
                ->where('payment_status', 'paid')
                ->whereNotIn('order_status', ['cancelled', 'payment_failed']));

        if (!empty($filters['search'])) {
            $search = $filters['search'];

            $warrantyQuery->where(function ($builder) use ($search) {
                $builder
                    ->where('order_items.name', 'like', '%' . $search . '%')
                    ->orWhereHas('order', fn ($orderQuery) => $orderQuery
                        ->where('order_number', 'like', '%' . $search . '%')
                        ->orWhere('customer_name', 'like', '%' . $search . '%')
                        ->orWhere('customer_email', 'like', '%' . $search . '%'))
                    ->orWhereHas('warrantyClaims', fn ($claimQuery) => $claimQuery
                        ->where('claim_number', 'like', '%' . $search . '%')
                        ->orWhere('issue_description', 'like', '%' . $search . '%'));
            });
        }

        if (!empty($filters['status'])) {
            $warrantyQuery->whereHas('warrantyClaims', fn ($claimQuery) =>
                $claimQuery->where('status', $filters['status'])
            );
        }
        if (!empty($filters['date_from'])) {
            $warrantyQuery->whereHas('warrantyClaims', fn ($claimQuery) =>
                $claimQuery->whereDate('created_at', '>=', $filters['date_from'])
            );
        }
        if (!empty($filters['date_to'])) {
            $warrantyQuery->whereHas('warrantyClaims', fn ($claimQuery) =>
                $claimQuery->whereDate('created_at', '<=', $filters['date_to'])
            );
        }

        $warranties = $warrantyQuery
            ->orderByDesc('order_items.created_at')
            ->paginate(10, ['*'], 'coverage_page')
            ->withQueryString()
            ->through(function (OrderItem $item) use ($warrantyEligibility, $filters) {
                $associatedClaims = $item->warrantyClaims
                    ->sortByDesc('created_at')
                    ->map(fn (WarrantyClaim $claim) => [
                        'id' => $claim->id,
                        'claim_number' => $claim->claim_number,
                        'status' => $claim->status,
                        'issue_description' => $claim->issue_description,
                        'admin_notes' => $claim->admin_notes,
                        'submitted_at' => $claim->created_at?->format('M d, Y h:i A'),
                        'reviewed_at' => $claim->reviewed_at?->format('M d, Y h:i A'),
                        'resolved_at' => $claim->resolved_at?->format('M d, Y h:i A'),
                    ])
                    ->values();

                if (!empty($filters['status'])) {
                    $associatedClaims = $associatedClaims
                        ->where('status', $filters['status'])
                        ->values();
                }

                $latestClaim = $associatedClaims->first();
                $startDate = $item->order
                    ? $warrantyEligibility->startDateFor($item->order)
                    : null;
                $expiryDate = $warrantyEligibility->expiryDateFor($item);

                return [
                    'id' => $item->id,
                    'order_number' => $item->order?->order_number,
                    'customer_name' => $item->order?->customer_name ?? 'Unknown customer',
                    'customer_email' => $item->order?->customer_email,
                    'item_name' => $item->name,
                    'quantity' => (int) $item->quantity,
                    'warranty_period' => $warrantyEligibility->periodFor($item),
                    'warranty_start_date' => $startDate?->format('M d, Y'),
                    'warranty_expiry_date' => $expiryDate?->format('M d, Y'),
                    'coverage_status' => $warrantyEligibility->coverageStatusFor($item),
                    'latest_claim_number' => $latestClaim['claim_number'] ?? null,
                    'latest_claim_status' => $latestClaim['status'] ?? null,
                    'claims' => $associatedClaims,
                ];
            });

        return Inertia::render('Admin/Warranty', [
            'warranties' => $warranties,
            'filters' => [
                'search' => $filters['search'] ?? '',
                'status' => $filters['status'] ?? '',
                'date_from' => $filters['date_from'] ?? '',
                'date_to' => $filters['date_to'] ?? '',
            ],
            'summary' => [
                'total' => WarrantyClaim::count(),
                'open' => WarrantyClaim::whereIn('status', WarrantyClaim::ACTIVE_STATUSES)->count(),
                'under_review' => WarrantyClaim::where('status', 'under_review')->count(),
                'in_service' => WarrantyClaim::where('status', 'in_service')->count(),
                'resolved' => WarrantyClaim::where('status', 'resolved')->count(),
            ],
            'statuses' => self::STATUSES,
        ]);
    }

    public function update(Request $request, WarrantyClaim $warrantyClaim)
    {
        $validated = $request->validate([
            'status' => ['required', 'in:' . implode(',', self::STATUSES)],
            'admin_notes' => ['nullable', 'string', 'max:2000'],
        ]);

        $oldStatus = $warrantyClaim->status;
        $oldNotes = $warrantyClaim->admin_notes;
        $newStatus = $validated['status'];
        $newNotes = $validated['admin_notes'] ?? null;

        $warrantyClaim->update([
            'status' => $newStatus,
            'admin_notes' => $newNotes,
            'reviewed_at' => $newStatus === 'submitted'
                ? null
                : ($warrantyClaim->reviewed_at ?? now()),
            'resolved_at' => $newStatus === 'resolved'
                ? ($warrantyClaim->resolved_at ?? now())
                : null,
        ]);

        if ($oldStatus !== $newStatus || $oldNotes !== $newNotes) {
            CustomerNotification::create([
                'user_id' => $warrantyClaim->user_id,
                'type' => 'warranty_claim_update',
                'title' => 'Warranty claim updated',
                'message' => 'Your warranty claim ' . $warrantyClaim->claim_number . ' has an update. Current status: ' . str_replace('_', ' ', $newStatus) . '.',
                'action_url' => route('warranty-claims.index'),
                'related_type' => WarrantyClaim::class,
                'related_id' => $warrantyClaim->id,
            ]);
        }

        return back()->with('success', 'Warranty claim updated successfully.');
    }
}
