<?php

namespace App\Services\BIR;

use App\Models\Company;
use App\Models\JournalEntry;
use Illuminate\Support\Carbon;

class CDBService
{
    public function getData(Company $co, Carbon $start, Carbon $end): array
    {
        $entries = JournalEntry::with(['document', 'lines.account'])
            ->where('company_id', $co->id)
            ->whereHas('document', fn ($q) => $q->where('document_type', 'expense'))
            ->whereDate('entry_date', '>=', $start->toDateString())
            ->whereDate('entry_date', '<=', $end->toDateString())
            ->orderBy('entry_date')
            ->get();

        $rows = [];

        foreach ($entries as $entry) {
            $doc         = $entry->document;
            $cashCredit  = 0;
            $vatDebit    = 0;
            $netDebit    = 0;
            $category    = null;

            foreach ($entry->lines as $line) {
                $account = $line->account;
                if (!$account) continue;

                if ($account->type === 'cash' && $line->credit) {
                    $cashCredit += (float)$line->credit;
                }
                if ($account->type === 'vat' && $account->code === '1101' && $line->debit) {
                    $vatDebit += (float)$line->debit;
                }
                if ($account->type === 'expense' && $line->debit) {
                    $netDebit += (float)$line->debit;
                    $category  = $account->name;
                }
            }

            $rows[] = [
                'date'      => $entry->entry_date?->toDateString(),
                'refNo'     => $doc?->ref_number,
                'payee'     => $doc?->merchant_name,
                'amount'    => $cashCredit,
                'vatAmount' => $vatDebit ?: null,
                'netOfVat'  => $netDebit ?: $cashCredit,
                'category'  => $category,
            ];
        }

        return $rows;
    }
}
