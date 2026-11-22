<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ServiceRecordPayment extends Model
{
    protected $fillable = [
        'service_record_id',
        'amount',
        'payment_method',
        'reference',
        'notes',
        'paid_at',
        'recorded_by_user_id',
        'is_legacy_import',
    ];

    protected $casts = [
        'amount' => 'float',
        'paid_at' => 'datetime',
        'is_legacy_import' => 'boolean',
    ];

    public function serviceRecord(): BelongsTo
    {
        return $this->belongsTo(ServiceRecord::class);
    }

    public function recordedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'recorded_by_user_id');
    }
}
