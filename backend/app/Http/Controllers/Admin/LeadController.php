<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Lead;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class LeadController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $filter = $request->query('filter', 'all');
        $page   = max(1, (int) $request->query('page', 1));

        $query = Lead::query()->orderBy('is_read', 'asc')->orderBy('created_at', 'desc');

        if ($filter === 'unread') {
            $query->where('is_read', false);
        } elseif ($filter === 'read') {
            $query->where('is_read', true);
        }

        $paginated = $query->paginate(10, ['*'], 'page', $page);

        return response()->json([
            'data' => $paginated->map(fn (Lead $l) => [
                'id'         => $l->id,
                'contact'    => $l->contact,
                'message'    => $l->message,
                'is_read'    => (bool) $l->is_read,
                'created_at' => $l->created_at?->toISOString(),
            ]),
            'pagination' => [
                'currentPage' => $paginated->currentPage(),
                'perPage'     => $paginated->perPage(),
                'total'       => $paginated->total(),
            ],
        ]);
    }

    public function toggleRead(Lead $lead): JsonResponse
    {
        $lead->update(['is_read' => !$lead->is_read]);

        return response()->json([
            'id'         => $lead->id,
            'contact'    => $lead->contact,
            'message'    => $lead->message,
            'is_read'    => (bool) $lead->is_read,
            'created_at' => $lead->created_at?->toISOString(),
        ]);
    }
}
