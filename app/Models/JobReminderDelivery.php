<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class JobReminderDelivery extends Model
{
    protected $fillable = [
        'inquiry_id',
        'recipient_id',
        'reminder_type',
        'scheduled_start',
        'sent_at',
    ];

    protected $casts = [
        'scheduled_start' => 'datetime',
        'sent_at' => 'datetime',
    ];

    public function inquiry(): BelongsTo
    {
        return $this->belongsTo(Inquiry::class);
    }

    public function recipient(): BelongsTo
    {
        return $this->belongsTo(User::class, 'recipient_id');
    }
}
