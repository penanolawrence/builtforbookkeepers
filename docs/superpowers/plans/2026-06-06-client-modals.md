# Client Modals Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace `/admin/clients/create` and `/admin/clients/[id]` page navigations with in-page modals via a single `ClientModal` component.

**Architecture:** A single `ClientModal.tsx` component with two modes — `create` and `detail` — mirroring the existing `AccountantModal.tsx`. The list page manages modal state; the modal fetches its own data. Old route pages are deleted once the modal is wired up.

**Tech Stack:** Next.js 14 App Router, React, TypeScript, TanStack Query, react-hook-form, zod, Tailwind CSS, Jest + React Testing Library

---

## File Map

| Action | Path | Purpose |
|--------|------|---------|
| **Create** | `frontend/src/components/admin/ClientModal.tsx` | New modal component (CreateMode + DetailMode) |
| **Create** | `frontend/src/components/admin/__tests__/ClientModal.test.tsx` | Tests for both modes |
| **Modify** | `frontend/src/app/admin/clients/page.tsx` | Replace navigation with modal state |
| **Delete** | `frontend/src/app/admin/clients/create/page.tsx` | Replaced by CreateMode |
| **Delete** | `frontend/src/app/admin/clients/[id]/page.tsx` | Replaced by DetailMode |
| **Delete** | `frontend/src/app/admin/clients/[id]/edit/page.tsx` | Replaced by plan+VAT in DetailMode Overview tab |

---

## Task 1: CreateMode — tests + implementation

**Files:**
- Create: `frontend/src/components/admin/__tests__/ClientModal.test.tsx`
- Create: `frontend/src/components/admin/ClientModal.tsx`

- [ ] **Step 1: Write the test file**

Create `frontend/src/components/admin/__tests__/ClientModal.test.tsx`:

```tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { ClientModal } from '../ClientModal'

jest.mock('@tanstack/react-query', () => ({
  useQuery:       jest.fn(() => ({ data: undefined, isLoading: false })),
  useQueryClient: jest.fn(() => ({ invalidateQueries: jest.fn() })),
}))

jest.mock('@/lib/api/admin/clients', () => ({
  createClient:            jest.fn(),
  getClient:               jest.fn(),
  updateClient:            jest.fn().mockResolvedValue(undefined),
  updatePlan:              jest.fn().mockResolvedValue({ success: true }),
  suspendClient:           jest.fn(),
  reactivateClient:        jest.fn(),
  markClientOverdue:       jest.fn(),
  deactivateClient:        jest.fn(),
  resetClientAccess:       jest.fn(),
  reassignAccountant:      jest.fn(),
  getClientDocumentsAdmin: jest.fn(),
  getChartOfAccounts:      jest.fn(),
  saveChartOfAccounts:     jest.fn(),
}))

jest.mock('@/lib/api/admin/accountants', () => ({
  getAccountants: jest.fn(),
}))

jest.mock('@/components/admin/AssignAccountantModal', () => ({
  AssignAccountantModal: () => null,
}))

jest.mock('@/components/admin/ReceivePaymentModal', () => ({
  ReceivePaymentModal: () => null,
}))

function wrap(ui: React.ReactElement) {
  return render(<div data-theme="sofia">{ui}</div>)
}

// ─── Create mode ─────────────────────────────────────────────────────────────

describe('ClientModal — create mode', () => {
  it('renders title and required field labels', () => {
    wrap(<ClientModal mode="create" onClose={jest.fn()} />)
    expect(screen.getByText('Create Client')).toBeInTheDocument()
    expect(screen.getByText('Business Name *')).toBeInTheDocument()
    expect(screen.getByText('Mobile *')).toBeInTheDocument()
    expect(screen.getByText('Accountant *')).toBeInTheDocument()
  })

  it('calls onClose when × is clicked', () => {
    const onClose = jest.fn()
    wrap(<ClientModal mode="create" onClose={onClose} />)
    fireEvent.click(screen.getByLabelText('Close modal'))
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('shows validation errors on empty submit', async () => {
    wrap(<ClientModal mode="create" onClose={jest.fn()} />)
    fireEvent.click(screen.getByText('Create Client'))
    await waitFor(() => {
      expect(screen.getAllByText('Required').length).toBeGreaterThan(0)
    })
  })

  it('shows success state after creation', async () => {
    const { createClient } = require('@/lib/api/admin/clients')
    ;(createClient as jest.Mock).mockResolvedValue({
      companyId: 'c1',
      inviteLink: 'https://app.example.com/invite/abc123',
      username: 'reyes_001',
    })
    const { useQuery } = require('@tanstack/react-query')
    ;(useQuery as jest.Mock).mockReturnValue({
      data: [{ id: 'a1', name: 'Maria Santos' }],
      isLoading: false,
    })

    wrap(<ClientModal mode="create" onClose={jest.fn()} />)

    fireEvent.change(screen.getAllByRole('textbox')[0], { target: { value: 'Reyes Trading' } })
    fireEvent.change(screen.getAllByRole('textbox')[1], { target: { value: '09171234567' } })

    const accountantSelect = screen.getAllByRole('combobox').find(
      (s) => (s as HTMLSelectElement).value === ''
    )
    if (accountantSelect) {
      fireEvent.change(accountantSelect, { target: { value: 'a1' } })
    }

    fireEvent.click(screen.getByText('Create Client'))

    await waitFor(() => {
      expect(screen.getByText('Client created!')).toBeInTheDocument()
    })
    expect(screen.getByText('reyes_001')).toBeInTheDocument()
    expect(screen.getByText('Copy Link')).toBeInTheDocument()
  })

  it('calls onCreated with companyId when "View Client Profile" is clicked', async () => {
    const { createClient } = require('@/lib/api/admin/clients')
    ;(createClient as jest.Mock).mockResolvedValue({
      companyId: 'c1',
      inviteLink: 'https://app.example.com/invite/abc123',
      username: 'reyes_001',
    })
    const { useQuery } = require('@tanstack/react-query')
    ;(useQuery as jest.Mock).mockReturnValue({
      data: [{ id: 'a1', name: 'Maria Santos' }],
      isLoading: false,
    })

    const onCreated = jest.fn()
    wrap(<ClientModal mode="create" onClose={jest.fn()} onCreated={onCreated} />)

    fireEvent.change(screen.getAllByRole('textbox')[0], { target: { value: 'Reyes Trading' } })
    fireEvent.change(screen.getAllByRole('textbox')[1], { target: { value: '09171234567' } })

    const accountantSelect = screen.getAllByRole('combobox').find(
      (s) => (s as HTMLSelectElement).value === ''
    )
    if (accountantSelect) {
      fireEvent.change(accountantSelect, { target: { value: 'a1' } })
    }

    fireEvent.click(screen.getByText('Create Client'))

    await waitFor(() => screen.getByText('View Client Profile'))
    fireEvent.click(screen.getByText('View Client Profile'))
    expect(onCreated).toHaveBeenCalledWith('c1')
  })
})

// ─── Detail mode (stubs for later tasks) ─────────────────────────────────────

describe('ClientModal — detail mode', () => {
  afterEach(() => jest.resetAllMocks())

  it('renders loading state', () => {
    const { useQuery } = require('@tanstack/react-query')
    ;(useQuery as jest.Mock).mockReturnValue({ data: undefined, isLoading: true })
    wrap(<ClientModal mode="detail" clientId="c1" onClose={jest.fn()} />)
    expect(screen.getByText('Loading…')).toBeInTheDocument()
  })

  it('renders not-found when data is null', () => {
    const { useQuery } = require('@tanstack/react-query')
    ;(useQuery as jest.Mock).mockReturnValue({ data: null, isLoading: false })
    wrap(<ClientModal mode="detail" clientId="c1" onClose={jest.fn()} />)
    expect(screen.getByText('Client not found.')).toBeInTheDocument()
  })

  it('renders client name, status chip, and 3 tabs when data loads', () => {
    const { useQuery } = require('@tanstack/react-query')
    ;(useQuery as jest.Mock).mockImplementation(({ queryKey }: { queryKey: unknown[] }) => {
      if (Array.isArray(queryKey) && queryKey[0] === 'admin-client') {
        return {
          data: {
            id: 'c1', clientId: 'cl1', name: 'Reyes Trading',
            clientStatus: 'ACTIVE', plan: 'starter', birType: 'non_vat',
            username: 'reyes_001', mobile: '09171234567',
            email: null, contactPerson: null, tin: null,
            accountantId: 'a1', accountantName: 'Maria Santos',
            lastPayment: null,
          },
          isLoading: false,
        }
      }
      return { data: undefined, isLoading: false }
    })

    wrap(<ClientModal mode="detail" clientId="c1" onClose={jest.fn()} />)
    expect(screen.getAllByText('Reyes Trading').length).toBeGreaterThan(0)
    expect(screen.getByText('Overview')).toBeInTheDocument()
    expect(screen.getByText('Documents')).toBeInTheDocument()
    expect(screen.getByText('Chart of Accounts')).toBeInTheDocument()
  })

  it('calls onClose when × is clicked', () => {
    const { useQuery } = require('@tanstack/react-query')
    ;(useQuery as jest.Mock).mockReturnValue({ data: undefined, isLoading: false })
    const onClose = jest.fn()
    wrap(<ClientModal mode="detail" clientId="c1" onClose={onClose} />)
    fireEvent.click(screen.getByLabelText('Close modal'))
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('switches to Documents tab on click', () => {
    const { useQuery } = require('@tanstack/react-query')
    ;(useQuery as jest.Mock).mockImplementation(({ queryKey }: { queryKey: unknown[] }) => {
      if (Array.isArray(queryKey) && queryKey[0] === 'admin-client') {
        return {
          data: {
            id: 'c1', clientId: 'cl1', name: 'Reyes Trading',
            clientStatus: 'ACTIVE', plan: 'starter', birType: 'non_vat',
            username: 'reyes_001', mobile: '09171234567',
            email: null, contactPerson: null, tin: null,
            accountantId: 'a1', accountantName: 'Maria Santos',
            lastPayment: null,
          },
          isLoading: false,
        }
      }
      return { data: undefined, isLoading: false }
    })

    wrap(<ClientModal mode="detail" clientId="c1" onClose={jest.fn()} />)
    fireEvent.click(screen.getByText('Documents'))
    expect(screen.getByText('All statuses')).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd frontend && npm test -- --testPathPattern=ClientModal --watchAll=false
```

Expected: FAIL — `ClientModal` module not found.

- [ ] **Step 3: Create `ClientModal.tsx` with CreateMode + stub DetailMode**

Create `frontend/src/components/admin/ClientModal.tsx`:

```tsx
'use client'

import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import {
  createClient, getClient, updateClient, updatePlan,
  suspendClient, reactivateClient, markClientOverdue, deactivateClient,
  resetClientAccess, reassignAccountant,
  getClientDocumentsAdmin, getChartOfAccounts, saveChartOfAccounts,
} from '@/lib/api/admin/clients'
import { getAccountants } from '@/lib/api/admin/accountants'
import { AssignAccountantModal } from '@/components/admin/AssignAccountantModal'
import { ReceivePaymentModal } from '@/components/admin/ReceivePaymentModal'
import type { Account } from '@/types/admin'
import type { Document, DocumentStatus } from '@/types/document'
import type { AccountStatus } from '@/types/auth'

// ─── Types ────────────────────────────────────────────────────────────────────

type Tab = 'overview' | 'documents' | 'coa'
type EditableAccount = Account & { _new?: boolean }

export type ClientModalProps =
  | { mode: 'create'; onClose: () => void; onCreated?: (clientId: string) => void }
  | { mode: 'detail'; clientId: string; onClose: () => void }

// ─── Schemas ─────────────────────────────────────────────────────────────────

const createSchema = z.object({
  businessName: z.string().min(1, 'Required'),
  mobile:       z.string().min(1, 'Required'),
  planType:     z.enum(['starter', 'growth', 'premium']),
  birType:      z.enum(['vat', 'non_vat']),
  accountantId: z.string().min(1, 'Required'),
  tin:          z.string().optional(),
  email:        z.string().email().optional().or(z.literal('')),
  contactPerson: z.string().optional(),
})
type CreateForm = z.infer<typeof createSchema>

const detailSchema = z.object({
  name:          z.string().min(1, 'Required'),
  mobile:        z.string().min(1, 'Required'),
  email:         z.string().email().optional().or(z.literal('')),
  contactPerson: z.string().optional(),
  tin:           z.string().optional(),
  planType:      z.enum(['starter', 'growth', 'premium']),
  birType:       z.enum(['vat', 'non_vat']),
})
type DetailForm = z.infer<typeof detailSchema>

// ─── Constants ────────────────────────────────────────────────────────────────

const STATUS_BADGE: Record<AccountStatus, { label: string; tier: string }> = {
  ACTIVE:    { label: 'Active',    tier: 'ready' },
  OVERDUE:   { label: 'Overdue',   tier: 'check' },
  SUSPENDED: { label: 'Suspended', tier: 'review' },
  INACTIVE:  { label: 'Inactive',  tier: 'pending' },
}

const DOC_STATUS: Record<DocumentStatus, { label: string; cls: string }> = {
  PROCESSING: { label: 'Processing', cls: 'bg-blue-100 text-blue-800' },
  PARKED:     { label: 'In Review',  cls: 'bg-yellow-100 text-yellow-800' },
  APPROVED:   { label: 'Posted',     cls: 'bg-green-100 text-green-800' },
  RETURNED:   { label: 'Returned',   cls: 'bg-red-100 text-red-800' },
  REJECTED:   { label: 'Rejected',   cls: 'bg-red-100 text-red-800' },
  CANCELLED:  { label: 'Withdrawn',  cls: 'bg-gray-100 text-gray-400' },
}

const COA_LABELS: Record<string, string> = {
  income:  'Income Accounts',
  expense: 'Expense Accounts',
  cash:    'Cash / Payment Accounts',
  vat:     'VAT Accounts',
}

function fmtShort(s?: string | null) {
  if (!s) return '—'
  return new Date(s).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}
function fmtPeso(n?: number | null) {
  if (n == null) return '—'
  return `₱${n.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

// ─── CreateMode ───────────────────────────────────────────────────────────────

interface SuccessData { companyId: string; inviteLink: string; username: string; email?: string }

function CreateMode({ onClose, onCreated }: { onClose: () => void; onCreated?: (clientId: string) => void }) {
  const [success, setSuccess]       = useState<SuccessData | null>(null)
  const [copied, setCopied]         = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  const { data: accountants } = useQuery({
    queryKey: ['accountants'],
    queryFn:  getAccountants,
  })

  const {
    register, handleSubmit, watch, setValue, reset,
    formState: { errors, isSubmitting },
  } = useForm<CreateForm>({
    resolver: zodResolver(createSchema),
    defaultValues: { planType: 'starter', birType: 'non_vat' },
  })

  const onSubmit = async (data: CreateForm) => {
    try {
      const result = await createClient(data)
      setSuccess({ ...result, email: data.email || undefined })
    } catch {
      setSubmitError('Failed to create client. Please try again.')
    }
  }

  const copyLink = () => {
    if (success) {
      navigator.clipboard.writeText(success.inviteLink)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/35">
      <div className="bg-t-card rounded-xl shadow-2xl w-full max-w-lg overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-t-line">
          <span className="text-[15px] font-bold text-t-ink">Create Client</span>
          <button aria-label="Close modal" onClick={onClose} className="text-t-faint hover:text-t-muted text-xl leading-none">×</button>
        </div>

        <div className="p-5 overflow-y-auto max-h-[80vh]">
          {success ? (
            <div className="space-y-4">
              <div className="text-center space-y-2">
                <div className="text-4xl">✓</div>
                <h2 className="text-lg font-semibold text-t-ink">Client created!</h2>
                <p className="text-sm text-t-muted">
                  Login username: <span className="font-mono font-semibold">{success.username}</span>
                </p>
              </div>
              <div className="border border-t-line rounded-lg p-3 space-y-2">
                <p className="text-sm font-medium text-t-ink">Invite Link</p>
                <p className="text-xs text-t-muted break-all">{success.inviteLink}</p>
                <button onClick={copyLink} className="text-xs font-semibold px-3 py-1.5 border border-t-line rounded-md text-t-muted hover:bg-t-surface">
                  {copied ? 'Copied!' : 'Copy Link'}
                </button>
              </div>
              <p className="text-sm text-t-muted">
                {success.email ? 'Invite email sent automatically.' : 'No email provided — share this link manually.'}
              </p>
              <div className="flex gap-2 pt-1">
                <button
                  onClick={() => { setSuccess(null); reset() }}
                  className="text-xs font-semibold px-3.5 py-2 border border-t-line rounded-md text-t-muted hover:bg-t-surface"
                >
                  Create Another Client
                </button>
                {onCreated && (
                  <button
                    onClick={() => onCreated(success.companyId)}
                    className="text-xs font-semibold px-3.5 py-2 rounded-md text-white"
                    style={{ background: 'linear-gradient(150deg, var(--t-primary), var(--t-primary-deep))' }}
                  >
                    View Client Profile
                  </button>
                )}
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid sm:grid-cols-2 gap-3">
                <div className="space-y-1 sm:col-span-2">
                  <label className="block text-xs font-semibold text-t-muted">Business Name *</label>
                  <input {...register('businessName')} className="w-full border border-t-line rounded-md px-3 py-2 text-sm text-t-ink bg-t-card" />
                  {errors.businessName && <p className="text-xs text-red-600">{errors.businessName.message}</p>}
                </div>
                <div className="space-y-1">
                  <label className="block text-xs font-semibold text-t-muted">Mobile *</label>
                  <input {...register('mobile')} className="w-full border border-t-line rounded-md px-3 py-2 text-sm text-t-ink bg-t-card" />
                  {errors.mobile && <p className="text-xs text-red-600">{errors.mobile.message}</p>}
                </div>
                <div className="space-y-1">
                  <label className="block text-xs font-semibold text-t-muted">TIN</label>
                  <input {...register('tin')} className="w-full border border-t-line rounded-md px-3 py-2 text-sm text-t-ink bg-t-card" />
                </div>
                <div className="space-y-1">
                  <label className="block text-xs font-semibold text-t-muted">Email</label>
                  <input type="email" {...register('email')} className="w-full border border-t-line rounded-md px-3 py-2 text-sm text-t-ink bg-t-card" />
                  {errors.email && <p className="text-xs text-red-600">{errors.email.message}</p>}
                </div>
                <div className="space-y-1">
                  <label className="block text-xs font-semibold text-t-muted">Contact Person</label>
                  <input {...register('contactPerson')} className="w-full border border-t-line rounded-md px-3 py-2 text-sm text-t-ink bg-t-card" />
                </div>
                <div className="space-y-1">
                  <label className="block text-xs font-semibold text-t-muted">Plan *</label>
                  <select
                    value={watch('planType')}
                    onChange={(e) => setValue('planType', e.target.value as 'starter' | 'growth' | 'premium')}
                    className="w-full border border-t-line rounded-md px-3 py-2 text-sm text-t-ink bg-t-card"
                  >
                    <option value="starter">Starter</option>
                    <option value="growth">Growth</option>
                    <option value="premium">Premium</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="block text-xs font-semibold text-t-muted">VAT Type *</label>
                  <select
                    value={watch('birType')}
                    onChange={(e) => setValue('birType', e.target.value as 'vat' | 'non_vat')}
                    className="w-full border border-t-line rounded-md px-3 py-2 text-sm text-t-ink bg-t-card"
                  >
                    <option value="non_vat">Non-VAT</option>
                    <option value="vat">VAT</option>
                  </select>
                </div>
                <div className="space-y-1 sm:col-span-2">
                  <label className="block text-xs font-semibold text-t-muted">Accountant *</label>
                  <select
                    value={watch('accountantId') ?? ''}
                    onChange={(e) => setValue('accountantId', e.target.value)}
                    className="w-full border border-t-line rounded-md px-3 py-2 text-sm text-t-ink bg-t-card"
                  >
                    <option value="">Select accountant…</option>
                    {(accountants ?? []).map((a) => (
                      <option key={a.id} value={a.id}>{a.name}</option>
                    ))}
                  </select>
                  {errors.accountantId && <p className="text-xs text-red-600">{errors.accountantId.message}</p>}
                </div>
              </div>
              {submitError && <p className="text-xs text-red-600">{submitError}</p>}
              <div className="flex gap-2 justify-end pt-1">
                <button type="button" onClick={onClose} className="text-xs font-semibold px-3.5 py-2 border border-t-line rounded-md text-t-muted hover:bg-t-surface">
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="text-xs font-semibold px-3.5 py-2 rounded-md text-white disabled:opacity-50"
                  style={{ background: 'linear-gradient(150deg, var(--t-primary), var(--t-primary-deep))' }}
                >
                  {isSubmitting ? 'Creating…' : 'Create Client'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── DetailMode stub (expanded in Task 2) ────────────────────────────────────

function DetailMode({ clientId, onClose }: { clientId: string; onClose: () => void }) {
  const [tab, setTab] = useState<Tab>('overview')

  const { data: client, isLoading } = useQuery({
    queryKey: ['admin-client', clientId],
    queryFn:  () => getClient(clientId),
  })

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 p-4">
      <div className="bg-t-card rounded-xl shadow-2xl w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex items-center gap-3 px-6 py-4 border-b border-t-line flex-shrink-0">
          <span className="flex-1 text-[15px] font-bold text-t-ink truncate">{client?.name ?? '…'}</span>
          <button aria-label="Close modal" onClick={onClose} className="text-t-faint hover:text-t-muted text-xl leading-none flex-shrink-0">×</button>
        </div>
        <div className="flex border-b border-t-line flex-shrink-0">
          {(['overview', 'documents', 'coa'] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-2.5 text-[13px] border-b-2 -mb-px transition-colors ${
                tab === t ? 'text-t-primary font-semibold border-t-primary' : 'text-t-faint border-transparent hover:text-t-ink'
              }`}
            >
              {t === 'overview' ? 'Overview' : t === 'documents' ? 'Documents' : 'Chart of Accounts'}
            </button>
          ))}
        </div>
        <div className="overflow-y-auto flex-1">
          {isLoading ? (
            <div className="p-8 text-sm text-t-faint text-center">Loading…</div>
          ) : !client ? (
            <div className="p-8 text-sm text-red-600 text-center">Client not found.</div>
          ) : (
            <div className="p-8 text-sm text-t-faint text-center">
              {tab === 'documents' && <span>All statuses</span>}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Export ───────────────────────────────────────────────────────────────────

export function ClientModal(props: ClientModalProps) {
  if (props.mode === 'create') return <CreateMode onClose={props.onClose} onCreated={props.onCreated} />
  return <DetailMode clientId={props.clientId} onClose={props.onClose} />
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
cd frontend && npm test -- --testPathPattern=ClientModal --watchAll=false
```

Expected: All tests PASS.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/admin/ClientModal.tsx frontend/src/components/admin/__tests__/ClientModal.test.tsx
git commit -m "feat: add ClientModal — CreateMode + stub DetailMode"
```

---

## Task 2: DetailMode — Overview tab

**Files:**
- Modify: `frontend/src/components/admin/ClientModal.tsx` (replace stub DetailMode with full implementation)

The full `DetailMode` function replaces the stub from Task 1. Replace the entire `// ─── DetailMode stub` section (through the closing brace before `// ─── Export`) with the following:

- [ ] **Step 1: Replace the stub DetailMode with the full implementation**

In `frontend/src/components/admin/ClientModal.tsx`, replace the stub `DetailMode` function (from the `// ─── DetailMode stub` comment to the line before `// ─── Export`) with:

```tsx
// ─── DetailMode ───────────────────────────────────────────────────────────────

function DetailMode({ clientId, onClose }: { clientId: string; onClose: () => void }) {
  const qc     = useQueryClient()
  const router = useRouter()

  const [tab,           setTab]           = useState<Tab>('overview')
  const [reassignOpen,  setReassignOpen]  = useState(false)
  const [paymentOpen,   setPaymentOpen]   = useState(false)
  const [actionLoading, setActionLoading] = useState(false)
  const [inviteLink,    setInviteLink]    = useState<string | null>(null)
  const [linkCopied,    setLinkCopied]    = useState(false)
  const [toast,         setToast]         = useState<string | null>(null)
  const [warning,       setWarning]       = useState<string | null>(null)

  const [docStatus, setDocStatus] = useState('')
  const [docType,   setDocType]   = useState('')
  const [docStart,  setDocStart]  = useState('')
  const [docEnd,    setDocEnd]    = useState('')

  const [coaAccounts, setCoaAccounts] = useState<EditableAccount[]>([])
  const [coaSaving,   setCoaSaving]   = useState(false)
  const [collapsed,   setCollapsed]   = useState<Record<string, boolean>>({})

  const { data: client, isLoading } = useQuery({
    queryKey: ['admin-client', clientId],
    queryFn:  () => getClient(clientId),
  })

  const {
    register, handleSubmit, setValue, watch, reset,
    formState: { isSubmitting },
  } = useForm<DetailForm>({
    resolver: zodResolver(detailSchema),
    defaultValues: { name: '', mobile: '', email: '', contactPerson: '', tin: '', planType: 'starter', birType: 'non_vat' },
  })

  useEffect(() => {
    if (client) {
      reset({
        name:          client.name,
        mobile:        client.mobile ?? '',
        email:         client.email ?? '',
        contactPerson: client.contactPerson ?? '',
        tin:           client.tin ?? '',
        planType:      (client.plan ?? 'starter') as 'starter' | 'growth' | 'premium',
        birType:       (client.birType ?? 'non_vat') as 'vat' | 'non_vat',
      })
    }
  }, [client, reset])

  const { data: documents, isLoading: docsLoading } = useQuery({
    queryKey: ['admin-client-docs', clientId, docStatus, docType, docStart, docEnd],
    queryFn:  () => getClientDocumentsAdmin(clientId, {
      status: docStatus || undefined,
      type:   docType   || undefined,
      start:  docStart  || undefined,
      end:    docEnd    || undefined,
    }),
    enabled: tab === 'documents',
  })

  const { data: coaData } = useQuery({
    queryKey: ['admin-coa', clientId],
    queryFn:  () => getChartOfAccounts(clientId),
    enabled:  tab === 'coa',
  })

  useEffect(() => { if (coaData) setCoaAccounts(coaData) }, [coaData])

  useEffect(() => {
    if (toast) {
      const t = setTimeout(() => setToast(null), 3000)
      return () => clearTimeout(t)
    }
  }, [toast])

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['admin-client', clientId] })
  }

  const onSave = async (values: DetailForm) => {
    await updateClient(clientId, {
      name:          values.name,
      mobile:        values.mobile,
      email:         values.email || undefined,
      contactPerson: values.contactPerson,
      tin:           values.tin,
    })
    const result = await updatePlan(clientId, { planType: values.planType, birType: values.birType })
    setWarning(result.warning ?? null)
    setToast('Changes saved.')
    invalidate()
    qc.invalidateQueries({ queryKey: ['admin-clients'] })
  }

  const handleSuspend = async () => {
    setActionLoading(true)
    try {
      if (client?.clientStatus === 'SUSPENDED') {
        await reactivateClient(clientId)
        setToast('Client reactivated.')
      } else {
        await suspendClient(clientId)
        setToast('Client suspended.')
      }
      invalidate()
    } finally { setActionLoading(false) }
  }

  const handleMarkOverdue = async () => {
    setActionLoading(true)
    try { await markClientOverdue(clientId); setToast('Marked as overdue.'); invalidate() }
    finally { setActionLoading(false) }
  }

  const handleDeactivate = async () => {
    if (!confirm('Deactivate this client? This action cannot be undone.')) return
    setActionLoading(true)
    try {
      await deactivateClient(clientId)
      qc.invalidateQueries({ queryKey: ['admin-clients'] })
      onClose()
    } finally { setActionLoading(false) }
  }

  const handleResetAccess = async () => {
    const { inviteLink: link } = await resetClientAccess(clientId)
    setInviteLink(link)
    setToast('New invite link generated.')
  }

  const handleReassign = async (accountantId: string) => {
    await reassignAccountant(clientId, accountantId)
    setToast('Accountant reassigned.')
    invalidate()
    setReassignOpen(false)
  }

  const updateCoaField = (idx: number, field: 'code' | 'name', value: string) =>
    setCoaAccounts((prev) => prev.map((a, i) => i === idx ? { ...a, [field]: value } : a))

  const addAccount = (type: 'income' | 'expense') =>
    setCoaAccounts((prev) => [
      ...prev,
      { id: `_new_${Date.now()}`, code: '', name: '', type, isSystemManaged: false, isActive: true, _new: true },
    ])

  const removeAccount = (idx: number) =>
    setCoaAccounts((prev) => prev.filter((_, i) => i !== idx))

  const handleSaveCoa = async () => {
    setCoaSaving(true)
    try {
      await saveChartOfAccounts(clientId, coaAccounts.map((a) => ({
        id:       a._new ? undefined : a.id,
        code:     a.code,
        name:     a.name,
        type:     a.type,
        isActive: a.isActive,
      })))
      setToast('Chart of accounts saved.')
      qc.invalidateQueries({ queryKey: ['admin-coa', clientId] })
    } finally { setCoaSaving(false) }
  }

  const coaByType = coaAccounts.reduce<Record<string, EditableAccount[]>>((acc, a) => {
    if (!acc[a.type]) acc[a.type] = []
    acc[a.type].push(a)
    return acc
  }, {})

  const isSuspended = client?.clientStatus === 'SUSPENDED'
  const isInactive  = client?.clientStatus === 'INACTIVE'
  const badge       = client ? (STATUS_BADGE[client.clientStatus] ?? STATUS_BADGE.ACTIVE) : null

  const inputCls    = 'w-full border border-t-line rounded-lg px-3 py-1.5 text-[13px] text-t-ink outline-none focus:border-t-primary transition-colors'
  const readonlyCls = 'w-full border border-t-line rounded-lg px-3 py-1.5 text-[13px] text-t-faint bg-t-surface outline-none cursor-default'
  const labelCls    = 'block text-xs font-semibold text-t-muted mb-1'
  const sideCardCls = 'bg-t-card border border-t-line rounded-lg p-4 mb-3'
  const sideTitleCls = 'text-[11px] font-bold uppercase tracking-wide text-t-faint mb-2.5'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 p-4">
      <div className="bg-t-card rounded-xl shadow-2xl w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">

        {/* Header */}
        <div className="flex items-center gap-3 px-6 py-4 border-b border-t-line flex-shrink-0">
          <div className="flex-1 min-w-0 flex items-center gap-2">
            <span className="text-[15px] font-bold text-t-ink truncate">{client?.name ?? '…'}</span>
            {badge && (
              <span style={{
                display: 'inline-flex', padding: '3px 10px', borderRadius: 999,
                fontSize: 11.5, fontWeight: 700, whiteSpace: 'nowrap',
                background: `var(--t-tier-${badge.tier}-bg)`,
                color:      `var(--t-tier-${badge.tier}-fg)`,
                border:     `1px solid var(--t-tier-${badge.tier}-ring)`,
              }}>
                {badge.label}
              </span>
            )}
          </div>
          <button aria-label="Close modal" onClick={onClose} className="text-t-faint hover:text-t-muted text-xl leading-none flex-shrink-0">×</button>
        </div>

        {/* Toast bar */}
        {toast && (
          <div className="px-6 py-2 bg-gray-900 text-white text-xs font-medium text-center flex-shrink-0">
            {toast}
          </div>
        )}

        {/* Tabs */}
        <div className="flex border-b border-t-line flex-shrink-0">
          {(['overview', 'documents', 'coa'] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-2.5 text-[13px] border-b-2 -mb-px transition-colors ${
                tab === t
                  ? 'text-t-primary font-semibold border-t-primary'
                  : 'text-t-faint border-transparent hover:text-t-ink'
              }`}
            >
              {t === 'overview' ? 'Overview' : t === 'documents' ? 'Documents' : 'Chart of Accounts'}
            </button>
          ))}
        </div>

        {/* Body */}
        <div className="overflow-y-auto flex-1">
          {isLoading ? (
            <div className="p-8 text-sm text-t-faint text-center">Loading…</div>
          ) : !client ? (
            <div className="p-8 text-sm text-red-600 text-center">Client not found.</div>
          ) : (
            <>
              {/* ── OVERVIEW TAB ── */}
              {tab === 'overview' && (
                <div className="p-5 grid gap-4" style={{ gridTemplateColumns: '1fr 300px' }}>
                  {/* Left: profile + plan form */}
                  <div>
                    <div className="text-xs font-bold text-t-ink mb-3.5 pb-2 border-b border-t-line">
                      Client Information
                    </div>
                    <form onSubmit={handleSubmit(onSave)}>
                      <div className="mb-3.5">
                        <label className={labelCls}>Business Name *</label>
                        <input className={inputCls} {...register('name')} />
                      </div>
                      <div className="grid grid-cols-2 gap-3 mb-3.5">
                        <div>
                          <label className={labelCls}>Mobile *</label>
                          <input className={inputCls} {...register('mobile')} />
                        </div>
                        <div>
                          <label className={labelCls}>Email</label>
                          <input className={inputCls} type="email" {...register('email')} />
                          <div className="text-[11px] text-t-faint mt-1">Optional — leave blank if client has no email</div>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-3 mb-3.5">
                        <div>
                          <label className={labelCls}>Contact Person</label>
                          <input className={inputCls} {...register('contactPerson')} />
                        </div>
                        <div>
                          <label className={labelCls}>TIN</label>
                          <input className={inputCls} {...register('tin')} />
                        </div>
                      </div>
                      <div className="mb-3.5">
                        <label className={labelCls}>Username</label>
                        <input className={readonlyCls} value={client.username ?? ''} readOnly />
                        <div className="text-[11px] text-t-faint mt-1">System-generated — cannot be changed</div>
                      </div>
                      <div className="grid grid-cols-2 gap-3 mb-4">
                        <div>
                          <label className={labelCls}>Plan</label>
                          <select
                            value={watch('planType')}
                            onChange={(e) => setValue('planType', e.target.value as 'starter' | 'growth' | 'premium')}
                            className={inputCls}
                          >
                            <option value="starter">Starter</option>
                            <option value="growth">Growth</option>
                            <option value="premium">Premium</option>
                          </select>
                        </div>
                        <div>
                          <label className={labelCls}>VAT Type</label>
                          <select
                            value={watch('birType')}
                            onChange={(e) => setValue('birType', e.target.value as 'vat' | 'non_vat')}
                            className={inputCls}
                          >
                            <option value="non_vat">Non-VAT</option>
                            <option value="vat">VAT Registered</option>
                          </select>
                        </div>
                      </div>
                      {warning && (
                        <div className="flex items-start gap-2 rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-800 mb-3">
                          <p>{warning}</p>
                        </div>
                      )}
                      <button
                        type="submit"
                        disabled={isSubmitting}
                        className="bg-t-primary hover:bg-t-primary-deep disabled:opacity-60 text-white text-xs font-semibold px-4 py-2 rounded-md transition-colors"
                      >
                        {isSubmitting ? 'Saving…' : 'Save Changes'}
                      </button>
                    </form>
                  </div>

                  {/* Right: sidebar */}
                  <div>
                    <div className={sideCardCls}>
                      <div className={sideTitleCls}>Account Status</div>
                      {badge && (
                        <span style={{
                          display: 'inline-flex', padding: '4px 12px', borderRadius: 999,
                          fontSize: 12.5, fontWeight: 700,
                          background: `var(--t-tier-${badge.tier}-bg)`,
                          color:      `var(--t-tier-${badge.tier}-fg)`,
                          border:     `1px solid var(--t-tier-${badge.tier}-ring)`,
                        }}>
                          {badge.label}
                        </span>
                      )}
                    </div>

                    <div className={sideCardCls}>
                      <div className={sideTitleCls}>Assigned Accountant</div>
                      <div className="flex items-center justify-between">
                        <div className="text-[13px] font-semibold text-t-ink">{client.accountantName ?? '—'}</div>
                        {!isInactive && (
                          <button
                            onClick={() => setReassignOpen(true)}
                            className="border border-t-line rounded-md px-2.5 py-1 text-xs text-t-muted hover:bg-t-surface transition-colors"
                          >
                            Reassign
                          </button>
                        )}
                      </div>
                    </div>

                    <div className={sideCardCls}>
                      <div className={sideTitleCls}>Billing</div>
                      <div className="flex items-center justify-between mb-1.5">
                        <div>
                          <div className="text-[11px] text-t-faint">Last payment</div>
                          <div className="text-[13px] font-semibold text-t-ink">
                            {client.lastPayment
                              ? `${fmtPeso(client.lastPayment.amount)} · ${fmtShort(client.lastPayment.dateReceived)}`
                              : 'No payments yet'}
                          </div>
                        </div>
                        <button
                          onClick={() => setPaymentOpen(true)}
                          className="border border-t-line rounded-md px-2.5 py-1 text-xs text-t-muted hover:bg-t-surface transition-colors"
                        >
                          Receive Payment
                        </button>
                      </div>
                    </div>

                    {!isInactive && (
                      <div className={sideCardCls}>
                        <div className={sideTitleCls}>Quick Actions</div>
                        <div className="flex flex-col gap-1.5">
                          {client.clientStatus === 'ACTIVE' && (
                            <button
                              onClick={handleMarkOverdue}
                              disabled={actionLoading}
                              className="text-left text-xs font-semibold px-3 py-1.5 rounded-md border border-amber-200 bg-amber-50 text-amber-800 hover:bg-amber-100 disabled:opacity-60 transition-colors"
                            >
                              ⏸ Mark as Overdue
                            </button>
                          )}
                          <button
                            onClick={handleSuspend}
                            disabled={actionLoading}
                            className="text-left text-xs font-semibold px-3 py-1.5 rounded-md border border-amber-200 bg-amber-50 text-amber-800 hover:bg-amber-100 disabled:opacity-60 transition-colors"
                          >
                            {isSuspended ? '🔓 Reactivate Client' : '🔒 Suspend Client'}
                          </button>
                          <button
                            onClick={handleResetAccess}
                            className="text-left text-xs font-semibold px-3 py-1.5 rounded-md border border-t-line bg-t-card text-t-ink hover:bg-t-surface transition-colors"
                          >
                            🔗 Reset Access Link
                          </button>
                          <button
                            onClick={handleDeactivate}
                            disabled={actionLoading}
                            className="text-left text-xs font-semibold px-3 py-1.5 rounded-md border border-red-200 bg-red-50 text-red-700 hover:bg-red-100 disabled:opacity-60 transition-colors"
                          >
                            ✕ Deactivate Client
                          </button>
                        </div>
                        {inviteLink && (
                          <div className="mt-3 flex items-center gap-2 bg-t-surface border border-t-line rounded-lg px-2.5 py-2">
                            <span className="flex-1 truncate font-mono text-[11px] text-t-muted">{inviteLink}</span>
                            <button
                              onClick={() => {
                                navigator.clipboard.writeText(inviteLink)
                                setLinkCopied(true)
                                setTimeout(() => setLinkCopied(false), 2000)
                              }}
                              className="text-[11px] text-t-primary font-semibold flex-shrink-0"
                            >
                              {linkCopied ? '✓ Copied' : 'Copy'}
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* ── DOCUMENTS TAB ── */}
              {tab === 'documents' && (
                <div>
                  <div className="flex items-center gap-2 px-3.5 py-2.5 border-b border-t-line bg-t-surface">
                    <select
                      value={docStatus}
                      onChange={(e) => setDocStatus(e.target.value)}
                      className="border border-t-line rounded-md px-2 py-1.5 text-xs text-t-ink bg-t-card cursor-pointer"
                    >
                      <option value="">All statuses</option>
                      <option value="PROCESSING">Processing</option>
                      <option value="PARKED">In Review</option>
                      <option value="APPROVED">Posted</option>
                      <option value="RETURNED">Returned</option>
                      <option value="REJECTED">Rejected</option>
                    </select>
                    <select
                      value={docType}
                      onChange={(e) => setDocType(e.target.value)}
                      className="border border-t-line rounded-md px-2 py-1.5 text-xs text-t-ink bg-t-card cursor-pointer"
                    >
                      <option value="">All types</option>
                      <option value="income">Income</option>
                      <option value="expense">Expense</option>
                    </select>
                    <input
                      type="date"
                      value={docStart}
                      onChange={(e) => setDocStart(e.target.value)}
                      className="border border-t-line rounded-md px-2 py-1.5 text-xs text-t-ink bg-t-card w-32"
                    />
                    <span className="text-xs text-t-faint">–</span>
                    <input
                      type="date"
                      value={docEnd}
                      onChange={(e) => setDocEnd(e.target.value)}
                      className="border border-t-line rounded-md px-2 py-1.5 text-xs text-t-ink bg-t-card w-32"
                    />
                  </div>
                  {docsLoading ? (
                    <div className="p-8 text-sm text-t-faint text-center">Loading…</div>
                  ) : !documents || documents.length === 0 ? (
                    <div className="p-8 text-sm text-t-faint text-center">No documents found.</div>
                  ) : (
                    <table className="w-full border-collapse">
                      <thead>
                        <tr>
                          {['Filename', 'Type', 'Amount', 'Merchant', 'Uploaded', 'Status'].map((h) => (
                            <th key={h} className="bg-t-surface px-3 py-2 text-left text-[10px] font-bold text-t-muted uppercase tracking-wide border-b border-t-line">
                              {h}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {(documents as Document[]).map((doc, i) => {
                          const ds = DOC_STATUS[doc.status] ?? { label: doc.status, cls: 'bg-gray-100 text-gray-600' }
                          return (
                            <tr
                              key={doc.id}
                              onClick={() => router.push(`/admin/queue/${doc.id}`)}
                              className={`cursor-pointer hover:bg-t-surface ${i < documents.length - 1 ? 'border-b border-t-line' : ''}`}
                            >
                              <td className="px-3 py-2 text-xs font-medium text-t-ink max-w-[180px] truncate">
                                {doc.refNumber ?? `Doc #${doc.id.slice(0, 8)}`}
                              </td>
                              <td className="px-3 py-2 text-xs text-t-faint capitalize">{doc.declaredType ?? '—'}</td>
                              <td className="px-3 py-2 text-xs font-medium text-t-ink">{fmtPeso(doc.amount)}</td>
                              <td className="px-3 py-2 text-xs text-t-faint">{doc.merchantName ?? 'Not detected'}</td>
                              <td className="px-3 py-2 text-xs text-t-faint whitespace-nowrap">{fmtShort(doc.createdAt)}</td>
                              <td className="px-3 py-2 text-xs">
                                <span className={`inline-flex items-center text-[10px] font-semibold px-1.5 py-0.5 rounded ${ds.cls}`}>
                                  {ds.label}
                                </span>
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  )}
                </div>
              )}

              {/* ── COA TAB ── */}
              {tab === 'coa' && (
                <div>
                  {(['income', 'expense', 'cash', 'vat'] as const).map((type) => {
                    const accounts  = coaByType[type] ?? []
                    const isEditable  = type === 'income' || type === 'expense'
                    const isCollapsed = collapsed[type]
                    return (
                      <div key={type}>
                        <div
                          className="flex items-center justify-between px-3 py-2 bg-t-surface border-b border-t-line cursor-pointer select-none"
                          onClick={() => setCollapsed((p) => ({ ...p, [type]: !p[type] }))}
                        >
                          <span className="text-[10px] font-bold uppercase tracking-wide text-t-muted">
                            <span className="mr-1.5 text-t-faint">{isCollapsed ? '▶' : '▼'}</span>
                            {COA_LABELS[type]}
                          </span>
                          {isEditable ? (
                            <button
                              onClick={(e) => { e.stopPropagation(); addAccount(type) }}
                              className="text-[11px] font-semibold text-t-muted border border-dashed border-t-line rounded px-2 py-0.5 bg-t-card hover:border-t-primary hover:text-t-primary transition-colors"
                            >
                              + Add Account
                            </button>
                          ) : (
                            <span className="text-[10px] text-t-faint">System managed</span>
                          )}
                        </div>
                        {!isCollapsed && (
                          <div>
                            {accounts.map((a) => {
                              const globalIdx = coaAccounts.indexOf(a)
                              return (
                                <div key={a.id} className="flex items-center gap-2 px-3 py-1.5 border-b border-t-line last:border-0">
                                  <span className="text-[11px] text-t-faint w-10 flex-shrink-0">{a.code}</span>
                                  <input
                                    value={a.name}
                                    onChange={(e) => isEditable && !a.isSystemManaged ? updateCoaField(globalIdx, 'name', e.target.value) : undefined}
                                    readOnly={!isEditable || a.isSystemManaged}
                                    className={`flex-1 border text-[12px] rounded px-1.5 py-1 outline-none transition-colors ${
                                      !isEditable || a.isSystemManaged
                                        ? 'border-transparent bg-transparent text-t-faint cursor-default'
                                        : 'border-transparent bg-transparent text-t-ink hover:border-t-line focus:border-t-primary focus:bg-t-card'
                                    }`}
                                  />
                                  {isEditable && !a.isSystemManaged ? (
                                    <button
                                      onClick={() => removeAccount(globalIdx)}
                                      className="text-t-faint hover:text-red-500 text-sm px-1 transition-colors flex-shrink-0"
                                      title="Remove"
                                    >
                                      ✕
                                    </button>
                                  ) : (
                                    <span className="text-[11px] text-t-faint flex-shrink-0">🔒</span>
                                  )}
                                </div>
                              )
                            })}
                          </div>
                        )}
                      </div>
                    )
                  })}
                  <div className="flex justify-end px-4 py-3 border-t border-t-line bg-t-surface">
                    <button
                      onClick={handleSaveCoa}
                      disabled={coaSaving}
                      className="bg-t-primary hover:bg-t-primary-deep disabled:opacity-60 text-white text-xs font-semibold px-4 py-2 rounded-md transition-colors"
                    >
                      {coaSaving ? 'Saving…' : 'Save Chart of Accounts'}
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Layered modals (z-[60] to sit above z-50 detail modal) */}
      <AssignAccountantModal
        open={reassignOpen}
        clientId={clientId}
        currentAccountantId={client?.accountantId}
        onCancel={() => setReassignOpen(false)}
        onConfirm={handleReassign}
      />
      <ReceivePaymentModal
        open={paymentOpen}
        clientId={clientId}
        onCancel={() => setPaymentOpen(false)}
        onSuccess={() => { setPaymentOpen(false); setToast('Payment recorded.'); invalidate() }}
      />
    </div>
  )
}
```

- [ ] **Step 2: Run all tests to verify they still pass**

```bash
cd frontend && npm test -- --testPathPattern=ClientModal --watchAll=false
```

Expected: All tests PASS. (The stub's `All statuses` text is now rendered by the real Documents tab filter, so tab-switch test still passes.)

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/admin/ClientModal.tsx
git commit -m "feat: complete ClientModal DetailMode — Overview, Documents, COA tabs"
```

---

## Task 3: Wire up `admin/clients/page.tsx`

**Files:**
- Modify: `frontend/src/app/admin/clients/page.tsx`

Replace the navigation-based approach with modal state. The diff below shows every change needed:

- [ ] **Step 1: Update `page.tsx`**

Open `frontend/src/app/admin/clients/page.tsx` and make the following changes:

**a) Remove `useRouter` from the import line and add `ClientModal` import:**

```tsx
// Remove this line entirely:
import { useRouter } from 'next/navigation'

// Add this import after the existing imports:
import { ClientModal } from '@/components/admin/ClientModal'
```

**b) In `AdminClientsPage`, remove the `router` declaration and add modal state:**

Remove:
```tsx
const router = useRouter()
```

Add (after the existing `useState` declarations):
```tsx
const [modal, setModal] = useState<
  | { mode: 'create' }
  | { mode: 'detail'; clientId: string }
  | null
>(null)
```

**c) Change the "New Client" button's `onClick`:**

```tsx
// Before:
onClick={() => router.push('/admin/clients/create')}

// After:
onClick={() => setModal({ mode: 'create' })}
```

**d) Change the row `onClick`:**

```tsx
// Before:
onClick={() => router.push(`/admin/clients/${c.id}`)}

// After:
onClick={() => setModal({ mode: 'detail', clientId: c.id })}
```

**e) Add the `ClientModal` render just before the closing `</div>` of `AdminClientsPage`:**

```tsx
      {modal && (
        <ClientModal
          {...(modal.mode === 'create'
            ? {
                mode: 'create',
                onClose: () => setModal(null),
                onCreated: (id) => setModal({ mode: 'detail', clientId: id }),
              }
            : {
                mode: 'detail',
                clientId: modal.clientId,
                onClose: () => setModal(null),
              })}
        />
      )}
    </div>
  )
}
```

- [ ] **Step 2: Run all tests**

```bash
cd frontend && npm test -- --watchAll=false
```

Expected: All existing tests PASS (the page test does not reference `useRouter` in a way that breaks).

- [ ] **Step 3: Commit**

```bash
git add frontend/src/app/admin/clients/page.tsx
git commit -m "feat: wire ClientModal into admin clients page — replace navigation with modal state"
```

---

## Task 4: Delete old route pages

**Files:**
- Delete: `frontend/src/app/admin/clients/create/page.tsx`
- Delete: `frontend/src/app/admin/clients/[id]/page.tsx`
- Delete: `frontend/src/app/admin/clients/[id]/edit/page.tsx`

- [ ] **Step 1: Delete the three old page files and their now-empty directories**

```bash
rm frontend/src/app/admin/clients/create/page.tsx
rmdir frontend/src/app/admin/clients/create

rm frontend/src/app/admin/clients/[id]/edit/page.tsx
rmdir frontend/src/app/admin/clients/[id]/edit

rm frontend/src/app/admin/clients/[id]/page.tsx
rmdir frontend/src/app/admin/clients/[id]
```

- [ ] **Step 2: Run all tests to verify nothing broke**

```bash
cd frontend && npm test -- --watchAll=false
```

Expected: All tests PASS.

- [ ] **Step 3: Commit**

```bash
git add -A frontend/src/app/admin/clients/
git commit -m "chore: delete old client create, detail, and edit pages — replaced by ClientModal"
```
