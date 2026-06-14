<?php

namespace App\Services\Report;

use App\Models\Company;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;

class VatReportService
{
    public function monthly(Company $company, int $month, int $year): array
    {
        $start = Carbon::create($year, $month, 1)->startOfDay();
        $end   = $start->copy()->endOfMonth()->endOfDay();

        return array_merge(
            ['month' => $month, 'year' => $year, 'period_label' => $start->format('F Y')],
            $this->buildSummary($company, $start, $end)
        );
    }

    public function quarterly(Company $company, int $quarter, int $year): array
    {
        $startMonth = ($quarter - 1) * 3 + 1;
        $months     = [];

        for ($m = $startMonth; $m < $startMonth + 3; $m++) {
            $start     = Carbon::create($year, $m, 1)->startOfDay();
            $end       = $start->copy()->endOfMonth()->endOfDay();
            $summary   = $this->buildSummary($company, $start, $end);
            $months[]  = array_merge(['month' => $m, 'label' => $start->format('F Y')], $summary);
        }

        $col = collect($months);

        return [
            'quarter' => $quarter,
            'year'    => $year,
            'months'  => $months,
            'totals'  => [
                'taxable_sales'     => $col->sum('taxable_sales'),
                'output_vat'        => $col->sum('output_vat'),
                'taxable_purchases' => $col->sum('taxable_purchases'),
                'input_vat'         => $col->sum('input_vat'),
                'net_vat_payable'   => $col->sum('net_vat_payable'),
            ],
        ];
    }

    public function salesList(Company $company, int $quarter, int $year): array
    {
        [$start, $end] = $this->quarterBounds($quarter, $year);

        $rows = DB::table('documents')
            ->leftJoin('merchants', 'merchants.id', '=', 'documents.merchant_id')
            ->where('documents.company_id', $company->id)
            ->where('documents.status', 'approved')
            ->where('documents.document_type', 'income')
            ->whereBetween('documents.document_date', [$start->toDateString(), $end->toDateString()])
            ->orderBy('documents.document_date')
            ->select([
                'documents.document_date',
                'documents.ref_number',
                'merchants.name as merchant_name',
                'merchants.tin as merchant_tin',
                'documents.amount',
                'documents.vat_amount',
            ])
            ->get()
            ->map(fn($row) => [
                'date'           => $row->document_date,
                'ref_number'     => $row->ref_number,
                'buyer_name'     => $row->merchant_name,
                'buyer_tin'      => $row->merchant_tin,
                'taxable_amount' => (float) $row->amount - (float) ($row->vat_amount ?? 0),
                'vat_amount'     => (float) ($row->vat_amount ?? 0),
                'total_amount'   => (float) $row->amount,
            ]);

        $totals = [
            'taxable_amount' => $rows->sum('taxable_amount'),
            'vat_amount'     => $rows->sum('vat_amount'),
            'total_amount'   => $rows->sum('total_amount'),
        ];

        return [
            'quarter' => $quarter,
            'year'    => $year,
            'rows'    => $rows->all(),
            'totals'  => $totals,
        ];
    }

    public function purchasesList(Company $company, int $quarter, int $year): array
    {
        [$start, $end] = $this->quarterBounds($quarter, $year);

        $rows = DB::table('documents')
            ->leftJoin('merchants', 'merchants.id', '=', 'documents.merchant_id')
            ->where('documents.company_id', $company->id)
            ->where('documents.status', 'approved')
            ->where('documents.document_type', 'expense')
            ->whereBetween('documents.document_date', [$start->toDateString(), $end->toDateString()])
            ->orderBy('documents.document_date')
            ->select([
                'documents.document_date',
                'documents.ref_number',
                'merchants.name as merchant_name',
                'merchants.tin as merchant_tin',
                'documents.amount',
                'documents.vat_amount',
            ])
            ->get()
            ->map(fn($row) => [
                'date'           => $row->document_date,
                'ref_number'     => $row->ref_number,
                'supplier_name'  => $row->merchant_name,
                'supplier_tin'   => $row->merchant_tin,
                'taxable_amount' => (float) $row->amount - (float) ($row->vat_amount ?? 0),
                'input_vat'      => (float) ($row->vat_amount ?? 0),
                'total_amount'   => (float) $row->amount,
            ]);

        $totals = [
            'taxable_amount' => $rows->sum('taxable_amount'),
            'input_vat'      => $rows->sum('input_vat'),
            'total_amount'   => $rows->sum('total_amount'),
        ];

        return [
            'quarter' => $quarter,
            'year'    => $year,
            'rows'    => $rows->all(),
            'totals'  => $totals,
        ];
    }

    private function buildSummary(Company $company, Carbon $start, Carbon $end): array
    {
        $outputVat = (float) DB::table('documents')
            ->where('company_id', $company->id)
            ->where('status', 'approved')
            ->where('document_type', 'income')
            ->whereBetween('document_date', [$start->toDateString(), $end->toDateString()])
            ->sum('vat_amount');

        $inputVat = (float) DB::table('documents')
            ->where('company_id', $company->id)
            ->where('status', 'approved')
            ->where('document_type', 'expense')
            ->whereBetween('document_date', [$start->toDateString(), $end->toDateString()])
            ->sum('vat_amount');

        $taxableSales = (float) DB::table('documents')
            ->where('company_id', $company->id)
            ->where('status', 'approved')
            ->where('document_type', 'income')
            ->whereBetween('document_date', [$start->toDateString(), $end->toDateString()])
            ->selectRaw('COALESCE(SUM(amount - COALESCE(vat_amount, 0)), 0) as total')
            ->value('total');

        $taxablePurchases = (float) DB::table('documents')
            ->where('company_id', $company->id)
            ->where('status', 'approved')
            ->where('document_type', 'expense')
            ->whereBetween('document_date', [$start->toDateString(), $end->toDateString()])
            ->selectRaw('COALESCE(SUM(amount - COALESCE(vat_amount, 0)), 0) as total')
            ->value('total');

        return [
            'taxable_sales'     => $taxableSales,
            'output_vat'        => $outputVat,
            'taxable_purchases' => $taxablePurchases,
            'input_vat'         => $inputVat,
            'net_vat_payable'   => $outputVat - $inputVat,
        ];
    }

    private function quarterBounds(int $quarter, int $year): array
    {
        $startMonth = ($quarter - 1) * 3 + 1;
        $endMonth   = $startMonth + 2;
        $start      = Carbon::create($year, $startMonth, 1)->startOfDay();
        $end        = Carbon::create($year, $endMonth, 1)->endOfMonth()->endOfDay();

        return [$start, $end];
    }
}
