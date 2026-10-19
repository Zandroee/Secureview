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
        'inquiry_number',
        'inquirable_type',
        'inquirable_id',
        'item_name',
        'customer_name',
        'customer_phone',
        'customer_email',
        'street_address',
        'address_details',
        'city',
        'service_latitude',
        'service_longitude',
        'google_place_id',
        'service_type',
        'urgency',
        'preferred_date',
        'preferred_time',
        'notes',
        'status',
    ];

    protected $casts = [
        'preferred_date' => 'date',
        'reschedule_requested_date' => 'date',
        'reschedule_requested_at' => 'datetime',
        'service_latitude' => 'float',
        'service_longitude' => 'float',
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
            ->withPivot('assigned_by')
            ->withTimestamps()
            ->orderBy('users.name');
    }

    public function inquirable(): MorphTo
    {
        return $this->morphTo();
    }
}
