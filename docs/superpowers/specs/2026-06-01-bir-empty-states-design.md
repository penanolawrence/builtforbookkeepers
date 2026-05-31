# BIR Books Empty States — Design Spec

**Date:** 2026-06-01  
**Scope:** `frontend/` only — two new components + minor edits to three existing files

---

## Problem

The BIR Books page (`/client/reports/bir`) shows a blank area before the user clicks "View Book", and a generic "No data available." message after generation returns 0 rows. Neither state gives the user enough information to act confidently, and both can be mistaken for a broken page.

---

## Solution

Two purpose-built empty state components:

| State | Component | File | Condition |
|---|---|---|---|
| Pre-generation | `BIREmptyState` | `components/reports/BIREmptyState.tsx` | `!shouldLoad` in `bir/page.tsx` |
| Post-generation, 0 rows | `BIRNoDataState` | `components/reports/BIRNoDataState.tsx` | data loaded but rows empty in `BIRBookTable.tsx` |

---

## Shared Utility

A `BOOK_LABELS` map used by both components:

```ts
const BOOK_LABELS: Record<string, string> = {
  crb: 'Cash Receipts Book (CRB)',
  cdb: 'Cash Disbursements Book (CDB)',
  gj:  'General Journal (GJ)',
  gl:  'General Ledger (GL)',
}
```

Defined once inside each component file (no shared utility file needed — only two consumers).

---

## Component 1 — `BIREmptyState`

### Props

```ts
interface Props {
  book: string          // 'crb' | 'cdb' | 'gj' | 'gl'
  onGenerate: () => void
  disabled?: boolean    // true when GL tab has no account selected
}
```

### Layout

Outer container: `border-2 border-dashed border-indigo-200 bg-indigo-50/40 rounded-xl p-10`, vertically and horizontally centered content (`flex flex-col items-center text-center gap-4`).

### Elements (top to bottom)

1. **Icon** — Lucide `BookOpen`, 40 px, inside `bg-indigo-100 text-indigo-500 rounded-full p-3`

2. **Headline** — `"Your book hasn't been generated yet"` · `text-base font-semibold text-gray-900`

3. **Instruction** — `text-sm text-gray-500`  
   > Select a date range above, then click **View Book** to load your {bookLabel}.  
   "View Book" wrapped in `font-semibold text-gray-700`.

4. **Info banner** — `bg-indigo-50 border border-indigo-100 rounded-lg px-4 py-2.5 flex items-center gap-2 text-xs text-indigo-700`  
   - Left: Lucide `Info` icon, 14 px  
   - Text: `"No data will appear until you generate the book first."`

5. **3-step row** — `flex items-stretch divide-x divide-gray-200 border border-gray-200 rounded-lg overflow-hidden bg-white w-full max-w-md text-xs text-gray-500`  
   Each cell: `flex-1 flex flex-col items-center gap-1 px-4 py-3`  
   - Numbered badge: `w-5 h-5 rounded-full bg-indigo-100 text-indigo-600 text-[10px] font-bold flex items-center justify-center`  
   - Step 1: Pick your **start** and **end** date  
   - Step 2: Click **View Book** to generate  
   - Step 3: View or **download** your BIR book  
   Bold words use `font-semibold text-gray-700`.

6. **Pulsing CTA** — `relative inline-flex`  
   - Behind the button: `absolute inset-0 rounded-md bg-indigo-300 animate-ping` (creates spreading ring; animate-ping handles the fade)  
   - Button: `relative px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-md flex items-center gap-2 cursor-pointer`  
   - When `disabled`: `bg-gray-100 text-gray-400 cursor-not-allowed`; `animate-ping` element hidden  
   - Label: Lucide `ClipboardList` icon (14 px) + `"Generate book ↗"`  
   - `onClick`: calls `onGenerate`

7. **Disclaimer** — `text-xs text-gray-400 flex items-center gap-1`  
   - Lucide `Lock` icon (12 px) + `"For reference only — your accountant handles official BIR submission."`

---

## Component 2 — `BIRNoDataState`

### Props

```ts
interface Props {
  book: string   // 'crb' | 'cdb' | 'gj' | 'gl'
  start: string  // ISO date string, e.g. '2026-04-01'
  end: string    // ISO date string, e.g. '2026-05-31'
}
```

### Layout

`flex flex-col items-center text-center gap-3 py-16 px-8` — rendered inside the existing white card (no extra border/background).

### Elements (top to bottom)

1. **Icon** — Lucide `BookOpen`, 36 px, inside `bg-indigo-50 text-indigo-400 rounded-full p-3`

2. **Headline** — `"No entries for this period"` · `text-sm font-semibold text-gray-900`

3. **Body** — `text-sm text-gray-500 max-w-sm`  
   > There are no {bookLabel} records between **{formattedStart}** and **{formattedEnd}**. This isn't an error — it just means no transactions have been recorded yet for this date range.  
   Dates use `font-semibold text-gray-700` spans. `formatDate` from `@/lib/utils/formatDate` formats each ISO string.

---

## Files Changed

### `components/reports/BIREmptyState.tsx` — new file
Full component per spec above.

### `components/reports/BIRNoDataState.tsx` — new file
Full component per spec above.

### `app/client/reports/bir/page.tsx`

1. Import `BIREmptyState`.
2. Replace the conditional `{shouldLoad && <div ...><BIRBookTable .../></div>}` block:

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

### `components/reports/BIRBookTable.tsx`

1. Import `BIRNoDataState`.
2. Remove the `EmptyState` import (no longer used in this file).
3. Replace `if (!data) return <EmptyState message="No data available." />` with `if (!data) return <BIRNoDataState book={book} start={start} end={end} />`.
4. For CRB/CDB/GJ branches: before rendering the table, guard for empty rows — if `birData.rows.length === 0`, return `<BIRNoDataState book={book} start={start} end={end} />` instead. This applies to both the GJ branch (lines ~119–148) and the CRB/CDB branch (lines ~150–188) independently.

### `components/reports/ExportPDFButton.tsx`

1. Add `disabled?: boolean` to props interface.
2. When `disabled`:
   - Replace the existing button className with a grayed-out variant: `bg-gray-50 border-gray-200 text-gray-400 cursor-not-allowed`
   - Suppress `onClick` (pass `undefined` or guard with `if (!disabled)`)

### `app/client/reports/bir/page.tsx` (ExportPDFButton)

Pass `disabled={!shouldLoad}` to `<ExportPDFButton>`.

---

## Out of Scope

- Accountant-side BIR page (`/accountant/reports/[clientId]/bir/[book]`) — separate spec if needed
- Animations beyond `animate-ping` (no framer-motion)
- Any changes to the toolbar, date pickers, or tab logic
