<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Schema;

class ServiceBookingFeeSetting extends Model
{
    protected $table = 'service_booking_fee_settings';

    protected $fillable = [
        'urgent_fee',
        'emergency_fee',
    ];

    protected $casts = [
        'urgent_fee' => 'decimal:2',
        'emergency_fee' => 'decimal:2',
    ];

    /**
     * Return the saved priority-fee settings, with environment-backed defaults
     * used only when the settings table is not available yet or has no row.
     */
    public static function current(): self
    {
        $defaults = [
            'urgent_fee' => max(0, (float) config('services.secureview.booking_fees.urgent', 500)),
            'emergency_fee' => max(0, (float) config('services.secureview.booking_fees.emergency', 1500)),
        ];

        if (!Schema::hasTable((new static())->getTable())) {
            return new static($defaults);
        }

        return static::query()->firstOrCreate(['id' => 1], $defaults);
    }

    public function fees(): array
    {
        return [
            'normal' => 0.0,
            'urgent' => (float) $this->urgent_fee,
            'emergency' => (float) $this->emergency_fee,
        ];
    }
}
