<?php

namespace App\Events;

use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class QueueItemRemoved implements ShouldBroadcastNow
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public function __construct(
        public string $documentId,
    ) {}

    public function broadcastOn(): array
    {
        return [
            new PrivateChannel('accountant.queue'),
            new PrivateChannel('admin.queue'),
        ];
    }

    public function broadcastAs(): string
    {
        return 'queue:item_removed';
    }

    public function broadcastWith(): array
    {
        return ['documentId' => $this->documentId];
    }
}
