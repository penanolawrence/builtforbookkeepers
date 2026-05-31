# Income Statement — Collapsible Subtype Breakdown

**Date:** 2026-05-31
**Status:** Approved

## Overview

The income statement currently shows one flat row per account (e.g. "Meals and Entertainment — ₱615.00"). This spec adds a collapsible chevron to each account row that expands to reveal a per-subtype breakdown. Rows with no subtype data render identically to today (no chevron).

Applies to both the Income and Expenses sections.

## Backend

### Data bridge

`IncomeStatementService::getData()` is extended with a second pass after the existing journal entry line aggregation:

1. From the matched `JournalEntry` records, collect all non-null `document_id`s.
2. Load `TransactionLine` records for those documents, eager-loading `subtype`.
3. Build a lookup: `account_id → [ subtype_name → subtotal ]`.
4. For each account row, compute subtype buckets and an "Others" catch-all:
   - `Others total = account journal-entry total − sum of named subtypes`
   - If Others total > 0, append `{ name: "Others", total: ... }` at the end of the array.
5. "Others" sorts last; named subtypes sort by total descending.

The **authoritative account total** remains the journal entry sum — this ensures adjusting entries (which have no `document_id` and therefore no `TransactionLine`) are captured in "Others" automatically.

### Response shape

`ReportLine` gains a `subtypes` field:

```json
{
  "accountCode": "6001",
  "accountName": "Meals and Entertainment",
  "total": 615.00,
  "subtypes": [
    { "name": "Lunch",  "total": 400.00 },
    { "name": "Coffee", "total": 150.00 },
    { "name": "Others", "total":  65.00 }
  ]
}
```

`subtypes` is always an array (empty `[]` for accounts with no backing TransactionLines). An empty array signals the frontend to suppress the chevron.

## Frontend

### Types (`report.ts`)

Add `subtypes` to `ReportLine`:

```ts
export interface SubtypeLine {
  name: string
  total: number
}

export interface ReportLine {
  accountCode: string
  accountName: string
  total: number
  subtypes: SubtypeLine[]
}
```

### `IncomeStatementTable.tsx`

- Per-row expanded state: `Record<string, boolean>` keyed by `accountCode`, initialised empty.
- Rows with `subtypes.length === 0` render no chevron (visually identical to current).
- Rows with `subtypes.length > 0` render a chevron (Lucide `ChevronRight`) left of the account name; chevron rotates 90° on expand via CSS `transition-transform`.
- Clicking the row (or chevron) toggles that account's expanded state.
- When expanded, sub-rows render immediately below the account row:
  - Indented `pl-8`, prefixed with `—`, lighter text (`text-gray-500`)
  - Amount column right-aligned, tabular-nums
  - "Others" always last (guaranteed by backend ordering)
- Total rows (Total Income / Total Expenses / Net Income) are unchanged — no toggle.

```
▶ Meals and Entertainment          ₱615.00
  — Lunch                          ₱400.00
  — Coffee                         ₱150.00
  — Others                          ₱65.00
▶ Rent                             ₱5,000.00
```

## Edge Cases

| Scenario | Behaviour |
|---|---|
| Account has only adjusting entries | `subtypes = []`, no chevron |
| All transaction lines have subtypes | "Others" = 0, excluded from array |
| No transaction lines have subtypes | Single "Others" = full account total |
| Date range changes | Expanded rows collapse (component remounts on new query key) |

## Testing

`IncomeStatementService` unit test covers three cases:
1. Account with only adjusting entry lines → `subtypes = []`
2. Account where all lines have subtypes → no "Others" bucket
3. Account with mixed (some subtypes, some not / adjusting) → "Others" bucket present with correct amount
