<?php

namespace App\Http\Controllers;

use App\Models\Account;
use App\Models\Company;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AccountController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $user = auth()->user();

        if ($user->role === 'client') {
            $companyId = $user->company_id;
        } elseif ($request->filled('clientId')) {
            $company = Company::findOrFail($request->clientId);

            if ($user->role === 'accountant' && $company->accountant_id !== $user->id) {
                return response()->json(['message' => 'Forbidden.'], 403);
            }

            $companyId = $request->clientId;
        } else {
            return response()->json([]);
        }

        $accounts = Account::where('company_id', $companyId)
            ->where('is_active', true)
            ->orderBy('code')
            ->get()
            ->map(fn ($a) => [
                'id'               => $a->id,
                'code'             => $a->code,
                'name'             => $a->name,
                'type'             => $a->type,
                'chartOfAccountId' => $a->chart_of_account_id,
                'isActive'         => $a->is_active,
                'isSystemManaged'  => $a->is_system_managed,
            ]);

        return response()->json($accounts);
    }
}
