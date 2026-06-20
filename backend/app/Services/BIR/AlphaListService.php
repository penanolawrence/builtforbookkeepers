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

            // Sum non-EWT debit lines — the actual gross payment for this entry
            $entryGross = $entry->lines
                ->filter(fn($l) => !in_array($l->account?->code ?? '', self::EWT_CODES) && (float) ($l->debit ?? 0) > 0)
                ->sum(fn($l) => (float) $l->debit);

            $ewtLines = $entry->lines->filter(
                fn($l) => $l->account && in_array($l->account->code, self::EWT_CODES) && (float) ($l->credit ?? 0) > 0
            );

            $totalEwtCredit = $ewtLines->sum(fn($l) => (float) $l->credit);

            foreach ($ewtLines as $line) {
                $account  = $line->account;
                $coa      = $account->chartOfAccount;
                $payeeKey = $merchant ? $merchant->id : ('name:' . ($doc?->merchant_name ?? ''));
                $groupKey = $payeeKey . '|' . $account->id;

                if (!isset($grouped[$groupKey])) {
                    $grouped[$groupKey] = [
                        'tin'            => $merchant?->tin ?? '',
                        'payeeName'      => $merchant?->name ?? $doc?->merchant_name ?? '',
                        'address'        => $merchant?->address ?? '',
                        'atcCode'        => $coa?->atc_code ?? '',
                        'natureOfIncome' => $account->name,
                        'ewtAmount'      => 0.0,
                        'grossPayment'   => 0.0,
                        'rate'           => (float) ($coa?->ewt_rate ?? 0),
                    ];
                }

                $ewtCredit  = (float) $line->credit;
                $proportion = $totalEwtCredit > 0 ? $ewtCredit / $totalEwtCredit : 0;

                $grouped[$groupKey]['ewtAmount']    += $ewtCredit;
                $grouped[$groupKey]['grossPayment'] += $entryGross * $proportion;
            }
        }

        $rows = [];
        foreach ($grouped as $row) {
            $row['grossPayment'] = round($row['grossPayment'], 2);
            $rows[] = $row;
        }

        usort($rows, fn ($a, $b) => [$a['payeeName'], $a['atcCode']] <=> [$b['payeeName'], $b['atcCode']]);

        return $rows;
    }
}
