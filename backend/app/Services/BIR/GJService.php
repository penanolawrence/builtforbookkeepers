<?php

namespace App\Services\BIR;

use App\Models\Company;
use App\Models\JournalEntry;
use Illuminate\Support\Carbon;

class GJService
{
    public function getData(Company $co, Carbon $start, Carbon $end): array
    {
        $entries = JournalEntry::with(['document', 'adjustingEntry', 'lines.account', 'lines.transactionLine.subtype'])
            ->where('company_id', $co->id)
            ->whereDate('entry_date', '>=', $start->toDateString())
            ->whereDate('entry_date', '<=', $end->toDateString())
            ->orderBy('entry_date')
            ->orderBy('created_at')
            ->get();

        $rows = [];

        foreach ($entries as $entry) {
            $ref = $entry->document?->ref_number ?? $entry->adjustingEntry?->ref_number;

            foreach ($entry->lines as $line) {
                $account = $line->account;
                $rows[]  = [
                    'date'        => $entry->entry_date?->toDateString(),
                    'description' => $line->transactionLine?->description ?? $line->description ?? $entry->description,
                    'ref'         => $ref,
                    'accountCode' => $account?->code,
                    'accountName' => $account?->name,
                    'subtype'     => $line->transactionLine?->subtype?->name,
                    'debit'       => $line->debit,
                    'credit'      => $line->credit,
                ];
            }
        }

        return $rows;
    }
}
