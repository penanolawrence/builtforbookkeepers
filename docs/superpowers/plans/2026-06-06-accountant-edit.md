# Accountant Edit Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the accountant detail modal's info card editable with a Save Changes button, and add an optional phone field to the invite modal.

**Architecture:** Backend gets a new `PUT /admin/accountants/{id}` route + `AccountantController@update`. Frontend adds `updateAccountant` to the API layer, then wires the detail mode info card into a `react-hook-form` form (pre-populated via `useEffect` + `reset`) and adds a mobile field to invite mode.

**Tech Stack:** Laravel 11 (backend), Next.js 14, TypeScript, TanStack Query v5, react-hook-form + zod (frontend)

---

## File Map

| Action | Path |
|--------|------|
| **Create** | `backend/app/Http/Requests/Admin/UpdateAccountantRequest.php` |
| **Modify** | `backend/app/Http/Controllers/Admin/AccountantController.php` |
| **Modify** | `backend/app/Http/Requests/Admin/CreateAccountantRequest.php` |
| **Modify** | `backend/routes/api.php` |
| **Create** | `backend/tests/Feature/AccountantUpdateTest.php` |
| **Modify** | `frontend/src/lib/api/admin/accountants.ts` |
| **Modify** | `frontend/src/components/admin/AccountantModal.tsx` |
| **Modify** | `frontend/src/components/admin/__tests__/AccountantModal.test.tsx` |

---

## Task 1: Backend — update endpoint

**Files:**
- Create: `backend/app/Http/Requests/Admin/UpdateAccountantRequest.php`
- Modify: `backend/app/Http/Controllers/Admin/AccountantController.php`
- Modify: `backend/app/Http/Requests/Admin/CreateAccountantRequest.php`
- Modify: `backend/routes/api.php`
- Create: `backend/tests/Feature/AccountantUpdateTest.php`

- [ ] **Step 1: Write the failing test**

Create `backend/tests/Feature/AccountantUpdateTest.php`:

```php
<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AccountantUpdateTest extends TestCase
{
    use RefreshDatabase;

    private User $admin;
    private User $accountant;

    protected function setUp(): void
    {
        parent::setUp();
        $this->admin = User::factory()->create(['role' => 'admin']);
        $this->accountant = User::factory()->create([
            'role'   => 'accountant',
            'name'   => 'Old Name',
            'email'  => 'old@example.com',
            'mobile' => null,
        ]);
    }

    public function test_admin_can_update_accountant(): void
    {
        $response = $this->actingAs($this->admin)
            ->putJson("/api/admin/accountants/{$this->accountant->id}", [
                'name'   => 'New Name',
                'email'  => 'new@example.com',
                'mobile' => '+63 917 555 1234',
            ]);

        $response->assertOk()
            ->assertJsonFragment([
                'name'   => 'New Name',
                'email'  => 'new@example.com',
                'mobile' => '+63 917 555 1234',
            ]);

        $this->assertDatabaseHas('users', [
            'id'     => $this->accountant->id,
            'name'   => 'New Name',
            'email'  => 'new@example.com',
            'mobile' => '+63 917 555 1234',
        ]);
    }

    public function test_can_save_same_email_as_own(): void
    {
        $response = $this->actingAs($this->admin)
            ->putJson("/api/admin/accountants/{$this->accountant->id}", [
                'name'  => 'New Name',
                'email' => 'old@example.com',
            ]);

        $response->assertOk();
    }

    public function test_duplicate_email_of_another_user_fails(): void
    {
        User::factory()->create(['email' => 'taken@example.com']);

        $response = $this->actingAs($this->admin)
            ->putJson("/api/admin/accountants/{$this->accountant->id}", [
                'name'  => 'New Name',
                'email' => 'taken@example.com',
            ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['email']);
    }

    public function test_mobile_is_optional(): void
    {
        $response = $this->actingAs($this->admin)
            ->putJson("/api/admin/accountants/{$this->accountant->id}", [
                'name'  => 'New Name',
                'email' => 'new@example.com',
            ]);

        $response->assertOk();
    }

    public function test_name_is_required(): void
    {
        $response = $this->actingAs($this->admin)
            ->putJson("/api/admin/accountants/{$this->accountant->id}", [
                'email' => 'new@example.com',
            ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['name']);
    }
}
```

- [ ] **Step 2: Run the test to confirm it fails**

```bash
cd backend && php artisan test tests/Feature/AccountantUpdateTest.php
```

Expected: FAIL — route not found (404 or method not allowed).

- [ ] **Step 3: Create `UpdateAccountantRequest`**

Create `backend/app/Http/Requests/Admin/UpdateAccountantRequest.php`:

```php
<?php

namespace App\Http\Requests\Admin;

use Illuminate\Foundation\Http\FormRequest;

class UpdateAccountantRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        $id = $this->route('id');
        return [
            'name'   => ['required', 'string', 'max:255'],
            'email'  => ['required', 'email', 'unique:users,email,' . $id],
            'mobile' => ['nullable', 'string', 'max:50'],
        ];
    }
}
```

- [ ] **Step 4: Add `update` method to `AccountantController`**

Open `backend/app/Http/Controllers/Admin/AccountantController.php`.

Add the import at the top (after existing use statements):
```php
use App\Http\Requests\Admin\UpdateAccountantRequest;
```

Add `update` method after `store`:
```php
public function update(UpdateAccountantRequest $request, string $id): JsonResponse
{
    $accountant = User::where('role', 'accountant')->findOrFail($id);
    $accountant->update($request->validated());

    return response()->json([
        'id'     => $accountant->id,
        'name'   => $accountant->name,
        'email'  => $accountant->email,
        'mobile' => $accountant->mobile,
    ]);
}
```

- [ ] **Step 5: Add mobile to `CreateAccountantRequest` and `store`**

Replace `backend/app/Http/Requests/Admin/CreateAccountantRequest.php` with:

```php
<?php

namespace App\Http\Requests\Admin;

use Illuminate\Foundation\Http\FormRequest;

class CreateAccountantRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'name'   => ['required', 'string', 'max:255'],
            'email'  => ['required', 'email', 'unique:users,email'],
            'mobile' => ['nullable', 'string', 'max:50'],
        ];
    }
}
```

In `AccountantController::store`, update the `User::create` call to include mobile:

```php
$user = User::create([
    'name'     => $request->name,
    'email'    => $request->email,
    'mobile'   => $request->mobile,
    'password' => bcrypt(Str::random(32)),
    'role'     => 'accountant',
    'status'   => 'active',
]);
```

- [ ] **Step 6: Add PUT route**

In `backend/routes/api.php`, after the existing accountant routes (around line 113), add:

```php
Route::put('/admin/accountants/{id}',             [Admin\AccountantController::class, 'update']);
```

- [ ] **Step 7: Run tests to confirm they pass**

```bash
cd backend && php artisan test tests/Feature/AccountantUpdateTest.php
```

Expected: 5 tests, 5 passed.

- [ ] **Step 8: Commit**

```bash
git add backend/app/Http/Requests/Admin/UpdateAccountantRequest.php \
        backend/app/Http/Requests/Admin/CreateAccountantRequest.php \
        backend/app/Http/Controllers/Admin/AccountantController.php \
        backend/routes/api.php \
        backend/tests/Feature/AccountantUpdateTest.php
git commit -m "feat: add PUT /admin/accountants/:id update endpoint; add mobile to invite"
```

---

## Task 2: Frontend API layer

**Files:**
- Modify: `frontend/src/lib/api/admin/accountants.ts`

- [ ] **Step 1: Update the API file**

Replace the entire content of `frontend/src/lib/api/admin/accountants.ts` with:

```ts
import api from '../client'
import type { Accountant } from '@/types/admin'

export async function getAccountants(): Promise<Accountant[]> {
  const { data } = await api.get<Accountant[]>('/admin/accountants')
  return data
}

export async function getAccountant(id: string): Promise<Accountant & {
  assignedClients: {
    id: string
    name: string
    email: string | null
    plan: string
    birType: string
    clientStatus: string | null
    redCount: number
  }[]
  yellowCount: number
  greenCount: number
  createdAt: string | null
}> {
  const { data } = await api.get(`/admin/accountants/${id}`)
  return data
}

export async function createAccountant(data: {
  name: string
  email: string
  mobile?: string
}): Promise<{ userId: string }> {
  const { data: result } = await api.post<{ userId: string }>('/admin/accountants', data)
  return result
}

export async function updateAccountant(
  id: string,
  data: { name: string; email: string; mobile?: string | null }
): Promise<{ id: string; name: string; email: string; mobile: string | null }> {
  const { data: result } = await api.put(`/admin/accountants/${id}`, data)
  return result
}

export async function resetAccountantPassword(id: string): Promise<void> {
  await api.post(`/admin/accountants/${id}/reset-password`)
}

export async function deactivateAccountant(
  id: string,
  replacementAccountantId?: string
): Promise<void> {
  await api.post(`/admin/accountants/${id}/deactivate`, { replacementAccountantId })
}
```

- [ ] **Step 2: Verify TypeScript**

```bash
cd frontend && npx tsc --noEmit 2>&1 | head -20
```

Expected: no new errors.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/lib/api/admin/accountants.ts
git commit -m "feat: add updateAccountant API function; add mobile to createAccountant"
```

---

## Task 3: Frontend UI — editable detail + invite phone field

**Files:**
- Modify: `frontend/src/components/admin/AccountantModal.tsx`
- Modify: `frontend/src/components/admin/__tests__/AccountantModal.test.tsx`

- [ ] **Step 1: Update `AccountantModal.tsx`**

Replace the entire file with:

```tsx
'use client'

import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  getAccountant, getAccountants, createAccountant,
  updateAccountant, resetAccountantPassword, deactivateAccountant,
} from '@/lib/api/admin/accountants'
import type { Accountant } from '@/types/admin'

export type AccountantModalProps =
  | { mode: 'detail'; accountantId: string; onClose: () => void }
  | { mode: 'invite'; onClose: () => void }

const STATUS_TIER: Record<string, string> = {
  ACTIVE: 'ready', INACTIVE: 'pending', PENDING_INVITE: 'check', SUSPENDED: 'review',
}
const STATUS_LABEL: Record<string, string> = {
  ACTIVE: 'Active', INACTIVE: 'Inactive', PENDING_INVITE: 'Pending Invite', SUSPENDED: 'Suspended',
}
const CLIENT_STATUS_TIER: Record<string, string> = {
  ACTIVE: 'ready', OVERDUE: 'check', SUSPENDED: 'review', INACTIVE: 'pending',
}

function getInitials(name: string) {
  return name.split(' ').slice(0, 2).map((w) => w[0] ?? '').join('').toUpperCase()
}

function fmtDate(iso: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

// ─── Invite mode ────────────────────────────────────────────────────────────

const inviteSchema = z.object({
  name:   z.string().min(1, 'Required'),
  email:  z.string().email('Invalid email'),
  mobile: z.string().optional(),
})
type InviteForm = z.infer<typeof inviteSchema>

function InviteMode({ onClose }: { onClose: () => void }) {
  const [successEmail, setSuccessEmail] = useState<string | null>(null)
  const [submitError, setSubmitError]   = useState<string | null>(null)
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<InviteForm>({ resolver: zodResolver(inviteSchema) })

  const onSubmit = async (data: InviteForm) => {
    try {
      await createAccountant(data)
      setSuccessEmail(data.email)
    } catch {
      setSubmitError('Failed to send invite. Please try again.')
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/35">
      <div className="bg-t-card rounded-xl shadow-2xl w-full max-w-sm overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-t-line">
          <span className="text-[15px] font-bold text-t-ink">Invite Accountant</span>
          <button aria-label="Close modal" onClick={onClose} className="text-t-faint hover:text-t-muted text-xl leading-none">×</button>
        </div>
        <div className="p-5">
          {successEmail ? (
            <div className="space-y-4">
              <p className="text-sm text-t-muted">
                Invite sent to <span className="font-semibold text-t-ink">{successEmail}</span>.
              </p>
              <button
                onClick={onClose}
                className="text-xs font-semibold px-3.5 py-2 border border-t-line rounded-md text-t-muted hover:bg-t-surface w-full"
              >
                Close
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-1">
                <label className="block text-xs font-semibold text-t-muted">Full Name *</label>
                <input
                  {...register('name')}
                  className="w-full border border-t-line rounded-md px-3 py-2 text-sm text-t-ink bg-t-card"
                />
                {errors.name && <p className="text-xs text-red-600">{errors.name.message}</p>}
              </div>
              <div className="space-y-1">
                <label className="block text-xs font-semibold text-t-muted">Email *</label>
                <input
                  type="email"
                  {...register('email')}
                  className="w-full border border-t-line rounded-md px-3 py-2 text-sm text-t-ink bg-t-card"
                />
                {errors.email && <p className="text-xs text-red-600">{errors.email.message}</p>}
              </div>
              <div className="space-y-1">
                <label className="block text-xs font-semibold text-t-muted">Phone / Mobile</label>
                <input
                  {...register('mobile')}
                  className="w-full border border-t-line rounded-md px-3 py-2 text-sm text-t-ink bg-t-card"
                />
              </div>
              {submitError && <p className="text-xs text-red-600">{submitError}</p>}
              <div className="flex gap-2 justify-end pt-1">
                <button
                  type="button"
                  onClick={onClose}
                  className="text-xs font-semibold px-3.5 py-2 border border-t-line rounded-md text-t-muted hover:bg-t-surface"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="text-xs font-semibold px-3.5 py-2 rounded-md text-white disabled:opacity-50"
                  style={{
                    background: 'linear-gradient(150deg, var(--t-primary), var(--t-primary-deep))',
                    boxShadow: '0 8px 16px -8px var(--t-primary)',
                  }}
                >
                  {isSubmitting ? 'Sending…' : 'Send Invite'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Detail mode ─────────────────────────────────────────────────────────────

const editSchema = z.object({
  name:   z.string().min(1, 'Required'),
  email:  z.string().email('Invalid email'),
  mobile: z.string().optional(),
})
type EditForm = z.infer<typeof editSchema>

function DetailMode({ accountantId, onClose }: { accountantId: string; onClose: () => void }) {
  const qc = useQueryClient()
  const [deactivateOpen, setDeactivateOpen] = useState(false)
  const [replacementId, setReplacementId]   = useState('')
  const [toast, setToast]                   = useState<string | null>(null)
  const [saveError, setSaveError]           = useState<string | null>(null)

  const { data: accountant, isLoading } = useQuery({
    queryKey: ['admin-accountant', accountantId],
    queryFn:  () => getAccountant(accountantId),
  })

  const { data: allAccountants } = useQuery({
    queryKey: ['accountants'],
    queryFn:  getAccountants,
    enabled:  deactivateOpen,
  })

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<EditForm>({
    resolver: zodResolver(editSchema),
    defaultValues: { name: '', email: '', mobile: '' },
  })

  useEffect(() => {
    if (accountant) {
      reset({
        name:   accountant.name,
        email:  accountant.email,
        mobile: accountant.mobile ?? '',
      })
    }
  }, [accountant, reset])

  const showToast = (msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(null), 3000)
  }

  const updateMut = useMutation({
    mutationFn: (data: EditForm) => updateAccountant(accountantId, {
      name:   data.name,
      email:  data.email,
      mobile: data.mobile || null,
    }),
    onSuccess: (updated) => {
      qc.invalidateQueries({ queryKey: ['admin-accountant', accountantId] })
      qc.invalidateQueries({ queryKey: ['accountants'] })
      reset({ name: updated.name, email: updated.email, mobile: updated.mobile ?? '' })
      setSaveError(null)
      showToast('Changes saved.')
    },
    onError: () => setSaveError('Failed to save changes. Please try again.'),
  })

  const resetMut = useMutation({
    mutationFn: () => resetAccountantPassword(accountantId),
    onSuccess:  () => showToast('Password reset email sent.'),
  })

  const deactivateMut = useMutation({
    mutationFn: () => deactivateAccountant(accountantId, replacementId || undefined),
    onSuccess:  () => {
      qc.invalidateQueries({ queryKey: ['accountants'] })
      onClose()
    },
  })

  const otherActive = (allAccountants ?? []).filter((a: Accountant) => a.status === 'ACTIVE' && a.id !== accountantId)
  const clients     = accountant?.assignedClients ?? []
  const hasClients  = clients.length > 0
  const tier        = accountant ? (STATUS_TIER[accountant.status] ?? 'pending') : 'pending'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 p-4">
      <div className="bg-t-card rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">

        {/* Header */}
        <div className="flex items-center gap-3 px-6 py-4 border-b border-t-line flex-shrink-0">
          {accountant && (
            <span style={{
              width: 36, height: 36, borderRadius: 10, flexShrink: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 12,
              background: 'var(--t-primary-soft)', color: 'var(--t-primary)',
              border: '1px solid var(--t-line)',
            }}>
              {getInitials(accountant.name)}
            </span>
          )}
          <div className="flex-1 min-w-0 flex items-center gap-2">
            <span className="text-[15px] font-bold text-t-ink truncate">{accountant?.name ?? '…'}</span>
            {accountant && (
              <span style={{
                display: 'inline-flex', padding: '3px 10px', borderRadius: 999,
                fontSize: 11.5, fontWeight: 700, whiteSpace: 'nowrap',
                background: `var(--t-tier-${tier}-bg)`,
                color:      `var(--t-tier-${tier}-fg)`,
                border:     `1px solid var(--t-tier-${tier}-ring)`,
              }}>
                {STATUS_LABEL[accountant.status] ?? accountant.status}
              </span>
            )}
          </div>
          <button
            aria-label="Close modal"
            onClick={onClose}
            className="text-t-faint hover:text-t-muted text-xl leading-none flex-shrink-0"
          >
            ×
          </button>
        </div>

        {/* Toast bar */}
        {toast && (
          <div className="px-6 py-2 bg-gray-900 text-white text-xs font-medium text-center flex-shrink-0">
            {toast}
          </div>
        )}

        {/* Scrollable body */}
        <div className="overflow-y-auto flex-1 p-6">
          {isLoading ? (
            <div className="text-sm text-t-faint text-center py-8">Loading…</div>
          ) : !accountant ? (
            <div className="text-sm text-red-600 text-center py-8">Accountant not found.</div>
          ) : (
            <>
              {/* Two-column: info + sidebar */}
              <div className="grid gap-5 mb-5" style={{ gridTemplateColumns: '1fr 260px' }}>

                {/* Info card — editable form */}
                <form
                  onSubmit={handleSubmit((data) => updateMut.mutate(data))}
                  className="bg-t-card border border-t-line rounded-lg p-5"
                >
                  <div className="text-xs font-bold text-t-muted uppercase tracking-wide pb-3 mb-4 border-b border-t-line">
                    Accountant Information
                  </div>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs font-semibold text-t-muted mb-1.5">Full Name *</label>
                      <input
                        {...register('name')}
                        className="w-full border border-t-line rounded-md px-3 py-2 text-sm text-t-ink bg-t-card"
                      />
                      {errors.name && <p className="text-xs text-red-600 mt-1">{errors.name.message}</p>}
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-t-muted mb-1.5">Email Address *</label>
                      <input
                        type="email"
                        {...register('email')}
                        className="w-full border border-t-line rounded-md px-3 py-2 text-sm text-t-ink bg-t-card"
                      />
                      {errors.email && <p className="text-xs text-red-600 mt-1">{errors.email.message}</p>}
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-t-muted mb-1.5">Phone / Mobile</label>
                      <input
                        {...register('mobile')}
                        className="w-full border border-t-line rounded-md px-3 py-2 text-sm text-t-ink bg-t-card"
                      />
                    </div>
                  </div>
                  {saveError && <p className="text-xs text-red-600 mt-3">{saveError}</p>}
                  <div className="mt-4 pt-3 border-t border-t-line">
                    <button
                      type="submit"
                      disabled={isSubmitting || !isDirty}
                      className="text-xs font-semibold px-4 py-2 rounded-md text-white disabled:opacity-50 transition-colors"
                      style={{
                        background: 'linear-gradient(150deg, var(--t-primary), var(--t-primary-deep))',
                        boxShadow: '0 8px 16px -8px var(--t-primary)',
                      }}
                    >
                      {isSubmitting ? 'Saving…' : 'Save Changes'}
                    </button>
                  </div>
                </form>

                {/* Sidebar */}
                <div className="flex flex-col gap-3">
                  <div className="bg-t-card border border-t-line rounded-lg p-4">
                    <div className="text-[11px] font-bold text-t-faint uppercase tracking-wide mb-3">Account Status</div>
                    <div className="flex items-center justify-between">
                      <span style={{
                        display: 'inline-flex', padding: '4px 12px', borderRadius: 999,
                        fontSize: 12.5, fontWeight: 700,
                        background: `var(--t-tier-${tier}-bg)`,
                        color:      `var(--t-tier-${tier}-fg)`,
                        border:     `1px solid var(--t-tier-${tier}-ring)`,
                      }}>
                        {STATUS_LABEL[accountant.status] ?? accountant.status}
                      </span>
                      <span className="text-[11px] text-t-faint">Since {fmtDate(accountant.createdAt ?? null)}</span>
                    </div>
                  </div>

                  <div className="bg-t-card border border-t-line rounded-lg p-4">
                    <div className="text-[11px] font-bold text-t-faint uppercase tracking-wide mb-3">Workload</div>
                    <div className="grid grid-cols-3 gap-2 text-center">
                      <div className="bg-t-surface border border-t-line rounded-lg py-2.5 px-1">
                        <div className="text-xl font-extrabold text-t-ink leading-none">{accountant.clientCount ?? clients.length}</div>
                        <div className="text-[10px] text-t-faint mt-1">Clients</div>
                      </div>
                      <div className="bg-red-50 border border-red-100 rounded-lg py-2.5 px-1">
                        <div className="text-xl font-extrabold text-red-600 leading-none">{accountant.redCount ?? 0}</div>
                        <div className="text-[10px] text-t-faint mt-1">Open RED</div>
                      </div>
                      <div className="bg-t-primary-soft border border-t-line rounded-lg py-2.5 px-1">
                        <div className="text-xl font-extrabold text-t-primary leading-none">{accountant.pendingEntries ?? 0}</div>
                        <div className="text-[10px] text-t-faint mt-1">Pending</div>
                      </div>
                    </div>
                  </div>

                  <div className="bg-t-card border border-t-line rounded-lg p-4">
                    <div className="text-[11px] font-bold text-t-faint uppercase tracking-wide mb-3">Actions</div>
                    <div className="flex flex-col gap-2">
                      <button
                        type="button"
                        onClick={() => resetMut.mutate()}
                        disabled={resetMut.isPending}
                        className="w-full text-left text-xs font-semibold px-3 py-2 border border-t-line rounded-md text-t-muted hover:bg-t-surface transition-colors disabled:opacity-50"
                      >
                        {resetMut.isPending ? 'Sending…' : '↺ Send Password Reset'}
                      </button>
                      <button
                        type="button"
                        onClick={() => { setDeactivateOpen(true); setReplacementId('') }}
                        className="w-full text-left text-xs font-semibold px-3 py-2 border border-red-200 rounded-md text-red-600 bg-red-50 hover:bg-red-100 transition-colors"
                      >
                        ✕ Deactivate Accountant
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Assigned clients */}
              <div className="bg-t-card border border-t-line rounded-lg overflow-hidden">
                <div className="px-4 py-3 border-b border-t-line">
                  <span className="text-[13px] font-semibold text-t-ink">
                    Assigned Clients <span className="font-normal text-t-faint ml-1">{clients.length}</span>
                  </span>
                </div>
                {clients.length === 0 ? (
                  <div className="p-6 text-sm text-t-faint text-center">No clients assigned.</div>
                ) : (
                  <table className="w-full border-collapse">
                    <thead>
                      <tr>
                        {['Business Name', 'Plan', 'Status', 'Open RED'].map((h) => (
                          <th key={h} className="bg-t-surface px-3 py-2 text-left text-[10px] font-bold text-t-muted uppercase tracking-wide border-b border-t-line whitespace-nowrap">
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {clients.map((c, i) => {
                        const statusTier = CLIENT_STATUS_TIER[c.clientStatus ?? ''] ?? 'pending'
                        return (
                          <tr key={c.id} className={i < clients.length - 1 ? 'border-b border-t-line' : ''}>
                            <td className="px-3 py-2">
                              <div className="text-xs font-medium text-t-ink">{c.name}</div>
                              {c.email && <div className="text-[11px] text-t-faint mt-0.5">{c.email}</div>}
                            </td>
                            <td className="px-3 py-2 text-[11px] text-t-muted capitalize">
                              {c.plan} · {c.birType === 'vat' ? 'VAT' : 'Non-VAT'}
                            </td>
                            <td className="px-3 py-2">
                              <span style={{
                                display: 'inline-flex', padding: '3px 9px', borderRadius: 999,
                                fontSize: 11.5, fontWeight: 700,
                                background: `var(--t-tier-${statusTier}-bg)`,
                                color:      `var(--t-tier-${statusTier}-fg)`,
                                border:     `1px solid var(--t-tier-${statusTier}-ring)`,
                              }}>
                                {c.clientStatus ?? '—'}
                              </span>
                            </td>
                            <td className="px-3 py-2">
                              {c.redCount > 0
                                ? <span className="inline-flex items-center text-[10px] font-bold px-1.5 py-0.5 rounded bg-red-100 text-red-800">{c.redCount}</span>
                                : <span className="inline-flex items-center text-[10px] font-semibold px-1.5 py-0.5 rounded bg-gray-100 text-t-muted">0</span>}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Deactivate overlay */}
      {deactivateOpen && accountant && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/35">
          <div className="bg-t-card rounded-xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-t-line">
              <span className="text-[15px] font-bold text-t-ink">Deactivate {accountant.name}</span>
              <button type="button" onClick={() => setDeactivateOpen(false)} className="text-t-faint hover:text-t-muted text-lg leading-none">×</button>
            </div>
            <div className="p-5">
              <p className="text-sm text-t-muted mb-4">
                {hasClients
                  ? <>This accountant has <strong>{clients.length} client{clients.length !== 1 ? 's' : ''}</strong>. Select a replacement accountant to transfer them before deactivating.</>
                  : <>Are you sure you want to deactivate <strong>{accountant.name}</strong>? This cannot be undone.</>}
              </p>
              {hasClients && (
                <div className="mb-4">
                  <label className="block text-xs font-semibold text-t-muted mb-1.5">
                    Replacement Accountant <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={replacementId}
                    onChange={(e) => setReplacementId(e.target.value)}
                    className="w-full border border-t-line rounded-md px-2.5 py-2 text-sm text-t-ink bg-t-card"
                  >
                    <option value="">Select replacement…</option>
                    {otherActive.map((a: Accountant) => (
                      <option key={a.id} value={a.id}>{a.name}</option>
                    ))}
                  </select>
                </div>
              )}
              {deactivateMut.isError && (
                <p className="text-xs text-red-600 mb-3">Failed to deactivate. Please try again.</p>
              )}
            </div>
            <div className="flex gap-2 justify-end px-5 py-3.5 border-t border-t-line">
              <button
                type="button"
                onClick={() => setDeactivateOpen(false)}
                className="text-xs font-semibold px-3.5 py-2 border border-t-line rounded-md text-t-muted hover:bg-t-surface"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => deactivateMut.mutate()}
                disabled={deactivateMut.isPending || (hasClients && !replacementId)}
                className="text-xs font-semibold px-3.5 py-2 bg-red-600 hover:bg-red-700 text-white rounded-md disabled:opacity-50 transition-colors"
              >
                {deactivateMut.isPending ? 'Deactivating…' : hasClients ? 'Transfer & Deactivate' : 'Deactivate'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Export ───────────────────────────────────────────────────────────────────

export function AccountantModal(props: AccountantModalProps) {
  if (props.mode === 'invite') return <InviteMode onClose={props.onClose} />
  return <DetailMode accountantId={props.accountantId} onClose={props.onClose} />
}
```

- [ ] **Step 2: Update the test file**

Replace `frontend/src/components/admin/__tests__/AccountantModal.test.tsx` with:

```tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { AccountantModal } from '../AccountantModal'

jest.mock('@tanstack/react-query', () => ({
  useQuery:       jest.fn(() => ({ data: undefined, isLoading: false })),
  useMutation:    jest.fn(() => ({ mutate: jest.fn(), isPending: false, isError: false })),
  useQueryClient: jest.fn(() => ({ invalidateQueries: jest.fn() })),
}))

jest.mock('@/lib/api/admin/accountants', () => ({
  getAccountant:           jest.fn(),
  getAccountants:          jest.fn(),
  createAccountant:        jest.fn().mockResolvedValue({ userId: 'u1' }),
  updateAccountant:        jest.fn().mockResolvedValue({ id: 'a1', name: 'Maria Santos', email: 'maria@example.ph', mobile: null }),
  resetAccountantPassword: jest.fn(),
  deactivateAccountant:    jest.fn(),
}))

function wrap(ui: React.ReactElement) {
  return render(<div data-theme="sofia">{ui}</div>)
}

// ─── Invite mode ──────────────────────────────────────────────────────────────

describe('AccountantModal — invite mode', () => {
  it('renders name, email, and phone inputs', () => {
    wrap(<AccountantModal mode="invite" onClose={jest.fn()} />)
    expect(screen.getByText('Invite Accountant')).toBeInTheDocument()
    expect(screen.getByText('Full Name *')).toBeInTheDocument()
    expect(screen.getByText('Email *')).toBeInTheDocument()
    expect(screen.getByText('Phone / Mobile')).toBeInTheDocument()
  })

  it('calls onClose when × is clicked', () => {
    const onClose = jest.fn()
    wrap(<AccountantModal mode="invite" onClose={onClose} />)
    fireEvent.click(screen.getByLabelText('Close modal'))
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('shows validation errors when submitted empty', async () => {
    wrap(<AccountantModal mode="invite" onClose={jest.fn()} />)
    fireEvent.click(screen.getByText('Send Invite'))
    await waitFor(() => {
      expect(screen.getAllByText('Required').length).toBeGreaterThan(0)
    })
  })
})

// ─── Detail mode ──────────────────────────────────────────────────────────────

describe('AccountantModal — detail mode', () => {
  it('renders loading state when isLoading is true', () => {
    const { useQuery } = require('@tanstack/react-query')
    ;(useQuery as jest.Mock).mockReturnValue({ data: undefined, isLoading: true })
    wrap(<AccountantModal mode="detail" accountantId="a1" onClose={jest.fn()} />)
    expect(screen.getByText('Loading…')).toBeInTheDocument()
  })

  it('renders "not found" when data is null', () => {
    const { useQuery } = require('@tanstack/react-query')
    ;(useQuery as jest.Mock).mockReturnValue({ data: null, isLoading: false })
    wrap(<AccountantModal mode="detail" accountantId="a1" onClose={jest.fn()} />)
    expect(screen.getByText('Accountant not found.')).toBeInTheDocument()
  })

  it('renders accountant name and Save Changes button when data loads', () => {
    const { useQuery } = require('@tanstack/react-query')
    ;(useQuery as jest.Mock)
      .mockReturnValueOnce({
        data: {
          id: 'a1', name: 'Maria Santos', email: 'maria@example.ph', mobile: null,
          status: 'ACTIVE', clientCount: 3, redCount: 1, pendingEntries: 0,
          createdAt: '2024-01-15T00:00:00Z', assignedClients: [],
        },
        isLoading: false,
      })
      .mockReturnValueOnce({ data: [], isLoading: false })
    wrap(<AccountantModal mode="detail" accountantId="a1" onClose={jest.fn()} />)
    expect(screen.getAllByText('Maria Santos').length).toBeGreaterThan(0)
    expect(screen.getByText('Save Changes')).toBeInTheDocument()
  })

  it('calls onClose when × is clicked', () => {
    const { useQuery } = require('@tanstack/react-query')
    ;(useQuery as jest.Mock).mockReturnValue({ data: undefined, isLoading: false })
    const onClose = jest.fn()
    wrap(<AccountantModal mode="detail" accountantId="a1" onClose={onClose} />)
    fireEvent.click(screen.getByLabelText('Close modal'))
    expect(onClose).toHaveBeenCalledTimes(1)
  })
})
```

- [ ] **Step 3: Run tests**

```bash
cd frontend && npx jest src/components/admin/__tests__/AccountantModal.test.tsx --no-coverage
```

Expected: all tests pass.

- [ ] **Step 4: Verify TypeScript**

```bash
cd frontend && npx tsc --noEmit 2>&1 | head -20
```

Expected: no new errors.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/admin/AccountantModal.tsx \
        frontend/src/components/admin/__tests__/AccountantModal.test.tsx
git commit -m "feat: editable accountant info card with Save Changes; add phone to invite form"
```

---

## Self-Review

**Spec coverage:**

| Spec requirement | Task |
|-----------------|------|
| Detail modal inputs editable (name, email, mobile) | Task 3 |
| Mobile always rendered (not conditional) | Task 3 |
| Save Changes button on info card | Task 3 |
| Save Changes calls `PUT /admin/accountants/{id}` | Task 3 (via `updateMut`) |
| On success: invalidate + toast "Changes saved." | Task 3 |
| On error: inline error below button | Task 3 |
| Invite modal: optional Phone / Mobile field | Task 3 |
| `PUT /admin/accountants/{id}` route | Task 1 |
| `AccountantController@update` with validation | Task 1 |
| Email unique ignoring self | Task 1 (`UpdateAccountantRequest`) |
| Mobile nullable | Task 1 |
| `store` accepts mobile | Task 1 |
| `updateAccountant` API function | Task 2 |
| `createAccountant` accepts optional mobile | Task 2 |
| Backend tests | Task 1 |
| Frontend tests updated | Task 3 |
