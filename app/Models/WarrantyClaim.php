<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class WarrantyClaim extends Model
{
    public const ACTIVE_STATUSES = [
        'submitted',
        'under_review',
        'approved',
        'in_service',
    ];

    protected $fillable = [
        'user_id',
        'order_id',
        'order_item_id',
        'claim_number',
        'issue_description',
        'status',
        'admin_notes',
        'reviewed_at',
        'resolved_at',
    ];

    protected $casts = [
        'reviewed_at' => 'datetime',
        'resolved_at' => 'datetime',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function order(): BelongsTo
    {
        return $this->belongsTo(Order::class);
    }

    public function orderItem(): BelongsTo
    {
        return $this->belongsTo(OrderItem::class);
    }
}
