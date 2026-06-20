<?php

namespace App\Services\BIR;

use App\Models\Company;
use App\Models\JournalEntry;
use Illuminate\Support\Carbon;

class AlphaListService
{
    private const EWT_CODES = ['2210', '2211', '2212', '2213', '2214', '2215'];

    public function getData(Company $co, Carbon $start, Carbon $end): array
    {
        $entries = JournalEntry::with([
                'lines.account.chartOfAccount',
                'document.merchant',
            ])
            ->where('company_id', $co->id)
            ->whereDate('entry_date', '>=', $start->toDateString())
            ->whereDate('entry_date', '<=', $end->toDateString())
            ->get();

        $grouped = [];

        foreach ($entries as $entry) {
            $doc      = $entry->document;
            $merchant = $doc?->merchant;

            foreach ($entry->lines as $line) {
                $account = $line->account;
                if (!$account || !in_array($account->code, self::EWT_CODES)) continue;
                if (!$line->credit || (float) $line->credit <= 0) continue;

                $coa      = $account->chartOfAccount;
                $groupKey = ($merchant?->id ?? 'no-merchant-' . ($doc?->id ?? 'x')) . '|' . $account->id;

                if (!isset($grouped[$groupKey])) {
                    $grouped[$groupKey] = [
                        'tin'            => $merchant?->tin ?? '',
                        'payeeName'      => $merchant?->name ?? $doc?->merchant_name ?? '',
                        'address'        => $merchant?->address ?? '',
                        'atcCode'        => $coa?->atc_code ?? '',
                        'natureOfIncome' => $account->name,
                        'ewtAmount'      => 0.0,
                        'rate'           => (float) ($coa?->ewt_rate ?? 0),
                    ];
                }

                $grouped[$groupKey]['ewtAmount'] += (float) $line->credit;
            }
        }

        $rows = [];
        foreach ($grouped as $row) {
            $rate                = $row['rate'];
            $row['grossPayment'] = $rate > 0 ? round($row['ewtAmount'] / ($rate / 100), 2) : 0.0;
            $rows[]              = $row;
        }

        usort($rows, fn ($a, $b) => [$a['payeeName'], $a['atcCode']] <=> [$b['payeeName'], $b['atcCode']]);

        return $rows;
    }
}
