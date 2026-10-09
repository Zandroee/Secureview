<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\MorphMany;

class Product extends Model
{
    protected $fillable = [
        'name',
        'category',
        'warranty',
        'price',
        'stock_quantity',
        'badge',
        'image',
        'specifications',
        'rating',
        'is_featured',
    ];

    protected $casts = [
        'specifications' => 'array',
        'rating' => 'float',
        'stock_quantity' => 'integer',
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
}