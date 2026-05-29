<?php

namespace App\Events;

use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class DocumentStatusChanged implements ShouldBroadcastNow
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public function __construct(
        public string $companyId,
        public string $documentId,
        public string $status,
        public ?string $flag,
        public array $anomalyReasons = [],
    ) {}

    public function broadcastOn(): array
    {
        return [new PrivateChannel("client.{$this->companyId}")];
    }

    public function broadcastAs(): string
    {
        return 'document:status_changed';
    }

    public function broadcastWith(): array
    {
        return [
            'documentId'     => $this->documentId,
            'status'         => $this->status,
            'flag'           => $this->flag,
            'anomalyReasons' => $this->anomalyReasons,
        ];
    }
}
