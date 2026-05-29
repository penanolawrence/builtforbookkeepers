<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\AdjustingEntry;
use App\Models\Document;
use App\Models\User;
use Illuminate\Http\JsonResponse;

class DashboardController extends Controller
{
    public function index(): JsonResponse
    {
        $accountants = User::where('role', 'accountant')->with('company')->get();

        $data = $accountants->map(function ($accountant) {
            $clientIds = \App\Models\Company::where('accountant_id', $accountant->id)->pluck('id');

            $parkedDocs = Document::whereIn('company_id', $clientIds)
                ->where('status', 'parked')
                ->selectRaw("flag, COUNT(*) as cnt")
                ->groupBy('flag')
                ->pluck('cnt', 'flag');

            $pendingEntries = AdjustingEntry::where('created_by', $accountant->id)
                ->where('status', 'pending')
                ->count();

            return [
                'id'             => $accountant->id,
                'name'           => $accountant->name,
                'clientCount'    => $clientIds->count(),
                'redCount'       => (int)($parkedDocs['RED'] ?? 0),
                'yellowCount'    => (int)($parkedDocs['YELLOW'] ?? 0),
                'greenCount'     => (int)($parkedDocs['GREEN'] ?? 0),
                'pendingEntries' => $pendingEntries,
            ];
        });

        $openRedItems = Document::where('status', 'parked')
            ->where('flag', 'RED')
            ->count();

        return response()->json([
            'accountants'  => $data,
            'openRedItems' => $openRedItems,
        ]);
    }
}
