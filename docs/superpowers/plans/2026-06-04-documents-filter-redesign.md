# Documents Filter Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restructure the `/client/documents` filter bar into two equal-column rows, add per-select inline clear buttons, default the date range to the last 7 days on first load, and remove the entries count and global Clear button.

**Architecture:** Single file change — `frontend/src/app/client/documents/page.tsx`. Layout switches from one flex row to two CSS grid rows. Per-select ✕ buttons are conditionally rendered inside a `relative` wrapper over each `Select`. A `useEffect` fires once on mount to apply the last-7-days default when no date params exist in the URL. A pure helper function `lastSevenDayRange()` is exported from the page file so it can be unit-tested without mocking Next.js.

**Tech Stack:** Next.js 14 App Router, React, TypeScript, shadcn/ui Select, Lucide React icons, Jest + React Testing Library

---

## File Map

| File | Action | Responsibility |
|---|---|---|
| `frontend/src/app/client/documents/page.tsx` | Modify | All filter bar changes: layout, ✕ buttons, date defaults |
| `frontend/src/app/client/documents/__tests__/page.test.ts` | Create | Unit test for `lastSevenDayRange()` |

---

### Task 1: Add `lastSevenDayRange` helper and its test

**Files:**
- Modify: `frontend/src/app/client/documents/page.tsx` (add exported helper before the component)
- Create: `frontend/src/app/client/documents/__tests__/page.test.ts`

- [ ] **Step 1: Write the failing test**

Create `frontend/src/app/client/documents/__tests__/page.test.ts`:

```ts
import { lastSevenDayRange } from '../page'

function isoToday() {
  return new Date().toISOString().split('T')[0]
}

function isoSixDaysAgo() {
  const d = new Date()
  d.setDate(d.getDate() - 6)
  return d.toISOString().split('T')[0]
}

describe('lastSevenDayRange', () => {
  it('returns today as end', () => {
    expect(lastSevenDayRange().end).toBe(isoToday())
  })

  it('returns 6 days ago as start', () => {
    expect(lastSevenDayRange().start).toBe(isoSixDaysAgo())
  })
})
```

- [ ] **Step 2: Run test to confirm it fails**

```bash
cd frontend && npx jest src/app/client/documents/__tests__/page.test.ts --no-coverage
```

Expected: FAIL — `lastSevenDayRange` is not exported.

- [ ] **Step 3: Add the helper to `page.tsx`**

In `frontend/src/app/client/documents/page.tsx`, add this block immediately before the `function DocumentsContent()` line:

```ts
export function lastSevenDayRange(): { start: string; end: string } {
  const today = new Date()
  const sixDaysAgo = new Date(today)
  sixDaysAgo.setDate(today.getDate() - 6)
  const fmt = (d: Date) => d.toISOString().split('T')[0]
  return { start: fmt(sixDaysAgo), end: fmt(today) }
}
```

- [ ] **Step 4: Run test to confirm it passes**

```bash
cd frontend && npx jest src/app/client/documents/__tests__/page.test.ts --no-coverage
```

Expected: PASS — 2 tests passing.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/app/client/documents/page.tsx frontend/src/app/client/documents/__tests__/page.test.ts
git commit -m "feat: add lastSevenDayRange helper for documents filter defaults"
```

---

### Task 2: Restructure filter bar layout and remove count/clear

This task only touches the JSX structure — no logic changes yet.

**Files:**
- Modify: `frontend/src/app/client/documents/page.tsx` (lines 144–192, the filter bar section)

- [ ] **Step 1: Replace the filter bar JSX**

In `frontend/src/app/client/documents/page.tsx`, replace the entire filter bar block (the `{/* Filter bar */}` comment through the closing `</div>`) with:

```tsx
{/* Filter bar */}
<div className="mb-5 flex flex-col gap-2.5">
  {/* Row 1: Status + Type */}
  <div className="grid grid-cols-2 gap-2.5">
    <Select value={status || 'all'} onValueChange={(v) => setParam('status', v === 'all' ? '' : v)}>
      <SelectTrigger className="h-10 w-full rounded-[11px] border-[1.5px] border-t-line bg-t-card text-[13.5px] font-semibold">
        <SelectValue placeholder="All Statuses" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">All Statuses</SelectItem>
        <SelectItem value="PARKED">In Review</SelectItem>
        <SelectItem value="APPROVED">Approved</SelectItem>
        <SelectItem value="PROCESSING">Processing</SelectItem>
        <SelectItem value="RETURNED">Returned</SelectItem>
      </SelectContent>
    </Select>
    <Select value={type || 'all'} onValueChange={(v) => setParam('type', v === 'all' ? '' : v)}>
      <SelectTrigger className="h-10 w-full rounded-[11px] border-[1.5px] border-t-line bg-t-card text-[13.5px] font-semibold">
        <SelectValue placeholder="All Types" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">All Types</SelectItem>
        <SelectItem value="income">Income</SelectItem>
        <SelectItem value="expense">Expense</SelectItem>
      </SelectContent>
    </Select>
  </div>
  {/* Row 2: Date range */}
  <div className="grid grid-cols-2 gap-2.5">
    <input
      type="date"
      value={start}
      onChange={(e) => setParam('start', e.target.value)}
      className="h-10 px-3 border-[1.5px] border-t-line rounded-[11px] text-[13.5px] font-semibold text-t-muted bg-t-card w-full"
    />
    <input
      type="date"
      value={end}
      onChange={(e) => setParam('end', e.target.value)}
      className="h-10 px-3 border-[1.5px] border-t-line rounded-[11px] text-[13.5px] font-semibold text-t-muted bg-t-card w-full"
    />
  </div>
</div>
```

- [ ] **Step 2: Verify the page builds without errors**

```bash
cd frontend && npx tsc --noEmit
```

Expected: no TypeScript errors.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/app/client/documents/page.tsx
git commit -m "feat: restructure documents filter bar into two equal-column rows"
```

---

### Task 3: Add per-select inline ✕ clear buttons

**Files:**
- Modify: `frontend/src/app/client/documents/page.tsx`

- [ ] **Step 1: Add `X` to the lucide-react import**

In `frontend/src/app/client/documents/page.tsx`, find:

```ts
import { Download } from 'lucide-react'
```

Replace with:

```ts
import { Download, X } from 'lucide-react'
```

- [ ] **Step 2: Wrap each Select in a relative container with a conditional ✕ button**

Replace the two `<Select>` blocks inside `{/* Row 1: Status + Type */}` with:

```tsx
{/* Status */}
<div className="relative">
  <Select value={status || 'all'} onValueChange={(v) => setParam('status', v === 'all' ? '' : v)}>
    <SelectTrigger className={`h-10 w-full rounded-[11px] border-[1.5px] border-t-line bg-t-card text-[13.5px] font-semibold${status ? ' pr-9' : ''}`}>
      <SelectValue placeholder="All Statuses" />
    </SelectTrigger>
    <SelectContent>
      <SelectItem value="all">All Statuses</SelectItem>
      <SelectItem value="PARKED">In Review</SelectItem>
      <SelectItem value="APPROVED">Approved</SelectItem>
      <SelectItem value="PROCESSING">Processing</SelectItem>
      <SelectItem value="RETURNED">Returned</SelectItem>
    </SelectContent>
  </Select>
  {status && (
    <button
      onClick={(e) => { e.stopPropagation(); setParam('status', '') }}
      className="absolute right-8 top-1/2 -translate-y-1/2 z-10 flex items-center text-t-faint hover:text-t-ink"
      aria-label="Clear status filter"
    >
      <X className="h-3.5 w-3.5" />
    </button>
  )}
</div>
{/* Type */}
<div className="relative">
  <Select value={type || 'all'} onValueChange={(v) => setParam('type', v === 'all' ? '' : v)}>
    <SelectTrigger className={`h-10 w-full rounded-[11px] border-[1.5px] border-t-line bg-t-card text-[13.5px] font-semibold${type ? ' pr-9' : ''}`}>
      <SelectValue placeholder="All Types" />
    </SelectTrigger>
    <SelectContent>
      <SelectItem value="all">All Types</SelectItem>
      <SelectItem value="income">Income</SelectItem>
      <SelectItem value="expense">Expense</SelectItem>
    </SelectContent>
  </Select>
  {type && (
    <button
      onClick={(e) => { e.stopPropagation(); setParam('type', '') }}
      className="absolute right-8 top-1/2 -translate-y-1/2 z-10 flex items-center text-t-faint hover:text-t-ink"
      aria-label="Clear type filter"
    >
      <X className="h-3.5 w-3.5" />
    </button>
  )}
</div>
```

Note: `right-8` (32px) places the ✕ to the left of the shadcn chevron icon (~12px from right). `pr-9` on the trigger prevents the selected text from sliding under the ✕.

- [ ] **Step 3: Verify TypeScript**

```bash
cd frontend && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/app/client/documents/page.tsx
git commit -m "feat: add per-select inline clear buttons on documents filter"
```

---

### Task 4: Apply last-7-days date default on mount

**Files:**
- Modify: `frontend/src/app/client/documents/page.tsx`

- [ ] **Step 1: Add `useEffect` to the import**

Find:

```ts
import { useState, Suspense } from 'react'
```

Replace with:

```ts
import { useState, useEffect, Suspense } from 'react'
```

- [ ] **Step 2: Add the mount effect inside `DocumentsContent`**

Inside `function DocumentsContent()`, add this block immediately after the four `const status/type/start/end` lines (around line 29, before the `useQuery` call):

```tsx
// Apply last-7-days defaults on first load if no date params exist
// eslint-disable-next-line react-hooks/exhaustive-deps
useEffect(() => {
  const currentStart = searchParams.get('start')
  const currentEnd   = searchParams.get('end')
  if (currentStart || currentEnd) return
  const { start: s, end: e } = lastSevenDayRange()
  const params = new URLSearchParams(searchParams.toString())
  params.set('start', s)
  params.set('end', e)
  router.replace(`/client/documents?${params.toString()}`)
}, [])
```

The empty deps array is intentional — this must run once on mount only.

- [ ] **Step 3: Verify TypeScript**

```bash
cd frontend && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Run the full test suite**

```bash
cd frontend && npx jest --no-coverage
```

Expected: all tests pass including the `lastSevenDayRange` tests from Task 1.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/app/client/documents/page.tsx
git commit -m "feat: default documents date filter to last 7 days on first load"
```

---

## Manual Verification Checklist

After all tasks are complete, open the app and verify:

1. Navigate to `/client/documents` with no URL params — start date should be pre-filled to 6 days ago, end date to today
2. Select a status filter — the ✕ button appears inside that select only; clicking it clears only that filter
3. Select a type filter — same ✕ behavior as status
4. Navigating back from another page to `/client/documents` with existing `?start=...&end=...` params — dates are not overwritten
5. Filter bar renders as two equal-width rows; no entries count; no global Clear link
6. Both Sofia and Yoda themes render the filter bar correctly
