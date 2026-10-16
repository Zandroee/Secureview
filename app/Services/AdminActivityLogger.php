<?php

namespace App\Services;

use App\Models\AdminActivityLog;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\Request;

class AdminActivityLogger
{
    /**
     * Only these non-sensitive fields may be persisted as before/after values.
     * Add new keys deliberately when new audited admin actions are implemented.
     */
    private const ALLOWED_VALUE_KEYS = [
        'role',
        'stock_quantity',
        'technician_id',
        'allow_additional_technicians',
        'status',
        'name',
        'category',
        'warranty',
        'price',
        'badge',
        'is_featured',
        'items_count',
    ];

    public function record(
        Request $request,
        string $action,
        string $description,
        ?Model $subject = null,
        array $oldValues = [],
        array $newValues = []
    ): ?AdminActivityLog {
        $admin = $request->user();

        if (!$admin || !$admin->isAdmin()) {
            return null;
        }

        $filterValues = static function (array $values): array {
            return array_intersect_key(
                $values,
                array_flip(self::ALLOWED_VALUE_KEYS)
            );
        };

        return AdminActivityLog::create([
            'admin_id' => $admin->id,
            // Keep a snapshot so the actor remains identifiable if their account is later removed.
            'admin_name' => $admin->name,
            'action' => $action,
            'description' => $description,
            'subject_type' => $subject ? class_basename($subject) : null,
            'subject_id' => $subject?->getKey(),
            'old_values' => $filterValues($oldValues) ?: null,
            'new_values' => $filterValues($newValues) ?: null,
            'ip_address' => $request->ip(),
            'user_agent' => $request->userAgent(),
        ]);
    }
}
