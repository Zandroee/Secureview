<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class ServiceRecord extends Model
{
    protected $fillable = [
        'inquiry_id',
        'technician_id',
        'service_outcome',
        'work_summary',
        'recommendations',
        'service_charge',
        'payment_status',
        'payment_method',
        'paid_at',
    ];

    protected $casts = [
        'service_charge' => 'float',
        'paid_at' => 'datetime',
    ];

    public function inquiry(): BelongsTo
    {
        return $this->belongsTo(Inquiry::class);
    }

    public function technician(): BelongsTo
    {
        return $this->belongsTo(User::class, 'technician_id');
    }

    public function items(): HasMany
    {
        return $this->hasMany(ServiceRecordItem::class);
    }
}
