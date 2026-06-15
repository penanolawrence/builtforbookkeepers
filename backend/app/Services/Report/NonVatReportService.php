<?php

namespace App\Services\Report;

use App\Models\Company;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;

class NonVatReportService
{
    private const RATE = 0.03;

    public function quarterly(Company $company, int $quarter, int $year): array
    {
        $startMonth = ($quarter - 1) * 3 + 1;
        $months     = [];

        for ($m = $startMonth; $m < $startMonth + 3; $m++) {
            $start = Carbon::create($year, $m, 1)->startOfDay();
            $end   = $start->copy()->endOfMonth()->endOfDay();

            $gross = (float) DB::table('documents')
                ->where('company_id', $company->id)
                ->whereIn('status', ['posted', 'approved'])
                ->where('document_type', 'income')
                ->whereBetween('document_date', [$start->toDateString(), $end->toDateString()])
                ->sum('amount');

            $months[] = [
                'month'          => $m,
                'label'          => $start->format('F Y'),
                'gross_receipts' => $gross,
                'percentage_tax' => round($gross * self::RATE, 2),
            ];
        }

        $col = collect($months);

        return [
            'quarter' => $quarter,
            'year'    => $year,
            'months'  => $months,
            'totals'  => [
                'gross_receipts' => $col->sum('gross_receipts'),
                'percentage_tax' => round($col->sum('percentage_tax'), 2),
            ],
        ];
    }
}
