# Client Dashboard Redesign

**Date:** 2026-06-04
**Scope:** Apply the `design_handoff_client_dashboard` visual design to the real Next.js client dashboard.

---

## Problem

The current `src/app/client/dashboard/page.tsx` uses a minimal, narrow (`max-w-4xl`) layout with basic cards and a simple table. The design handoff defines a richer layout — mascot companion card, tier-colored stat cards, a detailed documents table with status chips and parked row accents, and an aligned activity feed + upload button sidebar.

---

## Changes

### 1. `src/app/client/layout.tsx`

Change the content wrapper from `max-w-[1100px]` to `max-w-[1280px]` to accommodate the wider dashboard layout. No other changes.

### 2. `src/app/client/dashboard/page.tsx`

Full visual rewrite. All existing data-fetching logic is preserved (`useQuery`, `useAuth`, `useTheme`, derived values). Only the JSX output changes.

#### Layout structure (top to bottom)

```
Greeting row (flex, align-items: center, gap: 24px)
  Left (flex: 1)  — h1 greeting + subtitle (date · doc count · parked count)
  Right (430px)   — MascotCompanion with parked-count-aware brief

Stat cards (flex, gap: 16px)
  Total Documents  — no tier color, value in t-ink
  Returned         — review tier dot (terracotta), value in t-tier-review-fg
  Income (month)   — ready tier dot (green), value in t-tier-ready-fg
  Expenses (month) — check tier dot (amber), value in t-tier-check-fg

Bottom grid (1fr 320px, align-items: stretch, gap: 16px)
  Left — Recent Documents card
    Card header: receipt icon + "Recent Documents" title + "View all →" link
    Column headers: File / Date / Status (grid 1fr 100px 120px)
    Rows (last 7 docs, sorted by createdAt desc):
      - Alternating row background (transparent / t-card-alt)
      - PARKED rows: amber left-accent (inset 3px 0 0 var(--t-tier-check-fg))
      - StatusChip per row (inline-flex pill using tier CSS vars)
  Right — Sidebar (flex column, height: 100%)
    Recent Activity card (flex: 1)
      5 activity items derived from activityFromDoc()
      Dot colored by type: posted=ready-fg, returned=review-fg
    Upload button (full width, primary gradient, links to /client/upload)
```

#### StatusChip

Inline helper function within the page file. Maps `DocumentStatus` → tier CSS var set:

```
PARKED     → check  tier (amber)
APPROVED   → ready  tier (green)
RETURNED   → review tier (terracotta)
PROCESSING → pending tier (purple)
REJECTED   → review tier (terracotta)
CANCELLED  → pending tier (purple)
```

Renders as a pill: `inline-flex; padding: 4px 13px; border-radius: 999px; font-size: 12.5px; font-weight: 700` using `var(--t-tier-{key}-fg/bg/ring)`.

#### MascotCompanion brief

Pass a computed `brief` prop based on the parked count:
- Sofia theme: `"{n} documents are parked — your bookkeeper is on it!"`
- Yoda theme: `"{n} docs queued up. Yoda's watching over them."`
- If 0 parked (Sofia): `"All caught up — your bookkeeper has everything in hand!"`
- If 0 parked (Yoda): `"All clear. Yoda approves."`

#### Stat card month label

The Income/Expenses cards show the current month name (e.g. "Income (May)") derived from `new Date()` — same as the existing logic, just surfaced in the label.

#### Data slice sizes

- Recent Documents: last **7** docs sorted by `createdAt` descending (up from 5 in the old design, matching the handoff sample data)
- Activity feed: last **5** items from `activityFromDoc()` (down from 6 in old design, matching handoff)

---

## What Does NOT Change

- `Topbar` component — CLIENT_LINKS and nav badge logic untouched
- All API calls: `getDocuments()` query, all derived values (`returnedDocs`, `thisMonthDocs`, `approvedIncome`, `approvedExpenses`)
- Auth and theme hooks
- The `MascotCompanion` component itself — only the `brief` prop is new
- Any other client pages (upload, documents, reports, etc.)

---

## Files Touched

| File | Change |
|---|---|
| `src/app/client/layout.tsx` | `max-w-[1100px]` → `max-w-[1280px]` |
| `src/app/client/dashboard/page.tsx` | Full JSX rewrite (logic preserved) |
