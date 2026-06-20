<?php

namespace App\Jobs;

use App\Events\DocumentStageUpdated;
use App\Events\QueueItemAdded;
use App\Models\Account;
use App\Models\ChartOfAccountSubtype;
use App\Models\Document;
use App\Services\AI\TransactionClassifier;
use App\Services\Merchant\MerchantResolverService;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;

class ClassifyWithAI implements ShouldQueue
{
    use InteractsWithQueue, Queueable, SerializesModels;

    public int $timeout = 60;
    public int $tries = 3;
    public bool $deleteWhenMissingModels = true;

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
        $classification = $classifier->classify(
            $inputData,
            $company,
            $this->document->note,
            $this->document->document_type,
            $company->accountant_notes,
        );

        // STEP D — Cross-check rules (upload area mismatch, low confidence)
        if (!$this->document->is_no_receipt) {
            $aiType = $classification['lines'][0]['type'] ?? null;
            if ($aiType && $this->document->document_type && $this->document->document_type !== $aiType) {
                $this->document->flag           = 'RED';
                $this->document->anomaly_reason = ['Upload area mismatch'];
            }
        } else {
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

        // Prefer document_date already on the model; fall back to what Claude extracted
        // from the receipt (OCR path sets document_date later, so we read it here first).
        // Final fallback is today so lines are never left dateless.
        $docDate = $this->document->document_date?->format('Y-m-d')
            ?? ($classification['document']['date'] ?? null)
            ?? now()->format('Y-m-d');

        foreach ($classification['lines'] ?? [] as $line) {
            $accountId = Account::where('company_id', $company->id)
                ->where('code', $line['account_code'] ?? null)
                ->value('id');

            $subtypeId = null;
            if (!empty($line['category'])) {
                $subtypeId = ChartOfAccountSubtype::where('name', trim($line['category']))->value('id');
            }

            $this->document->transactionLines()->create([
                'account_id'   => $accountId,
                'account_code' => $line['account_code'] ?? null,
                'type'         => $line['type'],
                'subtype_id'   => $subtypeId,
                'amount'       => $line['amount'],
                'description'  => $line['description'] ?? null,
                'date'         => $line['date'] ?? $docDate,
            ]);
        }

        // Compute net cash flow: exclude liability (EWT Payable) and tax_credit (EWT Withheld) lines
        $freshLines       = $this->document->transactionLines()->with('account')->get();
        $primaryTotal     = (float) $freshLines
            ->filter(fn($l) => !in_array($l->account?->type ?? '', ['liability', 'tax_credit']))
            ->sum('amount');
        $withholdingTotal = (float) $freshLines
            ->filter(fn($l) => in_array($l->account?->type ?? '', ['liability', 'tax_credit']))
            ->sum('amount');
        $this->document->amount = $primaryTotal - $withholdingTotal;

        // Apply vat_amount from Claude for both OCR and manual paths
        if (!empty($classification['document'])) {
            $this->document->vat_amount = $classification['document']['vat_amount'] ?? $this->document->vat_amount;
        }

        // Apply remaining cleaned fields from Claude (OCR path only)
        if (!$this->document->is_no_receipt && !empty($classification['document'])) {
            $doc = $classification['document'];
            $this->document->merchant_name = $doc['merchant'] ?? $this->document->merchant_name;
            $this->document->document_date = $doc['date']     ?? $this->document->document_date;

            if (!empty($doc['payment_method'])) {
                $this->document->payment_method = $doc['payment_method'];
            }

            if (empty($this->document->ref_number) && !empty($doc['or_number'])) {
                $this->document->ref_number = $doc['or_number'];
            }

            $merchant = (new MerchantResolverService())->resolve(
                $this->document->company_id,
                $this->document->merchant_name,
                $doc['merchant_tin'] ?? null,
            );
            if ($merchant) {
                $this->document->merchant_id = $merchant->id;
            }
        }

        $this->document->save();

        // STEP F — Dispatch DetectAnomalies
        DetectAnomalies::dispatch($this->document);
    }

    public function failed(\Throwable $e): void
    {
        \Illuminate\Support\Facades\Log::error('ClassifyWithAI failed', [
            'document_id' => $this->document->id,
            'error'       => $e->getMessage(),
        ]);

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
