# BIR Books Empty States Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the blank pre-generation area and generic "No data available." message on the BIR Books page with two purpose-built empty state components.

**Architecture:** Two new presentational components (`BIREmptyState`, `BIRNoDataState`) are rendered by existing containers (`bir/page.tsx` and `BIRBookTable.tsx` respectively). The `ExportPDFButton` gains a `disabled` prop so it can be grayed out until a book is generated.

**Tech Stack:** Next.js 14 App Router, TypeScript, Tailwind CSS, Lucide React, shadcn/ui

---

## File Map

| Action | Path | Responsibility |
|---|---|---|
| Create | `frontend/src/components/reports/BIRNoDataState.tsx` | "No entries for this period" state — shown after generation when 0 rows returned |
| Create | `frontend/src/components/reports/BIREmptyState.tsx` | Pre-generation state — shown before user clicks View Book |
| Modify | `frontend/src/components/reports/BIRBookTable.tsx` | Replace generic EmptyState with BIRNoDataState; guard for empty rows |
| Modify | `frontend/src/app/client/reports/bir/page.tsx` | Render BIREmptyState when !shouldLoad; pass disabled to ExportPDFButton |
| Modify | `frontend/src/components/reports/ExportPDFButton.tsx` | Add `disabled` prop |

---

## Task 1: Create `BIRNoDataState` component

**Files:**
- Create: `frontend/src/components/reports/BIRNoDataState.tsx`

- [ ] **Step 1: Create the file**

```tsx
import { BookOpen } from 'lucide-react'
import { formatDate } from '@/lib/utils/formatDate'

const BOOK_LABELS: Record<string, string> = {
  crb: 'Cash Receipts Book (CRB)',
  cdb: 'Cash Disbursements Book (CDB)',
  gj: 'General Journal (GJ)',
  gl: 'General Ledger (GL)',
}

interface Props {
  book: string
  start: string
  end: string
}

export function BIRNoDataState({ book, start, end }: Props) {
  const label = BOOK_LABELS[book] ?? book.toUpperCase()
  return (
    <div className="flex flex-col items-center text-center gap-3 py-16 px-8">
      <div className="bg-indigo-50 text-indigo-400 rounded-full p-3">
        <BookOpen className="h-9 w-9" />
      </div>
      <p className="text-sm font-semibold text-gray-900">No entries for this period</p>
      <p className="text-sm text-gray-500 max-w-sm">
        There are no {label} records between{' '}
        <span className="font-semibold text-gray-700">{formatDate(start)}</span> and{' '}
        <span className="font-semibold text-gray-700">{formatDate(end)}</span>. This isn&apos;t an
        error — it just means no transactions have been recorded yet for this date range.
      </p>
    </div>
  )
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `cd frontend && npx tsc --noEmit`
Expected: no errors for the new file.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/reports/BIRNoDataState.tsx
git commit -m "feat: add BIRNoDataState component"
```

---

## Task 2: Wire `BIRNoDataState` into `BIRBookTable`

**Files:**
- Modify: `frontend/src/components/reports/BIRBookTable.tsx`

Current state of the relevant lines in `BIRBookTable.tsx`:
- Line 9: `import { EmptyState } from '@/components/shared/EmptyState'`
- Line 32: `if (!data) return <EmptyState message="No data available." />`
- Line 119: `if (book === 'gj') {` — GJ table branch
- Line 150: `const isCrb = book === 'crb'` — CRB/CDB table branch

- [ ] **Step 1: Swap the import**

Replace line 9:
```tsx
// remove:
import { EmptyState } from '@/components/shared/EmptyState'
// add:
import { BIRNoDataState } from '@/components/reports/BIRNoDataState'
```

- [ ] **Step 2: Replace the null-data guard (line 32)**

```tsx
// remove:
if (!data) return <EmptyState message="No data available." />
// add:
if (!data) return <BIRNoDataState book={book} start={start} end={end} />
```

- [ ] **Step 3: Add empty-rows guard in the GJ branch**

Inside the `if (book === 'gj') {` block, add one line as the first statement (before the existing `return (<Table>...`):

```tsx
if (book === 'gj') {
  if (birData.rows.length === 0) return <BIRNoDataState book={book} start={start} end={end} />
  // existing return (<Table>...) follows unchanged
```

- [ ] **Step 4: Add empty-rows guard in the CRB/CDB branch**

After the existing line `const isCrb = book === 'crb'`, insert one line (before the existing `return (<Table>...`):

```tsx
const isCrb = book === 'crb'
if (birData.rows.length === 0) return <BIRNoDataState book={book} start={start} end={end} />
// existing return (<Table>...) follows unchanged
```

- [ ] **Step 5: Verify TypeScript compiles**

Run: `cd frontend && npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 6: Manual verify — no-data state**

Start the dev server (`cd frontend && npm run dev`) and go to `/client/reports/bir`.
1. Pick a date range with no transactions (e.g., far-future dates like 2030-01-01 to 2030-01-31).
2. Click **View Book**.
3. Expected: a book icon, "No entries for this period" headline, and a sentence naming the book with the selected dates in bold — not "No data available."

- [ ] **Step 7: Commit**

```bash
git add frontend/src/components/reports/BIRBookTable.tsx
git commit -m "feat: replace generic EmptyState with BIRNoDataState in BIRBookTable"
```

---

## Task 3: Create `BIREmptyState` component

**Files:**
- Create: `frontend/src/components/reports/BIREmptyState.tsx`

- [ ] **Step 1: Create the file**

```tsx
'use client'

import { BookOpen, ClipboardList, Info, Lock } from 'lucide-react'

const BOOK_LABELS: Record<string, string> = {
  crb: 'Cash Receipts Book (CRB)',
  cdb: 'Cash Disbursements Book (CDB)',
  gj: 'General Journal (GJ)',
  gl: 'General Ledger (GL)',
}

interface Props {
  book: string
  onGenerate: () => void
  disabled?: boolean
}

export function BIREmptyState({ book, onGenerate, disabled }: Props) {
  const label = BOOK_LABELS[book] ?? book.toUpperCase()
  return (
    <div className="border-2 border-dashed border-indigo-200 bg-indigo-50/40 rounded-xl p-10 flex flex-col items-center text-center gap-4">
      <div className="bg-indigo-100 text-indigo-500 rounded-full p-3">
        <BookOpen className="h-10 w-10" />
      </div>

      <p className="text-base font-semibold text-gray-900">
        Your book hasn&apos;t been generated yet
      </p>

      <p className="text-sm text-gray-500">
        Select a date range above, then click{' '}
        <span className="font-semibold text-gray-700">View Book</span> to load your {label}.
      </p>

      <div className="bg-indigo-50 border border-indigo-100 rounded-lg px-4 py-2.5 flex items-center gap-2 text-xs text-indigo-700">
        <Info className="h-3.5 w-3.5 flex-shrink-0" />
        No data will appear until you generate the book first.
      </div>

      <div className="flex items-stretch divide-x divide-gray-200 border border-gray-200 rounded-lg overflow-hidden bg-white w-full max-w-md text-xs text-gray-500">
        {[
          {
            n: 1,
            text: (
              <>
                Pick your <span className="font-semibold text-gray-700">start</span> and{' '}
                <span className="font-semibold text-gray-700">end</span> date
              </>
            ),
          },
          {
            n: 2,
            text: (
              <>
                Click <span className="font-semibold text-gray-700">View Book</span> to generate
              </>
            ),
          },
          {
            n: 3,
            text: (
              <>
                View or <span className="font-semibold text-gray-700">download</span> your BIR book
              </>
            ),
          },
        ].map(({ n, text }) => (
          <div key={n} className="flex-1 flex flex-col items-center gap-1 px-4 py-3">
            <span className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-600 text-[10px] font-bold flex items-center justify-center">
              {n}
            </span>
            <span>{text}</span>
          </div>
        ))}
      </div>

      <div className="relative inline-flex">
        {!disabled && (
          <span className="absolute inset-0 rounded-md bg-indigo-300 animate-ping" />
        )}
        <button
          onClick={onGenerate}
          disabled={disabled}
          className={[
            'relative px-4 py-2 text-xs font-semibold rounded-md flex items-center gap-2',
            disabled
              ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
              : 'bg-indigo-600 hover:bg-indigo-700 text-white cursor-pointer',
          ].join(' ')}
        >
          <ClipboardList className="h-3.5 w-3.5" />
          Generate book ↗
        </button>
      </div>

      <p className="text-xs text-gray-400 flex items-center gap-1">
        <Lock className="h-3 w-3" />
        For reference only — your accountant handles official BIR submission.
      </p>
    </div>
  )
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `cd frontend && npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/reports/BIREmptyState.tsx
git commit -m "feat: add BIREmptyState component"
```

---

## Task 4: Wire `BIREmptyState` into `bir/page.tsx`

**Files:**
- Modify: `frontend/src/app/client/reports/bir/page.tsx`

Current state of the relevant section (lines 139–144):
```tsx
{/* BIR book table — only shown after "View Book" is clicked */}
{shouldLoad && (
  <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
    <BIRBookTable book={book} start={start} end={end} accountId={accountId} />
  </div>
)}
```

- [ ] **Step 1: Add the import**

After the existing imports (around line 7), add:
```tsx
import { BIREmptyState } from '@/components/reports/BIREmptyState'
```

- [ ] **Step 2: Replace the conditional block**

Replace the `{shouldLoad && ...}` block with:
```tsx
{shouldLoad ? (
  <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
    <BIRBookTable book={book} start={start} end={end} accountId={accountId} />
  </div>
) : (
  <BIREmptyState
    book={book}
    onGenerate={() => setShouldLoad(true)}
    disabled={viewDisabled}
  />
)}
```

- [ ] **Step 3: Verify TypeScript compiles**

Run: `cd frontend && npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 4: Manual verify — pre-generation state**

Go to `/client/reports/bir`.
1. On page load (no book generated): expected to see the dashed-border container with icon, headline "Your book hasn't been generated yet", info banner, 3-step row, and a pulsing "Generate book ↗" button.
2. Switch to the GL tab without selecting an account: the "Generate book" button should be gray/disabled and the pulse ring should disappear.
3. Click "Generate book ↗" on any non-GL tab: the table should load, replacing the empty state.
4. Change the date range: the empty state should reappear (because `setShouldLoad(false)` is called by `handleDateChange`).
5. Switch tabs: the empty state should reappear (because `setShouldLoad(false)` is called by `handleTabChange`).

- [ ] **Step 5: Commit**

```bash
git add frontend/src/app/client/reports/bir/page.tsx
git commit -m "feat: render BIREmptyState on BIR Books page before generation"
```

---

## Task 5: Disable `ExportPDFButton` until book is generated

**Files:**
- Modify: `frontend/src/components/reports/ExportPDFButton.tsx`
- Modify: `frontend/src/app/client/reports/bir/page.tsx`

Current `ExportPDFButton.tsx` props interface (lines 9–15):
```tsx
interface Props {
  type: 'income-statement' | 'expense-breakdown' | string
  clientId?: string
  start: string
  end: string
  accountId?: string
}
```

Current `ExportPDFButton` usage in `bir/page.tsx` (line 136):
```tsx
<ExportPDFButton type={book} start={start} end={end} accountId={accountId} />
```

- [ ] **Step 1: Add `disabled` prop to `ExportPDFButton`**

In `ExportPDFButton.tsx`, update the Props interface and destructuring:

```tsx
interface Props {
  type: 'income-statement' | 'expense-breakdown' | string
  clientId?: string
  start: string
  end: string
  accountId?: string
  disabled?: boolean
}

export function ExportPDFButton({ type, clientId, start, end, accountId, disabled }: Props) {
  const [loading, setLoading] = useState(false)

  const handleDownload = async () => {
    setLoading(true)
    try {
      const params = { clientId, start, end, accountId }
      if (type === 'income-statement' || type === 'expense-breakdown') {
        await downloadReportPDF(type, params)
      } else {
        await downloadBIRBookPDF(type, params)
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <Button variant="outline" onClick={handleDownload} disabled={loading || !!disabled}>
      <Download className="h-4 w-4 mr-2" />
      {loading ? 'Downloading...' : 'Download PDF'}
    </Button>
  )
}
```

- [ ] **Step 2: Pass `disabled={!shouldLoad}` in `bir/page.tsx`**

Update the `ExportPDFButton` usage (line 136):

```tsx
// remove:
<ExportPDFButton type={book} start={start} end={end} accountId={accountId} />
// add:
<ExportPDFButton type={book} start={start} end={end} accountId={accountId} disabled={!shouldLoad} />
```

- [ ] **Step 3: Verify TypeScript compiles**

Run: `cd frontend && npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 4: Manual verify — Download PDF disabled state**

Go to `/client/reports/bir`.
1. On page load (no book generated): the "Download PDF" button should be visually grayed out and unclickable.
2. Click "Generate book ↗" or "View Book": the "Download PDF" button should become active.
3. Change date range or switch tabs: "Download PDF" should gray out again.
4. Verify the Income Statement and Expense Breakdown pages are unaffected (their ExportPDFButton calls don't pass `disabled`, so it defaults to `undefined` / falsy — no change in behaviour).

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/reports/ExportPDFButton.tsx frontend/src/app/client/reports/bir/page.tsx
git commit -m "feat: disable Download PDF button until BIR book is generated"
```
