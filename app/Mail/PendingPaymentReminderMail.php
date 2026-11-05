<?php

namespace App\Mail;

use App\Models\Order;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Carbon;

class PendingPaymentReminderMail extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(
        public Order $order,
        public Carbon $paymentDeadline
    ) {
    }

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: 'Payment reminder for order ' . $this->order->order_number
        );
    }

    public function content(): Content
    {
        return new Content(
            view: 'emails.pending-payment-reminder',
            with: [
                'customerName' => $this->order->customer_name,
                'orderNumber' => $this->order->order_number,
                'orderTotal' => (float) $this->order->total,
                'paymentMethod' => ucfirst(str_replace('_', ' ', (string) $this->order->payment_method)),
                'paymentDeadline' => $this->paymentDeadline,
                'paymentUrl' => route('purchases.show', $this->order),
            ]
        );
    }

    public function attachments(): array
    {
        return [];
    }
}
