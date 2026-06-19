<?php

namespace App\Http\Controllers;

use App\Models\ChartOfAccountSubtype;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class SubtypeController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $q = $request->query('q', '');

        $query = ChartOfAccountSubtype::whereNull('chart_of_account_id')
            ->orderBy('name');

        if (strlen($q) >= 3) {
            $operator = config('database.default') === 'pgsql' ? 'ilike' : 'like';
            $query->where('name', $operator, "%{$q}%");
        } elseif (strlen($q) > 0) {
            return response()->json([]);
        }

        return response()->json($query->get(['id', 'name']));
    }

    public function store(Request $request): JsonResponse
    {
        $request->validate(['name' => ['required', 'string', 'max:255']]);

        $subtype = ChartOfAccountSubtype::firstOrCreate(
            ['name' => $request->name, 'chart_of_account_id' => null],
            ['code' => null, 'sort_order' => 0]
        );

        return response()->json(['id' => $subtype->id, 'name' => $subtype->name], 201);
    }
}
