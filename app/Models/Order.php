<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;

class Order extends Model
{
    protected $fillable = [
        'user_id',
        'order_number',
        'subtotal',
        'shipping_fee',
        'installation_fee',
        'service_priority_fee',
        'total',
        'payment_method',
        'paymongo_checkout_session_id',
        'paymongo_payment_id',
        'paid_at',
        'stock_deducted_at',
        'payment_status',
        'order_status',
        'cancellation_reason',
        'customer_name',
        'customer_phone',
        'customer_email',
        'delivery_address',
        'delivery_address_details',
        'delivery_city',
        'delivery_latitude',
        'delivery_longitude',
        'notes',
    ];

    protected $casts = [
        'subtotal' => 'float',
        'shipping_fee' => 'float',
        'installation_fee' => 'float',
        'service_priority_fee' => 'float',
        'total' => 'float',
        'paid_at' => 'datetime',
        'stock_deducted_at' => 'datetime',
        'delivery_latitude' => 'float',
        'delivery_longitude' => 'float',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function items(): HasMany
    {
        return $this->hasMany(OrderItem::class);
    }

    public function events(): HasMany
    {
        return $this->hasMany(OrderEvent::class)->oldest();
    }

    public function invoiceRecord(): HasOne
    {
        return $this->hasOne(InvoiceRecord::class);
    }
}
