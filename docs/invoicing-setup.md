# SecureView order invoice preview

The invoice page provides a print-friendly order document that can be saved as a PDF through the browser's print dialog. It uses the existing order items, fees, payment method, and recorded payment status; it does not calculate taxes or alter payment state.

## Optional business profile

Set these values in the runtime environment used by the Laravel app:

- `INVOICE_BUSINESS_NAME`
- `INVOICE_REGISTERED_NAME`
- `INVOICE_BUSINESS_ADDRESS`
- `INVOICE_BUSINESS_EMAIL`
- `INVOICE_BUSINESS_PHONE`
- `INVOICE_BUSINESS_TIN`
- `INVOICE_VAT_STATUS` (use `vat`, `non_vat`, or leave as `not_configured`)
- `INVOICE_BRANCH_CODE`
- `INVOICE_BIR_PERMIT_NUMBER`
- `INVOICE_BIR_ATP_NUMBER`
- `INVOICE_SERIAL_NUMBER_RANGE`

These settings populate the seller profile only. They do not make the generated document a BIR-registered or BIR-compliant tax invoice on their own. Confirm the correct details, serial number allocation, any required authorization, tax treatment, and electronic-invoicing requirements with the business's accountant and BIR before relying on it for tax purposes.

For local Laravel configuration changes, clear cached configuration with `php artisan config:clear`.
