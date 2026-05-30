<?php

namespace App\Http\Controllers;

use App\Models\Subtype;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class SubtypeController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $q = $request->query('q', '');
        if (strlen($q) < 3) {
            return response()->json([]);
        }

        $operator = config('database.default') === 'pgsql' ? 'ilike' : 'like';

        $subtypes = Subtype::where('name', $operator, "%{$q}%")
            ->orderBy('name')
            ->limit(20)
            ->get(['id', 'name']);

        return response()->json($subtypes);
    }

    public function store(Request $request): JsonResponse
    {
        $request->validate(['name' => ['required', 'string', 'max:255']]);

        $subtype = Subtype::firstOrCreate(['name' => $request->name]);

        return response()->json(['id' => $subtype->id, 'name' => $subtype->name], 201);
    }
}
