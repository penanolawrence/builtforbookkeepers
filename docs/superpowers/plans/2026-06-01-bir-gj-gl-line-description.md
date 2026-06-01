# BIR GJ & GL Line-Level Description Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the entry-level description in GJ and GL rows with a per-line fallback: `transaction_lines.description` → `journal_entry_lines.description` → `journal_entries.description`.

**Architecture:** Two one-line changes in the backend BIR services. Both services already eager-load `transactionLine`, so no query changes are needed. The `description` key name in the returned array is unchanged, so the frontend is untouched.

**Tech Stack:** Laravel 11, PHP, PHPUnit/Pest via `php artisan test`

---

### Task 1: GJService — description fallback

**Files:**
- Modify: `backend/app/Services/BIR/GJService.php:30`
- Test: `backend/tests/Feature/GJServiceTest.php`

- [ ] **Step 1: Write the three failing tests**

Add to `backend/tests/Feature/GJServiceTest.php` (inside the class, after the existing tests):

```php
public function test_description_uses_transaction_line_description_when_available(): void
{
    $account = $this->makeAccount('expense');

    $document = Document::factory()->create([
        'company_id'    => $this->company->id,
        'document_date' => '2026-02-01',
        'status'        => 'approved',
    ]);

    $txLine = TransactionLine::factory()->create([
        'document_id' => $document->id,
        'account_id'  => $account->id,
        'description' => 'Purchased office supplies',
        'type'        => 'expense',
        'amount'      => 1000.0,
    ]);

    $entry = JournalEntry::create([
        'company_id'  => $this->company->id,
        'document_id' => $document->id,
        'entry_date'  => '2026-02-01',
        'description' => 'Entry description',
        'status'      => 'posted',
        'posted_by'   => $this->user->id,
        'posted_at'   => Carbon::now(),
    ]);

    JournalEntryLine::create([
        'journal_entry_id'    => $entry->id,
        'account_id'          => $account->id,
        'transaction_line_id' => $txLine->id,
        'description'         => 'JEL description',
        'debit'               => 1000.0,
        'credit'              => null,
    ]);

    $result = (new GJService())->getData($this->company, $this->start, $this->end);

    $this->assertCount(1, $result);
    $this->assertSame('Purchased office supplies', $result[0]['description']);
}

public function test_description_falls_back_to_jel_description_when_no_transaction_line(): void
{
    $account = $this->makeAccount('expense');

    $entry = JournalEntry::create([
        'company_id'  => $this->company->id,
        'entry_date'  => '2026-02-01',
        'description' => 'Entry description',
        'status'      => 'posted',
        'posted_by'   => $this->user->id,
        'posted_at'   => Carbon::now(),
    ]);

    JournalEntryLine::create([
        'journal_entry_id' => $entry->id,
        'account_id'       => $account->id,
        'description'      => 'JEL description',
        'debit'            => 500.0,
        'credit'           => null,
    ]);

    $result = (new GJService())->getData($this->company, $this->start, $this->end);

    $this->assertCount(1, $result);
    $this->assertSame('JEL description', $result[0]['description']);
}

public function test_description_falls_back_to_entry_description_when_no_line_descriptions(): void
{
    $account = $this->makeAccount('expense');

    $entry = JournalEntry::create([
        'company_id'  => $this->company->id,
        'entry_date'  => '2026-02-01',
        'description' => 'Entry description',
        'status'      => 'posted',
        'posted_by'   => $this->user->id,
        'posted_at'   => Carbon::now(),
    ]);

    JournalEntryLine::create([
        'journal_entry_id' => $entry->id,
        'account_id'       => $account->id,
        'debit'            => 500.0,
        'credit'           => null,
    ]);

    $result = (new GJService())->getData($this->company, $this->start, $this->end);

    $this->assertCount(1, $result);
    $this->assertSame('Entry description', $result[0]['description']);
}
```

- [ ] **Step 2: Run the tests to verify they fail**

```bash
cd backend && php artisan test tests/Feature/GJServiceTest.php --filter="test_description"
```

Expected: 2 failures — the first two tests fail because `description` currently returns `$entry->description` instead of the line-level value. The third test passes (current behavior already matches the fallback).

- [ ] **Step 3: Apply the fix in GJService**

In `backend/app/Services/BIR/GJService.php`, change line 30:

```php
// Before
'description' => $entry->description,

// After
'description' => $line->transactionLine?->description ?? $line->description ?? $entry->description,
```

- [ ] **Step 4: Run the tests to verify they all pass**

```bash
cd backend && php artisan test tests/Feature/GJServiceTest.php
```

Expected: all tests PASS.

- [ ] **Step 5: Commit**

```bash
git add backend/app/Services/BIR/GJService.php backend/tests/Feature/GJServiceTest.php
git commit -m "feat: resolve GJ description from transaction line with JEL and entry fallback"
```

---

### Task 2: GLService — description fallback

**Files:**
- Modify: `backend/app/Services/BIR/GLService.php:61`
- Test: `backend/tests/Feature/GLServiceTest.php`

- [ ] **Step 1: Write the three failing tests**

Add to `backend/tests/Feature/GLServiceTest.php` (inside the class, after the existing tests):

```php
public function test_row_description_uses_transaction_line_description_when_available(): void
{
    $account = $this->makeAccount('expense');

    $document = Document::factory()->create([
        'company_id'    => $this->company->id,
        'document_date' => '2026-02-01',
        'status'        => 'approved',
    ]);

    $txLine = TransactionLine::factory()->create([
        'document_id' => $document->id,
        'account_id'  => $account->id,
        'description' => 'Purchased office supplies',
        'type'        => 'expense',
        'amount'      => 1000.0,
    ]);

    $entry = JournalEntry::create([
        'company_id'  => $this->company->id,
        'document_id' => $document->id,
        'entry_date'  => '2026-02-01',
        'description' => 'Entry description',
        'status'      => 'posted',
        'posted_by'   => $this->user->id,
        'posted_at'   => Carbon::now(),
    ]);

    JournalEntryLine::create([
        'journal_entry_id'    => $entry->id,
        'account_id'          => $account->id,
        'transaction_line_id' => $txLine->id,
        'description'         => 'JEL description',
        'debit'               => 1000.0,
        'credit'              => null,
    ]);

    $result = (new GLService())->getData($this->company, $account, $this->start, $this->end);

    $this->assertCount(1, $result['rows']);
    $this->assertSame('Purchased office supplies', $result['rows'][0]['description']);
}

public function test_row_description_falls_back_to_jel_description_when_no_transaction_line(): void
{
    $account = $this->makeAccount('expense');

    $entry = JournalEntry::create([
        'company_id'  => $this->company->id,
        'entry_date'  => '2026-02-01',
        'description' => 'Entry description',
        'status'      => 'posted',
        'posted_by'   => $this->user->id,
        'posted_at'   => Carbon::now(),
    ]);

    JournalEntryLine::create([
        'journal_entry_id' => $entry->id,
        'account_id'       => $account->id,
        'description'      => 'JEL description',
        'debit'            => 500.0,
        'credit'           => null,
    ]);

    $result = (new GLService())->getData($this->company, $account, $this->start, $this->end);

    $this->assertCount(1, $result['rows']);
    $this->assertSame('JEL description', $result['rows'][0]['description']);
}

public function test_row_description_falls_back_to_entry_description_when_no_line_descriptions(): void
{
    $account = $this->makeAccount('expense');

    $entry = JournalEntry::create([
        'company_id'  => $this->company->id,
        'entry_date'  => '2026-02-01',
        'description' => 'Entry description',
        'status'      => 'posted',
        'posted_by'   => $this->user->id,
        'posted_at'   => Carbon::now(),
    ]);

    JournalEntryLine::create([
        'journal_entry_id' => $entry->id,
        'account_id'       => $account->id,
        'debit'            => 500.0,
        'credit'           => null,
    ]);

    $result = (new GLService())->getData($this->company, $account, $this->start, $this->end);

    $this->assertCount(1, $result['rows']);
    $this->assertSame('Entry description', $result['rows'][0]['description']);
}
```

- [ ] **Step 2: Run the tests to verify they fail**

```bash
cd backend && php artisan test tests/Feature/GLServiceTest.php --filter="test_row_description"
```

Expected: 2 failures — the first two tests fail because `description` currently returns `$entry->description`. The third test passes.

- [ ] **Step 3: Apply the fix in GLService**

In `backend/app/Services/BIR/GLService.php`, change line 61:

```php
// Before
'description' => $entry->description,

// After
'description' => $line->transactionLine?->description ?? $line->description ?? $entry->description,
```

- [ ] **Step 4: Run the tests to verify they all pass**

```bash
cd backend && php artisan test tests/Feature/GLServiceTest.php
```

Expected: all tests PASS.

- [ ] **Step 5: Run the full test suite to check for regressions**

```bash
cd backend && php artisan test
```

Expected: all tests PASS.

- [ ] **Step 6: Commit**

```bash
git add backend/app/Services/BIR/GLService.php backend/tests/Feature/GLServiceTest.php
git commit -m "feat: resolve GL description from transaction line with JEL and entry fallback"
```
