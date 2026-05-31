# GL Subtype Column Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a Subtype column after Date in the GL report that shows the transaction subtype name, falling back to the account name when no subtype is assigned.

**Architecture:** GLService resolves subtype at query time by eager-loading `document.transactionLines.subtype` and matching on `account_id`. No schema changes. The subtype string is included in the row payload and rendered as a new column in `BIRBookTable`.

**Tech Stack:** Laravel 11 (PHP/PHPUnit), Next.js 14 (TypeScript)

---

## Files

| File | Change |
|---|---|
| `backend/tests/Feature/GLServiceTest.php` | Add 2 new tests for subtype resolution |
| `backend/app/Services/BIR/GLService.php` | Update eager load + row building |
| `frontend/src/types/report.ts` | Add `subtype: string \| null` to `GLRow` |
| `frontend/src/components/reports/BIRBookTable.tsx` | Add Subtype column header + cell + opening row field |

---

### Task 1: Failing tests for subtype in GL rows

**Files:**
- Modify: `backend/tests/Feature/GLServiceTest.php`

- [ ] **Step 1: Add imports at the top of the test file**

Open `backend/tests/Feature/GLServiceTest.php`. The existing imports are:

```php
use App\Models\Account;
use App\Models\Company;
use App\Models\Document;
use App\Models\JournalEntry;
use App\Models\JournalEntryLine;
use App\Models\User;
use App\Services\BIR\GLService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Tests\TestCase;
```

Add `Subtype` and `TransactionLine` to the use block:

```php
use App\Models\Account;
use App\Models\Company;
use App\Models\Document;
use App\Models\JournalEntry;
use App\Models\JournalEntryLine;
use App\Models\Subtype;
use App\Models\TransactionLine;
use App\Models\User;
use App\Services\BIR\GLService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Tests\TestCase;
```

- [ ] **Step 2: Add a helper method for creating a document-backed entry**

Add this private method to `GLServiceTest`, below the existing `makeEntry()` helper (after line 59):

```php
private function makeEntryWithDocument(
    Account $account,
    string $date,
    float $debit = 0,
    float $credit = 0,
    ?Subtype $subtype = null,
): void {
    $document = Document::factory()->create([
        'company_id'    => $this->company->id,
        'document_date' => $date,
        'status'        => 'approved',
    ]);

    TransactionLine::factory()->create([
        'document_id' => $document->id,
        'account_id'  => $account->id,
        'subtype_id'  => $subtype?->id,
        'type'        => $debit > 0 ? 'expense' : 'income',
        'amount'      => $debit > 0 ? $debit : $credit,
    ]);

    $entry = JournalEntry::create([
        'company_id'  => $this->company->id,
        'document_id' => $document->id,
        'entry_date'  => $date,
        'description' => "Document #{$document->id}",
        'status'      => 'posted',
        'posted_by'   => $this->user->id,
        'posted_at'   => Carbon::now(),
    ]);

    JournalEntryLine::create([
        'journal_entry_id' => $entry->id,
        'account_id'       => $account->id,
        'debit'            => $debit ?: null,
        'credit'           => $credit ?: null,
    ]);
}
```

- [ ] **Step 3: Add the two new test cases**

Add these two tests at the bottom of the class (before the closing `}`):

```php
// ── Subtype column ────────────────────────────────────────────────────────

public function test_row_includes_subtype_name_when_transaction_line_has_subtype(): void
{
    $account = $this->makeAccount('expense');
    $subtype = Subtype::factory()->create(['name' => 'Internet Expense']);

    $this->makeEntryWithDocument($account, '2026-02-01', debit: 1000.0, subtype: $subtype);

    $result = (new GLService())->getData($this->company, $account, $this->start, $this->end);

    $this->assertCount(1, $result['rows']);
    $this->assertSame('Internet Expense', $result['rows'][0]['subtype']);
}

public function test_row_falls_back_to_account_name_when_no_subtype(): void
{
    $account = $this->makeAccount('expense');

    $this->makeEntryWithDocument($account, '2026-02-01', debit: 500.0);

    $result = (new GLService())->getData($this->company, $account, $this->start, $this->end);

    $this->assertCount(1, $result['rows']);
    $this->assertSame($account->name, $result['rows'][0]['subtype']);
}
```

- [ ] **Step 4: Run the new tests to confirm they fail**

```bash
cd backend && php artisan test --filter="test_row_includes_subtype_name_when_transaction_line_has_subtype|test_row_falls_back_to_account_name_when_no_subtype" --stop-on-failure
```

Expected: both tests **FAIL** — `$result['rows'][0]` has no `subtype` key yet.

- [ ] **Step 5: Commit the failing tests**

```bash
git add backend/tests/Feature/GLServiceTest.php
git commit -m "test: add failing tests for GL subtype column"
```

---

### Task 2: Update GLService to make the tests pass

**Files:**
- Modify: `backend/app/Services/BIR/GLService.php`

- [ ] **Step 1: Update the eager load in `getData()`**

The current eager load (line 25) is:

```php
$lines = JournalEntryLine::with(['journalEntry.document', 'journalEntry.adjustingEntry'])
```

Replace it with:

```php
$lines = JournalEntryLine::with([
    'journalEntry.document.transactionLines.subtype',
    'journalEntry.adjustingEntry',
    'account',
])
```

- [ ] **Step 2: Add subtype derivation in the row-building loop**

The current row loop (lines 42–57) is:

```php
foreach ($lines as $line) {
    $entry  = $line->journalEntry;
    $ref    = $entry->document?->ref_number ?? $entry->adjustingEntry?->ref_number;
    $debit  = $line->debit  ? (float) $line->debit  : null;
    $credit = $line->credit ? (float) $line->credit : null;

    $runningBalance += ($debit ?? 0) - ($credit ?? 0);

    $rows[] = [
        'date'           => $entry->entry_date?->toDateString(),
        'description'    => $entry->description,
        'ref'            => $ref,
        'debit'          => $debit,
        'credit'         => $credit,
        'runningBalance' => $runningBalance,
    ];
}
```

Replace it with:

```php
foreach ($lines as $line) {
    $entry  = $line->journalEntry;
    $ref    = $entry->document?->ref_number ?? $entry->adjustingEntry?->ref_number;
    $debit  = $line->debit  ? (float) $line->debit  : null;
    $credit = $line->credit ? (float) $line->credit : null;

    $runningBalance += ($debit ?? 0) - ($credit ?? 0);

    $txLine = $entry->document?->transactionLines->firstWhere('account_id', $line->account_id);
    $subtype = $txLine?->subtype?->name ?? $line->account->name;

    $rows[] = [
        'date'           => $entry->entry_date?->toDateString(),
        'subtype'        => $subtype,
        'description'    => $entry->description,
        'ref'            => $ref,
        'debit'          => $debit,
        'credit'         => $credit,
        'runningBalance' => $runningBalance,
    ];
}
```

- [ ] **Step 3: Run the new tests — they should now pass**

```bash
cd backend && php artisan test --filter="test_row_includes_subtype_name_when_transaction_line_has_subtype|test_row_falls_back_to_account_name_when_no_subtype"
```

Expected: both tests **PASS**.

- [ ] **Step 4: Run the full GLServiceTest suite to check for regressions**

```bash
cd backend && php artisan test tests/Feature/GLServiceTest.php
```

Expected: all tests **PASS**.

- [ ] **Step 5: Commit**

```bash
git add backend/app/Services/BIR/GLService.php
git commit -m "feat: add subtype column to GL report rows"
```

---

### Task 3: Frontend — type update and new table column

**Files:**
- Modify: `frontend/src/types/report.ts`
- Modify: `frontend/src/components/reports/BIRBookTable.tsx`

- [ ] **Step 1: Add `subtype` to the `GLRow` interface**

Open `frontend/src/types/report.ts`. The current `GLRow` interface (lines 40–47) is:

```ts
export interface GLRow {
  date: string
  description: string
  ref: string | null
  debit: number | null
  credit: number | null
  runningBalance: number
}
```

Replace it with:

```ts
export interface GLRow {
  date: string
  subtype: string | null
  description: string
  ref: string | null
  debit: number | null
  credit: number | null
  runningBalance: number
}
```

- [ ] **Step 2: Add `subtype: null` to the synthetic opening row in `BIRBookTable.tsx`**

Open `frontend/src/components/reports/BIRBookTable.tsx`. The current `openingRow` (lines 37–44) is:

```ts
const openingRow: GLRow = {
  date: '',
  description: 'Opening Balance',
  ref: null,
  debit: null,
  credit: null,
  runningBalance: gl.openingBalance,
}
```

Replace it with:

```ts
const openingRow: GLRow = {
  date: '',
  subtype: null,
  description: 'Opening Balance',
  ref: null,
  debit: null,
  credit: null,
  runningBalance: gl.openingBalance,
}
```

- [ ] **Step 3: Add the Subtype column header**

The current table headers (lines 61–73) are:

```tsx
<TableRow>
  <TableHead>Date</TableHead>
  <TableHead>Description</TableHead>
  <TableHead>Ref</TableHead>
  <TableHead className="text-right">Debit</TableHead>
  <TableHead className="text-right">Credit</TableHead>
  <TableHead className="text-right">
    Balance
    <span className="block text-xs font-normal text-muted-foreground">
      {gl.account.normalBalance === 'credit' ? '(CR normal)' : '(DR normal)'}
    </span>
  </TableHead>
</TableRow>
```

Replace with:

```tsx
<TableRow>
  <TableHead>Date</TableHead>
  <TableHead>Subtype</TableHead>
  <TableHead>Description</TableHead>
  <TableHead>Ref</TableHead>
  <TableHead className="text-right">Debit</TableHead>
  <TableHead className="text-right">Credit</TableHead>
  <TableHead className="text-right">
    Balance
    <span className="block text-xs font-normal text-muted-foreground">
      {gl.account.normalBalance === 'credit' ? '(CR normal)' : '(DR normal)'}
    </span>
  </TableHead>
</TableRow>
```

- [ ] **Step 4: Add the Subtype cell in the table body**

The current row rendering (lines 84–108) is:

```tsx
<TableRow key={i} className={i === 0 ? 'font-bold' : ''}>
  <TableCell>{row.date ? formatDate(row.date) : ''}</TableCell>
  <TableCell>{row.description}</TableCell>
  <TableCell>{row.ref ?? ''}</TableCell>
  ...
```

Replace those first three cells with:

```tsx
<TableRow key={i} className={i === 0 ? 'font-bold' : ''}>
  <TableCell>{row.date ? formatDate(row.date) : ''}</TableCell>
  <TableCell className="text-xs text-gray-500">{row.subtype ?? ''}</TableCell>
  <TableCell>{row.description}</TableCell>
  <TableCell>{row.ref ?? ''}</TableCell>
  ...
```

- [ ] **Step 5: Type-check the frontend**

```bash
cd frontend && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/types/report.ts frontend/src/components/reports/BIRBookTable.tsx
git commit -m "feat: show subtype column in GL report table"
```
