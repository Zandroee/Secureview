<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class BlockedBookingDate extends Model
{
    protected $fillable = [
        'booking_date',
        'reason',
        'blocked_by',
    ];

    protected $casts = [
        'booking_date' => 'date',
    ];

    public function blockedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'blocked_by');
    }
}
