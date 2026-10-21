<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class InvoiceSetting extends Model
{
    protected $fillable = [
        'business_name',
        'registered_name',
        'address',
        'email',
        'phone',
        'tin',
        'vat_status',
        'branch_code',
        'bir_permit_number',
        'bir_atp_number',
        'serial_number_range',
        'invoice_number_prefix',
        'first_invoice_number',
        'last_invoice_number',
        'next_invoice_number',
        'invoice_number_padding',
        'pti_einvoice_number',
        'eis_certification_reference',
        'updated_by',
    ];

    protected $casts = [
        'first_invoice_number' => 'integer',
        'last_invoice_number' => 'integer',
        'next_invoice_number' => 'integer',
        'invoice_number_padding' => 'integer',
    ];

    public function updatedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'updated_by');
    }
}
