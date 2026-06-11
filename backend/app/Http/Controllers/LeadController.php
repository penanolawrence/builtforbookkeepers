<?php

namespace App\Http\Controllers;

use App\Models\Lead;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class LeadController extends Controller
{
    public function store(Request $request): JsonResponse
    {
        $request->validate([
            'contact' => ['required', 'string', 'max:255'],
            'message' => ['nullable', 'string', 'max:2000'],
        ]);

        $lead = Lead::create([
            'contact' => $request->contact,
            'message' => $request->message,
        ]);

        return response()->json(['id' => $lead->id], 201);
    }
}
