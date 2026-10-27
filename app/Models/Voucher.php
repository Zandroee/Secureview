<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Voucher extends Model
{
    protected $fillable = [
        'code', 'name', 'description', 'discount_type', 'discount_value',
        'minimum_subtotal', 'maximum_discount', 'starts_at', 'expires_at',
        'usage_limit', 'per_user_limit', 'is_active',
    ];

    protected $casts = [
        'discount_value' => 'float',
        'minimum_subtotal' => 'float',
        'maximum_discount' => 'float',
        'usage_limit' => 'integer',
        'per_user_limit' => 'integer',
        'is_active' => 'boolean',
    ];

    public function orders(): HasMany
    {
        return $this->hasMany(Order::class);
    }
}
