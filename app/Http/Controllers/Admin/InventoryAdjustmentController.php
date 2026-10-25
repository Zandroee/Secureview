<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\InventoryAdjustment;
use Illuminate\Http\Request;
use Inertia\Inertia;

class InventoryAdjustmentController extends Controller
{
    public function index(Request $request)
    {
        $filters = $request->validate([
            'search' => ['nullable', 'string', 'max:120'],
            'date_from' => ['nullable', 'date'],
            'date_to' => ['nullable', 'date', 'after_or_equal:date_from'],
            'direction' => ['nullable', 'in:increase,decrease'],
        ]);

        $query = InventoryAdjustment::query()
            ->with(['product:id,name', 'user:id,name,email'])
            ->latest('created_at');

        if (!empty($filters['search'])) {
            $search = $filters['search'];
            $query->where(function ($builder) use ($search) {
                $builder->where('product_name', 'like', '%' . $search . '%')
                    ->orWhere('reason', 'like', '%' . $search . '%')
                    ->orWhereHas('user', fn ($userQuery) => $userQuery->where('name', 'like', '%' . $search . '%'));
            });
        }

        if (!empty($filters['date_from'])) {
            $query->whereDate('created_at', '>=', $filters['date_from']);
        }

        if (!empty($filters['date_to'])) {
            $query->whereDate('created_at', '<=', $filters['date_to']);
        }

        if (($filters['direction'] ?? null) === 'increase') {
            $query->where('quantity_change', '>', 0);
        } elseif (($filters['direction'] ?? null) === 'decrease') {
            $query->where('quantity_change', '<', 0);
        }

        $adjustments = $query->paginate(20)->withQueryString()->through(fn (InventoryAdjustment $adjustment) => [
            'id' => $adjustment->id,
            'product_name' => $adjustment->product_name,
            'actor_name' => $adjustment->user?->name ?? 'Deleted user',
            'actor_email' => $adjustment->user?->email,
            'previous_quantity' => $adjustment->previous_quantity,
            'new_quantity' => $adjustment->new_quantity,
            'quantity_change' => $adjustment->quantity_change,
            'reason' => $adjustment->reason,
            'created_at' => $adjustment->created_at?->format('M d, Y h:i A'),
        ]);

        return Inertia::render('Admin/InventoryAdjustments', [
            'adjustments' => $adjustments,
            'filters' => [
                'search' => $filters['search'] ?? '',
                'date_from' => $filters['date_from'] ?? '',
                'date_to' => $filters['date_to'] ?? '',
                'direction' => $filters['direction'] ?? '',
            ],
        ]);
    }
}
