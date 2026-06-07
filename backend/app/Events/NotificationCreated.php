<?php

namespace App\Events;

use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class NotificationCreated implements ShouldBroadcastNow
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public function __construct(
        public string $channel,
        public string $id,
        public string $type,
        public string $message,
        public array $data = [],
        public string $createdAt = '',
    ) {}

    public function broadcastOn(): array
    {
        return [new PrivateChannel($this->channel)];
    }

    public function broadcastAs(): string
    {
        return 'notification:new';
    }

    public function broadcastWith(): array
    {
        return [
            'id'        => $this->id,
            'type'      => $this->type,
            'message'   => $this->message,
            'data'      => $this->data,
            'readAt'    => null,
            'createdAt' => $this->createdAt,
        ];
    }
}
