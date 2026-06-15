<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\CreateClientRequest;
use App\Mail\ClientInviteMail;
use App\Models\AccountantAssignmentLog;
use App\Models\Company;
use App\Models\Document;
use App\Models\JournalEntry;
use App\Models\Payment;
use App\Models\User;
use App\Services\Accounting\ChartOfAccountsService;
use App\Services\Auth\InviteTokenService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Str;

class ClientController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = Company::with(['accountant', 'users' => fn ($q) => $q->where('role', 'client')])
            ->orderByDesc('created_at');

        if ($request->filled('search')) {
            $query->where('name', 'ilike', '%' . $request->search . '%');
        }
        if ($request->filled('status')) {
            $query->whereHas('users', fn ($q) => $q->where('role', 'client')->where('status', $request->status));
        }
        if ($request->filled('accountantId')) {
            $query->where('accountant_id', $request->accountantId);
        }
        if ($request->filled('birType')) {
            $query->where('bir_type', $request->birType);
        }

        $paginated = $query->paginate(20);

        return response()->json([
            'data'       => $paginated->map(fn ($c) => $this->toListItem($c)),
            'pagination' => [
                'currentPage' => $paginated->currentPage(),
                'perPage'     => $paginated->perPage(),
                'total'       => $paginated->total(),
            ],
        ]);
    }

    public function store(CreateClientRequest $request): JsonResponse
    {
        $username = Str::lower(preg_replace('/[^a-zA-Z0-9]/', '', $request->businessName));

        if (User::where('username', $username)->exists()) {
            $username .= substr($request->mobile, -3);
        }
        if (User::where('username', $username)->exists()) {
            $username .= Str::padLeft((string) rand(0, 999), 3, '0');
        }

        [$company, $user, $inviteLink] = DB::transaction(function () use ($request, $username) {
            $company = Company::create([
                'name'           => $request->businessName,
                'mobile'         => $request->mobile,
                'email'          => $request->email,
                'tin'            => $request->tin,
                'contact_person' => $request->contactPerson,
                'bir_type'       => $request->birType,
                'plan'           => $request->planType,
                'accountant_id'  => $request->accountantId,
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
        $company = Company::with(['accountant', 'users' => fn ($q) => $q->where('role', 'client')])->find($id);

        if (!$company) {
            $clientUser = User::where('id', $id)->where('role', 'client')->first();
            if ($clientUser) {
                $company = Company::with(['accountant', 'users' => fn ($q) => $q->where('role', 'client')])->find($clientUser->company_id);
            }
        }

        if (!$company) {
            return response()->json(['message' => 'Not found.'], 404);
        }

        $client  = $company->users->first();

        $lastPayment = Payment::where('company_id', $company->id)->latest('date_received')->first();

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
            'accountantName' => $company->accountant?->name,
            'clientId'       => $client?->id,
            'clientStatus'   => $client ? strtoupper($client->status) : null,
            'username'       => $client?->username,
            'lastPayment'    => $lastPayment ? [
                'amount'          => $lastPayment->amount,
                'dateReceived'    => $lastPayment->date_received?->toDateString(),
                'referenceNumber' => $lastPayment->reference_number,
            ] : null,
            'createdAt'      => $company->created_at?->toIso8601String(),
        ]);
    }

    public function update(Request $request, string $id): JsonResponse
    {
        $company = Company::findOrFail($id);
        $client  = $company->users()->where('role', 'client')->first();

        $company->update(array_filter([
            'name'           => $request->businessName,
            'mobile'         => $request->mobile,
            'email'          => $request->email,
            'tin'            => $request->tin,
            'contact_person' => $request->contactPerson,
        ], fn ($v) => !is_null($v)));

        if ($client && $request->filled('email')) {
            $client->update(['email' => $request->email]);
        }

        return response()->json(['message' => 'Updated.']);
    }

    public function updatePlan(Request $request, string $id): JsonResponse
    {
        $company          = Company::findOrFail($id);
        $hasJournalEntries = JournalEntry::where('company_id', $id)->exists();

        $company->update([
            'plan'     => $request->planType,
            'bir_type' => $request->birType,
        ]);

        if ($hasJournalEntries) {
            return response()->json([
                'success' => true,
                'warning' => 'Existing entries retain their original VAT treatment. Only future transactions will use the new type.',
            ]);
        }

        return response()->json(['success' => true]);
    }

    public function suspend(string $id): JsonResponse
    {
        $company = Company::findOrFail($id);
        $user    = $company->users()->where('role', 'client')->firstOrFail();
        $user->tokens()->delete();
        $user->update(['status' => 'suspended']);

        return response()->json(['message' => 'Client suspended.']);
    }

    public function reactivate(string $id): JsonResponse
    {
        $company = Company::findOrFail($id);
        $user    = $company->users()->where('role', 'client')->firstOrFail();
        $user->update(['status' => 'active']);

        return response()->json(['message' => 'Client reactivated.']);
    }

    public function deactivate(string $id): JsonResponse
    {
        $company = Company::findOrFail($id);
        $user    = $company->users()->where('role', 'client')->firstOrFail();
        $user->tokens()->delete();
        $user->update(['status' => 'inactive']);

        return response()->json(['message' => 'Client deactivated.']);
    }

    public function markOverdue(string $id): JsonResponse
    {
        $company = Company::findOrFail($id);
        $user    = $company->users()->where('role', 'client')->firstOrFail();
        $user->update(['status' => 'overdue']);

        return response()->json(['message' => 'Client marked as overdue.']);
    }

    public function resetAccess(string $id): JsonResponse
    {
        $company    = Company::findOrFail($id);
        $authUser   = auth()->user();
        if ($authUser->role === 'accountant' && $company->accountant_id !== $authUser->id) {
            return response()->json(['message' => 'Forbidden.'], 403);
        }
        $user       = $company->users()->where('role', 'client')->firstOrFail();
        $rawToken   = (new InviteTokenService())->generate($user);
        $inviteLink = config('app.frontend_url') . '/setup?token=' . $rawToken;

        $emailSent = false;
        if ($user->email) {
            try {
                Mail::to($user->email)->send(new ClientInviteMail($inviteLink));
                $emailSent = true;
            } catch (\Throwable $e) {
                Log::error('ClientInviteMail (reset) failed: ' . $e->getMessage());
            }
        }

        return response()->json(['inviteLink' => $inviteLink, 'emailSent' => $emailSent]);
    }

    public function reassignAccountant(Request $request, string $id): JsonResponse
    {
        $company = Company::findOrFail($id);
        $old     = $company->accountant_id;

        DB::transaction(function () use ($company, $old, $request, $id) {
            $company->update(['accountant_id' => $request->accountantId]);

            AccountantAssignmentLog::create([
                'company_id'             => $id,
                'previous_accountant_id' => $old,
                'new_accountant_id'      => $request->accountantId,
                'changed_by'             => auth()->id(),
                'changed_at'             => now(),
                'accountant_id'          => $request->accountantId,
                'assigned_by'            => auth()->id(),
                'assigned_at'            => now(),
            ]);
        });

        return response()->json(['message' => 'Accountant reassigned.']);
    }

    public function getDocuments(Request $request, string $id): JsonResponse
    {
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
        $paginated = $query->latest()->paginate($perPage, ['*'], 'page', $page);

        return response()->json([
            'data'         => $paginated->getCollection()->map(fn ($d) => [
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
                'createdAt'       => $d->created_at?->toIso8601String(),
                'updatedAt'       => $d->updated_at?->toIso8601String(),
            ]),
            'total'        => $paginated->total(),
            'perPage'      => $perPage,
            'currentPage'  => $paginated->currentPage(),
            'lastPage'     => $paginated->lastPage(),
            'inReview'     => $inReview,
            'totalInflow'  => 0,
            'totalOutflow' => 0,
        ]);
    }

    private function toListItem(Company $c): array
    {
        $client = $c->users->first();
        return [
            'id'             => $c->id,
            'name'           => $c->name,
            'mobile'         => $c->mobile,
            'email'          => $c->email,
            'tin'            => $c->tin,
            'contactPerson'  => $c->contact_person,
            'birType'        => $c->bir_type,
            'plan'           => $c->plan,
            'accountantId'   => $c->accountant_id,
            'accountantName' => $c->accountant?->name,
            'clientId'       => $client?->id,
            'clientStatus'   => $client ? strtoupper($client->status) : null,
            'username'       => $client?->username,
            'lastPayment'    => null,
            'createdAt'      => $c->created_at?->toIso8601String(),
        ];
    }
}
