<?php

namespace App\Http\Controllers;

use App\Http\Requests\AdjustingEntry\CreateEntryRequest;
use App\Http\Requests\AdjustingEntry\RejectEntryRequest;
use App\Models\AdjustingEntry;
use App\Models\AdjustingEntryLine;
use App\Models\Company;
use App\Services\Accounting\JournalEntryService;
use App\Services\Notification\NotificationService;
use App\Services\Ref\RefSequenceService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class AdjustingEntryController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $user  = auth()->user();
        $query = AdjustingEntry::with(['company', 'creator']);

        if ($user->role === 'accountant') {
            $query->where('created_by', $user->id);
            if ($request->filled('status')) {
                $query->where('status', strtolower($request->status));
            }
        } else {
            $status = strtolower($request->filled('status') ? $request->status : 'pending');
            if ($status !== 'all') {
                $query->where('status', $status);
            }
        }

        if ($request->filled('clientId')) {
            $query->where('company_id', $request->clientId);
        }

        return response()->json($query->latest()->get()->map(fn ($e) => $this->toList($e)));
    }

    public function show(string $id): JsonResponse
    {
        $entry = AdjustingEntry::with(['company', 'lines.account', 'creator', 'approver', 'rejecter'])->findOrFail($id);
        $user  = auth()->user();

        if ($user->role !== 'admin' && $entry->created_by !== $user->id) {
            return response()->json(['message' => 'Forbidden.'], 403);
        }

        return response()->json($this->toDetail($entry));
    }

    public function create(CreateEntryRequest $request): JsonResponse
    {
        $user    = auth()->user();
        $company = Company::findOrFail($request->companyId);

        if ($user->role === 'accountant' && $company->accountant_id !== $user->id) {
            return response()->json(['message' => 'Forbidden.'], 403);
        }

        $ref = (new RefSequenceService())->nextRef($company, 'ADJ');

        $entry = DB::transaction(function () use ($request, $company, $user, $ref) {
            $entry = AdjustingEntry::create([
                'company_id'  => $company->id,
                'created_by'  => $user->id,
                'status'      => 'draft',
                'type'        => $request->type,
                'entry_date'  => $request->date,
                'description' => $request->memo,
                'ref_number'  => $ref,
            ]);

            foreach ($request->lines as $line) {
                AdjustingEntryLine::create([
                    'adjusting_entry_id' => $entry->id,
                    'account_id'         => $line['accountId'],
                    'subtype_id'         => $line['subtypeId'] ?? null,
                    'debit'              => $line['debit'] ?? null,
                    'credit'             => $line['credit'] ?? null,
                    'description'        => $line['description'] ?? null,
                ]);
            }

            return $entry;
        });

        return response()->json(['entryId' => $entry->id], 201);
    }

    public function update(Request $request, string $id): JsonResponse
    {
        $entry = AdjustingEntry::with('lines')->findOrFail($id);
        $user  = auth()->user();

        if ($entry->created_by !== $user->id || $entry->status !== 'draft') {
            return response()->json(['message' => 'Only draft entries you created can be updated.'], 422);
        }

        DB::transaction(function () use ($entry, $request) {
            $entry->update([
                'entry_date'  => $request->date ?? $entry->entry_date,
                'description' => $request->memo ?? $entry->description,
                'type'        => $request->type ?? $entry->type,
            ]);

            if ($request->has('lines')) {
                $entry->lines()->delete();
                foreach ($request->lines as $line) {
                    AdjustingEntryLine::create([
                        'adjusting_entry_id' => $entry->id,
                        'account_id'         => $line['accountId'],
                        'debit'              => $line['debit'] ?? null,
                        'credit'             => $line['credit'] ?? null,
                    ]);
                }
            }
        });

        return response()->json(['message' => 'Updated.']);
    }

    public function submit(Request $request, string $id): JsonResponse
    {
        $entry = AdjustingEntry::with(['lines', 'company'])->findOrFail($id);
        $user  = auth()->user();

        if ($entry->created_by !== $user->id) {
            return response()->json(['message' => 'Forbidden.'], 403);
        }

        $debitTotal  = $entry->lines->sum('debit');
        $creditTotal = $entry->lines->sum('credit');

        if (abs($debitTotal - $creditTotal) >= 0.01) {
            return response()->json([
                'message'     => 'Entry is unbalanced.',
                'debitTotal'  => $debitTotal,
                'creditTotal' => $creditTotal,
            ], 422);
        }

        if ($request->boolean('selfApprove')) {
            if ($user->role !== 'admin') {
                return response()->json(['message' => 'Only admin can self-approve.'], 403);
            }

            DB::transaction(function () use ($entry, $user) {
                (new JournalEntryService())->postFromAdjustingEntry($entry, $user);
                $entry->update([
                    'status'       => 'approved',
                    'submitted_at' => now(),
                    'approved_by'  => $user->id,
                    'approved_at'  => now(),
                ]);
            });
        } else {
            $entry->update(['status' => 'pending', 'submitted_at' => now()]);

            (new NotificationService())->notifyAdmin(
                'new_adjusting_entry',
                "New entry from " . $user->name . " needs approval",
                ['entryId' => $entry->id, 'companyId' => $entry->company_id]
            );
        }

        return response()->json(['message' => 'Submitted.']);
    }

    public function delete(string $id): JsonResponse
    {
        $entry = AdjustingEntry::findOrFail($id);
        $user  = auth()->user();

        if ($entry->created_by !== $user->id || $entry->status !== 'draft') {
            return response()->json(['message' => 'Only draft entries you created can be deleted.'], 422);
        }

        $entry->lines()->delete();
        $entry->delete();

        return response()->json(['message' => 'Deleted.']);
    }

    public function resubmit(string $id): JsonResponse
    {
        $entry = AdjustingEntry::with(['lines', 'company'])->findOrFail($id);
        $user  = auth()->user();

        if ($entry->created_by !== $user->id || $entry->status !== 'rejected') {
            return response()->json(['message' => 'Only rejected entries you created can be resubmitted.'], 422);
        }

        $ref = (new RefSequenceService())->nextRef($entry->company, 'ADJ');

        $newEntry = DB::transaction(function () use ($entry, $user, $ref) {
            $newEntry = AdjustingEntry::create([
                'company_id'      => $entry->company_id,
                'created_by'      => $user->id,
                'status'          => 'draft',
                'type'            => $entry->type,
                'entry_date'      => $entry->entry_date,
                'description'     => $entry->description,
                'ref_number'      => $ref,
                'parent_entry_id' => $entry->id,
            ]);

            foreach ($entry->lines as $line) {
                AdjustingEntryLine::create([
                    'adjusting_entry_id' => $newEntry->id,
                    'account_id'         => $line->account_id,
                    'debit'              => $line->debit,
                    'credit'             => $line->credit,
                ]);
            }

            return $newEntry;
        });

        return response()->json(['entryId' => $newEntry->id, 'message' => 'New draft created.'], 201);
    }

    public function approve(string $id): JsonResponse
    {
        $entry = AdjustingEntry::with(['lines', 'company', 'creator'])->findOrFail($id);
        $user  = auth()->user();

        if ($entry->status !== 'pending') {
            return response()->json(['message' => 'Entry must be pending to approve.'], 422);
        }

        DB::transaction(function () use ($entry, $user) {
            (new JournalEntryService())->postFromAdjustingEntry($entry, $user);
            $entry->update([
                'status'      => 'approved',
                'approved_by' => $user->id,
                'approved_at' => now(),
            ]);
        });

        if ($entry->creator) {
            (new NotificationService())->notifyAccountant(
                $entry->creator,
                'entry_approved',
                "Your entry for {$entry->company->name} was approved"
            );
        }

        return response()->json(['message' => 'Entry approved.']);
    }

    public function rejectEntry(RejectEntryRequest $request, string $id): JsonResponse
    {
        $entry = AdjustingEntry::with(['company', 'creator'])->findOrFail($id);
        $user  = auth()->user();

        if ($entry->status !== 'pending') {
            return response()->json(['message' => 'Entry must be pending to reject.'], 422);
        }

        $entry->update([
            'status'           => 'rejected',
            'rejected_by'      => $user->id,
            'rejection_reason' => $request->reason,
            'rejected_at'      => now(),
        ]);

        if ($entry->creator) {
            (new NotificationService())->notifyAccountant(
                $entry->creator,
                'entry_rejected',
                "Your entry for {$entry->company->name} was rejected"
            );
        }

        return response()->json(['message' => 'Entry rejected.']);
    }

    private function toList(AdjustingEntry $e): array
    {
        return [
            'id'          => $e->id,
            'companyId'   => $e->company_id,
            'companyName' => $e->company?->name,
            'createdBy'   => $e->creator?->name,
            'refNumber'   => $e->ref_number,
            'type'        => $e->type,
            'status'      => strtoupper($e->status),
            'date'        => $e->entry_date?->toDateString(),
            'memo'        => $e->description,
            'createdAt'   => $e->created_at?->toIso8601String(),
        ];
    }

    private function toDetail(AdjustingEntry $e): array
    {
        return array_merge($this->toList($e), [
            'lines' => $e->lines->map(fn ($l) => [
                'accountId'   => $l->account_id,
                'accountCode' => $l->account?->code,
                'accountName' => $l->account?->name,
                'debit'       => $l->debit,
                'credit'      => $l->credit,
            ]),
            'createdBy'       => $e->creator?->name,
            'approvedBy'      => $e->approver?->name,
            'rejectedBy'      => $e->rejecter?->name,
            'parentEntryId'   => $e->parent_entry_id,
            'submittedAt'     => $e->submitted_at?->toIso8601String(),
            'approvedAt'      => $e->approved_at?->toIso8601String(),
            'rejectedAt'      => $e->rejected_at?->toIso8601String(),
            'rejectionReason' => $e->rejection_reason,
        ]);
    }
}
