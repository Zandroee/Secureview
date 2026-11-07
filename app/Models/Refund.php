<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Refund extends Model
{
    protected $fillable = [
        'order_id',
        'inquiry_id',
        'customer_id',
        'requested_by_user_id',
        'processed_by_user_id',
        'source',
        'amount_requested',
        'amount_approved',
        'reason_code',
        'reason',
        'admin_notes',
        'rejection_reason',
        'status',
        'provider',
        'provider_refund_id',
        'idempotency_key',
        'provider_status',
        'provider_error',
        'provider_response',
        'requested_at',
        'approved_at',
        'submitted_at',
        'completed_at',
    ];

    protected $casts = [
        'amount_requested' => 'decimal:2',
        'amount_approved' => 'decimal:2',
        'provider_response' => 'array',
        'requested_at' => 'datetime',
        'approved_at' => 'datetime',
        'submitted_at' => 'datetime',
        'completed_at' => 'datetime',
    ];

    public function order(): BelongsTo
    {
        return $this->belongsTo(Order::class);
    }

    public function inquiry(): BelongsTo
    {
        return $this->belongsTo(Inquiry::class);
    }

    public function customer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'customer_id');
    }

    public function requester(): BelongsTo
    {
        return $this->belongsTo(User::class, 'requested_by_user_id');
    }

    public function processor(): BelongsTo
    {
        return $this->belongsTo(User::class, 'processed_by_user_id');
    }
}
