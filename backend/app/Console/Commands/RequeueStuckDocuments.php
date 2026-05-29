<?php

namespace App\Console\Commands;

use App\Jobs\ClassifyWithAI;
use App\Models\Document;
use Illuminate\Console\Command;

class RequeueStuckDocuments extends Command
{
    protected $signature   = 'documents:requeue-stuck';
    protected $description = 'Re-dispatch ClassifyWithAI for documents stuck in processing with OCR_COMPLETE status';

    public function handle(): int
    {
        $stuck = Document::where('status', 'processing')
            ->where('internal_status', 'OCR_COMPLETE')
            ->get();

        if ($stuck->isEmpty()) {
            $this->info('No stuck documents found.');
            return self::SUCCESS;
        }

        $this->info("Found {$stuck->count()} stuck document(s) — re-queuing...");

        foreach ($stuck as $doc) {
            ClassifyWithAI::dispatch($doc, null);
            $this->line("  Queued: {$doc->ref_number} ({$doc->id})");
        }

        $this->info('Done. Monitor with: php artisan queue:monitor ai-pipeline');

        return self::SUCCESS;
    }
}
