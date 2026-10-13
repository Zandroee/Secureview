<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\MorphMany;

class Package extends Model
{
    protected $fillable = [
        'name',
        'category',
        'warranty',
        'price',
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
        'is_featured' => 'boolean',
    ];

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

    public function inquiryReferences(): MorphMany
    {
        return $this->morphMany(Inquiry::class, 'inquirable');
    }
}