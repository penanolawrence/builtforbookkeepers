# Accountant Billing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extend the manual billing system so admin can record subscription payments from accountants alongside clients, with a Clients/Accountants tab strip on the billing page and the plan field retired from the UI entirely.

**Architecture:** Add a nullable `user_id` FK to the `payments` table (alongside the now-nullable `company_id`) so each row belongs to either a company or a user. Three new backend routes under `/admin/billing/accountants` mirror the existing client routes. The billing page gains a tab strip; the inline `PaymentModal` is extended to handle both flows.

**Tech Stack:** Laravel 11 (PHP), Next.js 14 App Router, TypeScript, TanStack Query, Tailwind CSS, Axios.

## Global Constraints

- All new backend routes live under the existing `auth:sanctum` + admin middleware group in `backend/routes/api.php`
- `plan` is always written as `'starter'` by the backend; it is never sent from the frontend
- `company_id` must remain nullable (existing client rows are unaffected — their `company_id` stays set, `user_id` stays NULL)
- The `Accountant` interface already exists in `frontend/src/types/admin.ts`; do not redefine it
- Currency display format: `₱` + `toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })`
- All PHP files use PSR-4 namespacing under `App\`

---

## File Map

| Status | File | Change |
|--------|------|--------|
| Create | `backend/database/migrations/YYYY_MM_DD_000001_add_user_id_to_payments_table.php` | Make `company_id` nullable; add nullable `user_id` FK |
| Modify | `backend/app/Models/Payment.php` | Add `user_id` to `$fillable`; add `user()` relationship |
| Modify | `backend/app/Http/Controllers/Admin/BillingController.php` | Add 3 accountant methods; hardcode `plan='starter'` in `receivePayment` |
| Modify | `backend/routes/api.php` | Add 3 accountant billing routes |
| Modify | `frontend/src/types/admin.ts` | Add `AccountantBillingRow` interface |
| Modify | `frontend/src/lib/api/admin/billing.ts` | Add `getAccountantsList`, `getAccountantPayments`, `receiveAccountantPayment` |
| Modify | `frontend/src/app/admin/billing/page.tsx` | Add tab strip, accountants table, extend `PaymentModal` |

---

### Task 1: DB migration — add `user_id`, make `company_id` nullable

**Files:**
- Create: `backend/database/migrations/2026_06_20_000001_add_user_id_to_payments_table.php`

**Interfaces:**
- Produces: `payments.user_id` nullable UUID column; `payments.company_id` nullable

- [ ] **Step 1: Create the migration file**

```php
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('payments', function (Blueprint $table) {
            $table->dropForeign(['company_id']);
            $table->uuid('company_id')->nullable()->change();
            $table->foreign('company_id')->references('id')->on('companies')->nullOnDelete();

            $table->foreignUuid('user_id')->nullable()->constrained('users')->nullOnDelete()->after('company_id');
        });
    }

    public function down(): void
    {
        Schema::table('payments', function (Blueprint $table) {
            $table->dropForeign(['user_id']);
            $table->dropColumn('user_id');

            $table->dropForeign(['company_id']);
            $table->uuid('company_id')->nullable(false)->change();
            $table->foreign('company_id')->references('id')->on('companies')->cascadeOnDelete();
        });
    }
};
```

- [ ] **Step 2: Run migration**

```bash
cd backend && php artisan migrate
```

Expected output: `Migrating: 2026_06_20_000001_add_user_id_to_payments_table` … `Migrated`

- [ ] **Step 3: Verify columns exist**

```bash
php artisan tinker --execute="echo implode(', ', array_column(DB::select('PRAGMA table_info(payments)'), 'name'));"
```

Expected output includes: `user_id`

- [ ] **Step 4: Commit**

```bash
git add backend/database/migrations/2026_06_20_000001_add_user_id_to_payments_table.php
git commit -m "feat: add user_id to payments, make company_id nullable"
```

---

### Task 2: Payment model — add `user_id` and `user()` relationship

**Files:**
- Modify: `backend/app/Models/Payment.php`

**Interfaces:**
- Consumes: `payments.user_id` column from Task 1
- Produces: `Payment::user()` belongsTo User; `user_id` in `$fillable`

- [ ] **Step 1: Update `Payment.php`**

Replace the entire file content:

```php
<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Payment extends Model
{
    use HasUuids;

    protected $fillable = [
        'company_id',
        'user_id',
        'amount',
        'plan',
        'status',
        'reference',
        'paid_at',
        'date_received',
        'reference_number',
        'recorded_by',
    ];

    protected $casts = [
        'amount'        => 'decimal:2',
        'paid_at'       => 'datetime',
        'date_received' => 'date',
    ];

    public function company(): BelongsTo
    {
        return $this->belongsTo(Company::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function recorder(): BelongsTo
    {
        return $this->belongsTo(User::class, 'recorded_by');
    }
}
```

- [ ] **Step 2: Smoke-test the model**

```bash
php artisan tinker --execute="echo App\Models\Payment::first()?->user_id ?? 'null (ok)';"
```

Expected: `null (ok)` (existing rows have no user_id)

- [ ] **Step 3: Commit**

```bash
git add backend/app/Models/Payment.php
git commit -m "feat: add user relationship and user_id fillable to Payment model"
```

---

### Task 3: BillingController — accountant methods + retire plan from UI

**Files:**
- Modify: `backend/app/Http/Controllers/Admin/BillingController.php`

**Interfaces:**
- Consumes: `Payment::user()` from Task 2; `User` model (`role = 'accountant'`)
- Produces:
  - `accountantIndex(): JsonResponse` — array of `{ userId, name, email, lastPaymentDate, lastPaymentAmount }`
  - `accountantPayments(string $userId): JsonResponse` — array of `toItem()` shaped records
  - `receiveAccountantPayment(ReceivePaymentRequest $request, string $userId): JsonResponse` — `{ paymentId }`
  - `receivePayment()` now hardcodes `plan = 'starter'`

- [ ] **Step 1: Replace `BillingController.php`**

```php
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
                'payments.date_received as lastPaymentDate',
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
```

- [ ] **Step 2: Verify no syntax errors**

```bash
php artisan route:list --path=billing
```

Expected: existing billing routes listed without error.

- [ ] **Step 3: Commit**

```bash
git add backend/app/Http/Controllers/Admin/BillingController.php
git commit -m "feat: add accountant billing methods, retire plan from UI"
```

---

### Task 4: Register accountant billing routes

**Files:**
- Modify: `backend/routes/api.php` lines 158–160

**Interfaces:**
- Consumes: `BillingController@accountantIndex`, `@accountantPayments`, `@receiveAccountantPayment` from Task 3
- Produces: 3 new routes under `/admin/billing/accountants`

- [ ] **Step 1: Add routes after the existing billing lines**

Find this block in `backend/routes/api.php`:
```php
Route::get('/admin/billing',            [Admin\BillingController::class, 'index']);
Route::get('/admin/billing/{clientId}', [Admin\BillingController::class, 'clientPayments']);
Route::post('/admin/billing/{clientId}',[Admin\BillingController::class, 'receivePayment']);
```

Replace with:
```php
Route::get('/admin/billing',                              [Admin\BillingController::class, 'index']);
Route::get('/admin/billing/accountants',                  [Admin\BillingController::class, 'accountantIndex']);
Route::get('/admin/billing/accountants/{userId}',         [Admin\BillingController::class, 'accountantPayments']);
Route::post('/admin/billing/accountants/{userId}',        [Admin\BillingController::class, 'receiveAccountantPayment']);
Route::get('/admin/billing/{clientId}',                   [Admin\BillingController::class, 'clientPayments']);
Route::post('/admin/billing/{clientId}',                  [Admin\BillingController::class, 'receivePayment']);
```

> **Order matters:** `/admin/billing/accountants` must appear before `/admin/billing/{clientId}` or Laravel will match the literal string "accountants" as a clientId.

- [ ] **Step 2: Verify routes are registered**

```bash
php artisan route:list --path=billing
```

Expected output includes all 6 billing routes with correct methods and controller actions.

- [ ] **Step 3: Quick API smoke test**

```bash
php artisan tinker --execute="echo Http::withToken('test')->get('http://localhost/api/admin/billing/accountants')->status();"
```

Expected: `401` (unauthenticated — route exists but requires auth). Not 404.

- [ ] **Step 4: Commit**

```bash
git add backend/routes/api.php
git commit -m "feat: register accountant billing routes"
```

---

### Task 5: Frontend types

**Files:**
- Modify: `frontend/src/types/admin.ts`

**Interfaces:**
- Produces: `AccountantBillingRow` interface; `AccountantPaymentRecord` interface

- [ ] **Step 1: Add types to `frontend/src/types/admin.ts`**

Append after the existing `PaymentRecord` interface (after line 47):

```ts
export interface AccountantBillingRow {
  userId: string
  name: string
  email: string
  lastPaymentDate: string | null
  lastPaymentAmount: string | null
}

export interface AccountantPaymentRecord {
  id: string
  userId: string
  accountantName: string | null
  amount: number
  dateReceived: string
  referenceNumber: string
  recordedBy: string | null
  createdAt: string
}
```

- [ ] **Step 2: Check no TypeScript errors**

```bash
cd frontend && npx tsc --noEmit 2>&1 | head -20
```

Expected: no new errors related to `admin.ts`.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/types/admin.ts
git commit -m "feat: add AccountantBillingRow and AccountantPaymentRecord types"
```

---

### Task 6: Frontend API functions

**Files:**
- Modify: `frontend/src/lib/api/admin/billing.ts`

**Interfaces:**
- Consumes: `AccountantBillingRow`, `AccountantPaymentRecord` from Task 5; routes from Task 4
- Produces:
  - `getAccountantsList(): Promise<AccountantBillingRow[]>`
  - `getAccountantPayments(userId: string): Promise<AccountantPaymentRecord[]>`
  - `receiveAccountantPayment(userId: string, data: ReceivePaymentData): Promise<{ paymentId: string }>`

- [ ] **Step 1: Replace `frontend/src/lib/api/admin/billing.ts`**

```ts
import api from '../client'
import type { PaymentRecord, AccountantBillingRow, AccountantPaymentRecord } from '@/types/admin'

export interface ReceivePaymentData {
  amount: number
  dateReceived: string
  referenceNumber: string
}

export async function getPayments(params?: {
  clientId?: string
  start?: string
  end?: string
}): Promise<PaymentRecord[]> {
  const { data } = await api.get<PaymentRecord[]>('/admin/billing', { params })
  return data
}

export async function getClientPayments(clientId: string): Promise<PaymentRecord[]> {
  const { data } = await api.get<PaymentRecord[]>(`/admin/billing/${clientId}`)
  return data
}

export async function receivePayment(
  clientId: string,
  data: ReceivePaymentData
): Promise<{ paymentId: string }> {
  const { data: result } = await api.post<{ paymentId: string }>(
    `/admin/billing/${clientId}`,
    data
  )
  return result
}

export async function getAccountantsList(): Promise<AccountantBillingRow[]> {
  const { data } = await api.get<AccountantBillingRow[]>('/admin/billing/accountants')
  return data
}

export async function getAccountantPayments(userId: string): Promise<AccountantPaymentRecord[]> {
  const { data } = await api.get<AccountantPaymentRecord[]>(`/admin/billing/accountants/${userId}`)
  return data
}

export async function receiveAccountantPayment(
  userId: string,
  data: ReceivePaymentData
): Promise<{ paymentId: string }> {
  const { data: result } = await api.post<{ paymentId: string }>(
    `/admin/billing/accountants/${userId}`,
    data
  )
  return result
}
```

- [ ] **Step 2: Type check**

```bash
cd frontend && npx tsc --noEmit 2>&1 | head -20
```

Expected: no new errors.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/lib/api/admin/billing.ts
git commit -m "feat: add accountant billing API functions"
```

---

### Task 7: Billing page — tabs, accountants table, modal update

**Files:**
- Modify: `frontend/src/app/admin/billing/page.tsx`

**Interfaces:**
- Consumes: `getAccountantsList`, `receiveAccountantPayment`, `ReceivePaymentData` from Task 6; `AccountantBillingRow` from Task 5

- [ ] **Step 1: Replace `frontend/src/app/admin/billing/page.tsx`**

```tsx
'use client'

import { useState, type CSSProperties } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  getPayments,
  getAccountantsList,
  receivePayment,
  receiveAccountantPayment,
} from '@/lib/api/admin/billing'
import type { ReceivePaymentData } from '@/lib/api/admin/billing'
import { getClients } from '@/lib/api/admin/clients'
import type { PaymentRecord, AccountantBillingRow } from '@/types/admin'
import { Breadcrumb } from '@/components/shared/Breadcrumb'
import { SummaryCard } from '@/components/shared/SummaryCard'

function fmtAmount(n: number | string) {
  return '₱' + Number(n).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function fmtDate(iso: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

const PER_PAGE = 20

// ── PaymentModal ────────────────────────────────────────────────────────────
// When userId + accountantName are set, records a payment for that accountant
// (no client dropdown). When clientId flow, shows client dropdown.

interface PaymentModalProps {
  clients: { id: string; name: string }[]
  // Pre-fill for accountant payments
  userId?: string
  accountantName?: string
  onClose: () => void
  onSuccess: () => void
}

function PaymentModal({ clients, userId, accountantName, onClose, onSuccess }: PaymentModalProps) {
  const isAccountant = !!userId

  const [clientId, setClientId] = useState('')
  const [amount, setAmount]     = useState('')
  const [date, setDate]         = useState(new Date().toISOString().slice(0, 10))
  const [ref, setRef]           = useState('')
  const [error, setError]       = useState<string | null>(null)
  const [saving, setSaving]     = useState(false)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    if (!isAccountant && !clientId) { setError('Please select a client.'); return }
    if (!amount || Number(amount) <= 0) { setError('Enter a valid amount.'); return }
    if (!ref.trim()) { setError('Reference number is required.'); return }
    setSaving(true)
    const payload: ReceivePaymentData = { amount: Number(amount), dateReceived: date, referenceNumber: ref }
    try {
      if (isAccountant) {
        await receiveAccountantPayment(userId!, payload)
      } else {
        await receivePayment(clientId, payload)
      }
      onSuccess()
    } catch {
      setError('Failed to record payment. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/35">
      <div className="bg-t-card rounded-xl shadow-2xl w-full max-w-md overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-t-line">
          <span className="text-[15px] font-bold text-t-ink">Receive Payment</span>
          <button onClick={onClose} className="text-t-faint hover:text-t-muted text-lg leading-none">×</button>
        </div>
        <form onSubmit={submit}>
          <div className="p-5 space-y-3.5">
            {error && <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">{error}</p>}

            {isAccountant ? (
              <div>
                <label className="block text-xs font-semibold text-t-muted mb-1.5">Accountant</label>
                <div className="w-full border border-t-line rounded-md px-2.5 py-2 text-sm text-t-ink bg-t-surface">
                  {accountantName}
                </div>
              </div>
            ) : (
              <div>
                <label className="block text-xs font-semibold text-t-muted mb-1.5">Client <span className="text-red-500">*</span></label>
                <select
                  value={clientId}
                  onChange={(e) => setClientId(e.target.value)}
                  className="w-full border border-t-line rounded-md px-2.5 py-2 text-sm text-t-ink bg-t-card"
                >
                  <option value="">Select client…</option>
                  {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-t-muted mb-1.5">Amount <span className="text-red-500">*</span></label>
              <input
                type="number" step="0.01" min="0.01" value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                className="w-full border border-t-line rounded-md px-2.5 py-2 text-sm text-t-ink outline-none focus:border-t-primary focus:ring-2 focus:ring-indigo-50"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-t-muted mb-1.5">Date Received <span className="text-red-500">*</span></label>
              <input
                type="date" value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full border border-t-line rounded-md px-2.5 py-2 text-sm text-t-ink outline-none focus:border-t-primary focus:ring-2 focus:ring-indigo-50"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-t-muted mb-1.5">Reference Number <span className="text-red-500">*</span></label>
              <input
                type="text" value={ref}
                onChange={(e) => setRef(e.target.value)}
                placeholder="e.g. GCash-0421"
                className="w-full border border-t-line rounded-md px-2.5 py-2 text-sm text-t-ink outline-none focus:border-t-primary focus:ring-2 focus:ring-indigo-50"
              />
            </div>
          </div>

          <div className="flex gap-2 justify-end px-5 py-3.5 border-t border-t-line">
            <button
              type="button" onClick={onClose}
              className="text-xs font-semibold px-3.5 py-2 border border-t-line rounded-md text-t-muted hover:bg-t-surface"
            >
              Cancel
            </button>
            <button
              type="submit" disabled={saving}
              className="text-xs font-semibold px-3.5 py-2 bg-t-primary hover:bg-t-primary-deep text-white rounded-md disabled:opacity-50 transition-colors"
            >
              {saving ? 'Recording…' : 'Record Payment'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Page ────────────────────────────────────────────────────────────────────

type BillingTab = 'clients' | 'accountants'

interface ModalTarget {
  userId?: string
  accountantName?: string
}

export default function AdminBillingPage() {
  const qc = useQueryClient()

  const [tab, setTab]                   = useState<BillingTab>('clients')
  const [clientFilter, setClientFilter] = useState('')
  const [start, setStart]               = useState('')
  const [end, setEnd]                   = useState('')
  const [page, setPage]                 = useState(1)
  const [modalTarget, setModalTarget]   = useState<ModalTarget | null>(null)
  const [toast, setToast]               = useState<string | null>(null)
  const [hoveredId, setHoveredId]       = useState<string | null>(null)

  const showToast = (msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(null), 3000)
  }

  const { data: payments, isLoading: paymentsLoading } = useQuery({
    queryKey: ['admin-payments', { clientFilter, start, end }],
    queryFn: () => getPayments({
      clientId: clientFilter || undefined,
      start:    start || undefined,
      end:      end || undefined,
    }),
  })

  const { data: accountants, isLoading: accountantsLoading } = useQuery({
    queryKey: ['admin-accountant-billing'],
    queryFn:  getAccountantsList,
  })

  const { data: clientsData } = useQuery({
    queryKey: ['admin-clients', {}],
    queryFn:  () => getClients(),
  })

  const clients      = clientsData?.data ?? []
  const allPayments  = payments ?? []
  const allAccountants = accountants ?? []

  // ── Clients pagination ───────────────────────────────────────────────────
  const total      = allPayments.length
  const totalPages = Math.max(1, Math.ceil(total / PER_PAGE))
  const safePage   = Math.min(page, totalPages)
  const from       = total === 0 ? 0 : (safePage - 1) * PER_PAGE + 1
  const to         = Math.min(safePage * PER_PAGE, total)
  const pageItems  = allPayments.slice((safePage - 1) * PER_PAGE, safePage * PER_PAGE) as PaymentRecord[]

  const totalReceived = allPayments.reduce((s: number, p: PaymentRecord) => s + Number(p.amount), 0)
  const now = new Date()
  const thisMonth = allPayments
    .filter((p: PaymentRecord) => {
      const d = new Date(p.dateReceived)
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
    })
    .reduce((s: number, p: PaymentRecord) => s + Number(p.amount), 0)
  const activeClients = new Set(allPayments.map((p: PaymentRecord) => p.companyId)).size

  function fmtCurrency(n: number) {
    return '₱' + n.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  }

  const pageNums = (() => {
    if (totalPages <= 5) return Array.from({ length: totalPages }, (_, i) => i + 1)
    if (safePage <= 3) return [1, 2, 3, 4, 5]
    if (safePage >= totalPages - 2) return [totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages]
    return [safePage - 2, safePage - 1, safePage, safePage + 1, safePage + 2]
  })()

  // ── Tab strip style ──────────────────────────────────────────────────────
  const tabStyle = (active: boolean): CSSProperties => ({
    padding: '7px 16px',
    borderRadius: 8,
    border: 'none',
    fontSize: 13,
    fontWeight: 600,
    cursor: 'pointer',
    background: active ? 'var(--t-primary)' : 'transparent',
    color:      active ? '#fff' : 'var(--t-muted)',
    transition: 'background 0.14s, color 0.14s',
  })

  return (
    <div className="max-w-[1280px] mx-auto px-9 py-7">
      {toast && (
        <div className="fixed top-4 right-4 z-50 px-4 py-2.5 bg-gray-900 text-white text-xs font-medium rounded-lg shadow-lg">
          {toast}
        </div>
      )}

      <Breadcrumb crumbs={[{ label: 'Admin' }, { label: 'Billing' }]} />

      <div className="flex items-start justify-between mb-[22px]">
        <div>
          <h1 className="text-[34px] font-bold tracking-[-0.025em] text-t-ink m-0" style={{ fontFamily: 'var(--font-display)' }}>
            Billing
          </h1>
          <p className="text-[14.5px] text-t-muted mt-[5px]">Payment records</p>
        </div>
        {tab === 'clients' && (
          <button
            onClick={() => setModalTarget({})}
            className="flex items-center gap-2 rounded-[12px] px-5 py-3 text-[14px] font-bold text-white mt-1 cursor-pointer border-0"
            style={{
              background: 'linear-gradient(150deg, var(--t-primary), var(--t-primary-deep))',
              boxShadow: '0 12px 22px -12px var(--t-primary)',
            }}
          >
            + Receive Payment
          </button>
        )}
      </div>

      {!paymentsLoading && (
        <div className="flex gap-[14px] mb-[22px]">
          <SummaryCard label="Total Payments" value={String(allPayments.length)} subnote="clients, all time" />
          <SummaryCard label="Total Received" value={fmtCurrency(totalReceived)} subnote="clients, all time" valueStyle={{ color: 'var(--t-tier-ready-fg)' }} />
          <SummaryCard label="This Month" value={fmtCurrency(thisMonth)} subnote={`${now.toLocaleString('en-US', { month: 'long' })} ${now.getFullYear()}`} valueStyle={{ color: 'var(--t-primary)' }} />
          <SummaryCard label="Active Clients" value={String(activeClients)} subnote="with payments on record" />
        </div>
      )}

      {/* Table card */}
      <div style={{ background: 'var(--t-card)', border: '1px solid var(--t-line)', borderRadius: 20, overflow: 'hidden', boxShadow: 'var(--t-shadow)' }}>

        {/* Card header with tab strip */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 24px', borderBottom: '1px solid var(--t-line)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} style={{ color: 'var(--t-primary)', flexShrink: 0 }}>
              <rect x="1" y="4" width="22" height="16" rx="2" ry="2"/>
              <line x1="1" y1="10" x2="23" y2="10"/>
            </svg>
            <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 16, color: 'var(--t-ink)' }}>Billing</span>
          </div>
          <div style={{ display: 'flex', gap: 4, background: 'var(--t-card-alt)', borderRadius: 10, padding: 4 }}>
            <button style={tabStyle(tab === 'clients')} onClick={() => setTab('clients')}>Clients</button>
            <button style={tabStyle(tab === 'accountants')} onClick={() => setTab('accountants')}>Accountants</button>
          </div>
        </div>

        {/* ── CLIENTS TAB ─────────────────────────────────────────────────── */}
        {tab === 'clients' && (() => {
          const COLS = 'minmax(160px, 2fr) 130px 130px 150px minmax(100px, 1fr)'
          const COL_HEADERS: { label: string; align: CSSProperties['textAlign']; color: string }[] = [
            { label: 'Client',        align: 'left',  color: 'var(--t-faint)' },
            { label: 'Amount',        align: 'right', color: 'var(--t-tier-ready-fg)' },
            { label: 'Date Received', align: 'left',  color: 'var(--t-faint)' },
            { label: 'Reference',     align: 'left',  color: 'var(--t-faint)' },
            { label: 'Recorded By',   align: 'left',  color: 'var(--t-faint)' },
          ]

          return (
            <>
              {/* Filter bar */}
              <div className="flex gap-2.5 items-center px-6 py-3 border-b border-t-line flex-wrap">
                <select
                  value={clientFilter}
                  onChange={(e) => { setClientFilter(e.target.value); setPage(1) }}
                  className="h-10 pl-3.5 pr-9 rounded-[11px] border-[1.5px] border-t-line bg-t-card text-[13.5px] font-semibold text-t-ink appearance-none"
                >
                  <option value="">All Clients</option>
                  {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
                <input
                  type="date" value={start}
                  onChange={(e) => { setStart(e.target.value); setPage(1) }}
                  className="h-10 px-3 border-[1.5px] border-t-line rounded-[11px] text-[13.5px] font-semibold text-t-muted bg-t-card"
                />
                <span className="text-sm text-t-faint">–</span>
                <input
                  type="date" value={end}
                  onChange={(e) => { setEnd(e.target.value); setPage(1) }}
                  className="h-10 px-3 border-[1.5px] border-t-line rounded-[11px] text-[13.5px] font-semibold text-t-muted bg-t-card"
                />
                <div className="flex-1" />
                <span className="text-[13px] text-t-muted font-medium">{total} payments</span>
              </div>

              {paymentsLoading ? (
                <div style={{ padding: 32, textAlign: 'center', fontSize: 14, color: 'var(--t-faint)' }}>Loading…</div>
              ) : allPayments.length === 0 ? (
                <div style={{ padding: 32, textAlign: 'center', fontSize: 14, color: 'var(--t-faint)' }}>No payment records found.</div>
              ) : (
                <>
                  <div style={{ display: 'grid', gridTemplateColumns: COLS, columnGap: 16, padding: '12px 24px', borderBottom: '1px solid var(--t-line)' }}>
                    {COL_HEADERS.map(({ label, align, color }) => (
                      <span key={label} style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.06em', color, textAlign: align, overflow: 'hidden', whiteSpace: 'nowrap' }}>
                        {label}
                      </span>
                    ))}
                  </div>
                  {pageItems.map((r, i) => {
                    const isHovered = hoveredId === r.id
                    const rowBg = isHovered ? 'var(--t-primary-soft)' : i % 2 === 1 ? 'var(--t-card-alt)' : 'transparent'
                    return (
                      <div
                        key={r.id}
                        onMouseEnter={() => setHoveredId(r.id)}
                        onMouseLeave={() => setHoveredId(null)}
                        style={{ display: 'grid', gridTemplateColumns: COLS, columnGap: 16, padding: '13px 24px', alignItems: 'center', borderBottom: '1px solid var(--t-line-soft)', transition: 'background 0.14s', background: rowBg }}
                      >
                        <span style={{ fontWeight: 700, fontSize: 13.5, color: 'var(--t-ink)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', paddingRight: 12 }}>{r.companyName ?? r.companyId}</span>
                        <span style={{ textAlign: 'right', fontWeight: 700, fontSize: 14, color: 'var(--t-tier-ready-fg)', fontVariantNumeric: 'tabular-nums' }}>{fmtAmount(r.amount)}</span>
                        <span style={{ fontSize: 13.5, color: 'var(--t-muted)', fontWeight: 500 }}>{fmtDate(r.dateReceived)}</span>
                        <span style={{ fontSize: 13.5, color: 'var(--t-muted)', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.referenceNumber}</span>
                        <span style={{ fontSize: 13, color: 'var(--t-faint)', fontStyle: 'italic', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.recordedBy ?? '—'}</span>
                      </div>
                    )
                  })}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 24px', borderTop: '2px solid var(--t-line)', background: 'var(--t-card-alt)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
                      <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--t-muted)' }}>{from}–{to} of {total} payments</span>
                      <span style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 15, color: 'var(--t-tier-ready-fg)', fontVariantNumeric: 'tabular-nums' }}>{fmtCurrency(totalReceived)}</span>
                    </div>
                    {totalPages > 1 && (
                      <div style={{ display: 'flex', gap: 4 }}>
                        <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={safePage === 1} style={{ width: 28, height: 28, border: '1px solid var(--t-line)', borderRadius: 8, fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--t-card)', color: 'var(--t-muted)', cursor: 'pointer', opacity: safePage === 1 ? 0.4 : 1 }}>‹</button>
                        {pageNums.map((pg) => (
                          <button key={pg} onClick={() => setPage(pg)} style={{ width: 28, height: 28, borderRadius: 8, fontSize: 13, fontWeight: pg === safePage ? 700 : 500, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', background: pg === safePage ? 'var(--t-primary)' : 'var(--t-card)', color: pg === safePage ? '#fff' : 'var(--t-muted)', border: pg === safePage ? '1px solid var(--t-primary)' : '1px solid var(--t-line)' }}>{pg}</button>
                        ))}
                        {pageNums[pageNums.length - 1] < totalPages && (
                          <>
                            <span style={{ width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, color: 'var(--t-faint)' }}>…</span>
                            <button onClick={() => setPage(totalPages)} style={{ width: 28, height: 28, border: '1px solid var(--t-line)', borderRadius: 8, fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--t-card)', color: 'var(--t-muted)', cursor: 'pointer' }}>{totalPages}</button>
                          </>
                        )}
                        <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={safePage === totalPages} style={{ width: 28, height: 28, border: '1px solid var(--t-line)', borderRadius: 8, fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--t-card)', color: 'var(--t-muted)', cursor: 'pointer', opacity: safePage === totalPages ? 0.4 : 1 }}>›</button>
                      </div>
                    )}
                  </div>
                </>
              )}
            </>
          )
        })()}

        {/* ── ACCOUNTANTS TAB ─────────────────────────────────────────────── */}
        {tab === 'accountants' && (() => {
          const COLS = 'minmax(160px, 2fr) minmax(180px, 2fr) 140px 130px 120px'
          const COL_HEADERS: { label: string; align: CSSProperties['textAlign'] }[] = [
            { label: 'Accountant',    align: 'left'  },
            { label: 'Email',         align: 'left'  },
            { label: 'Last Payment',  align: 'left'  },
            { label: 'Last Amount',   align: 'right' },
            { label: '',              align: 'right' },
          ]

          return (
            <>
              {accountantsLoading ? (
                <div style={{ padding: 32, textAlign: 'center', fontSize: 14, color: 'var(--t-faint)' }}>Loading…</div>
              ) : allAccountants.length === 0 ? (
                <div style={{ padding: 32, textAlign: 'center', fontSize: 14, color: 'var(--t-faint)' }}>No accountants found.</div>
              ) : (
                <>
                  <div style={{ display: 'grid', gridTemplateColumns: COLS, columnGap: 16, padding: '12px 24px', borderBottom: '1px solid var(--t-line)' }}>
                    {COL_HEADERS.map(({ label, align }) => (
                      <span key={label} style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.06em', color: 'var(--t-faint)', textAlign: align, overflow: 'hidden', whiteSpace: 'nowrap' }}>
                        {label}
                      </span>
                    ))}
                  </div>
                  {allAccountants.map((a: AccountantBillingRow, i: number) => {
                    const isHovered = hoveredId === a.userId
                    const rowBg = isHovered ? 'var(--t-primary-soft)' : i % 2 === 1 ? 'var(--t-card-alt)' : 'transparent'
                    return (
                      <div
                        key={a.userId}
                        onMouseEnter={() => setHoveredId(a.userId)}
                        onMouseLeave={() => setHoveredId(null)}
                        style={{ display: 'grid', gridTemplateColumns: COLS, columnGap: 16, padding: '13px 24px', alignItems: 'center', borderBottom: '1px solid var(--t-line-soft)', transition: 'background 0.14s', background: rowBg }}
                      >
                        <span style={{ fontWeight: 700, fontSize: 13.5, color: 'var(--t-ink)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.name}</span>
                        <span style={{ fontSize: 13, color: 'var(--t-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.email}</span>
                        <span style={{ fontSize: 13.5, color: 'var(--t-muted)', fontWeight: 500 }}>{fmtDate(a.lastPaymentDate)}</span>
                        <span style={{ textAlign: 'right', fontWeight: 700, fontSize: 14, color: 'var(--t-tier-ready-fg)', fontVariantNumeric: 'tabular-nums' }}>
                          {a.lastPaymentAmount ? fmtAmount(a.lastPaymentAmount) : '—'}
                        </span>
                        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                          <button
                            onClick={() => setModalTarget({ userId: a.userId, accountantName: a.name })}
                            style={{ fontSize: 11.5, fontWeight: 700, padding: '5px 12px', borderRadius: 8, border: '1px solid var(--t-primary)', color: 'var(--t-primary)', background: 'var(--t-primary-soft)', cursor: 'pointer', whiteSpace: 'nowrap', fontFamily: 'inherit' }}
                          >
                            + Receive
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </>
              )}
            </>
          )
        })()}
      </div>

      {/* Payment modal */}
      {modalTarget !== null && (
        <PaymentModal
          clients={clients.map((c) => ({ id: c.id, name: c.name }))}
          userId={modalTarget.userId}
          accountantName={modalTarget.accountantName}
          onClose={() => setModalTarget(null)}
          onSuccess={() => {
            setModalTarget(null)
            if (modalTarget.userId) {
              qc.invalidateQueries({ queryKey: ['admin-accountant-billing'] })
            } else {
              qc.invalidateQueries({ queryKey: ['admin-payments'] })
            }
            showToast('Payment recorded.')
          }}
        />
      )}
    </div>
  )
}
```

- [ ] **Step 2: Type check**

```bash
cd frontend && npx tsc --noEmit 2>&1 | head -30
```

Expected: no errors.

- [ ] **Step 3: Start dev server and verify manually**

```bash
cd frontend && npm run dev
```

Check:
1. Navigate to `/admin/billing` — Clients tab shows existing payments table
2. Click Accountants tab — shows accountants list with last payment data
3. Click `+ Receive` on any accountant row — modal opens showing accountant name (read-only), no client dropdown, plan field absent
4. Fill amount, date, reference → Record Payment → success toast, row updates
5. Switch back to Clients tab → `+ Receive Payment` header button opens modal with client dropdown

- [ ] **Step 4: Commit**

```bash
git add frontend/src/app/admin/billing/page.tsx
git commit -m "feat: add Clients/Accountants tab strip and accountant payment flow to billing page"
```

---

## Self-Review

**Spec coverage:**
- ✅ `user_id` nullable FK added to `payments` — Task 1
- ✅ `company_id` made nullable — Task 1
- ✅ `Payment::user()` relationship — Task 2
- ✅ `plan` retired from UI, hardcoded to `'starter'` in both `receivePayment` and `receiveAccountantPayment` — Task 3
- ✅ 3 new routes under `/admin/billing/accountants` — Task 4 (route ordering: `accountants` before `{clientId}`)
- ✅ `accountantIndex` queries `role='accountant'` users — Task 3
- ✅ `AccountantBillingRow` and `AccountantPaymentRecord` types — Task 5
- ✅ 3 new API functions — Task 6
- ✅ Clients/Accountants tab strip on billing page — Task 7
- ✅ Each accountant row has `+ Receive` button — Task 7
- ✅ `PaymentModal` handles both client and accountant flows via optional `userId` prop — Task 7
- ✅ Header `+ Receive Payment` button hidden on Accountants tab — Task 7

**Placeholder scan:** None found.

**Type consistency:**
- `AccountantBillingRow.userId` (Task 5) → used as `a.userId` in billing page (Task 7) ✅
- `ReceivePaymentData` exported from `billing.ts` (Task 6) → imported in billing page (Task 7) ✅
- `receiveAccountantPayment(userId, payload)` signature (Task 6) → called with `(userId!, payload)` in modal (Task 7) ✅
