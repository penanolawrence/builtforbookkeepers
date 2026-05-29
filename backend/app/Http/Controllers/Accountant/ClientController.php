<?php

namespace App\Http\Controllers\Accountant;

use App\Http\Controllers\Controller;
use App\Models\AdjustingEntry;
use App\Models\Company;
use App\Models\Document;
use App\Models\Payment;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ClientController extends Controller
{
    public function index(): JsonResponse
    {
        $user    = auth()->user();
        $clients = Company::with(['users' => fn ($q) => $q->where('role', 'client')])
            ->where('accountant_id', $user->id)
            ->get();

        return response()->json($clients->map(function ($company) use ($user) {
            $client      = $company->users->first();
            $lastPayment = Payment::where('company_id', $company->id)
                ->latest('date_received')
                ->first();

            return [
                'id'             => $company->id,
                'name'           => $company->name,
                'mobile'         => $company->mobile,
                'email'          => $company->email,
                'tin'            => $company->tin,
                'contactPerson'  => $company->contact_person,
                'birType'        => $company->bir_type,
                'plan'           => $company->plan,
                'accountantId'   => $company->accountant_id,
                'accountantName' => $user->name,
                'clientId'       => $client?->id,
                'clientStatus'   => $client ? strtoupper($client->status) : null,
                'username'       => $client?->username,
                'lastPayment'    => $lastPayment ? [
                    'amount'          => $lastPayment->amount,
                    'dateReceived'    => $lastPayment->date_received?->toDateString(),
                    'referenceNumber' => $lastPayment->reference_number,
                ] : null,
            ];
        }));
    }

    public function show(string $id): JsonResponse
    {
        $user    = auth()->user();
        $company = Company::with(['users' => fn ($q) => $q->where('role', 'client')])
            ->findOrFail($id);

        if ($company->accountant_id !== $user->id) {
            return response()->json(['message' => 'Forbidden.'], 403);
        }

        $client      = $company->users->first();
        $lastPayment = Payment::where('company_id', $id)->latest('date_received')->first();

        $parkedDocs = Document::where('company_id', $id)
            ->where('status', 'parked')
            ->selectRaw("flag, COUNT(*) as cnt")
            ->groupBy('flag')
            ->pluck('cnt', 'flag');

        $pendingEntries = AdjustingEntry::where('company_id', $id)
            ->where('status', 'pending')
            ->count();

        $draftEntries = AdjustingEntry::where('company_id', $id)
            ->where('status', 'draft')
            ->count();

        return response()->json([
            'id'             => $company->id,
            'name'           => $company->name,
            'mobile'         => $company->mobile,
            'email'          => $company->email,
            'tin'            => $company->tin,
            'contactPerson'  => $company->contact_person,
            'birType'        => $company->bir_type,
            'plan'           => $company->plan,
            'accountantId'   => $company->accountant_id,
            'accountantName' => $user->name,
            'clientId'       => $client?->id,
            'clientStatus'   => $client?->status,
            'username'       => $client?->username,
            'lastPayment'    => $lastPayment ? [
                'amount'          => $lastPayment->amount,
                'dateReceived'    => $lastPayment->date_received?->toDateString(),
                'referenceNumber' => $lastPayment->reference_number,
            ] : null,
            'queueCounts'    => [
                'red'    => (int) ($parkedDocs['RED'] ?? 0),
                'yellow' => (int) ($parkedDocs['YELLOW'] ?? 0),
                'green'  => (int) ($parkedDocs['GREEN'] ?? 0),
            ],
            'pendingEntries' => $pendingEntries,
            'draftEntries'   => $draftEntries,
        ]);
    }

    public function getDocuments(Request $request, string $id): JsonResponse
    {
        $user    = auth()->user();
        $company = Company::findOrFail($id);

        if ($company->accountant_id !== $user->id) {
            return response()->json(['message' => 'Forbidden.'], 403);
        }

        $query = Document::where('company_id', $id);

        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }
        if ($request->filled('type')) {
            $query->where('document_type', $request->type);
        }
        if ($request->filled('start')) {
            $query->whereDate('document_date', '>=', $request->start);
        }
        if ($request->filled('end')) {
            $query->whereDate('document_date', '<=', $request->end);
        }

        $documents = $query->latest()->get();

        return response()->json($documents->map(fn ($d) => [
            'id'              => $d->id,
            'companyId'       => $d->company_id,
            'declaredType'    => $d->document_type,
            'status'          => strtoupper($d->status),
            'flag'            => $d->flag,
            'anomalyReasons'  => $d->anomaly_reason ?? [],
            'merchantName'    => $d->merchant_name,
            'date'            => $d->document_date?->toDateString(),
            'amount'          => $d->amount,
            'vatAmount'       => $d->vat_amount,
            'category'        => $d->category,
            'paymentMethod'   => $d->payment_method,
            'imageUrl'        => null,
            'isNoReceipt'     => $d->is_no_receipt,
            'isOcrFailed'     => $d->is_ocr_failed,
            'returnNote'      => $d->return_note,
            'rejectionReason' => $d->rejection_reason,
            'expiresAt'       => $d->expires_at?->toIso8601String(),
            'refNumber'       => $d->ref_number,
            'createdAt'       => $d->created_at?->toIso8601String(),
            'updatedAt'       => $d->updated_at?->toIso8601String(),
        ]));
    }
}
