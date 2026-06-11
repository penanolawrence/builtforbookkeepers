<?php

namespace App\Jobs;

use App\Events\DocumentStageUpdated;
use App\Events\QueueItemAdded;
use App\Models\Document;
use App\Services\Accounting\AnomalyDetector;
use App\Services\Notification\NotificationService;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;

class DetectAnomalies implements ShouldQueue
{
    use InteractsWithQueue, Queueable, SerializesModels;

    public bool $deleteWhenMissingModels = true;

    public function __construct(public Document $document)
    {
        $this->onQueue('ai-pipeline');
    }

    public function handle(): void
    {
        // STEP A — Broadcast "anomaly_check" stage
        rescue(fn () => event(new DocumentStageUpdated(
            companyId:  $this->document->company_id,
            documentId: $this->document->id,
            stage:      'anomaly_check',
            status:     'processing',
            label:      'Checking for issues...',
        )));

        // STEP B — Run anomaly detection
        $detector = new AnomalyDetector();
        $result   = $detector->detect($this->document);

        // STEP C — Save result, merge with existing reasons, park document
        $existingReasons = $this->document->anomaly_reason ?? [];
        $allReasons = array_values(array_unique(array_merge($existingReasons, $result['reasons'])));

        $this->document->update([
            'flag'           => $result['flag'],
            'anomaly_reason' => $allReasons,
            'status'         => 'parked',
        ]);

        // STEP D — Broadcast "parked" stage to client
        rescue(fn () => event(new DocumentStageUpdated(
            companyId:  $this->document->company_id,
            documentId: $this->document->id,
            stage:      'parked',
            status:     'parked',
            label:      'Ready for review',
            flag:       $result['flag'],
        )));

        // STEP E — Broadcast queue:item_added to accountant and admin
        $company = $this->document->company()->with('accountant')->first();
        $payload = [
            'documentId' => $this->document->id,
            'clientId'   => $company->id,
            'clientName' => $company->name,
            'flag'       => $result['flag'],
            'amount'     => $this->document->amount,
            'merchant'   => $this->document->merchant_name,
        ];

        if ($company->accountant_id) {
            rescue(fn () => event(new QueueItemAdded("accountant.{$company->accountant_id}", $payload)));
        }

        rescue(fn () => event(new QueueItemAdded('admin.1', $payload)));

        // STEP F — Notify accountant in-app
        if ($company->accountant_id && $company->accountant) {
            $notificationService = new NotificationService();
            $notificationService->notifyAccountant(
                $company->accountant,
                'new_document',
                "New receipt from {$company->name} needs review"
            );
        }
    }
}
