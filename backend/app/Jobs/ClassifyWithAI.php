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
        if ($this->document->is_no_receipt) {
            $inputData = [
                'date'          => $this->document->document_date?->format('Y-m-d'),
                'amount'        => $this->document->amount,
                'category'      => $this->document->category,
                'paymentMethod' => $this->document->payment_method,
                'note'          => null,
            ];
        } else {
            $inputData = $this->ocrResult;
        }

        // STEP C — Classify
        $company        = $this->document->company;
        $classifier     = new TransactionClassifier();
        $classification = $classifier->classify($inputData, $company);

        // STEP D — Cross-check rules
        if (!$this->document->is_no_receipt) {
            // Rule 1 — Upload area mismatch
            if (
                isset($classification['type']) &&
                $this->document->document_type &&
                $this->document->document_type !== $classification['type']
            ) {
                $this->document->flag          = 'RED';
                $this->document->anomaly_reason = ['Upload area mismatch'];
            }
        } else {
            // Rule 3 — Manual entry always YELLOW
            $this->document->flag = 'YELLOW';
        }

        // Rule 2 — AI unsure
        if (
            isset($classification['confidence']) &&
            $classification['confidence'] < 0.6 &&
            $this->document->flag !== 'RED'
        ) {
            $this->document->flag = 'YELLOW';
        }

        // STEP E — Update document with AI-suggested values
        $this->document->category = $classification['category'] ?? $this->document->category;

        if (!empty($classification['accountCode'])) {
            $this->document->account_id = Account::where('company_id', $company->id)
                ->where('code', $classification['accountCode'])
                ->value('id');
        }

        if (!$this->document->is_no_receipt && !empty($classification['cleanedFields'])) {
            $cleaned = $classification['cleanedFields'];
            $this->document->merchant_name = $cleaned['merchant'] ?? $this->document->merchant_name;
            $this->document->document_date = $cleaned['date']     ?? $this->document->document_date;
            $this->document->amount        = $cleaned['amount']   ?? $this->document->amount;
            $this->document->vat_amount    = $cleaned['vat_amount'] ?? $this->document->vat_amount;

            if (empty($this->document->ref_number) && !empty($cleaned['or_number'])) {
                $this->document->ref_number = $cleaned['or_number'];
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
