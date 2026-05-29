<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\CreateAccountantRequest;
use App\Mail\ClientInviteMail;
use App\Models\AccountantAssignmentLog;
use App\Models\AdjustingEntry;
use App\Models\Company;
use App\Models\Document;
use App\Models\User;
use App\Services\Auth\InviteTokenService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Str;

class AccountantController extends Controller
{
    public function index(): JsonResponse
    {
        $accountants = User::where('role', 'accountant')->get()->map(function ($acc) {
            $clientIds = Company::where('accountant_id', $acc->id)->pluck('id');

            $redCount = Document::whereIn('company_id', $clientIds)
                ->where('status', 'parked')
                ->where('flag', 'RED')
                ->count();

            $pendingEntries = AdjustingEntry::where('created_by', $acc->id)
                ->where('status', 'pending')
                ->count();

            return [
                'id'             => $acc->id,
                'name'           => $acc->name,
                'email'          => $acc->email,
                'status'         => strtoupper($acc->status ?? 'ACTIVE'),
                'clientCount'    => $clientIds->count(),
                'redCount'       => $redCount,
                'pendingEntries' => $pendingEntries,
                'createdAt'      => $acc->created_at?->toDateString(),
            ];
        });

        return response()->json($accountants);
    }

    public function store(CreateAccountantRequest $request): JsonResponse
    {
        $user = DB::transaction(function () use ($request) {
            $user = User::create([
                'name'     => $request->name,
                'email'    => $request->email,
                'password' => bcrypt(Str::random(32)),
                'role'     => 'accountant',
                'status'   => 'active',
            ]);

            $rawToken   = (new InviteTokenService())->generate($user);
            $inviteLink = env('FRONTEND_URL', 'http://localhost:3000') . '/setup?token=' . $rawToken;

            Mail::to($request->email)->send(new ClientInviteMail($inviteLink));

            return $user;
        });

        return response()->json(['userId' => $user->id], 201);
    }

    public function show(string $id): JsonResponse
    {
        $accountant = User::where('role', 'accountant')->findOrFail($id);
        $companies  = Company::with(['users' => fn ($q) => $q->where('role', 'client')])->where('accountant_id', $id)->get();
        $clientIds  = $companies->pluck('id');

        $parkedDocs = Document::whereIn('company_id', $clientIds)
            ->where('status', 'parked')
            ->selectRaw("flag, COUNT(*) as cnt")
            ->groupBy('flag')
            ->pluck('cnt', 'flag');

        $pendingEntries = AdjustingEntry::where('created_by', $id)
            ->where('status', 'pending')
            ->count();

        $redPerCompany = Document::whereIn('company_id', $clientIds)
            ->where('status', 'parked')
            ->where('flag', 'RED')
            ->selectRaw('company_id, COUNT(*) as cnt')
            ->groupBy('company_id')
            ->pluck('cnt', 'company_id');

        $assignedClients = $companies->map(function ($c) use ($redPerCompany) {
            $client = $c->users->first();
            return [
                'id'           => $c->id,
                'name'         => $c->name,
                'email'        => $c->email,
                'plan'         => $c->plan,
                'birType'      => $c->bir_type,
                'clientStatus' => $client ? strtoupper($client->status) : null,
                'redCount'     => (int) ($redPerCompany[$c->id] ?? 0),
            ];
        });

        return response()->json([
            'id'             => $accountant->id,
            'name'           => $accountant->name,
            'email'          => $accountant->email,
            'mobile'         => $accountant->mobile,
            'status'         => strtoupper($accountant->status ?? 'ACTIVE'),
            'createdAt'      => $accountant->created_at?->toDateString(),
            'clientCount'    => $companies->count(),
            'assignedClients'=> $assignedClients,
            'redCount'       => (int)($parkedDocs['RED'] ?? 0),
            'yellowCount'    => (int)($parkedDocs['YELLOW'] ?? 0),
            'greenCount'     => (int)($parkedDocs['GREEN'] ?? 0),
            'pendingEntries' => $pendingEntries,
        ]);
    }

    public function resetPassword(string $id): JsonResponse
    {
        $user     = User::where('role', 'accountant')->findOrFail($id);
        $rawToken = (new InviteTokenService())->generate($user);
        $inviteLink = env('FRONTEND_URL', 'http://localhost:3000') . '/setup?token=' . $rawToken;

        Mail::to($user->email)->send(new ClientInviteMail($inviteLink));

        return response()->json(['message' => 'Password reset email sent.']);
    }

    public function deactivate(Request $request, string $id): JsonResponse
    {
        $user    = User::where('role', 'accountant')->findOrFail($id);
        $clients = Company::where('accountant_id', $id)->get();

        if ($clients->count() > 0 && !$request->replacementAccountantId) {
            return response()->json([
                'message' => 'Replacement accountant is required when the accountant has clients.',
            ], 422);
        }

        DB::transaction(function () use ($user, $clients, $request) {
            foreach ($clients as $company) {
                $company->update(['accountant_id' => $request->replacementAccountantId]);

                AccountantAssignmentLog::create([
                    'company_id'             => $company->id,
                    'previous_accountant_id' => $user->id,
                    'new_accountant_id'      => $request->replacementAccountantId,
                    'changed_by'             => auth()->id(),
                    'changed_at'             => now(),
                    'accountant_id'          => $request->replacementAccountantId,
                    'assigned_by'            => auth()->id(),
                    'assigned_at'            => now(),
                ]);
            }

            $user->tokens()->delete();
            $user->update(['status' => 'inactive']);
        });

        return response()->json(['message' => 'Accountant deactivated.']);
    }
}
