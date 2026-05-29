<?php

namespace App\Services\BIR;

use App\Models\Company;
use App\Models\JournalEntry;
use App\Models\JournalEntryLine;
use Illuminate\Support\Carbon;

class CRBService
{
    public function getData(Company $co, Carbon $start, Carbon $end): array
    {
        $entries = JournalEntry::with(['document', 'lines.account'])
            ->where('company_id', $co->id)
            ->whereHas('document', fn ($q) => $q->where('document_type', 'income'))
            ->whereDate('entry_date', '>=', $start->toDateString())
            ->whereDate('entry_date', '<=', $end->toDateString())
            ->orderBy('entry_date')
            ->get();

        $rows = [];

        foreach ($entries as $entry) {
            $doc        = $entry->document;
            $cashDebit  = 0;
            $vatCredit  = 0;
            $netCredit  = 0;
            $category   = null;

            foreach ($entry->lines as $line) {
                $account = $line->account;
                if (!$account) continue;

                if ($account->type === 'cash' && $line->debit) {
                    $cashDebit += (float)$line->debit;
                }
                if ($account->type === 'vat' && $account->code === '2101' && $line->credit) {
                    $vatCredit += (float)$line->credit;
                }
                if ($account->type === 'income' && $line->credit) {
                    $netCredit += (float)$line->credit;
                    $category   = $account->name;
                }
            }

            $rows[] = [
                'date'      => $entry->entry_date?->toDateString(),
                'refNo'     => $doc?->ref_number,
                'payor'     => $doc?->merchant_name,
                'amount'    => $cashDebit,
                'vatAmount' => $vatCredit ?: null,
                'netOfVat'  => $netCredit ?: $cashDebit,
                'category'  => $category,
            ];
        }

        return $rows;
    }
}
