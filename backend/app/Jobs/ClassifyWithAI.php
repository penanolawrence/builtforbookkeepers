<?php

namespace App\Jobs;

use App\Events\DocumentStageUpdated;
use App\Events\QueueItemAdded;
use App\Models\Account;
use App\Models\Document;
use App\Services\AI\TransactionClassifier;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;

class ClassifyWithAI implements ShouldQueue
{
    use InteractsWithQueue, Queueable, SerializesModels;

    public int $timeout = 60;
    public int $tries = 3;

    public function __construct(
        public Document $document,
        public ?array $ocrResult = null,
    ) {
        $this->onQueue('ai-pipeline');
    }

    public function handle(): void
    {
        // STEP A — Broadcast "ai" stage
        rescue(fn () => event(new DocumentStageUpdated(
            companyId:  $this->document->company_id,
            documentId: $this->document->id,
            stage:      'ai',
            status:     'processing',
            label:      'Categorizing...',
        )));

        // STEP B — Determine input data
        $company = $this->document->company;

        if ($this->document->is_no_receipt) {
            // Manual path: lines were pre-created by DocumentController::manualEntry()
            $lines = $this->document->transactionLines()->get();
            $inputData = [
                'declared_type' => $this->document->document_type,
                'date'          => $this->document->document_date?->format('Y-m-d'),
                'paymentMethod' => $this->document->payment_method,
                'lines'         => $lines->map(fn($l) => [
                    'description' => $l->description,
                    'amount'      => (float) $l->amount,
                ])->toArray(),
            ];
        } else {
            $inputData = $this->ocrResult;
        }

        // STEP C — Classify
        $classifier     = new TransactionClassifier();
        $classification = $classifier->classify($inputData, $company);

        // STEP D — Cross-check rules (upload area mismatch, low confidence)
        if (!$this->document->is_no_receipt) {
            $aiType = $classification['lines'][0]['type'] ?? null;
            if ($aiType && $this->document->document_type && $this->document->document_type !== $aiType) {
                $this->document->flag          = 'RED';
                $this->document->anomaly_reason = ['Upload area mismatch'];
            }
        } else {
            // Manual entries are always YELLOW (no receipt)
            $this->document->flag = 'YELLOW';
        }

        if (
            isset($classification['confidence']) &&
            $classification['confidence'] < 0.6 &&
            $this->document->flag !== 'RED'
        ) {
            $this->document->flag = 'YELLOW';
        }

        // STEP E — Write TransactionLine records (delete+recreate = safe re-run)
        $this->document->transactionLines()->delete();

        foreach ($classification['lines'] ?? [] as $line) {
            $accountId = Account::where('company_id', $company->id)
                ->where('code', $line['accountCode'])
                ->value('id');

            $this->document->transactionLines()->create([
                'account_id'   => $accountId,
                'account_code' => $line['accountCode'] ?? null,
                'type'         => $line['type'],
                'category'     => $line['category'] ?? null,
                'amount'       => $line['amount'],
                'description'  => $line['description'] ?? null,
            ]);
        }

        // Set document category to first line's category as a summary label
        $this->document->category = $classification['lines'][0]['category'] ?? $this->document->category;

        // Apply cleaned OCR fields (OCR path only)
        if (!$this->document->is_no_receipt && !empty($classification['cleanedFields'])) {
            $cleaned = $classification['cleanedFields'];
            $this->document->merchant_name = $cleaned['merchant']   ?? $this->document->merchant_name;
            $this->document->document_date = $cleaned['date']       ?? $this->document->document_date;
            $this->document->vat_amount    = $cleaned['vat_amount'] ?? $this->document->vat_amount;

            if (empty($this->document->ref_number) && !empty($cleaned['or_number'])) {
                $this->document->ref_number = $cleaned['or_number'];
            }

            // Update document amount from AI totalAmount (OCR path)
            if (isset($classification['totalAmount'])) {
                $this->document->amount = $classification['totalAmount'];
            }
        }

        $this->document->save();

        // STEP F — Dispatch DetectAnomalies
        DetectAnomalies::dispatch($this->document);
    }

    public function failed(\Throwable $_e): void
    {
        $this->document->update([
            'flag'           => 'YELLOW',
            'anomaly_reason' => ['AI classification failed — needs manual review'],
            'status'         => 'parked',
        ]);

        $company = $this->document->company()->with('accountant')->first();
        $payload = [
            'documentId' => $this->document->id,
            'clientId'   => $company->id,
            'clientName' => $company->name,
            'flag'       => 'YELLOW',
            'amount'     => $this->document->amount,
            'merchant'   => $this->document->merchant_name,
        ];

        if ($company->accountant_id) {
            rescue(fn () => event(new QueueItemAdded("accountant.{$company->accountant_id}", $payload)));
        }

        rescue(fn () => event(new QueueItemAdded('admin.1', $payload)));
    }
}
