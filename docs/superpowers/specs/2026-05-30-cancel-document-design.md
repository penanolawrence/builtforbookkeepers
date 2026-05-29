# Cancel Document — Design Spec

**Date:** 2026-05-30  
**Status:** Approved by user

---

## Problem

The client-facing `DocumentDetailModal` was missing a "Cancel Document" (withdraw) action. The only client action implemented was Re-upload (RETURNED only). Clients have no way to withdraw a submission they no longer want in the queue.

Additionally, the mockup designs had editable amount fields and a "Submit Corrections" button — both are explicitly **not** being built. Clients cannot edit AI classifications.

---

## Scope

- Add a `CANCELLED` document status (backend migration + frontend type)
- Add `POST /documents/{id}/cancel` endpoint
- Update `DocumentDetailModal` to show Cancel and/or Re-upload actions per status
- Add a confirmation dialog before cancelling
- No editable fields in the modal — read-only for clients
- No "Submit Corrections" button — not built

---

## Backend

### Migration

Add `CANCELLED` to the `status` enum on the `documents` table.

`CANCELLED` is a terminal status — same finality as `REJECTED`. No re-upload path from `CANCELLED`.

### Endpoint

```
POST /api/documents/{id}/cancel
```

- **Auth:** client role only; document must belong to the authenticated client's company
- **Guard:** only allowed when current status is `PROCESSING`, `PARKED`, or `RETURNED`
  - Any other status returns `422 Unprocessable Entity`
- **Action:** sets `status = CANCELLED`, saves
- **Notifications:** none — client-initiated action, no accountant notification needed
- **Queue:** no queue entry created

### Status lifecycle addition

```
PROCESSING → (client cancels) → CANCELLED
PARKED     → (client cancels) → CANCELLED
RETURNED   → (client cancels) → CANCELLED
```

`APPROVED` and `REJECTED` cannot be cancelled (permanent per business rules 4.4 and 8.5).

---

## Frontend

### Type update — `document.ts`

Add `CANCELLED` to `DocumentStatus`:

```ts
export type DocumentStatus =
  | 'PROCESSING' | 'PARKED' | 'APPROVED'
  | 'RETURNED'   | 'REJECTED' | 'CANCELLED'
```

### API — `documents.ts`

```ts
export async function cancelDocument(id: string): Promise<void> {
  await api.post(`/documents/${id}/cancel`)
}
```

### `DocumentDetailModal` — per-status UI

| Status | Actions shown |
|---|---|
| PROCESSING | Pipeline steps + "Cancel Document" button |
| PARKED | Transaction lines + "In Review" message + "Cancel Document" button |
| RETURNED | Accountant note + transaction lines (dimmed) + Re-upload (primary) + Cancel Document (secondary destructive) + expiry countdown |
| APPROVED | Transaction lines + "Approved" message — no actions |
| REJECTED | Rejection reason + transaction lines (dimmed) + permanent note — no actions |
| CANCELLED | Neutral message: "You withdrew this document." — no actions |

Fields remain read-only for all statuses. No editable inputs, no Submit Corrections button.

### Confirmation dialog

Before any cancel action fires:

> "Withdraw this document? This cannot be undone."

Two buttons: **Cancel** (dismiss) / **Withdraw** (confirm, destructive red).

### Post-cancel behaviour

1. Close the modal
2. Invalidate the `client-docs` query so the table refreshes
3. Show a toast: "Document withdrawn."

### RETURNED action row layout

```
[ Cancel Document (outlined red) ]    [ Re-upload Document (indigo) ]   N days left
```

Cancel is on the left (secondary/destructive). Re-upload is on the right (primary). Expiry countdown sits to the right of Re-upload, same as today.

---

## What is NOT changing

- No editable fields in the modal at any status
- No "Submit Corrections" button
- `documents.amount`, `documents.account_id` column — untouched
- OCR pipeline, anomaly detection, approval queue — untouched
- `APPROVED` and `REJECTED` statuses remain non-actionable by client
- No notifications on cancel

---

## Files to touch

| File | Change |
|---|---|
| `backend/database/migrations/` | New migration — add `CANCELLED` to status enum |
| `backend/app/Http/Controllers/DocumentController.php` | Add `cancel()` method |
| `backend/routes/api.php` | Add `POST /documents/{id}/cancel` route |
| `frontend/src/types/document.ts` | Add `CANCELLED` to `DocumentStatus` |
| `frontend/src/lib/api/documents.ts` | Add `cancelDocument()` |
| `frontend/src/components/documents/DocumentDetailModal.tsx` | Add Cancel button, confirmation dialog, CANCELLED state display; add `CANCELLED` mapping to the inline `StatusBadge` (grey, label "Cancelled") |
| `frontend/src/app/client/documents/page.tsx` | Pass `onCancel` handler to modal |
