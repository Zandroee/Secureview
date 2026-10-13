<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\AdminActivityLog;
use App\Models\User;
use Illuminate\Http\Request;
use Inertia\Inertia;

class ActivityLogController extends Controller
{
    private const ACTION_LABELS = [
        'admin_logged_in' => 'Admin signed in',
        'admin_logged_out' => 'Admin signed out',
        'user_role_updated' => 'User role updated',
        'product_stock_updated' => 'Product stock updated',
        'inquiry_technician_assigned' => 'Technician assignment changed',
        'inquiry_status_updated' => 'Inquiry status updated',
        'package_created' => 'Package created',
        'package_updated' => 'Package updated',
        'package_deleted' => 'Package deleted',
    ];

    public function index(Request $request)
    {
        $filters = $request->validate([
            'search' => ['nullable', 'string', 'max:120'],
            'action' => ['nullable', 'in:admin_logged_in,admin_logged_out,user_role_updated,product_stock_updated,inquiry_technician_assigned,inquiry_status_updated,package_created,package_updated,package_deleted'],
            'admin_id' => ['nullable', 'integer', 'exists:users,id'],
            'date_from' => ['nullable', 'date'],
            'date_to' => ['nullable', 'date', 'after_or_equal:date_from'],
        ]);

        $query = AdminActivityLog::query()->with('admin:id,name,email');

        if (!empty($filters['search'])) {
            $search = $filters['search'];

            $query->where(function ($builder) use ($search) {
                $builder
                    ->where('admin_name', 'like', '%' . $search . '%')
                    ->orWhere('action', 'like', '%' . $search . '%')
                    ->orWhere('description', 'like', '%' . $search . '%')
                    ->orWhere('subject_type', 'like', '%' . $search . '%');

                if (ctype_digit($search)) {
                    $builder->orWhere('subject_id', (int) $search);
                }
            });
        }

        if (!empty($filters['action'])) {
            $query->where('action', $filters['action']);
        }

        if (!empty($filters['admin_id'])) {
            $query->where('admin_id', $filters['admin_id']);
        }

        if (!empty($filters['date_from'])) {
            $query->whereDate('created_at', '>=', $filters['date_from']);
        }

        if (!empty($filters['date_to'])) {
            $query->whereDate('created_at', '<=', $filters['date_to']);
        }

        $logs = $query
            ->latestFirst()
            ->paginate(20)
            ->withQueryString()
            ->through(function (AdminActivityLog $log) {
                return [
                    'id' => $log->id,
                    'admin_id' => $log->admin_id,
                    'admin_name' => $log->admin_name,
                    'admin_email' => $log->admin?->email,
                    'action' => $log->action,
                    'action_label' => self::ACTION_LABELS[$log->action] ?? ucwords(str_replace('_', ' ', $log->action)),
                    'description' => $log->description,
                    'subject_type' => $log->subject_type,
                    'subject_id' => $log->subject_id,
                    'old_values' => $log->old_values ?? [],
                    'new_values' => $log->new_values ?? [],
                    'ip_address' => $log->ip_address,
                    'user_agent' => $log->user_agent,
                    'created_at' => $log->created_at?->format('M d, Y h:i A'),
                ];
            });

        $actorIds = AdminActivityLog::query()
            ->whereNotNull('admin_id')
            ->distinct()
            ->pluck('admin_id');

        $admins = User::query()
            ->whereIn('id', $actorIds)
            ->orderBy('name')
            ->get(['id', 'name', 'email']);

        return Inertia::render('Admin/ActivityLogs', [
            'logs' => $logs,
            'admins' => $admins,
            'actionOptions' => collect(self::ACTION_LABELS)
                ->map(fn (string $label, string $value) => [
                    'value' => $value,
                    'label' => $label,
                ])
                ->values(),
            'filters' => [
                'search' => $filters['search'] ?? '',
                'action' => $filters['action'] ?? '',
                'admin_id' => $filters['admin_id'] ?? '',
                'date_from' => $filters['date_from'] ?? '',
                'date_to' => $filters['date_to'] ?? '',
            ],
            'summary' => [
                'total' => AdminActivityLog::count(),
                'today' => AdminActivityLog::whereDate('created_at', today())->count(),
                'admins' => AdminActivityLog::whereNotNull('admin_id')
                    ->distinct('admin_id')
                    ->count('admin_id'),
            ],
        ]);
    }
}
