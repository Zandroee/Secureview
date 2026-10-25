<?php

namespace App\Services;

use App\Models\InvoiceSetting;
use App\Models\Order;

class InvoiceDocumentService
{
    /**
     * Build the immutable data snapshot used by both invoice previews and
     * saved internal invoice records. This deliberately does not calculate
     * taxes or allocate the business's BIR-authorized serial-number series.
     */
    public function buildSnapshot(Order $order): array
    {
        $order->loadMissing(['items', 'user']);

        $business = $this->businessSettings();
        $isPaid = $order->payment_status === 'paid';
        $isCancelled = $order->order_status === 'cancelled';
        $total = (float) $order->total;

        return [
            'order_id' => $order->id,
            'reference_number' => $order->order_number,
            'document_date' => $order->created_at?->format('F j, Y'),
            'payment_date' => $order->paid_at?->format('F j, Y h:i A'),
            'generated_at' => now()->format('F j, Y h:i A'),
            'payment_method' => $this->paymentMethodLabel($order->payment_method),
            'payment_status' => $order->payment_status,
            'order_status' => $order->order_status,
            'is_paid' => $isPaid,
            'is_cancelled' => $isCancelled,
            'customer' => [
                'name' => $order->customer_name,
                'email' => $order->customer_email,
                'phone' => $order->customer_phone,
                'address' => $order->delivery_address,
            ],
            'items' => $order->items->map(fn ($item) => [
                'id' => $item->id,
                'name' => $item->name,
                'warranty_period' => $item->warranty_period,
                'quantity' => (int) $item->quantity,
                'unit_price' => (float) $item->price,
                'amount' => (float) $item->subtotal,
            ])->values()->all(),
            'subtotal' => (float) $order->subtotal,
            'installation_fee' => (float) $order->installation_fee,
            'shipping_fee' => (float) $order->shipping_fee,
            'total' => $total,
            'amount_paid' => $isPaid ? $total : 0.0,
            'balance_due' => (!$isPaid && !$isCancelled) ? max(0, $total) : 0.0,
            'business' => [
                'name' => $business['business_name'] ?? null,
                'registered_name' => $business['registered_name'] ?? null,
                'address' => $business['address'] ?? null,
                'email' => $business['email'] ?? null,
                'phone' => $business['phone'] ?? null,
                'tin' => $business['tin'] ?? null,
                'vat_status' => $business['vat_status'] ?? null,
                'branch_code' => $business['branch_code'] ?? null,
                'bir_permit_number' => $business['bir_permit_number'] ?? null,
                'bir_atp_number' => $business['bir_atp_number'] ?? null,
                'serial_number_range' => $business['serial_number_range'] ?? null,
            ],
        ];
    }

    public function profileReady(?InvoiceSetting $settings = null): bool
    {
        $settings ??= InvoiceSetting::query()->find(1);

        return $settings !== null
            && filled($settings->business_name)
            && filled($settings->registered_name)
            && filled($settings->address)
            && filled($settings->tin)
            && in_array($settings->vat_status, ['vat', 'non_vat'], true)
            && filled($settings->branch_code);
    }

    private function businessSettings(): array
    {
        $settings = InvoiceSetting::query()->find(1);

        if (!$settings) {
            return [
                'business_name' => config('invoice.business_name', 'SecureView'),
                'registered_name' => config('invoice.registered_name'),
                'address' => config('invoice.address'),
                'email' => config('invoice.email'),
                'phone' => config('invoice.phone'),
                'tin' => config('invoice.tin'),
                'vat_status' => config('invoice.vat_status', 'not_configured'),
                'branch_code' => config('invoice.branch_code'),
                'bir_permit_number' => config('invoice.bir_permit_number'),
                'bir_atp_number' => config('invoice.bir_atp_number'),
                'serial_number_range' => config('invoice.serial_number_range'),
            ];
        }

        return $settings->only([
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
        ]);
    }

    private function paymentMethodLabel(?string $method): string
    {
        return match ($method) {
            'gcash' => 'GCash',
            'card' => 'Card',
            'maya' => 'Maya',
            'cash' => 'Cash',
            default => 'Not specified',
        };
    }
}
