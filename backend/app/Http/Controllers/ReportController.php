<?php

namespace App\Http\Controllers;

use App\Models\Company;
use App\Services\Report\ExpenseBreakdownService;
use App\Services\Report\IncomeStatementService;
use App\Services\Report\PDFExportService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;

class ReportController extends Controller
{
    private function resolveCompany(Request $request): Company
    {
        $user = auth()->user();

        if ($user->role === 'client') {
            return Company::findOrFail($user->company_id);
        }

        $company = Company::findOrFail($request->clientId);

        if ($user->role === 'accountant' && $company->accountant_id !== $user->id) {
            abort(403, 'Forbidden.');
        }

        return $company;
    }

    private function parseDates(Request $request): array
    {
        $start = $request->filled('start')
            ? Carbon::parse($request->start)->startOfDay()
            : Carbon::now()->startOfMonth();

        $end = $request->filled('end')
            ? Carbon::parse($request->end)->endOfDay()
            : Carbon::now()->endOfMonth();

        return [$start, $end];
    }

    public function incomeStatement(Request $request): JsonResponse
    {
        $company          = $this->resolveCompany($request);
        [$start, $end]    = $this->parseDates($request);
        $data             = (new IncomeStatementService())->getData($company, $start, $end);

        return response()->json($data);
    }

    public function expenseBreakdown(Request $request): JsonResponse
    {
        $company       = $this->resolveCompany($request);
        [$start, $end] = $this->parseDates($request);
        $data          = (new ExpenseBreakdownService())->getData($company, $start, $end);

        return response()->json($data);
    }

    public function exportPDF(Request $request, string $type = 'income-statement')
    {
        $company       = $this->resolveCompany($request);
        [$start, $end] = $this->parseDates($request);
        $isVat         = $company->bir_type === 'vat';

        if ($type === 'income-statement') {
            $data = (new IncomeStatementService())->getData($company, $start, $end);
        } else {
            $data = (new ExpenseBreakdownService())->getData($company, $start, $end);
        }

        $view     = 'pdf.' . $type;
        $filename = "{$company->name}-{$type}-{$start->toDateString()}-{$end->toDateString()}";

        return (new PDFExportService())->exportReport(
            $view,
            array_merge($data, [
                'company' => $company,
                'isVat'   => $isVat,
                'start'   => $start->toDateString(),
                'end'     => $end->toDateString(),
            ]),
            $filename
        );
    }
}
