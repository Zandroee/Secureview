<?php

namespace App\Http\Controllers;

use App\Models\CustomerNotification;
use App\Models\OrderItem;
use App\Models\WarrantyClaim;
use App\Services\WarrantyEligibilityService;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Inertia\Inertia;

class WarrantyClaimController extends Controller
{
    public function index(Request $request, WarrantyEligibilityService $warrantyEligibility)
    {
        $claims = WarrantyClaim::query()
            ->with(['order', 'orderItem.purchasable'])
            ->where('user_id', $request->user()->id)
            ->latest()
            ->paginate(10)
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

        $eligibleItems = OrderItem::query()
            ->whereHas('order', fn ($query) => $query
                ->where('user_id', $request->user()->id)
                ->where('payment_status', 'paid')
                ->whereNotIn('order_status', ['cancelled', 'payment_failed']))
            ->with(['order', 'purchasable', 'warrantyClaims'])
            ->latest()
            ->get()
            ->filter(function (OrderItem $item) use ($warrantyEligibility) {
                if (!$warrantyEligibility->isCovered($item)) {
                    return false;
                }

                return !$item->warrantyClaims->contains(
                    fn (WarrantyClaim $claim) => in_array(
                        $claim->status,
                        WarrantyClaim::ACTIVE_STATUSES,
                        true
                    )
                );
            })
            ->map(function (OrderItem $item) use ($warrantyEligibility) {
                $startDate = $item->order
                    ? $warrantyEligibility->startDateFor($item->order)
                    : null;
                $expiryDate = $warrantyEligibility->expiryDateFor($item);

                return [
                    'id' => $item->id,
                    'order_number' => $item->order?->order_number,
                    'name' => $item->name,
                    'type' => str_contains($item->purchasable_type, 'Package') ? 'Package' : 'Product',
                    'quantity' => (int) $item->quantity,
                    'warranty_period' => $warrantyEligibility->periodFor($item),
                    'warranty_start_date' => $startDate?->format('M d, Y'),
                    'warranty_expiry_date' => $expiryDate?->format('M d, Y'),
                ];
            })
            ->values();

        return Inertia::render('warranty_claims', [
            'claims' => $claims,
            'eligibleItems' => $eligibleItems,
        ]);
    }

    public function store(Request $request, WarrantyEligibilityService $warrantyEligibility)
    {
        $validated = $request->validate([
            'order_item_id' => ['required', 'integer', 'exists:order_items,id'],
            'issue_description' => ['required', 'string', 'min:10', 'max:2000'],
        ]);

        $item = OrderItem::query()
            ->with(['order', 'purchasable', 'warrantyClaims'])
            ->findOrFail($validated['order_item_id']);

        if (!$item->order || (int) $item->order->user_id !== (int) $request->user()->id) {
            abort(404);
        }

        if (!$warrantyEligibility->isCovered($item)) {
            return back()->withErrors([
                'order_item_id' => 'This purchase is not currently eligible for warranty service. Check its payment status and warranty period.',
            ])->withInput();
        }

        $hasActiveClaim = $item->warrantyClaims->contains(
            fn (WarrantyClaim $claim) => in_array(
                $claim->status,
                WarrantyClaim::ACTIVE_STATUSES,
                true
            )
        );

        if ($hasActiveClaim) {
            return back()->withErrors([
                'order_item_id' => 'There is already an active warranty claim for this order item.',
            ])->withInput();
        }

        do {
            $claimNumber = 'WCL-' . now()->format('Ymd') . '-' . Str::upper(Str::random(6));
        } while (WarrantyClaim::query()->where('claim_number', $claimNumber)->exists());

        $claim = WarrantyClaim::create([
            'user_id' => $request->user()->id,
            'order_id' => $item->order_id,
            'order_item_id' => $item->id,
            'claim_number' => $claimNumber,
            'issue_description' => $validated['issue_description'],
            'status' => 'submitted',
        ]);

        CustomerNotification::create([
            'user_id' => $request->user()->id,
            'type' => 'warranty_claim',
            'title' => 'Warranty claim submitted',
            'message' => 'Your warranty claim ' . $claim->claim_number . ' has been submitted for review.',
            'action_url' => route('warranty-claims.index'),
            'related_type' => WarrantyClaim::class,
            'related_id' => $claim->id,
        ]);

        return redirect()
            ->route('warranty-claims.index')
            ->with('success', 'Your warranty service request has been submitted.');
    }
}
