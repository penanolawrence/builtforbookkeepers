# BIR Books Modal Filter Improvements Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove the client selector for client-role users, add a GL account picker to all three BIR Books modals, and carry the selected account through to the destination book pages via URL param.

**Architecture:** Pure frontend changes across six files — three modal pages get new state + query + account selector, three destination pages get `accountId` initialized from URL search params. No backend changes.

**Tech Stack:** Next.js 14 App Router, React, TanStack Query, TypeScript

---

## File Map

| File | Change |
|---|---|
| `frontend/src/app/client/reports/page.tsx` | Remove client selector; add `accountId` state + `getAccounts` query + GL account `<select>`; disable View Book when GL+no account; pass `accountId` in URL |
| `frontend/src/app/accountant/reports/page.tsx` | Add `accountId` state + `getAccounts(clientId)` query + GL account `<select>`; update disabled guard; pass `accountId` in URL |
| `frontend/src/app/admin/reports/page.tsx` | Same as accountant, uses `getClients()` |
| `frontend/src/app/client/reports/bir/page.tsx` | Init `accountId` from `searchParams.get('accountId')` |
| `frontend/src/app/accountant/reports/[clientId]/bir/[book]/page.tsx` | Init `accountId` from `searchParams.get('accountId')` |
| `frontend/src/app/admin/reports/[clientId]/bir/[book]/page.tsx` | Init `accountId` from `searchParams.get('accountId')` |

---

## Task 1: Client modal — remove client selector, add GL account filter

**Files:**
- Modify: `frontend/src/app/client/reports/page.tsx`

- [ ] **Step 1: Replace the entire file with the updated version**

```tsx
'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { getAccounts } from '@/lib/api/accounts'

type ReportType = 'income-statement' | 'expense-breakdown' | 'bir'

function defaultStart() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`
}
function defaultEnd() {
  return new Date().toISOString().slice(0, 10)
}

const REPORT_LABELS: Record<ReportType, string> = {
  'income-statement':  'Income Statement',
  'expense-breakdown': 'Expense Breakdown',
  'bir':               'BIR Books',
}

export default function ClientReportsPage() {
  const router = useRouter()
  const [pending,   setPending]   = useState<ReportType | null>(null)
  const [start,     setStart]     = useState(defaultStart())
  const [end,       setEnd]       = useState(defaultEnd())
  const [birBook,   setBirBook]   = useState('crb')
  const [accountId, setAccountId] = useState<string | undefined>()

  const { data: accounts } = useQuery({
    queryKey: ['accounts'],
    queryFn:  () => getAccounts(),
    enabled:  pending === 'bir' && birBook === 'gl',
  })

  function openModal(report: ReportType) {
    setAccountId(undefined)
    setPending(report)
  }

  function handleView() {
    if (!pending) return
    const qs = `?start=${start}&end=${end}`
    if (pending === 'bir') {
      const acct = birBook === 'gl' && accountId ? `&accountId=${accountId}` : ''
      router.push(`/client/reports/bir${qs}&book=${birBook}${acct}`)
    } else {
      router.push(`/client/reports/${pending}${qs}`)
    }
    setPending(null)
  }

  const cardCls  = 'bg-white border-[1.5px] border-gray-200 rounded-lg p-5 cursor-pointer hover:border-indigo-300 hover:shadow-[0_0_0_3px_#eef2ff] transition-all flex flex-col'
  const inputCls = 'border border-gray-200 rounded-md px-2.5 py-1.5 text-xs text-gray-700 bg-white w-full'
  const labelCls = 'text-[10px] font-bold uppercase tracking-wide text-gray-500 mb-1 block'

  return (
    <div>
      <div className="mb-5">
        <div className="text-lg font-bold text-gray-900 tracking-tight">Reports</div>
        <div className="text-xs text-gray-400 mt-0.5">Read-only — your accountant handles BIR filing</div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div onClick={() => openModal('income-statement')} className={cardCls}>
          <div className="text-[28px] mb-3">📊</div>
          <div className="text-sm font-bold text-gray-900 mb-1">Income Statement</div>
          <div className="text-xs text-gray-500 leading-relaxed flex-1">
            Compare your total income against expenses for any period. Shows net profit or loss.
          </div>
          <div className="mt-3.5 text-xs font-bold text-indigo-600">View Report →</div>
        </div>

        <div onClick={() => openModal('expense-breakdown')} className={cardCls}>
          <div className="text-[28px] mb-3">🧾</div>
          <div className="text-sm font-bold text-gray-900 mb-1">Expense Breakdown</div>
          <div className="text-xs text-gray-500 leading-relaxed flex-1">
            See where your money went, grouped by expense category with percentage totals.
          </div>
          <div className="mt-3.5 text-xs font-bold text-indigo-600">View Report →</div>
        </div>

        <div onClick={() => openModal('bir')} className={cardCls}>
          <div className="text-[28px] mb-3">📚</div>
          <div className="text-sm font-bold text-gray-900 mb-1">BIR Books</div>
          <div className="text-xs text-gray-500 leading-relaxed flex-1">
            Cash books and journals formatted for BIR loose-leaf submission. For reference only.
          </div>
          <div className="mt-3.5 text-xs font-bold text-indigo-600">Open Books →</div>
        </div>
      </div>

      <Dialog open={!!pending} onOpenChange={(o) => { if (!o) setPending(null) }}>
        <DialogContent className="sm:max-w-sm">
          <DialogTitle className="text-sm font-bold text-gray-900">
            {pending ? REPORT_LABELS[pending] : ''}
          </DialogTitle>

          <div className="space-y-3 mt-2">
            <div className="flex gap-2">
              <div className="flex-1">
                <label className={labelCls}>From</label>
                <input type="date" value={start} onChange={(e) => setStart(e.target.value)} className={inputCls} />
              </div>
              <div className="flex-1">
                <label className={labelCls}>To</label>
                <input type="date" value={end} onChange={(e) => setEnd(e.target.value)} className={inputCls} />
              </div>
            </div>

            {pending === 'bir' && (
              <div>
                <label className={labelCls}>Book</label>
                <select
                  value={birBook}
                  onChange={(e) => { setBirBook(e.target.value); setAccountId(undefined) }}
                  className={inputCls}
                >
                  <option value="crb">Cash Receipts Book (CRB)</option>
                  <option value="cdb">Cash Disbursements Book (CDB)</option>
                  <option value="gj">General Journal (GJ)</option>
                  <option value="gl">General Ledger (GL)</option>
                </select>
              </div>
            )}

            {pending === 'bir' && birBook === 'gl' && (
              <div>
                <label className={labelCls}>Account</label>
                <select
                  value={accountId ?? ''}
                  onChange={(e) => setAccountId(e.target.value || undefined)}
                  className={inputCls}
                >
                  <option value="">Select account…</option>
                  {(accounts ?? []).map((a) => (
                    <option key={a.id} value={a.id}>{a.code} — {a.name}</option>
                  ))}
                </select>
              </div>
            )}
          </div>

          <div className="flex justify-end mt-4">
            <button
              onClick={handleView}
              disabled={pending === 'bir' && birBook === 'gl' && !accountId}
              className="bg-indigo-600 text-white text-xs font-semibold px-4 py-2 rounded-md hover:bg-indigo-700 transition-colors disabled:opacity-50"
            >
              {pending === 'bir' ? 'View Book →' : 'View Report →'}
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/app/client/reports/page.tsx
git commit -m "feat: remove client selector and add GL account filter to client BIR modal"
```

---

## Task 2: Accountant modal — add GL account filter

**Files:**
- Modify: `frontend/src/app/accountant/reports/page.tsx`

- [ ] **Step 1: Replace the entire file with the updated version**

```tsx
'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { getAccountantClients } from '@/lib/api/accountant/clients'
import { getAccounts } from '@/lib/api/accounts'
import { useRouter } from 'next/navigation'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import type { ClientProfile } from '@/types/admin'

type ReportType = 'income-statement' | 'expense-breakdown' | 'bir'

function defaultStart() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`
}
function defaultEnd() {
  return new Date().toISOString().slice(0, 10)
}

const REPORT_LABELS: Record<ReportType, string> = {
  'income-statement':  'Income Statement',
  'expense-breakdown': 'Expense Breakdown',
  'bir':               'BIR Books',
}

export default function AccountantReportsPage() {
  const router = useRouter()
  const [pending,   setPending]   = useState<ReportType | null>(null)
  const [clientId,  setClientId]  = useState('')
  const [start,     setStart]     = useState(defaultStart())
  const [end,       setEnd]       = useState(defaultEnd())
  const [birBook,   setBirBook]   = useState('crb')
  const [accountId, setAccountId] = useState<string | undefined>()

  const { data: clients } = useQuery({
    queryKey: ['accountant-clients'],
    queryFn:  () => getAccountantClients(),
  })

  const { data: accounts } = useQuery({
    queryKey: ['accounts', clientId],
    queryFn:  () => getAccounts(clientId),
    enabled:  pending === 'bir' && birBook === 'gl' && !!clientId,
  })

  function openModal(report: ReportType) {
    setClientId('')
    setAccountId(undefined)
    setPending(report)
  }

  function handleView() {
    if (!clientId || !pending) return
    const base = `/accountant/reports/${clientId}`
    const qs   = `?start=${start}&end=${end}`
    if (pending === 'bir') {
      const acct = birBook === 'gl' && accountId ? `&accountId=${accountId}` : ''
      router.push(`${base}/bir/${birBook}${qs}${acct}`)
    } else {
      router.push(`${base}/${pending}${qs}`)
    }
    setPending(null)
  }

  const cardCls  = 'bg-white border-[1.5px] border-gray-200 rounded-lg p-5 cursor-pointer hover:border-indigo-300 hover:shadow-[0_0_0_3px_#eef2ff] transition-all flex flex-col'
  const inputCls = 'border border-gray-200 rounded-md px-2.5 py-1.5 text-xs text-gray-700 bg-white w-full'
  const labelCls = 'text-[10px] font-bold uppercase tracking-wide text-gray-500 mb-1 block'

  return (
    <div>
      <div className="mb-5">
        <div className="text-lg font-bold text-gray-900 tracking-tight">Reports</div>
        <div className="text-xs text-gray-400 mt-0.5">Select a report to view for a client</div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div onClick={() => openModal('income-statement')} className={cardCls}>
          <div className="text-[28px] mb-3">📊</div>
          <div className="text-sm font-bold text-gray-900 mb-1">Income Statement</div>
          <div className="text-xs text-gray-500 leading-relaxed flex-1">
            Revenue vs expenses for the selected period. Shows gross income, total expenses, and net income.
          </div>
          <div className="mt-3.5 text-xs font-bold text-indigo-600">View Report →</div>
        </div>

        <div onClick={() => openModal('expense-breakdown')} className={cardCls}>
          <div className="text-[28px] mb-3">🧾</div>
          <div className="text-sm font-bold text-gray-900 mb-1">Expense Breakdown</div>
          <div className="text-xs text-gray-500 leading-relaxed flex-1">
            Expenses by account category with totals. Useful for spotting over-spend by category.
          </div>
          <div className="mt-3.5 text-xs font-bold text-indigo-600">View Report →</div>
        </div>

        <div onClick={() => openModal('bir')} className={cardCls}>
          <div className="text-[28px] mb-3">📋</div>
          <div className="text-sm font-bold text-gray-900 mb-1">BIR Books</div>
          <div className="text-xs text-gray-500 leading-relaxed flex-1">
            Official BIR books of account: CRB, CDB, General Journal, General Ledger.
          </div>
          <div className="mt-3.5 text-xs font-bold text-indigo-600">View Book →</div>
        </div>
      </div>

      <Dialog open={!!pending} onOpenChange={(o) => { if (!o) setPending(null) }}>
        <DialogContent className="sm:max-w-sm">
          <DialogTitle className="text-sm font-bold text-gray-900">
            {pending ? REPORT_LABELS[pending] : ''}
          </DialogTitle>

          <div className="space-y-3 mt-2">
            <div>
              <label className={labelCls}>Client</label>
              <select
                value={clientId}
                onChange={(e) => { setClientId(e.target.value); setAccountId(undefined) }}
                className={inputCls}
              >
                <option value="">Select client…</option>
                {(clients ?? []).map((c: ClientProfile) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>

            <div className="flex gap-2">
              <div className="flex-1">
                <label className={labelCls}>From</label>
                <input type="date" value={start} onChange={(e) => setStart(e.target.value)} className={inputCls} />
              </div>
              <div className="flex-1">
                <label className={labelCls}>To</label>
                <input type="date" value={end} onChange={(e) => setEnd(e.target.value)} className={inputCls} />
              </div>
            </div>

            {pending === 'bir' && (
              <div>
                <label className={labelCls}>Book</label>
                <select
                  value={birBook}
                  onChange={(e) => { setBirBook(e.target.value); setAccountId(undefined) }}
                  className={inputCls}
                >
                  <option value="crb">Cash Receipts Book (CRB)</option>
                  <option value="cdb">Cash Disbursements Book (CDB)</option>
                  <option value="gj">General Journal (GJ)</option>
                  <option value="gl">General Ledger (GL)</option>
                </select>
              </div>
            )}

            {pending === 'bir' && birBook === 'gl' && (
              <div>
                <label className={labelCls}>Account</label>
                <select
                  value={accountId ?? ''}
                  onChange={(e) => setAccountId(e.target.value || undefined)}
                  className={inputCls}
                >
                  <option value="">Select account…</option>
                  {(accounts ?? []).map((a) => (
                    <option key={a.id} value={a.id}>{a.code} — {a.name}</option>
                  ))}
                </select>
              </div>
            )}
          </div>

          <div className="flex justify-end mt-4">
            <button
              onClick={handleView}
              disabled={!clientId || (pending === 'bir' && birBook === 'gl' && !accountId)}
              className="bg-indigo-600 text-white text-xs font-semibold px-4 py-2 rounded-md hover:bg-indigo-700 transition-colors disabled:opacity-50"
            >
              {pending === 'bir' ? 'View Book →' : 'View Report →'}
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/app/accountant/reports/page.tsx
git commit -m "feat: add GL account filter to accountant BIR modal"
```

---

## Task 3: Admin modal — add GL account filter

**Files:**
- Modify: `frontend/src/app/admin/reports/page.tsx`

- [ ] **Step 1: Replace the entire file with the updated version**

```tsx
'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { getClients } from '@/lib/api/admin/clients'
import { getAccounts } from '@/lib/api/accounts'
import { useRouter } from 'next/navigation'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'

type ReportType = 'income-statement' | 'expense-breakdown' | 'bir'

function defaultStart() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`
}
function defaultEnd() {
  return new Date().toISOString().slice(0, 10)
}

const REPORT_LABELS: Record<ReportType, string> = {
  'income-statement':  'Income Statement',
  'expense-breakdown': 'Expense Breakdown',
  'bir':               'BIR Books',
}

export default function AdminReportsPage() {
  const router = useRouter()
  const [pending,   setPending]   = useState<ReportType | null>(null)
  const [clientId,  setClientId]  = useState('')
  const [start,     setStart]     = useState(defaultStart())
  const [end,       setEnd]       = useState(defaultEnd())
  const [birBook,   setBirBook]   = useState('crb')
  const [accountId, setAccountId] = useState<string | undefined>()

  const { data: clientsRes } = useQuery({
    queryKey: ['admin-clients', {}],
    queryFn:  () => getClients(),
  })
  const clients: { id: string; name: string }[] = (clientsRes as any)?.data ?? []

  const { data: accounts } = useQuery({
    queryKey: ['accounts', clientId],
    queryFn:  () => getAccounts(clientId),
    enabled:  pending === 'bir' && birBook === 'gl' && !!clientId,
  })

  function openModal(report: ReportType) {
    setClientId('')
    setAccountId(undefined)
    setPending(report)
  }

  function handleView() {
    if (!clientId || !pending) return
    const base = `/admin/reports/${clientId}`
    const qs   = `?start=${start}&end=${end}`
    if (pending === 'bir') {
      const acct = birBook === 'gl' && accountId ? `&accountId=${accountId}` : ''
      router.push(`${base}/bir/${birBook}${qs}${acct}`)
    } else {
      router.push(`${base}/${pending}${qs}`)
    }
    setPending(null)
  }

  const cardCls  = 'bg-white border-[1.5px] border-gray-200 rounded-lg p-5 cursor-pointer hover:border-indigo-300 hover:shadow-[0_0_0_3px_#eef2ff] transition-all flex flex-col'
  const inputCls = 'border border-gray-200 rounded-md px-2.5 py-1.5 text-xs text-gray-700 bg-white w-full'
  const labelCls = 'text-[10px] font-bold uppercase tracking-wide text-gray-500 mb-1 block'

  return (
    <div>
      <div className="mb-5">
        <div className="text-lg font-bold text-gray-900 tracking-tight">Reports</div>
        <div className="text-xs text-gray-400 mt-0.5">Select a report to view for a client</div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div onClick={() => openModal('income-statement')} className={cardCls}>
          <div className="text-[28px] mb-3">📊</div>
          <div className="text-sm font-bold text-gray-900 mb-1">Income Statement</div>
          <div className="text-xs text-gray-500 leading-relaxed flex-1">
            Revenue vs expenses for the selected period. Shows gross income, total expenses, and net income.
          </div>
          <div className="mt-3.5 text-xs font-bold text-indigo-600">View Report →</div>
        </div>

        <div onClick={() => openModal('expense-breakdown')} className={cardCls}>
          <div className="text-[28px] mb-3">🧾</div>
          <div className="text-sm font-bold text-gray-900 mb-1">Expense Breakdown</div>
          <div className="text-xs text-gray-500 leading-relaxed flex-1">
            Expenses by account category with totals. Useful for spotting over-spend by category.
          </div>
          <div className="mt-3.5 text-xs font-bold text-indigo-600">View Report →</div>
        </div>

        <div onClick={() => openModal('bir')} className={cardCls}>
          <div className="text-[28px] mb-3">📋</div>
          <div className="text-sm font-bold text-gray-900 mb-1">BIR Books</div>
          <div className="text-xs text-gray-500 leading-relaxed flex-1">
            Official BIR books of account: CRB, CDB, General Journal, General Ledger.
          </div>
          <div className="mt-3.5 text-xs font-bold text-indigo-600">View Book →</div>
        </div>
      </div>

      <Dialog open={!!pending} onOpenChange={(o) => { if (!o) setPending(null) }}>
        <DialogContent className="sm:max-w-sm">
          <DialogTitle className="text-sm font-bold text-gray-900">
            {pending ? REPORT_LABELS[pending] : ''}
          </DialogTitle>

          <div className="space-y-3 mt-2">
            <div>
              <label className={labelCls}>Client</label>
              <select
                value={clientId}
                onChange={(e) => { setClientId(e.target.value); setAccountId(undefined) }}
                className={inputCls}
              >
                <option value="">Select client…</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>

            <div className="flex gap-2">
              <div className="flex-1">
                <label className={labelCls}>From</label>
                <input type="date" value={start} onChange={(e) => setStart(e.target.value)} className={inputCls} />
              </div>
              <div className="flex-1">
                <label className={labelCls}>To</label>
                <input type="date" value={end} onChange={(e) => setEnd(e.target.value)} className={inputCls} />
              </div>
            </div>

            {pending === 'bir' && (
              <div>
                <label className={labelCls}>Book</label>
                <select
                  value={birBook}
                  onChange={(e) => { setBirBook(e.target.value); setAccountId(undefined) }}
                  className={inputCls}
                >
                  <option value="crb">Cash Receipts Book (CRB)</option>
                  <option value="cdb">Cash Disbursements Book (CDB)</option>
                  <option value="gj">General Journal (GJ)</option>
                  <option value="gl">General Ledger (GL)</option>
                </select>
              </div>
            )}

            {pending === 'bir' && birBook === 'gl' && (
              <div>
                <label className={labelCls}>Account</label>
                <select
                  value={accountId ?? ''}
                  onChange={(e) => setAccountId(e.target.value || undefined)}
                  className={inputCls}
                >
                  <option value="">Select account…</option>
                  {(accounts ?? []).map((a) => (
                    <option key={a.id} value={a.id}>{a.code} — {a.name}</option>
                  ))}
                </select>
              </div>
            )}
          </div>

          <div className="flex justify-end mt-4">
            <button
              onClick={handleView}
              disabled={!clientId || (pending === 'bir' && birBook === 'gl' && !accountId)}
              className="bg-indigo-600 text-white text-xs font-semibold px-4 py-2 rounded-md hover:bg-indigo-700 transition-colors disabled:opacity-50"
            >
              {pending === 'bir' ? 'View Book →' : 'View Report →'}
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/app/admin/reports/page.tsx
git commit -m "feat: add GL account filter to admin BIR modal"
```

---

## Task 4: Client BIR destination page — init accountId from URL

**Files:**
- Modify: `frontend/src/app/client/reports/bir/page.tsx`

The file currently initializes `accountId` as `useState<string | undefined>()`. It needs to read the initial value from the URL search param instead.

- [ ] **Step 1: Update the `accountId` state initialization inside `BIRContent`**

Find this line (currently inside `BIRContent`, after the other `useState` calls):

```typescript
const [accountId, setAccountId] = useState<string | undefined>()
```

Replace with:

```typescript
const [accountId, setAccountId] = useState<string | undefined>(
  searchParams.get('accountId') ?? undefined
)
```

`searchParams` is already in scope (it's used a few lines above for `book`, `start`, and `end`).

- [ ] **Step 2: Commit**

```bash
git add frontend/src/app/client/reports/bir/page.tsx
git commit -m "feat: init GL accountId from URL param on client BIR page"
```

---

## Task 5: Accountant BIR destination page — init accountId from URL

**Files:**
- Modify: `frontend/src/app/accountant/reports/[clientId]/bir/[book]/page.tsx`

- [ ] **Step 1: Update the `accountId` state initialization inside `BIRContent`**

Find this line:

```typescript
const [accountId, setAccountId] = useState<string | undefined>()
```

Replace with:

```typescript
const [accountId, setAccountId] = useState<string | undefined>(
  searchParams.get('accountId') ?? undefined
)
```

`searchParams` is already in scope (used above for `start` and `end`).

- [ ] **Step 2: Commit**

```bash
git add "frontend/src/app/accountant/reports/[clientId]/bir/[book]/page.tsx"
git commit -m "feat: init GL accountId from URL param on accountant BIR page"
```

---

## Task 6: Admin BIR destination page — init accountId from URL

**Files:**
- Modify: `frontend/src/app/admin/reports/[clientId]/bir/[book]/page.tsx`

- [ ] **Step 1: Update the `accountId` state initialization inside `BIRContent`**

Find this line:

```typescript
const [accountId, setAccountId] = useState<string | undefined>()
```

Replace with:

```typescript
const [accountId, setAccountId] = useState<string | undefined>(
  searchParams.get('accountId') ?? undefined
)
```

- [ ] **Step 2: Commit**

```bash
git add "frontend/src/app/admin/reports/[clientId]/bir/[book]/page.tsx"
git commit -m "feat: init GL accountId from URL param on admin BIR page"
```

---

## Task 7: Verify end-to-end

No automated tests exist for these pages. Verify each role manually with the dev server running.

- [ ] **Step 1: Start the frontend dev server**

```bash
cd frontend && npm run dev
```

- [ ] **Step 2: Verify client role**

Log in as a client user and navigate to Reports.
- Open any report modal → confirm no "Client" field appears
- Open BIR Books modal → select CRB/CDB/GJ → confirm no Account field, View Book enabled
- Select GL → confirm Account dropdown appears and is populated
- View Book disabled until account selected
- Select an account → View Book enabled → click it
- Confirm the BIR page opens with that account pre-selected in the toolbar account selector
- Click "View Book" on that page → confirm GL data for the correct account loads

- [ ] **Step 3: Verify accountant role**

Log in as an accountant and navigate to Reports.
- Open BIR Books modal → select a client → select GL → confirm Account dropdown appears and populates with that client's accounts
- Switch client → confirm Account field resets (shows "Select account…")
- Switch Book back to CRB → confirm Account field disappears
- Select GL + account → click View Book
- Confirm the accountant BIR book page loads with that account pre-selected in the on-page selector

- [ ] **Step 4: Verify admin role**

Same flow as accountant but logged in as admin under `/admin/reports`.

- [ ] **Step 5: Final commit if any fixups were needed**

```bash
git add -p
git commit -m "fix: BIR modal GL account filter corrections"
```
