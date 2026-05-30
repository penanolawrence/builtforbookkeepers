# Design: Transaction Line Subtypes

**Date:** 2026-05-31  
**Status:** Approved

## Problem

The `category` field on `transaction_lines` is free-text set by the AI classifier, which just copies the account name (e.g., account "4001 — Sales Revenue" → category "Sales Revenue"). This makes category redundant with account and useless for reporting.

The goal is to replace it with a structured, user-maintained **subtype** system — giving accountants a way to add meaningful granularity below the account level (e.g., Communication Expense → Internet, Load, Telephone). Subtypes are created on first use and become reusable options going forward.

## Data Model

### New `subtypes` table

```
id           bigint PK
name         string, unique
timestamps
```

Global — not scoped to a specific account. Any subtype can be used with any transaction line.

### `transaction_lines` changes

- Drop `category` (string)
- Add `subtype_id` (nullable FK → `subtypes.id`, set null on delete)

### Migration strategy

1. Copy all distinct non-null `category` values from `transaction_lines` into `subtypes`
2. For each line, match `category` string to set `subtype_id`
3. Drop the `category` column

The `documents.category` column (used by the anomaly detector) is **not touched** — it lives on a separate table and is out of scope.

## Backend

### New `SubtypeController`

**`GET /api/subtypes?q={query}`**
- Requires `q` param of at least 3 characters
- Returns matching subtypes (`id`, `name`) using `ILIKE %query%`
- Max 20 results

No dedicated create endpoint. When saving a transaction line with a new subtype name, the backend performs a **find-or-create** on the `subtypes` table by name and resolves `subtype_id`. This keeps the API surface minimal.

### `TransactionLine` model

- Add `belongsTo(Subtype::class)` relationship
- Add `subtype_id` to `$fillable`
- Remove `category` from the model

## Frontend

### Queue Review Modal

- **"Description" label → "Notes"** — label only, no underlying field rename
- **Category field → Combobox typeahead:**
  - Below 3 characters: no API call, no dropdown shown
  - At 3+ characters: debounced `GET /api/subtypes?q={query}`, results populate as options
  - Selecting an existing match stores `subtype_id`
  - No match: user sees "Create: {value}" option — submitted as a name string, resolved to `subtype_id` server-side on save
  - Uses the existing shadcn/ui `Command` + `Popover` pattern — no new dependencies

## Out of Scope

- AI auto-assigning subtypes during classification
- Scoping subtypes per account
- Report UI changes (subtype data will be available for future breakdown reports)
