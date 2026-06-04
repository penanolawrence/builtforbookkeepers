# Client Detail Modal Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the client row navigation on `/accountant/clients` with a modal containing Overview, Documents, and Chart of Accounts tabs.

**Architecture:** A single `ClientDetailModal.tsx` component holds all three tabs as inner functions. All required API functions already exist — no new API files are needed. The clients page swaps `router.push` for local `selectedClient` state. Tests cover modal rendering and COA collapse behaviour.

**Tech Stack:** Next.js 14 App Router, React, TypeScript, TanStack Query, shadcn/ui (useToast), Lucide React icons, Jest + React Testing Library

---

## File Map

| File | Action | Responsibility |
|---|---|---|
| `frontend/src/components/accountant/ClientDetailModal.tsx` | Create | Full modal — shell, all three tabs, all API calls |
| `frontend/src/components/accountant/__tests__/ClientDetailModal.test.tsx` | Create | Unit tests — renders, closes, COA collapse |
| `frontend/src/app/accountant/clients/page.tsx` | Modify | Open modal on row click instead of navigating |

**Existing APIs used (no changes needed):**
- `getAccountantClient(id)` — `src/lib/api/accountant/clients.ts`
- `getAccountantClientDocuments(id, params)` — `src/lib/api/accountant/clients.ts`
- `getChartOfAccounts(clientId)` — `src/lib/api/admin/clients.ts`
- `saveChartOfAccounts(clientId, accounts)` — `src/lib/api/admin/clients.ts`
- `resetClientAccess(id)` — `src/lib/api/admin/clients.ts`
- `lastSevenDayRange()` — `src/app/client/documents/utils.ts`

---

### Task 1: Modal shell + failing tests

**Files:**
- Create: `frontend/src/components/accountant/ClientDetailModal.tsx`
- Create: `frontend/src/components/accountant/__tests__/ClientDetailModal.test.tsx`

- [ ] **Step 1: Write the failing tests**

Create `frontend/src/components/accountant/__tests__/ClientDetailModal.test.tsx`:

```tsx
import { render, screen, fireEvent } from '@testing-library/react'
import { ClientDetailModal } from '../ClientDetailModal'
import type { ClientProfile } from '@/types/admin'

// Mock TanStack Query so the modal renders without a provider
jest.mock('@tanstack/react-query', () => ({
  useQuery:        jest.fn(() => ({ data: undefined, isLoading: false })),
  useMutation:     jest.fn(() => ({ mutate: jest.fn(), isPending: false })),
  useQueryClient:  jest.fn(() => ({ invalidateQueries: jest.fn() })),
}))

jest.mock('@/hooks/use-toast', () => ({
  useToast: () => ({ toast: jest.fn() }),
}))

const CLIENT: ClientProfile = {
  id: 'c1',
  name: 'ABC Trading Corp.',
  mobile: '+63 917 555 1234',
  email: 'abc@trading.ph',
  tin: '123-456-789-000',
  contactPerson: 'Juan dela Cruz',
  birType: 'vat',
  plan: 'growth',
  accountantId: 'a1',
  clientId: 'u1',
  clientStatus: 'ACTIVE',
  username: 'abc_trading_001',
  accountantName: 'Maria Santos',
  lastPayment: null,
}

describe('ClientDetailModal', () => {
  it('renders the client name in the header', () => {
    render(<ClientDetailModal client={CLIENT} onClose={jest.fn()} />)
    expect(screen.getByText('ABC Trading Corp.')).toBeInTheDocument()
  })

  it('calls onClose when the × button is clicked', () => {
    const onClose = jest.fn()
    render(<ClientDetailModal client={CLIENT} onClose={onClose} />)
    fireEvent.click(screen.getByLabelText('Close modal'))
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('shows Overview tab by default', () => {
    render(<ClientDetailModal client={CLIENT} onClose={jest.fn()} />)
    expect(screen.getByRole('tab', { name: 'Overview' })).toHaveAttribute('aria-selected', 'true')
  })

  it('switches to Documents tab when clicked', () => {
    render(<ClientDetailModal client={CLIENT} onClose={jest.fn()} />)
    fireEvent.click(screen.getByRole('tab', { name: 'Documents' }))
    expect(screen.getByRole('tab', { name: 'Documents' })).toHaveAttribute('aria-selected', 'true')
  })
})
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
cd frontend && npx jest src/components/accountant/__tests__/ClientDetailModal.test.tsx --no-coverage
```

Expected: FAIL — `ClientDetailModal` not found.

- [ ] **Step 3: Create the modal shell**

Create `frontend/src/components/accountant/ClientDetailModal.tsx`:

```tsx
'use client'

import { useState } from 'react'
import { X } from 'lucide-react'
import type { ClientProfile } from '@/types/admin'

type Tab = 'overview' | 'documents' | 'coa'

interface Props {
  client: ClientProfile
  onClose: () => void
}

export function ClientDetailModal({ client, onClose }: Props) {
  const [tab, setTab] = useState<Tab>('overview')

  const tabs: { id: Tab; label: string }[] = [
    { id: 'overview',  label: 'Overview' },
    { id: 'documents', label: 'Documents' },
    { id: 'coa',       label: 'Chart of Accounts' },
  ]

  return (
    <div
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.45)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div style={{ width: '100%', maxWidth: 900, maxHeight: '90vh', background: 'var(--t-card)', borderRadius: 24, boxShadow: 'var(--t-shadow)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '20px 28px', borderBottom: '1px solid var(--t-line)', flexShrink: 0 }}>
          <div style={{ width: 40, height: 40, borderRadius: 12, background: 'linear-gradient(150deg, var(--t-primary), var(--t-primary-deep))', display: 'grid', placeItems: 'center', flexShrink: 0 }}>
            <svg viewBox="0 0 24 24" width={20} height={20} fill="none" stroke="#fff" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/>
            </svg>
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 20, letterSpacing: '-.02em', color: 'var(--t-ink)' }}>
              {client.name}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 3 }}>
              <span style={{ fontSize: 12.5, color: 'var(--t-muted)', fontWeight: 500, textTransform: 'capitalize' }}>{client.plan} Plan</span>
              <span style={{ width: 3, height: 3, borderRadius: 999, background: 'var(--t-faint)', display: 'inline-block' }} />
              <span style={{ display: 'inline-flex', padding: '2px 9px', borderRadius: 999, fontSize: 11.5, fontWeight: 700, color: 'var(--t-tier-ready-fg)', background: 'var(--t-tier-ready-bg)', border: '1px solid var(--t-tier-ready-ring)' }}>
                {client.clientStatus ?? 'Active'}
              </span>
              <span style={{ display: 'inline-flex', padding: '2px 9px', borderRadius: 999, fontSize: 11.5, fontWeight: 700, color: 'var(--t-faint)', background: 'var(--t-card-alt)', border: '1px solid var(--t-line)' }}>
                {client.birType === 'vat' ? 'VAT' : 'Non-VAT'}
              </span>
            </div>
          </div>
          <button
            aria-label="Close modal"
            onClick={onClose}
            style={{ width: 36, height: 36, borderRadius: 10, border: '1.5px solid var(--t-line)', background: 'var(--t-card)', cursor: 'pointer', display: 'grid', placeItems: 'center', color: 'var(--t-muted)', flexShrink: 0 }}
          >
            <X size={16} />
          </button>
        </div>

        {/* Tab bar */}
        <div style={{ display: 'flex', gap: 2, padding: '0 28px', borderBottom: '1px solid var(--t-line)', flexShrink: 0 }}>
          {tabs.map((tb) => (
            <button
              key={tb.id}
              role="tab"
              aria-selected={tab === tb.id}
              onClick={() => setTab(tb.id)}
              style={{ border: 0, background: 'transparent', padding: '13px 16px', fontSize: 13.5, fontWeight: tab === tb.id ? 700 : 600, color: tab === tb.id ? 'var(--t-primary)' : 'var(--t-muted)', cursor: 'pointer', fontFamily: 'inherit', borderBottom: `2.5px solid ${tab === tb.id ? 'var(--t-primary)' : 'transparent'}`, marginBottom: -1, transition: 'color .15s, border-color .15s', whiteSpace: 'nowrap' }}
            >
              {tb.label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {tab === 'overview'  && <div style={{ padding: '24px 28px', color: 'var(--t-muted)', fontSize: 13 }}>Overview coming in Task 2</div>}
          {tab === 'documents' && <div style={{ padding: '24px 28px', color: 'var(--t-muted)', fontSize: 13 }}>Documents coming in Task 3</div>}
          {tab === 'coa'       && <div style={{ padding: '24px 28px', color: 'var(--t-muted)', fontSize: 13 }}>COA coming in Task 4</div>}
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Run tests to confirm they pass**

```bash
cd frontend && npx jest src/components/accountant/__tests__/ClientDetailModal.test.tsx --no-coverage
```

Expected: PASS — 4 tests.

- [ ] **Step 5: TypeScript check**

```bash
cd frontend && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add src/components/accountant/ClientDetailModal.tsx src/components/accountant/__tests__/ClientDetailModal.test.tsx
git commit -m "feat: add ClientDetailModal shell with tab bar and tests"
```

---

### Task 2: Overview tab

**Files:**
- Modify: `frontend/src/components/accountant/ClientDetailModal.tsx`

- [ ] **Step 1: Add imports needed for Overview**

At the top of `ClientDetailModal.tsx`, add to the existing imports:

```tsx
import { useQuery } from '@tanstack/react-query'
import { Link } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { getAccountantClient } from '@/lib/api/accountant/clients'
import { resetClientAccess } from '@/lib/api/admin/clients'
```

- [ ] **Step 2: Add the OverviewTab inner component**

Add this function inside `ClientDetailModal.tsx`, before the `ClientDetailModal` export:

```tsx
function OverviewTab({ client }: { client: ClientProfile }) {
  const { toast } = useToast()
  const { data: detail } = useQuery({
    queryKey: ['accountant-client-detail', client.id],
    queryFn: () => getAccountantClient(client.id),
  })

  async function handleResetAccess() {
    try {
      await resetClientAccess(client.id)
      toast({ title: 'Access link reset — new link sent to client.' })
    } catch {
      toast({ title: 'Failed to reset access link.', variant: 'destructive' })
    }
  }

  const infoRows: { label: string; value: string }[] = [
    { label: 'Business Name',  value: client.name },
    { label: 'Mobile',         value: client.mobile ?? '—' },
    { label: 'Email',          value: client.email ?? '—' },
    { label: 'Contact Person', value: client.contactPerson ?? '—' },
    { label: 'TIN',            value: client.tin ?? '—' },
    { label: 'Username',       value: client.username ?? '—' },
    { label: 'Plan',           value: `${client.plan} · ${client.birType === 'vat' ? 'VAT' : 'Non-VAT'}` },
  ]

  const q = (detail as any)?.queueCounts ?? { red: 0, yellow: 0, green: 0 }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 24, padding: '24px 28px' }}>

      {/* Left — client info */}
      <div>
        <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--t-faint)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 16 }}>
          Client Information
        </div>
        <div style={{ background: 'var(--t-card)', border: '1px solid var(--t-line)', borderRadius: 14, overflow: 'hidden' }}>
          {infoRows.map((row, i) => (
            <div key={row.label} style={{ display: 'grid', gridTemplateColumns: '160px 1fr', alignItems: 'center', padding: '12px 16px', borderBottom: i < infoRows.length - 1 ? '1px solid var(--t-line-soft)' : 'none', background: i % 2 === 1 ? 'var(--t-card-alt)' : 'transparent' }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--t-faint)', textTransform: 'uppercase', letterSpacing: '.04em' }}>{row.label}</span>
              <span style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--t-ink)' }}>{row.value}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Right — sidebar */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

        {/* Account status */}
        <div style={{ background: 'var(--t-card)', border: '1px solid var(--t-line)', borderRadius: 14, padding: '16px 18px' }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--t-faint)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 12 }}>Account Status</div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ display: 'inline-flex', padding: '4px 13px', borderRadius: 999, fontSize: 12.5, fontWeight: 700, color: 'var(--t-tier-ready-fg)', background: 'var(--t-tier-ready-bg)', border: '1px solid var(--t-tier-ready-ring)' }}>
              {client.clientStatus ?? 'Active'}
            </span>
            <span style={{ fontSize: 12, color: 'var(--t-faint)', textTransform: 'capitalize' }}>{client.plan} · {client.birType === 'vat' ? 'VAT' : 'Non-VAT'}</span>
          </div>
        </div>

        {/* Queue flags */}
        <div style={{ background: 'var(--t-card)', border: '1px solid var(--t-line)', borderRadius: 14, padding: '16px 18px' }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--t-faint)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 12 }}>Review Queue</div>
          <div style={{ display: 'flex', gap: 10 }}>
            {([['RED', q.red, 'review'], ['YEL', q.yellow, 'check'], ['GRN', q.green, 'ready']] as const).map(([lbl, n, tier]) => (
              <div key={lbl} style={{ flex: 1, textAlign: 'center' }}>
                <div style={{ marginBottom: 4 }}>
                  {n === 0
                    ? <span style={{ color: 'var(--t-faint)', fontSize: 13 }}>—</span>
                    : <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', padding: '3px 10px', borderRadius: 8, fontSize: 12.5, fontWeight: 700, background: `var(--t-tier-${tier}-bg)`, color: `var(--t-tier-${tier}-fg)`, border: `1px solid var(--t-tier-${tier}-ring)`, minWidth: 28 }}>{n}</span>
                  }
                </div>
                <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--t-faint)' }}>{lbl}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Assigned accountant */}
        <div style={{ background: 'var(--t-card)', border: '1px solid var(--t-line)', borderRadius: 14, padding: '16px 18px' }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--t-faint)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 8 }}>Assigned Accountant</div>
          <div style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--t-ink)' }}>{client.accountantName}</div>
        </div>

        {/* Quick actions */}
        <div style={{ background: 'var(--t-card)', border: '1px solid var(--t-line)', borderRadius: 14, padding: '16px 18px' }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--t-faint)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 12 }}>Quick Actions</div>
          <button
            type="button"
            onClick={handleResetAccess}
            style={{ width: '100%', padding: '9px 14px', borderRadius: 10, border: '1.5px solid var(--t-line)', background: 'var(--t-card)', color: 'var(--t-ink)', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left', display: 'flex', alignItems: 'center', gap: 8 }}
          >
            <Link size={15} style={{ color: 'var(--t-primary)', flexShrink: 0 }} />
            Reset Access Link
          </button>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Wire OverviewTab into the modal**

Replace the overview placeholder line inside `ClientDetailModal`:

```tsx
{tab === 'overview'  && <div style={{ padding: '24px 28px', color: 'var(--t-muted)', fontSize: 13 }}>Overview coming in Task 2</div>}
```

With:

```tsx
{tab === 'overview' && <OverviewTab client={client} />}
```

- [ ] **Step 4: TypeScript check**

```bash
cd frontend && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 5: Run tests to confirm they still pass**

```bash
cd frontend && npx jest src/components/accountant/__tests__/ClientDetailModal.test.tsx --no-coverage
```

Expected: 4 tests PASS.

- [ ] **Step 6: Commit**

```bash
git add src/components/accountant/ClientDetailModal.tsx
git commit -m "feat: implement Overview tab on ClientDetailModal"
```

---

### Task 3: Documents tab

**Files:**
- Modify: `frontend/src/components/accountant/ClientDetailModal.tsx`

- [ ] **Step 1: Add additional imports**

Update the React import to include `useEffect` and `useRef`:

```tsx
import { useState, useEffect, useRef } from 'react'
```

Add these new imports below the existing ones:

```tsx
import { getAccountantClientDocuments } from '@/lib/api/accountant/clients'
import { lastSevenDayRange } from '@/app/client/documents/utils'
import { DocumentsTable } from '@/components/documents/DocumentsTable'
import type { Document } from '@/types/document'
```

The `X` icon from lucide-react is already imported from Task 1 — no change needed there.

- [ ] **Step 2: Add DocumentsTab inner component**

Add this function before `ClientDetailModal`, after `OverviewTab`:

```tsx
function DocumentsTab({ clientId }: { clientId: string }) {
  const [statusFilter, setStatusFilter] = useState('')
  const [typeFilter,   setTypeFilter]   = useState('')
  const [start,        setStart]        = useState('')
  const [end,          setEnd]          = useState('')
  const [selectedDoc,  setSelectedDoc]  = useState<Document | null>(null)
  const defaultsApplied = useRef(false)

  useEffect(() => {
    if (defaultsApplied.current) return
    defaultsApplied.current = true
    if (start || end) return
    const range = lastSevenDayRange()
    setStart(range.start)
    setEnd(range.end)
  }, [start, end])

  const { data: docs = [], isLoading } = useQuery({
    queryKey: ['client-modal-docs', clientId, statusFilter, typeFilter, start, end],
    queryFn: () => getAccountantClientDocuments(clientId, {
      status: statusFilter || undefined,
      type:   typeFilter   || undefined,
      start:  start        || undefined,
      end:    end          || undefined,
    }),
    enabled: !!(start && end),
  })

  const selectStyle: React.CSSProperties = {
    width: '100%', height: 40, paddingLeft: 14, paddingRight: 36,
    borderRadius: 11, border: '1.5px solid var(--t-line)',
    background: 'var(--t-card)', fontSize: 13.5, fontWeight: 600,
    color: 'var(--t-ink)', appearance: 'none' as const, fontFamily: 'inherit', cursor: 'pointer',
  }

  const clearBtnStyle: React.CSSProperties = {
    position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
    border: 0, background: 'var(--t-card)', cursor: 'pointer', padding: 0,
    color: 'var(--t-faint)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2,
  }

  return (
    <div style={{ padding: '20px 28px' }}>
      {/* Row 1 — Status + Type */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
        <div style={{ position: 'relative' }}>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} style={selectStyle}>
            <option value="">All Statuses</option>
            <option value="PARKED">In Review</option>
            <option value="APPROVED">Approved</option>
            <option value="RETURNED">Returned</option>
            <option value="PROCESSING">Processing</option>
          </select>
          {statusFilter && (
            <button type="button" style={clearBtnStyle} onClick={() => setStatusFilter('')} aria-label="Clear status filter">
              <X size={16} style={{ opacity: 0.5 }} />
            </button>
          )}
        </div>
        <div style={{ position: 'relative' }}>
          <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} style={selectStyle}>
            <option value="">All Types</option>
            <option value="income">Income</option>
            <option value="expense">Expense</option>
          </select>
          {typeFilter && (
            <button type="button" style={clearBtnStyle} onClick={() => setTypeFilter('')} aria-label="Clear type filter">
              <X size={16} style={{ opacity: 0.5 }} />
            </button>
          )}
        </div>
      </div>

      {/* Row 2 — Date range */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 20 }}>
        <input
          type="date"
          value={start}
          onChange={(e) => setStart(e.target.value)}
          style={{ height: 40, padding: '0 12px', borderRadius: 11, border: '1.5px solid var(--t-line)', background: 'var(--t-card)', fontSize: 13.5, fontWeight: 600, color: 'var(--t-muted)', fontFamily: 'inherit', width: '100%' }}
        />
        <input
          type="date"
          value={end}
          onChange={(e) => setEnd(e.target.value)}
          style={{ height: 40, padding: '0 12px', borderRadius: 11, border: '1.5px solid var(--t-line)', background: 'var(--t-card)', fontSize: 13.5, fontWeight: 600, color: 'var(--t-muted)', fontFamily: 'inherit', width: '100%' }}
        />
      </div>

      {isLoading ? (
        <div style={{ padding: 32, textAlign: 'center', fontSize: 14, color: 'var(--t-faint)' }}>Loading…</div>
      ) : (
        <DocumentsTable docs={docs} onRowClick={setSelectedDoc} />
      )}
    </div>
  )
}
```

- [ ] **Step 3: Wire DocumentsTab into the modal**

Replace the documents placeholder:

```tsx
{tab === 'documents' && <div style={{ padding: '24px 28px', color: 'var(--t-muted)', fontSize: 13 }}>Documents coming in Task 3</div>}
```

With:

```tsx
{tab === 'documents' && <DocumentsTab clientId={client.id} />}
```

- [ ] **Step 4: TypeScript check**

```bash
cd frontend && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 5: Run tests**

```bash
cd frontend && npx jest src/components/accountant/__tests__/ClientDetailModal.test.tsx --no-coverage
```

Expected: 4 tests PASS.

- [ ] **Step 6: Commit**

```bash
git add src/components/accountant/ClientDetailModal.tsx
git commit -m "feat: implement Documents tab on ClientDetailModal"
```

---

### Task 4: Chart of Accounts tab

**Files:**
- Modify: `frontend/src/components/accountant/ClientDetailModal.tsx`
- Modify: `frontend/src/components/accountant/__tests__/ClientDetailModal.test.tsx`

- [ ] **Step 1: Add COA test cases**

Add these tests to the existing describe block in `ClientDetailModal.test.tsx`:

```tsx
// Add inside the existing describe block:

it('COA sections start collapsed', async () => {
  const { useQuery } = require('@tanstack/react-query')
  useQuery.mockReturnValue({
    data: [
      { id: '1', code: '4001', name: 'Sales Revenue', type: 'income', isSystemManaged: false, isActive: true },
      { id: '2', code: '1001', name: 'Cash on Hand',  type: 'cash',   isSystemManaged: true,  isActive: true },
    ],
    isLoading: false,
  })
  render(<ClientDetailModal client={CLIENT} onClose={jest.fn()} />)
  fireEvent.click(screen.getByRole('tab', { name: 'Chart of Accounts' }))
  expect(screen.queryByText('Sales Revenue')).not.toBeInTheDocument()
})

it('COA section expands when its header is clicked', async () => {
  const { useQuery } = require('@tanstack/react-query')
  useQuery.mockReturnValue({
    data: [
      { id: '1', code: '4001', name: 'Sales Revenue', type: 'income', isSystemManaged: false, isActive: true },
    ],
    isLoading: false,
  })
  render(<ClientDetailModal client={CLIENT} onClose={jest.fn()} />)
  fireEvent.click(screen.getByRole('tab', { name: 'Chart of Accounts' }))
  fireEvent.click(screen.getByText('Income Accounts'))
  expect(screen.getByText('Sales Revenue')).toBeInTheDocument()
})
```

- [ ] **Step 2: Run new COA tests to confirm they fail**

```bash
cd frontend && npx jest src/components/accountant/__tests__/ClientDetailModal.test.tsx --no-coverage
```

Expected: 2 new tests FAIL — COA tab content not yet implemented.

- [ ] **Step 3: Add remaining imports**

Add to the top of `ClientDetailModal.tsx`:

```tsx
import { ChevronDown } from 'lucide-react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { getChartOfAccounts, saveChartOfAccounts } from '@/lib/api/admin/clients'
import type { Account } from '@/types/admin'
```

- [ ] **Step 4: Add CoaTab inner component**

Add after `DocumentsTab`, before `ClientDetailModal`:

```tsx
function CoaTab({ clientId, isVat }: { clientId: string; isVat: boolean }) {
  const queryClient = useQueryClient()
  const { toast }   = useToast()

  const { data: accounts = [], isLoading } = useQuery({
    queryKey: ['client-coa', clientId],
    queryFn:  () => getChartOfAccounts(clientId),
  })

  // Local editable copy, seeded from server data
  const [draft, setDraft] = useState<Account[]>([])
  useEffect(() => { if (accounts.length) setDraft(accounts) }, [accounts])

  const { mutate: save, isPending: saving } = useMutation({
    mutationFn: () => saveChartOfAccounts(clientId, draft.map((a) => ({
      id:       a.id,
      name:     a.name,
      type:     a.type,
      isActive: a.isActive,
    }))),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['client-coa', clientId] })
      toast({ title: 'Chart of accounts saved.' })
    },
    onError: (err: any) => {
      toast({ title: err?.response?.data?.message ?? 'Save failed.', variant: 'destructive' })
    },
  })

  function addAccount(type: 'income' | 'expense') {
    setDraft((d) => [...d, { id: '', code: '', name: 'New Account', type, isSystemManaged: false, isActive: true }])
  }

  function removeDraftAccount(idx: number) {
    setDraft((d) => d.filter((_, i) => i !== idx))
  }

  function renameDraftAccount(idx: number, name: string) {
    setDraft((d) => d.map((a, i) => i === idx ? { ...a, name } : a))
  }

  const income  = draft.filter((a) => a.type === 'income'  && !a.isSystemManaged)
  const expense = draft.filter((a) => a.type === 'expense' && !a.isSystemManaged)
  const cash    = draft.filter((a) => a.type === 'cash')
  const vat     = draft.filter((a) => a.type === 'vat')

  // Map from draft index: need global index for edits
  function globalIdx(account: Account) { return draft.indexOf(account) }

  if (isLoading) return <div style={{ padding: 32, textAlign: 'center', fontSize: 14, color: 'var(--t-faint)' }}>Loading…</div>

  return (
    <div>
      <div style={{ background: 'var(--t-card)', border: '1px solid var(--t-line)', borderRadius: 14, overflow: 'hidden', margin: '20px 28px 0' }}>
        <CoaSection title="Income Accounts"  accounts={income}  onAdd={() => addAccount('income')}  onRemove={removeDraftAccount} onRename={renameDraftAccount} getIdx={globalIdx} />
        <CoaSection title="Expense Accounts" accounts={expense} onAdd={() => addAccount('expense')} onRemove={removeDraftAccount} onRename={renameDraftAccount} getIdx={globalIdx} />
        <CoaSection title="Cash / Payment Accounts"            accounts={cash} system hint="System managed" getIdx={globalIdx} />
        {isVat && <CoaSection title="VAT Accounts" accounts={vat} system hint="System managed · VAT clients only" getIdx={globalIdx} />}
      </div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '16px 28px 24px' }}>
        <button
          type="button"
          onClick={() => save()}
          disabled={saving}
          style={{ border: 0, borderRadius: 12, cursor: saving ? 'not-allowed' : 'pointer', fontFamily: 'inherit', fontWeight: 700, fontSize: 14, padding: '11px 22px', color: '#fff', background: 'linear-gradient(150deg, var(--t-primary), var(--t-primary-deep))', boxShadow: '0 12px 22px -12px var(--t-primary)', opacity: saving ? 0.7 : 1 }}
        >
          {saving ? 'Saving…' : 'Save Chart of Accounts'}
        </button>
      </div>
    </div>
  )
}

interface CoaSectionProps {
  title: string
  accounts: Account[]
  system?: boolean
  hint?: string
  onAdd?: () => void
  onRemove?: (idx: number) => void
  onRename?: (idx: number, name: string) => void
  getIdx: (a: Account) => number
}

function CoaSection({ title, accounts, system, hint, onAdd, onRemove, onRename, getIdx }: CoaSectionProps) {
  const [open, setOpen] = useState(false)

  return (
    <div>
      <div
        onClick={() => setOpen((o) => !o)}
        style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '11px 20px', background: 'var(--t-card-alt)', cursor: 'pointer', userSelect: 'none', borderBottom: '1px solid var(--t-line-soft)' }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <ChevronDown size={13} style={{ color: 'var(--t-faint)', transform: open ? 'rotate(0)' : 'rotate(-90deg)', transition: 'transform .2s' }} />
          <span style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--t-ink)' }}>{title}</span>
          <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--t-faint)', background: 'var(--t-card)', border: '1px solid var(--t-line)', borderRadius: 999, padding: '1px 7px' }}>{accounts.length}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {hint && <span style={{ fontSize: 11, color: 'var(--t-faint)', fontStyle: 'italic' }}>{hint}</span>}
          {onAdd && (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onAdd() }}
              style={{ border: '1.5px dashed var(--t-line)', background: 'transparent', borderRadius: 8, padding: '3px 10px', fontSize: 12, fontWeight: 700, color: 'var(--t-primary)', cursor: 'pointer', fontFamily: 'inherit' }}
            >
              + Add Account
            </button>
          )}
        </div>
      </div>

      {open && accounts.map((a) => {
        const idx = getIdx(a)
        return (
          <div key={a.id || `draft-${idx}`} style={{ display: 'grid', gridTemplateColumns: '70px 1fr 32px', gap: 10, alignItems: 'center', padding: '9px 20px', borderBottom: '1px solid var(--t-line-soft)', background: idx % 2 === 0 ? 'transparent' : 'var(--t-card-alt)' }}>
            <span style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--t-faint)', fontVariantNumeric: 'tabular-nums' }}>{a.code || '—'}</span>
            {system ? (
              <span style={{ fontSize: 13.5, color: 'var(--t-muted)' }}>{a.name}</span>
            ) : (
              <input
                value={a.name}
                onChange={(e) => onRename?.(idx, e.target.value)}
                style={{ border: '1.5px solid var(--t-line)', borderRadius: 8, padding: '5px 10px', fontSize: 13.5, color: 'var(--t-ink)', background: 'var(--t-card)', fontFamily: 'inherit', fontWeight: 600, outline: 'none', width: '100%' }}
              />
            )}
            {system ? (
              <span style={{ fontSize: 13, color: 'var(--t-faint)', textAlign: 'center' }}>🔒</span>
            ) : (
              <button
                type="button"
                onClick={() => onRemove?.(idx)}
                style={{ border: 0, background: 'transparent', cursor: 'pointer', color: 'var(--t-faint)', padding: 4, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 6 }}
                aria-label={`Remove ${a.name}`}
              >
                <X size={14} />
              </button>
            )}
          </div>
        )
      })}
    </div>
  )
}
```

- [ ] **Step 5: Wire CoaTab into the modal**

Replace the COA placeholder:

```tsx
{tab === 'coa' && <div style={{ padding: '24px 28px', color: 'var(--t-muted)', fontSize: 13 }}>COA coming in Task 4</div>}
```

With:

```tsx
{tab === 'coa' && <CoaTab clientId={client.id} isVat={client.birType === 'vat'} />}
```

- [ ] **Step 6: TypeScript check**

```bash
cd frontend && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 7: Run all tests**

```bash
cd frontend && npx jest src/components/accountant/__tests__/ClientDetailModal.test.tsx --no-coverage
```

Expected: all 6 tests PASS.

- [ ] **Step 8: Commit**

```bash
git add src/components/accountant/ClientDetailModal.tsx src/components/accountant/__tests__/ClientDetailModal.test.tsx
git commit -m "feat: implement Chart of Accounts tab on ClientDetailModal"
```

---

### Task 5: Wire modal into the My Clients page

**Files:**
- Modify: `frontend/src/app/accountant/clients/page.tsx`

- [ ] **Step 1: Add QueryClientProvider to the test import scope**

No test change needed — the page test is end-to-end via the running app.

- [ ] **Step 2: Update imports in clients page**

In `frontend/src/app/accountant/clients/page.tsx`, find:

```tsx
import { useRouter } from 'next/navigation'
```

Remove that line entirely (router is no longer needed).

Add the modal import after the existing imports:

```tsx
import { ClientDetailModal } from '@/components/accountant/ClientDetailModal'
```

- [ ] **Step 3: Replace state and click handler**

Find:

```tsx
  const router = useRouter()
  const [search, setSearch]       = useState('')
  const [hoveredId, setHoveredId] = useState<string | null>(null)
```

Replace with:

```tsx
  const [search,         setSearch]         = useState('')
  const [hoveredId,      setHoveredId]      = useState<string | null>(null)
  const [selectedClient, setSelectedClient] = useState<ClientProfile | null>(null)
```

- [ ] **Step 4: Replace row onClick**

Find:

```tsx
                      onClick={() => router.push(`/accountant/clients/${c.id}`)}
```

Replace with:

```tsx
                      onClick={() => setSelectedClient(c)}
```

- [ ] **Step 5: Add modal render at the bottom of the return**

Find the closing `</div>` of the outermost `return (` div (after the table card closing tag), and add the modal before it:

```tsx
      {selectedClient && (
        <ClientDetailModal
          client={selectedClient}
          onClose={() => setSelectedClient(null)}
        />
      )}
```

- [ ] **Step 6: Remove unused import**

Check if `useRouter` import is now unused and ensure it was removed in Step 2. Then remove it from the imports list if still present.

- [ ] **Step 7: TypeScript check**

```bash
cd frontend && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 8: Run full test suite**

```bash
cd frontend && npx jest --no-coverage
```

Expected: all pre-existing tests pass + 6 new modal tests pass.

- [ ] **Step 9: Commit**

```bash
git add src/app/accountant/clients/page.tsx
git commit -m "feat: open ClientDetailModal on client row click"
```

---

## Manual Verification Checklist

After all tasks complete, verify in the browser:

1. Navigate to `/accountant/clients` — table looks unchanged
2. Click any client row → modal opens, client name shown in header
3. Click backdrop → modal closes
4. Click ✕ button → modal closes
5. **Overview tab:** all 7 info rows render, queue badges show, Reset Access Link button is present
6. **Documents tab:** filter bar has 2 rows (selects top, dates bottom), table auto-shows last 7 days of this client's docs; ✕ buttons appear when filters are active
7. **Chart of Accounts tab:** all 4 sections start collapsed; click a header → section expands; edit an income/expense name → input updates; click Save → toast appears; system-managed rows show 🔒
8. Both Sofia and Yoda themes render the modal correctly
