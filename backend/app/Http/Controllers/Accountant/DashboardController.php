<?php

namespace App\Http\Controllers\Accountant;

use App\Http\Controllers\Controller;
use App\Models\Document;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Carbon;

class DashboardController extends Controller
{
    public function weeklyStats(): JsonResponse
    {
        $user      = auth()->user();
        $weekStart = Carbon::now()->startOfWeek(); // Monday

        $base = Document::where('approved_by', $user->id)
            ->where('status', 'approved')
            ->where('approved_at', '>=', $weekStart);

        $processed       = (clone $base)->count();
        $autoCategorized = (clone $base)->whereNull('field_overrides')->count();

        $autoPct   = $processed > 0 ? round($autoCategorized / $processed * 100) : 0;
        $timeSaved = round($autoCategorized / 60, 1);

        return response()->json([
            'entriesProcessed'   => $processed,
            'autoCategorizedPct' => $autoPct,
            'timeSavedHours'     => $timeSaved,
        ]);
    }
}
