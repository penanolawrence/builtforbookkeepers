<?php

namespace App\Http\Controllers;

use App\Events\DocumentStageUpdated;
use App\Events\DocumentStatusChanged;
use App\Http\Requests\Document\ManualEntryRequest;
use App\Http\Requests\Document\UploadDocumentRequest;
use App\Jobs\ClassifyWithAI;
use App\Jobs\PrepareDocumentForAI;
use App\Models\Account;
use App\Models\Company;
use App\Models\Document;
use App\Services\Ref\RefSequenceService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class DocumentController extends Controller
{
    public function upload(UploadDocumentRequest $request): JsonResponse
    {
        $user = auth()->user();

        if ($request->filled('client_id')) {
            $company = Company::findOrFail($request->client_id);

            if ($user->role === 'client' && $company->id !== $user->company_id) {
                return response()->json(['message' => 'Forbidden.'], 403);
            }

            if ($user->role === 'accountant' && $company->accountant_id !== $user->id) {
                return response()->json(['message' => 'Forbidden.'], 403);
            }
        } else {
            $company = Company::findOrFail($user->company_id);
        }

        if (! Account::where('company_id', $company->id)->exists()) {
            return response()->json(['message' => 'Chart of accounts is not set up yet. Please complete the account setup first.'], 422);
        }

        $hash = hash_file('sha256', $request->file('file')->getRealPath());

        $existing = Document::where('company_id', $company->id)
            ->where('file_hash', $hash)
            ->where('status', '!=', 'rejected')
            ->first();

        if ($existing && $existing->status !== 'returned') {
            return response()->json(['message' => 'This file has already been uploaded.'], 409);
        }

        $path = $request->file('file')->store('documents', 's3');

        if (!$path) {
            return response()->json(['message' => 'File upload failed. Please try again.'], 500);
        }

        $document = Document::create([
            'company_id'        => $company->id,
            'uploaded_by'       => $user->id,
            'original_filename' => $request->file('file')->getClientOriginalName(),
            'storage_path'      => $path,
            'file_type'         => $request->file('file')->getClientOriginalExtension(),
            'file_hash'         => $hash,
            'document_type'     => $request->declared_type,
            'payment_method'    => 'cash',
            'status'            => 'processing',
            'internal_status'   => 'PENDING',
            'is_no_receipt'     => false,
            'is_ocr_failed'     => false,
            'note'              => $request->note,
        ]);

        PrepareDocumentForAI::dispatch($document);

        rescue(fn () => event(new DocumentStageUpdated(
            companyId:  $company->id,
            documentId: $document->id,
            stage:      'uploading',
            status:     'processing',
            label:      'Uploading...',
        )));

        return response()->json(['documentId' => $document->id], 201);
    }

    public function index(Request $request): JsonResponse
    {
        $user  = auth()->user();
        $query = Document::where('company_id', $user->company_id);

        if ($request->filled('status')) {
            $query->where('status', strtolower($request->status));
        }
        if ($request->filled('type')) {
            $query->where('document_type', $request->type);
        }
        if ($request->filled('start') || $request->filled('end')) {
            $start = $request->input('start');
            $end   = $request->input('end');
            if ($start) $query->whereDate('document_date', '>=', $start);
            if ($end)   $query->whereDate('document_date', '<=', $end);
        }

        $perPage  = min(500, max(1, (int) $request->get('per_page', 10)));
        $page     = max(1, (int) $request->get('page', 1));
        $sortDir  = strtolower($request->get('sort_dir', 'desc')) === 'asc' ? 'asc' : 'desc';

        $inReview = (clone $query)->whereIn('status', ['parked', 'returned'])->count();

        $aggQuery = \Illuminate\Support\Facades\DB::table('documents')
            ->leftJoin('transaction_lines', 'transaction_lines.document_id', '=', 'documents.id')
            ->where('documents.company_id', $user->company_id);

        if ($request->filled('status')) {
            $aggQuery->where('documents.status', strtolower($request->status));
        }
        if ($request->filled('type')) {
            $aggQuery->where('documents.document_type', $request->type);
        }
        if ($request->filled('start') || $request->filled('end')) {
            $start = $request->input('start');
            $end   = $request->input('end');
            if ($start) $aggQuery->whereDate('documents.document_date', '>=', $start);
            if ($end)   $aggQuery->whereDate('documents.document_date', '<=', $end);
        }

        $agg = $aggQuery->selectRaw(
            'COALESCE(SUM(CASE WHEN transaction_lines.type = ? THEN transaction_lines.amount ELSE 0 END), 0) as total_inflow,
             COALESCE(SUM(CASE WHEN transaction_lines.type = ? THEN transaction_lines.amount ELSE 0 END), 0) as total_outflow',
            ['income', 'expense']
        )->first();

        $paginated = $query->with('transactionLines')
            ->orderByRaw('document_date IS NULL')
            ->orderBy('document_date', $sortDir)
            ->orderBy('id', 'desc')
            ->paginate($perPage, ['*'], 'page', $page);

        return response()->json([
            'data'         => $paginated->getCollection()->map(fn ($d) => $this->toListItem($d)),
            'total'        => $paginated->total(),
            'perPage'      => $perPage,
            'currentPage'  => $paginated->currentPage(),
            'lastPage'     => $paginated->lastPage(),
            'inReview'     => $inReview,
            'totalInflow'  => (float) ($agg->total_inflow ?? 0),
            'totalOutflow' => (float) ($agg->total_outflow ?? 0),
        ]);
    }

    public function show(string $id): JsonResponse
    {
        $document = Document::with(['company', 'transactionLines.account', 'transactionLines.subtype'])->findOrFail($id);
        $user     = auth()->user();

        if ($user->role === 'client' && $document->company_id !== $user->company_id) {
            return response()->json(['message' => 'Forbidden.'], 403);
        }

        return response()->json($this->toDetail($document));
    }

    public function getStatus(string $id): JsonResponse
    {
        $user     = auth()->user();
        $document = Document::where('id', $id)
            ->where('company_id', $user->company_id)
            ->firstOrFail();

        return response()->json([
            'documentId' => $document->id,
            'stage'      => $document->internal_status,
            'status'     => $document->status,
            'flag'       => $document->flag,
        ]);
    }

    public function reupload(Request $request, string $id): JsonResponse
    {
        $request->validate([
            'file' => ['required', 'file', 'mimes:jpg,jpeg,png,pdf', 'max:10240'],
        ]);

        $user     = auth()->user();
        $document = Document::where('id', $id)
            ->where('company_id', $user->company_id)
            ->firstOrFail();

        if ($document->status !== 'returned') {
            return response()->json(['message' => 'Only RETURNED documents can be re-uploaded.'], 422);
        }

        Storage::disk('s3')->delete($document->storage_path);

        $newHash = hash_file('sha256', $request->file('file')->getRealPath());

        $existing = Document::where('company_id', $user->company_id)
            ->where('file_hash', $newHash)
            ->where('status', '!=', 'rejected')
            ->where('id', '!=', $document->id)
            ->first();

        if ($existing && $existing->status !== 'returned') {
            return response()->json(['message' => 'This file has already been uploaded.'], 409);
        }

        $newPath = $request->file('file')->store('documents', 's3');

        if (!$newPath) {
            return response()->json(['message' => 'File upload failed. Please try again.'], 500);
        }

        $document->update([
            'status'          => 'processing',
            'internal_status' => 'PENDING',
            'flag'            => 'YELLOW',
            'storage_path'    => $newPath,
            'file_type'       => $request->file('file')->getClientOriginalExtension(),
            'file_hash'       => $newHash,
            'return_note'     => null,
            'expires_at'      => null,
            'is_ocr_failed'   => false,
            'merchant_name'   => null,
            'document_date'   => null,
            'amount'          => null,
            'vat_amount'      => null,
            'category'        => null,
            'anomaly_reason'  => null,
        ]);

        PrepareDocumentForAI::dispatch($document);

        return response()->json(['documentId' => $document->id]);
    }

    public function cancel(string $id): JsonResponse
    {
        $user     = auth()->user();
        $document = Document::where('id', $id)
            ->where('company_id', $user->company_id)
            ->firstOrFail();

        if (!in_array($document->status, ['processing', 'parked', 'returned'])) {
            return response()->json(['message' => 'This document cannot be cancelled.'], 422);
        }

        $document->update([
            'status'       => 'cancelled',
            'cancelled_by' => $user->id,
            'cancelled_at' => now(),
        ]);

        rescue(fn () => event(new DocumentStatusChanged(
            companyId:      $document->company_id,
            documentId:     $document->id,
            status:         'cancelled',
            flag:           $document->flag,
            anomalyReasons: $document->anomaly_reason ?? [],
        )));

        return response()->json(['message' => 'Document withdrawn.']);
    }

    public function manualEntry(ManualEntryRequest $request): JsonResponse
    {
        $user = auth()->user();

        if ($request->filled('client_id')) {
            $company = Company::findOrFail($request->client_id);

            if ($user->role === 'client' && $company->id !== $user->company_id) {
                return response()->json(['message' => 'Forbidden.'], 403);
            }

            if ($user->role === 'accountant' && $company->accountant_id !== $user->id) {
                return response()->json(['message' => 'Forbidden.'], 403);
            }
        } else {
            $company = Company::findOrFail($user->company_id);
        }

        if (! Account::where('company_id', $company->id)->exists()) {
            return response()->json(['message' => 'Chart of accounts is not set up yet. Please complete the account setup first.'], 422);
        }

        $refService = new RefSequenceService();
        $ref        = $refService->nextRef($company, 'MNL');

        $totalAmount = collect($request->lines)->sum('amount');

        $document = Document::create([
            'company_id'        => $company->id,
            'uploaded_by'       => $user->id,
            'original_filename' => 'manual-entry',
            'storage_path'      => '',
            'document_type'     => $request->declared_type,
            'status'            => 'processing',
            'internal_status'   => 'READY',
            'flag'              => null,
            'is_no_receipt'     => true,
            'is_ocr_failed'     => false,
            'ref_number'        => $ref,
            'file_hash'         => null,
            'document_date'     => $request->date,
            'amount'            => $totalAmount,
            'payment_method'    => $request->payment_method,
        ]);

        // Pre-create lines (description + amount only; AI will assign account codes)
        foreach ($request->lines as $line) {
            $document->transactionLines()->create([
                'type'        => $request->declared_type,
                'description' => $line['description'],
                'amount'      => $line['amount'],
            ]);
        }

        ClassifyWithAI::dispatch($document, null);

        rescue(fn () => event(new DocumentStageUpdated(
            companyId:  $company->id,
            documentId: $document->id,
            stage:      'ai',
            status:     'processing',
            label:      'Categorizing...',
        )));

        return response()->json(['documentId' => $document->id], 201);
    }

    public function getSignedUrl(string $id): JsonResponse
    {
        $document = Document::with('company')->findOrFail($id);
        $user     = auth()->user();

        if ($user->role === 'client' && $document->company_id !== $user->company_id) {
            return response()->json(['message' => 'Forbidden.'], 403);
        }

        if ($user->role === 'accountant' && $document->company->accountant_id !== $user->id) {
            return response()->json(['message' => 'Forbidden.'], 403);
        }

        // Admins can access any document
        if (!in_array($user->role, ['client', 'accountant', 'admin'])) {
            return response()->json(['message' => 'Forbidden.'], 403);
        }

        if ($document->is_no_receipt || !$document->storage_path) {
            return response()->json(['url' => null]);
        }

        $disk = config('filesystems.disks.s3.public_url') ? 's3-url' : 's3';
        $url  = Storage::disk($disk)->temporaryUrl($document->storage_path, now()->addMinutes(15));

        return response()->json(['url' => $url, 'expiresAt' => now()->addMinutes(15)->toIso8601String()]);
    }

    public function clientDocuments(Request $request, string $clientId): JsonResponse
    {
        $user    = auth()->user();
        $company = Company::findOrFail($clientId);

        if ($user->role === 'accountant' && $company->accountant_id !== $user->id) {
            return response()->json(['message' => 'Forbidden.'], 403);
        }

        $query = Document::where('company_id', $clientId);

        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }
        if ($request->filled('type')) {
            $query->where('document_type', $request->type);
        }
        if ($request->filled('start')) {
            $query->whereDate('document_date', '>=', $request->start);
        }
        if ($request->filled('end')) {
            $query->whereDate('document_date', '<=', $request->end);
        }

        $documents = $query->with('transactionLines')->latest()->get();

        return response()->json($documents->map(fn ($d) => $this->toListItem($d)));
    }

    private function toListItem(Document $d): array
    {
        $inflow  = (float) $d->transactionLines->where('type', 'income')->sum('amount');
        $outflow = (float) $d->transactionLines->where('type', 'expense')->sum('amount');

        return [
            'id'              => $d->id,
            'companyId'       => $d->company_id,
            'declaredType'    => $d->document_type,
            'status'          => strtoupper($d->status),
            'flag'            => $d->flag,
            'anomalyReasons'  => $d->anomaly_reason ?? [],
            'merchantName'    => $d->merchant_name,
            'date'            => $d->document_date?->toDateString(),
            'amount'          => $d->amount !== null ? (float) $d->amount : null,
            'vatAmount'       => $d->vat_amount,
            'category'        => $d->category,
            'paymentMethod'   => $d->payment_method,
            'imageUrl'        => null,
            'isNoReceipt'     => $d->is_no_receipt,
            'isOcrFailed'     => $d->is_ocr_failed,
            'returnNote'      => $d->return_note,
            'rejectionReason' => $d->rejection_reason,
            'expiresAt'       => $d->expires_at?->toIso8601String(),
            'refNumber'       => $d->ref_number,
            'note'            => $d->note,
            'inflow'          => $inflow,
            'outflow'         => $outflow,
            'createdAt'       => $d->created_at?->toIso8601String(),
            'updatedAt'       => $d->updated_at?->toIso8601String(),
        ];
    }

    private function toDetail(Document $d): array
    {
        return array_merge($this->toListItem($d), [
            'internalStatus'   => $d->internal_status,
            'approvedAt'       => $d->approved_at?->toIso8601String(),
            'returnedAt'       => $d->returned_at?->toIso8601String(),
            'rejectedAt'       => $d->rejected_at?->toIso8601String(),
            'fieldOverrides'   => $d->field_overrides,
            'transactionLines' => $d->transactionLines->map(fn($l) => [
                'id'          => $l->id,
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
}
