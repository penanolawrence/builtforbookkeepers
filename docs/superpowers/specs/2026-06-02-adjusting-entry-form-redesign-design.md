# Adjusting Entry Form Redesign — Design Spec

**Date:** 2026-06-02
**Status:** Approved

## Problem

The adjusting entry form uses heavy shadcn components (`Input`, `Label`, `Textarea`, `Select`, `Button`) that are visually inconsistent with the lean raw-input style adopted in the queue review modal and adjusting entries list page. Additionally, `adjusting_entry_lines` has no `subtype_id` column, and the existing `description` column is never saved or returned by the controller — both fields are missing from the form entirely.

## Solution

Full redesign of `EntryForm` and `EntryLineRow` using lean raw inputs matching the queue review modal style, plus:
- Backend: migration to add `subtype_id` to `adjusting_entry_lines`, controller wiring for `subtype` and `description`, description pass-through to `journal_entry_lines` when posting.
- Frontend: `SubtypeCombobox` + description input on each line row, raw input redesign throughout the form.

All changes are contained to the adjusting entries feature (backend controller, model, migration, JournalEntryService) and two frontend component files plus their supporting types and API module.

---

## Section 1 — Backend

### Migration

**File:** `backend/database/migrations/2026_06_02_000001_add_subtype_id_to_adjusting_entry_lines.php`

Add `subtype_id` as a nullable UUID foreign key to `subtypes` with `nullOnDelete`. Placed after the `account_id` column.

```php
$table->foreignUuid('subtype_id')
      ->nullable()
      ->after('account_id')
      ->references('id')->on('subtypes')
      ->nullOnDelete();
```

### `AdjustingEntryLine` model

**File:** `backend/app/Models/AdjustingEntryLine.php`

- Add `subtype_id` to `$fillable`
- Add relationship:

```php
public function subtype(): BelongsTo
{
    return $this->belongsTo(Subtype::class);
}
```

### `AdjustingEntryController`

**File:** `backend/app/Http/Controllers/AdjustingEntryController.php`

**`create()`** — update the `AdjustingEntryLine::create()` call inside the loop to also save `subtype_id` and `description`:

```php
AdjustingEntryLine::create([
    'adjusting_entry_id' => $entry->id,
    'account_id'         => $line['accountId'],
    'subtype_id'         => $line['subtypeId'] ?? null,
    'debit'              => $line['debit'] ?? null,
    'credit'             => $line['credit'] ?? null,
    'description'        => $line['description'] ?? null,
]);
```

**`update()`** — same fields in the `AdjustingEntryLine::create()` inside the lines loop.

**`show()` / `toDetail()`** — add eager-loading of `lines.subtype` and extend the line map:

```php
$entry = AdjustingEntry::with(['company', 'lines.account', 'lines.subtype', 'creator', 'approver', 'rejecter'])->findOrFail($id);
```

```php
'lines' => $e->lines->map(fn ($l) => [
    'accountId'   => $l->account_id,
    'accountCode' => $l->account?->code,
    'accountName' => $l->account?->name,
    'subtypeId'   => $l->subtype_id,
    'subtypeName' => $l->subtype?->name,
    'debit'       => $l->debit,
    'credit'      => $l->credit,
    'description' => $l->description,
]),
```

### `JournalEntryService::postFromAdjustingEntry()`

**File:** `backend/app/Services/Accounting/JournalEntryService.php`

When creating each `JournalEntryLine` from an `AdjustingEntryLine`, copy `description`:

```php
JournalEntryLine::create([
    'journal_entry_id' => $journalEntry->id,
    'account_id'       => $line->account_id,
    'debit'            => $line->debit ?: null,
    'credit'           => $line->credit ?: null,
    'description'      => $line->description ?? null,
]);
```

This allows the GJ report to resolve per-line descriptions for adjusting entries via the `journal_entry_lines.description` fallback already implemented.

---

## Section 2 — Frontend Types + API

### `types/adjusting-entry.ts`

Add three fields to `EntryLine`:

```typescript
subtypeId: string | null
subtypeName: string | null
description: string | null
```

### `lib/api/adjusting-entries.ts`

Update the `createEntry` line type:

```typescript
lines: {
  accountId: string
  subtypeId: string | null
  debit: number | null
  credit: number | null
  description: string | null
}[]
```

The `updateEntry` function uses `Partial<AdjustingEntry>` — the type update covers it automatically.

---

## Section 3 — EntryLineRow Redesign

**File:** `frontend/src/components/adjusting-entries/EntryLineRow.tsx`

Drop all shadcn imports. Render a flex row (`flex gap-1.5 items-center`) with:

| Element | Details |
|---|---|
| `AccountSelect` | Local searchable component — same implementation as `QueueReviewModal`. Extract to `components/adjusting-entries/AccountSelect.tsx`. Filters accounts by code or name. `w-44 shrink-0`. |
| `SubtypeCombobox` | Imported from `components/queue/SubtypeCombobox.tsx`, no changes. `w-24`. |
| Dr/Cr toggles | Raw `<button>` elements. Active: `bg-indigo-600 text-white rounded px-2 py-1 text-xs font-semibold`. Inactive: `border border-gray-200 text-gray-500 rounded px-2 py-1 text-xs`. |
| Amount | `<input type="number">` — `w-20 border border-gray-200 rounded px-2 py-1 text-xs`. |
| Description | `<input type="text">` — `flex-1 border border-gray-200 rounded px-2 py-1 text-xs`, placeholder `"Description…"`. |
| Remove | Raw `<button>` — `text-gray-300 hover:text-red-500 transition-colors text-sm px-1 shrink-0`. |

The `react-hook-form` `Controller` wrappers are kept — only the rendered JSX changes. The `control` and `remove` prop interface stays the same; add `accounts` handling through `AccountSelect`.

**`AccountSelect` component** (`components/adjusting-entries/AccountSelect.tsx`):

Identical to the one inside `QueueReviewModal` — text input that shows `code — name` when closed, opens a filtered dropdown list on focus, calls `onChange(accountId)` on selection. Style: `border border-gray-200 rounded px-2 py-1 text-xs`.

---

## Section 4 — EntryForm Redesign

**File:** `frontend/src/components/adjusting-entries/EntryForm.tsx`

Drop all shadcn imports (`Input`, `Label`, `Textarea`, `Select`, `Button`). The `useForm`/`useFieldArray` logic is unchanged.

### Zod schema update

`lineSchema` gains:

```typescript
subtypeId:   z.string().nullable().default(null),
subtypeName: z.string().nullable().default(null),
description: z.string().nullable().default(null),
```

Default values for new lines: `{ accountId: '', debit: null, credit: null, subtypeId: null, subtypeName: null, description: null }`.

When `initialData` is provided, map `subtypeId`, `subtypeName`, `description` from each line.

### Layout

Two `bg-white border border-gray-200 rounded-lg p-4` cards stacked vertically:

**Card 1 — Entry details:**

```
[text-[10px] font-bold uppercase tracking-wide text-gray-500]  "Entry Details"

Client    [raw <select> or disabled <input>]
Date      [<input type="date">]
Memo      [<textarea rows={3}>]
Type      [<select>: Reclassification | Reversal | Other]
```

Field layout: two-column grid (`grid-cols-2 gap-x-4 gap-y-3`) with Memo spanning full width (`col-span-2`).

Field label style: `<label className="text-xs text-gray-500 font-medium mb-0.5 block">`

Input style (header fields): `w-full border border-gray-200 rounded px-2 py-1.5 text-sm`

Disabled client input: add `bg-gray-50 text-gray-500`.

**Card 2 — Journal Lines:**

```
[text-[10px] font-bold uppercase tracking-wide text-gray-500]  "Journal Lines"

[column headers row — text-[10px] text-gray-400 font-semibold uppercase tracking-wide]
  Account · Subtype · Dr/Cr · Amount · Description

[EntryLineRow × N]

[+ Add Line — text-xs text-indigo-600 font-semibold hover:text-indigo-800]
```

Column headers are a non-interactive row that visually aligns with the line rows below.

### Action buttons

Below both cards, not inside them:

```
[Save as Draft]       [Submit to Admin]       [Approve Immediately — admin only]
```

| Button | Classes |
|---|---|
| Save as Draft | `border border-gray-200 text-gray-700 text-xs font-semibold px-4 py-2 rounded-md hover:bg-gray-50 transition-colors` |
| Submit to Admin | `bg-indigo-600 text-white text-xs font-semibold px-4 py-2 rounded-md hover:bg-indigo-700 transition-colors` |
| Approve Immediately | `bg-green-600 text-white text-xs font-semibold px-4 py-2 rounded-md hover:bg-green-700 transition-colors` |

### Admin new entry page

**File:** `frontend/src/app/admin/adjusting-entries/new/page.tsx`

Replace the shadcn `Select` for client with a raw `<select>` inside a small card:

```
bg-white border border-gray-200 rounded-lg p-4 mb-4
  [label "Client"]
  [<select> with border-gray-200 rounded px-2 py-1.5 text-sm]
```

The `EntryForm` is rendered below once a client is selected (unchanged logic).

### Accountant new entry page

**File:** `frontend/src/app/accountant/adjusting-entries/new/page.tsx`

Add a back link above the heading:

```tsx
<Link href="/accountant/adjusting-entries" className="text-xs text-indigo-600 hover:text-indigo-800 font-medium flex items-center gap-1 mb-2">
  ← Back to Adjusting Entries
</Link>
```

No other changes needed — `EntryForm` redesign handles the rest.

---

## Files Changed

| File | Change |
|---|---|
| `backend/database/migrations/2026_06_02_000001_add_subtype_id_to_adjusting_entry_lines.php` | **Create** |
| `backend/app/Models/AdjustingEntryLine.php` | **Update** — `subtype_id` in `$fillable`, `subtype()` relationship |
| `backend/app/Http/Controllers/AdjustingEntryController.php` | **Update** — save/return `subtypeId`, `description`; eager-load `lines.subtype` |
| `backend/app/Services/Accounting/JournalEntryService.php` | **Update** — copy `description` from AEL to JEL in `postFromAdjustingEntry` |
| `frontend/src/types/adjusting-entry.ts` | **Update** — add `subtypeId`, `subtypeName`, `description` to `EntryLine` |
| `frontend/src/lib/api/adjusting-entries.ts` | **Update** — extend `createEntry` line type |
| `frontend/src/components/adjusting-entries/AccountSelect.tsx` | **Create** — searchable account dropdown |
| `frontend/src/components/adjusting-entries/EntryLineRow.tsx` | **Rewrite** — lean raw inputs + SubtypeCombobox + description |
| `frontend/src/components/adjusting-entries/EntryForm.tsx` | **Rewrite** — lean raw inputs, two-card layout, updated schema |
| `frontend/src/app/accountant/adjusting-entries/new/page.tsx` | **Update** — back link |
| `frontend/src/app/admin/adjusting-entries/new/page.tsx` | **Update** — raw client selector card |

## Out of Scope

- Adjusting entry detail (`[id]`) page visual redesign — `EntryForm` is used there for draft edits and will benefit from the component rewrite, but the surrounding page layout (approve/reject actions, status banners, `LinesTable`) is unchanged.
- Subtype flowing through to GJ report for adjusting entries — `journal_entry_lines` has no `subtype_id` column; this would require a separate migration and BIR book query changes.
- Accountant `[id]` detail page — no adjusting entry detail view exists for accountants yet.
- `BalanceIndicator` — no changes needed.
