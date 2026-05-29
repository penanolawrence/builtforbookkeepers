<?php

namespace App\Events;

use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class DocumentStageUpdated implements ShouldBroadcastNow
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public function __construct(
        public string $companyId,
        public string $documentId,
        public string $stage,
        public string $status,
        public string $label,
        public ?string $flag = null,
    ) {}

    public function broadcastOn(): array
    {
        return [new PrivateChannel("client.{$this->companyId}")];
    }

    public function broadcastAs(): string
    {
        return 'document:stage_update';
    }

    public function broadcastWith(): array
    {
        $payload = [
            'documentId' => $this->documentId,
            'stage'      => $this->stage,
            'status'     => $this->status,
            'label'      => $this->label,
        ];
        if ($this->flag !== null) {
            $payload['flag'] = $this->flag;
        }
        return $payload;
    }
}
