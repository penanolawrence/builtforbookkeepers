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
        // Step 1 — Opening balance
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

        // Step 3 — Build rows
        $rows           = [];
        $runningBalance = (float)$openingBalance;

        $rows[] = [
            'date'           => $start->toDateString(),
            'description'    => 'Opening Balance',
            'ref'            => null,
            'debit'          => null,
            'credit'         => null,
            'runningBalance' => $runningBalance,
        ];

        foreach ($lines as $line) {
            $entry  = $line->journalEntry;
            $ref    = $entry->document?->ref_number ?? $entry->adjustingEntry?->ref_number;
            $debit  = $line->debit  ? (float)$line->debit  : null;
            $credit = $line->credit ? (float)$line->credit : null;

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

        return [
            'account'        => ['code' => $account->code, 'name' => $account->name],
            'openingBalance' => (float)$openingBalance,
            'rows'           => $rows,
        ];
    }
}
