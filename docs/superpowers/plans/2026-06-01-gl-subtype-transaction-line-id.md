# GL Subtype — Fix via `transaction_line_id` Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Eliminate ambiguous subtype resolution in `GLService` by linking each `JournalEntryLine` directly to its source `TransactionLine`.

**Architecture:** Add a nullable `transaction_line_id` FK to `journal_entry_lines`. `JournalEntryService` stores the reference when creating JELs from `TransactionLine`s. `GLService` replaces the fuzzy `firstWhere('account_id', ...)` lookup with a direct `$line->transactionLine?->subtype?->name` access.

**Tech Stack:** Laravel 11, PostgreSQL, PHPUnit (via `php artisan test`)

---

## File Map

| File | Action | Responsibility |
|---|---|---|
| `database/migrations/2026_06_01_000001_add_transaction_line_id_to_journal_entry_lines.php` | Create | Add nullable UUID FK column |
| `app/Models/JournalEntryLine.php` | Modify | Add `transaction_line_id` to fillable + `transactionLine()` relationship |
| `app/Services/Accounting/JournalEntryService.php` | Modify | Pass `transaction_line_id` when creating JELs from TransactionLines |
| `app/Services/BIR/GLService.php` | Modify | Replace eager-load path + subtype lookup |
| `tests/Feature/GLServiceTest.php` | Modify | Update `makeEntryWithDocument` helper + inline test + add disambiguation test |

---

## Task 1: Migration — add `transaction_line_id` to `journal_entry_lines`

**Files:**
- Create: `backend/database/migrations/2026_06_01_000001_add_transaction_line_id_to_journal_entry_lines.php`

- [ ] **Step 1: Create the migration file**

Create `backend/database/migrations/2026_06_01_000001_add_transaction_line_id_to_journal_entry_lines.php`:

```php
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('journal_entry_lines', function (Blueprint $table) {
            $table->foreignUuid('transaction_line_id')
                  ->nullable()
                  ->after('account_id')
                  ->references('id')->on('transaction_lines')
                  ->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('journal_entry_lines', function (Blueprint $table) {
            $table->dropForeign(['transaction_line_id']);
            $table->dropColumn('transaction_line_id');
        });
    }
};
```

- [ ] **Step 2: Run the migration**

```bash
cd backend && php artisan migrate
```

Expected: `Migrating: 2026_06_01_000001_add_transaction_line_id_to_journal_entry_lines` then `Migrated`.

- [ ] **Step 3: Verify existing GL tests still pass**

```bash
cd backend && php artisan test --filter GLServiceTest
```

Expected: all existing tests pass (the column is nullable so nothing breaks).

- [ ] **Step 4: Commit**

```bash
git add backend/database/migrations/2026_06_01_000001_add_transaction_line_id_to_journal_entry_lines.php
git commit -m "feat: add transaction_line_id FK to journal_entry_lines"
```

---

## Task 2: Update `JournalEntryLine` model

**Files:**
- Modify: `backend/app/Models/JournalEntryLine.php`

- [ ] **Step 1: Add `transaction_line_id` to fillable and add the relationship**

Replace the entire file content:

```php
<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class JournalEntryLine extends Model
{
    protected $fillable = [
        'journal_entry_id',
        'account_id',
        'transaction_line_id',
        'debit',
        'credit',
        'description',
    ];

    protected $casts = [
        'debit'  => 'decimal:2',
        'credit' => 'decimal:2',
    ];

    public function journalEntry(): BelongsTo
    {
        return $this->belongsTo(JournalEntry::class);
    }

    public function account(): BelongsTo
    {
        return $this->belongsTo(Account::class);
    }

    public function transactionLine(): BelongsTo
    {
        return $this->belongsTo(TransactionLine::class);
    }
}
```

- [ ] **Step 2: Run GL tests to confirm nothing broke**

```bash
cd backend && php artisan test --filter GLServiceTest
```

Expected: all existing tests pass.

- [ ] **Step 3: Commit**

```bash
git add backend/app/Models/JournalEntryLine.php
git commit -m "feat: add transactionLine relationship to JournalEntryLine"
```

---

## Task 3: Write failing tests

**Files:**
- Modify: `backend/tests/Feature/GLServiceTest.php`

- [ ] **Step 1: Update `makeEntryWithDocument` helper to set `transaction_line_id`**

The helper currently creates a `TransactionLine` and then a separate `JournalEntryLine` — but never links them. Change only the `JournalEntryLine::create` call inside `makeEntryWithDocument` (lines ~94–99):

Replace:
```php
JournalEntryLine::create([
    'journal_entry_id' => $entry->id,
    'account_id'       => $account->id,
    'debit'            => $debit ?: null,
    'credit'           => $credit ?: null,
]);
```

With (note: `TransactionLine::factory()->create(...)` already runs above this block and is assigned to `$txLine` — you need to capture the return value from that call):

First, change the `TransactionLine::factory()->create(...)` line to capture its return value:
```php
$txLine = TransactionLine::factory()->create([
    'document_id' => $document->id,
    'account_id'  => $account->id,
    'subtype_id'  => $subtype?->id,
    'type'        => $debit > 0 ? 'expense' : 'income',
    'amount'      => $debit > 0 ? $debit : $credit,
]);
```

Then use it when creating the JEL:
```php
JournalEntryLine::create([
    'journal_entry_id'    => $entry->id,
    'account_id'          => $account->id,
    'transaction_line_id' => $txLine->id,
    'debit'               => $debit ?: null,
    'credit'              => $credit ?: null,
]);
```

- [ ] **Step 2: Update inline JEL creation in `test_subtype_resolves_to_correct_line_for_multi_line_document`**

This test creates `TransactionLine`s manually. Capture their IDs and pass them when creating JELs. In the test, find the `TransactionLine::factory()->create(...)` calls and capture their return values:

```php
$txLine1 = TransactionLine::factory()->create([
    'document_id' => $document->id,
    'account_id'  => $account1->id,
    'subtype_id'  => $subtype1->id,
    'type'        => 'expense',
    'amount'      => 1000.0,
]);

$txLine2 = TransactionLine::factory()->create([
    'document_id' => $document->id,
    'account_id'  => $account2->id,
    'subtype_id'  => $subtype2->id,
    'type'        => 'income',
    'amount'      => 1000.0,
]);
```

Then update the two inline `JournalEntryLine::create` calls:

```php
JournalEntryLine::create([
    'journal_entry_id'    => $entry->id,
    'account_id'          => $account1->id,
    'transaction_line_id' => $txLine1->id,
    'debit'               => 1000.0,
    'credit'              => null,
]);

JournalEntryLine::create([
    'journal_entry_id'    => $entry->id,
    'account_id'          => $account2->id,
    'transaction_line_id' => $txLine2->id,
    'debit'               => null,
    'credit'              => 1000.0,
]);
```

- [ ] **Step 3: Add new test — same-account disambiguation**

Append this test inside the `// ── Subtype column ──` section of `GLServiceTest`:

```php
public function test_subtype_disambiguates_when_two_lines_share_same_account(): void
{
    $account  = $this->makeAccount('expense');
    $subtype1 = Subtype::factory()->create(['name' => 'Internet']);
    $subtype2 = Subtype::factory()->create(['name' => 'Phone']);

    $document = Document::factory()->create([
        'company_id'    => $this->company->id,
        'document_date' => '2026-02-01',
        'status'        => 'approved',
    ]);

    $txLine1 = TransactionLine::factory()->create([
        'document_id' => $document->id,
        'account_id'  => $account->id,
        'subtype_id'  => $subtype1->id,
        'type'        => 'expense',
        'amount'      => 500.0,
    ]);

    $txLine2 = TransactionLine::factory()->create([
        'document_id' => $document->id,
        'account_id'  => $account->id,
        'subtype_id'  => $subtype2->id,
        'type'        => 'expense',
        'amount'      => 300.0,
    ]);

    $entry = JournalEntry::create([
        'company_id'  => $this->company->id,
        'document_id' => $document->id,
        'entry_date'  => '2026-02-01',
        'description' => 'Multi-line same account',
        'status'      => 'posted',
        'posted_by'   => $this->user->id,
        'posted_at'   => Carbon::now(),
    ]);

    JournalEntryLine::create([
        'journal_entry_id'    => $entry->id,
        'account_id'          => $account->id,
        'transaction_line_id' => $txLine1->id,
        'debit'               => 500.0,
        'credit'              => null,
    ]);

    JournalEntryLine::create([
        'journal_entry_id'    => $entry->id,
        'account_id'          => $account->id,
        'transaction_line_id' => $txLine2->id,
        'debit'               => 300.0,
        'credit'              => null,
    ]);

    $result   = (new GLService())->getData($this->company, $account, $this->start, $this->end);
    $subtypes = collect($result['rows'])->pluck('subtype')->toArray();

    $this->assertCount(2, $result['rows']);
    $this->assertContains('Internet', $subtypes);
    $this->assertContains('Phone', $subtypes);
}
```

- [ ] **Step 4: Run tests to confirm they fail**

```bash
cd backend && php artisan test --filter GLServiceTest
```

Expected: `test_subtype_disambiguates_when_two_lines_share_same_account` fails because `GLService` still uses `firstWhere('account_id', ...)`, which returns the same transaction line for both rows. All existing subtype tests still pass — the old eager-load path continues to work correctly for documents where each account appears only once.

---

## Task 4: Update `JournalEntryService` — store `transaction_line_id`

**Files:**
- Modify: `backend/app/Services/Accounting/JournalEntryService.php`

- [ ] **Step 1: Add `transaction_line_id` to both JEL create calls inside the `foreach ($lines as $line)` loop**

In `postFromDocument`, find the `foreach ($lines as $line)` block and update both branches:

```php
foreach ($lines as $line) {
    if ($line->type === 'income') {
        JournalEntryLine::create([
            'journal_entry_id'    => $entry->id,
            'account_id'          => $line->account_id,
            'transaction_line_id' => $line->id,
            'debit'               => null,
            'credit'              => $line->amount,
        ]);
    } else {
        JournalEntryLine::create([
            'journal_entry_id'    => $entry->id,
            'account_id'          => $line->account_id,
            'transaction_line_id' => $line->id,
            'debit'               => $line->amount,
            'credit'              => null,
        ]);
    }
}
```

The cash net-offset block that follows (`if ($netCash > 0)` / `elseif ($netCash < 0)`) does **not** get `transaction_line_id` — omit it from those creates (defaults to null).

- [ ] **Step 2: Confirm the adjusting entry path is untouched**

In `postFromAdjustingEntry`, the `JournalEntryLine::create` calls have no `transaction_line_id`. This is correct — leave them as-is.

---

## Task 5: Update `GLService` — fix eager-load and subtype lookup

**Files:**
- Modify: `backend/app/Services/BIR/GLService.php`

- [ ] **Step 1: Replace the eager-load**

Find:
```php
$lines = JournalEntryLine::with([
    'journalEntry.document.transactionLines.subtype',
    'journalEntry.adjustingEntry',
    'account',
])
```

Replace with:
```php
$lines = JournalEntryLine::with([
    'transactionLine.subtype',
    'journalEntry.document',
    'journalEntry.adjustingEntry',
    'account',
])
```

- [ ] **Step 2: Replace the subtype lookup**

Find:
```php
$txLine  = $entry->document?->transactionLines->firstWhere('account_id', $line->account_id);
$subtype = $txLine?->subtype?->name ?? $line->account->name;
```

Replace with:
```php
$subtype = $line->transactionLine?->subtype?->name ?? $line->account->name;
```

The `$entry` variable is still used for `entry_date`, `description`, `document?->ref_number`, and `adjustingEntry?->ref_number` — do not remove it.

- [ ] **Step 3: Run all GL tests**

```bash
cd backend && php artisan test --filter GLServiceTest
```

Expected: all tests pass, including `test_subtype_disambiguates_when_two_lines_share_same_account`.

- [ ] **Step 4: Commit**

```bash
git add \
  backend/app/Services/Accounting/JournalEntryService.php \
  backend/app/Services/BIR/GLService.php \
  backend/tests/Feature/GLServiceTest.php
git commit -m "fix: resolve GL subtype via transaction_line_id to eliminate same-account ambiguity"
```
