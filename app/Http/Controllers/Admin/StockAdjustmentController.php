<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\StockAdjustment;
use App\Models\User;
use Illuminate\Http\Request;
use Inertia\Inertia;

class StockAdjustmentController extends Controller
{
    public function index(Request $request)
    {
        $filters = $request->validate([
            'search' => ['nullable', 'string', 'max:120'],
            'changed_by' => ['nullable', 'integer', 'exists:users,id'],
            'date_from' => ['nullable', 'date'],
            'date_to' => ['nullable', 'date', 'after_or_equal:date_from'],
        ]);

        $query = StockAdjustment::query()->with(['changedBy:id,name', 'product:id,name']);

        if (!empty($filters['search'])) {
            $search = $filters['search'];
            $query->where(function ($builder) use ($search) {
                $builder->where('product_name', 'like', '%' . $search . '%')
                    ->orWhere('reason', 'like', '%' . $search . '%')
                    ->orWhereHas('changedBy', fn ($user) => $user->where('name', 'like', '%' . $search . '%'));
            });
        }

        if (!empty($filters['changed_by'])) {
            $query->where('changed_by', $filters['changed_by']);
        }

        if (!empty($filters['date_from'])) {
            $query->whereDate('created_at', '>=', $filters['date_from']);
        }

        if (!empty($filters['date_to'])) {
            $query->whereDate('created_at', '<=', $filters['date_to']);
        }

        $adjustments = $query
            ->orderByDesc('created_at')
            ->paginate(15)
            ->withQueryString()
            ->through(fn (StockAdjustment $adjustment) => [
                'id' => $adjustment->id,
                'product_name' => $adjustment->product_name,
                'changed_by' => $adjustment->changedBy?->name ?? 'Deleted account',
                'previous_quantity' => $adjustment->previous_quantity,
                'new_quantity' => $adjustment->new_quantity,
                'quantity_change' => $adjustment->quantity_change,
                'reason' => $adjustment->reason,
                'created_at' => $adjustment->created_at?->format('M d, Y h:i A'),
            ]);

        return Inertia::render('Admin/StockAdjustments', [
            'adjustments' => $adjustments,
            'staffUsers' => User::query()
                ->whereIn('role', ['admin', 'technician'])
                ->orderBy('name')
                ->get(['id', 'name', 'role']),
            'filters' => [
                'search' => $filters['search'] ?? '',
                'changed_by' => $filters['changed_by'] ?? '',
                'date_from' => $filters['date_from'] ?? '',
                'date_to' => $filters['date_to'] ?? '',
            ],
        ]);
    }
}
