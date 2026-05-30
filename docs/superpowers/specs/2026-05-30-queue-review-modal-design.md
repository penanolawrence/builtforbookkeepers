# Queue Review Modal — Editable Fields + Override Trail

**Date:** 2026-05-30
**Status:** Approved

---

## Goal

Add a `QueueReviewModal` to the queue page so accountants and admins can review documents inline without navigating away. Reviewers can edit all AI-classified fields and transaction lines before acting. Any value changed from what the AI produced is persisted as an override trail and surfaced in the document detail view after approval.

---

## Architecture

Three layers of change:

1. **Backend** — migration adds `field_overrides` JSON column to `documents`; approve endpoint extended to accept all editable fields plus new/updated transaction lines; diff computed and stored at approval time.
2. **New `QueueReviewModal`** — opens from the Review button in `QueuePageContent`; receipt image + editable document fields on the left, editable transaction lines on the right, Reject / Return for Re-upload / Approve footer.
3. **`DocumentDetailModal` update** — renders a "Reviewed Edits" card on approved documents when `fieldOverrides` is present.

---

## Backend

### Migration

Add one nullable JSON column to `documents`:

```
field_overrides  JSON  nullable  default null
```

### Override storage format

```json
{
  "overriddenBy": "user-uuid",
  "overriddenAt": "2026-05-30T10:00:00Z",
  "fields": [
    { "field": "merchantName", "original": "MERALCO",    "override": "Manila Electric Co." },
    { "field": "date",         "original": "2026-05-20", "override": "2026-05-25" }
  ],
  "lines": [
    { "lineId": "uuid", "field": "accountCode", "original": "5100", "override": "5200" },
    { "lineId": "uuid", "field": "category",    "original": "Utilities", "override": "Office Supplies" }
  ]
}
```

Only changed fields are recorded. If nothing was changed from the AI values, `field_overrides` stays null.

### `ApproveItemRequest` — extended validation

New optional inputs alongside the existing `fields` map:

| Input | Type | Description |
|---|---|---|
| `fields.declaredType` | string | Maps to `document_type` |
| `lines` | array | Line updates and new lines (see below) |
| `removedLineIds` | string[] | IDs of existing lines to delete |

Each entry in `lines` is one of:

- **Update existing line:** `{ id, accountId, accountCode, category, amount, description, date }`
- **New line:** `{ type: 'income'|'expense', accountId, accountCode, category, amount, description, date }`

### `QueueController::show` — extended response

Add transaction lines to the existing `show` response (currently missing):

```php
'transactionLines' => $document->transactionLines->map(fn($l) => [
    'id'          => $l->id,
    'type'        => $l->type,
    'accountId'   => $l->account_id,
    'accountCode' => $l->account_code,
    'accountName' => $l->account?->name,
    'category'    => $l->category,
    'amount'      => (float) $l->amount,
    'description' => $l->description,
])->values()->all(),
```

Requires eager-loading `transactionLines.account` in the `show` query.

---

### Route — signed URL for accountants and admins

`GET /documents/{id}/image` is currently in the client-only route group. The `DocumentController::getSignedUrl` controller already handles accountant authorization. Move this route to the `role:accountant,admin` shared group so the modal can load the receipt image.

---

### `QueueController::approve` — changes

1. Extend `fieldMap` to include `declaredType → document_type`.
2. **Compute diff before applying changes** — compare each submitted field value against the current stored document value. For each line entry with an `id`, compare submitted `accountCode` and `category` against the current line values. Record differences as `{ field, original, override }`.
3. Apply document field updates via the existing `fill()` pattern.
4. Process `lines` inside the existing DB transaction:
   - Entries with `id`: find matching `TransactionLine`, update `account_id`, `account_code`, `category`, `amount`, `description`, `date`.
   - Entries without `id`: create a new `TransactionLine` with `document_id`, `type`, and submitted fields.
   - Delete all `TransactionLine` records whose IDs appear in `removedLineIds` (scoped to this document for safety).
5. If the computed diff is non-empty, write `field_overrides` JSON (with `overriddenBy` and `overriddenAt`). Otherwise leave null.

### `DocumentController::toDetail`

Add `fieldOverrides` to the response:

```php
'fieldOverrides' => $d->field_overrides,
```

---

## Frontend

### `QueueReviewModal`

**Location:** `frontend/src/components/queue/QueueReviewModal.tsx`

**Trigger:** Review button in `QueuePageContent` sets `reviewingId` state and renders `<QueueReviewModal documentId={reviewingId} onClose={() => setReviewingId(null)} />`. No navigation.

**Data loading:**
- `GET /queue/{id}` — full document detail including transaction lines (extended in this feature)
- `GET /documents/{id}/image` — receipt image (route moved to shared group in this feature)
- `GET /accounts?clientId={clientId}` — company's chart of accounts for the account dropdown

**Local edit state** (initialized from loaded document):

| State key | Field |
|---|---|
| `merchantName` | string |
| `date` | string (YYYY-MM-DD) |
| `declaredType` | string (`'income'` \| `'expense'`) |
| `paymentMethod` | string |
| `lines` | `{ id?, type, accountId, accountCode, category, amount, description, date }[]` |
| `removedLineIds` | `string[]` — IDs of existing lines to delete |

---

### Layout

```
┌──────────────────────────────────────────────────────────────────────┐
│ HEADER  ref# · clientName                    [flag badge]  [×]      │
├─────────────────────────┬────────────────────────────────────────────┤
│ LEFT (scroll)           │ RIGHT (scroll)                             │
│                         │                                            │
│  ┌───────────────────┐  │  ── Transaction Lines ──                   │
│  │   receipt image   │  │                                            │
│  └───────────────────┘  │  Income                                    │
│                         │  Account       Cat  Amt   Date    Desc  [x]│
│  ── Document Fields ──  │  [5100—Util▾] [__][____][______][______][🗑]│
│                         │                        [+ Add income line] │
│  Merchant               │                                            │
│  [_________________]    │  Expense                                   │
│  AI: MERALCO            │  Account       Cat  Amt   Date    Desc  [x]│
│                         │  [6200—Rent▾] [__][____][______][______][🗑]│
│  Date                   │  [5300—Sup▾]  [__][____][______][______][🗑]│
│  [_________________]    │                       [+ Add expense line] │
│  AI: 2026-05-20         │                                            │
│                         │  ── Anomaly Reasons ──                     │
│  Declared Type          │  (if RED/YELLOW)                           │
│  [Expense          ▾]   │  · Merchant mismatch                       │
│                         │  · Amount anomaly                          │
│  Payment Method         │                                            │
│  [Cash             ▾]   │                                            │
│                         │                                            │
├─────────────────────────┴────────────────────────────────────────────┤
│  [Reject]            [Return for Re-upload]             [Approve]   │
└──────────────────────────────────────────────────────────────────────┘
```

---

### Document Fields (left column)

| Field | Input | Notes |
|---|---|---|
| Merchant Name | Text input | |
| Date | Date input | |
| Declared Type | Select | `income` / `expense` |
| Payment Method | Select | `cash` / `check` / `credit_card` / etc. |

**AI hint text:** Each field shows `AI: <original value>` in muted text below the input **only when the current value differs from the original**. This acts as a live per-field override indicator while reviewing.

---

### Transaction Lines (right column)

Lines are grouped into **Income** and **Expense** sections. A section is omitted if there are no lines of that type and none have been added.

**Columns per line:**

| Column | Input type |
|---|---|
| Account | Searchable dropdown — fetches company's accounts list; shows `code — name`; on select sets both `accountCode` and `accountId` |
| Category | Free text input |
| Amount | Number input |
| Date | Date input (YYYY-MM-DD) |
| Description | Free text input |
| Delete | Icon button (🗑) — removes the row from local state; for existing lines, adds the `id` to `removedLineIds` on submit |

**Adding lines:** `[+ Add income line]` / `[+ Add expense line]` appends a new empty row with no `id`. New rows have a subtle left border (blue) to distinguish them from AI-generated lines.

**Removing lines:** Clicking 🗑 on any row removes it immediately from the local `lines` state. For rows that have an `id` (existing AI-generated lines), the `id` is tracked in a `removedLineIds` set and sent to the backend on approve. New rows (no `id`) are simply discarded from state with no backend call needed.

---

### Footer actions

- **Reject** — clicking expands an inline panel inside the footer replacing the buttons: textarea for reason + `[Cancel]` `[Confirm Reject]`. Submits `POST /queue/{id}/reject` with `reason`. Closes modal on success.
- **Return for Re-upload** — same inline panel pattern: textarea for note + `[Cancel]` `[Confirm Return]`. Submits `POST /queue/{id}/return` with `note`. Closes modal on success.
- **Approve** — submits all current field values + lines payload directly. Backend computes the diff. Closes modal and invalidates the queue query on success. Shows a success toast.

All three actions show a toast on success or failure.

---

### `QueuePageContent` changes

- Add `reviewingId: string | null` state (default `null`).
- Review button: replace `href` navigation with `onClick={() => setReviewingId(documentId)}`.
- Render `<QueueReviewModal documentId={reviewingId} onClose={() => setReviewingId(null)} />` when `reviewingId` is set.

---

### `DocumentDetailModal` — Reviewed Edits card

When `status === 'APPROVED'` and `fieldOverrides` is non-empty, render a **"Reviewed Edits"** card in the right column below the transaction lines table.

The card shows a simple two-column list of what changed:

```
Reviewed Edits
──────────────────────────────────────────
Merchant    MERALCO → Manila Electric Co.
Date        2026-05-20 → 2026-05-25
Line 1      Account: 5100 → 5200
```

Field labels are human-readable (e.g. `merchantName` → `Merchant`). Line entries identify the line by its position index (`Line 1`, `Line 2`, etc.).

---

## Files changed

| File | Action |
|---|---|
| `backend/database/migrations/YYYY_MM_DD_add_field_overrides_to_documents.php` | **Create** — add `field_overrides` JSON column |
| `backend/app/Http/Requests/Queue/ApproveItemRequest.php` | **Update** — add `declaredType` + `lines` validation |
| `backend/app/Http/Controllers/QueueController.php` | **Update** — extend `show` with transaction lines; apply line edits and compute + store override diff in `approve` |
| `backend/app/Http/Controllers/DocumentController.php` | **Update** — include `fieldOverrides` in `toDetail()` |
| `backend/routes/api.php` | **Update** — move `GET /documents/{id}/image` to `role:accountant,admin` group |
| `frontend/src/components/queue/QueueReviewModal.tsx` | **Create** — new modal component |
| `frontend/src/components/queue/QueuePageContent.tsx` | **Update** — Review button opens modal, `reviewingId` state |
| `frontend/src/components/documents/DocumentDetailModal.tsx` | **Update** — Reviewed Edits card |

---

## Out of scope

- Batch approve with field overrides — batch approval remains unchanged
- Backend changes to `batchApprove`
