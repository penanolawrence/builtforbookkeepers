# Queue Review Modal — Receipt Lightbox & Type-Filtered Lines

**Date:** 2026-06-07
**File:** `frontend/src/components/queue/QueueReviewModal.tsx`

---

## Summary

Two targeted enhancements to the existing `QueueReviewModal`:

1. **Receipt image hover overlay + lightbox** — hovering the receipt reveals an eye icon; clicking opens a full-screen lightbox.
2. **Transaction lines filtered by declared type** — only the section matching `declaredType` is rendered; the opposing type's lines are preserved in state but excluded from the approve payload.

---

## Current Layout (unchanged)

```
[HEADER]  ref · flag badge · client name · close ✕
[TOP]     receipt image (left) | document fields (right)   ← 2-col grid
[BOTTOM]  transaction lines (full width)
          anomaly reasons (full width)
[FOOTER]  Reject | Return for Re-upload | Approve
```

No structural changes to the layout.

---

## Feature 1 — Receipt Hover Overlay + Lightbox

### Trigger condition
Only applies when `!item.isNoReceipt` and `imageUrl` is non-null. The "no receipt" placeholder and loading skeleton are unchanged.

### Hover overlay
Wrap the existing `<img>` in a container div with class `receipt-viewer group`. Add a sibling `receipt-overlay` div that:
- `position: absolute; inset: 0`
- Background: `rgba(26,15,46,.42)` with `backdrop-filter: blur(3px)`
- Opacity: `0` → `1` on container hover (CSS transition, no JS)
- Centers an eye icon button (`44×44px`, rounded, semi-transparent white border)

Use Tailwind `group` + `group-hover:opacity-100` on the overlay. No JS state needed for the hover.

### Lightbox
Add one boolean state: `const [lightboxOpen, setLightboxOpen] = useState(false)`.

When `lightboxOpen` is true, render a `position: fixed; inset: 0; z-index: 400` backdrop:
- Background: `rgba(10,8,18,.82)` + `backdrop-filter: blur(8px)`
- Centered `<img>` with `max-width: min(800px, 92vw); max-height: 90vh; border-radius: 14px`
- Close button top-right (`40×40px`, semi-transparent white)
- Close on: close button click, backdrop click, `Escape` key (via `useEffect` event listener with cleanup)

The lightbox renders the same `imageUrl` already fetched — no additional API calls.

---

## Feature 2 — Transaction Lines Filtered by Declared Type

### Render rule
Replace the current "always render both Income and Expense sections" logic with:

```tsx
// Only render the section matching the current declaredType
{declaredType === 'income'  && <LineSection type="income"  ... />}
{declaredType === 'expense' && <LineSection type="expense" ... />}
```

The hidden type's lines stay in `lines` state untouched — they are not deleted. If the bookkeeper toggles the type back, those lines reappear.

### Payload rule
In `handleApprove`, filter lines before building the payload:

```ts
const linePayloads = lines
  .filter((l) => l.type === declaredType)   // ← only submit matching type
  .map((l) => ({ ... }))
```

Lines of the hidden type are silently excluded. `removedLineIds` remains unaffected (existing IDs are still sent for deletion regardless of type).

### Add line button
The "+ Add line" button only appears inside the visible section, so the bookkeeper can only add lines of the active type. No change needed — this is a natural consequence of only rendering one section.

---

## State changes

| State var | Change |
|---|---|
| `lightboxOpen: boolean` | New — controls lightbox visibility |
| `lines` | Unchanged — all lines kept in state regardless of `declaredType` |
| `removedLineIds` | Unchanged |

No new API calls, no new props on `QueueReviewModal`.

---

## Files changed

| File | Change |
|---|---|
| `frontend/src/components/queue/QueueReviewModal.tsx` | Receipt overlay + lightbox + conditional line sections + payload filter |

No other files touched.
