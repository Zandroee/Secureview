<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\MorphTo;

class Inquiry extends Model
{
    protected $fillable = [
        'user_id',
        'technician_id',
        'allow_additional_technicians',
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
        'urgency',
        'preferred_date',
        'preferred_time',
        'notes',
        'status',
    ];

    protected $casts = [
        'preferred_date' => 'date',
        'allow_additional_technicians' => 'boolean',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function technician(): BelongsTo
    {
        return $this->belongsTo(User::class, 'technician_id');
    }

    public function technicians(): BelongsToMany
    {
        return $this->belongsToMany(User::class, 'inquiry_technician', 'inquiry_id', 'technician_id')
            ->withPivot(['is_lead', 'assigned_by'])
            ->withTimestamps()
            ->orderByPivot('is_lead', 'desc');
    }

    public function inquirable(): MorphTo
    {
        return $this->morphTo();
    }
}
