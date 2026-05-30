---
title: Queue Review Modal UI Fixes
date: 2026-05-31
status: approved
---

# Queue Review Modal UI Fixes

## Overview

Three focused UI fixes to the queue document review modal (`QueueReviewModal.tsx`):

1. Account dropdown type filtering
2. Transaction lines column headers
3. Modal width increase

## Changes

### 1. Account Type Filtering

**Problem:** The income line account dropdown currently shows all accounts (income, expense, cash, vat). The expense line dropdown has the same issue.

**Fix:** Filter the `accounts` array before passing it to each `LineRow`:
- Income lines receive `accounts.filter(a => a.type === 'income')`
- Expense lines receive `accounts.filter(a => a.type === 'expense')`

No changes needed to `AccountSelect`, the API call, or the backend. The `Account` type already carries a `type` field (`'income' | 'expense' | 'cash' | 'vat'`).

### 2. Transaction Lines Column Headers

**Problem:** The transaction line rows (account, category, amount, date, description) have no column headers, making the table hard to read.

**Fix:** Add a header row directly above the `LineRow` list in **both** the income section and the expense section. Column widths must match the corresponding `LineRow` inputs:

| Header | Width |
|--------|-------|
| Account | `w-44` |
| Category | `w-20` |
| Amount | `w-20` |
| Date | `w-32` |
| Description | `flex-1` |
| *(spacer for remove button)* | `w-6` |

Headers use `text-[10px] font-semibold text-gray-400 uppercase` to match the existing section label style.

### 3. Modal Width

**Problem:** The modal at `sm:max-w-5xl` (1024px) causes horizontal scrolling on the transaction lines section.

**Fix:** Change `sm:max-w-5xl` → `sm:max-w-7xl` on the `DialogContent` in `QueueReviewModal.tsx`.

## Scope

All three changes are confined to a single file:
- `frontend/src/components/queue/QueueReviewModal.tsx`

No backend changes, no API changes, no new components.
