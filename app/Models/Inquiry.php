<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\MorphTo;

class Inquiry extends Model
{
    protected $fillable = [
        'user_id',
        'inquiry_number',
        'inquirable_type',
        'inquirable_id',
        'item_name',
        'customer_name',
        'customer_phone',
        'customer_email',
        'street_address',
        'city',
        'service_type',
        'preferred_date',
        'notes',
        'status',
    ];

    protected $casts = [
        'preferred_date' => 'date',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function inquirable(): MorphTo
    {
        return $this->morphTo();
    }
}
