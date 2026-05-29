<?php

namespace App\Console\Commands;

use App\Models\Document;
use Illuminate\Console\Command;

class ExpireReturnedDocuments extends Command
{
    protected $signature   = 'documents:expire-returned';
    protected $description = 'Auto-reject RETURNED documents that have not been re-uploaded within 30 days.';

    public function handle(): void
    {
        $expired = Document::where('status', 'returned')
            ->where('expires_at', '<', now())
            ->get();

        foreach ($expired as $doc) {
            $doc->update([
                'status'           => 'rejected',
                'rejection_reason' => 'No response from client — expired.',
                'rejected_at'      => now(),
            ]);
        }

        $this->info("Expired {$expired->count()} RETURNED documents → REJECTED.");
    }
}
