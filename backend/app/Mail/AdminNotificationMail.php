<?php

namespace App\Mail;

use Illuminate\Mail\Mailable;
use Illuminate\Queue\SerializesModels;

class AdminNotificationMail extends Mailable
{
    use SerializesModels;

    public function __construct(
        public string $body,
        public array $data = [],
    ) {}

    public function build(): static
    {
        return $this->subject('Built for Bookkeepers — Admin Alert')
                    ->view('emails.admin-notification')
                    ->text('emails.admin-notification-plain');
    }
}
