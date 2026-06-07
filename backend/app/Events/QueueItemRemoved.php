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
        public ?string $accountantId = null,
    ) {}

    public function broadcastOn(): array
    {
        $channels = [new PrivateChannel('admin.1')];
        if ($this->accountantId) {
            $channels[] = new PrivateChannel("accountant.{$this->accountantId}");
        }
        return $channels;
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
