<?php

namespace App\Services\Accounting;

use App\Models\Document;
use App\Models\JournalEntryLine;
use Illuminate\Support\Carbon;

class AnomalyDetector
{
    public function detect(Document $doc): array
    {
        // Early exit: manual entries always YELLOW, no rules apply
        if ($doc->is_no_receipt) {
            return ['flag' => 'YELLOW', 'reasons' => []];
        }

        $reasons = [];
        $company = $doc->company;

        // RULE 1 — VAT Mismatch (VAT clients only)
        if (
            $company->bir_type === 'vat' &&
            $doc->vat_amount !== null &&
            $doc->amount > 0
        ) {
            $expectedVat = round($doc->amount * (12 / 112), 2);
            if (abs($doc->vat_amount - $expectedVat) > 1.00) {
                $reasons[] = 'VAT mismatch';
            }
        }

        // RULE 2 — Duplicate OR Number (same company, same period)
        if (
            $doc->ref_number !== null &&
            !str_starts_with($doc->ref_number, 'OCR-') &&
            !str_starts_with($doc->ref_number, 'MNL-')
        ) {
            $period = Carbon::parse($doc->document_date)->format('Y-m');
            $exists = Document::where('company_id', $company->id)
                ->where('id', '!=', $doc->id)
                ->where('ref_number', $doc->ref_number)
                ->whereRaw("to_char(document_date, 'YYYY-MM') = ?", [$period])
                ->where('status', '!=', 'rejected')
                ->exists();
            if ($exists) {
                $reasons[] = 'Duplicate OR number';
            }
        }

        // RULE 3 — Same Amount + Merchant within 7 Days
        if ($doc->amount !== null && $doc->merchant_name !== null) {
            $sevenDaysAgo = Carbon::parse($doc->document_date)->subDays(7);
            $duplicate = Document::where('company_id', $company->id)
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

        // RULE 4 — Line Item Total Mismatch
        if ($doc->ocrResult && $doc->ocrResult->extracted_data !== null) {
            $lineItems = $doc->ocrResult->extracted_data['line_items'] ?? [];
            if (count($lineItems) > 1) {
                $lineTotal = collect($lineItems)->sum('amount');
                if ($lineTotal > 0 && abs($lineTotal - $doc->amount) > 1.00) {
                    $reasons[] = 'Line item total does not match receipt total';
                }
            }
        }

        // RULE 5 — Amount > 3x Category Average
        if ($doc->category !== null && $doc->amount !== null) {
            $categoryAvg = JournalEntryLine::whereHas('journalEntry', function ($q) use ($company) {
                    $q->where('company_id', $company->id);
                })
                ->whereHas('account', function ($q) use ($doc) {
                    $q->where('name', $doc->category);
                })
                ->whereNotNull('debit')
                ->avg('debit');

            if ($categoryAvg > 0 && $doc->amount > ($categoryAvg * 3)) {
                $reasons[] = 'Amount exceeds 3x category average';
            }
        }

        // RULE 6 — New Vendor (after 10+ approved transactions)
        if ($doc->merchant_name !== null) {
            $totalApproved = Document::where('company_id', $company->id)
                ->where('status', 'posted')
                ->count();
            if ($totalApproved >= 10) {
                $vendorExists = Document::where('company_id', $company->id)
                    ->where('id', '!=', $doc->id)
                    ->where('merchant_name', $doc->merchant_name)
                    ->where('status', 'posted')
                    ->exists();
                if (!$vendorExists) {
                    $reasons[] = 'New vendor not seen in transaction history';
                }
            }
        }

        // RULE 7 — Spending Spike (month 2+ only)
        if ($doc->category !== null && $doc->amount !== null) {
            $txDate         = Carbon::parse($doc->document_date);
            $prevMonthStart = $txDate->copy()->subMonthNoOverflow()->startOfMonth();
            $prevMonthEnd   = $txDate->copy()->subMonthNoOverflow()->endOfMonth();

            $prevMonthTotal = JournalEntryLine::whereHas('journalEntry', function ($q)
                    use ($company, $prevMonthStart, $prevMonthEnd) {
                        $q->where('company_id', $company->id)
                          ->whereBetween('entry_date', [$prevMonthStart, $prevMonthEnd]);
                    })
                ->whereHas('account', function ($q) use ($doc) {
                    $q->where('name', $doc->category);
                })
                ->whereNotNull('debit')
                ->sum('debit');

            if ($prevMonthTotal > 0 && $doc->amount > ($prevMonthTotal * 3)) {
                $reasons[] = 'Spending spike — amount exceeds 300% of last month in this category';
            }
        }

        // RULE 8 — Past-Period Date
        $txDate            = Carbon::parse($doc->document_date);
        $currentMonthStart = Carbon::now()->startOfMonth();
        if ($txDate->lt($currentMonthStart)) {
            $reasons[] = 'Transaction date is in a past period';
        }

        // Determine final flag
        $flag = $doc->flag ?? 'GREEN';
        if (count($reasons) > 0) {
            $flag = 'RED';
        } elseif ($flag !== 'YELLOW') {
            $flag = 'GREEN';
        }

        return ['flag' => $flag, 'reasons' => $reasons];
    }
}
