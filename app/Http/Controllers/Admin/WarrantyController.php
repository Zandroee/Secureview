<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\CustomerNotification;
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
        ]);

        $query = WarrantyClaim::query()
            ->with(['user', 'order', 'orderItem.purchasable'])
            ->latest();

        if (!empty($filters['search'])) {
            $search = $filters['search'];

            $query->where(function ($builder) use ($search) {
                $builder
                    ->where('claim_number', 'like', '%' . $search . '%')
                    ->orWhere('issue_description', 'like', '%' . $search . '%')
                    ->orWhereHas('user', fn ($userQuery) => $userQuery
                        ->where('name', 'like', '%' . $search . '%')
                        ->orWhere('email', 'like', '%' . $search . '%'))
                    ->orWhereHas('order', fn ($orderQuery) => $orderQuery
                        ->where('order_number', 'like', '%' . $search . '%'))
                    ->orWhereHas('orderItem', fn ($itemQuery) => $itemQuery
                        ->where('name', 'like', '%' . $search . '%'));
            });
        }

        if (!empty($filters['status'])) {
            $query->where('status', $filters['status']);
        }

        $claims = $query
            ->paginate(12)
            ->withQueryString()
            ->through(function (WarrantyClaim $claim) use ($warrantyEligibility) {
                $item = $claim->orderItem;
                $startDate = $claim->order
                    ? $warrantyEligibility->startDateFor($claim->order)
                    : null;
                $expiryDate = $item
                    ? $warrantyEligibility->expiryDateFor($item)
                    : null;

                return [
                    'id' => $claim->id,
                    'claim_number' => $claim->claim_number,
                    'customer_name' => $claim->user?->name ?? $claim->order?->customer_name ?? 'Unknown customer',
                    'customer_email' => $claim->user?->email ?? $claim->order?->customer_email,
                    'order_number' => $claim->order?->order_number,
                    'item_name' => $item?->name ?? 'Purchased item',
                    'warranty_period' => $item ? $warrantyEligibility->periodFor($item) : null,
                    'warranty_start_date' => $startDate?->format('M d, Y'),
                    'warranty_expiry_date' => $expiryDate?->format('M d, Y'),
                    'issue_description' => $claim->issue_description,
                    'status' => $claim->status,
                    'admin_notes' => $claim->admin_notes,
                    'submitted_at' => $claim->created_at?->format('M d, Y h:i A'),
                    'reviewed_at' => $claim->reviewed_at?->format('M d, Y h:i A'),
                    'resolved_at' => $claim->resolved_at?->format('M d, Y h:i A'),
                ];
            });

        return Inertia::render('Admin/Warranty', [
            'claims' => $claims,
            'filters' => [
                'search' => $filters['search'] ?? '',
                'status' => $filters['status'] ?? '',
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
        $newStatus = $validated['status'];

        $warrantyClaim->update([
            'status' => $newStatus,
            'admin_notes' => $validated['admin_notes'] ?? null,
            'reviewed_at' => $newStatus === 'submitted'
                ? null
                : ($warrantyClaim->reviewed_at ?? now()),
            'resolved_at' => $newStatus === 'resolved'
                ? ($warrantyClaim->resolved_at ?? now())
                : null,
        ]);

        if ($oldStatus !== $newStatus) {
            CustomerNotification::create([
                'user_id' => $warrantyClaim->user_id,
                'type' => 'warranty_claim_update',
                'title' => 'Warranty claim updated',
                'message' => 'Your warranty claim ' . $warrantyClaim->claim_number . ' is now ' . str_replace('_', ' ', $newStatus) . '.',
                'action_url' => route('warranty-claims.index'),
                'related_type' => WarrantyClaim::class,
                'related_id' => $warrantyClaim->id,
            ]);
        }

        return back()->with('success', 'Warranty claim updated successfully.');
    }
}
