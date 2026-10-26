<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\MorphTo;
use Illuminate\Database\Eloquent\Relations\HasOne;

class Inquiry extends Model
{
    protected $fillable = [
        'user_id',
        'technician_id',
        'inquiry_number',
        'inquirable_type',
        'inquirable_id',
        'item_name',
        'customer_name',
        'customer_phone',
        'customer_email',
        'street_address',
        'address_details',
        'city',
        'service_latitude',
        'service_longitude',
        'google_place_id',
        'service_type',
        'urgency',
        'urgency_fee',
        'preferred_date',
        'preferred_time',
        'notes',
        'status',
    ];

    protected $casts = [
        'preferred_date' => 'date',
        'urgency_fee' => 'float',
        'reschedule_requested_date' => 'date',
        'reschedule_requested_at' => 'datetime',
        'service_latitude' => 'float',
        'service_longitude' => 'float',
    ];

    /**
     * Promote overdue open services to urgent. Emergency urgency is never downgraded,
     * and completed/cancelled services are excluded.
     */
    public static function escalateOverdueUrgency(): int
    {
        $ids = static::query()
            ->whereDate('preferred_date', '<', today())
            ->whereNotIn('status', ['completed', 'cancelled'])
            ->where('urgency', 'normal')
            ->pluck('id');

        if ($ids->isEmpty()) {
            return 0;
        }

        $updated = static::query()
            ->whereIn('id', $ids)
            ->where('urgency', 'normal')
            ->update(['urgency' => 'urgent']);

        if ($updated > 0) {
            app(\App\Services\JobNotificationService::class)
                ->notifyUrgencyEscalations(static::query()->whereIn('id', $ids)->where('urgency', 'urgent')->get());
        }

        return $updated;
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function technician(): BelongsTo
    {
        return $this->belongsTo(User::class, 'technician_id');
    }

    public function technicians(): BelongsToMany
    {
        return $this->belongsToMany(User::class, 'inquiry_technician', 'inquiry_id', 'technician_id')
            ->withPivot('assigned_by')
            ->withTimestamps()
            ->orderBy('users.name');
    }

    public function serviceRecord(): HasOne
    {
        return $this->hasOne(ServiceRecord::class);
    }

    public function pendingCheckout(): HasOne
    {
        return $this->hasOne(PendingInquiryCheckout::class, 'inquiry_id');
    }

    public function inquirable(): MorphTo
    {
        return $this->morphTo();
    }
}
