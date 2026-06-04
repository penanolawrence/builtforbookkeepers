# Page Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restyle 10 pages (Documents, Upload, Queue, My Clients, Adjusting Entries, Clients Admin, Accountants, Billing, Income Statement, Expense Breakdown, BIR Books) to the unified page layout defined in `docs/superpowers/specs/2026-06-04-page-redesign-design.md`, matching the design handoff HTMLs in `design_handoff_pages/`.

**Architecture:** All pages adopt a shared structure: `max-w-[1280px]` wrapper → Breadcrumb → h1 header → (SummaryCards on non-report pages) → filter bar → table card. Two new shared components (`Breadcrumb`, `SummaryCard`) reduce duplication. `ReportToolbar` is restyled to a card. `QueuePageContent` gains summary cards. All other changes are page-level.

**Tech Stack:** Next.js 14 App Router, TypeScript, Tailwind CSS with `t-*` custom tokens, React Query, shadcn/ui (`Select`, `Input`). Design reference: `design_handoff_pages/*.html` (open in browser).

---

## File Map

**New files:**
- `frontend/src/components/shared/Breadcrumb.tsx` — generic breadcrumb used by all 10 pages
- `frontend/src/components/shared/SummaryCard.tsx` — single card; compose into a strip with `flex gap-[14px]`

**Modified files:**
- `frontend/src/components/reports/ReportToolbar.tsx` — restyled to card with border/shadow
- `frontend/src/app/client/documents/page.tsx` — add max-width, Breadcrumb, h1, summary cards, restyled filters
- `frontend/src/app/client/upload/page.tsx` — add max-width, Breadcrumb, h1, summary cards
- `frontend/src/components/upload/TwoAreaUpload.tsx` — full zone card restyle
- `frontend/src/components/upload/UploadZone.tsx` — full zone card restyle
- `frontend/src/components/queue/QueuePageContent.tsx` — add summary cards, flag chips, breadcrumb + h1
- `frontend/src/app/accountant/queue/page.tsx` — remove outer padding wrapper (moved inside QueuePageContent)
- `frontend/src/app/admin/queue/page.tsx` — same
- `frontend/src/app/accountant/clients/page.tsx` — add summary cards, Breadcrumb, h1, restyled table
- `frontend/src/app/accountant/adjusting-entries/page.tsx` — add summary cards, Breadcrumb, h1
- `frontend/src/app/admin/clients/page.tsx` — add summary cards, Breadcrumb, h1
- `frontend/src/app/admin/accountants/page.tsx` — add summary cards, Breadcrumb, h1
- `frontend/src/app/admin/billing/page.tsx` — add summary cards, Breadcrumb, h1, restyled filters
- `frontend/src/app/client/reports/income-statement/page.tsx` — replace h1 block + Breadcrumb
- `frontend/src/app/client/reports/expense-breakdown/page.tsx` — replace h1 block + Breadcrumb
- `frontend/src/app/accountant/reports/[clientId]/income-statement/page.tsx` — replace back-link + h1
- `frontend/src/app/accountant/reports/[clientId]/expense-breakdown/page.tsx` — same
- `frontend/src/components/reports/BIRBooksView.tsx` — tab switcher restyle, Breadcrumb + h1

---

## Task 1: Shared Breadcrumb and SummaryCard components

**Files:**
- Create: `frontend/src/components/shared/Breadcrumb.tsx`
- Create: `frontend/src/components/shared/SummaryCard.tsx`

- [ ] **Create Breadcrumb**

```tsx
// frontend/src/components/shared/Breadcrumb.tsx
import Link from 'next/link'
import { ChevronRight } from 'lucide-react'

interface Crumb {
  label: string
  href?: string
}

interface BreadcrumbProps {
  crumbs: Crumb[]
}

export function Breadcrumb({ crumbs }: BreadcrumbProps) {
  return (
    <nav className="flex items-center gap-1.5 mb-[18px] text-[13px] text-t-muted">
      {crumbs.map((crumb, i) => (
        <span key={i} className="flex items-center gap-1.5">
          {i > 0 && <ChevronRight className="h-3 w-3 text-t-faint flex-none" />}
          {crumb.href ? (
            <Link href={crumb.href} className="hover:text-t-ink transition-colors">
              {crumb.label}
            </Link>
          ) : (
            <span className="font-semibold text-t-ink">{crumb.label}</span>
          )}
        </span>
      ))}
    </nav>
  )
}
```

- [ ] **Create SummaryCard**

```tsx
// frontend/src/components/shared/SummaryCard.tsx
import type { CSSProperties } from 'react'

interface SummaryCardProps {
  label: string
  value: string
  subnote?: string
  valueStyle?: CSSProperties
}

export function SummaryCard({ label, value, subnote, valueStyle }: SummaryCardProps) {
  return (
    <div
      className="flex-1 bg-t-card border border-t-line rounded-[16px] p-5"
      style={{ boxShadow: 'var(--t-shadow)' }}
    >
      <div className="text-[11px] font-bold text-t-faint uppercase tracking-[.06em] mb-2">
        {label}
      </div>
      <div
        className="text-[26px] font-bold leading-none tracking-[-0.025em]"
        style={{ fontFamily: 'var(--font-display)', ...valueStyle }}
      >
        {value}
      </div>
      {subnote && (
        <div className="text-[12px] text-t-faint mt-[5px]">{subnote}</div>
      )}
    </div>
  )
}
```

- [ ] **Verify TypeScript**

```bash
cd frontend && npx tsc --noEmit 2>&1 | head -20
```
Expected: no errors in the two new files.

- [ ] **Commit**

```bash
git add frontend/src/components/shared/Breadcrumb.tsx frontend/src/components/shared/SummaryCard.tsx
git commit -m "feat: add shared Breadcrumb and SummaryCard components"
```

---

## Task 2: ReportToolbar restyle

**Files:**
- Modify: `frontend/src/components/reports/ReportToolbar.tsx`

The existing toolbar is a plain `flex` bar. The new design wraps it in a card (`bg-t-card border border-t-line rounded-[14px] shadow`). Interface unchanged — no other files need updating.

- [ ] **Replace ReportToolbar**

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
    <div
      className="flex items-center gap-2.5 mb-[22px] flex-wrap bg-t-card border border-t-line rounded-[14px] px-[18px] py-3.5"
      style={{ boxShadow: 'var(--t-shadow)' }}
    >
      <span className="text-[13px] font-semibold text-t-muted whitespace-nowrap">Period</span>
      <input
        type="date"
        value={start}
        onChange={(e) => onChange(e.target.value, end)}
        className="h-10 px-3 border-[1.5px] border-t-line rounded-[10px] text-[13.5px] font-semibold text-t-muted bg-t-surface"
      />
      <span className="text-t-faint text-sm">–</span>
      <input
        type="date"
        value={end}
        onChange={(e) => onChange(start, e.target.value)}
        className="h-10 px-3 border-[1.5px] border-t-line rounded-[10px] text-[13.5px] font-semibold text-t-muted bg-t-surface"
      />
      <button
        onClick={onGenerate}
        className="h-10 px-[18px] rounded-[10px] text-[13.5px] font-bold text-white flex items-center gap-1.5"
        style={{
          background: 'linear-gradient(150deg, var(--t-primary), var(--t-primary-deep))',
          boxShadow: '0 12px 22px -12px var(--t-primary)',
        }}
      >
        Generate
      </button>
      <div className="flex-1" />
      {exportButton}
    </div>
  )
}
```

- [ ] **Verify TypeScript**

```bash
cd frontend && npx tsc --noEmit 2>&1 | head -20
```
Expected: no errors.

- [ ] **Commit**

```bash
git add frontend/src/components/reports/ReportToolbar.tsx
git commit -m "feat: restyle ReportToolbar as card with border and shadow"
```

---

## Task 3: Documents page

**Files:**
- Modify: `frontend/src/app/client/documents/page.tsx`

Reference: `design_handoff_pages/Documents.html` (open in browser for pixel reference).

The page needs: `max-w-[1280px]` wrapper, `Breadcrumb`, h1 header, four summary cards (Total Entries, Total Inflow, Total Outflow, Net Flow), restyled filter bar with ghost `Select` dropdowns and date inputs, Export + Add Entry buttons.

Check `@/types/document` for the `Document` type field names: `inflow` and `outflow` are `number | null`. Format with `formatCurrency` from `@/lib/utils/formatCurrency` if it exists, otherwise use `'₱' + n.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })`.

- [ ] **Replace the DocumentsContent return block**

Open `frontend/src/app/client/documents/page.tsx`. Find the outer `<div>` returned from `DocumentsContent` (currently has filter dropdowns + `<DocumentsTable>`). Replace the entire return statement:

```tsx
// Add these imports at the top of the file
import { Breadcrumb } from '@/components/shared/Breadcrumb'
import { SummaryCard } from '@/components/shared/SummaryCard'
import { Download } from 'lucide-react'
```

```tsx
// Inside DocumentsContent, add these computed values before the return:
const totalInflow  = (docs ?? []).reduce((s, d) => s + (d.inflow  ?? 0), 0)
const totalOutflow = (docs ?? []).reduce((s, d) => s + (d.outflow ?? 0), 0)
const netFlow      = totalInflow - totalOutflow
const inReview     = (docs ?? []).filter((d) => d.status === 'PARKED').length

function fmtCurrency(n: number) {
  return '₱' + n.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}
```

```tsx
// Replace the return block:
return (
  <div className="max-w-[1280px] mx-auto px-9 py-7">
    <Breadcrumb crumbs={[{ label: 'My Business', href: '/client' }, { label: 'Documents' }]} />

    {/* Page header */}
    <div className="flex items-start justify-between mb-[22px]">
      <div>
        <h1
          className="text-[34px] font-bold tracking-[-0.025em] text-t-ink m-0"
          style={{ fontFamily: 'var(--font-display)' }}
        >
          Documents
        </h1>
        <p className="text-[14.5px] text-t-muted mt-[5px]">
          {/* The client documents page shows the signed-in user's own documents.
              Fetch the business name from useAuth() or a /me endpoint and display:
              "{businessName} · {month} {year}" — or simply "Your documents" as fallback. */}
          Your submitted documents
        </p>
      </div>
      <div className="flex gap-2.5 items-center mt-1">
        <button className="flex items-center gap-2 border border-t-line rounded-[12px] px-4 py-2.5 text-[13.5px] font-semibold text-t-ink bg-t-card cursor-pointer">
          <Download className="h-4 w-4" /> Export
        </button>
        <button
          onClick={() => router.push('/client/upload')}
          className="flex items-center gap-2 rounded-[12px] px-5 py-3 text-[14px] font-bold text-white cursor-pointer"
          style={{
            background: 'linear-gradient(150deg, var(--t-primary), var(--t-primary-deep))',
            boxShadow: '0 12px 22px -12px var(--t-primary)',
          }}
        >
          + Add Entry
        </button>
      </div>
    </div>

    {/* Summary cards */}
    {!isLoading && (
      <div className="flex gap-[14px] mb-[22px]">
        <SummaryCard
          label="Total Entries"
          value={String(docs?.length ?? 0)}
          subnote={inReview > 0 ? `${inReview} in review` : 'all entries'}
        />
        <SummaryCard
          label="Total Inflow"
          value={fmtCurrency(totalInflow)}
          subnote="received"
          valueStyle={{ color: 'var(--t-tier-ready-fg)' }}
        />
        <SummaryCard
          label="Total Outflow"
          value={fmtCurrency(totalOutflow)}
          subnote="disbursed"
          valueStyle={{ color: 'var(--t-tier-review-fg)' }}
        />
        <SummaryCard
          label="Net Flow"
          value={fmtCurrency(Math.abs(netFlow))}
          subnote={netFlow >= 0 ? 'net positive' : 'net negative'}
          valueStyle={{ color: netFlow >= 0 ? 'var(--t-tier-ready-fg)' : 'var(--t-tier-review-fg)' }}
        />
      </div>
    )}

    {/* Filter bar */}
    <div className="flex gap-2.5 items-center mb-5 flex-wrap">
      <Select value={status} onValueChange={(v) => setParam('status', v === 'all' ? '' : v)}>
        <SelectTrigger className="h-10 min-w-[140px] rounded-[11px] border-[1.5px] border-t-line bg-t-card text-[13.5px] font-semibold">
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
      <Select value={type} onValueChange={(v) => setParam('type', v === 'all' ? '' : v)}>
        <SelectTrigger className="h-10 min-w-[120px] rounded-[11px] border-[1.5px] border-t-line bg-t-card text-[13.5px] font-semibold">
          <SelectValue placeholder="All Types" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Types</SelectItem>
          <SelectItem value="income">Income</SelectItem>
          <SelectItem value="expense">Expense</SelectItem>
        </SelectContent>
      </Select>
      <input
        type="date"
        value={start}
        onChange={(e) => setParam('start', e.target.value)}
        className="h-10 px-3 border-[1.5px] border-t-line rounded-[11px] text-[13.5px] font-semibold text-t-muted bg-t-card"
      />
      <input
        type="date"
        value={end}
        onChange={(e) => setParam('end', e.target.value)}
        className="h-10 px-3 border-[1.5px] border-t-line rounded-[11px] text-[13.5px] font-semibold text-t-muted bg-t-card"
      />
      {(status || type || start || end) && (
        <button
          onClick={() => { setParam('status',''); setParam('type',''); setParam('start',''); setParam('end','') }}
          className="text-[13px] font-semibold text-t-primary bg-transparent border-none cursor-pointer"
        >
          Clear ×
        </button>
      )}
      <div className="flex-1" />
      <span className="text-[13px] text-t-muted font-medium">
        {docs?.length ?? 0} entries
      </span>
    </div>

    {isLoading ? (
      <div className="p-12 text-center text-t-faint text-sm">Loading…</div>
    ) : (docs ?? []).length === 0 ? (
      <EmptyState message="No documents found." />
    ) : (
      <DocumentsTable
        docs={docs ?? []}
        onRowClick={setSelectedDoc}
      />
    )}

    <DocumentDetailModal
      doc={selectedDoc}
      onClose={() => setSelectedDoc(null)}
      onReupload={handleReupload}
      onCancel={handleCancel}
    />
  </div>
)
```

- [ ] **Verify TypeScript**

```bash
cd frontend && npx tsc --noEmit 2>&1 | grep "documents/page" | head -10
```
Expected: no errors.

- [ ] **Commit**

```bash
git add frontend/src/app/client/documents/page.tsx
git commit -m "feat: restyle Documents page — breadcrumb, h1, summary cards, filter bar"
```

---

## Task 4: Upload page

**Files:**
- Modify: `frontend/src/app/client/upload/page.tsx`

Reference: `design_handoff_pages/Upload.html`.

The upload page needs: `max-w-[1280px]` wrapper, `Breadcrumb`, h1, three summary cards (Income This Month, Expense This Month, In Progress). The upload zones and In Progress table are rendered by child components — those are restyled in Task 5.

- [ ] **Restyle upload page wrapper and add header**

```tsx
// Add these imports at the top:
import { Breadcrumb } from '@/components/shared/Breadcrumb'
import { SummaryCard } from '@/components/shared/SummaryCard'
```

```tsx
// Replace the return block in UploadPage:
return (
  <div className="max-w-[1280px] mx-auto px-9 py-7">
    <Breadcrumb crumbs={[{ label: 'My Business', href: '/client' }, { label: 'Upload Documents' }]} />

    <div className="mb-[22px]">
      <h1
        className="text-[34px] font-bold tracking-[-0.025em] text-t-ink m-0"
        style={{ fontFamily: 'var(--font-display)' }}
      >
        Upload Documents
      </h1>
      <p className="text-[14.5px] text-t-muted mt-[5px]">
        Drop files into the correct zone below
      </p>
    </div>

    {/* Summary cards */}
    <div className="flex gap-[14px] mb-[22px]">
      <SummaryCard
        label="Income This Month"
        value={String(incomeCount)}
        subnote="files uploaded"
        valueStyle={{ color: 'var(--t-tier-ready-fg)' }}
      />
      <SummaryCard
        label="Expense This Month"
        value={String(expenseCount)}
        subnote="files uploaded"
        valueStyle={{ color: 'var(--t-tier-review-fg)' }}
      />
      <SummaryCard
        label="In Progress"
        value={String(inProgress.length)}
        subnote="processing or in review"
        valueStyle={{ color: 'var(--t-tier-check-fg)' }}
      />
    </div>

    <TwoAreaUpload
      onFilePicked={handleFilePicked}
      onManualSuccess={handleManualSuccess}
      incomeCount={incomeCount}
      expenseCount={expenseCount}
    />

    <ConfirmUploadDialog
      open={pendingUpload !== null}
      file={pendingUpload?.file ?? null}
      declaredType={pendingUpload?.declaredType ?? 'income'}
      onConfirm={handleConfirmUpload}
      onCancel={() => setPendingUpload(null)}
    />

    <DocumentsTable
      docs={inProgress}
      onRowClick={setSelectedDoc}
      title="In Progress"
      subtitle="Posted items removed automatically · Click a row for details"
    />

    <DocumentDetailModal
      doc={selectedDoc}
      onClose={() => setSelectedDoc(null)}
      onReupload={handleReupload}
      onCancel={handleCancel}
    />
  </div>
)
```

- [ ] **Verify TypeScript**

```bash
cd frontend && npx tsc --noEmit 2>&1 | grep "upload/page" | head -10
```
Expected: no errors.

- [ ] **Commit**

```bash
git add frontend/src/app/client/upload/page.tsx
git commit -m "feat: restyle Upload page — breadcrumb, h1, summary cards"
```

---

## Task 5: Upload zone cards restyle

**Files:**
- Modify: `frontend/src/components/upload/UploadZone.tsx`
- Modify: `frontend/src/components/upload/TwoAreaUpload.tsx`

Reference: `design_handoff_pages/Upload.html` — the two zone cards side by side, and the "Enter manually" gradient CTA.

- [ ] **Restyle UploadZone**

Open `frontend/src/components/upload/UploadZone.tsx`. The goal: card with `bg-t-card border border-t-line rounded-[18px] overflow-hidden shadow`. Header row has icon chip (semantic green `#DCFCE7 / #15803D` for income, `#FEE2E2 / #B91C1C` for expense). Drop area has `bg-t-surface` + dashed border.

Find the `ZONE_CONFIG` map and the component JSX. Replace the outer wrapper and header to match:

```tsx
// In UploadZone.tsx, find the outer card wrapper class and replace with:
<div
  className="rounded-[18px] overflow-hidden border border-t-line bg-t-card"
  style={{ boxShadow: 'var(--t-shadow)' }}
>
  {/* Card header */}
  <div className="flex items-center justify-between px-4 py-3.5 border-b border-t-line">
    <div className="flex items-center gap-2.5">
      <span
        className="w-8 h-8 rounded-[9px] flex items-center justify-center text-[16px] font-bold flex-none"
        style={{
          background: config.chipBg,   // e.g. "#DCFCE7" for income
          color:      config.chipFg,   // e.g. "#15803D" for income
        }}
      >
        {config.arrow}  {/* "↑" for income, "↓" for expense */}
      </span>
      <div>
        <div
          className="text-[14px] font-bold text-t-ink"
          style={{ fontFamily: 'var(--font-display)' }}
        >
          {config.label}
        </div>
        <div className="text-[11px] text-t-muted mt-0.5">{config.sub}</div>
      </div>
    </div>
    {count != null && (
      <span
        className="text-[10.5px] font-bold px-2.5 py-0.5 rounded-full"
        style={{ background: config.chipBg, color: config.chipFg }}
      >
        {count} files
      </span>
    )}
  </div>

  {/* Drop area */}
  <div
    className="m-3 border-[1.5px] border-dashed border-t-line rounded-[11px] p-5 text-center bg-t-surface cursor-pointer"
    onDragOver={...}
    onDrop={...}
    onClick={...}
  >
    {/* icon */}
    <div className="w-10 h-10 rounded-[10px] bg-t-card border border-t-line flex items-center justify-center mx-auto mb-3 text-t-muted">
      <Upload className="h-5 w-5" />
    </div>
    <div className="text-[12.5px] font-bold text-t-ink mb-1">
      Drop file here or click to browse
    </div>
    <div className="text-[11px] text-t-muted mb-3.5">{config.dropHint}</div>
    <div className="flex gap-2 justify-center">
      <button className="text-[11px] font-semibold px-3 py-1.5 rounded-[8px] bg-t-card border border-t-line text-t-ink hover:bg-t-surface transition-colors">
        Browse files
      </button>
      <button className="text-[11px] font-semibold px-3 py-1.5 rounded-[8px] bg-t-card border border-t-line text-t-ink hover:bg-t-surface transition-colors">
        Take photo
      </button>
    </div>
  </div>
  <div className="text-[10px] text-t-faint text-center mx-3 mb-3">
    Accepts JPG, PNG, PDF · max 10 MB
  </div>
</div>
```

Update `ZONE_CONFIG` to add `chipBg`, `chipFg`, `arrow` fields:

```tsx
const ZONE_CONFIG = {
  income: {
    label: 'Income',
    sub: 'Sales receipts, invoices received',
    arrow: '↑',
    chipBg: '#DCFCE7',
    chipFg: '#15803D',
    dropHint: 'Upload your income document',
  },
  expense: {
    label: 'Expense',
    sub: 'Purchase receipts, utility bills',
    arrow: '↓',
    chipBg: '#FEE2E2',
    chipFg: '#B91C1C',
    dropHint: 'Upload your expense document',
  },
}
```

- [ ] **Restyle TwoAreaUpload — "Enter manually" CTA**

Open `frontend/src/components/upload/TwoAreaUpload.tsx`. Find the "Enter manually" button and replace its className/style:

```tsx
<button
  type="button"
  onClick={() => setManualOpen(true)}
  className="w-full py-3.5 rounded-[13px] text-[13.5px] font-bold text-white flex items-center justify-center gap-2 my-4"
  style={{
    background: 'linear-gradient(150deg, var(--t-primary), var(--t-primary-deep))',
    boxShadow: '0 10px 22px -12px var(--t-primary-deep)',
  }}
>
  No physical receipt? Enter manually →
</button>
```

- [ ] **Verify TypeScript**

```bash
cd frontend && npx tsc --noEmit 2>&1 | grep -E "UploadZone|TwoAreaUpload" | head -10
```
Expected: no errors.

- [ ] **Commit**

```bash
git add frontend/src/components/upload/UploadZone.tsx frontend/src/components/upload/TwoAreaUpload.tsx
git commit -m "feat: restyle upload zone cards and Enter Manually CTA"
```

---

## Task 6: Queue page

**Files:**
- Modify: `frontend/src/components/queue/QueuePageContent.tsx`
- Modify: `frontend/src/app/accountant/queue/page.tsx`
- Modify: `frontend/src/app/admin/queue/page.tsx`

Reference: `design_handoff_pages/Queue.html`.

`QueuePageContent` is used by both accountant and admin queue pages. Add: `max-w-[1280px]` wrapper, `Breadcrumb`, h1, four summary cards (Total, RED, Yellow, Green). Move "Approve Selected" button to the filter bar row (right side). Add flag chips (`FlagChip` component inline).

- [ ] **Add Breadcrumb + SummaryCard imports to QueuePageContent**

```tsx
import { Breadcrumb } from '@/components/shared/Breadcrumb'
import { SummaryCard } from '@/components/shared/SummaryCard'
```

- [ ] **Add summary card computation before the return block**

Inside `QueuePageContent` function, after the existing state/query hooks, add:

```tsx
const redCount    = items.filter((i) => i.flag === 'RED').length
const yellowCount = items.filter((i) => i.flag === 'YELLOW').length
const greenCount  = items.filter((i) => i.flag === 'GREEN').length
```

- [ ] **Replace the return wrapper and header block**

Find the current outer `<div>` (which starts with the toast, then the header section). Replace the outer wrapper and everything before the table card:

```tsx
return (
  <div className="max-w-[1280px] mx-auto px-9 py-7">
    {/* Toast */}
    {toast && (
      <div className="fixed top-4 right-4 z-50 px-4 py-2.5 bg-gray-900 text-white text-xs font-medium rounded-lg shadow-lg">
        {toast}
      </div>
    )}

    <Breadcrumb crumbs={[{ label: 'Dashboard', href: showAccountant ? '/admin' : '/accountant' }, { label: 'Review Queue' }]} />

    <div className="flex items-start justify-between mb-[22px]">
      <div>
        <h1
          className="text-[34px] font-bold tracking-[-0.025em] text-t-ink m-0"
          style={{ fontFamily: 'var(--font-display)' }}
        >
          Review Queue
        </h1>
        <p className="text-[14.5px] text-t-muted mt-[5px]">
          {isLoading ? '…' : `${items.length} documents awaiting your approval`}
        </p>
      </div>
    </div>

    {!isLoading && (
      <div className="flex gap-[14px] mb-[22px]">
        <SummaryCard label="Total Items" value={String(items.length)} subnote="in queue" />
        <SummaryCard
          label="RED Flags"
          value={String(redCount)}
          subnote="anomalies flagged"
          valueStyle={{ color: 'var(--t-tier-review-fg)' }}
        />
        <SummaryCard
          label="Yellow Flags"
          value={String(yellowCount)}
          subnote="needs checking"
          valueStyle={{ color: 'var(--t-tier-check-fg)' }}
        />
        <SummaryCard
          label="Green / Ready"
          value={String(greenCount)}
          subnote="pre-sorted for approval"
          valueStyle={{ color: 'var(--t-tier-ready-fg)' }}
        />
      </div>
    )}

    {/* Filter bar */}
    <div className="flex gap-2.5 items-center mb-5 flex-wrap">
      {/* client filter */}
      <select
        value={clientFilter}
        onChange={(e) => setClientFilter(e.target.value)}
        className="h-10 pl-3.5 pr-9 rounded-[11px] border-[1.5px] border-t-line bg-t-card text-[13.5px] font-semibold text-t-ink appearance-none"
      >
        <option value="">All Clients</option>
        {clients.map((c: ClientProfile) => (
          <option key={c.id} value={c.id}>{c.name}</option>
        ))}
      </select>
      {/* flag filter */}
      <select
        value={flagFilter}
        onChange={(e) => setFlagFilter(e.target.value)}
        className="h-10 pl-3.5 pr-9 rounded-[11px] border-[1.5px] border-t-line bg-t-card text-[13.5px] font-semibold text-t-ink appearance-none"
      >
        <option value="">All Flags</option>
        <option value="RED">RED</option>
        <option value="YELLOW">Yellow</option>
        <option value="GREEN">Green</option>
      </select>
      {showAccountant && (
        <select
          value={accountantFilter}
          onChange={(e) => setAccountantFilter(e.target.value)}
          className="h-10 pl-3.5 pr-9 rounded-[11px] border-[1.5px] border-t-line bg-t-card text-[13.5px] font-semibold text-t-ink appearance-none"
        >
          <option value="">All Accountants</option>
          {accountants.map((a) => (
            <option key={a.id} value={a.id}>{a.name}</option>
          ))}
        </select>
      )}
      <div className="flex-1" />
      <button
        onClick={handleBatchApprove}
        disabled={selected.size === 0 || approving}
        className="flex items-center gap-2 rounded-[12px] px-5 py-3 text-[14px] font-bold text-white disabled:opacity-40"
        style={{
          background: 'linear-gradient(150deg, var(--t-primary), var(--t-primary-deep))',
          boxShadow: '0 12px 22px -12px var(--t-primary)',
        }}
      >
        {approving ? 'Approving…' : `Approve Selected (${selected.size})`}
      </button>
    </div>
    {/* ... rest of table card (keep existing) ... */}
  </div>
)
```

- [ ] **Remove wrapper from accountant/queue/page.tsx**

The current page wraps QueuePageContent in `<div className="max-w-[1100px] mx-auto p-6">`. Remove that wrapper since QueuePageContent now owns its own layout:

```tsx
// frontend/src/app/accountant/queue/page.tsx
import { QueuePageContent } from '@/components/queue/QueuePageContent'

export default function AccountantQueuePage() {
  return <QueuePageContent reviewBasePath="/accountant/queue" />
}
```

- [ ] **Remove wrapper from admin/queue/page.tsx**

The admin page already has no wrapper — verify it's still just:

```tsx
// frontend/src/app/admin/queue/page.tsx
import { QueuePageContent } from '@/components/queue/QueuePageContent'

export default function AdminQueuePage() {
  return <QueuePageContent showAccountant reviewBasePath="/admin/queue" />
}
```

- [ ] **Verify TypeScript**

```bash
cd frontend && npx tsc --noEmit 2>&1 | grep -E "QueuePageContent|queue/page" | head -10
```
Expected: no errors.

- [ ] **Commit**

```bash
git add frontend/src/components/queue/QueuePageContent.tsx frontend/src/app/accountant/queue/page.tsx frontend/src/app/admin/queue/page.tsx
git commit -m "feat: restyle Queue page — breadcrumb, h1, summary cards, filter bar"
```

---

## Task 7: My Clients page (accountant)

**Files:**
- Modify: `frontend/src/app/accountant/clients/page.tsx`

Reference: `design_handoff_pages/My-Clients.html`.

Add: `Breadcrumb`, h1 with client count subtitle, four summary cards, search input keeps existing state, table card keeps existing structure but gets correct column header styles.

- [ ] **Add imports and restyle page**

```tsx
import { Breadcrumb } from '@/components/shared/Breadcrumb'
import { SummaryCard } from '@/components/shared/SummaryCard'
```

Before the return, add:
```tsx
const needAttention = (clients ?? []).filter((c: ClientProfile) => {
  const counts = queueCountsForClient(c.id, queue ?? [])
  return counts.red > 0
}).length
const pendingReview = (clients ?? []).reduce((sum: number, c: ClientProfile) => {
  const counts = queueCountsForClient(c.id, queue ?? [])
  return sum + counts.red + counts.yellow
}, 0)
const allClear = (clients ?? []).filter((c: ClientProfile) => {
  const counts = queueCountsForClient(c.id, queue ?? [])
  return counts.red === 0 && counts.yellow === 0 && counts.green > 0
}).length
```

Replace the return:
```tsx
return (
  <div className="max-w-[1280px] mx-auto px-9 py-7">
    <Breadcrumb crumbs={[{ label: 'Dashboard', href: '/accountant' }, { label: 'My Clients' }]} />

    <div className="flex items-start justify-between mb-[22px]">
      <div>
        <h1 className="text-[34px] font-bold tracking-[-0.025em] text-t-ink m-0" style={{ fontFamily: 'var(--font-display)' }}>
          My Clients
        </h1>
        <p className="text-[14.5px] text-t-muted mt-[5px]">
          {isLoading ? '…' : `${clients?.length ?? 0} assigned clients`}
        </p>
      </div>
    </div>

    {!isLoading && (
      <div className="flex gap-[14px] mb-[22px]">
        <SummaryCard label="Total Clients" value={String(clients?.length ?? 0)} subnote="assigned to you" />
        <SummaryCard label="Need Attention" value={String(needAttention)} subnote="have RED flags" valueStyle={{ color: 'var(--t-tier-review-fg)' }} />
        <SummaryCard label="Pending Review" value={String(pendingReview)} subnote="total flagged items" valueStyle={{ color: 'var(--t-tier-check-fg)' }} />
        <SummaryCard label="All Clear" value={String(allClear)} subnote="no open flags" valueStyle={{ color: 'var(--t-tier-ready-fg)' }} />
      </div>
    )}

    {/* Search + entry count */}
    <div className="flex gap-2.5 items-center mb-5">
      <div className="flex items-center gap-2 h-10 px-3.5 border-[1.5px] border-t-line rounded-[11px] bg-t-card w-72">
        <Search className="h-4 w-4 text-t-faint flex-none" />
        <input
          type="text"
          placeholder="Search business name…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="border-0 outline-none bg-transparent text-[13.5px] text-t-ink w-full"
        />
      </div>
      <div className="flex-1" />
      <span className="text-[13px] text-t-muted font-medium">{filtered.length} of {clients?.length ?? 0} clients</span>
    </div>

    {/* Table card — keep existing table structure, update outer wrapper */}
    <div className="bg-t-card border border-t-line rounded-[20px] overflow-hidden" style={{ boxShadow: 'var(--t-shadow)' }}>
      {/* table card header */}
      <div className="flex items-center gap-2.5 px-6 py-[18px] border-b border-t-line">
        <span style={{ color: 'var(--t-primary)' }}>{/* clients icon */}<Users className="h-[18px] w-[18px]" /></span>
        <span className="font-bold text-[16px] text-t-ink" style={{ fontFamily: 'var(--font-display)' }}>My Clients</span>
        <span className="text-[11.5px] font-bold px-2 py-0.5 rounded-full" style={{ color: 'var(--t-primary)', background: 'var(--t-primary-soft)' }}>
          {filtered.length}
        </span>
      </div>
      {/* keep existing table content */}
      ...
    </div>
  </div>
)
```

Add `import { Search, Users } from 'lucide-react'` at the top.

- [ ] **Verify TypeScript**

```bash
cd frontend && npx tsc --noEmit 2>&1 | grep "accountant/clients" | head -10
```

- [ ] **Commit**

```bash
git add frontend/src/app/accountant/clients/page.tsx
git commit -m "feat: restyle My Clients page — breadcrumb, h1, summary cards"
```

---

## Task 8: Adjusting Entries page

**Files:**
- Modify: `frontend/src/app/accountant/adjusting-entries/page.tsx`

Reference: `design_handoff_pages/Adjusting-Entries.html`.

Add Breadcrumb, h1, four summary cards (Total, Pending, Approved, Draft). Replace status tab pills with a dropdown filter. Keep the "+ New Entry" button in the header row.

- [ ] **Add imports**

```tsx
import { Breadcrumb } from '@/components/shared/Breadcrumb'
import { SummaryCard } from '@/components/shared/SummaryCard'
```

- [ ] **Add summary computations before return**

```tsx
const pendingCount  = (entries ?? []).filter((e) => e.status === 'PENDING').length
const approvedCount = (entries ?? []).filter((e) => e.status === 'APPROVED').length
const draftCount    = (entries ?? []).filter((e) => e.status === 'DRAFT').length
```

- [ ] **Replace return block header and filter bar**

```tsx
return (
  <div className="max-w-[1280px] mx-auto px-9 py-7">
    <Breadcrumb crumbs={[{ label: 'Dashboard', href: '/accountant' }, { label: 'Adjusting Entries' }]} />

    <div className="flex items-start justify-between mb-[22px]">
      <div>
        <h1 className="text-[34px] font-bold tracking-[-0.025em] text-t-ink m-0" style={{ fontFamily: 'var(--font-display)' }}>
          Adjusting Entries
        </h1>
        <p className="text-[14.5px] text-t-muted mt-[5px]">All entries for your assigned clients</p>
      </div>
      <button
        onClick={() => setNewEntryOpen(true)}
        className="flex items-center gap-2 rounded-[12px] px-5 py-3 text-[14px] font-bold text-white mt-1"
        style={{
          background: 'linear-gradient(150deg, var(--t-primary), var(--t-primary-deep))',
          boxShadow: '0 12px 22px -12px var(--t-primary)',
        }}
      >
        + New Entry
      </button>
    </div>

    {!isLoading && (
      <div className="flex gap-[14px] mb-[22px]">
        <SummaryCard label="Total Entries" value={String(entries?.length ?? 0)} subnote="all statuses" />
        <SummaryCard label="Pending" value={String(pendingCount)} subnote="awaiting approval" valueStyle={{ color: 'var(--t-tier-check-fg)' }} />
        <SummaryCard label="Approved" value={String(approvedCount)} subnote="this period" valueStyle={{ color: 'var(--t-tier-ready-fg)' }} />
        <SummaryCard label="Draft" value={String(draftCount)} subnote="not submitted" valueStyle={{ color: 'var(--t-tier-pending-fg)' }} />
      </div>
    )}

    {/* Filter bar */}
    <div className="flex gap-2.5 items-center mb-5 flex-wrap">
      <select
        value={clientFilter}
        onChange={(e) => setClientFilter(e.target.value)}
        className="h-10 pl-3.5 pr-9 rounded-[11px] border-[1.5px] border-t-line bg-t-card text-[13.5px] font-semibold text-t-ink appearance-none"
      >
        <option value="all">All Clients</option>
        {(clients ?? []).map((c: ClientProfile) => (
          <option key={c.id} value={c.id}>{c.name}</option>
        ))}
      </select>
      <select
        value={statusFilter}
        onChange={(e) => setStatusFilter(e.target.value)}
        className="h-10 pl-3.5 pr-9 rounded-[11px] border-[1.5px] border-t-line bg-t-card text-[13.5px] font-semibold text-t-ink appearance-none"
      >
        <option value="all">All Statuses</option>
        <option value="PENDING">Pending</option>
        <option value="APPROVED">Approved</option>
        <option value="REJECTED">Rejected</option>
        <option value="DRAFT">Draft</option>
      </select>
      <div className="flex-1" />
      <span className="text-[13px] text-t-muted font-medium">{entries?.length ?? 0} entries</span>
    </div>

    {/* Existing table card — keep */}
    ...
    <NewEntryModal open={newEntryOpen} onClose={() => setNewEntryOpen(false)} onSuccess={() => { ... }} />
  </div>
)
```

- [ ] **Verify TypeScript**

```bash
cd frontend && npx tsc --noEmit 2>&1 | grep "adjusting-entries" | head -10
```

- [ ] **Commit**

```bash
git add frontend/src/app/accountant/adjusting-entries/page.tsx
git commit -m "feat: restyle Adjusting Entries page — breadcrumb, h1, summary cards"
```

---

## Task 9: Admin Clients page

**Files:**
- Modify: `frontend/src/app/admin/clients/page.tsx`

Reference: `design_handoff_pages/Clients-Admin.html`.

- [ ] **Add imports**

```tsx
import { Breadcrumb } from '@/components/shared/Breadcrumb'
import { SummaryCard } from '@/components/shared/SummaryCard'
```

- [ ] **Add summary computations before return**

```tsx
const activeCount    = clients.filter((c) => c.status === 'ACTIVE').length
const overdueCount   = clients.filter((c) => c.status === 'OVERDUE').length
const suspendedCount = clients.filter((c) => c.status === 'SUSPENDED').length
```

- [ ] **Replace return block header section**

```tsx
return (
  <div className="max-w-[1280px] mx-auto px-9 py-7">
    <Breadcrumb crumbs={[{ label: 'Admin' }, { label: 'Clients' }]} />

    <div className="flex items-start justify-between mb-[22px]">
      <div>
        <h1 className="text-[34px] font-bold tracking-[-0.025em] text-t-ink m-0" style={{ fontFamily: 'var(--font-display)' }}>
          Clients
        </h1>
        <p className="text-[14.5px] text-t-muted mt-[5px]">{isLoading ? '…' : `${total} total clients`}</p>
      </div>
      <button
        onClick={() => router.push('/admin/clients/create')}
        className="flex items-center gap-2 rounded-[12px] px-5 py-3 text-[14px] font-bold text-white mt-1"
        style={{
          background: 'linear-gradient(150deg, var(--t-primary), var(--t-primary-deep))',
          boxShadow: '0 12px 22px -12px var(--t-primary)',
        }}
      >
        + New Client
      </button>
    </div>

    {!isLoading && (
      <div className="flex gap-[14px] mb-[22px]">
        <SummaryCard label="Total" value={String(total)} subnote="all clients" />
        <SummaryCard label="Active" value={String(activeCount)} subnote="in good standing" valueStyle={{ color: 'var(--t-tier-ready-fg)' }} />
        <SummaryCard label="Overdue" value={String(overdueCount)} subnote="payment overdue" valueStyle={{ color: 'var(--t-tier-check-fg)' }} />
        <SummaryCard label="Suspended" value={String(suspendedCount)} subnote="access restricted" valueStyle={{ color: 'var(--t-tier-review-fg)' }} />
      </div>
    )}

    {/* Keep existing filter bar + table card */}
    ...
  </div>
)
```

- [ ] **Verify and commit**

```bash
cd frontend && npx tsc --noEmit 2>&1 | grep "admin/clients" | head -5
git add frontend/src/app/admin/clients/page.tsx
git commit -m "feat: restyle Admin Clients page — breadcrumb, h1, summary cards"
```

---

## Task 10: Admin Accountants page

**Files:**
- Modify: `frontend/src/app/admin/accountants/page.tsx`

Reference: `design_handoff_pages/Accountants.html`.

- [ ] **Add imports + summary cards**

```tsx
import { Breadcrumb } from '@/components/shared/Breadcrumb'
import { SummaryCard } from '@/components/shared/SummaryCard'
```

Computations (already exist as `active` and `pending` — add `suspended`):
```tsx
const suspended = (data ?? []).filter((a) => a.status === 'SUSPENDED').length
```

Replace header section:
```tsx
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
        onClick={() => router.push('/admin/accountants/invite')}
        className="flex items-center gap-2 rounded-[12px] px-5 py-3 text-[14px] font-bold text-white mt-1"
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

    {/* Keep existing filter + table */}
    ...
  </div>
)
```

- [ ] **Check if `/admin/accountants/invite` route exists — if not, use the existing invite trigger (modal or inline button). Keep whatever action was there before; just restyle the button.**

- [ ] **Verify and commit**

```bash
cd frontend && npx tsc --noEmit 2>&1 | grep "admin/accountants" | head -5
git add frontend/src/app/admin/accountants/page.tsx
git commit -m "feat: restyle Accountants page — breadcrumb, h1, summary cards"
```

---

## Task 11: Admin Billing page

**Files:**
- Modify: `frontend/src/app/admin/billing/page.tsx`

Reference: `design_handoff_pages/Billing.html`.

- [ ] **Add imports**

```tsx
import { Breadcrumb } from '@/components/shared/Breadcrumb'
import { SummaryCard } from '@/components/shared/SummaryCard'
```

- [ ] **Add summary computations**

```tsx
// Add after the existing payments/clients query results:
const totalReceived  = (payments ?? []).reduce((s, p) => s + p.amount, 0)
const now            = new Date()
const thisMonth      = (payments ?? [])
  .filter((p) => {
    const d = new Date(p.dateReceived)
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
  })
  .reduce((s, p) => s + p.amount, 0)
const activeClients  = new Set((payments ?? []).map((p) => p.clientId)).size

function fmtCurrency(n: number) {
  return '₱' + n.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}
```

Check `PaymentRecord` type in `@/types/admin` for actual field names (`amount`, `dateReceived`, `clientId`). Adjust if they differ.

- [ ] **Replace header section**

```tsx
return (
  <div className="max-w-[1280px] mx-auto px-9 py-7">
    <Breadcrumb crumbs={[{ label: 'Admin' }, { label: 'Billing' }]} />

    <div className="flex items-start justify-between mb-[22px]">
      <div>
        <h1 className="text-[34px] font-bold tracking-[-0.025em] text-t-ink m-0" style={{ fontFamily: 'var(--font-display)' }}>
          Billing
        </h1>
        <p className="text-[14.5px] text-t-muted mt-[5px]">Payment records</p>
      </div>
      <button
        onClick={() => setPaymentModalOpen(true)}
        className="flex items-center gap-2 rounded-[12px] px-5 py-3 text-[14px] font-bold text-white mt-1"
        style={{
          background: 'linear-gradient(150deg, var(--t-primary), var(--t-primary-deep))',
          boxShadow: '0 12px 22px -12px var(--t-primary)',
        }}
      >
        + Receive Payment
      </button>
    </div>

    {!isLoading && (
      <div className="flex gap-[14px] mb-[22px]">
        <SummaryCard label="Total Payments" value={String((payments ?? []).length)} subnote="all time" />
        <SummaryCard label="Total Received" value={fmtCurrency(totalReceived)} subnote="all time" valueStyle={{ color: 'var(--t-tier-ready-fg)' }} />
        <SummaryCard label="This Month" value={fmtCurrency(thisMonth)} subnote={`${now.toLocaleString('en-US', { month: 'long' })} ${now.getFullYear()}`} valueStyle={{ color: 'var(--t-primary)' }} />
        <SummaryCard label="Active Clients" value={String(activeClients)} subnote="with payments on record" />
      </div>
    )}

    {/* Keep existing filter bar + table + PaymentModal */}
    ...
  </div>
)
```

Find the existing "Receive Payment" button trigger — it currently opens a modal. Identify the state variable name (e.g. `showModal`) and use it in the new button's `onClick`.

- [ ] **Restyle billing filter bar to match spec**

Find the existing filter section (client select + date range inputs) and restyle to match the filter bar spec: `h-10`, `rounded-[11px]`, `border-[1.5px] border-t-line`, `bg-t-card`, `13.5px / 600`.

- [ ] **Verify and commit**

```bash
cd frontend && npx tsc --noEmit 2>&1 | grep "admin/billing" | head -5
git add frontend/src/app/admin/billing/page.tsx
git commit -m "feat: restyle Billing page — breadcrumb, h1, summary cards"
```

---

## Task 12: Income Statement pages

**Files:**
- Modify: `frontend/src/app/client/reports/income-statement/page.tsx`
- Modify: `frontend/src/app/accountant/reports/[clientId]/income-statement/page.tsx`

Reference: `design_handoff_pages/Income-Statement.html`. `ReportToolbar` was already restyled in Task 2.

- [ ] **Update client income-statement page**

Replace the existing header block (currently `ReportBreadcrumb` + h1 div):

```tsx
import { Breadcrumb } from '@/components/shared/Breadcrumb'
```

```tsx
// Replace:
// <ReportBreadcrumb title="Income Statement" />
// <div className="mb-4"><h1 ...>Income Statement</h1>...</div>
// With:

<Breadcrumb crumbs={[{ label: 'Reports', href: '/client/reports' }, { label: 'Income Statement' }]} />
<div className="flex items-start justify-between mb-[22px]">
  <div>
    <h1
      className="text-[34px] font-bold tracking-[-0.025em] text-t-ink m-0"
      style={{ fontFamily: 'var(--font-display)' }}
    >
      Income Statement
    </h1>
    <p className="text-[14.5px] text-t-muted mt-[5px]">Approved transactions only</p>
  </div>
</div>
```

Wrap the whole page content in `<div className="max-w-[1280px] mx-auto px-9 py-7">`.

- [ ] **Update accountant income-statement page**

Same change — replace the `<Button variant="ghost">Back to Reports</Button>` + h1 block:

```tsx
import { Breadcrumb } from '@/components/shared/Breadcrumb'
```

```tsx
// Replace back-button + h1 with:
<Breadcrumb crumbs={[{ label: 'Reports', href: '/accountant/reports' }, { label: 'Income Statement' }]} />
<div className="mb-[22px]">
  <h1
    className="text-[34px] font-bold tracking-[-0.025em] text-t-ink m-0"
    style={{ fontFamily: 'var(--font-display)' }}
  >
    Income Statement
  </h1>
  <p className="text-[14.5px] text-t-muted mt-[5px]">Approved transactions only</p>
</div>
```

Wrap in `<div className="max-w-[1280px] mx-auto px-9 py-7">`.

- [ ] **Verify and commit**

```bash
cd frontend && npx tsc --noEmit 2>&1 | grep "income-statement" | head -5
git add frontend/src/app/client/reports/income-statement/page.tsx frontend/src/app/accountant/reports/\[clientId\]/income-statement/page.tsx
git commit -m "feat: restyle Income Statement pages — breadcrumb, h1, toolbar card"
```

---

## Task 13: Expense Breakdown pages

**Files:**
- Modify: `frontend/src/app/client/reports/expense-breakdown/page.tsx`
- Modify: `frontend/src/app/accountant/reports/[clientId]/expense-breakdown/page.tsx`

Reference: `design_handoff_pages/Expense-Breakdown.html`. Same pattern as Task 12.

- [ ] **Update client expense-breakdown page**

```tsx
import { Breadcrumb } from '@/components/shared/Breadcrumb'
```

Replace header:
```tsx
<Breadcrumb crumbs={[{ label: 'Reports', href: '/client/reports' }, { label: 'Expense Breakdown' }]} />
<div className="flex items-start justify-between mb-[22px]">
  <div>
    <h1
      className="text-[34px] font-bold tracking-[-0.025em] text-t-ink m-0"
      style={{ fontFamily: 'var(--font-display)' }}
    >
      Expense Breakdown
    </h1>
    <p className="text-[14.5px] text-t-muted mt-[5px]">Approved transactions only</p>
  </div>
</div>
```

Wrap in `<div className="max-w-[1280px] mx-auto px-9 py-7">`.

- [ ] **Update accountant expense-breakdown page** — same pattern as above, breadcrumb href `/accountant/reports`.

- [ ] **Verify and commit**

```bash
cd frontend && npx tsc --noEmit 2>&1 | grep "expense-breakdown" | head -5
git add frontend/src/app/client/reports/expense-breakdown/page.tsx frontend/src/app/accountant/reports/\[clientId\]/expense-breakdown/page.tsx
git commit -m "feat: restyle Expense Breakdown pages — breadcrumb, h1, toolbar card"
```

---

## Task 14: BIR Books

**Files:**
- Modify: `frontend/src/components/reports/BIRBooksView.tsx`

Reference: `design_handoff_pages/BIR-Books.html`. Key change: replace the current book selector (which uses `shadcn/ui Select`) with a pill-style tab switcher. Restyle the toolbar to sit inside a card. Replace `ReportBreadcrumb` with `Breadcrumb`.

- [ ] **Add imports**

```tsx
import { Breadcrumb } from '@/components/shared/Breadcrumb'
// Remove import of ReportBreadcrumb if present
```

- [ ] **Replace ReportBreadcrumb and h1 block**

Find:
```tsx
<ReportBreadcrumb title="BIR Books" />
<div className="mb-4">
  <h1 ...>BIR Books</h1>
  ...
</div>
```

Replace with:
```tsx
<Breadcrumb crumbs={[{ label: 'Reports', href: '/client/reports' }, { label: 'BIR Books' }]} />
<div className="flex items-start justify-between mb-[22px]">
  <div>
    <h1
      className="text-[34px] font-bold tracking-[-0.025em] text-t-ink m-0"
      style={{ fontFamily: 'var(--font-display)' }}
    >
      BIR Books
    </h1>
    {!fetchClients && (
      <p className="text-[14.5px] text-t-muted mt-[5px]">
        For reference only — your accountant handles official submission
      </p>
    )}
  </div>
</div>
```

- [ ] **Restyle toolbar as card with pill tab switcher**

Find the existing toolbar `<div className="flex items-center gap-2 flex-wrap mb-4">`. Replace with:

```tsx
<div
  className="flex items-center gap-2.5 mb-[22px] flex-wrap bg-t-card border border-t-line rounded-[14px] px-[18px] py-3.5"
  style={{ boxShadow: 'var(--t-shadow)' }}
>
  {/* Book tab switcher */}
  <div className="flex gap-0.5 bg-t-surface border border-t-line rounded-[10px] p-[3px]">
    {BOOKS.map((b) => (
      <button
        key={b.value}
        onClick={() => handleTabChange(b.value)}
        className="rounded-[8px] px-4 py-[7px] text-[13px] font-bold transition-all"
        style={
          book === b.value
            ? {
                color: '#fff',
                background: 'linear-gradient(150deg, var(--t-primary), var(--t-primary-deep))',
              }
            : { color: 'var(--t-muted)', background: 'transparent' }
        }
      >
        {b.label}
      </button>
    ))}
  </div>

  <div className="w-px h-7 bg-t-line mx-1" />

  {/* Client selector (accountant view only) */}
  {fetchClients && ( /* keep existing ReportClientSelector */ )}

  {/* Date range */}
  <input
    type="date"
    value={start}
    onChange={(e) => handleDateChange('start', e.target.value)}
    className="h-10 px-3 border-[1.5px] border-t-line rounded-[10px] text-[13.5px] font-semibold text-t-muted bg-t-surface"
  />
  <span className="text-t-faint text-sm">–</span>
  <input
    type="date"
    value={end}
    onChange={(e) => handleDateChange('end', e.target.value)}
    className="h-10 px-3 border-[1.5px] border-t-line rounded-[10px] text-[13.5px] font-semibold text-t-muted bg-t-surface"
  />

  {/* GL account picker — only shown when book === 'gl' */}
  {book === 'gl' && accounts && (
    <select
      value={accountId ?? ''}
      onChange={(e) => setAccountId(e.target.value || undefined)}
      className="h-10 pl-3.5 pr-9 rounded-[10px] border-[1.5px] border-t-line bg-t-surface text-[13.5px] font-semibold text-t-ink appearance-none"
    >
      <option value="">Select account…</option>
      {accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
    </select>
  )}

  {/* View button — triggers data load by adding current book to loadedBooks set.
       The existing viewDisabled flag covers the not-ready cases (no client selected,
       no GL account selected). Add this handler if it doesn't already exist:
       function handleView() { if (!viewDisabled) setLoadedBooks(prev => new Set([...prev, book])) } */}
  <button
    onClick={() => { if (!viewDisabled) setLoadedBooks(prev => new Set([...prev, book])) }}
    disabled={viewDisabled}
    className="h-10 px-[18px] rounded-[10px] text-[13.5px] font-bold text-white disabled:opacity-40"
    style={{
      background: 'linear-gradient(150deg, var(--t-primary), var(--t-primary-deep))',
      boxShadow: '0 12px 22px -12px var(--t-primary)',
    }}
  >
    View
  </button>

  <div className="flex-1" />

  {/* Export PDF — keep existing ExportPDFButton */}
  <ExportPDFButton type="bir" book={book} start={start} end={end} clientId={clientId} />
</div>
```

Check `BOOKS` constant — it's `[{value:'crb',label:'CRB'}, ...]` already in the file.

- [ ] **Wrap page in max-width container**

Find where `BIRBooksView` returns its outermost `<div>`. Wrap all content in:
```tsx
<div className="max-w-[1280px] mx-auto px-9 py-7">
  ...
</div>
```

- [ ] **Verify and commit**

```bash
cd frontend && npx tsc --noEmit 2>&1 | grep "BIRBooks" | head -5
git add frontend/src/components/reports/BIRBooksView.tsx
git commit -m "feat: restyle BIR Books — breadcrumb, h1, pill tab switcher, toolbar card"
```

---

## Task 15: Final build verification

- [ ] **Run full TypeScript check**

```bash
cd frontend && npx tsc --noEmit 2>&1
```
Expected: 0 errors.

- [ ] **Run build**

```bash
cd frontend && npm run build 2>&1 | tail -20
```
Expected: `Route (app)` table prints, build completes with no errors.

- [ ] **Visual verification**

Start the dev server (`npm run dev` in frontend) and open each page. Compare against the design handoff HTML in `design_handoff_pages/`. Checklist:

- [ ] `/client/documents` — breadcrumb, 34px h1, 4 summary cards, filter bar, table card
- [ ] `/client/upload` — breadcrumb, 3 summary cards, zone cards, gradient CTA
- [ ] `/accountant/queue` — breadcrumb, 4 summary cards, "Approve Selected (N)" button
- [ ] `/admin/queue` — same as accountant queue, extra Accountant filter visible
- [ ] `/accountant/clients` — breadcrumb, 4 summary cards, search input
- [ ] `/accountant/adjusting-entries` — breadcrumb, 4 summary cards, dropdown filters
- [ ] `/admin/clients` — breadcrumb, 4 summary cards, 3 filters
- [ ] `/admin/accountants` — breadcrumb, 4 summary cards, Invite button
- [ ] `/admin/billing` — breadcrumb, 4 summary cards, date range filters
- [ ] `/client/reports/income-statement` — toolbar card, expandable table
- [ ] `/client/reports/expense-breakdown` — toolbar card, % bars
- [ ] `/client/reports/bir` — pill tab switcher (CRB/CDB/GJ/GL), toolbar card

- [ ] **Final commit**

```bash
git add -A
git commit -m "chore: final build verification — all 10 page redesigns complete"
```
