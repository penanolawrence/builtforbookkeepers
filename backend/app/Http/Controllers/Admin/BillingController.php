<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\ReceivePaymentRequest;
use App\Models\Payment;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

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

    public function accountantIndex(): JsonResponse
    {
        $accountants = User::where('role', 'accountant')
            ->leftJoin('payments', function ($join) {
                $join->on('payments.user_id', '=', 'users.id')
                     ->whereIn('payments.id', function ($sub) {
                         $sub->selectRaw('MAX(id)')
                             ->from('payments')
                             ->whereNotNull('user_id')
                             ->groupBy('user_id');
                     });
            })
            ->select(
                'users.id as userId',
                'users.name',
                'users.email',
                DB::raw('DATE(payments.date_received) as lastPaymentDate'),
                'payments.amount as lastPaymentAmount'
            )
            ->get();

        return response()->json($accountants->map(fn ($a) => [
            'userId'            => $a->userId,
            'name'              => $a->name,
            'email'             => $a->email,
            'lastPaymentDate'   => $a->lastPaymentDate,
            'lastPaymentAmount' => $a->lastPaymentAmount ? number_format((float) $a->lastPaymentAmount, 2, '.', '') : null,
        ]));
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
