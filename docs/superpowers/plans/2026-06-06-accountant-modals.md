# Accountant Modals Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace page navigation on `/admin/accountants` with in-page modals — a detail modal on row click and an invite modal on "Invite Accountant", then delete the old route pages.

**Architecture:** A single `AccountantModal` component with a discriminated `mode` prop (`'detail'` | `'invite'`) exported from `src/components/admin/AccountantModal.tsx`. The list page (`page.tsx`) holds a `modal` state union and renders `<AccountantModal>` conditionally. Both old route pages are deleted.

**Tech Stack:** Next.js 14 App Router, React, TanStack Query v5, react-hook-form + zod, TypeScript, Tailwind CSS + CSS custom properties (`var(--t-*)`)

---

## File Map

| Action | Path |
|--------|------|
| **Create** | `frontend/src/components/admin/AccountantModal.tsx` |
| **Create** | `frontend/src/components/admin/__tests__/AccountantModal.test.tsx` |
| **Modify** | `frontend/src/app/admin/accountants/page.tsx` |
| **Delete** | `frontend/src/app/admin/accountants/[id]/page.tsx` |
| **Delete** | `frontend/src/app/admin/accountants/create/page.tsx` |

---

## Task 1: Create `AccountantModal` component

**Files:**
- Create: `frontend/src/components/admin/AccountantModal.tsx`

- [ ] **Step 1: Write the component**

Create `frontend/src/components/admin/AccountantModal.tsx` with this content:

```tsx
'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  getAccountant, getAccountants, createAccountant,
  resetAccountantPassword, deactivateAccountant,
} from '@/lib/api/admin/accountants'
import type { Accountant } from '@/types/admin'

type AssignedClient = {
  id: string
  name: string
  email: string | null
  plan: string
  birType: string
  clientStatus: string | null
  redCount: number
}

export type AccountantModalProps =
  | { mode: 'detail'; accountantId: string; onClose: () => void }
  | { mode: 'invite'; onClose: () => void }

const STATUS_TIER: Record<string, string> = {
  ACTIVE: 'ready', INACTIVE: 'pending', PENDING_INVITE: 'check', SUSPENDED: 'review',
}
const STATUS_LABEL: Record<string, string> = {
  ACTIVE: 'Active', INACTIVE: 'Inactive', PENDING_INVITE: 'Pending Invite', SUSPENDED: 'Suspended',
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
  name: z.string().min(1, 'Required'),
  email: z.string().email('Invalid email'),
})
type InviteForm = z.infer<typeof inviteSchema>

function InviteMode({ onClose }: { onClose: () => void }) {
  const [successEmail, setSuccessEmail] = useState<string | null>(null)
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<InviteForm>({ resolver: zodResolver(inviteSchema) })

  const onSubmit = async (data: InviteForm) => {
    await createAccountant(data)
    setSuccessEmail(data.email)
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

function DetailMode({ accountantId, onClose }: { accountantId: string; onClose: () => void }) {
  const qc = useQueryClient()
  const [deactivateOpen, setDeactivateOpen] = useState(false)
  const [replacementId, setReplacementId]   = useState('')
  const [toast, setToast]                   = useState<string | null>(null)

  const { data: accountant, isLoading } = useQuery({
    queryKey: ['admin-accountant', accountantId],
    queryFn:  () => getAccountant(accountantId),
  })

  const { data: allAccountants } = useQuery({
    queryKey: ['accountants'],
    queryFn:  getAccountants,
    enabled:  deactivateOpen,
  })

  const showToast = (msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(null), 3000)
  }

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

  const otherActive  = (allAccountants ?? []).filter((a: Accountant) => a.status === 'ACTIVE' && a.id !== accountantId)
  const clients      = (accountant?.assignedClients ?? []) as AssignedClient[]
  const hasClients   = clients.length > 0
  const tier         = accountant ? (STATUS_TIER[accountant.status] ?? 'pending') : 'pending'

  const CLIENT_STATUS_TIER: Record<string, string> = {
    ACTIVE: 'ready', OVERDUE: 'check', SUSPENDED: 'review', INACTIVE: 'pending',
  }

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

                {/* Info card */}
                <div className="bg-t-card border border-t-line rounded-lg p-5">
                  <div className="text-xs font-bold text-t-muted uppercase tracking-wide pb-3 mb-4 border-b border-t-line">
                    Accountant Information
                  </div>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs font-semibold text-t-muted mb-1.5">Full Name</label>
                      <input defaultValue={accountant.name} disabled className="w-full border border-t-line rounded-md px-3 py-2 text-sm text-t-ink bg-t-surface" />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-t-muted mb-1.5">Email Address</label>
                      <input defaultValue={accountant.email} disabled className="w-full border border-t-line rounded-md px-3 py-2 text-sm text-t-ink bg-t-surface" />
                    </div>
                    {accountant.mobile && (
                      <div>
                        <label className="block text-xs font-semibold text-t-muted mb-1.5">Mobile</label>
                        <input defaultValue={accountant.mobile} disabled className="w-full border border-t-line rounded-md px-3 py-2 text-sm text-t-ink bg-t-surface" />
                      </div>
                    )}
                  </div>
                </div>

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
                        onClick={() => resetMut.mutate()}
                        disabled={resetMut.isPending}
                        className="w-full text-left text-xs font-semibold px-3 py-2 border border-t-line rounded-md text-t-muted hover:bg-t-surface transition-colors disabled:opacity-50"
                      >
                        {resetMut.isPending ? 'Sending…' : '↺ Send Password Reset'}
                      </button>
                      <button
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
      {deactivateOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/35">
          <div className="bg-t-card rounded-xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-t-line">
              <span className="text-[15px] font-bold text-t-ink">Deactivate {accountant.name}</span>
              <button onClick={() => setDeactivateOpen(false)} className="text-t-faint hover:text-t-muted text-lg leading-none">×</button>
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
                onClick={() => setDeactivateOpen(false)}
                className="text-xs font-semibold px-3.5 py-2 border border-t-line rounded-md text-t-muted hover:bg-t-surface"
              >
                Cancel
              </button>
              <button
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

- [ ] **Step 2: Commit**

```bash
git add frontend/src/components/admin/AccountantModal.tsx
git commit -m "feat: add AccountantModal component (detail + invite modes)"
```

---

## Task 2: Write tests for `AccountantModal`

**Files:**
- Create: `frontend/src/components/admin/__tests__/AccountantModal.test.tsx`

- [ ] **Step 1: Write the test file**

Create `frontend/src/components/admin/__tests__/AccountantModal.test.tsx`:

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
  resetAccountantPassword: jest.fn(),
  deactivateAccountant:    jest.fn(),
}))

function wrap(ui: React.ReactElement) {
  return render(<div data-theme="sofia">{ui}</div>)
}

// ─── Invite mode ──────────────────────────────────────────────────────────────

describe('AccountantModal — invite mode', () => {
  it('renders name and email inputs', () => {
    wrap(<AccountantModal mode="invite" onClose={jest.fn()} />)
    expect(screen.getByText('Invite Accountant')).toBeInTheDocument()
    expect(screen.getByText('Full Name *')).toBeInTheDocument()
    expect(screen.getByText('Email *')).toBeInTheDocument()
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

  it('renders accountant name when data loads', () => {
    const { useQuery } = require('@tanstack/react-query')
    ;(useQuery as jest.Mock).mockReturnValue({
      data: {
        id: 'a1', name: 'Maria Santos', email: 'maria@example.ph', mobile: null,
        status: 'ACTIVE', clientCount: 3, redCount: 1, pendingEntries: 0,
        createdAt: '2024-01-15T00:00:00Z', assignedClients: [],
      },
      isLoading: false,
    })
    wrap(<AccountantModal mode="detail" accountantId="a1" onClose={jest.fn()} />)
    expect(screen.getAllByText('Maria Santos').length).toBeGreaterThan(0)
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

- [ ] **Step 2: Run tests**

```bash
cd frontend && npx jest src/components/admin/__tests__/AccountantModal.test.tsx --no-coverage
```

Expected: all tests pass (PASS).

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/admin/__tests__/AccountantModal.test.tsx
git commit -m "test: add AccountantModal tests"
```

---

## Task 3: Wire up `page.tsx` — replace navigation with modals

**Files:**
- Modify: `frontend/src/app/admin/accountants/page.tsx`

- [ ] **Step 1: Update the file**

Replace the entire content of `frontend/src/app/admin/accountants/page.tsx` with:

```tsx
'use client'

import { useState, type CSSProperties } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getAccountants, deactivateAccountant, resetAccountantPassword } from '@/lib/api/admin/accountants'
import type { Accountant } from '@/types/admin'
import { Breadcrumb } from '@/components/shared/Breadcrumb'
import { SummaryCard } from '@/components/shared/SummaryCard'
import { AccountantModal } from '@/components/admin/AccountantModal'

const STATUS_TIER: Record<string, string> = {
  ACTIVE:         'ready',
  INACTIVE:       'pending',
  PENDING_INVITE: 'check',
  SUSPENDED:      'review',
}
const STATUS_LABEL: Record<string, string> = {
  ACTIVE:         'Active',
  INACTIVE:       'Inactive',
  PENDING_INVITE: 'Pending Invite',
  SUSPENDED:      'Suspended',
}

function getInitials(name: string) {
  return name.split(' ').slice(0, 2).map((w) => w[0] ?? '').join('').toUpperCase()
}

function fmtDate(iso: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

interface DeactivateState {
  accountant: Accountant
  replacementId: string
}

type ModalState =
  | { mode: 'detail'; accountantId: string }
  | { mode: 'invite' }
  | null

export default function AdminAccountantsPage() {
  const qc = useQueryClient()

  const [modal, setModal]             = useState<ModalState>(null)
  const [deactivateModal, setDeactivateModal] = useState<Accountant | null>(null)
  const [replacementId, setReplacementId]     = useState('')
  const [toast, setToast]                     = useState<string | null>(null)
  const [hoveredId, setHoveredId]             = useState<string | null>(null)

  const { data, isLoading } = useQuery({ queryKey: ['accountants'], queryFn: getAccountants })

  const showToast = (msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(null), 3000)
  }

  const deactivateMut = useMutation({
    mutationFn: ({ accountant, replacementId }: DeactivateState) =>
      deactivateAccountant(accountant.id, replacementId || undefined),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['accountants'] })
      setDeactivateModal(null)
      setReplacementId('')
      showToast('Accountant deactivated.')
    },
  })

  const resendMut = useMutation({
    mutationFn: (id: string) => resetAccountantPassword(id),
    onSuccess: () => showToast('Invite resent.'),
  })

  const active    = (data ?? []).filter((a) => a.status === 'ACTIVE').length
  const pending   = (data ?? []).filter((a) => a.status === 'PENDING_INVITE').length
  const suspended = (data ?? []).filter((a) => a.status === 'SUSPENDED').length
  const replacementOptions = (data ?? []).filter(
    (a) => a.status === 'ACTIVE' && a.id !== deactivateModal?.id
  )

  return (
    <div className="max-w-[1280px] mx-auto px-9 py-7">
      {toast && <div className="fixed top-4 right-4 z-50 px-4 py-2.5 bg-gray-900 text-white text-xs font-medium rounded-lg shadow-lg">{toast}</div>}

      <Breadcrumb crumbs={[{ label: 'Admin' }, { label: 'Accountants' }]} />

      <div className="flex items-start justify-between mb-[22px]">
        <div>
          <h1 className="text-[34px] font-bold tracking-[-0.025em] text-t-ink m-0" style={{ fontFamily: 'var(--font-display)' }}>
            Accountants
          </h1>
          <p className="text-[14.5px] text-t-muted mt-[5px]">
            {isLoading ? '…' : `${active} active${pending > 0 ? ` · ${pending} pending invite` : ''}`}
          </p>
        </div>
        <button
          onClick={() => setModal({ mode: 'invite' })}
          className="flex items-center gap-2 rounded-[12px] px-5 py-3 text-[14px] font-bold text-white mt-1 cursor-pointer border-0"
          style={{
            background: 'linear-gradient(150deg, var(--t-primary), var(--t-primary-deep))',
            boxShadow: '0 12px 22px -12px var(--t-primary)',
          }}
        >
          + Invite Accountant
        </button>
      </div>

      {!isLoading && (
        <div className="flex gap-[14px] mb-[22px]">
          <SummaryCard label="Total" value={String((data ?? []).length)} subnote="all accountants" />
          <SummaryCard label="Active" value={String(active)} subnote="currently working" valueStyle={{ color: 'var(--t-tier-ready-fg)' }} />
          <SummaryCard label="Pending Invite" value={String(pending)} subnote="invite not accepted" valueStyle={{ color: 'var(--t-tier-check-fg)' }} />
          <SummaryCard label="Suspended" value={String(suspended)} subnote="access revoked" valueStyle={{ color: 'var(--t-tier-review-fg)' }} />
        </div>
      )}

      {/* Table card */}
      {(() => {
        const COLS = 'minmax(160px, 1.5fr) minmax(160px, 2fr) 120px 70px 110px 130px'

        const COL_HEADERS: { label: string; align: CSSProperties['textAlign']; color: string }[] = [
          { label: 'Name',    align: 'left',   color: 'var(--t-faint)' },
          { label: 'Email',   align: 'left',   color: 'var(--t-faint)' },
          { label: 'Status',  align: 'center', color: 'var(--t-faint)' },
          { label: 'Clients', align: 'right',  color: 'var(--t-faint)' },
          { label: 'Joined',  align: 'left',   color: 'var(--t-faint)' },
          { label: 'Actions', align: 'left',   color: 'var(--t-faint)' },
        ]

        const accountantList = (data ?? []) as Accountant[]

        return (
          <div style={{ background: 'var(--t-card)', border: '1px solid var(--t-line)', borderRadius: 20, overflow: 'hidden', boxShadow: 'var(--t-shadow)' }}>
            {/* Card header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '18px 24px', borderBottom: '1px solid var(--t-line)' }}>
              <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} style={{ color: 'var(--t-primary)', flexShrink: 0 }}>
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
                <path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
              </svg>
              <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 16, color: 'var(--t-ink)' }}>Accountants</span>
              <span style={{ background: 'var(--t-primary-soft)', color: 'var(--t-primary)', border: '1px solid var(--t-line)', borderRadius: 999, padding: '2px 9px', fontSize: 11.5, fontWeight: 800 }}>
                {accountantList.length}
              </span>
              {pending > 0 && (
                <span style={{ background: 'var(--t-tier-check-bg)', color: 'var(--t-tier-check-fg)', border: '1px solid var(--t-tier-check-ring)', borderRadius: 999, padding: '2px 9px', fontSize: 11.5, fontWeight: 800 }}>
                  {pending} pending invite
                </span>
              )}
            </div>

            {isLoading ? (
              <div style={{ padding: 32, textAlign: 'center', fontSize: 14, color: 'var(--t-faint)' }}>Loading…</div>
            ) : !accountantList.length ? (
              <div style={{ padding: 32, textAlign: 'center', fontSize: 14, color: 'var(--t-faint)' }}>No accountants yet.</div>
            ) : (
              <>
                {/* Column headers */}
                <div style={{ display: 'grid', gridTemplateColumns: COLS, columnGap: 16, padding: '12px 24px', borderBottom: '1px solid var(--t-line)' }}>
                  {COL_HEADERS.map(({ label, align, color }) => (
                    <span key={label} style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.06em', color, textAlign: align, overflow: 'hidden', whiteSpace: 'nowrap' }}>
                      {label}
                    </span>
                  ))}
                </div>

                {/* Data rows */}
                {accountantList.map((a, i) => {
                  const tier      = STATUS_TIER[a.status] ?? 'pending'
                  const label     = STATUS_LABEL[a.status] ?? a.status
                  const isPending = a.status === 'PENDING_INVITE'
                  const flagTier  = a.status === 'SUSPENDED' ? 'review' : isPending ? 'check' : null
                  const isHovered = hoveredId === a.id
                  const rowBg     = isHovered ? 'var(--t-primary-soft)' : i % 2 === 1 ? 'var(--t-card-alt)' : 'transparent'

                  return (
                    <div
                      key={a.id}
                      onClick={() => { if (!isPending) setModal({ mode: 'detail', accountantId: a.id }) }}
                      onMouseEnter={() => setHoveredId(a.id)}
                      onMouseLeave={() => setHoveredId(null)}
                      style={{
                        display: 'grid', gridTemplateColumns: COLS, columnGap: 16,
                        padding: '13px 24px', alignItems: 'center',
                        borderBottom: '1px solid var(--t-line-soft)',
                        cursor: !isPending ? 'pointer' : 'default',
                        transition: 'background 0.14s',
                        background: rowBg,
                        boxShadow: flagTier ? `inset 3px 0 0 var(--t-tier-${flagTier}-fg)` : 'inset 3px 0 0 transparent',
                      }}
                    >
                      {/* Name with avatar */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, overflow: 'hidden' }}>
                        <span style={{
                          width: 32, height: 32, borderRadius: 10, flexShrink: 0,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 11,
                          background: 'var(--t-primary-soft)', color: 'var(--t-primary)',
                          border: '1px solid var(--t-line)',
                        }}>
                          {getInitials(a.name)}
                        </span>
                        <span style={{ fontWeight: 700, fontSize: 13.5, color: 'var(--t-ink)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {a.name}
                        </span>
                      </div>

                      {/* Email */}
                      <span style={{ fontSize: 13.5, color: 'var(--t-muted)', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {a.email}
                      </span>

                      {/* Status chip */}
                      <div style={{ display: 'flex', justifyContent: 'center' }}>
                        <span style={{
                          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                          padding: '4px 12px', borderRadius: 999, fontSize: 12.5, fontWeight: 700, whiteSpace: 'nowrap',
                          background: `var(--t-tier-${tier}-bg)`,
                          color:      `var(--t-tier-${tier}-fg)`,
                          border:     `1px solid var(--t-tier-${tier}-ring)`,
                        }}>
                          {label}
                        </span>
                      </div>

                      {/* Clients count */}
                      <span style={{ textAlign: 'right', fontSize: 13.5, color: isPending ? 'var(--t-faint)' : 'var(--t-muted)', fontWeight: 500, fontVariantNumeric: 'tabular-nums' }}>
                        {isPending ? '—' : a.clientCount}
                      </span>

                      {/* Joined */}
                      <span style={{ fontSize: 13.5, color: 'var(--t-muted)', fontWeight: 500 }}>
                        {fmtDate(a.createdAt)}
                      </span>

                      {/* Actions */}
                      <div style={{ display: 'flex' }} onClick={(e) => e.stopPropagation()}>
                        {isPending ? (
                          <button
                            onClick={() => resendMut.mutate(a.id)}
                            disabled={resendMut.isPending}
                            style={{
                              fontSize: 12, fontWeight: 600, padding: '5px 12px', borderRadius: 8,
                              border: '1px solid var(--t-line)', background: 'var(--t-card)',
                              color: 'var(--t-muted)', cursor: 'pointer', opacity: resendMut.isPending ? 0.5 : 1,
                            }}
                          >
                            Resend Invite
                          </button>
                        ) : a.status === 'ACTIVE' ? (
                          <button
                            onClick={() => { setDeactivateModal(a); setReplacementId('') }}
                            style={{
                              fontSize: 12, fontWeight: 600, padding: '5px 12px', borderRadius: 8,
                              background: 'var(--t-tier-review-bg)', color: 'var(--t-tier-review-fg)',
                              border: '1px solid var(--t-tier-review-ring)', cursor: 'pointer',
                            }}
                          >
                            Deactivate
                          </button>
                        ) : null}
                      </div>
                    </div>
                  )
                })}

                {/* Footer */}
                <div style={{ padding: '14px 24px', borderTop: '2px solid var(--t-line)', background: 'var(--t-card-alt)' }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--t-muted)' }}>
                    {accountantList.length} {accountantList.length === 1 ? 'accountant' : 'accountants'}
                  </span>
                </div>
              </>
            )}
          </div>
        )
      })()}

      {/* Inline deactivate modal (Actions column quick-deactivate) */}
      {deactivateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/35">
          <div className="bg-t-card rounded-xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-t-line">
              <span className="text-[15px] font-bold text-t-ink">Deactivate Accountant</span>
              <button onClick={() => setDeactivateModal(null)} className="text-t-faint hover:text-t-muted text-lg leading-none">×</button>
            </div>
            <div className="p-5">
              <p className="text-sm text-t-muted mb-4">
                You are about to deactivate <strong>{deactivateModal.name}</strong>.
                {deactivateModal.clientCount > 0 && (
                  <> They currently have <strong>{deactivateModal.clientCount} client{deactivateModal.clientCount !== 1 ? 's' : ''}</strong>. Please select a replacement accountant.</>
                )}
              </p>
              {deactivateModal.clientCount > 0 && (
                <div className="mb-4">
                  <label className="block text-xs font-semibold text-t-muted mb-1.5">Replacement Accountant <span className="text-red-500">*</span></label>
                  <select
                    value={replacementId}
                    onChange={(e) => setReplacementId(e.target.value)}
                    className="w-full border border-t-line rounded-md px-2.5 py-2 text-sm text-t-ink bg-t-card"
                  >
                    <option value="">Select replacement…</option>
                    {replacementOptions.map((r) => (
                      <option key={r.id} value={r.id}>{r.name}</option>
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
                onClick={() => setDeactivateModal(null)}
                className="text-xs font-semibold px-3.5 py-2 border border-t-line rounded-md text-t-muted hover:bg-t-surface"
              >
                Cancel
              </button>
              <button
                onClick={() => deactivateMut.mutate({ accountant: deactivateModal, replacementId })}
                disabled={deactivateMut.isPending || (deactivateModal.clientCount > 0 && !replacementId)}
                className="text-xs font-semibold px-3.5 py-2 bg-red-600 hover:bg-red-700 text-white rounded-md disabled:opacity-50 transition-colors"
              >
                {deactivateMut.isPending ? 'Deactivating…' : 'Deactivate'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* AccountantModal — detail and invite */}
      {modal && (
        <AccountantModal
          {...modal}
          onClose={() => setModal(null)}
        />
      )}
    </div>
  )
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd frontend && npx tsc --noEmit 2>&1 | head -30
```

Expected: no errors (or only pre-existing unrelated errors).

- [ ] **Step 3: Commit**

```bash
git add frontend/src/app/admin/accountants/page.tsx
git commit -m "feat: open accountant detail and invite as modals on accountants list page"
```

---

## Task 4: Delete old route pages

**Files:**
- Delete: `frontend/src/app/admin/accountants/[id]/page.tsx`
- Delete: `frontend/src/app/admin/accountants/create/page.tsx`

- [ ] **Step 1: Delete the files and directories**

```bash
rm frontend/src/app/admin/accountants/[id]/page.tsx
rmdir frontend/src/app/admin/accountants/[id]
rm frontend/src/app/admin/accountants/create/page.tsx
rmdir frontend/src/app/admin/accountants/create
```

- [ ] **Step 2: Verify TypeScript still compiles**

```bash
cd frontend && npx tsc --noEmit 2>&1 | head -30
```

Expected: no new errors introduced by the deletions.

- [ ] **Step 3: Commit**

```bash
git add -A frontend/src/app/admin/accountants/
git commit -m "chore: remove accountant detail and create route pages (replaced by modals)"
```

---

## Self-Review

**Spec coverage check:**

| Spec requirement | Task |
|-----------------|------|
| `AccountantModal` with discriminated `mode` prop | Task 1 |
| Detail mode: header (avatar + name + status + ×) | Task 1 |
| Detail mode: two-column info + sidebar (status, workload, actions) | Task 1 |
| Detail mode: assigned clients table | Task 1 |
| Detail mode: deactivate overlay (z-[60]) | Task 1 |
| Detail mode: on deactivate success → invalidate + onClose | Task 1 |
| Invite mode: name + email form with zod validation | Task 1 |
| Invite mode: inline success confirmation | Task 1 |
| Invite mode: cancel closes modal | Task 1 |
| Modal state in `page.tsx` with discriminated union | Task 3 |
| Row click → `setModal({ mode: 'detail' })` (non-pending only) | Task 3 |
| Invite button → `setModal({ mode: 'invite' })` | Task 3 |
| `<AccountantModal>` rendered in page | Task 3 |
| Delete `[id]/page.tsx` and `create/page.tsx` | Task 4 |
| Tests for both modes | Task 2 |
