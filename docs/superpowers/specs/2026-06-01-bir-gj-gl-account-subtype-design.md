# BIR GJ & GL — Add Account Name and Subtype Columns

**Date:** 2026-06-01
**Status:** Approved

## Summary

Add `Account Name` and `Subtype` columns to both the General Journal (GJ) and General Ledger (GL) BIR book tables. Subtype is blank when no subtype is assigned. The two columns are positioned immediately after Date, before Description.

**Final column order:**
- GJ: Date | Account Name | Subtype | Description | Ref | Debit | Credit
- GL: Date | Account Name | Subtype | Description | Ref | Debit | Credit | Balance

## Changes

### Backend

**`GJService.php`**
- Add `lines.transactionLine.subtype` to the eager load (currently only `lines.account` is loaded).
- Add `'subtype' => $line->transactionLine?->subtype?->name` (null if no subtype) to the row array alongside the existing `accountName` field.

**`GLService.php`**
- Line 55: Remove the `?? $line->account->name` fallback so subtype is `null` when no subtype exists.
- Add `'accountName' => $line->account->name` to each row array.

### Frontend Types

**`frontend/src/types/report.ts`**
- Add `accountName: string` to the `GLRow` interface.
- `BIRRow` is a generic index type (`[key: string]: string | number | null`) — no change needed; the new `accountName` and `subtype` fields are compatible.

### Frontend Component

**`frontend/src/components/reports/BIRBookTable.tsx`**

**GL section:**
- Replace the single `Account` `<TableHead>` with two: `Account Name` and `Subtype`.
- Replace the single `<TableCell>{row.subtype ?? ''}</TableCell>` with two cells: `{row.accountName}` and `{row.subtype ?? ''}`.
- Update the `openingRow` constant to include `accountName: ''`.

**GJ section:**
- Add two `<TableHead>` entries — `Account Name` and `Subtype` — between `Date` and `Description`.
- Add two `<TableCell>` entries rendering `row.accountName ?? ''` and `row.subtype ?? ''` in the matching positions.

## Constraints

- Subtype is always blank (not the account name) when no subtype is linked — no fallback.
- No changes to CRB, CDB, or any other BIR book.
- No changes to the existing color-coding or balance logic in the GL table.
