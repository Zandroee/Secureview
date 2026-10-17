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
            'filters' => ['search' => $filters['search'] ?? ''],
        ]);
    }
}
