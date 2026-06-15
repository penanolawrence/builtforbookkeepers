# Queue Reclassify Button — Design Spec

**Date:** 2026-06-15

## Overview

Add a "Re-run AI" button to the `QueueReviewModal` that re-dispatches the AI classification pipeline for a parked document. All extracted fields are reset to whatever the AI returns fresh.

## Backend

### New route

```
POST /queue/{id}/reclassify
```

Registered in `routes/api.php` alongside the existing queue routes, protected by the same auth middleware.

### `QueueController::reclassify()`

Auth guards (identical to `approve`/`return`/`reject`):
- Document must exist and have `status = parked`
- If the caller is an accountant, `company.accountant_id` must match `auth()->id()`

Dispatch logic:
- `is_no_receipt = false` → dispatch `PrepareDocumentForAI` (runs OCR then chains to `ClassifyWithAI`)
- `is_no_receipt = true` → dispatch `ClassifyWithAI($document, null)` directly

Response: `202 Accepted` with `{ "message": "Reclassification queued." }`

No field resets are done in the controller — the jobs overwrite fields naturally (merchant, date, vat_amount, lines, etc.) as they do on first classification.

## Frontend

### `lib/api/queue.ts`

Add:
```ts
export async function reclassifyItem(id: string): Promise<void> {
  await api.post(`/queue/${id}/reclassify`)
}
```

### `QueueReviewModal.tsx`

**State:** `const [reclassifying, setReclassifying] = useState(false)`

**Button placement:** Modal header row, to the left of the flag badge. The header currently uses `flex items-center justify-between` with ref/client on the left and the flag badge on the right. The Re-run AI button sits between them as a small ghost button.

**Button appearance:** Small outline button, `text-[11px]`, icon `↻` + label `Re-run AI`. Disabled while `reclassifying` or `isLoading`.

**On click:**
1. Set `reclassifying = true`
2. Call `reclassifyItem(documentId)`
3. On success: fire toast `"Reclassifying… reopen this item once the AI finishes."`, call `onClose()`
4. On error: fire destructive toast `"Failed to queue reclassification. Please try again."`, set `reclassifying = false`

The item stays `parked` and remains in the queue list while the job runs. No `onRemoved` call.

## Constraints

- Reclassification is allowed for **both** receipt and manual entry documents. The backend dispatches the correct job for each (`PrepareDocumentForAI` vs `ClassifyWithAI` directly). The button is shown regardless of `isNoReceipt`.

## Out of Scope

- Real-time feedback in the modal while reclassification is running
- Preventing duplicate reclassification dispatches (the API call is guarded by the button's disabled state)
