<?php

namespace App\Http\Middleware;

use App\Models\Company;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureAssignedToClient
{
    public function handle(Request $request, Closure $next): Response
    {
        $user     = $request->user();
        $clientId = $request->route('clientId') ?? $request->route('id');

        if ($clientId) {
            $company = Company::find($clientId);

            if ($company && $user->role !== 'admin' && (string) $company->accountant_id !== (string) $user->id) {
                return response()->json(['message' => 'Not assigned to this client'], 403);
            }
        }

        return $next($request);
    }
}
