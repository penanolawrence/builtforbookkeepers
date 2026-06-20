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
        $query = Payment::with(['company', 'recorder'])
            ->whereNotNull('company_id')
            ->latest();

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
        $payments = Payment::with(['company', 'recorder'])
            ->where('company_id', $clientId)
            ->latest()
            ->get();

        return response()->json($payments->map(fn ($p) => $this->toItem($p)));
    }

    public function receivePayment(ReceivePaymentRequest $request, string $clientId): JsonResponse
    {
        $payment = Payment::create([
            'company_id'       => $clientId,
            'amount'           => $request->amount,
            'plan'             => 'starter',
            'date_received'    => $request->dateReceived,
            'reference_number' => $request->referenceNumber,
            'recorded_by'      => auth()->id(),
        ]);

        return response()->json(['paymentId' => $payment->id], 201);
    }

    public function accountantIndex(Request $request): JsonResponse
    {
        $query = Payment::with(['user', 'recorder'])
            ->whereNotNull('user_id')
            ->latest('date_received');

        if ($request->filled('userId')) {
            $query->where('user_id', $request->userId);
        }
        if ($request->filled('start')) {
            $query->whereDate('date_received', '>=', $request->start);
        }
        if ($request->filled('end')) {
            $query->whereDate('date_received', '<=', $request->end);
        }

        return response()->json($query->get()->map(fn ($p) => $this->toAccountantItem($p)));
    }

    public function accountantUsersList(): JsonResponse
    {
        return response()->json(
            User::where('role', 'accountant')
                ->orderBy('name')
                ->get(['id', 'name'])
                ->map(fn ($u) => ['id' => $u->id, 'name' => $u->name])
        );
    }

    public function accountantPayments(string $userId): JsonResponse
    {
        $payments = Payment::with(['user', 'recorder'])
            ->where('user_id', $userId)
            ->latest()
            ->get();

        return response()->json($payments->map(fn ($p) => $this->toAccountantItem($p)));
    }

    public function receiveAccountantPayment(ReceivePaymentRequest $request, string $userId): JsonResponse
    {
        $user = User::findOrFail($userId);

        abort_if($user->role !== 'accountant', 422, 'User is not an accountant.');

        $payment = Payment::create([
            'user_id'          => $user->id,
            'amount'           => $request->amount,
            'plan'             => 'starter',
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

    private function toAccountantItem(Payment $p): array
    {
        return [
            'id'              => $p->id,
            'userId'          => $p->user_id,
            'accountantName'  => $p->user?->name,
            'amount'          => $p->amount,
            'dateReceived'    => $p->date_received?->toDateString(),
            'referenceNumber' => $p->reference_number,
            'recordedBy'      => $p->recorder?->name ?? $p->recorded_by,
            'createdAt'       => $p->created_at?->toIso8601String(),
        ];
    }
}
