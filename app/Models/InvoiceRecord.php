<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class InvoiceRecord extends Model
{
    protected $fillable = [
        'order_id',
        'record_number',
        'snapshot',
        'issued_at',
        'issued_by',
    ];

    protected $casts = [
        'snapshot' => 'array',
        'issued_at' => 'datetime',
    ];

    public function order(): BelongsTo
    {
        return $this->belongsTo(Order::class);
    }

    public function issuedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'issued_by');
    }
}
