<?php

namespace App\Jobs;

use App\Events\DocumentStageUpdated;
use App\Events\QueueItemAdded;
use App\Models\Document;
use App\Services\Ref\RefSequenceService;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;

class PrepareDocumentForAI implements ShouldQueue
{
    use InteractsWithQueue, Queueable, SerializesModels;

    public int $timeout = 120;
    public int $tries = 1;

    public function __construct(public Document $document)
    {
        $this->onQueue('document-pipeline');
    }

    public function handle(): void
    {
        rescue(fn () => event(new DocumentStageUpdated(
            companyId:  $this->document->company_id,
            documentId: $this->document->id,
            stage:      'preprocessing',
            status:     'processing',
            label:      'Preparing image...',
        )));

        $imageBytes = Storage::get($this->document->storage_path);
        if (!$imageBytes) {
            $this->handleFailure($this->document);
            return;
        }

        $extension = strtolower(pathinfo($this->document->storage_path, PATHINFO_EXTENSION));
        $mimeMap   = ['jpg' => 'image/jpeg', 'jpeg' => 'image/jpeg', 'png' => 'image/png', 'webp' => 'image/webp', 'gif' => 'image/gif'];
        $mediaType = $mimeMap[$extension] ?? 'image/jpeg';

        $result = [
            'image_base64' => base64_encode($imageBytes),
            'media_type'   => $mediaType,
        ];

        Log::channel('daily')->info('Document prepared for AI', [
            'document_id' => $this->document->id,
            'company_id'  => $this->document->company_id,
            'filename'    => $this->document->original_filename,
            'media_type'  => $mediaType,
        ]);

        $this->document->update(['internal_status' => 'READY']);

        ClassifyWithAI::dispatch($this->document, $result);
    }

    private function handleFailure(Document $document): void
    {
        $refService = new RefSequenceService();
        $refNumber  = $refService->nextRef($document->company, 'ERR');

        $document->update([
            'internal_status' => 'READ_FAILED',
            'flag'            => 'YELLOW',
            'is_ocr_failed'   => true,
            'ref_number'      => $refNumber,
            'status'          => 'parked',
        ]);

        rescue(fn () => event(new DocumentStageUpdated(
            companyId:  $document->company_id,
            documentId: $document->id,
            stage:      'read_failed',
            status:     'parked',
            label:      'Could not read — needs manual entry',
        )));

        $company      = $document->company()->with('accountant')->first();
        $queuePayload = [
            'documentId' => $document->id,
            'clientId'   => $company->id,
            'clientName' => $company->name,
            'flag'       => 'YELLOW',
            'amount'     => $document->amount,
            'merchant'   => $document->merchant_name,
        ];

        if ($company->accountant_id) {
            rescue(fn () => event(new QueueItemAdded("accountant.{$company->accountant_id}", $queuePayload)));
        }

        rescue(fn () => event(new QueueItemAdded('admin.1', $queuePayload)));
    }

    public function failed(\Throwable $_e): void
    {
        $this->handleFailure($this->document);
    }
}
