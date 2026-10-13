<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class CatalogOption extends Model
{
    protected $fillable = ['field', 'value', 'is_active'];

    protected $casts = ['is_active' => 'boolean'];
}
