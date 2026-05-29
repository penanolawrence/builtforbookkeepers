<?php

namespace App\Http\Controllers;

use App\Events\DocumentStatusChanged;
use App\Events\QueueItemRemoved;
use App\Http\Requests\Queue\ApproveItemRequest;
use App\Http\Requests\Queue\BatchApproveRequest;
use App\Http\Requests\Queue\RejectItemRequest;
use App\Http\Requests\Queue\ReturnItemRequest;
use App\Models\Document;
use App\Services\Accounting\JournalEntryService;
use App\Services\Notification\NotificationService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Throwable;

class QueueController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $user  = auth()->user();
        $query = Document::with(['company.accountant'])
            ->where('status', 'parked')
            ->orderByRaw("CASE flag WHEN 'RED' THEN 1 WHEN 'YELLOW' THEN 2 WHEN 'GREEN' THEN 3 ELSE 4 END");

        if ($user->role === 'accountant') {
            $query->whereHas('company', fn ($q) => $q->where('accountant_id', $user->id));
        }

        if ($request->filled('clientId')) {
            $query->where('company_id', $request->clientId);
        }

        $documents = $query->get();

        return response()->json($documents->map(fn ($d) => [
            'documentId'     => $d->id,
            'clientId'       => $d->company_id,
            'clientName'     => $d->company->name,
            'accountantName' => $d->company->accountant?->name,
            'flag'           => $d->flag,
            'anomalyReasons' => $d->anomaly_reason ?? [],
            'merchantName'   => $d->merchant_name,
            'amount'         => $d->amount,
            'vatAmount'      => $d->vat_amount,
            'date'           => $d->document_date?->toDateString(),
            'category'       => $d->category,
            'paymentMethod'  => $d->payment_method,
            'refNumber'      => $d->ref_number,
            'isNoReceipt'    => $d->is_no_receipt,
            'isOcrFailed'    => $d->is_ocr_failed,
            'declaredType'   => $d->document_type,
        ]));
    }

    public function show(string $id): JsonResponse
    {
        $document = Document::with(['company', 'ocrResult'])->findOrFail($id);

        try {
            $journalPreview = (new JournalEntryService())->previewFromDocument($document);
        } catch (Throwable) {
            $journalPreview = [];
        }

        return response()->json([
            'documentId'     => $document->id,
            'clientId'       => $document->company_id,
            'clientName'     => $document->company->name,
            'flag'           => $document->flag,
            'anomalyReasons' => $document->anomaly_reason ?? [],
            'merchantName'   => $document->merchant_name,
            'amount'         => $document->amount,
            'vatAmount'      => $document->vat_amount,
            'date'           => $document->document_date?->toDateString(),
            'category'       => $document->category,
            'paymentMethod'  => $document->payment_method,
            'refNumber'      => $document->ref_number,
            'isNoReceipt'    => $document->is_no_receipt,
            'isOcrFailed'    => $document->is_ocr_failed,
            'declaredType'   => $document->document_type,
            'isVat'          => $document->company->bir_type === 'vat',
            'journalPreview' => $journalPreview,
        ]);
    }

    public function approve(ApproveItemRequest $request, string $id): JsonResponse
    {
        $document = Document::with('company')->findOrFail($id);
        $user     = auth()->user();

        if ($document->status !== 'parked') {
            return response()->json(['message' => 'Document is not in the queue.'], 422);
        }

        if ($user->role === 'accountant' && $document->company->accountant_id !== $user->id) {
            return response()->json(['message' => 'Forbidden.'], 403);
        }

        // Apply optional field edits
        if ($request->filled('fields')) {
            $fieldMap = [
                'merchantName'  => 'merchant_name',
                'date'          => 'document_date',
                'amount'        => 'amount',
                'vatAmount'     => 'vat_amount',
                'category'      => 'category',
                'paymentMethod' => 'payment_method',
                'accountId'     => 'account_id',
            ];
            $mapped = [];
            foreach ($request->fields as $key => $value) {
                if (isset($fieldMap[$key])) {
                    $mapped[$fieldMap[$key]] = $value;
                }
            }
            if ($mapped) {
                $document->fill($mapped);
                $document->save();
            }
        }

        DB::transaction(function () use ($document, $user) {
            (new JournalEntryService())->postFromDocument($document, $user);

            $document->update([
                'status'      => 'approved',
                'approved_by' => $user->id,
                'approved_at' => now(),
            ]);

            rescue(fn () => event(new QueueItemRemoved($document->id)));

            rescue(fn () => event(new DocumentStatusChanged(
                companyId:      $document->company_id,
                documentId:     $document->id,
                status:         'approved',
                flag:           $document->flag,
                anomalyReasons: [],
            )));
        });

        // Past-period notification (accountant only)
        if ($user->role === 'accountant' && $document->document_date) {
            $isPastPeriod = Carbon::parse($document->document_date)->lt(Carbon::now()->startOfMonth());
            if ($isPastPeriod) {
                $period = Carbon::parse($document->document_date)->format('m/Y');
                $msg    = "Alert: A transaction dated {$period} was just posted into a past period."
                    . " Client: {$document->company->name} | Amount: PHP {$document->amount}"
                    . " | Posted by: " . $user->name;
                (new NotificationService())->notifyAdmin('past_period_approval', $msg, [
                    'documentId' => $document->id,
                    'companyId'  => $document->company_id,
                ]);
            }
        }

        return response()->json(['message' => 'Approved.']);
    }

    public function return(ReturnItemRequest $request, string $id): JsonResponse
    {
        $document = Document::with('company')->findOrFail($id);
        $user     = auth()->user();

        if ($document->status !== 'parked') {
            return response()->json(['message' => 'Document is not in the queue.'], 422);
        }

        if ($user->role === 'accountant' && $document->company->accountant_id !== $user->id) {
            return response()->json(['message' => 'Forbidden.'], 403);
        }

        DB::transaction(function () use ($document, $user, $request) {
            $document->update([
                'status'      => 'returned',
                'return_note' => $request->note,
                'returned_by' => $user->id,
                'returned_at' => now(),
                'expires_at'  => now()->addDays(30),
            ]);

            rescue(fn () => event(new QueueItemRemoved($document->id)));

            rescue(fn () => event(new DocumentStatusChanged(
                companyId:      $document->company_id,
                documentId:     $document->id,
                status:         'returned',
                flag:           $document->flag,
                anomalyReasons: $document->anomaly_reason ?? [],
            )));
        });

        return response()->json(['message' => 'Document returned.']);
    }

    public function reject(RejectItemRequest $request, string $id): JsonResponse
    {
        $document = Document::with('company')->findOrFail($id);
        $user     = auth()->user();

        if ($document->status !== 'parked') {
            return response()->json(['message' => 'Document is not in the queue.'], 422);
        }

        if ($user->role === 'accountant' && $document->company->accountant_id !== $user->id) {
            return response()->json(['message' => 'Forbidden.'], 403);
        }

        DB::transaction(function () use ($document, $user, $request) {
            $document->update([
                'status'           => 'rejected',
                'rejection_reason' => $request->reason,
                'rejected_by'      => $user->id,
                'rejected_at'      => now(),
            ]);

            rescue(fn () => event(new QueueItemRemoved($document->id)));

            rescue(fn () => event(new DocumentStatusChanged(
                companyId:      $document->company_id,
                documentId:     $document->id,
                status:         'rejected',
                flag:           $document->flag,
                anomalyReasons: $document->anomaly_reason ?? [],
            )));
        });

        return response()->json(['message' => 'Document rejected.']);
    }

    public function batchApprove(BatchApproveRequest $request): JsonResponse
    {
        $user = auth()->user();

        // Phase 1 — validate all, no DB writes
        $valid  = [];
        $failed = [];

        foreach ($request->ids as $id) {
            $doc = Document::with('company')->find($id);

            if (!$doc) {
                $failed[] = ['id' => $id, 'reason' => 'Document not found'];
                continue;
            }
            if ($doc->status !== 'parked') {
                $failed[] = ['id' => $id, 'reason' => 'Not in queue'];
                continue;
            }
            if ($user->role === 'accountant' && $doc->company->accountant_id !== $user->id) {
                $failed[] = ['id' => $id, 'reason' => 'Not assigned to your client'];
                continue;
            }
            $valid[] = $doc;
        }

        // Phase 2 — approve each valid item in its own transaction
        $approved           = [];
        $pastPeriodApproved = [];

        foreach ($valid as $doc) {
            try {
                DB::transaction(function () use ($doc, $user, &$approved, &$pastPeriodApproved) {
                    (new JournalEntryService())->postFromDocument($doc, $user);

                    $doc->update([
                        'status'      => 'approved',
                        'approved_by' => $user->id,
                        'approved_at' => now(),
                    ]);

                    rescue(fn () => event(new QueueItemRemoved($doc->id)));

                    rescue(fn () => event(new DocumentStatusChanged(
                        companyId:      $doc->company_id,
                        documentId:     $doc->id,
                        status:         'approved',
                        flag:           $doc->flag,
                        anomalyReasons: [],
                    )));

                    $approved[] = $doc->id;

                    if ($doc->document_date && Carbon::parse($doc->document_date)->lt(Carbon::now()->startOfMonth())) {
                        $pastPeriodApproved[] = $doc;
                    }
                });
            } catch (Throwable $e) {
                $failed[] = ['id' => $doc->id, 'reason' => 'Unexpected error — ' . $e->getMessage()];
            }
        }

        // One consolidated past-period notification after Phase 2
        if (!empty($pastPeriodApproved) && $user->role === 'accountant') {
            $count = count($pastPeriodApproved);
            $msg   = "Accountant " . $user->name . " approved {$count} past-period item(s) in batch.";
            (new NotificationService())->notifyAdmin('past_period_batch', $msg);
        }

        return response()->json([
            'approved' => $approved,
            'failed'   => $failed,
        ]);
    }
}
