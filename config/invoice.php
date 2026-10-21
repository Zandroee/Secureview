<?php

return [
    // Until configured, the printable document is clearly marked as an internal preview.
    'business_name' => env('INVOICE_BUSINESS_NAME', 'SecureView'),
    'registered_name' => env('INVOICE_REGISTERED_NAME'),
    'address' => env('INVOICE_BUSINESS_ADDRESS'),
    'email' => env('INVOICE_BUSINESS_EMAIL'),
    'phone' => env('INVOICE_BUSINESS_PHONE'),
    'tin' => env('INVOICE_BUSINESS_TIN'),
    'vat_status' => env('INVOICE_VAT_STATUS', 'not_configured'),
    'branch_code' => env('INVOICE_BRANCH_CODE'),
    'bir_permit_number' => env('INVOICE_BIR_PERMIT_NUMBER'),
    'bir_atp_number' => env('INVOICE_BIR_ATP_NUMBER'),
    'serial_number_range' => env('INVOICE_SERIAL_NUMBER_RANGE'),
    'pti_einvoice_number' => env('INVOICE_PTI_EINVOICE_NUMBER'),
    'eis_certification_reference' => env('INVOICE_EIS_CERTIFICATION_REFERENCE'),
];
