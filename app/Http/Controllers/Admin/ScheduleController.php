<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Inquiry;
use App\Models\User;
use Illuminate\Http\Request;
use Inertia\Inertia;

class ScheduleController extends Controller
{
    public function index(Request $request)
    {
        $filters = $request->validate([
            'search' => ['nullable', 'string', 'max:120'],
            'status' => ['nullable', 'in:confirmed,in_progress'],
            'technician' => ['nullable', 'integer', 'exists:users,id'],
        ]);

        $query = Inquiry::with(['user', 'technician'])
            ->whereIn('status', ['confirmed', 'in_progress']);

        if (!empty($filters['search'])) {
            $search = $filters['search'];

            $query->where(function ($builder) use ($search) {
                $builder
                    ->where('inquiry_number', 'like', '%' . $search . '%')
                    ->orWhere('customer_name', 'like', '%' . $search . '%')
                    ->orWhere('customer_email', 'like', '%' . $search . '%')
                    ->orWhere('service_type', 'like', '%' . $search . '%')
                    ->orWhere('item_name', 'like', '%' . $search . '%');
            });
        }

        if (!empty($filters['status'])) {
            $query->where('status', $filters['status']);
        }

        if (!empty($filters['technician'])) {
            $query->where('technician_id', $filters['technician']);
        }

        $schedules = $query
            ->orderByRaw("CASE urgency WHEN 'emergency' THEN 1 WHEN 'urgent' THEN 2 ELSE 3 END")
            ->orderBy('preferred_date')
            ->orderBy('preferred_time')
            ->orderByDesc('created_at')
            ->get()
            ->map(function (Inquiry $inquiry) {
                return [
                    'id' => $inquiry->id,
                    'inquiry_number' => $inquiry->inquiry_number,
                    'customer_name' => $inquiry->customer_name,
                    'customer_phone' => $inquiry->customer_phone,
                    'service_type' => $inquiry->service_type,
                    'item_name' => $inquiry->item_name,
                    'urgency' => $inquiry->urgency,
                    'preferred_date' => $inquiry->preferred_date?->format('M d, Y'),
                    'preferred_time' => $inquiry->preferred_time,
                    'city' => $inquiry->city,
                    'status' => $inquiry->status,
                    'technician' => $inquiry->technician
                        ? [
                            'id' => $inquiry->technician->id,
                            'name' => $inquiry->technician->name,
                            'email' => $inquiry->technician->email,
                        ]
                        : null,
                ];
            })
            ->values();

        $technicians = User::where('role', 'technician')
            ->orderBy('name')
            ->get(['id', 'name', 'email'])
            ->values();

        return Inertia::render('Admin/Schedules', [
            'schedules' => $schedules,
            'technicians' => $technicians,
            'filters' => [
                'search' => $filters['search'] ?? '',
                'status' => $filters['status'] ?? '',
                'technician' => $filters['technician'] ?? '',
            ],
            'summary' => [
                'active' => Inquiry::whereIn('status', ['confirmed', 'in_progress'])->count(),
                'confirmed' => Inquiry::where('status', 'confirmed')->count(),
                'in_progress' => Inquiry::where('status', 'in_progress')->count(),
                'unassigned' => Inquiry::whereIn('status', ['confirmed', 'in_progress'])
                    ->whereNull('technician_id')
                    ->count(),
            ],
        ]);
    }
}
