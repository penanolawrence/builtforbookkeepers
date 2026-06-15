<?php

namespace App\Http\Controllers;

use App\Models\Company;
use App\Services\Report\NonVatReportService;
use App\Services\Report\PDFExportService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;

class NonVatReportController extends Controller
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

    private function guardNonVat(Company $company): void
    {
        if ($company->bir_type !== 'non_vat') {
            abort(422, 'This client is not a non-VAT registrant.');
        }
    }

    private function pdf(string $view, array $data, string $filename): Response
    {
        return (new PDFExportService())->exportReport($view, $data, $filename);
    }

    private function companyData(Company $company): array
    {
        return [
            'name'    => $company->name,
            'tin'     => $company->tin ?? null,
            'address' => $company->address ?? null,
        ];
    }

    public function quarterly2551q(Request $request): JsonResponse
    {
        $company = $this->resolveCompany($request);
        $this->guardNonVat($company);

        $quarter = (int) $request->input('quarter', (int) ceil(now()->month / 3));
        $year    = (int) $request->input('year', now()->year);
        $data    = (new NonVatReportService())->quarterly($company, $quarter, $year);

        return response()->json(array_merge($data, ['company' => $this->companyData($company)]));
    }

    public function quarterly2551qPdf(Request $request): Response
    {
        $company = $this->resolveCompany($request);
        $this->guardNonVat($company);

        $quarter  = (int) $request->input('quarter', (int) ceil(now()->month / 3));
        $year     = (int) $request->input('year', now()->year);
        $data     = (new NonVatReportService())->quarterly($company, $quarter, $year);
        $filename = "{$company->name}-2551q-{$year}-Q{$quarter}";

        return $this->pdf(
            'reports.non-vat.2551q',
            array_merge($data, ['company' => $company]),
            $filename
        );
    }
}
