<?php

namespace App\Http\Controllers;

use App\Http\Requests\Auth\LoginRequest;
use App\Http\Requests\Auth\SetupPasswordRequest;
use App\Models\Account;
use App\Models\User;
use App\Services\Accounting\ChartOfAccountsService;
use App\Services\Auth\InviteTokenService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;

class AuthController extends Controller
{
    public function __construct(private InviteTokenService $inviteTokenService) {}

    public function login(LoginRequest $request): JsonResponse
    {
        $identifier = $request->identifier;

        $user = User::where('email', $identifier)->first()
             ?? User::where('mobile', $identifier)->first()
             ?? User::where('username', $identifier)->first();

        if (! $user) {
            return response()->json(['message' => 'Invalid credentials'], 422);
        }

        if (! Hash::check($request->password, $user->password)) {
            return response()->json(['message' => 'Invalid credentials'], 422);
        }

        if ($user->role === 'client' && in_array($user->status, ['suspended', 'inactive'])) {
            return response()->json([
                'message' => 'Account suspended. Contact us to resolve.',
                'status' => $user->status,
            ], 403);
        }

        $token = $user->createToken('api-token')->plainTextToken;

        $userData = [
            'id'              => $user->id,
            'name'            => $user->name,
            'role'            => $user->role,
            'companyId'       => $user->company_id,
            'status'          => $user->status,
            'hasSeenTutorial' => $user->has_seen_tutorial,
        ];

        if ($user->role === 'client') {
            $user->loadMissing('company');
            $userData['tin']     = $user->company?->tin;
            $userData['birType'] = $user->company?->bir_type;
        }

        return response()->json([
            'token' => $token,
            'user'  => $userData,
        ]);
    }

    public function logout(Request $request): JsonResponse
    {
        $request->user()->currentAccessToken()->delete();

        return response()->json(['message' => 'Logged out']);
    }

    public function me(Request $request): JsonResponse
    {
        $user = $request->user();

        $data = [
            'id' => $user->id,
            'name' => $user->name,
            'role' => $user->role,
            'email' => $user->email,
            'mobile' => $user->mobile,
            'username' => $user->username,
            'companyId' => $user->company_id,
            'status' => $user->status,
            'hasSeenTutorial' => $user->has_seen_tutorial,
        ];

        if ($user->role === 'client') {
            $data['tin'] = $user->company?->tin;
            $data['birType'] = $user->company?->bir_type;
        }

        return response()->json($data);
    }

    public function markTutorialSeen(Request $request): JsonResponse
    {
        $user = $request->user();
        $user->has_seen_tutorial = true;
        $user->save();

        return response()->json(['hasSeenTutorial' => true]);
    }

    public function validateToken(Request $request): JsonResponse
    {
        $rawToken = $request->query('token', '');

        $inviteToken = $this->inviteTokenService->validate($rawToken);

        if (! $inviteToken) {
            return response()->json(['valid' => false, 'role' => null, 'expired' => true, 'industryType' => null]);
        }

        $user     = \App\Models\User::with('company')->find($inviteToken->user_id);
        $coaReady = $user?->company
            ? Account::where('company_id', $user->company->id)->exists()
            : false;

        return response()->json([
            'valid'        => true,
            'role'         => $inviteToken->role,
            'expired'      => false,
            'name'         => $user?->company?->contact_person ?? $user?->name,
            'industryType' => $user?->company?->industry_type,
            'coaReady'     => $coaReady,
        ]);
    }

    public function setupPassword(SetupPasswordRequest $request): JsonResponse
    {
        $inviteToken = $this->inviteTokenService->validate($request->token);

        if (! $inviteToken) {
            return response()->json(['message' => 'Invalid or expired invite link'], 422);
        }

        $user = User::findOrFail($inviteToken->user_id);

        if ($inviteToken->role === 'client') {
            $company  = $user->company;
            $coaReady = $company
                ? Account::where('company_id', $company->id)->exists()
                : false;

            if (! $coaReady) {
                if (! $request->filled('industry_type')) {
                    return response()->json(['message' => 'Industry type is required.'], 422);
                }

                if ($company) {
                    $company->update(['industry_type' => $request->industry_type]);
                    (new ChartOfAccountsService())->seedDefaultAccounts($company->fresh());
                }
            }
        }

        $user->name     = $request->name;
        $user->password = Hash::make($request->password);
        $user->save();

        $this->inviteTokenService->consume($inviteToken);

        $token = $user->createToken('api-token')->plainTextToken;

        $userData = [
            'id'              => $user->id,
            'name'            => $user->name,
            'role'            => $user->role,
            'companyId'       => $user->company_id,
            'status'          => $user->status,
            'hasSeenTutorial' => $user->has_seen_tutorial,
        ];

        if ($user->role === 'client') {
            $user->loadMissing('company');
            $userData['tin']     = $user->company?->tin;
            $userData['birType'] = $user->company?->bir_type;
        }

        return response()->json([
            'token' => $token,
            'user'  => $userData,
        ]);
    }

    public function updateProfile(Request $request): JsonResponse
    {
        $user = $request->user();

        $rules = [
            'name' => ['sometimes', 'string', 'max:255'],
            'email' => ['sometimes', 'nullable', 'email', 'max:255', 'unique:users,email,'.$user->id],
            'mobile' => ['sometimes', 'nullable', 'string', 'max:20'],
        ];

        if ($user->role === 'client') {
            $rules['tin'] = ['sometimes', 'nullable', 'string', 'max:20'];
        }

        $validated = $request->validate($rules);

        if (isset($validated['tin'])) {
            $user->company?->update(['tin' => $validated['tin']]);
            unset($validated['tin']);
        }

        $user->fill($validated)->save();

        $data = [
            'id' => $user->id,
            'name' => $user->name,
            'role' => $user->role,
            'email' => $user->email,
            'mobile' => $user->mobile,
            'username' => $user->username,
            'companyId' => $user->company_id,
            'status' => $user->status,
        ];

        if ($user->role === 'client') {
            $data['tin'] = $user->company?->tin;
        }

        return response()->json($data);
    }
}
