# Document Detail Modal — Layout Redesign

**Date:** 2026-05-30  
**Status:** Approved by user

---

## Problem

The `DocumentDetailModal` has two layout issues:

1. Action buttons (Cancel Document, Re-upload) are embedded inside the right column body, so they scroll out of view when the transaction lines table is long.
2. The status badge lives in the header top-right, which is inconsistent with the document details that appear in the left column.

Additionally, long transaction line tables have no scroll constraint — they push the modal to an unusable height.

---

## Scope

- Restructure `DialogContent` into three fixed zones: header, scrollable body, sticky footer
- Move all per-status action buttons into the footer
- Remove `StatusBadge` from the header; add it to a new `DocMetaCard` in the left column
- Wrap `TransactionLinesTable` in a scroll container with a max height
- No behaviour changes — cancel, re-upload, and confirmation dialog logic are unchanged

---

## Layout Structure

`DialogContent` becomes a flex-column. Only the body zone scrolls; header and footer are fixed height.

```
┌─────────────────────────────────────────────────────────────┐
│ HEADER  ref#  ·  MetaLine                                   │
├──────────────────────────┬──────────────────────────────────┤
│ LEFT (overflow-y-auto)   │ RIGHT (overflow-y-auto)          │
│  receipt image           │  pipeline / tables / notes       │
│  ─────────────────       │                                  │
│  DocMetaCard:            │                                  │
│    Merchant  Meralco     │                                  │
│    Date      May 25 2026 │                                  │
│    Type      [Expense]   │                                  │
│    Status    [In Review] │                                  │
├──────────────────────────┴──────────────────────────────────┤
│ FOOTER  [ Cancel Document ]     [ expiry ] [ Re-upload ] [ Close ] │
└─────────────────────────────────────────────────────────────┘
```

The body zone uses `flex-1 min-h-0` so it fills the remaining height without overflowing the viewport. Each column uses `overflow-y-auto` independently.

---

## Header

Remove `StatusBadge` from the header. Header now contains only:

- Left: ref number + `MetaLine`
- Right: nothing (the `justify-between` can be simplified to a single div)

---

## Left Column — DocMetaCard

Add a `DocMetaCard` component below the receipt image. It renders a small metadata block:

| Label | Value |
|---|---|
| Merchant | `fullDoc.merchantName` (only rendered if present) |
| Date | `doc.date ?? doc.createdAt.slice(0, 10)` |
| Type | `TypeBadge` — "Income" (green tint) or "Expense" (red tint), same pill style as `StatusBadge` |
| Status | `StatusBadge` (existing component, unchanged) |

If `merchantName` is absent (e.g. manual entry before OCR completes), that row is omitted.

---

## Right Column

The right column body contains only content — no action buttons at any status:

| Status | Right column content |
|---|---|
| PROCESSING | `PipelineSteps` |
| PARKED | `TransactionLinesTable` + in-review notice |
| RETURNED | Accountant note + `TransactionLinesTable` (dimmed) |
| APPROVED | `TransactionLinesTable` + approved notice |
| REJECTED | Rejection reason + `TransactionLinesTable` (dimmed) + permanent note |
| CANCELLED | Withdrawn message |

---

## Scrollable Table

`TransactionLinesTable` is wrapped in a `div` with `max-h-64 overflow-y-auto`. The `<thead>` inside `LineTable` gets `sticky top-0 z-10 bg-gray-50` so the column headers remain visible while scrolling.

---

## Footer

The footer is a `div` with `border-t border-gray-100 px-6 py-3 flex items-center justify-between` appended as the last child of `DialogContent`. It never scrolls.

**Left side** — conditional Cancel button:

```
PROCESSING → [ Cancel Document ]  (outlined red)
PARKED     → [ Cancel Document ]  (outlined red)
RETURNED   → [ Cancel Document ]  (outlined red)
others     → empty
```

**Right side** — always `[ Close ]`, plus for RETURNED: expiry countdown then `[ Re-upload Document ]` before Close:

| Status | Right side |
|---|---|
| RETURNED | `ExpiryCountdown` · `[ Re-upload Document ]` · `[ Close ]` |
| all others | `[ Close ]` |

`Close` fires `onClose()`. `Re-upload` fires `handleReuploadClick()`. `Cancel Document` opens the existing confirmation dialog (`setIsCancelOpen(true)`). None of this logic changes.

---

## What is NOT changing

- Confirmation dialog (cancel/withdraw flow) — unchanged
- `StatusBadge` component itself — unchanged, just relocated
- All status-specific content rendered in the right column — unchanged
- `DocumentDetailModal` props interface — unchanged
- Backend, API calls, query invalidation — untouched

---

## Files to touch

| File | Change |
|---|---|
| `frontend/src/components/documents/DocumentDetailModal.tsx` | Restructure layout: sticky footer, DocMetaCard in left column, remove status from header, scroll wrapper on TransactionLinesTable |
