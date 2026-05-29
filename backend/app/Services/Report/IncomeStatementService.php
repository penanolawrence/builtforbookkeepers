<?php

namespace App\Services\Report;

use App\Models\Company;
use App\Models\JournalEntry;
use App\Models\JournalEntryLine;
use Illuminate\Support\Carbon;

class IncomeStatementService
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

        $income   = [];
        $expenses = [];

        foreach ($lines as $line) {
            $account = $line->account;
            if (!$account) continue;

            if ($account->type === 'income') {
                $key = $account->id;
                if (!isset($income[$key])) {
                    $income[$key] = ['accountCode' => $account->code, 'accountName' => $account->name, 'total' => 0];
                }
                $income[$key]['total'] += (float)($line->credit ?? 0);
            } elseif ($account->type === 'expense') {
                $key = $account->id;
                if (!isset($expenses[$key])) {
                    $expenses[$key] = ['accountCode' => $account->code, 'accountName' => $account->name, 'total' => 0];
                }
                $expenses[$key]['total'] += (float)($line->debit ?? 0);
            }
        }

        $incomeList   = array_values($income);
        $expenseList  = array_values($expenses);
        $totalIncome  = array_sum(array_column($incomeList, 'total'));
        $totalExpenses = array_sum(array_column($expenseList, 'total'));

        return [
            'income'   => $incomeList,
            'expenses' => $expenseList,
            'totals'   => [
                'totalIncome'   => $totalIncome,
                'totalExpenses' => $totalExpenses,
                'netIncome'     => $totalIncome - $totalExpenses,
            ],
        ];
    }
}
