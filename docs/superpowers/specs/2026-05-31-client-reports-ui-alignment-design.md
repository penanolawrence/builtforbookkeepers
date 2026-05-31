# Client Reports UI Alignment — Design Spec

**Date:** 2026-05-31  
**Scope:** Align all client-facing report pages and table components with the approved mockup at `.superpowers/brainstorm/2019-1779941388/content/client-routes.html`

---

## Problem

The current Reports implementation has correct data wiring but the visual presentation diverges significantly from the mockup:

- Hub cards have no icons, tags, CTA text, or hover effects
- Sub-page toolbars are stacked vertically instead of inline
- Table components lack color-coded section headers and totals
- Expense Breakdown is missing the % of Total column with bar visualization
- BIR Books navigates away to a non-existent route instead of rendering inline with tabs

## Approach

In-place edits to existing page files and table components. Two small shared components (`ReportBreadcrumb`, `ReportToolbar`) are extracted to avoid repeating the breadcrumb + toolbar pattern across Income Statement and Expense Breakdown. BIR Books builds its own toolbar inline due to structural differences (tabs, account selector).

---

## Section 1: New Shared Components

### `src/components/reports/ReportBreadcrumb.tsx`

Renders a one-line breadcrumb: `Reports › [title]`

- "Reports" is a `<Link href="/client/reports">` in indigo (`text-indigo-600`)
- Separator `›` and title in `text-gray-400 text-xs`
- Used by: Income Statement, Expense Breakdown, BIR Books sub-pages

### `src/components/reports/ReportToolbar.tsx`

Props: `start`, `end`, `onChange(start, end)`, `onGenerate`, `exportButton: ReactNode`

Renders a flex row:
- Left: `"Period"` label (`text-xs text-gray-500 font-medium`) + two `<input type="date">` + `"–"` separator + `"Generate"` button (`bg-indigo-50 border-indigo-200 text-indigo-700 text-xs font-semibold`)
- Right (pushed via `flex-1` spacer): the `exportButton` slot

Used by: Income Statement, Expense Breakdown.  
BIR Books does NOT use this — it has a custom toolbar with tabs.

---

## Section 2: Reports Hub (`src/app/client/reports/page.tsx`)

### Layout changes

- Page title: `"Reports"` (unchanged)
- Subtitle below title: `"Read-only — your accountant handles BIR filing"` (`text-xs text-gray-400 mb-5`)
- Grid: `grid-cols-1 sm:grid-cols-3 gap-4` (unchanged)

### Card changes (all 3 cards)

Replace the plain shadcn `<Card>` structure with a richer layout:

```
[emoji icon — text-3xl, mb-3]
[title — text-[15px] font-bold text-gray-900 mb-1.5]
[description — text-xs text-gray-500 leading-relaxed flex-1]
[tags row — flex flex-wrap gap-1 mt-3]
  [tag pills — text-[10px] font-semibold px-2 py-0.5 rounded bg-gray-100 text-gray-500]
[CTA text — mt-4 text-xs font-bold text-indigo-600]
```

Hover state: `hover:border-indigo-300 hover:shadow-[0_0_0_3px_#eef2ff] transition-all`

Card content per report:

| Report | Icon | Tags | CTA |
|---|---|---|---|
| Income Statement | 📊 | Profit & Loss · Any date range · PDF export | View Report → |
| Expense Breakdown | 🧾 | By category · Any date range · PDF export | View Report → |
| BIR Books | 📚 | CRB · CDB · GJ · GL · PDF export | Open Books → |

Descriptions match mockup verbatim:
- Income Statement: "Compare your total income against expenses for any period. Shows net profit or loss."
- Expense Breakdown: "See where your money went, grouped by expense category with percentage totals."
- BIR Books: "Cash books and journals formatted for BIR loose-leaf submission. For reference only."

---

## Section 3: Income Statement (`src/app/client/reports/income-statement/page.tsx` + `IncomeStatementTable.tsx`)

### Page layout

```
<ReportBreadcrumb title="Income Statement" />
<h1>Income Statement</h1>
<p class="subtitle">Approved transactions only</p>
<ReportToolbar start end onChange onGenerate exportButton={<ExportPDFButton .../>} />
<PendingTransactionNote count={data?.pendingCount ?? 0} />   ← wire in existing component
<Card>
  <IncomeStatementTable start end />
</Card>
```

The `PendingTransactionNote` already exists but is not currently used on this page — add it here. It self-hides when `count === 0`.

Generate button calls `queryClient.invalidateQueries(['income-statement', ...])` or simply updates a `queryKey` version counter in state to force a refetch. The table already auto-loads on mount and when dates change via `useQuery`; Generate is a visual affordance for explicit re-fetch without changing the dates.

### `IncomeStatementTable` visual updates

Row types and their styles:

| Row | Classes |
|---|---|
| INCOME section header | `bg-gray-50 text-[10px] font-bold uppercase tracking-wide text-gray-500` |
| Income line rows | unchanged |
| Total Income subtotal | `bg-gray-50 font-bold text-green-700` |
| EXPENSES section header | same as INCOME header |
| Expense line rows | unchanged |
| Total Expenses subtotal | `bg-gray-50 font-bold text-red-700` |
| Net Income (profit) | `border-t-2 border-indigo-500 bg-green-50 text-green-800 text-[14px] font-extrabold` |
| Net Income (loss) | `border-t-2 border-indigo-500 bg-red-50 text-red-800 text-[14px] font-extrabold` |

Net profit vs loss is determined by `data.totals.netIncome >= 0`.

Remove the existing `<TableHead>` row entirely — the mockup table has no column headers, just section dividers and data rows.

---

## Section 4: Expense Breakdown (`src/app/client/reports/expense-breakdown/page.tsx` + `ExpenseBreakdownTable.tsx`)

### Page layout

Same pattern as Income Statement:

```
<ReportBreadcrumb title="Expense Breakdown" />
<h1>Expense Breakdown</h1>
<p class="subtitle">Approved transactions only</p>
<ReportToolbar ... exportButton={<ExportPDFButton .../>} />
<PendingTransactionNote count={data?.pendingCount ?? 0} />
<Card>
  <ExpenseBreakdownTable start end />
</Card>
```

### `ExpenseBreakdownTable` visual updates

- Add a third column: **"% of Total"** (right-aligned header)
- Each row computes `pct = (row.total / data.grandTotal) * 100`
- % cell renders: `[colored bar div] [pct text]` side by side
  - Bar: `height: 6px, background: #fca5a5 (red-300), border-radius: 3px`, width proportional to percentage (max ~90px at 100%)
  - Pct text: `text-[11px] text-gray-400 min-w-[34px] text-right`
- Grand Total row: `bg-gray-50 font-bold text-[13px]`, no bar in % cell

Column headers: `Category` · `Amount` · `% of Total`

---

## Section 5: BIR Books (`src/app/client/reports/bir/page.tsx`)

### Structural change

**Remove** `router.push` navigation. BIR Books stays entirely at `/client/reports/bir`.

Add local state: `book` (default `'crb'`), `start`, `end`, `accountId` (for GL).

### Layout

```
<ReportBreadcrumb title="BIR Books" />
<h1>BIR Books</h1>
<p class="subtitle">For reference only — your accountant handles official submission</p>

[Toolbar row — flex, flex-wrap, gap-2, items-center, mb-4]
  [Tab bar: CRB | CDB | GJ | GL]
  [date input] [–] [date input]
  [account selector — only visible when book === 'gl']
  ["View Book" button]
  [flex-1 spacer]
  [Export PDF button]

<Card>
  <BIRBookTable book start end accountId />
</Card>
```

### Tab bar style

Segmented control (matching mockup `book-tabs`):
- Container: `flex border border-gray-200 rounded-lg overflow-hidden w-fit mr-2`
- Each tab: `px-[18px] py-1.5 text-xs font-semibold cursor-pointer border-r border-gray-200 last:border-r-0`
- Inactive: `bg-white text-gray-400`
- Active: `bg-indigo-600 text-white`

### Account selector (GL only)

Shown only when `book === 'gl'`. Uses existing shadcn `<Select>`. Populated from API (same pattern as existing `ReportClientSelector`). `accountId` state feeds into `BIRBookTable`.

### "View Book" button

Clicking it sets a `shouldLoad` boolean to `true`, which enables the `useQuery` in `BIRBookTable` (via `enabled` prop). This gives explicit user control over when the BIR book loads, matching the mockup's "View Book" affordance. When book or dates change, `shouldLoad` resets to `false`.

### `ExportPDFButton` for BIR

Pass `type={book}` and `accountId` — already supported by the existing component's props.

---

## Files Changed

| File | Change type |
|---|---|
| `src/components/reports/ReportBreadcrumb.tsx` | New |
| `src/components/reports/ReportToolbar.tsx` | New |
| `src/app/client/reports/page.tsx` | Updated |
| `src/app/client/reports/income-statement/page.tsx` | Updated |
| `src/app/client/reports/expense-breakdown/page.tsx` | Updated |
| `src/app/client/reports/bir/page.tsx` | Updated (structural) |
| `src/components/reports/IncomeStatementTable.tsx` | Updated |
| `src/components/reports/ExpenseBreakdownTable.tsx` | Updated |

`BIRBookTable.tsx` — no changes needed. It already renders correctly; the page just wasn't showing it inline.

---

## Out of Scope

- Admin/accountant report pages (separate concern)
- PDF export implementation (already works)
- Company name / VAT status in subtitle (requires auth context changes — deferred)
- BIR account selector API endpoint (GL account list needs a backend endpoint; add a TODO comment if not available)
