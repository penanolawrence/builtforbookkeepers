<?php

namespace App\Services\Report;

use App\Models\Company;
use App\Models\JournalEntry;
use App\Models\JournalEntryLine;
use App\Models\TransactionLine;
use Illuminate\Support\Carbon;

class IncomeStatementService
{
    public function getData(Company $co, Carbon $start, Carbon $end): array
    {
        $entries = JournalEntry::where('company_id', $co->id)
            ->whereDate('entry_date', '>=', $start->toDateString())
            ->whereDate('entry_date', '<=', $end->toDateString())
            ->get(['id', 'document_id']);

        $entryIds    = $entries->pluck('id');
        $documentIds = $entries->whereNotNull('document_id')->pluck('document_id');

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
                    $income[$key] = [
                        'accountCode' => $account->code,
                        'accountName' => $account->name,
                        'total'       => 0,
                        'subtypes'    => [],
                    ];
                }
                $income[$key]['total'] += (float) ($line->credit ?? 0);
            } elseif ($account->type === 'expense') {
                $key = $account->id;
                if (!isset($expenses[$key])) {
                    $expenses[$key] = [
                        'accountCode' => $account->code,
                        'accountName' => $account->name,
                        'total'       => 0,
                        'subtypes'    => [],
                    ];
                }
                $expenses[$key]['total'] += (float) ($line->debit ?? 0);
            }
        }

        if ($documentIds->isNotEmpty()) {
            $subtypeLookup = $this->buildSubtypeLookup($documentIds->all());

            foreach ($income as $accountId => &$row) {
                $row['subtypes'] = $this->buildSubtypes($row['total'], $subtypeLookup[$accountId] ?? []);
            }
            unset($row);

            foreach ($expenses as $accountId => &$row) {
                $row['subtypes'] = $this->buildSubtypes($row['total'], $subtypeLookup[$accountId] ?? []);
            }
            unset($row);
        }

        $incomeList    = array_values($income);
        $expenseList   = array_values($expenses);
        $totalIncome   = array_sum(array_column($incomeList, 'total'));
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

    /** @param string[] $documentIds */
    private function buildSubtypeLookup(array $documentIds): array
    {
        $txLines = TransactionLine::with('subtype')
            ->whereIn('document_id', $documentIds)
            ->get();

        $lookup = []; // account_id => [ subtype_name => total ]

        foreach ($txLines as $txLine) {
            $accountId   = $txLine->account_id;
            if (!$accountId) continue;
            $subtypeName = $txLine->subtype?->name ?? '__others__';

            $lookup[$accountId][$subtypeName] = ($lookup[$accountId][$subtypeName] ?? 0) + (float) $txLine->amount;
        }

        return $lookup;
    }

    /** @param array<string,float> $lookup subtype_name => subtotal */
    private function buildSubtypes(float $accountTotal, array $lookup): array
    {
        if (empty($lookup)) {
            return [];
        }

        $named = [];
        foreach ($lookup as $name => $subtotal) {
            if ($name === '__others__') continue;
            $named[] = ['name' => $name, 'total' => $subtotal];
        }

        usort($named, fn ($a, $b) => $b['total'] <=> $a['total']);

        $namedTotal  = array_sum(array_column($named, 'total'));
        $othersTotal = round($accountTotal - $namedTotal, 2);

        if ($othersTotal > 0) {
            $named[] = ['name' => 'Others', 'total' => $othersTotal];
        }

        return $named;
    }
}
