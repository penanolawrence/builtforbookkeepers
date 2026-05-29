# Upload UI Redesign — Multi-Line Transaction Support

**Date:** 2026-05-29  
**Status:** Approved  
**Scope:** Frontend only — UI changes to support the multi-line `transaction_lines` backend described in `handoff.md`

---

## Context

The backend plan (Steps 1–5 of `handoff.md`) replaces the single `account_id` on a document with a `transaction_lines` table. Each document can now produce multiple AI-classified lines (e.g. one receipt → "Service Revenue ₱500" + "Sales Revenue ₱500"). This spec covers how the client-facing UI reflects that change.

---

## Decisions Made

| Question | Answer |
|---|---|
| Manual entry multi-line in scope? | Yes |
| Can one document have mixed income + expense lines? | No — declared_type stays at document level; all lines share the same type |
| Document detail: page or modal? | Centered modal (Dialog) — no page navigation |
| Upload progress cards: keep or replace? | Replace with the same table used on Documents page |
| Approach | Approach 2 — Upload-aware feedback (line count shown on completion) |

---

## 1. Manual Entry Form

**File:** `frontend/src/components/upload/ManualEntryForm.tsx`  
**Trigger:** "No Receipt / Manual Entry" link on the upload page → opens as a bottom sheet

### Layout

```
┌─────────────────────────────────────┐
│  ────  (sheet handle)               │
│                                     │
│  Manual Entry                       │
│                                     │
│  [ EXPENSE ]   [ INCOME  ]          │  ← type toggle, full-width pills
│                                     │
│  Date          Payment              │  ← side-by-side
│  ──────────    ──────────           │
│                                     │
│  What did you spend on?             │  ← label changes with type toggle
│  (or: What did you earn from?)      │
│                                     │
│  [Description…        ] [₱0.00] ×  │  ← filled row
│  [Description…        ] [₱0.00] ×  │  ← filled row
│  [Add another…        ] [₱0.00]    │  ← always-empty trailing row
│                                     │
│  ┌─────────────────────────────────┐│
│  │  Total          ₱350.00        ││  ← total bar, red=expense green=income
│  └─────────────────────────────────┘│
│                                     │
│  [ Submit Entry ]                   │  ← disabled until ≥1 line filled
│  AI will assign account codes.      │
└─────────────────────────────────────┘
```

### Behavior

- **Type toggle** sets `declared_type` for the whole document. All lines share this type. Toggle color: red for EXPENSE, green for INCOME.
- **Date** and **Payment method** are shared across all lines (one per document).
- **Line rows**: each row has a description text input and an amount input. No category dropdown — the AI assigns account codes from the description.
- **Trailing empty row**: always one dashed empty row at the bottom. Typing in it promotes it to a filled row and creates a new empty one. No "+ Add line" button needed.
- **Delete (×)**: appears on filled rows only. Removes that line. Not shown on the trailing empty row.
- **Total bar**: sums all line amounts. Color matches type toggle.
- **Submit button**: disabled (greyed out) until at least one line has both a non-empty description and an amount > 0. Active state: red for expense, indigo for income.
- **No note field**: the per-line description replaces the old single note field.
- On submit: `POST /api/documents/manual` with `{ declared_type, date, paymentMethod, lines: [{ description, amount }] }`. Backend creates the document and dispatches `ClassifyWithAI` with the lines as input.

### What is removed

- The old single `Amount` field
- The old `Category` dropdown
- The old `Note` field
- The type label in the ManualEntryRequest — replaced by per-line descriptions

---

## 2. Upload Page — In-Progress Table

**File:** `frontend/src/app/client/upload/page.tsx`  
**Change:** Replace `UploadProgressCard` / `BulkUploadList` cards with the shared `DocumentsTable` component (see Section 3).

### Upload page layout after change

```
┌────────────────────────────────────────┐
│  Upload                                │
├────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────────┐ │
│  │   INCOME    │  │    EXPENSES     │ │  ← two drop zones (unchanged)
│  │  📷 Take    │  │  📷 Take        │ │
│  │  Choose File│  │  Choose File    │ │
│  └─────────────┘  └─────────────────┘ │
│                                        │
│  📋 No Receipt / Manual Entry          │  ← link unchanged
│                                        │
│  In Progress                           │
│  ┌────────────────────────────────────┐│
│  │ REF · SOURCE · DATE · IN · OUT ... ││  ← DocumentsTable (shared)
│  └────────────────────────────────────┘│
└────────────────────────────────────────┘
```

The two drop zones and Manual Entry link are **unchanged**. The progress cards below them are replaced by the shared `DocumentsTable` showing the client's recent documents filtered to exclude fully-posted Approved items (or showing all — per product decision).

---

## 3. Shared Documents Table

**New file:** `frontend/src/components/documents/DocumentsTable.tsx`  
**Used by:** Upload page (in-progress section) and Documents page (`/client/documents`)

### Columns

| Column | Source | Notes |
|---|---|---|
| Reference | `doc.refNumber` or last 8 chars of `doc.id` | |
| Source | Badge: "Upload" (grey) if `!doc.isNoReceipt`, "Manual" (blue) if `doc.isNoReceipt` | Replaces old Type column |
| Uploaded | `doc.createdAt` formatted `DD MMM` | |
| Inflow | `doc.inflow` in green via `formatCurrency()` | Blank if 0 or still processing |
| Outflow | `doc.outflow` in red via `formatCurrency()` | Blank if 0 or still processing |
| Status | `<StatusBadge>` component | Processing / In Review / Returned / Rejected / Approved |
| Note | Dynamic (see below) | |

**Note column content by status:**

| Status | Note text | Color |
|---|---|---|
| Processing | Current pipeline stage label (live via WebSocket) e.g. "Reading receipt…" | Grey italic |
| In Review | "Awaiting accountant review" | Grey |
| Returned | Accountant return note truncated to ~50 chars | Red |
| Rejected | Rejection reason truncated to ~50 chars | Grey |
| Approved | — (blank) | — |

**Row behavior:**
- Every row is clickable → opens the Document Detail Modal (Section 4)
- Hover state: subtle background highlight
- Processing rows show dashes (—) for Inflow and Outflow until AI pipeline completes and `transactionLines` are written

---

## 4. Document Detail Modal

**No new route.** The existing `/client/documents/[id]/page.tsx` is **removed**. Detail viewing happens entirely in a centered `shadcn/ui Dialog` triggered by clicking a table row.

### Modal structure

```
┌─────────────────────────────────────┐
│  MNL-0012                     [×]   │  ← reference + close button
│  May 29, 2026 · Cash · Manual · Exp │  ← metadata line
│  ─────────────────────  [In Review] │  ← status badge right-aligned
├─────────────────────────────────────┤
│  [scrollable body]                  │
│                                     │
│  [receipt image OR placeholder]     │
│                                     │
│  Transaction Lines                  │
│  ┌─────────────────────────────────┐│
│  │ Description │ AI Category │ Amt ││
│  │ …           │ …           │ …  ││
│  │ …           │ …           │ …  ││
│  │ Total       │             │ …  ││
│  └─────────────────────────────────┘│
│                                     │
│  [status banner]                    │
└─────────────────────────────────────┘
```

- **Header column label:** "Your Description" for manual entries; "Description" for receipt uploads.
- **Total row label:** "Total Expense" (red) or "Total Income" (green) based on `declared_type`.
- Modal closes on × button or backdrop click.
- On mobile: full-width, slides up from bottom (native Dialog behavior via shadcn).

### Content by status

**Processing**
- Receipt image placeholder (or actual thumbnail if available)
- Pipeline step list: Uploaded ✅ → Preparing ✅ → Reading receipt ⟳ → Categorizing ○ → Checking issues ○
- On modal open: call `GET /api/documents/{id}/status` once to get the last known stage, then render the step list from that point. Subsequent stage changes arrive via `useDocumentStatus(documentId)` (existing hook).
- Steps tick off as WebSocket `document:stage_update` events arrive
- No transaction lines table yet

**In Review (PARKED)**
- Receipt image / "Manual Entry — no receipt" placeholder
- Transaction lines table (full opacity)
- Yellow banner: "⏳ Your accountant is reviewing this entry."

**Returned**
- Red box at top: **Accountant Note** (full text, not truncated)
- Receipt image
- Transaction lines table (45% opacity / dimmed)
- Re-upload button (indigo, full width)
- Expiry countdown: "Expires in N days" — text turns red when < 3 days remain
- No further actions available other than re-upload

**Rejected**
- Grey box: **Rejection Reason** (full text)
- Receipt image
- Transaction lines table (45% opacity / dimmed)
- Grey notice: "This document has been permanently excluded from your books."
- No action available

**Approved**
- Receipt image
- Transaction lines table (full opacity)
- Green banner: "✅ Approved and posted to your books."
- No action available

---

## 5. Files Changed

| File | Change |
|---|---|
| `frontend/src/components/upload/ManualEntryForm.tsx` | Full rewrite — multi-line, description-first |
| `frontend/src/components/upload/UploadProgressCard.tsx` | Removed |
| `frontend/src/components/upload/BulkUploadList.tsx` | Removed |
| `frontend/src/components/documents/DocumentsTable.tsx` | New — shared table component |
| `frontend/src/components/documents/DocumentDetailModal.tsx` | New — centered modal, all 5 status states |
| `frontend/src/app/client/upload/page.tsx` | Replace progress cards with `<DocumentsTable>` |
| `frontend/src/app/client/documents/page.tsx` | Replace card list with `<DocumentsTable>` |
| `frontend/src/app/client/documents/[id]/page.tsx` | Removed |
| `frontend/src/types/document.ts` | Already covered in `handoff.md` Step 6 |

---

## 6. What Is NOT Changed

- The two-column INCOME / EXPENSES drop zones on the upload page
- The "No Receipt / Manual Entry" trigger link
- File validation (type, size) on upload
- WebSocket events and `useDocumentStatus` hook — same events, modal just listens for them
- The approval queue (`QueueTable`, `ReviewPanel`) — accountant-side is unchanged
- `UploadZone.tsx` — unchanged
- `StatusBadge.tsx` — unchanged, reused in table

---

## 7. Open Items

- **Upload page table scope:** Confirm whether the In-Progress table on the upload page shows only non-Approved documents, or all documents. Recommendation: show only PROCESSING + PARKED + RETURNED so the upload page stays focused on items needing action.
- **WebSocket in modal (Processing state):** The modal's pipeline step list needs to subscribe to `document:stage_update` for the specific `documentId`. Reuse the existing `useDocumentStatus` hook.
