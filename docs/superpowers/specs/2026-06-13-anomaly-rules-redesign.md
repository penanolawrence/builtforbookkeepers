# Anomaly Rules Redesign — Design Spec
**Date:** 2026-06-13
**Status:** Approved

---

## Overview

Now that month-end closing is live, the existing `AnomalyDetector` has gaps: Rule 1 (VAT mismatch) is unreliable due to mixed VAT/non-VAT items on a single receipt; Rule 4 (line item mismatch) is dead code; Rules 5, 6, 7 are noisy and poorly calibrated. Rule 8 (past-period date) has no awareness of whether a period is locked or open.

This redesign strips the detector down to two reliable document-level rules, upgrades the past-period check to be period-close-aware, and adds four new checks inside `PeriodClosingService` that guard the closing process itself.

**Approach B** was chosen: clean up `AnomalyDetector`, extend `PeriodClosingService` with dedicated private methods, block AJEs at the service layer.

---

## What Changes

### AnomalyDetector — rules removed

| Rule | Reason |
|---|---|
| Rule 1 — VAT mismatch | Unreliable: VAT-exempt items can appear on receipts from VAT-registered merchants |
| Rule 4 — Line item total mismatch | Dead code — `ocrResult` relation does not exist on `Document` |
| Rule 5 — Amount > 3x category average | All-time baseline is unreliable; depresses as business grows |
| Rule 6 — New vendor | Too noisy for clients with naturally high vendor diversity |
| Rule 7 — Spending spike | Logic bug: compares single document amount against monthly aggregate total |

Rule 1 was already removed prior to this spec.

### AnomalyDetector — rules retained

| New # | Old # | Rule |
|---|---|---|
| Rule 1 | Rule 2 | Duplicate OR number — same ref number, same period, same company |
| Rule 2 | Rule 3 | Same amount + merchant within 7 days |

### AnomalyDetector — Rule 8 upgraded to Rule 3

**Old behaviour:** flags any document whose `document_date` is before `Carbon::now()->startOfMonth()` as RED with reason "Transaction date is in a past period."

**New behaviour:** two tiers based on period close state:

1. Query `period_closings` for `(company_id, year, month)` derived from `document_date`.
2. If a matching `period_closings` row exists → **RED**: `"Transaction date is in a locked period — an adjusting entry is required"`
3. If no `period_closings` row but date is before current month start → **YELLOW**: `"Transaction date is in a past period"`
4. Current month or future → no flag from this rule

---

## PeriodClosingService — pre-close checks

New private method `assertPreCloseConditions(Company $company, int $year, int $month)`.

Called inside `executeClose()`, within the DB transaction, after the inner status re-check.

### Check A — Income Summary pre-existing balance

Query `JournalEntryLine` joined to `accounts` where `name = 'Income Summary'` and `company_id = $company->id`, with the parent `JournalEntry` having `entry_date` within the period and `period_closing_id IS NULL`.

Compute net balance: `sum(credit) - sum(debit)`.

If `abs(netBalance) > 0.01`, throw:
> `"Income Summary account has a pre-existing balance of {amount} — manual entries must be reversed before closing."`

### Check B — Orphaned draft journal entries (hard block)

Query `JournalEntry` where:
- `company_id = $company->id`
- `entry_date` between period start and period end
- `status IN ('draft', 'pending')`

If count > 0, throw:
> `"{count} journal {entries} in this period are still in draft and will be permanently locked. Post or delete them before closing."`

This is a hard block. Letting the close proceed with orphaned drafts silently strands irrecoverable work.

---

## PeriodClosingService — post-close assertions

New private method `assertPostCloseIntegrity(JournalEntry $je1, JournalEntry $je2, Company $company, int $year, int $month)`.

Called at the end of the DB transaction in `executeClose()`, after both closing JEs and all their lines are created.

### Check C — Closing JE balance assertion

For each of `$je1` and `$je2`:
- `totalDebit = sum of all JournalEntryLine.debit (non-null)`
- `totalCredit = sum of all JournalEntryLine.credit (non-null)`
- If `abs(totalDebit - totalCredit) > 0.01`, throw:
  > `"Closing entry {je->id} is unbalanced (Dr {totalDebit} ≠ Cr {totalCredit}) — this is a system error."`

Rolls back the entire transaction.

### Check D — Orphaned posted JEs after close

Query `JournalEntry` where:
- `company_id = $company->id`
- `entry_date` within the period
- `status = 'posted'`
- `period_closing_id IS NULL`
- `id NOT IN [$je1->id, $je2->id]`

If count > 0, throw:
> `"{count} posted journal {entries} in this period were not captured by the closing — data integrity error."`

Rolls back the entire transaction.

---

## AdjustingEntryService — closed period block

Before saving a new AJE (on create and on submission), derive `(year, month)` from `entry_date`. Query `period_closings` for `(company_id, year, month)`.

If a row exists, throw a 422:
> `"The period {Mon YYYY} is locked. Adjusting entries cannot be posted to a closed period."`

Check applies on both initial creation and on status change to `submitted` or `posted`, since an AJE could be created as draft before the period is closed and then submitted after.

---

## Files Changed

| File | Change |
|---|---|
| `app/Services/Accounting/AnomalyDetector.php` | Remove Rules 4–7, upgrade Rule 8 → period-close-aware Rule 3 |
| `app/Services/Accounting/PeriodClosingService.php` | Add `assertPreCloseConditions()` and `assertPostCloseIntegrity()`, call from `executeClose()` |
| `app/Services/Accounting/AdjustingEntryService.php` | Add closed-period guard on AJE create/submit |

---

## Out of Scope

- Removing or reopening closed periods
- Surfacing orphaned draft JEs in the UI outside of the close flow
- Admin audit sweep for Check D (query run at close time only, not on demand)
- Recalibrating Rule 2 thresholds (7-day window, ₱1 tolerance)
