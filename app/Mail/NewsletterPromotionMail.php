<?php

namespace App\Mail;

use App\Models\User;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\URL;

class NewsletterPromotionMail extends Mailable
{
    use Queueable, SerializesModels;

    public string $unsubscribeUrl;

    public function __construct(
        public array $promotion,
        public User $recipient,
    ) {
        $this->unsubscribeUrl = URL::signedRoute(
            'newsletter.unsubscribe',
            ['user' => $recipient->getKey()]
        );
    }

    public function build(): static
    {
        return $this
            ->subject($this->promotion['subject'])
            ->view('emails.newsletter-promotion')
            ->with([
                'promotion' => $this->promotion,
                'customerName' => $this->recipient->name,
                'unsubscribeUrl' => $this->unsubscribeUrl,
            ]);
    }
}
