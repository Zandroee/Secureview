<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class OrderEvent extends Model
{
    protected $fillable = [
        'order_id',
        'actor_user_id',
        'event_key',
        'title',
        'description',
        'payment_status_before',
        'payment_status_after',
        'order_status_before',
        'order_status_after',
        'metadata',
    ];

    protected $casts = [
        'metadata' => 'array',
    ];

    public function order(): BelongsTo
    {
        return $this->belongsTo(Order::class);
    }

    public function actor(): BelongsTo
    {
        return $this->belongsTo(User::class, 'actor_user_id');
    }
}
