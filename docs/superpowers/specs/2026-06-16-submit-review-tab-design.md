# Spec: Submit & Review Tab — Inline Queue List

**Date:** 2026-06-16
**Status:** Approved

## Problem

After uploading documents, the accountant must navigate away to the Review Queue page to see and action the submitted items. There's no way to stay in the client context and review documents without losing the modal.

## Goal

Extend the existing `SubmitTab` to show a filtered queue list below the upload section. The accountant can upload, then immediately see pending items for that client and approve, return, or reject them — all without leaving the modal.

## Layout

```
[ Upload section — unchanged ]
[ No physical receipt? Enter manually → ]

─────────────────────────────────────────

PENDING REVIEW  [5]

Flag │ Ref / Type        │ Merchant       │ Amount  │ Date   │ ☐
──────┼───────────────────┼────────────────┼─────────┼────────┼───
 🔴  │ #1042 · Expense   │ Meralco        │ ₱4,200  │ Jun 10 │
 🔴  │ #1039 · Expense   │ Globe Telecom  │ ₱1,800  │ Jun 8  │
 🟡  │ #1041 · Income    │ —              │ ₱12,500 │ Jun 9  │
 🟢  │ #1040 · Expense   │ SM Supermarket │ ₱650    │ Jun 9  │ ☑
 🟢  │ #1038 · Income    │ —              │ ₱8,000  │ Jun 7  │ ☑

2 green items selected           [ Approve Selected (2) ]
```

## Tab Label

`ClientDetailModal` tab renamed from **"Submit"** to **"Submit & Review"**.

## SubmitTab Changes

### New prop

```ts
interface Props {
  clientId: string
  docsQueryKey: unknown[]
  role: 'admin' | 'accountant'   // new
}
```

`role` is passed through from `ClientDetailModal`. It is not used for routing logic in this tab (queue API is shared), but is available for future role-gating if needed.

### Queue data

```ts
useQuery({
  queryKey: ['client-queue', clientId],
  queryFn: () => getQueue({ clientId }),
})
```

No polling or WebSocket integration — React Query's default stale/refetch-on-focus behaviour is sufficient. The query is invalidated when `QueueReviewModal.onRemoved` fires.

### Queue list section

Rendered below the upload section, separated by a horizontal rule.

**Section header row:**
- Left: uppercase faint label "PENDING REVIEW" + count badge (number of items)
- No controls on the right until items are selected (see batch approve bar below)

**Table columns:**

| Column | Content |
|--------|---------|
| Flag | Coloured dot — red / yellow / green |
| Ref / Type | `refNumber` or `—` · `declaredType` badge |
| Merchant | `merchantName` or `—` |
| Amount | `₱` formatted `amount`, or `—` |
| Date | Short date (`Jun 10`) from `date` field |
| ☐ | Checkbox — rendered only on GREEN rows |

**Sort order:** RED → YELLOW → GREEN (by flag priority).

**Row click:** Opens `QueueReviewModal` with `documentId`. On `onRemoved`, invalidates `['client-queue', clientId]`.

**Loading state:** Skeleton rows (3 placeholder rows, same height as real rows).

**Empty state:** Centered faint text: "No documents pending review."

### Batch approve bar

Rendered at the bottom of the tab, below the table. Visible only when `selected.size > 0`.

```
2 green items selected           [ Approve Selected (2) ]
```

- Left side: `{n} green item{s} selected` in faint text
- Right side: primary button `Approve Selected ({n})`
- Calls `batchApprove(Array.from(selected))`
- On success: toast `"Approved {n} item(s)."`, clears selection, invalidates `['client-queue', clientId]`
- On error: destructive toast `"Batch approval failed. Please try again."`
- Button shows loading state while in-flight

### Checkbox behaviour

- Only GREEN rows render a checkbox
- All GREEN rows start unchecked (no auto-select on load — avoids surprise approvals)
- Checking/unchecking a row toggles it in the `selected` Set
- No "select all" control needed — the list is already scoped to one client and is expected to be short

## Files Changed

| File | Change |
|------|--------|
| `frontend/src/components/upload/SubmitTab.tsx` | Add `role` prop; add queue fetch, queue list, `QueueReviewModal` trigger, batch approve bar |
| `frontend/src/components/clients/ClientDetailModal.tsx` | Pass `role` to `SubmitTab`; rename tab label to "Submit & Review" |

## Out of Scope

- Flag filter dropdown — list is already scoped to one client and short
- Real-time WebSocket updates — queue page handles global real-time; modal users see current state on open and after each action
- Reclassify action — available inside `QueueReviewModal` once a row is opened
- Admin-specific queue filtering — both roles use the same `getQueue({ clientId })` endpoint
