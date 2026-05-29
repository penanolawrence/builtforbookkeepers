<?php

namespace App\Services\Report;

use App\Models\Company;
use App\Models\JournalEntry;
use App\Models\JournalEntryLine;
use Illuminate\Support\Carbon;

class ExpenseBreakdownService
{
    public function getData(Company $co, Carbon $start, Carbon $end): array
    {
        $entryIds = JournalEntry::where('company_id', $co->id)
            ->whereDate('entry_date', '>=', $start->toDateString())
            ->whereDate('entry_date', '<=', $end->toDateString())
            ->pluck('id');

        $lines = JournalEntryLine::with('account')
            ->whereIn('journal_entry_id', $entryIds)
            ->get();

        $expenses = [];

        foreach ($lines as $line) {
            $account = $line->account;
            if (!$account || $account->type !== 'expense') continue;

            $key = $account->id;
            if (!isset($expenses[$key])) {
                $expenses[$key] = ['accountCode' => $account->code, 'accountName' => $account->name, 'total' => 0];
            }
            $expenses[$key]['total'] += (float)($line->debit ?? 0);
        }

        $expenseList = array_values($expenses);
        $grandTotal  = array_sum(array_column($expenseList, 'total'));

        return [
            'expenses'   => $expenseList,
            'grandTotal' => $grandTotal,
        ];
    }
}
