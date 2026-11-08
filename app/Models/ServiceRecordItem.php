<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ServiceRecordItem extends Model
{
    protected $fillable = [
        'service_record_id',
        'product_id',
        'product_name',
        'action',
        'quantity',
        'unit_price',
        'is_warranty_covered',
        'notes',
    ];

    protected $casts = [
        'quantity' => 'integer',
        'unit_price' => 'float',
        'is_warranty_covered' => 'boolean',
    ];

    public function serviceRecord(): BelongsTo
    {
        return $this->belongsTo(ServiceRecord::class);
    }

    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class);
    }
}
