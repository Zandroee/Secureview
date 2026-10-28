<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\MorphMany;

class Product extends Model
{
    protected $fillable = [
        'name',
        'brand',
        'category',
        'warranty',
        'price',
        'sale_price',
        'sale_starts_at',
        'sale_ends_at',
        'installation_fee',
        'stock_quantity',
        'badge',
        'image',
        'images',
        'specifications',
        'rating',
        'is_featured',
    ];

    protected $casts = [
        'specifications' => 'array',
        'images' => 'array',
        'rating' => 'float',
        'installation_fee' => 'float',
        'sale_price' => 'float',
        'stock_quantity' => 'integer',
        'is_featured' => 'boolean',
    ];

    public function isOnSale(): bool
    {
        if ($this->sale_price === null || (float) $this->sale_price <= 0 || (float) $this->sale_price >= (float) $this->price) {
            return false;
        }

        $now = now(config('app.timezone', 'UTC'));
        $startsAt = $this->sale_starts_at ? \Illuminate\Support\Carbon::parse($this->sale_starts_at, config('app.timezone', 'UTC')) : null;
        $endsAt = $this->sale_ends_at ? \Illuminate\Support\Carbon::parse($this->sale_ends_at, config('app.timezone', 'UTC')) : null;

        return (!$startsAt || $now->greaterThanOrEqualTo($startsAt))
            && (!$endsAt || $now->lessThanOrEqualTo($endsAt));
    }

    public function effectivePrice(): float
    {
        return $this->isOnSale() ? round((float) $this->sale_price, 2) : round((float) $this->price, 2);
    }

    public function saleDiscountPercent(): int
    {
        return $this->isOnSale()
            ? (int) round((1 - ((float) $this->sale_price / (float) $this->price)) * 100)
            : 0;
    }

    public function packageItems(): HasMany
    {
        return $this->hasMany(PackageItem::class);
    }

    public function reviews(): MorphMany
    {
        return $this->morphMany(Review::class, 'reviewable');
    }

    public function orderItems(): MorphMany
    {
        return $this->morphMany(OrderItem::class, 'purchasable');
    }

    public function cartItems(): MorphMany
    {
        return $this->morphMany(CartItem::class, 'purchasable');
    }
}
