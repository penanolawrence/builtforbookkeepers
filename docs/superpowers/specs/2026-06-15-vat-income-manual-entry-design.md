# Spec: VAT Income Manual Entry — Always Assume VAT-Inclusive

**Date:** 2026-06-15
**Scope:** `backend/app/Services/AI/TransactionClassifier.php`

## Problem

When a VAT-registered client manually enters an income transaction, the AI classifier returns `vat_amount = null` because no explicit VAT signal exists on the entry (no printed VAT figure, no "VAT inclusive" note, no merchant TIN). This means the entry is recorded at gross with no Output VAT split, which is incorrect for a VAT client's income.

## Decision

For VAT-registered clients entering income via manual entry, always treat the entered amounts as VAT-inclusive. The AI must compute `vat_amount = total_amount × 12/112` and create a separate Output VAT line (account 2101).

This does not apply to:
- Non-VAT clients
- Expense manual entries
- Image or OCR document paths

## Design

### Single file changed: `TransactionClassifier.php`

**In `classify()`**, compute a `$vatIncome` flag before dispatching to the manual prompt builder:

```php
$vatIncome = $company->bir_type === 'vat' && $declaredType === 'income';
$messages  = [['role' => 'user', 'content' => $this->buildManualPrompt($inputData, $userNote, $vatIncome)]];
```

**In `buildManualPrompt()`**, add a `bool $vatIncome = false` parameter. When `true`, append this instruction to the prompt:

```
VAT income rule: This client is VAT-registered and this is an income entry.
Always treat the entered amounts as VAT-inclusive.
Compute vat_amount = total_amount × 12/112.
Create a separate Output VAT line assigned to account 2101.
```

The existing system prompt already enforces: separate 2101 line, net amounts for other lines, `sum(lines[].amount) === total_amount`. This new instruction only forces `vat_amount` to be computed rather than returning null.

## Example

Client enters income: ₱100.00

- `total_amount`: 100.00
- `vat_amount`: 10.71 (100 × 12/112)
- Income line: ₱89.29 (100 ÷ 1.12), account from COA
- Output VAT line: ₱10.71, account 2101

## Out of Scope

- No frontend changes
- No UI indication that VAT is being applied
- No change to expense manual entries
- No change to non-VAT clients
