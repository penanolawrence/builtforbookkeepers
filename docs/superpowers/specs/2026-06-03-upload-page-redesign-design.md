# Upload Page Redesign — Design Spec

**Date:** 2026-06-03
**Status:** Approved

---

## Problem

The Upload Documents page (`/client/upload`) uses hardcoded Tailwind colors (`bg-green-*`, `bg-red-*`, `bg-white`, `border-indigo-*`) that don't respond to the global Sofia/Yoda theme system. The `DocumentsTable` component also uses hardcoded `bg-white`, `bg-gray-*`, and `text-gray-*` classes. The page has no `max-width` constraint — it stretches to fill the full viewport.

---

## Solution

Restyle the upload page and its components to match the design language established by the dashboard and login redesigns. All hardcoded colors migrate to `t-*` tokens. Zone cards adopt the neutral card design with icon chips for income/expense identity. The "Enter manually" button becomes a full-width primary gradient CTA. The "In Progress" section card gets restyled with `t-*` tokens. The page root gets `max-w-[1100px]` to match other client pages.

Green/red on the income/expense zone icon chips and the inflow/outflow currency values are **intentionally kept** as semantic colors — they are not theme-surface colors and should not be migrated.

---

## Files Changed

| File | Change |
|---|---|
| `frontend/src/app/client/upload/page.tsx` | Add `max-w-[1100px]` to outer wrapper |
| `frontend/src/components/upload/UploadZone.tsx` | Full restyle — new card structure using `t-*` tokens |
| `frontend/src/components/upload/TwoAreaUpload.tsx` | Restyle "Enter manually" button to primary gradient |
| `frontend/src/components/documents/DocumentsTable.tsx` | Migrate all hardcoded colors to `t-*` tokens; restyle to match card design system |

---

## Section 1 — Page Container

`frontend/src/app/client/upload/page.tsx`

The outer `<div>` changes from `className="space-y-5"` to `className="max-w-[1100px] space-y-5"`. No other changes to this file.

---

## Section 2 — UploadZone

`frontend/src/components/upload/UploadZone.tsx`

The `ZONE_CONFIG` map is replaced. Income and expense zones now differ only in their icon chip color and count badge color — all structural classes are shared.

**Outer card wrapper:**
```
rounded-[18px] overflow-hidden border border-t-line bg-t-card
```
Shadow applied via inline style: `boxShadow: 'var(--t-shadow)'`.

**Card header** (`flex items-center justify-between px-4 py-3.5 border-b border-t-line`):

Left side — flex row with `gap-2.5`:
- **Icon chip** (32×32, `border-radius: 9px`, `display: flex`, `align-items: center`, `justify-content: center`, `font-size: 15px`, `fontWeight: 800`):
  - Income: `background: #DCFCE7; color: #15803D` (semantic green — intentional, not migrated)
  - Expense: `background: #FEE2E2; color: #B91C1C` (semantic red — intentional, not migrated)
  - Arrow text: `↑` for income, `↓` for expense
- **Zone label block**:
  - Name: `text-[14px] font-bold text-t-ink` with `fontFamily: 'var(--font-display)'`
  - Sub: `text-[11px] text-t-muted mt-0.5`

Right side — count badge (when `count` prop is defined):
- Income: inline style `background: #DCFCE7; color: #15803D` + `text-[10.5px] font-bold px-2.5 py-0.5 rounded-full`
- Expense: inline style `background: #FEE2E2; color: #B91C1C` + same classes

**Drop area** (`m-3 border-[1.5px] border-dashed border-t-line rounded-[11px] p-5 text-center bg-t-surface cursor-pointer`):
- On drag-over: `opacity-60` (existing behaviour preserved)
- Drop title: `text-[12.5px] font-bold text-t-ink mb-1`
- Description: `text-[11px] text-t-muted mb-3`
- Buttons (`bg-t-card border border-t-line text-t-ink`, same for both zones):
  ```
  text-[11px] font-semibold px-3 py-1.5 rounded-[8px] bg-t-card border border-t-line text-t-ink
  hover:bg-t-surface transition-colors
  ```

**Formats hint:** `text-[10px] text-t-faint text-center mx-3 mb-3`

**Error message:** `text-[11px] text-red-600 mx-3 mb-3` (semantic red — intentional)

---

## Section 3 — TwoAreaUpload (Enter Manually Button)

`frontend/src/components/upload/TwoAreaUpload.tsx`

The "Enter manually" button replaces all hardcoded `bg-white border-indigo-*` classes with a full-width primary gradient CTA matching the dashboard's "Go to Queue" treatment:

```tsx
<button
  type="button"
  onClick={() => setManualOpen(true)}
  className="w-full py-3 rounded-[13px] text-[13.5px] font-bold text-white flex items-center justify-center gap-2"
  style={{
    background: 'linear-gradient(150deg, var(--t-primary), var(--t-primary-deep))',
    boxShadow: '0 10px 22px -12px var(--t-primary-deep)',
  }}
>
  No physical receipt? Enter manually →
</button>
```

---

## Section 4 — DocumentsTable

`frontend/src/components/documents/DocumentsTable.tsx`

**Structural changes:**
- Outer wrapper: `bg-white border border-gray-200 rounded-lg` → `bg-t-card border border-t-line rounded-[20px]`; shadow via inline style `boxShadow: 'var(--t-shadow)'`
- Header bar: `border-gray-100` → `border-t-line`
- Title: `text-gray-900` → `text-t-ink`
- Subtitle: `text-gray-400` → `text-t-faint`

**Table header row:**
- Row background/border: `bg-gray-50 border-gray-200` → `bg-t-surface border-t-line`
- Header text: `text-gray-500` → `text-t-muted`

**Table rows:**
- Hover: `hover:bg-gray-50` → `hover:bg-t-surface`
- Dividers: `border-gray-100` → `border-t-line-soft`
- Reference: `text-gray-900` → `text-t-ink`
- Uploaded date: `text-gray-500` → `text-t-muted`
- Inflow value: keep `text-green-600` (semantic)
- Outflow value: keep `text-red-600` (semantic)
- Dash placeholder: `text-gray-300` → `text-t-faint`

**STATUS_BADGE** — switch from Tailwind `cls` strings to inline `style` objects using `t-tier-*` vars (matching the client dashboard's `STATUS_BADGE` pattern):

```ts
const STATUS_BADGE: Record<DocumentStatus, { label: string; style: React.CSSProperties }> = {
  PROCESSING: { label: 'Processing', style: { background: 'var(--t-tier-pending-bg)', color: 'var(--t-tier-pending-fg)', border: '1px solid var(--t-tier-pending-ring)' } },
  PARKED:     { label: 'In Review',  style: { background: 'var(--t-tier-check-bg)',   color: 'var(--t-tier-check-fg)',   border: '1px solid var(--t-tier-check-ring)'   } },
  RETURNED:   { label: 'Returned',   style: { background: 'var(--t-tier-review-bg)',  color: 'var(--t-tier-review-fg)',  border: '1px solid var(--t-tier-review-ring)'  } },
  APPROVED:   { label: 'Approved',   style: { background: 'var(--t-tier-ready-bg)',   color: 'var(--t-tier-ready-fg)',   border: '1px solid var(--t-tier-ready-ring)'   } },
  REJECTED:   { label: 'Rejected',   style: { background: 'var(--t-tier-review-bg)',  color: 'var(--t-tier-review-fg)',  border: '1px solid var(--t-tier-review-ring)'  } },
  CANCELLED:  { label: 'Withdrawn',  style: { background: 'var(--t-tier-pending-bg)', color: 'var(--t-tier-pending-fg)', border: '1px solid var(--t-tier-pending-ring)' } },
}
```

Status badge cell renders with `style={label.style}` instead of `className={cls}`.

**Source chip:**
- Manual: inline style `{ background: 'var(--t-tier-pending-bg)', color: 'var(--t-tier-pending-fg)' }`
- Upload: `bg-t-surface text-t-muted`

**Note text colors:**
- `text-red-600` (returned note) — keep as semantic
- `text-gray-500` / `text-gray-400` / `text-gray-400 italic` → `text-t-muted` / `text-t-faint` / `text-t-faint italic`

---

## Out of Scope

- `ManualEntryForm` and `ConfirmUploadDialog` — not part of this redesign
- `DocumentDetailModal` — not part of this redesign
- The client `/documents` page itself — only `DocumentsTable` is restyled; the page wrapper is unchanged
- Any functional changes to upload behaviour
