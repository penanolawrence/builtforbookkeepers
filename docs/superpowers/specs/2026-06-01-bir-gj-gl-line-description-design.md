# BIR GJ & GL Line-Level Description

**Date:** 2026-06-01
**Status:** Approved

## Problem

The description column in both the General Journal (GJ) and General Ledger (GL) BIR books currently shows `journal_entries.description` — the entry-level description shared across all lines of a transaction. This loses the per-line context captured in `transaction_lines.description` (OCR/upload line item text) and `journal_entry_lines.description`.

## Solution

Apply a three-level fallback when resolving the description per row in both GJService and GLService:

1. `transaction_lines.description` — most specific; the OCR-sourced or manually entered line item description
2. `journal_entry_lines.description` — line-level description on the JEL itself
3. `journal_entries.description` — entry-level fallback (current behavior)

## Changes

**Files changed:** `backend/app/Services/BIR/GJService.php` and `backend/app/Services/BIR/GLService.php` only.

No frontend changes. No query changes — both services already eager-load `transactionLine`.

### GJService.php

```diff
- 'description' => $entry->description,
+ 'description' => $line->transactionLine?->description ?? $line->description ?? $entry->description,
```

### GLService.php

```diff
- 'description' => $entry->description,
+ 'description' => $line->transactionLine?->description ?? $line->description ?? $entry->description,
```

## Out of scope

- No changes to CRB or CDB (no description column).
- No frontend changes.
- No eager-loading changes (both services already load `transactionLine`).
- No changes to other BIR services or report components.
