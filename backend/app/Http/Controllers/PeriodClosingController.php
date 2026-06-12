<?php

namespace App\Http\Controllers;

use App\Models\Company;
use App\Services\Accounting\PeriodClosingService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class PeriodClosingController extends Controller
{
    public function __construct(private PeriodClosingService $service) {}

    /** GET /api/period-closings */
    public function index(Request $request): JsonResponse
    {
        $user  = auth()->user();
        $query = Company::query();

        if ($user->role === 'accountant') {
            $query->where('accountant_id', $user->id);
        }

        if ($request->filled('accountant_id') && $user->role === 'admin') {
            $query->where('accountant_id', $request->accountant_id);
        }

        if ($request->filled('search')) {
            $query->where('name', 'ilike', '%' . $request->search . '%');
        }

        $companies = $query->get();

        $data = $companies->map(function (Company $company) use ($request) {
            $timeline = $this->service->getTimeline($company);

            $lastClosed = collect($timeline)
                ->filter(fn($m) => $m['status'] === 'closed')
                ->last();

            $nextPeriod = collect($timeline)
                ->first(fn($m) => in_array($m['status'], ['ready', 'blocked']));

            $currentStatus = $nextPeriod['status'] ?? 'up_to_date';

            if ($request->filled('status') && $request->status !== $currentStatus) {
                return null;
            }

            return [
                'companyId'       => $company->id,
                'companyName'     => $company->name,
                'accountantId'    => $company->accountant_id,
                'accountantName'  => optional($company->accountant)->name,
                'lastClosed'      => $lastClosed ? $lastClosed['label'] : null,
                'nextPeriod'      => $nextPeriod ? $nextPeriod['label'] : null,
                'nextPeriodYear'  => $nextPeriod['year']  ?? null,
                'nextPeriodMonth' => $nextPeriod['month'] ?? null,
                'status'          => $currentStatus,
                'pendingDocs'     => $nextPeriod['pendingDocs'] ?? 0,
                'pendingAJEs'     => $nextPeriod['pendingAJEs'] ?? 0,
            ];
        })->filter()->values();

        return response()->json(['data' => $data]);
    }

    /** GET /api/period-closings/{companyId} */
    public function timeline(string $companyId): JsonResponse
    {
        $company = Company::findOrFail($companyId);
        $this->authorizeCompanyAccess($company);

        return response()->json([
            'months' => $this->service->getTimeline($company),
        ]);
    }

    /** GET /api/period-closings/{companyId}/{year}/{month}/preview */
    public function preview(string $companyId, int $year, int $month): JsonResponse
    {
        $company = Company::findOrFail($companyId);
        $this->authorizeCompanyAccess($company);

        return response()->json(
            $this->service->preview($company, $year, $month)
        );
    }

    /** POST /api/period-closings/{companyId}/{year}/{month} */
    public function store(string $companyId, int $year, int $month): JsonResponse
    {
        $company = Company::findOrFail($companyId);
        $this->authorizeCompanyAccess($company);

        try {
            $closing = $this->service->executeClose($company, $year, $month, auth()->user());
        } catch (\RuntimeException $e) {
            if (str_contains($e->getMessage(), 'already closed')) {
                return response()->json(['message' => $e->getMessage()], 409);
            }
            return response()->json(['message' => $e->getMessage()], 422);
        }

        return response()->json([
            'id'          => $closing->id,
            'periodYear'  => $closing->period_year,
            'periodMonth' => $closing->period_month,
            'closedAt'    => $closing->closed_at,
            'closedBy'    => auth()->user()->name,
        ], 201);
    }

    private function authorizeCompanyAccess(Company $company): void
    {
        $user = auth()->user();
        if ($user->role === 'accountant' && $company->accountant_id !== $user->id) {
            abort(403, 'You are not assigned to this client.');
        }
    }
}
