<?php

namespace App\Jobs;

use App\Events\DocumentStageUpdated;
use App\Events\QueueItemAdded;
use App\Exceptions\OcrFailedException;
use App\Models\Document;
use App\Models\OcrResult;
use App\Services\OCR\OCRService;
use App\Services\Ref\RefSequenceService;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;

class ProcessDocumentOCR implements ShouldQueue
{
    use InteractsWithQueue, Queueable, SerializesModels;

    public int $timeout = 120;
    public int $tries = 1;

    public function __construct(public Document $document)
    {
        $this->onQueue('ocr-pipeline');
    }

    public function handle(): void
    {
        // STEP A — Broadcast "preprocessing" stage
        rescue(fn () => event(new DocumentStageUpdated(
            companyId:  $this->document->company_id,
            documentId: $this->document->id,
            stage:      'preprocessing',
            status:     'processing',
            label:      'Preparing image...',
        )));

        // STEP B — Call OCR service
        $ocrService = new OCRService();
        try {
            $result = $ocrService->extractFromDocument($this->document);
        } catch (OcrFailedException) {
            $this->handleFailure($this->document);
            return;
        }

        // STEP C — Log and save OCR result
        Log::channel('daily')->info('OCR extracted data', [
            'document_id' => $this->document->id,
            'company_id'  => $this->document->company_id,
            'filename'    => $this->document->original_filename,
            'result'      => $result,
        ]);

        OcrResult::create([
            'document_id'    => $this->document->id,
            'extracted_data' => $result,
            'confidence'     => $result['confidence'] ?? 0,
            'engine'         => 'paddle',
        ]);

        // STEP D — Update internal_status
        $this->document->update(['internal_status' => 'OCR_COMPLETE']);

        // STEP E — Broadcast "ocr" stage
        rescue(fn () => event(new DocumentStageUpdated(
            companyId:  $this->document->company_id,
            documentId: $this->document->id,
            stage:      'ocr',
            status:     'processing',
            label:      'Reading receipt...',
        )));

        // STEP F — Dispatch ClassifyWithAI
        ClassifyWithAI::dispatch($this->document, $result);
    }

    private function handleFailure(Document $document): void
    {
        $refService = new RefSequenceService();
        $refNumber  = $refService->nextRef($document->company, 'OCR');

        $document->update([
            'internal_status' => 'OCR_FAILED',
            'flag'            => 'YELLOW',
            'is_ocr_failed'   => true,
            'ref_number'      => $refNumber,
            'status'          => 'parked',
        ]);

        rescue(fn () => event(new DocumentStageUpdated(
            companyId:  $document->company_id,
            documentId: $document->id,
            stage:      'ocr_failed',
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
