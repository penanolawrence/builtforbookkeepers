# Document Detail Modal Layout Redesign — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Refactor `DocumentDetailModal` to use a sticky footer for action buttons, move the status badge into a left-column details card, and add scroll containment to long transaction tables.

**Architecture:** Single-file refactor of `DocumentDetailModal.tsx`. The layout is restructured into three flex zones: a fixed header, a scrollable two-column body, and a sticky footer. Two new sub-components are added inline: `TypeBadge` and `DocMetaCard`. All action buttons move from the right column body into the footer. No props, API calls, or external interfaces change.

**Tech Stack:** React, Next.js 14 App Router, TypeScript, Tailwind CSS, shadcn/ui Dialog

---

### Task 1: Add `TypeBadge` and `DocMetaCard` sub-components

**Files:**
- Modify: `frontend/src/components/documents/DocumentDetailModal.tsx`

- [ ] **Step 1: Add `TypeBadge` after the existing `StatusBadge` component**

`DeclaredType` is `'income' | 'expense'` (from `frontend/src/types/document.ts`). Add this block immediately after the closing brace of `StatusBadge`:

```tsx
function TypeBadge({ type }: { type: Document['declaredType'] }) {
  const map: Record<Document['declaredType'], { label: string; cls: string }> = {
    income:  { label: 'Income',  cls: 'bg-green-100 text-green-700' },
    expense: { label: 'Expense', cls: 'bg-red-100 text-red-700' },
  }
  const { label, cls } = map[type]
  return (
    <span className={`inline-flex items-center text-[10px] font-semibold px-2 py-0.5 rounded-full ${cls}`}>
      {label}
    </span>
  )
}
```

- [ ] **Step 2: Add `DocMetaCard` immediately after `TypeBadge`**

```tsx
function DocMetaCard({ doc }: { doc: Document }) {
  const date = doc.date ?? doc.createdAt.slice(0, 10)
  return (
    <div className="mt-3 rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 space-y-2 text-xs">
      {doc.merchantName && (
        <div className="flex items-center justify-between">
          <span className="text-gray-500">Merchant</span>
          <span className="font-semibold text-gray-800">{doc.merchantName}</span>
        </div>
      )}
      <div className="flex items-center justify-between">
        <span className="text-gray-500">Date</span>
        <span className="font-semibold text-gray-800">{date}</span>
      </div>
      <div className="flex items-center justify-between">
        <span className="text-gray-500">Declared type</span>
        <TypeBadge type={doc.declaredType} />
      </div>
      <div className="flex items-center justify-between">
        <span className="text-gray-500">Status</span>
        <StatusBadge status={doc.status} />
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
cd frontend && npx tsc --noEmit
```

Expected: no errors

- [ ] **Step 4: Commit**

```bash
git add frontend/src/components/documents/DocumentDetailModal.tsx
git commit -m "feat: add TypeBadge and DocMetaCard sub-components to DocumentDetailModal"
```

---

### Task 2: Add scroll containment to `LineTable`

**Files:**
- Modify: `frontend/src/components/documents/DocumentDetailModal.tsx` — `LineTable` component

- [ ] **Step 1: Wrap the table in a scroll div and pin the thead**

In the `LineTable` component, the current structure is:

```tsx
<div className="border border-gray-200 rounded-lg overflow-hidden">
  <table className="w-full border-collapse text-xs">
    <thead>
      <tr className="bg-gray-50 border-b border-gray-200">
```

Replace it with:

```tsx
<div className="border border-gray-200 rounded-lg overflow-hidden">
  <div className="max-h-64 overflow-y-auto">
    <table className="w-full border-collapse text-xs">
      <thead className="sticky top-0 z-10">
        <tr className="bg-gray-50 border-b border-gray-200">
```

Then close the new inner `div` after `</table>`:

```tsx
        </tbody>
        </table>
      </div>
    </div>
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd frontend && npx tsc --noEmit
```

Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/documents/DocumentDetailModal.tsx
git commit -m "feat: add scroll container and sticky header to LineTable"
```

---

### Task 3: Restructure `DialogContent` into three zones

**Files:**
- Modify: `frontend/src/components/documents/DocumentDetailModal.tsx` — `DocumentDetailModal` component JSX

- [ ] **Step 1: Make `DialogContent` a flex column with capped height**

Find:

```tsx
<DialogContent className="sm:max-w-4xl p-0 gap-0 overflow-hidden">
```

Replace with:

```tsx
<DialogContent className="sm:max-w-4xl p-0 gap-0 overflow-hidden flex flex-col max-h-[90vh]">
```

- [ ] **Step 2: Update the header — remove `StatusBadge`**

Find:

```tsx
{/* Header */}
<div className="flex items-start justify-between px-6 pt-5 pb-4 border-b border-gray-100">
  <div>
    <div className="text-[15px] font-bold text-gray-900">{ref}</div>
    <MetaLine doc={doc} />
  </div>
  <StatusBadge status={doc.status} />
</div>
```

Replace with:

```tsx
{/* Header */}
<div className="px-6 pt-5 pb-4 border-b border-gray-100 shrink-0">
  <div className="text-[15px] font-bold text-gray-900">{ref}</div>
  <MetaLine doc={doc} />
</div>
```

- [ ] **Step 3: Make the two-column body flex-1 so it fills remaining height**

Find:

```tsx
{/* Two-column body */}
<div className="flex divide-x divide-gray-100 overflow-hidden max-h-[72vh]">
```

Replace with:

```tsx
{/* Two-column body */}
<div className="flex divide-x divide-gray-100 overflow-hidden flex-1 min-h-0">
```

- [ ] **Step 4: Update the left column — replace the loose merchant name div with `DocMetaCard`**

Find:

```tsx
{/* Left: receipt image */}
<div className="w-2/5 p-5 overflow-y-auto">
  <ReceiptImage doc={fullDoc} />
  {fullDoc.merchantName && (
    <div className="mt-3 text-xs font-semibold text-gray-700">{fullDoc.merchantName}</div>
  )}
</div>
```

Replace with:

```tsx
{/* Left: receipt image + meta */}
<div className="w-2/5 p-5 overflow-y-auto">
  <ReceiptImage doc={fullDoc} />
  <DocMetaCard doc={fullDoc} />
</div>
```

- [ ] **Step 5: Strip action buttons from the right column — PROCESSING**

Find the PROCESSING block:

```tsx
{doc.status === 'PROCESSING' && (
  <>
    <PipelineSteps doc={doc} />
    <button
      onClick={() => setIsCancelOpen(true)}
      className="w-full border border-red-300 text-red-600 hover:bg-red-50 text-sm font-semibold py-2.5 rounded-lg transition-colors"
    >
      Cancel Document
    </button>
  </>
)}
```

Replace with:

```tsx
{doc.status === 'PROCESSING' && (
  <PipelineSteps doc={doc} />
)}
```

- [ ] **Step 6: Strip action buttons from the right column — PARKED**

Find the PARKED block:

```tsx
{doc.status === 'PARKED' && (
  <>
    <TransactionLinesTable doc={fullDoc} />
    <div className="bg-yellow-50 border border-yellow-200 rounded-lg px-4 py-3 text-xs text-yellow-800">
      ⏳ Your accountant is reviewing this entry.
    </div>
    <button
      onClick={() => setIsCancelOpen(true)}
      className="w-full border border-red-300 text-red-600 hover:bg-red-50 text-sm font-semibold py-2.5 rounded-lg transition-colors"
    >
      Cancel Document
    </button>
  </>
)}
```

Replace with:

```tsx
{doc.status === 'PARKED' && (
  <>
    <TransactionLinesTable doc={fullDoc} />
    <div className="bg-yellow-50 border border-yellow-200 rounded-lg px-4 py-3 text-xs text-yellow-800">
      ⏳ Your accountant is reviewing this entry.
    </div>
  </>
)}
```

- [ ] **Step 7: Strip action buttons from the right column — RETURNED**

Find the RETURNED block:

```tsx
{doc.status === 'RETURNED' && (
  <>
    {fullDoc.returnNote && (
      <div className="bg-red-50 border-[1.5px] border-red-300 rounded-lg px-4 py-3">
        <div className="text-[10px] font-bold text-red-600 uppercase mb-1">Accountant Note</div>
        <div className="text-xs text-gray-700 leading-relaxed">{fullDoc.returnNote}</div>
      </div>
    )}
    <TransactionLinesTable doc={fullDoc} dimmed />
    <div className="flex items-center gap-3">
      <button
        onClick={() => setIsCancelOpen(true)}
        className="border border-red-300 text-red-600 hover:bg-red-50 text-sm font-semibold px-4 py-2.5 rounded-lg transition-colors"
      >
        Cancel Document
      </button>
      <button
        onClick={handleReuploadClick}
        className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold py-2.5 rounded-lg transition-colors"
      >
        Re-upload Document
      </button>
      {doc.expiresAt && <ExpiryCountdown expiresAt={doc.expiresAt} />}
    </div>
  </>
)}
```

Replace with:

```tsx
{doc.status === 'RETURNED' && (
  <>
    {fullDoc.returnNote && (
      <div className="bg-red-50 border-[1.5px] border-red-300 rounded-lg px-4 py-3">
        <div className="text-[10px] font-bold text-red-600 uppercase mb-1">Accountant Note</div>
        <div className="text-xs text-gray-700 leading-relaxed">{fullDoc.returnNote}</div>
      </div>
    )}
    <TransactionLinesTable doc={fullDoc} dimmed />
  </>
)}
```

- [ ] **Step 8: Add the sticky footer after the closing `</div>` of the two-column body**

The two-column body closes with `</div>` (the flex container). Immediately after it, before `</DialogContent>`, add:

```tsx
{/* Footer */}
<div className="flex items-center justify-between px-6 py-3 border-t border-gray-100 shrink-0">
  <div>
    {canCancel && (
      <button
        onClick={() => setIsCancelOpen(true)}
        className="border border-red-300 text-red-600 hover:bg-red-50 text-sm font-semibold px-4 py-2 rounded-lg transition-colors"
      >
        Cancel Document
      </button>
    )}
  </div>
  <div className="flex items-center gap-3">
    {doc.status === 'RETURNED' && doc.expiresAt && (
      <ExpiryCountdown expiresAt={doc.expiresAt} />
    )}
    {doc.status === 'RETURNED' && (
      <button
        onClick={handleReuploadClick}
        className="bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors"
      >
        Re-upload Document
      </button>
    )}
    <button
      onClick={onClose}
      className="border border-gray-200 text-gray-700 hover:bg-gray-50 text-sm font-semibold px-4 py-2 rounded-lg transition-colors"
    >
      Close
    </button>
  </div>
</div>
```

- [ ] **Step 9: Verify TypeScript compiles**

```bash
cd frontend && npx tsc --noEmit
```

Expected: no errors

- [ ] **Step 10: Commit**

```bash
git add frontend/src/components/documents/DocumentDetailModal.tsx
git commit -m "feat: sticky footer, DocMetaCard in left column, status badge removed from header"
```

---

### Task 4: Manual verification

- [ ] **Step 1: Start the dev server**

```bash
cd frontend && npm run dev
```

Open `http://localhost:3000` and log in as a client.

- [ ] **Step 2: Verify each status**

Open the document list and open a modal for each status. Check:

| Status | Header: no badge | Left: DocMetaCard visible | Footer: correct buttons | Right column: no buttons |
|---|---|---|---|---|
| PROCESSING | ✓ | ✓ | Cancel (left) · Close (right) | ✓ |
| PARKED | ✓ | ✓ | Cancel (left) · Close (right) | ✓ |
| RETURNED | ✓ | ✓ | Cancel (left) · expiry · Re-upload · Close (right) | ✓ |
| APPROVED | ✓ | ✓ | Close (right) only | ✓ |
| REJECTED | ✓ | ✓ | Close (right) only | ✓ |
| CANCELLED | ✓ | ✓ | Close (right) only | ✓ |

- [ ] **Step 3: Verify footer stays pinned on long content**

Open a document with many transaction lines (or temporarily add dummy lines). Scroll the right column. Confirm the footer with the Close button remains visible without scrolling.

- [ ] **Step 4: Verify table scroll**

If a transaction table has more rows than fit in 256px (`max-h-64`), confirm the table body scrolls and the column headers (Description, AI Category, Amount) remain pinned at the top.
