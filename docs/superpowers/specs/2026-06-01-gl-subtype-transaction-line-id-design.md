# GL Subtype — Fix Ambiguous Account Lookup via `transaction_line_id`

**Date:** 2026-06-01
**Scope:** 1 migration + 4 file edits, no frontend changes

---

## Problem

`GLService` resolves the subtype for each GL row using:

```php
$txLine  = $entry->document?->transactionLines->firstWhere('account_id', $line->account_id);
$subtype = $txLine?->subtype?->name ?? $line->account->name;
```

`firstWhere('account_id', ...)` is ambiguous when a document has two transaction lines that share the same account but carry different subtypes (e.g. two Utilities expenses — Internet and Phone). Both journal entry lines would resolve to the first transaction line found, producing the wrong subtype on the second row.

This became a real risk once `JournalEntryService` was refactored to create one `JournalEntryLine` per `TransactionLine` (multi-line model), making same-account duplicates a valid data state.

---

## Solution

Add a `transaction_line_id` FK to `journal_entry_lines`. When `JournalEntryService` creates a JEL from a `TransactionLine`, it stores the reference. The GLService lookup becomes a direct relationship access — no fuzzy matching.

Cash net-offset lines and adjusting entry lines have no corresponding transaction line; they leave `transaction_line_id` as `null` and continue falling back to the account name.

---

## Migration

New file: `add_transaction_line_id_to_journal_entry_lines`

```php
Schema::table('journal_entry_lines', function (Blueprint $table) {
    $table->foreignUuid('transaction_line_id')
          ->nullable()
          ->after('account_id')
          ->references('id')->on('transaction_lines')
          ->nullOnDelete();
});
```

---

## `JournalEntryLine` model

Add `transaction_line_id` to `$fillable` and one new relationship:

```php
protected $fillable = [
    'journal_entry_id',
    'account_id',
    'transaction_line_id',
    'debit',
    'credit',
    'description',
];

public function transactionLine(): BelongsTo
{
    return $this->belongsTo(TransactionLine::class);
}
```

---

## `JournalEntryService`

When creating a JEL from a `TransactionLine`, include `transaction_line_id`:

```php
JournalEntryLine::create([
    'journal_entry_id'    => $entry->id,
    'account_id'          => $line->account_id,
    'transaction_line_id' => $line->id,
    'debit'               => $line->type === 'expense' ? $line->amount : null,
    'credit'              => $line->type === 'income'  ? $line->amount : null,
]);
```

The cash net-offset line omits `transaction_line_id` (defaults to null).

---

## `GLService`

**Eager-load** — replace the deep path with a shallow one:

```php
// before
'journalEntry.document.transactionLines.subtype'

// after
'transactionLine.subtype'
```

**Row building** — replace `firstWhere` with a direct relationship access:

```php
// before
$txLine  = $entry->document?->transactionLines->firstWhere('account_id', $line->account_id);
$subtype = $txLine?->subtype?->name ?? $line->account->name;

// after
$subtype = $line->transactionLine?->subtype?->name ?? $line->account->name;
```

---

## Tests — `GLServiceTest`

**`makeEntryWithDocument` helper** — pass `transaction_line_id` when creating the `JournalEntryLine`:

```php
$txLine = TransactionLine::factory()->create([...]);

JournalEntryLine::create([
    'journal_entry_id'    => $entry->id,
    'account_id'          => $account->id,
    'transaction_line_id' => $txLine->id,
    'debit'               => $debit ?: null,
    'credit'              => $credit ?: null,
]);
```

**`test_subtype_resolves_to_correct_line_for_multi_line_document`** — update the inline JEL creation blocks to include `transaction_line_id` pointing to the correct transaction line for each account. No assertion changes needed; the test already verifies the right subtype per account.

---

## Edge-case table

| Line source | `transaction_line_id` | Subtype shown |
|---|---|---|
| TransactionLine with subtype | Set | Subtype name |
| TransactionLine without subtype | Set | Account name (fallback) |
| Cash net-offset | null | Account name (fallback) |
| Adjusting entry line | null | Account name (fallback) |

---

## Out of Scope

- PDF export of the GL
- Backfilling `transaction_line_id` on existing rows (historical data keeps account-name fallback)
- Any other report consumers of `JournalEntryLine`
