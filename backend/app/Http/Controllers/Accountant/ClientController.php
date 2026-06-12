<?php

namespace App\Http\Controllers\Accountant;

use App\Http\Controllers\Controller;
use App\Http\Requests\Accountant\CreateClientRequest;
use App\Mail\ClientInviteMail;
use App\Models\AdjustingEntry;
use App\Models\Company;
use App\Models\Document;
use App\Models\Payment;
use App\Models\User;
use App\Services\Accounting\ChartOfAccountsService;
use App\Services\Auth\InviteTokenService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Database\UniqueConstraintViolationException;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Str;

class ClientController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $user    = auth()->user();
        $search  = $request->get('search', '');
        $perPage = $request->filled('per_page') ? min(100, max(1, (int) $request->get('per_page'))) : 15;
        $page    = max(1, (int) $request->get('page', 1));

        $baseQuery = Company::where('accountant_id', $user->id)
            ->when($search !== '', fn ($q) => $q->whereRaw('LOWER(name) LIKE ?', [strtolower("%{$search}%")]));

        // ── Summary (all matching companies, not just this page) ─────────────
        $allIds = (clone $baseQuery)->pluck('id');

        $parkedAll = Document::whereIn('company_id', $allIds)
            ->where('status', 'parked')
            ->selectRaw('company_id, flag, COUNT(*) as cnt')
            ->groupBy('company_id', 'flag')
            ->get()
            ->groupBy('company_id');

        $needAttention = $allIds->filter(fn ($id) =>
            ($parkedAll[$id] ?? collect())->where('flag', 'RED')->sum('cnt') > 0
        )->count();

        $pendingReview = $allIds->sum(fn ($id) =>
            ($parkedAll[$id] ?? collect())->whereIn('flag', ['RED', 'YELLOW'])->sum('cnt')
        );

        $allClear = $allIds->filter(function ($id) use ($parkedAll) {
            $counts = $parkedAll[$id] ?? collect();
            return $counts->where('flag', 'RED')->sum('cnt') === 0
                && $counts->where('flag', 'YELLOW')->sum('cnt') === 0
                && $counts->where('flag', 'GREEN')->sum('cnt') > 0;
        })->count();

        // ── Paginated fetch ───────────────────────────────────────────────────
        $paginated = (clone $baseQuery)
            ->with(['users' => fn ($q) => $q->where('role', 'client')])
            ->latest('id')
            ->paginate($perPage, ['*'], 'page', $page);

        // ── Per-page queue counts (one query for the current page) ────────────
        $pageIds = $paginated->getCollection()->pluck('id');

        $parkedPage = Document::whereIn('company_id', $pageIds)
            ->where('status', 'parked')
            ->selectRaw('company_id, flag, COUNT(*) as cnt')
            ->groupBy('company_id', 'flag')
            ->get()
            ->groupBy('company_id');

        $lastPayments = Payment::whereIn('company_id', $pageIds)
            ->latest('date_received')
            ->get()
            ->groupBy('company_id');

        $data = $paginated->getCollection()->map(function ($company) use ($user, $parkedPage, $lastPayments) {
            $client      = $company->users->first();
            $lastPayment = ($lastPayments[$company->id] ?? collect())->first();
            $counts      = $parkedPage[$company->id] ?? collect();

            return [
                'id'             => $company->id,
                'name'           => $company->name,
                'mobile'         => $company->mobile,
                'email'          => $company->email,
                'tin'            => $company->tin,
                'contactPerson'  => $company->contact_person,
                'birType'        => $company->bir_type,
                'plan'           => $company->plan,
                'accountantId'   => $company->accountant_id,
                'accountantName' => $user->name,
                'clientId'       => $client?->id,
                'clientStatus'   => $client ? strtoupper($client->status) : null,
                'username'       => $client?->username,
                'lastPayment'    => $lastPayment ? [
                    'amount'          => $lastPayment->amount,
                    'dateReceived'    => $lastPayment->date_received?->toDateString(),
                    'referenceNumber' => $lastPayment->reference_number,
                ] : null,
                'queueCounts'    => [
                    'red'    => (int) $counts->where('flag', 'RED')->sum('cnt'),
                    'yellow' => (int) $counts->where('flag', 'YELLOW')->sum('cnt'),
                    'green'  => (int) $counts->where('flag', 'GREEN')->sum('cnt'),
                ],
            ];
        });

        return response()->json([
            'data'        => $data,
            'total'       => $paginated->total(),
            'perPage'     => $perPage,
            'currentPage' => $paginated->currentPage(),
            'lastPage'    => $paginated->lastPage(),
            'summary'     => [
                'needAttention' => $needAttention,
                'pendingReview' => (int) $pendingReview,
                'allClear'      => $allClear,
            ],
        ]);
    }

    public function store(CreateClientRequest $request): JsonResponse
    {
        $accountant = auth()->user();

        $base = Str::lower(preg_replace('/[^a-zA-Z0-9]/', '', $request->businessName));

        try {
            [$company, $user, $inviteLink] = DB::transaction(function () use ($request, $base, $accountant) {
                $username = $base;
                if (User::where('username', $username)->exists()) {
                    $username .= substr($request->mobile, -3);
                }
                if (User::where('username', $username)->exists()) {
                    $username .= Str::padLeft((string) rand(0, 999), 3, '0');
                }

                $company = Company::create([
                    'name'           => $request->businessName,
                    'mobile'         => $request->mobile,
                    'email'          => $request->email,
                    'tin'            => $request->tin,
                    'contact_person' => $request->contactPerson,
                    'bir_type'       => $request->birType,
                    'plan'           => $request->planType,
                    'accountant_id'  => $accountant->id,
                ]);

                $user = User::create([
                    'name'       => $request->businessName,
                    'email'      => $request->email,
                    'mobile'     => $request->mobile,
                    'username'   => $username,
                    'password'   => bcrypt(Str::random(32)),
                    'role'       => 'client',
                    'status'     => 'active',
                    'company_id' => $company->id,
                ]);

                (new ChartOfAccountsService())->seedDefaultAccounts($company);

                $rawToken   = (new InviteTokenService())->generate($user);
                $inviteLink = config('app.frontend_url') . '/setup?token=' . $rawToken;

                return [$company, $user, $inviteLink];
            });
        } catch (UniqueConstraintViolationException) {
            return response()->json(['message' => 'A client with a similar name already exists. Please try a more specific business name.'], 422);
        }

        if ($request->email) {
            try {
                Mail::to($request->email)->send(new ClientInviteMail($inviteLink));
            } catch (\Throwable $e) {
                Log::error('ClientInviteMail failed: ' . $e->getMessage());
            }
        }

        return response()->json([
            'companyId'  => $company->id,
            'inviteLink' => $inviteLink,
            'username'   => $user->username,
        ], 201);
    }

    public function show(string $id): JsonResponse
    {
        $user    = auth()->user();
        $company = Company::with(['users' => fn ($q) => $q->where('role', 'client')])
            ->findOrFail($id);

        if ($company->accountant_id !== $user->id) {
            return response()->json(['message' => 'Forbidden.'], 403);
        }

        $client      = $company->users->first();
        $lastPayment = Payment::where('company_id', $id)->latest('date_received')->first();

        $parkedDocs = Document::where('company_id', $id)
            ->where('status', 'parked')
            ->selectRaw("flag, COUNT(*) as cnt")
            ->groupBy('flag')
            ->pluck('cnt', 'flag');

        $pendingEntries = AdjustingEntry::where('company_id', $id)
            ->where('status', 'pending')
            ->count();

        $draftEntries = AdjustingEntry::where('company_id', $id)
            ->where('status', 'draft')
            ->count();

        return response()->json([
            'id'             => $company->id,
            'name'           => $company->name,
            'mobile'         => $company->mobile,
            'email'          => $company->email,
            'tin'            => $company->tin,
            'contactPerson'  => $company->contact_person,
            'birType'        => $company->bir_type,
            'plan'           => $company->plan,
            'accountantId'   => $company->accountant_id,
            'accountantName' => $user->name,
            'clientId'       => $client?->id,
            'clientStatus'   => $client?->status,
            'username'       => $client?->username,
            'lastPayment'    => $lastPayment ? [
                'amount'          => $lastPayment->amount,
                'dateReceived'    => $lastPayment->date_received?->toDateString(),
                'referenceNumber' => $lastPayment->reference_number,
            ] : null,
            'queueCounts'    => [
                'red'    => (int) ($parkedDocs['RED'] ?? 0),
                'yellow' => (int) ($parkedDocs['YELLOW'] ?? 0),
                'green'  => (int) ($parkedDocs['GREEN'] ?? 0),
            ],
            'pendingEntries' => $pendingEntries,
            'draftEntries'   => $draftEntries,
        ]);
    }

    public function getDocuments(Request $request, string $id): JsonResponse
    {
        $user    = auth()->user();
        $company = Company::findOrFail($id);

        if ($company->accountant_id !== $user->id) {
            return response()->json(['message' => 'Forbidden.'], 403);
        }

        $query = Document::where('company_id', $id);

        if ($request->filled('status')) {
            $query->where('status', strtolower($request->status));
        }
        if ($request->filled('type')) {
            $query->where('document_type', $request->type);
        }
        if ($request->filled('start') || $request->filled('end')) {
            $start = $request->input('start');
            $end   = $request->input('end');
            $query->where(function ($q) use ($start, $end) {
                $q->whereNull('document_date');
                $q->orWhere(function ($d) use ($start, $end) {
                    if ($start) $d->whereDate('document_date', '>=', $start);
                    if ($end)   $d->whereDate('document_date', '<=', $end);
                });
            });
        }

        $perPage  = min(500, max(1, (int) $request->get('per_page', 10)));
        $page     = max(1, (int) $request->get('page', 1));
        $inReview = (clone $query)->whereIn('status', ['parked', 'returned'])->count();
        $paginated = $query->with('transactionLines')->latest()->paginate($perPage, ['*'], 'page', $page);

        $toItem = fn ($d) => [
            'id'              => $d->id,
            'companyId'       => $d->company_id,
            'declaredType'    => $d->document_type,
            'status'          => strtoupper($d->status),
            'flag'            => $d->flag,
            'anomalyReasons'  => $d->anomaly_reason ?? [],
            'merchantName'    => $d->merchant_name,
            'date'            => $d->document_date?->toDateString(),
            'amount'          => $d->amount,
            'vatAmount'       => $d->vat_amount,
            'category'        => $d->category,
            'paymentMethod'   => $d->payment_method,
            'imageUrl'        => null,
            'isNoReceipt'     => $d->is_no_receipt,
            'isOcrFailed'     => $d->is_ocr_failed,
            'returnNote'      => $d->return_note,
            'rejectionReason' => $d->rejection_reason,
            'expiresAt'       => $d->expires_at?->toIso8601String(),
            'refNumber'       => $d->ref_number,
            'inflow'          => (float) $d->transactionLines->where('type', 'income')->sum('amount'),
            'outflow'         => (float) $d->transactionLines->where('type', 'expense')->sum('amount'),
            'createdAt'       => $d->created_at?->toIso8601String(),
            'updatedAt'       => $d->updated_at?->toIso8601String(),
        ];

        return response()->json([
            'data'         => $paginated->getCollection()->map($toItem),
            'total'        => $paginated->total(),
            'perPage'      => $perPage,
            'currentPage'  => $paginated->currentPage(),
            'lastPage'     => $paginated->lastPage(),
            'inReview'     => $inReview,
            'totalInflow'  => 0,
            'totalOutflow' => 0,
        ]);
    }
}
