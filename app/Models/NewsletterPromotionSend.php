<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class NewsletterPromotionSend extends Model
{
    protected $fillable = [
        'promotion_type',
        'promotion_id',
        'promotion_version',
        'user_id',
        'sent_at',
        'last_error',
    ];

    protected $casts = [
        'sent_at' => 'datetime',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
