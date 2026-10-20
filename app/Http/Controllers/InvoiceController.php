<?php

namespace App\Http\Controllers;

use App\Models\Order;
use App\Models\InvoiceSetting;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class InvoiceController extends Controller
{
    public function customer(Request $request, Order $order): Response
    {
        abort_unless((int) $order->user_id === (int) $request->user()->id, 404);

        return $this->renderInvoice($order, false);
    }

    public function admin(Request $request, Order $order): Response
    {
        abort_unless($request->user()?->isAdmin(), 403);

        return $this->renderInvoice($order, true);
    }

    private function renderInvoice(Order $order, bool $isAdmin): Response
    {
        $order->loadMissing(['items', 'user']);
        $business = $this->businessSettings();

        $isPaid = $order->payment_status === 'paid';
        $isCancelled = $order->order_status === 'cancelled';
        $amountPaid = $isPaid ? (float) $order->total : 0.0;
        $total = (float) $order->total;
        $balanceDue = (!$isPaid && !$isCancelled) ? $total : 0.0;

        return Inertia::render('invoice', [
            'invoice' => [
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
                    'quantity' => (int) $item->quantity,
                    'unit_price' => (float) $item->price,
                    'amount' => (float) $item->subtotal,
                ])->values(),
                'subtotal' => (float) $order->subtotal,
                'installation_fee' => (float) $order->installation_fee,
                'shipping_fee' => (float) $order->shipping_fee,
                'total' => $total,
                'amount_paid' => $amountPaid,
                'balance_due' => max(0, $balanceDue),
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
                'viewer_role' => $isAdmin ? 'admin' : 'customer',
            ],
        ]);
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
                'pti_einvoice_number' => config('invoice.pti_einvoice_number'),
                'eis_certification_reference' => config('invoice.eis_certification_reference'),
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
            'pti_einvoice_number',
            'eis_certification_reference',
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
