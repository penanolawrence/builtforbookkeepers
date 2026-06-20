<?php

namespace App\Http\Controllers;

use App\Models\Company;
use App\Services\BIR\AlphaListService;
use App\Services\Report\PDFExportService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Symfony\Component\HttpFoundation\StreamedResponse;

class AlphaListController extends Controller
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
            : Carbon::now()->startOfYear();

        $end = $request->filled('end')
            ? Carbon::parse($request->end)->endOfDay()
            : Carbon::now()->endOfYear();

        return [$start, $end];
    }

    public function index(Request $request): JsonResponse
    {
        $company       = $this->resolveCompany($request);
        [$start, $end] = $this->parseDates($request);
        $rows          = (new AlphaListService())->getData($company, $start, $end);

        return response()->json([
            'rows'   => $rows,
            'period' => ['start' => $start->toDateString(), 'end' => $end->toDateString()],
        ]);
    }

    public function exportCsv(Request $request): StreamedResponse
    {
        $company       = $this->resolveCompany($request);
        [$start, $end] = $this->parseDates($request);
        $rows          = (new AlphaListService())->getData($company, $start, $end);
        $filename      = "alpha-list-1604e-{$start->toDateString()}-{$end->toDateString()}.csv";

        return response()->streamDownload(function () use ($rows) {
            $handle = fopen('php://output', 'w');
            fwrite($handle, "\xEF\xBB\xBF"); // UTF-8 BOM for Excel
            fputcsv($handle, ['#', 'TIN', 'Payee Name', 'Address', 'ATC', 'Nature of Income', 'Gross Payment', 'Rate (%)', 'EWT Withheld']);
            foreach ($rows as $i => $row) {
                fputcsv($handle, [
                    $i + 1,
                    $row['tin'],
                    $row['payeeName'],
                    $row['address'],
                    $row['atcCode'],
                    $row['natureOfIncome'],
                    $row['grossPayment'],
                    $row['rate'],
                    $row['ewtAmount'],
                ]);
            }
            fclose($handle);
        }, $filename, ['Content-Type' => 'text/csv; charset=UTF-8']);
    }

    public function exportPdf(Request $request)
    {
        $company       = $this->resolveCompany($request);
        [$start, $end] = $this->parseDates($request);
        $rows          = (new AlphaListService())->getData($company, $start, $end);
        $filename      = "alpha-list-1604e-{$start->toDateString()}-{$end->toDateString()}";

        return (new PDFExportService())->exportReport(
            'pdf.alpha-list',
            [
                'rows'    => $rows,
                'company' => $company,
                'start'   => $start->toDateString(),
                'end'     => $end->toDateString(),
            ],
            $filename
        );
    }
}
