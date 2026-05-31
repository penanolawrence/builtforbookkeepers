# GL Report Fixes & Enhancements

**Date:** 2026-05-31  
**Status:** Approved

## Overview

Three related changes to the General Ledger report:

1. Fix duplicate "Opening Balance" row
2. Add DR/CR normal balance indicator with green/red coloring on the running balance
3. Add parked documents warning banner above the table

---

## 1. Bug Fix — Duplicate Opening Balance Row

### Problem

`GLService::getData()` appends an Opening Balance entry into the `$rows` array (with the period start date). `BIRBookTable.tsx` also prepends its own Opening Balance row using the top-level `gl.openingBalance` field. The result is two Opening Balance rows rendered in the table.

### Fix

Remove the Opening Balance row from `$rows` inside `GLService::getData()`. The `openingBalance` field already exists as a separate top-level key in the response — the frontend uses that to render its own header row with no date (bold, first row, no debit/credit amounts).

No change to the frontend rendering logic or the `openingBalance` field.

---

## 2. Normal Balance Indicator

### Background

Every account has a "normal balance" — the side (debit or credit) where a healthy balance sits. Showing the running balance as just a number gives no indication of whether the account is behaving normally.

### Account Type → Normal Balance Mapping

| Account `type` | Normal balance |
|---|---|
| `cash` | Debit |
| `expense` | Debit |
| `income` | Credit |
| `vat` | Credit |

### Backend Changes (`GLService.php`)

Derive `normalBalance` from the account type and include it in the `account` object returned:

```php
$normalBalance = in_array($account->type, ['cash', 'expense']) ? 'debit' : 'credit';

return [
    'account' => [
        'code'          => $account->code,
        'name'          => $account->name,
        'normalBalance' => $normalBalance,
    ],
    'openingBalance' => (float)$openingBalance,
    'parkedCount'    => $parkedCount,
    'rows'           => $rows,
];
```

### Type Changes (`report.ts`)

```ts
export interface GLBook {
  account: { code: string; name: string; normalBalance: 'debit' | 'credit' }
  openingBalance: number
  parkedCount: number
  rows: GLRow[]
}
```

### Frontend Display (`BIRBookTable.tsx`)

**Column header:** Show "Balance" as primary label with a secondary sub-label "(DR normal)" or "(CR normal)" in muted text.

**Each running balance cell:**

- Display the **absolute value** of `row.runningBalance` formatted as currency
- Append a small badge: **DR** (when balance > 0) or **CR** (when balance ≤ 0)
- **Green** when the displayed side matches the account's `normalBalance`
- **Red** when it does not
- Zero balance shows no badge, neutral color

Example derivation:
```ts
const side = row.runningBalance > 0 ? 'debit' : row.runningBalance < 0 ? 'credit' : null
const isNormal = side === null || side === gl.account.normalBalance
// green if isNormal, red if !isNormal
```

---

## 3. Parked Documents Banner

### Purpose

Parked documents have been processed by the AI pipeline but not yet approved by an accountant. Their journal entries are not posted, so the GL totals are incomplete for any period containing parked documents.

### Backend Changes (`GLService.php`)

Count parked documents for the company whose `date` falls within the selected range:

```php
$parkedCount = \App\Models\Document::where('company_id', $co->id)
    ->where('status', 'parked')
    ->whereDate('document_date', '>=', $start->toDateString())
    ->whereDate('document_date', '<=', $end->toDateString())
    ->count();
```

Include `parkedCount` in the response (shown in section 2 above).

### Frontend Display (`BIRBookTable.tsx`)

Render an amber banner **above the table** when `gl.parkedCount > 0`, matching the amber banner style used elsewhere in the app (amber-50 background, amber-200 border):

```
⏳  3 parked documents are awaiting accountant review and are not included in these totals.
```

When `parkedCount === 0`, the banner is not rendered.

---

## Affected Files

| File | Change |
|---|---|
| `backend/app/Services/BIR/GLService.php` | Remove opening balance row from `$rows`; add `normalBalance` derivation; add `parkedCount` query |
| `frontend/src/types/report.ts` | Add `normalBalance` and `parkedCount` to `GLBook` |
| `frontend/src/components/reports/BIRBookTable.tsx` | Add parked banner; update balance cell with DR/CR badge + color; update header sub-label |

No other files are affected. The PDF export (`bir-gl.blade.php`) and the `exportPDF` controller action are out of scope.
