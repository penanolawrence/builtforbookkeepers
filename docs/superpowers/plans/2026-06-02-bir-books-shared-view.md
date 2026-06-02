# BIR Books Shared View Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extract the client BIR books page into a shared `BIRBooksView` component used by all three roles, with accountant/admin showing an additional client selector and navigating directly (no modal).

**Architecture:** A new `BIRBooksView` component holds all BIR books UI state and logic. It accepts an optional `fetchClients` prop — when provided, a client selector is rendered and clientId is required before "View Book" is enabled. The accountant/admin reports landing pages remove BIR modal logic and replace the BIR card with a direct Link. The old per-book destination pages are deleted.

**Tech Stack:** Next.js 14 App Router, React, TanStack Query (`useQuery`), shadcn/ui (`Select`, `Dialog`), TypeScript, Tailwind CSS.

---

## File Map

| File | Action |
|---|---|
| `frontend/src/components/reports/BIRBooksView.tsx` | **Create** — shared component |
| `frontend/src/app/client/reports/bir/page.tsx` | **Replace** — thin wrapper |
| `frontend/src/app/accountant/reports/bir/page.tsx` | **Create** — thin wrapper |
| `frontend/src/app/admin/reports/bir/page.tsx` | **Create** — thin wrapper |
| `frontend/src/app/accountant/reports/page.tsx` | **Modify** — remove BIR modal, add direct link |
| `frontend/src/app/admin/reports/page.tsx` | **Modify** — remove BIR modal, add direct link |
| `frontend/src/app/accountant/reports/[clientId]/bir/[book]/page.tsx` | **Delete** |
| `frontend/src/app/admin/reports/[clientId]/bir/[book]/page.tsx` | **Delete** |

---

### Task 1: Create `BIRBooksView` shared component

**Files:**
- Create: `frontend/src/components/reports/BIRBooksView.tsx`

- [ ] **Step 1: Create the file with full implementation**

```tsx
'use client'

import { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { getAccounts } from '@/lib/api/accounts'
import { BIRBookTable } from '@/components/reports/BIRBookTable'
import { BIREmptyState } from '@/components/reports/BIREmptyState'
import { ExportPDFButton } from '@/components/reports/ExportPDFButton'
import { ReportBreadcrumb } from '@/components/reports/ReportBreadcrumb'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { ClientProfile } from '@/types/admin'

interface Props {
  fetchClients?: () => Promise<ClientProfile[]>
}

const BOOKS = [
  { value: 'crb', label: 'CRB' },
  { value: 'cdb', label: 'CDB' },
  { value: 'gj',  label: 'GJ'  },
  { value: 'gl',  label: 'GL'  },
]

export function BIRBooksView({ fetchClients }: Props) {
  const [clientId,    setClientId]    = useState<string | undefined>()
  const [book,        setBook]        = useState('crb')
  const [start,       setStart]       = useState('')
  const [end,         setEnd]         = useState('')
  const [accountId,   setAccountId]   = useState<string | undefined>()
  const [loadedBooks, setLoadedBooks] = useState<Set<string>>(new Set())

  // Reset account and loaded state whenever the selected client changes
  useEffect(() => {
    setAccountId(undefined)
    setLoadedBooks(new Set())
  }, [clientId])

  const { data: clients } = useQuery({
    queryKey: ['bir-books-clients'],
    queryFn:  fetchClients!,
    enabled:  !!fetchClients,
  })

  const { data: accounts } = useQuery({
    queryKey: ['accounts', clientId],
    queryFn:  () => getAccounts(clientId),
    enabled:  book === 'gl' && (!fetchClients || !!clientId),
  })

  function handleTabChange(newBook: string) {
    setBook(newBook)
    if (newBook !== 'gl') setAccountId(undefined)
    // Remove GL from loaded set when leaving it — requires re-click on return
    setLoadedBooks(prev => { const s = new Set(prev); s.delete('gl'); return s })
  }

  function handleDateChange(field: 'start' | 'end', value: string) {
    if (field === 'start') setStart(value)
    else setEnd(value)
    setLoadedBooks(new Set())
  }

  const viewDisabled =
    (!!fetchClients && !clientId) ||
    (book === 'gl' && !accountId)

  const inputCls = 'border border-gray-200 rounded-md px-2.5 py-1.5 text-xs text-gray-700 bg-white'
  const labelCls = 'text-[10px] font-bold uppercase tracking-wide text-gray-500 mb-1 block'

  return (
    <div>
      <ReportBreadcrumb title="BIR Books" />
      <div className="mb-4">
        <h1 className="text-lg font-bold text-gray-900 tracking-tight">BIR Books</h1>
        {!fetchClients && (
          <p className="text-xs text-gray-400 mt-0.5">
            For reference only — your accountant handles official submission
          </p>
        )}
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-2 flex-wrap mb-4">

        {/* Client selector — accountant/admin only */}
        {fetchClients && (
          <select
            value={clientId ?? ''}
            onChange={(e) => setClientId(e.target.value || undefined)}
            className={inputCls}
          >
            <option value="">Select client…</option>
            {(clients ?? []).map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        )}

        {/* Book tabs */}
        <div className="flex border border-gray-200 rounded-lg overflow-hidden mr-2">
          {BOOKS.map((b, i) => (
            <button
              key={b.value}
              onClick={() => handleTabChange(b.value)}
              className={[
                'px-[18px] py-1.5 text-xs font-semibold cursor-pointer',
                i < BOOKS.length - 1 ? 'border-r border-gray-200' : '',
                book === b.value
                  ? 'bg-indigo-600 text-white'
                  : 'bg-white text-gray-400 hover:text-gray-600',
              ].join(' ')}
            >
              {b.label}
            </button>
          ))}
        </div>

        {/* Date range */}
        <input
          type="date"
          value={start}
          onChange={(e) => handleDateChange('start', e.target.value)}
          className={inputCls}
        />
        <span className="text-xs text-gray-300">–</span>
        <input
          type="date"
          value={end}
          onChange={(e) => handleDateChange('end', e.target.value)}
          className={inputCls}
        />

        {/* GL account selector */}
        {book === 'gl' && (
          <Select value={accountId} onValueChange={setAccountId}>
            <SelectTrigger className="w-56 h-[30px] text-xs">
              <SelectValue placeholder="Select account" />
            </SelectTrigger>
            <SelectContent>
              {(accounts ?? []).map((a) => (
                <SelectItem key={a.id} value={a.id}>
                  {a.code} — {a.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        {/* View Book button */}
        <button
          onClick={() => setLoadedBooks(prev => new Set(prev).add(book))}
          disabled={viewDisabled}
          className={[
            'px-3.5 py-1.5 border text-xs font-semibold rounded-md',
            viewDisabled
              ? 'bg-gray-50 border-gray-200 text-gray-400 cursor-not-allowed'
              : 'bg-indigo-50 border-indigo-200 text-indigo-700 hover:bg-indigo-100 cursor-pointer',
          ].join(' ')}
        >
          View Book
        </button>

        <div className="flex-1" />
        <ExportPDFButton
          type={book}
          clientId={clientId}
          start={start}
          end={end}
          accountId={accountId}
          disabled={!loadedBooks.has(book)}
        />
      </div>

      {/* BIR book table */}
      {loadedBooks.has(book) ? (
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          <BIRBookTable
            book={book}
            clientId={clientId}
            start={start}
            end={end}
            accountId={accountId}
          />
        </div>
      ) : (
        <BIREmptyState
          book={book}
          onGenerate={() => setLoadedBooks(prev => new Set(prev).add(book))}
          disabled={viewDisabled}
        />
      )}
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/components/reports/BIRBooksView.tsx
git commit -m "feat: add BIRBooksView shared component"
```

---

### Task 2: Update client BIR page to use `BIRBooksView`

**Files:**
- Modify: `frontend/src/app/client/reports/bir/page.tsx`

The current file has ~158 lines of inline logic. Replace it entirely with a thin wrapper.

- [ ] **Step 1: Replace the file content**

```tsx
'use client'

import { Suspense } from 'react'
import { BIRBooksView } from '@/components/reports/BIRBooksView'

export default function BIRPage() {
  return (
    <Suspense>
      <BIRBooksView />
    </Suspense>
  )
}
```

- [ ] **Step 2: Verify the client BIR page still works**

Open `http://localhost:3000/client/reports/bir` in a browser. Confirm:
- Book tabs render (CRB / CDB / GJ / GL)
- Date inputs work
- Switching to GL shows the account selector
- "View Book" is disabled for GL until account is selected
- "View Book" loads the table
- No client selector is shown

- [ ] **Step 3: Commit**

```bash
git add frontend/src/app/client/reports/bir/page.tsx
git commit -m "refactor: use BIRBooksView in client BIR page"
```

---

### Task 3: Create accountant BIR page

**Files:**
- Create: `frontend/src/app/accountant/reports/bir/page.tsx`

`getAccountantClients()` returns `ClientProfile[]` directly — no normalization needed.

- [ ] **Step 1: Create the file**

```tsx
'use client'

import { Suspense } from 'react'
import { BIRBooksView } from '@/components/reports/BIRBooksView'
import { getAccountantClients } from '@/lib/api/accountant/clients'

export default function AccountantBIRPage() {
  return (
    <Suspense>
      <BIRBooksView fetchClients={getAccountantClients} />
    </Suspense>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/app/accountant/reports/bir/page.tsx
git commit -m "feat: add accountant BIR books page"
```

---

### Task 4: Create admin BIR page

**Files:**
- Create: `frontend/src/app/admin/reports/bir/page.tsx`

`getClients()` returns `{ data: ClientProfile[]; pagination: ... }` — must normalize to `ClientProfile[]` before passing to `BIRBooksView`.

- [ ] **Step 1: Create the file**

```tsx
'use client'

import { Suspense } from 'react'
import { BIRBooksView } from '@/components/reports/BIRBooksView'
import { getClients } from '@/lib/api/admin/clients'

async function fetchAdminClients() {
  const res = await getClients()
  return res.data
}

export default function AdminBIRPage() {
  return (
    <Suspense>
      <BIRBooksView fetchClients={fetchAdminClients} />
    </Suspense>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/app/admin/reports/bir/page.tsx
git commit -m "feat: add admin BIR books page"
```

---

### Task 5: Update accountant reports landing page

**Files:**
- Modify: `frontend/src/app/accountant/reports/page.tsx`

Remove: `birBook` state, `accountId` state, `accounts` query, BIR-specific modal fields (Book selector, Account selector), BIR routing branch in `handleView`. Change `ReportType` to exclude `'bir'`. Replace BIR card `onClick` with a `Link`.

- [ ] **Step 1: Replace the file content**

```tsx
'use client'

import Link from 'next/link'
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { getAccountantClients } from '@/lib/api/accountant/clients'
import { useRouter } from 'next/navigation'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import type { ClientProfile } from '@/types/admin'

type ReportType = 'income-statement' | 'expense-breakdown'

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
}

export default function AccountantReportsPage() {
  const router = useRouter()
  const [pending,  setPending]  = useState<ReportType | null>(null)
  const [clientId, setClientId] = useState('')
  const [start,    setStart]    = useState(defaultStart())
  const [end,      setEnd]      = useState(defaultEnd())

  const { data: clients } = useQuery({
    queryKey: ['accountant-clients'],
    queryFn:  () => getAccountantClients(),
  })

  function openModal(report: ReportType) {
    setClientId('')
    setPending(report)
  }

  function handleView() {
    if (!clientId || !pending) return
    const base = `/accountant/reports/${clientId}`
    const qs   = `?start=${start}&end=${end}`
    router.push(`${base}/${pending}${qs}`)
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

        <Link href="/accountant/reports/bir" className={cardCls}>
          <div className="text-[28px] mb-3">📋</div>
          <div className="text-sm font-bold text-gray-900 mb-1">BIR Books</div>
          <div className="text-xs text-gray-500 leading-relaxed flex-1">
            Official BIR books of account: CRB, CDB, General Journal, General Ledger.
          </div>
          <div className="mt-3.5 text-xs font-bold text-indigo-600">View Book →</div>
        </Link>
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
                onChange={(e) => setClientId(e.target.value)}
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
          </div>

          <div className="flex justify-end mt-4">
            <button
              onClick={handleView}
              disabled={!clientId}
              className="bg-indigo-600 text-white text-xs font-semibold px-4 py-2 rounded-md hover:bg-indigo-700 transition-colors disabled:opacity-50"
            >
              View Report →
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
```

- [ ] **Step 2: Verify accountant landing page**

Open `http://localhost:3000/accountant/reports`. Confirm:
- "BIR Books" card navigates directly to `/accountant/reports/bir` (no modal)
- "Income Statement" and "Expense Breakdown" cards still open the modal with client + date selectors
- No TypeScript errors in the terminal

- [ ] **Step 3: Commit**

```bash
git add frontend/src/app/accountant/reports/page.tsx
git commit -m "refactor: accountant BIR Books card navigates directly, removes modal"
```

---

### Task 6: Update admin reports landing page

**Files:**
- Modify: `frontend/src/app/admin/reports/page.tsx`

Same changes as Task 5 but for admin. `getClients()` returns paginated data — the existing `(clientsRes as any)?.data ?? []` normalization is preserved for the modal client list.

- [ ] **Step 1: Replace the file content**

```tsx
'use client'

import Link from 'next/link'
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { getClients } from '@/lib/api/admin/clients'
import { useRouter } from 'next/navigation'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'

type ReportType = 'income-statement' | 'expense-breakdown'

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
}

export default function AdminReportsPage() {
  const router = useRouter()
  const [pending,  setPending]  = useState<ReportType | null>(null)
  const [clientId, setClientId] = useState('')
  const [start,    setStart]    = useState(defaultStart())
  const [end,      setEnd]      = useState(defaultEnd())

  const { data: clientsRes } = useQuery({
    queryKey: ['admin-clients', {}],
    queryFn:  () => getClients(),
  })
  const clients: { id: string; name: string }[] = (clientsRes as any)?.data ?? []

  function openModal(report: ReportType) {
    setClientId('')
    setPending(report)
  }

  function handleView() {
    if (!clientId || !pending) return
    const base = `/admin/reports/${clientId}`
    const qs   = `?start=${start}&end=${end}`
    router.push(`${base}/${pending}${qs}`)
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

        <Link href="/admin/reports/bir" className={cardCls}>
          <div className="text-[28px] mb-3">📋</div>
          <div className="text-sm font-bold text-gray-900 mb-1">BIR Books</div>
          <div className="text-xs text-gray-500 leading-relaxed flex-1">
            Official BIR books of account: CRB, CDB, General Journal, General Ledger.
          </div>
          <div className="mt-3.5 text-xs font-bold text-indigo-600">View Book →</div>
        </Link>
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
                onChange={(e) => setClientId(e.target.value)}
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
          </div>

          <div className="flex justify-end mt-4">
            <button
              onClick={handleView}
              disabled={!clientId}
              className="bg-indigo-600 text-white text-xs font-semibold px-4 py-2 rounded-md hover:bg-indigo-700 transition-colors disabled:opacity-50"
            >
              View Report →
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
git commit -m "refactor: admin BIR Books card navigates directly, removes modal"
```

---

### Task 7: Delete old accountant/admin book pages

**Files:**
- Delete: `frontend/src/app/accountant/reports/[clientId]/bir/[book]/page.tsx`
- Delete: `frontend/src/app/admin/reports/[clientId]/bir/[book]/page.tsx`

These pages are only reachable from the modal navigation that was removed in Tasks 5 and 6. The `[clientId]` dynamic segment continues to exist for Income Statement and Expense Breakdown routes.

- [ ] **Step 1: Delete the files and commit**

```bash
git rm "frontend/src/app/accountant/reports/[clientId]/bir/[book]/page.tsx"
git rm "frontend/src/app/admin/reports/[clientId]/bir/[book]/page.tsx"
git commit -m "chore: remove deprecated accountant/admin BIR book pages"
```

If any empty `bir/[book]` or `bir` directories remain, remove them:

```bash
git rm -r "frontend/src/app/accountant/reports/[clientId]/bir" 2>/dev/null; true
git rm -r "frontend/src/app/admin/reports/[clientId]/bir" 2>/dev/null; true
git commit -m "chore: remove empty bir directory stubs" 2>/dev/null; true
```

---

### Task 8: End-to-end verification

No automated frontend tests exist for these pages. Verify manually.

- [ ] **Step 1: Verify client flow**

1. Log in as a **client** user
2. Go to `/client/reports/bir`
3. Confirm: no client selector visible, book tabs work, date inputs work, GL requires account selection, "View Book" loads the table

- [ ] **Step 2: Verify accountant flow**

1. Log in as an **accountant** user
2. Go to `/accountant/reports`
3. Click "BIR Books" card — confirm it navigates directly to `/accountant/reports/bir` (no modal)
4. On `/accountant/reports/bir`: client selector shows, "View Book" is disabled until client is selected
5. Select a client → GL account selector appears when GL tab is active
6. Set dates, select CRB, click "View Book" → table loads
7. Switch to GL, select account, click "View Book" → GL table loads
8. Switch to a different client → `loadedBooks` resets (table disappears, empty state shown)
9. Click "Income Statement" card on landing → modal still opens with client + date selectors

- [ ] **Step 3: Verify admin flow**

1. Log in as an **admin** user
2. Go to `/admin/reports`
3. Click "BIR Books" card — navigates directly to `/admin/reports/bir`
4. Same verifications as accountant in Step 2 (admin uses `getClients` which returns paginated data — confirm client list populates correctly)

- [ ] **Step 4: Check TypeScript**

```bash
cd frontend && npx tsc --noEmit
```

Expected: no errors.
