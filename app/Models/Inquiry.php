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
        'allow_technician_self_assignment',
        'max_technicians',
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
        'allow_technician_self_assignment' => 'boolean',
        'max_technicians' => 'integer',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function technician(): BelongsTo
    {
        return $this->belongsTo(User::class, 'technician_id');
    }

    public function assignedTechnicians(): BelongsToMany
    {
        return $this->belongsToMany(User::class, 'inquiry_technician_assignments')
            ->withPivot(['is_lead', 'assigned_by', 'assignment_source', 'assigned_at'])
            ->withTimestamps();
    }

    public function inquirable(): MorphTo
    {
        return $this->morphTo();
    }
}
