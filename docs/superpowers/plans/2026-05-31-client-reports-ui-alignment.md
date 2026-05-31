# Client Reports UI Alignment Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Align all client-facing report pages and table components with the approved mockup at `.superpowers/brainstorm/2019-1779941388/content/client-routes.html`.

**Architecture:** In-place edits to existing page files and table components. Two new shared components (`ReportBreadcrumb`, `ReportToolbar`) eliminate repetition across Income Statement and Expense Breakdown. BIR Books is restructured from a navigate-away pattern to an inline tab-based view.

**Tech Stack:** Next.js 14 App Router, TypeScript, Tailwind CSS, shadcn/ui, @tanstack/react-query. No unit test framework is installed in the frontend — verification uses `tsc --noEmit` and `next lint`.

---

## File Map

| Action | File |
|--------|------|
| Create | `frontend/src/components/reports/ReportBreadcrumb.tsx` |
| Create | `frontend/src/components/reports/ReportToolbar.tsx` |
| Modify | `frontend/src/app/client/reports/page.tsx` |
| Modify | `frontend/src/components/reports/IncomeStatementTable.tsx` |
| Modify | `frontend/src/app/client/reports/income-statement/page.tsx` |
| Modify | `frontend/src/components/reports/ExpenseBreakdownTable.tsx` |
| Modify | `frontend/src/app/client/reports/expense-breakdown/page.tsx` |
| Modify | `frontend/src/app/client/reports/bir/page.tsx` |

`BIRBookTable.tsx` — no changes. `ExportPDFButton.tsx` — no changes. `PendingTransactionNote.tsx` — no changes.

---

## Task 1: ReportBreadcrumb component

**Files:**
- Create: `frontend/src/components/reports/ReportBreadcrumb.tsx`

- [ ] **Step 1: Create the component**

```tsx
// frontend/src/components/reports/ReportBreadcrumb.tsx
import Link from 'next/link'

interface Props {
  title: string
}

export function ReportBreadcrumb({ title }: Props) {
  return (
    <div className="flex items-center gap-1.5 text-xs text-gray-400 mb-1.5">
      <Link href="/client/reports" className="text-indigo-600 font-medium hover:underline">
        Reports
      </Link>
      <span>›</span>
      <span>{title}</span>
    </div>
  )
}
```

- [ ] **Step 2: Verify types**

```bash
cd frontend && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/reports/ReportBreadcrumb.tsx
git commit -m "feat: add ReportBreadcrumb shared component"
```

---

## Task 2: ReportToolbar component

**Files:**
- Create: `frontend/src/components/reports/ReportToolbar.tsx`

- [ ] **Step 1: Create the component**

```tsx
// frontend/src/components/reports/ReportToolbar.tsx
import type { ReactNode } from 'react'

interface Props {
  start: string
  end: string
  onChange: (start: string, end: string) => void
  onGenerate: () => void
  exportButton: ReactNode
}

export function ReportToolbar({ start, end, onChange, onGenerate, exportButton }: Props) {
  return (
    <div className="flex items-center gap-2 mb-4 flex-wrap">
      <span className="text-xs text-gray-500 font-medium whitespace-nowrap">Period</span>
      <input
        type="date"
        value={start}
        onChange={(e) => onChange(e.target.value, end)}
        className="border border-gray-200 rounded-md px-2.5 py-1.5 text-xs text-gray-700 bg-white"
      />
      <span className="text-xs text-gray-300">–</span>
      <input
        type="date"
        value={end}
        onChange={(e) => onChange(start, e.target.value)}
        className="border border-gray-200 rounded-md px-2.5 py-1.5 text-xs text-gray-700 bg-white"
      />
      <button
        onClick={onGenerate}
        className="px-3.5 py-1.5 bg-indigo-50 border border-indigo-200 text-indigo-700 text-xs font-semibold rounded-md hover:bg-indigo-100"
      >
        Generate
      </button>
      <div className="flex-1" />
      {exportButton}
    </div>
  )
}
```

- [ ] **Step 2: Verify types**

```bash
cd frontend && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/reports/ReportToolbar.tsx
git commit -m "feat: add ReportToolbar shared component"
```

---

## Task 3: Reports Hub page

**Files:**
- Modify: `frontend/src/app/client/reports/page.tsx`

- [ ] **Step 1: Replace the hub page**

```tsx
// frontend/src/app/client/reports/page.tsx
import Link from 'next/link'

const REPORTS = [
  {
    href: '/client/reports/income-statement',
    icon: '📊',
    title: 'Income Statement',
    description: 'Compare your total income against expenses for any period. Shows net profit or loss.',
    tags: ['Profit & Loss', 'Any date range', 'PDF export'],
    cta: 'View Report →',
  },
  {
    href: '/client/reports/expense-breakdown',
    icon: '🧾',
    title: 'Expense Breakdown',
    description: 'See where your money went, grouped by expense category with percentage totals.',
    tags: ['By category', 'Any date range', 'PDF export'],
    cta: 'View Report →',
  },
  {
    href: '/client/reports/bir',
    icon: '📚',
    title: 'BIR Books',
    description: 'Cash books and journals formatted for BIR loose-leaf submission. For reference only.',
    tags: ['CRB', 'CDB', 'GJ', 'GL', 'PDF export'],
    cta: 'Open Books →',
  },
]

export default function ReportsPage() {
  return (
    <div>
      <h1 className="text-lg font-bold text-gray-900 tracking-tight">Reports</h1>
      <p className="text-xs text-gray-400 mt-0.5 mb-5">
        Read-only — your accountant handles BIR filing
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {REPORTS.map((r) => (
          <Link key={r.href} href={r.href} className="block">
            <div className="bg-white border border-gray-200 rounded-xl p-5 cursor-pointer flex flex-col h-full hover:border-indigo-300 hover:shadow-[0_0_0_3px_#eef2ff] transition-all">
              <div className="text-3xl mb-3.5">{r.icon}</div>
              <div className="text-[15px] font-bold text-gray-900 mb-1.5">{r.title}</div>
              <div className="text-xs text-gray-500 leading-relaxed flex-1">{r.description}</div>
              <div className="flex flex-wrap gap-1 mt-3">
                {r.tags.map((tag) => (
                  <span
                    key={tag}
                    className="text-[10px] font-semibold px-2 py-0.5 rounded bg-gray-100 text-gray-500"
                  >
                    {tag}
                  </span>
                ))}
              </div>
              <div className="mt-4 text-xs font-bold text-indigo-600">{r.cta}</div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Verify types and lint**

```bash
cd frontend && npx tsc --noEmit && npx next lint
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/app/client/reports/page.tsx
git commit -m "feat: align reports hub page with mockup — icons, tags, CTA, hover ring"
```

---

## Task 4: IncomeStatementTable visual update

**Files:**
- Modify: `frontend/src/components/reports/IncomeStatementTable.tsx`

Context: `IncomeStatement` type (from `src/types/report.ts`) has `income: ReportLine[]`, `expenses: ReportLine[]`, `totals: { totalIncome, totalExpenses, netIncome }`. The component receives an optional `refetchKey` added in this task to support the Generate button in Task 5.

- [ ] **Step 1: Replace the table component**

```tsx
// frontend/src/components/reports/IncomeStatementTable.tsx
'use client'

import { useQuery } from '@tanstack/react-query'
import { getIncomeStatement } from '@/lib/api/reports'
import { formatCurrency } from '@/lib/utils/formatCurrency'
import { Skeleton } from '@/components/ui/skeleton'
import { EmptyState } from '@/components/shared/EmptyState'

interface Props {
  clientId?: string
  start: string
  end: string
  refetchKey?: number
}

export function IncomeStatementTable({ clientId, start, end, refetchKey = 0 }: Props) {
  const { data, isLoading } = useQuery({
    queryKey: ['income-statement', clientId, start, end, refetchKey],
    queryFn: () => getIncomeStatement({ clientId, start, end }),
    enabled: !!start && !!end,
  })

  if (isLoading) return <Skeleton className="h-40 w-full" />
  if (!data) return <EmptyState message="No data available." />

  const isProfit = data.totals.netIncome >= 0

  return (
    <table className="w-full border-collapse text-sm">
      <tbody>
        {/* INCOME section header */}
        <tr className="bg-gray-50">
          <td
            colSpan={2}
            className="px-3.5 py-1.5 text-[10px] font-bold uppercase tracking-wide text-gray-500 border-b border-gray-200"
          >
            Income
          </td>
        </tr>

        {data.income.map((row) => (
          <tr key={row.accountCode} className="border-b border-gray-50">
            <td className="px-3.5 py-2 text-gray-700">{row.accountName}</td>
            <td className="px-3.5 py-2 text-right text-gray-700 tabular-nums">
              {formatCurrency(row.total)}
            </td>
          </tr>
        ))}

        {/* Total Income subtotal */}
        <tr className="bg-gray-50 border-b border-gray-200">
          <td className="px-3.5 py-2 font-bold text-green-700">Total Income</td>
          <td className="px-3.5 py-2 text-right font-bold text-green-700 tabular-nums">
            {formatCurrency(data.totals.totalIncome)}
          </td>
        </tr>

        {/* EXPENSES section header */}
        <tr className="bg-gray-50">
          <td
            colSpan={2}
            className="px-3.5 py-1.5 text-[10px] font-bold uppercase tracking-wide text-gray-500 border-b border-gray-200"
          >
            Expenses
          </td>
        </tr>

        {data.expenses.map((row) => (
          <tr key={row.accountCode} className="border-b border-gray-50">
            <td className="px-3.5 py-2 text-gray-700">{row.accountName}</td>
            <td className="px-3.5 py-2 text-right text-gray-700 tabular-nums">
              {formatCurrency(row.total)}
            </td>
          </tr>
        ))}

        {/* Total Expenses subtotal */}
        <tr className="bg-gray-50 border-b border-gray-200">
          <td className="px-3.5 py-2 font-bold text-red-700">Total Expenses</td>
          <td className="px-3.5 py-2 text-right font-bold text-red-700 tabular-nums">
            {formatCurrency(data.totals.totalExpenses)}
          </td>
        </tr>

        {/* Net Income row */}
        <tr className={`border-t-2 border-indigo-500 ${isProfit ? 'bg-green-50' : 'bg-red-50'}`}>
          <td
            className={`px-3.5 py-3 text-[14px] font-extrabold ${
              isProfit ? 'text-green-800' : 'text-red-800'
            }`}
          >
            Net Income
          </td>
          <td
            className={`px-3.5 py-3 text-right text-[14px] font-extrabold tabular-nums ${
              isProfit ? 'text-green-800' : 'text-red-800'
            }`}
          >
            {formatCurrency(data.totals.netIncome)}
          </td>
        </tr>
      </tbody>
    </table>
  )
}
```

- [ ] **Step 2: Verify types**

```bash
cd frontend && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/reports/IncomeStatementTable.tsx
git commit -m "feat: color-coded section headers and totals in IncomeStatementTable"
```

---

## Task 5: Income Statement page layout

**Files:**
- Modify: `frontend/src/app/client/reports/income-statement/page.tsx`

- [ ] **Step 1: Replace the page**

```tsx
// frontend/src/app/client/reports/income-statement/page.tsx
'use client'

import { useState } from 'react'
import { ReportBreadcrumb } from '@/components/reports/ReportBreadcrumb'
import { ReportToolbar } from '@/components/reports/ReportToolbar'
import { IncomeStatementTable } from '@/components/reports/IncomeStatementTable'
import { ExportPDFButton } from '@/components/reports/ExportPDFButton'
import { PendingTransactionNote } from '@/components/reports/PendingTransactionNote'

function getDefaultDates() {
  const now = new Date()
  const start = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]
  const end = now.toISOString().split('T')[0]
  return { start, end }
}

export default function IncomeStatementPage() {
  const defaults = getDefaultDates()
  const [start, setStart] = useState(defaults.start)
  const [end, setEnd] = useState(defaults.end)
  const [refetchKey, setRefetchKey] = useState(0)

  return (
    <div>
      <ReportBreadcrumb title="Income Statement" />
      <div className="mb-4">
        <h1 className="text-lg font-bold text-gray-900 tracking-tight">Income Statement</h1>
        <p className="text-xs text-gray-400 mt-0.5">Approved transactions only</p>
      </div>
      <ReportToolbar
        start={start}
        end={end}
        onChange={(s, e) => { setStart(s); setEnd(e) }}
        onGenerate={() => setRefetchKey((k) => k + 1)}
        exportButton={
          <ExportPDFButton type="income-statement" start={start} end={end} />
        }
      />
      {/* PendingTransactionNote self-hides when count === 0.
          Wire count to API pendingCount when the backend supports it. */}
      <PendingTransactionNote count={0} />
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <IncomeStatementTable start={start} end={end} refetchKey={refetchKey} />
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Verify types and lint**

```bash
cd frontend && npx tsc --noEmit && npx next lint
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/app/client/reports/income-statement/page.tsx
git commit -m "feat: align income statement page layout with mockup — breadcrumb, toolbar, card"
```

---

## Task 6: ExpenseBreakdownTable visual update

**Files:**
- Modify: `frontend/src/components/reports/ExpenseBreakdownTable.tsx`

Context: `ExpenseBreakdown` type has `expenses: ReportLine[]` and `grandTotal: number`. This task adds a "% of Total" column with a proportional bar visualization. Also adds `refetchKey` prop to support Generate button in Task 7.

- [ ] **Step 1: Replace the table component**

```tsx
// frontend/src/components/reports/ExpenseBreakdownTable.tsx
'use client'

import { useQuery } from '@tanstack/react-query'
import { getExpenseBreakdown } from '@/lib/api/reports'
import { formatCurrency } from '@/lib/utils/formatCurrency'
import { Skeleton } from '@/components/ui/skeleton'
import { EmptyState } from '@/components/shared/EmptyState'

interface Props {
  clientId?: string
  start: string
  end: string
  refetchKey?: number
}

export function ExpenseBreakdownTable({ clientId, start, end, refetchKey = 0 }: Props) {
  const { data, isLoading } = useQuery({
    queryKey: ['expense-breakdown', clientId, start, end, refetchKey],
    queryFn: () => getExpenseBreakdown({ clientId, start, end }),
    enabled: !!start && !!end,
  })

  if (isLoading) return <Skeleton className="h-40 w-full" />
  if (!data) return <EmptyState message="No data available." />

  // Largest row amount used to scale bar widths proportionally (max 90px)
  const maxAmount = Math.max(...data.expenses.map((r) => r.total), 1)

  return (
    <table className="w-full border-collapse text-sm">
      <thead>
        <tr className="bg-gray-50 border-b border-gray-200">
          <th className="px-3.5 py-2 text-left text-[10px] font-bold uppercase tracking-wide text-gray-500">
            Category
          </th>
          <th className="px-3.5 py-2 text-right text-[10px] font-bold uppercase tracking-wide text-gray-500">
            Amount
          </th>
          <th className="px-3.5 py-2 text-right text-[10px] font-bold uppercase tracking-wide text-gray-500 min-w-[130px]">
            % of Total
          </th>
        </tr>
      </thead>
      <tbody>
        {data.expenses.map((row) => {
          const pct = data.grandTotal > 0 ? (row.total / data.grandTotal) * 100 : 0
          const barWidth = Math.round((row.total / maxAmount) * 90)
          return (
            <tr key={row.accountCode} className="border-b border-gray-50">
              <td className="px-3.5 py-2 text-gray-700">{row.accountName}</td>
              <td className="px-3.5 py-2 text-right text-gray-700 tabular-nums">
                {formatCurrency(row.total)}
              </td>
              <td className="px-3.5 py-2">
                <div className="flex items-center gap-2 justify-end">
                  <div
                    className="h-1.5 rounded-sm bg-red-300 flex-shrink-0"
                    style={{ width: `${barWidth}px` }}
                  />
                  <span className="text-[11px] text-gray-400 min-w-[34px] text-right">
                    {pct.toFixed(1)}%
                  </span>
                </div>
              </td>
            </tr>
          )
        })}
        <tr className="bg-gray-50 border-t-2 border-gray-200">
          <td className="px-3.5 py-2.5 font-bold text-gray-700 text-[13px]">Total Expenses</td>
          <td className="px-3.5 py-2.5 text-right font-bold text-gray-700 text-[13px] tabular-nums">
            {formatCurrency(data.grandTotal)}
          </td>
          <td className="px-3.5 py-2.5" />
        </tr>
      </tbody>
    </table>
  )
}
```

- [ ] **Step 2: Verify types**

```bash
cd frontend && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/reports/ExpenseBreakdownTable.tsx
git commit -m "feat: add % of Total bar column to ExpenseBreakdownTable"
```

---

## Task 7: Expense Breakdown page layout

**Files:**
- Modify: `frontend/src/app/client/reports/expense-breakdown/page.tsx`

- [ ] **Step 1: Replace the page**

```tsx
// frontend/src/app/client/reports/expense-breakdown/page.tsx
'use client'

import { useState } from 'react'
import { ReportBreadcrumb } from '@/components/reports/ReportBreadcrumb'
import { ReportToolbar } from '@/components/reports/ReportToolbar'
import { ExpenseBreakdownTable } from '@/components/reports/ExpenseBreakdownTable'
import { ExportPDFButton } from '@/components/reports/ExportPDFButton'
import { PendingTransactionNote } from '@/components/reports/PendingTransactionNote'

function getDefaultDates() {
  const now = new Date()
  const start = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]
  const end = now.toISOString().split('T')[0]
  return { start, end }
}

export default function ExpenseBreakdownPage() {
  const defaults = getDefaultDates()
  const [start, setStart] = useState(defaults.start)
  const [end, setEnd] = useState(defaults.end)
  const [refetchKey, setRefetchKey] = useState(0)

  return (
    <div>
      <ReportBreadcrumb title="Expense Breakdown" />
      <div className="mb-4">
        <h1 className="text-lg font-bold text-gray-900 tracking-tight">Expense Breakdown</h1>
        <p className="text-xs text-gray-400 mt-0.5">Approved transactions only</p>
      </div>
      <ReportToolbar
        start={start}
        end={end}
        onChange={(s, e) => { setStart(s); setEnd(e) }}
        onGenerate={() => setRefetchKey((k) => k + 1)}
        exportButton={
          <ExportPDFButton type="expense-breakdown" start={start} end={end} />
        }
      />
      {/* PendingTransactionNote self-hides when count === 0.
          Wire count to API pendingCount when the backend supports it. */}
      <PendingTransactionNote count={0} />
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <ExpenseBreakdownTable start={start} end={end} refetchKey={refetchKey} />
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Verify types and lint**

```bash
cd frontend && npx tsc --noEmit && npx next lint
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/app/client/reports/expense-breakdown/page.tsx
git commit -m "feat: align expense breakdown page layout with mockup — breadcrumb, toolbar, card"
```

---

## Task 8: BIR Books page refactor

**Files:**
- Modify: `frontend/src/app/client/reports/bir/page.tsx`

This task removes the `router.push` navigation and renders `BIRBookTable` inline. The book selector becomes a segmented tab bar. Tabs, dates, account selector (GL only), and "View Book" button live on one toolbar row. `shouldLoad` gates the table display — clicking "View Book" sets it to `true`; changing book or dates resets it to `false`.

- [ ] **Step 1: Replace the page**

```tsx
// frontend/src/app/client/reports/bir/page.tsx
'use client'

import { useState } from 'react'
import { ReportBreadcrumb } from '@/components/reports/ReportBreadcrumb'
import { BIRBookTable } from '@/components/reports/BIRBookTable'
import { ExportPDFButton } from '@/components/reports/ExportPDFButton'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

const BOOKS = [
  { value: 'crb', label: 'CRB' },
  { value: 'cdb', label: 'CDB' },
  { value: 'gj', label: 'GJ' },
  { value: 'gl', label: 'GL' },
]

function getDefaultDates() {
  const now = new Date()
  const start = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]
  const end = now.toISOString().split('T')[0]
  return { start, end }
}

export default function BIRPage() {
  const defaults = getDefaultDates()
  const [book, setBook] = useState('crb')
  const [start, setStart] = useState(defaults.start)
  const [end, setEnd] = useState(defaults.end)
  const [accountId, setAccountId] = useState<string | undefined>()
  const [shouldLoad, setShouldLoad] = useState(false)

  function handleTabChange(newBook: string) {
    setBook(newBook)
    setShouldLoad(false)
  }

  function handleDateChange(field: 'start' | 'end', value: string) {
    if (field === 'start') setStart(value)
    else setEnd(value)
    setShouldLoad(false)
  }

  return (
    <div>
      <ReportBreadcrumb title="BIR Books" />
      <div className="mb-4">
        <h1 className="text-lg font-bold text-gray-900 tracking-tight">BIR Books</h1>
        <p className="text-xs text-gray-400 mt-0.5">
          For reference only — your accountant handles official submission
        </p>
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-2 flex-wrap mb-4">
        {/* Segmented tab bar */}
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
          className="border border-gray-200 rounded-md px-2.5 py-1.5 text-xs text-gray-700 bg-white"
        />
        <span className="text-xs text-gray-300">–</span>
        <input
          type="date"
          value={end}
          onChange={(e) => handleDateChange('end', e.target.value)}
          className="border border-gray-200 rounded-md px-2.5 py-1.5 text-xs text-gray-700 bg-white"
        />

        {/* GL account selector — only shown for GL book */}
        {book === 'gl' && (
          <Select value={accountId} onValueChange={setAccountId}>
            <SelectTrigger className="w-56 h-[30px] text-xs">
              <SelectValue placeholder="Select account" />
            </SelectTrigger>
            <SelectContent>
              {/* TODO: fetch account list from API when endpoint is available */}
              <SelectItem value="1001">1001 — Cash on Hand</SelectItem>
              <SelectItem value="1002">1002 — Cash in Bank</SelectItem>
              <SelectItem value="4001">4001 — Sales Revenue</SelectItem>
              <SelectItem value="5001">5001 — Cost of Goods Sold</SelectItem>
              <SelectItem value="5002">5002 — Utilities Expense</SelectItem>
            </SelectContent>
          </Select>
        )}

        {/* View Book button */}
        <button
          onClick={() => setShouldLoad(true)}
          className="px-3.5 py-1.5 bg-indigo-50 border border-indigo-200 text-indigo-700 text-xs font-semibold rounded-md hover:bg-indigo-100"
        >
          View Book
        </button>

        <div className="flex-1" />
        <ExportPDFButton type={book} start={start} end={end} accountId={accountId} />
      </div>

      {/* BIR book table — only shown after "View Book" is clicked */}
      {shouldLoad && (
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          <BIRBookTable book={book} start={start} end={end} accountId={accountId} />
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Verify types and lint**

```bash
cd frontend && npx tsc --noEmit && npx next lint
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/app/client/reports/bir/page.tsx
git commit -m "feat: refactor BIR Books to inline tab view, remove router.push navigation"
```

---

## Self-Review

**Spec coverage:**
- ✅ Section 1 — `ReportBreadcrumb` (Task 1) + `ReportToolbar` (Task 2)
- ✅ Section 2 — Hub page (Task 3): icons, tags, CTA, hover ring, subtitle
- ✅ Section 3 — `IncomeStatementTable` (Task 4) + Income Statement page (Task 5): breadcrumb, toolbar, pending note, color-coded table rows
- ✅ Section 4 — `ExpenseBreakdownTable` (Task 6) + Expense Breakdown page (Task 7): % bar column, breadcrumb, toolbar, pending note
- ✅ Section 5 — BIR Books page (Task 8): tab bar, inline table, account selector, no navigation

**Placeholder scan:** No TBDs in code steps. The GL account selector has a `// TODO: fetch account list from API` comment — intentional per spec ("add a TODO comment if not available").

**Type consistency:**
- `refetchKey?: number` prop added to both `IncomeStatementTable` (Task 4) and `ExpenseBreakdownTable` (Task 6) — used correctly in Task 5 and Task 7 respectively.
- `ReportToolbar` `exportButton: ReactNode` — consumed correctly in Tasks 5, 7.
- `ReportBreadcrumb` `title: string` — consumed correctly in Tasks 5, 7, 8.
- `BIRBookTable` props `{ book, start, end, accountId }` — unchanged, consumed correctly in Task 8.
- `ExportPDFButton` props `{ type, start, end, accountId }` — unchanged, all call sites pass correct types.
