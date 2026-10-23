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
        'work_summary',
        'customer_notes',
        'labor_charge',
        'additional_charge',
        'total_income',
        'completed_at',
    ];

    protected $casts = [
        'labor_charge' => 'float',
        'additional_charge' => 'float',
        'total_income' => 'float',
        'completed_at' => 'datetime',
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
