<?php

namespace App\Services\BIR;

use App\Models\Account;
use App\Models\Company;
use App\Models\JournalEntry;
use App\Models\JournalEntryLine;
use Illuminate\Support\Carbon;

class GLService
{
    public function getData(Company $co, Account $account, Carbon $start, Carbon $end): array
    {
        // Step 1 — Opening balance (all activity before start date)
        $openingBalance = JournalEntryLine::whereHas('journalEntry', function ($q) use ($co, $start) {
                $q->where('company_id', $co->id)
                  ->whereDate('entry_date', '<', $start->toDateString());
            })
            ->where('account_id', $account->id)
            ->selectRaw('COALESCE(SUM(debit), 0) - COALESCE(SUM(credit), 0) as balance')
            ->value('balance') ?? 0;

        // Step 2 — Lines in range
        $lines = JournalEntryLine::with(['journalEntry.document', 'journalEntry.adjustingEntry'])
            ->where('account_id', $account->id)
            ->whereHas('journalEntry', function ($q) use ($co, $start, $end) {
                $q->where('company_id', $co->id)
                  ->whereDate('entry_date', '>=', $start->toDateString())
                  ->whereDate('entry_date', '<=', $end->toDateString());
            })
            ->join('journal_entries', 'journal_entries.id', '=', 'journal_entry_lines.journal_entry_id')
            ->orderBy('journal_entries.entry_date')
            ->orderBy('journal_entries.created_at')
            ->select('journal_entry_lines.*')
            ->get();

        // Step 3 — Build rows (no Opening Balance row — it is the top-level openingBalance field)
        $rows           = [];
        $runningBalance = (float) $openingBalance;

        foreach ($lines as $line) {
            $entry  = $line->journalEntry;
            $ref    = $entry->document?->ref_number ?? $entry->adjustingEntry?->ref_number;
            $debit  = $line->debit  ? (float) $line->debit  : null;
            $credit = $line->credit ? (float) $line->credit : null;

            $runningBalance += ($debit ?? 0) - ($credit ?? 0);

            $rows[] = [
                'date'           => $entry->entry_date?->toDateString(),
                'description'    => $entry->description,
                'ref'            => $ref,
                'debit'          => $debit,
                'credit'         => $credit,
                'runningBalance' => $runningBalance,
            ];
        }

        // Step 4 — Normal balance derived from account type
        $normalBalance = in_array($account->type, ['cash', 'expense']) ? 'debit' : 'credit';

        // Step 5 — Parked documents within the selected date range
        $parkedCount = \App\Models\Document::where('company_id', $co->id)
            ->where('status', 'parked')
            ->whereDate('document_date', '>=', $start->toDateString())
            ->whereDate('document_date', '<=', $end->toDateString())
            ->count();

        return [
            'account' => [
                'code'          => $account->code,
                'name'          => $account->name,
                'normalBalance' => $normalBalance,
            ],
            'openingBalance' => (float) $openingBalance,
            'parkedCount'    => $parkedCount,
            'rows'           => $rows,
        ];
    }
}
