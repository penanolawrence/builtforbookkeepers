<?php

namespace App\Http\Controllers;

use App\Models\Company;
use App\Services\Report\PDFExportService;
use App\Services\Report\VatReportService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;

class VatReportController extends Controller
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

    private function guardVat(Company $company): void
    {
        if ($company->bir_type !== 'vat') {
            abort(422, 'This client is not VAT-registered.');
        }
    }

    private function pdf(string $view, array $data, string $filename): Response
    {
        return (new PDFExportService())->exportReport($view, $data, $filename);
    }

    public function monthly2550mPdf(Request $request): Response
    {
        $company = $this->resolveCompany($request);
        $this->guardVat($company);

        $month = (int) $request->input('month', now()->month);
        $year  = (int) $request->input('year',  now()->year);
        $data  = (new VatReportService())->monthly($company, $month, $year);

        return $this->pdf(
            'reports.vat.2550m',
            array_merge($data, ['company' => $company]),
            "{$company->name}-2550m-{$year}-{$month}"
        );
    }

    public function quarterly2550qPdf(Request $request): Response
    {
        $company = $this->resolveCompany($request);
        $this->guardVat($company);

        $quarter = (int) $request->input('quarter', (int) ceil(now()->month / 3));
        $year    = (int) $request->input('year', now()->year);
        $data    = (new VatReportService())->quarterly($company, $quarter, $year);

        return $this->pdf(
            'reports.vat.2550q',
            array_merge($data, ['company' => $company]),
            "{$company->name}-2550q-{$year}-Q{$quarter}"
        );
    }

    public function slsPdf(Request $request): Response
    {
        $company = $this->resolveCompany($request);
        $this->guardVat($company);

        $quarter = (int) $request->input('quarter', (int) ceil(now()->month / 3));
        $year    = (int) $request->input('year', now()->year);
        $data    = (new VatReportService())->salesList($company, $quarter, $year);

        return $this->pdf(
            'reports.vat.sls',
            array_merge($data, ['company' => $company]),
            "{$company->name}-sls-{$year}-Q{$quarter}"
        );
    }

    public function slpPdf(Request $request): Response
    {
        $company = $this->resolveCompany($request);
        $this->guardVat($company);

        $quarter = (int) $request->input('quarter', (int) ceil(now()->month / 3));
        $year    = (int) $request->input('year', now()->year);
        $data    = (new VatReportService())->purchasesList($company, $quarter, $year);

        return $this->pdf(
            'reports.vat.slp',
            array_merge($data, ['company' => $company]),
            "{$company->name}-slp-{$year}-Q{$quarter}"
        );
    }

    public function monthly2550m(Request $request): JsonResponse
    {
        $company = $this->resolveCompany($request);
        $this->guardVat($company);

        $month = (int) $request->input('month', now()->month);
        $year  = (int) $request->input('year',  now()->year);
        $data  = (new VatReportService())->monthly($company, $month, $year);

        return response()->json(array_merge($data, [
            'company' => [
                'name'    => $company->name,
                'tin'     => $company->tin ?? null,
                'address' => $company->address ?? null,
            ],
        ]));
    }

    public function quarterly2550q(Request $request): JsonResponse
    {
        $company = $this->resolveCompany($request);
        $this->guardVat($company);

        $quarter = (int) $request->input('quarter', (int) ceil(now()->month / 3));
        $year    = (int) $request->input('year', now()->year);
        $data    = (new VatReportService())->quarterly($company, $quarter, $year);

        return response()->json(array_merge($data, [
            'company' => [
                'name'    => $company->name,
                'tin'     => $company->tin ?? null,
                'address' => $company->address ?? null,
            ],
        ]));
    }

    public function salesList(Request $request): JsonResponse
    {
        $company = $this->resolveCompany($request);
        $this->guardVat($company);

        $quarter = (int) $request->input('quarter', (int) ceil(now()->month / 3));
        $year    = (int) $request->input('year', now()->year);
        $data    = (new VatReportService())->salesList($company, $quarter, $year);

        return response()->json(array_merge($data, [
            'company' => [
                'name'    => $company->name,
                'tin'     => $company->tin ?? null,
                'address' => $company->address ?? null,
            ],
        ]));
    }

    public function purchasesList(Request $request): JsonResponse
    {
        $company = $this->resolveCompany($request);
        $this->guardVat($company);

        $quarter = (int) $request->input('quarter', (int) ceil(now()->month / 3));
        $year    = (int) $request->input('year', now()->year);
        $data    = (new VatReportService())->purchasesList($company, $quarter, $year);

        return response()->json(array_merge($data, [
            'company' => [
                'name'    => $company->name,
                'tin'     => $company->tin ?? null,
                'address' => $company->address ?? null,
            ],
        ]));
    }
}
