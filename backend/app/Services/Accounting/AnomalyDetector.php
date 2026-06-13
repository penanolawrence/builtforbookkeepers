<?php

namespace App\Services\Accounting;

use App\Models\Document;
use App\Models\PeriodClosing;
use Illuminate\Support\Carbon;

class AnomalyDetector
{
    public function detect(Document $doc): array
    {
        if ($doc->is_no_receipt) {
            return ['flag' => 'YELLOW', 'reasons' => []];
        }

        $reasons     = [];
        $softReasons = [];
        $company     = $doc->company;

        // RULE 1 — Duplicate OR Number
        if (
            $doc->ref_number !== null &&
            !str_starts_with($doc->ref_number, 'OCR-') &&
            !str_starts_with($doc->ref_number, 'MNL-')
        ) {
            $txDate = Carbon::parse($doc->document_date);
            $exists = Document::where('company_id', $company->id)
                ->where('id', '!=', $doc->id)
                ->where('ref_number', $doc->ref_number)
                ->whereYear('document_date', $txDate->year)
                ->whereMonth('document_date', $txDate->month)
                ->where('status', '!=', 'rejected')
                ->exists();
            if ($exists) {
                $reasons[] = 'Duplicate OR number';
            }
        }

        // RULE 2 — Same Amount + Merchant within 7 Days
        if ($doc->amount !== null && $doc->merchant_name !== null) {
            $sevenDaysAgo = Carbon::parse($doc->document_date)->subDays(7);
            $duplicate    = Document::where('company_id', $company->id)
                ->where('id', '!=', $doc->id)
                ->where('amount', $doc->amount)
                ->where('merchant_name', $doc->merchant_name)
                ->whereBetween('document_date', [$sevenDaysAgo, Carbon::parse($doc->document_date)])
                ->where('status', '!=', 'rejected')
                ->exists();
            if ($duplicate) {
                $reasons[] = 'Possible duplicate — same amount and merchant within 7 days';
            }
        }

        // RULE 3 — Closed or Past-Period Date
        $docDate           = Carbon::parse($doc->document_date);
        $currentMonthStart = Carbon::now()->startOfMonth();

        if ($docDate->lt($currentMonthStart)) {
            $isClosed = PeriodClosing::where('company_id', $company->id)
                ->where('period_year', $docDate->year)
                ->where('period_month', $docDate->month)
                ->exists();

            if ($isClosed) {
                $reasons[] = 'Transaction date is in a locked period — an adjusting entry is required';
            } else {
                $softReasons[] = 'Transaction date is in a past period';
            }
        }

        if (count($reasons) > 0) {
            $flag = 'RED';
        } elseif (count($softReasons) > 0) {
            $flag = 'YELLOW';
        } else {
            $flag = 'GREEN';
        }

        return ['flag' => $flag, 'reasons' => array_merge($reasons, $softReasons)];
    }
}
