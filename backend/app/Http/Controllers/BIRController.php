<?php

namespace App\Http\Controllers;

use App\Models\Account;
use App\Models\Company;
use App\Services\BIR\CDBService;
use App\Services\BIR\CRBService;
use App\Services\BIR\GJService;
use App\Services\BIR\GLService;
use App\Services\Report\PDFExportService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;

class BIRController extends Controller
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

    public function getBook(Request $request, string $book): JsonResponse
    {
        $company       = $this->resolveCompany($request);
        [$start, $end] = $this->parseDates($request);
        $isVat         = $company->bir_type === 'vat';

        switch ($book) {
            case 'crb':
                $rows = (new CRBService())->getData($company, $start, $end);
                if (!$isVat) {
                    $rows = array_map(function ($row) {
                        $row['vatAmount'] = null;
                        $row['netOfVat']  = null;
                        return $row;
                    }, $rows);
                }
                break;

            case 'cdb':
                $rows = (new CDBService())->getData($company, $start, $end);
                if (!$isVat) {
                    $rows = array_map(function ($row) {
                        $row['vatAmount'] = null;
                        $row['netOfVat']  = null;
                        return $row;
                    }, $rows);
                }
                break;

            case 'gj':
                $rows = (new GJService())->getData($company, $start, $end);
                break;

            case 'gl':
                if (!$request->filled('accountId')) {
                    return response()->json(['message' => 'accountId is required for GL.'], 422);
                }
                $account = $company->accounts()->findOrFail($request->accountId);
                return response()->json((new GLService())->getData($company, $account, $start, $end));

            default:
                return response()->json(['message' => 'Invalid book.'], 422);
        }

        return response()->json(['rows' => $rows, 'isVat' => $isVat]);
    }

    public function exportPDF(Request $request, string $book)
    {
        $company       = $this->resolveCompany($request);
        [$start, $end] = $this->parseDates($request);
        $isVat         = $company->bir_type === 'vat';

        switch ($book) {
            case 'crb':
                $rows = (new CRBService())->getData($company, $start, $end);
                break;
            case 'cdb':
                $rows = (new CDBService())->getData($company, $start, $end);
                break;
            case 'gj':
                $rows = (new GJService())->getData($company, $start, $end);
                break;
            case 'gl':
                if (!$request->filled('accountId')) {
                    abort(422, 'accountId is required for GL.');
                }
                $account = $company->accounts()->findOrFail($request->accountId);
                $rows    = (new GLService())->getData($company, $account, $start, $end);
                break;
            default:
                abort(422, 'Invalid book.');
        }

        $view     = "pdf.bir-{$book}";
        $filename = "{$company->name}-{$book}-{$start->toDateString()}-{$end->toDateString()}";

        return (new PDFExportService())->exportReport(
            $view,
            [
                'rows'    => $rows,
                'company' => $company,
                'isVat'   => $isVat,
                'start'   => $start->toDateString(),
                'end'     => $end->toDateString(),
            ],
            $filename
        );
    }
}
