<?php

namespace App\Http\Controllers;

use App\Events\DocumentStatusChanged;
use App\Events\QueueItemRemoved;
use App\Http\Requests\Queue\ApproveItemRequest;
use App\Http\Requests\Queue\BatchApproveRequest;
use App\Http\Requests\Queue\RejectItemRequest;
use App\Http\Requests\Queue\ReturnItemRequest;
use App\Models\Document;
use App\Models\TransactionLine;
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
        $document = Document::with(['company', 'merchant', 'transactionLines.account', 'transactionLines.subtype'])->findOrFail($id);

        try {
            $journalPreview = (new JournalEntryService())->previewFromDocument($document);
        } catch (Throwable) {
            $journalPreview = [];
        }

        return response()->json([
            'documentId'       => $document->id,
            'clientId'         => $document->company_id,
            'clientName'       => $document->company->name,
            'flag'             => $document->flag,
            'anomalyReasons'   => $document->anomaly_reason ?? [],
            'merchantName'     => $document->merchant_name,
            'amount'           => $document->amount,
            'vatAmount'        => $document->vat_amount,
            'date'             => $document->document_date?->toDateString(),
            'category'         => $document->category,
            'paymentMethod'    => $document->payment_method,
            'refNumber'        => $document->ref_number,
            'isNoReceipt'      => $document->is_no_receipt,
            'isOcrFailed'      => $document->is_ocr_failed,
            'declaredType'     => $document->document_type,
            'isVat'            => $document->company->bir_type === 'vat',
            'merchantTin'      => $document->merchant?->tin,
            'journalPreview'   => $journalPreview,
            'transactionLines' => $document->transactionLines->map(fn ($l) => [
                'id'          => $l->id,
                'accountId'   => $l->account_id,
                'accountCode' => $l->account_code,
                'accountName' => $l->account?->name,
                'type'        => $l->type,
                'subtypeId'   => $l->subtype_id,
                'subtypeName' => $l->subtype?->name,
                'amount'      => (float) $l->amount,
                'description' => $l->description,
                'date'        => $l->date?->toDateString(),
            ])->values()->all(),
        ]);
    }

    public function approve(ApproveItemRequest $request, string $id): JsonResponse
    {
        $document = Document::with(['company', 'transactionLines'])->findOrFail($id);
        $user     = auth()->user();

        if ($document->status !== 'parked') {
            return response()->json(['message' => 'Document is not in the queue.'], 422);
        }

        if ($user->role === 'accountant' && $document->company->accountant_id !== $user->id) {
            return response()->json(['message' => 'Forbidden.'], 403);
        }

        // Compute diff before any changes so original values are preserved
        $diff = $this->computeOverrideDiff($request, $document);

        $overrideData = (!empty($diff['fields']) || !empty($diff['lines']))
            ? array_merge($diff, [
                'overriddenBy' => $user->id,
                'overriddenAt' => now()->toIso8601String(),
            ])
            : null;

        DB::transaction(function () use ($document, $user, $request, $overrideData) {
            // Apply document-level field edits (inside transaction so they roll back if journal posting fails)
            if ($request->filled('fields')) {
                $fieldMap = [
                    'merchantName'  => 'merchant_name',
                    'date'          => 'document_date',
                    'amount'        => 'amount',
                    'vatAmount'     => 'vat_amount',
                    'category'      => 'category',
                    'paymentMethod' => 'payment_method',
                    'accountId'     => 'account_id',
                    'declaredType'  => 'document_type',
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

            // Resolve and link merchant if TIN was submitted
            if ($request->filled('fields') && array_key_exists('merchantTin', $request->fields)) {
                $tin      = $request->fields['merchantTin'] ?: null;
                $merchant = (new \App\Services\Merchant\MerchantResolverService())->resolve(
                    $document->company_id,
                    $document->merchant_name,
                    $tin,
                );
                if ($merchant) {
                    $document->merchant_id = $merchant->id;
                    $document->save();
                }
            }

            // Delete removed lines (scoped to this document for safety)
            if ($request->filled('removedLineIds')) {
                TransactionLine::where('document_id', $document->id)
                    ->whereIn('id', $request->removedLineIds)
                    ->delete();
            }

            // Update existing lines / create new lines
            if ($request->filled('lines')) {
                foreach ($request->lines as $lineData) {
                    if (!empty($lineData['id'])) {
                        $updateData = [];
                        if (array_key_exists('accountId', $lineData))   $updateData['account_id']   = $lineData['accountId'];
                        if (array_key_exists('accountCode', $lineData)) $updateData['account_code'] = $lineData['accountCode'];
                        if (array_key_exists('subtypeId', $lineData))   $updateData['subtype_id']   = $lineData['subtypeId'] ?: null;
                        if (array_key_exists('amount', $lineData))      $updateData['amount']       = $lineData['amount'];
                        if (array_key_exists('description', $lineData)) $updateData['description']  = $lineData['description'];
                        if (array_key_exists('date', $lineData))        $updateData['date']         = $lineData['date'];
                        if ($updateData) {
                            TransactionLine::where('id', $lineData['id'])
                                ->where('document_id', $document->id)
                                ->update($updateData);
                        }
                    } else {
                        $document->transactionLines()->create([
                            'type'         => $lineData['type'],
                            'account_id'   => $lineData['accountId'] ?? null,
                            'account_code' => $lineData['accountCode'] ?? null,
                            'subtype_id'   => $lineData['subtypeId'] ?? null,
                            'amount'       => $lineData['amount'] ?? 0,
                            'description'  => $lineData['description'] ?? null,
                            'date'         => $lineData['date'] ?? null,
                        ]);
                    }
                }
            }

            // Refresh lines before journal posting (picks up deletions and updates)
            $document->setRelation('transactionLines', $document->transactionLines()->get());

            (new JournalEntryService())->postFromDocument($document, $user);

            $document->update([
                'status'          => 'approved',
                'approved_by'     => $user->id,
                'approved_at'     => now(),
                'field_overrides' => $overrideData,
            ]);

            rescue(fn () => event(new QueueItemRemoved($document->id, $document->company->accountant_id ? (string) $document->company->accountant_id : null)));

            rescue(fn () => event(new DocumentStatusChanged(
                companyId:      $document->company_id,
                documentId:     $document->id,
                status:         'approved',
                flag:           $document->flag,
                anomalyReasons: [],
            )));
        });

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

    private function computeOverrideDiff(ApproveItemRequest $request, Document $document): array
    {
        $diff = ['fields' => [], 'lines' => []];

        $docFieldMap = [
            'merchantName'  => 'merchant_name',
            'date'          => 'document_date',
            'declaredType'  => 'document_type',
            'paymentMethod' => 'payment_method',
        ];

        if ($request->filled('fields')) {
            foreach ($request->fields as $key => $value) {
                if (!isset($docFieldMap[$key])) continue;
                $dbCol    = $docFieldMap[$key];
                $raw      = $document->$dbCol;
                // Normalise date fields: Carbon instances / datetime strings → Y-m-d
                if ($key === 'date' && $raw !== null) {
                    $original = Carbon::parse($raw)->toDateString();
                } else {
                    $original = (string) ($raw ?? '');
                }
                $newVal   = (string) $value;
                if ($original !== $newVal) {
                    $diff['fields'][] = [
                        'field'    => $key,
                        'original' => $original,
                        'override' => $newVal,
                    ];
                }
            }
        }

        if ($request->filled('lines')) {
            foreach ($request->lines as $lineData) {
                if (empty($lineData['id'])) continue;
                $line = $document->transactionLines->firstWhere('id', $lineData['id']);
                if (!$line) continue;
                foreach (['accountCode' => 'account_code', 'subtypeId' => 'subtype_id'] as $field => $dbCol) {
                    if (!isset($lineData[$field])) continue;
                    $original = (string) ($line->$dbCol ?? '');
                    $newVal   = (string) $lineData[$field];
                    if ($original !== $newVal) {
                        $diff['lines'][] = [
                            'lineId'   => $line->id,
                            'field'    => $field,
                            'original' => $original,
                            'override' => $newVal,
                        ];
                    }
                }
            }
        }

        return $diff;
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

            rescue(fn () => event(new QueueItemRemoved($document->id, $document->company->accountant_id ? (string) $document->company->accountant_id : null)));

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

            rescue(fn () => event(new QueueItemRemoved($document->id, $document->company->accountant_id ? (string) $document->company->accountant_id : null)));

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

                    rescue(fn () => event(new QueueItemRemoved($doc->id, $doc->company->accountant_id ? (string) $doc->company->accountant_id : null)));

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
