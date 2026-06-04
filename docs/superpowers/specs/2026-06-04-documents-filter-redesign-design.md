# Documents Filter Redesign — Design Spec

**Date:** 2026-06-04
**Status:** Approved

---

## Problem

The current `/client/documents` filter bar is a single flex row mixing status, type, date inputs, a global clear button, and an entries count. It's cramped and the global clear wipes all filters at once rather than letting users clear individual filters.

---

## Solution

Restructure the filter bar into two rows, give each select its own inline clear button, default the date range to the last 7 days, and remove the global clear button and entries count.

---

## Layout

### Row 1 — Selects (CSS grid, 2 equal columns)

```
[ All Statuses ▼  ✕ ────────50%────────] [ All Types ▼  ✕ ────────50%────────]
```

Each select has an inline ✕ icon button on its right interior. The ✕ is only visible when that select has a non-default value selected (i.e. a real filter is active). Clicking ✕ resets only that select to its default ("All Statuses" / "All Types") and removes the corresponding URL param.

### Row 2 — Date range (CSS grid, 2 equal columns)

```
[ Start Date ──────────────50%──────────] [ End Date ──────────────50%──────────]
```

On initial load (no URL params), the date inputs are pre-filled:
- `start` = today minus 6 days (ISO date string, e.g. `2026-05-29`)
- `end` = today (ISO date string, e.g. `2026-06-04`)

These defaults are computed client-side and pushed into the URL via `setParam` on mount so the query reflects them immediately.

---

## What Is Removed

| Element | Action |
|---|---|
| Global "Clear ×" text button | Removed |
| "N entries" count span | Removed |
| Date range preset select (Last 7 days / etc.) | Never added — not part of design |

---

## Behavior Details

- **Per-select clear (✕):** Conditionally rendered inside the `SelectTrigger` area. Appears only when the select value is not the "all" default. Calls `setParam(key, '')` for that key only.
- **Date defaults:** Computed once on mount using `useEffect`. If either `start` or `end` URL param is already present (user shared a link or navigated back), the defaults are not applied — existing params take precedence.
- **Manual date edits:** Work exactly as before — directly update the URL param.
- **No global clear:** Users clear status via its ✕, type via its ✕, and dates by clearing the date inputs manually.

---

## Files Touched

| File | Change |
|---|---|
| `frontend/src/app/client/documents/page.tsx` | Restructure filter bar JSX; add per-select ✕ logic; add date default on mount |

---

## Success Criteria

- Filter bar renders as two equal-column rows at all viewport widths
- Each select shows its ✕ only when a filter value is active; clicking ✕ clears only that select
- On first load with no URL params, start = today−6 and end = today are pre-filled and applied to the query
- If URL already has `start`/`end` params, defaults are not overwritten
- Entries count and global Clear button are absent
- All existing filter, query, and modal behavior is otherwise unchanged
