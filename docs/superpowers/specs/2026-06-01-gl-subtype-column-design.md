# GL Report — Subtype Column

**Date:** 2026-06-01  
**Scope:** 3 files, no schema changes

---

## Problem

The GL report currently shows Date, Description, Ref, Debit, Credit, and Balance. There is no indication of what kind of expense or income each line represents. The subtype (e.g., "Internet Expense", "Telephone") already exists on `transaction_lines` but is not surfaced in the GL view.

---

## Solution

Add a **Subtype** column after Date. For each row, the value is:

- The subtype name from the matching `transaction_line` (matched by `document_id + account_id`) if one exists
- Otherwise the account name (e.g., "Cash on Hand", "GCash") as a fallback
- Blank for the Opening Balance row

No migration is required. Subtype is resolved at query time by eager-loading the document's transaction lines.

---

## Backend — `GLService.php`

### Eager load change

```php
$lines = JournalEntryLine::with([
    'journalEntry.document.transactionLines.subtype',
    'journalEntry.adjustingEntry',
    'account',
])
```

### Row building

```php
$txLine = $entry->document?->transactionLines->firstWhere('account_id', $line->account_id);
$subtype = $txLine?->subtype?->name ?? $line->account->name;

$rows[] = [
    'date'           => $entry->entry_date?->toDateString(),
    'subtype'        => $subtype,
    'description'    => $entry->description,
    'ref'            => $ref,
    'debit'          => $debit,
    'credit'         => $credit,
    'runningBalance' => $runningBalance,
];
```

**Edge cases:**

| Line source | Has transaction_line match? | Has subtype? | Displayed value |
|---|---|---|---|
| Document expense/income line | Yes | Yes | Subtype name |
| Document expense/income line | Yes | No | Account name |
| Cash account line (generated) | No | — | Account name (via fallback) |
| Adjusting entry line | No | — | Account name (via fallback) |
| Opening Balance (synthetic) | — | — | Blank |

---

## Frontend

### `types/report.ts`

Add `subtype` to `GLRow`:

```ts
export interface GLRow {
  date: string
  subtype: string | null
  description: string
  ref: string | null
  debit: number | null
  credit: number | null
  runningBalance: number
}
```

### `components/reports/BIRBookTable.tsx`

**Synthetic opening row** — add `subtype: null`:

```ts
const openingRow: GLRow = {
  date: '',
  subtype: null,
  description: 'Opening Balance',
  ref: null,
  debit: null,
  credit: null,
  runningBalance: gl.openingBalance,
}
```

**Table header** — add after `<TableHead>Date</TableHead>`:

```tsx
<TableHead>Subtype</TableHead>
```

**Table body** — add after the date cell:

```tsx
<TableCell>{row.subtype ?? ''}</TableCell>
```

---

## Out of Scope

- PDF export of the GL (separate concern)
- GL on the accountant-side reports view
- Filtering or grouping the GL by subtype
