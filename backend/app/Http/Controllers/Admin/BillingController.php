<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\ReceivePaymentRequest;
use App\Models\Payment;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class BillingController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = Payment::with(['company', 'recorder'])->latest();

        if ($request->filled('clientId')) {
            $query->where('company_id', $request->clientId);
        }
        if ($request->filled('start')) {
            $query->whereDate('date_received', '>=', $request->start);
        }
        if ($request->filled('end')) {
            $query->whereDate('date_received', '<=', $request->end);
        }

        return response()->json($query->get()->map(fn ($p) => $this->toItem($p)));
    }

    public function clientPayments(string $clientId): JsonResponse
    {
        $payments = Payment::with(['company', 'recorder'])->where('company_id', $clientId)->latest()->get();

        return response()->json($payments->map(fn ($p) => $this->toItem($p)));
    }

    public function receivePayment(ReceivePaymentRequest $request, string $clientId): JsonResponse
    {
        $payment = Payment::create([
            'company_id'       => $clientId,
            'amount'           => $request->amount,
            'date_received'    => $request->dateReceived,
            'reference_number' => $request->referenceNumber,
            'recorded_by'      => auth()->id(),
        ]);

        return response()->json(['paymentId' => $payment->id], 201);
    }

    private function toItem(Payment $p): array
    {
        return [
            'id'              => $p->id,
            'companyId'       => $p->company_id,
            'companyName'     => $p->company?->name,
            'amount'          => $p->amount,
            'dateReceived'    => $p->date_received?->toDateString(),
            'referenceNumber' => $p->reference_number,
            'recordedBy'      => $p->recorder?->name ?? $p->recorded_by,
            'createdAt'       => $p->created_at?->toIso8601String(),
        ];
    }
}
