# GJ Book — Inline Subtotals Design

**Date:** 2026-06-02
**Status:** Approved

## Problem

The GJ book currently separates groups visually using only a thick top border (`border-t-2`) between the first row of each ref group. Summary figures (total debits, total credits, total refs) are shown in a floating bar above the table rather than inline. There are no per-group subtotal rows.

This makes it harder to quickly read the totals for each journal entry group and compare across groups.

## Solution

Replace the floating summary bar and thick-border group separators with:

1. **Inline subtotal rows** — appear after each ref group, showing entry count, ref, and group debit/credit totals
2. **Grand total row** — appears after the last subtotal row, showing overall entry count, ref count, and total debits/credits

All logic is frontend-only. No backend or API changes.

## Data Transform

Before rendering, `birData.rows` is transformed into a flat `GJEntry[]` via a local helper function `buildGJEntries`. Three tagged entry kinds:

```typescript
type GJEntry =
  | { kind: 'row';      row: BIRRow; groupIndex: number }
  | { kind: 'subtotal'; ref: string | null; count: number; debit: number; credit: number }
  | { kind: 'total';    entryCount: number; refCount: number; debit: number; credit: number }
```

`buildGJEntries` iterates `birData.rows` in order:
- Accumulates rows into groups keyed by `ref`
- After the last row in each group, pushes a `subtotal` entry
- After all groups are emitted, pushes one `total` entry

## Render Loop

A single `entries.map()` switches on `kind`:

### `'row'`
Standard `<TableRow>` with no top border. `groupIndex` drives alternating background (`even:bg-muted/20` or similar) if desired, but no border separators.

### `'subtotal'`
`<TableRow className="bg-muted/40">` with muted/small-caps styling:

| Col | Content |
|---|---|
| Date | empty |
| Account Name | `SUBTOTAL (N entries)` — muted text, uppercase/small |
| Description | empty |
| Ref | ref value |
| Debit | group debit total — blue (`text-blue-600`) |
| Credit | group credit total |

### `'total'`
`<TableRow className="font-bold border-t-2 border-slate-300">`:

| Col | Content |
|---|---|
| Date | empty |
| Account Name | `Total N entries · M refs` |
| Description | empty |
| Ref | empty |
| Debit | grand total debit — blue (`text-blue-600`) |
| Credit | grand total credit |

## Removals

- The floating summary bar `<div>` above the table (the `flex items-center gap-5 border rounded-lg` block) is deleted.
- All variables derived from it are deleted: `gjTotalDebits`, `gjTotalCredits`, `gjUniqueRefs`.
- The per-row group tracking variables are deleted: `gjGroupIndex`, `gjIsFirstInGroup`, `refToGroup`, `gjGroupCount`.
- The `border-t-2 border-slate-300` class on first-in-group `<TableRow>` elements is removed (replaced by subtotal rows).

## Files Changed

| File | Change |
|---|---|
| `frontend/src/components/reports/BIRBookTable.tsx` | GJ section only — add `GJEntry` type, `buildGJEntries` helper, update render loop, remove summary bar |

## Out of Scope

- No changes to the GL, CRB, or CDB sections.
- No backend or API changes.
- No changes to `BIRRow` or any other types.
- No changes to the `BIRNoDataState`, `ExportPDFButton`, or any other components.
