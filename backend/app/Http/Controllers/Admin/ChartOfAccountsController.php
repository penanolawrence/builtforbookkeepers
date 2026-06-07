<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Account;
use App\Models\Company;
use App\Models\JournalEntryLine;
use App\Services\Accounting\ChartOfAccountsService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ChartOfAccountsController extends Controller
{
    private function authorizeClient(string $clientId): void
    {
        $user = auth()->user();
        if ($user->role === 'accountant') {
            $company = Company::findOrFail($clientId);
            if ($company->accountant_id !== $user->id) {
                abort(403, 'Forbidden.');
            }
        }
    }

    public function index(string $clientId): JsonResponse
    {
        $this->authorizeClient($clientId);

        $accounts = Account::where('company_id', $clientId)
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

    public function update(Request $request, string $clientId): JsonResponse
    {
        $this->authorizeClient($clientId);

        $company         = Company::findOrFail($clientId);
        $submittedIds    = collect($request->accounts ?? [])->pluck('id')->filter()->values();
        $existingAccounts = Account::where('company_id', $clientId)->get();

        foreach ($existingAccounts as $account) {
            if ($account->is_system_managed) {
                continue;
            }

            if (!$submittedIds->contains($account->id)) {
                $hasLines = JournalEntryLine::where('account_id', $account->id)->exists();
                if ($hasLines) {
                    return response()->json([
                        'message' => "Account '{$account->name}' cannot be removed — it has existing transactions. Set it as inactive to hide it instead.",
                    ], 422);
                }
                $account->update(['is_active' => false]);
            }
        }

        foreach ($request->accounts ?? [] as $item) {
            if (empty($item['id'])) {
                $type = $item['type'] ?? 'expense';
                $code = (new ChartOfAccountsService())->getNextCode($company, $type);
                Account::create([
                    'company_id'        => $clientId,
                    'code'              => $code,
                    'name'              => $item['name'],
                    'type'              => $type,
                    'is_system_managed' => false,
                    'is_active'         => $item['isActive'] ?? true,
                ]);
            } else {
                $account = Account::find($item['id']);
                if ($account && !$account->is_system_managed) {
                    $account->update([
                        'name'      => $item['name'] ?? $account->name,
                        'is_active' => $item['isActive'] ?? $account->is_active,
                    ]);
                }
            }
        }

        return response()->json(['message' => 'Chart of accounts updated.']);
    }
}
