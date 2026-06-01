# BIR GJ & GL — Add Account Name and Subtype Columns Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add `Account Name` and `Subtype` columns to both the GJ and GL BIR book tables; subtype is blank when none is assigned (no fallback to account name).

**Architecture:** Two backend service changes (GLService removes fallback + adds accountName, GJService adds transactionLine eager-load + subtype field), one TypeScript type update, one component update. No new files — all changes are in-place edits.

**Tech Stack:** Laravel 11 (PHP), PHPUnit, Next.js 14, TypeScript

---

### Task 1: Update GLService — remove subtype fallback, add accountName

**Spec:** GLService.php line 55 currently falls back to account name when no subtype. Change it to `null`. Add `accountName` to every row.

**Files:**
- Modify: `backend/app/Services/BIR/GLService.php:55-65`
- Modify: `backend/tests/Feature/GLServiceTest.php:263-272` (update the fallback test)

- [ ] **Step 1: Update the existing fallback test to expect null subtype + accountName field**

In `backend/tests/Feature/GLServiceTest.php`, replace the body of `test_row_falls_back_to_account_name_when_no_subtype` (lines 263–272):

```php
public function test_row_falls_back_to_account_name_when_no_subtype(): void
{
    $account = $this->makeAccount('expense');

    $this->makeEntryWithDocument($account, '2026-02-01', debit: 500.0);

    $result = (new GLService())->getData($this->company, $account, $this->start, $this->end);

    $this->assertCount(1, $result['rows']);
    $this->assertNull($result['rows'][0]['subtype']);
    $this->assertSame($account->name, $result['rows'][0]['accountName']);
}
```

Also add a new test immediately after to verify accountName is present on rows that do have a subtype. Add this after the `test_row_falls_back_to_account_name_when_no_subtype` method (before `test_subtype_resolves_to_correct_line_for_multi_line_document`):

```php
public function test_row_includes_account_name_when_subtype_is_present(): void
{
    $account = $this->makeAccount('expense');
    $subtype = Subtype::factory()->create(['name' => 'Internet Expense']);

    $this->makeEntryWithDocument($account, '2026-02-01', debit: 1000.0, subtype: $subtype);

    $result = (new GLService())->getData($this->company, $account, $this->start, $this->end);

    $this->assertCount(1, $result['rows']);
    $this->assertSame('Internet Expense', $result['rows'][0]['subtype']);
    $this->assertSame($account->name, $result['rows'][0]['accountName']);
}
```

- [ ] **Step 2: Run the updated tests to verify they fail**

```bash
cd backend && php artisan test --filter=GLServiceTest
```

Expected: 2 failures — `test_row_falls_back_to_account_name_when_no_subtype` (assertNull fails) and `test_row_includes_account_name_when_subtype_is_present` (key not found).

- [ ] **Step 3: Update GLService.php**

In `backend/app/Services/BIR/GLService.php`, replace lines 55–65:

```php
$subtype = $line->transactionLine?->subtype?->name;

$rows[] = [
    'date'           => $entry->entry_date?->toDateString(),
    'accountName'    => $line->account->name,
    'subtype'        => $subtype,
    'description'    => $entry->description,
    'ref'            => $ref,
    'debit'          => $debit,
    'credit'         => $credit,
    'runningBalance' => $runningBalance,
];
```

- [ ] **Step 4: Run all GL tests to verify they pass**

```bash
cd backend && php artisan test --filter=GLServiceTest
```

Expected: all tests pass (count will now be 16).

- [ ] **Step 5: Commit**

```bash
git add backend/app/Services/BIR/GLService.php backend/tests/Feature/GLServiceTest.php
git commit -m "feat: add accountName to GL rows, remove subtype fallback"
```

---

### Task 2: Update GJService — add subtype field

**Spec:** GJService.php needs `lines.transactionLine.subtype` added to the eager load and `subtype` added to each row (null when none).

**Files:**
- Modify: `backend/app/Services/BIR/GJService.php`
- Create: `backend/tests/Feature/GJServiceTest.php`

- [ ] **Step 1: Create GJServiceTest.php with failing tests**

Create `backend/tests/Feature/GJServiceTest.php`:

```php
<?php

namespace Tests\Feature;

use App\Models\Account;
use App\Models\Company;
use App\Models\Document;
use App\Models\JournalEntry;
use App\Models\JournalEntryLine;
use App\Models\Subtype;
use App\Models\TransactionLine;
use App\Models\User;
use App\Services\BIR\GJService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Tests\TestCase;

class GJServiceTest extends TestCase
{
    use RefreshDatabase;

    private Company $company;
    private User $user;
    private Carbon $start;
    private Carbon $end;

    protected function setUp(): void
    {
        parent::setUp();

        $this->user    = User::factory()->create(['role' => 'accountant']);
        $this->company = Company::factory()->create(['accountant_id' => $this->user->id]);
        $this->start   = Carbon::parse('2026-01-01')->startOfDay();
        $this->end     = Carbon::parse('2026-03-31')->endOfDay();
    }

    private function makeAccount(string $type): Account
    {
        return Account::factory()->create([
            'company_id' => $this->company->id,
            'type'       => $type,
        ]);
    }

    public function test_row_includes_subtype_name_when_transaction_line_has_subtype(): void
    {
        $account = $this->makeAccount('expense');
        $subtype = Subtype::factory()->create(['name' => 'Internet Expense']);

        $document = Document::factory()->create([
            'company_id'    => $this->company->id,
            'document_date' => '2026-02-01',
            'status'        => 'approved',
        ]);

        $txLine = TransactionLine::factory()->create([
            'document_id' => $document->id,
            'account_id'  => $account->id,
            'subtype_id'  => $subtype->id,
            'type'        => 'expense',
            'amount'      => 1000.0,
        ]);

        $entry = JournalEntry::create([
            'company_id'  => $this->company->id,
            'document_id' => $document->id,
            'entry_date'  => '2026-02-01',
            'description' => 'Test entry',
            'status'      => 'posted',
            'posted_by'   => $this->user->id,
            'posted_at'   => Carbon::now(),
        ]);

        JournalEntryLine::create([
            'journal_entry_id'    => $entry->id,
            'account_id'          => $account->id,
            'transaction_line_id' => $txLine->id,
            'debit'               => 1000.0,
            'credit'              => null,
        ]);

        $result = (new GJService())->getData($this->company, $this->start, $this->end);

        $this->assertCount(1, $result);
        $this->assertSame('Internet Expense', $result[0]['subtype']);
        $this->assertSame($account->name, $result[0]['accountName']);
    }

    public function test_row_has_null_subtype_when_no_transaction_line(): void
    {
        $account = $this->makeAccount('expense');

        $entry = JournalEntry::create([
            'company_id'  => $this->company->id,
            'entry_date'  => '2026-02-01',
            'description' => 'Adjusting entry',
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
        $this->assertNull($result[0]['subtype']);
        $this->assertSame($account->name, $result[0]['accountName']);
    }
}
```

- [ ] **Step 2: Run to verify tests fail**

```bash
cd backend && php artisan test --filter=GJServiceTest
```

Expected: 2 failures — `subtype` key not present in rows.

- [ ] **Step 3: Update GJService.php**

In `backend/app/Services/BIR/GJService.php`, replace the full file content:

```php
<?php

namespace App\Services\BIR;

use App\Models\Company;
use App\Models\JournalEntry;
use Illuminate\Support\Carbon;

class GJService
{
    public function getData(Company $co, Carbon $start, Carbon $end): array
    {
        $entries = JournalEntry::with(['document', 'adjustingEntry', 'lines.account', 'lines.transactionLine.subtype'])
            ->where('company_id', $co->id)
            ->whereDate('entry_date', '>=', $start->toDateString())
            ->whereDate('entry_date', '<=', $end->toDateString())
            ->orderBy('entry_date')
            ->orderBy('created_at')
            ->get();

        $rows = [];

        foreach ($entries as $entry) {
            $ref = $entry->document?->ref_number ?? $entry->adjustingEntry?->ref_number;

            foreach ($entry->lines as $line) {
                $account = $line->account;
                $rows[]  = [
                    'date'        => $entry->entry_date?->toDateString(),
                    'description' => $entry->description,
                    'ref'         => $ref,
                    'accountCode' => $account?->code,
                    'accountName' => $account?->name,
                    'subtype'     => $line->transactionLine?->subtype?->name,
                    'debit'       => $line->debit,
                    'credit'      => $line->credit,
                ];
            }
        }

        return $rows;
    }
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
cd backend && php artisan test --filter=GJServiceTest
```

Expected: 2 tests pass.

- [ ] **Step 5: Commit**

```bash
git add backend/app/Services/BIR/GJService.php backend/tests/Feature/GJServiceTest.php
git commit -m "feat: add subtype field to GJ rows"
```

---

### Task 3: Update frontend types and BIRBookTable component

**Spec:** Add `accountName` to `GLRow`. Update GL table to show two columns (Account Name, Subtype). Update GJ table to show two new columns (Account Name, Subtype).

**Files:**
- Modify: `frontend/src/types/report.ts:40-48`
- Modify: `frontend/src/components/reports/BIRBookTable.tsx`

- [ ] **Step 1: Add `accountName` to the GLRow interface**

In `frontend/src/types/report.ts`, replace the `GLRow` interface (lines 40–48):

```typescript
export interface GLRow {
  date: string
  accountName: string
  subtype: string | null
  description: string
  ref: string | null
  debit: number | null
  credit: number | null
  runningBalance: number
}
```

- [ ] **Step 2: Update the GL section of BIRBookTable**

In `frontend/src/components/reports/BIRBookTable.tsx`, replace the `openingRow` constant (lines 37–45):

```tsx
const openingRow: GLRow = {
  date: '',
  accountName: '',
  subtype: null,
  description: 'Opening Balance',
  ref: null,
  debit: null,
  credit: null,
  runningBalance: gl.openingBalance,
}
```

Replace the GL `<TableHeader>` block (lines 62–75):

```tsx
<TableHeader>
  <TableRow>
    <TableHead>Date</TableHead>
    <TableHead>Account Name</TableHead>
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
</TableHeader>
```

Replace the GL `<TableRow key={i}>` body (lines 86–113) — keep all existing cells, replace the single Account cell with two:

```tsx
<TableRow key={i} className={i === 0 ? 'font-bold' : ''}>
  <TableCell>{row.date ? formatDate(row.date) : ''}</TableCell>
  <TableCell>{row.accountName}</TableCell>
  <TableCell>{row.subtype ?? ''}</TableCell>
  <TableCell>{row.description}</TableCell>
  <TableCell>{row.ref ?? ''}</TableCell>
  <TableCell className="text-right">
    {row.debit != null ? (
      <span className={gl.account.normalBalance === 'debit' ? 'text-green-600' : 'text-red-600'}>
        {formatCurrency(row.debit)}
        <span className="ml-1 text-xs">{gl.account.normalBalance === 'debit' ? '↑' : '↓'}</span>
      </span>
    ) : ''}
  </TableCell>
  <TableCell className="text-right">
    {row.credit != null ? (
      <span className={gl.account.normalBalance === 'credit' ? 'text-green-600' : 'text-red-600'}>
        {formatCurrency(row.credit)}
        <span className="ml-1 text-xs">{gl.account.normalBalance === 'credit' ? '↑' : '↓'}</span>
      </span>
    ) : ''}
  </TableCell>
  <TableCell className={`text-right ${colorClass}`}>
    {formatCurrency(Math.abs(row.runningBalance))}
    {badge && <span className="ml-1 text-xs">{badge}</span>}
  </TableCell>
</TableRow>
```

- [ ] **Step 3: Update the GJ section of BIRBookTable**

Replace the GJ `<TableHeader>` block (lines 128–134):

```tsx
<TableHeader>
  <TableRow>
    <TableHead>Date</TableHead>
    <TableHead>Account Name</TableHead>
    <TableHead>Subtype</TableHead>
    <TableHead>Description</TableHead>
    <TableHead>Ref</TableHead>
    <TableHead className="text-right">Debit</TableHead>
    <TableHead className="text-right">Credit</TableHead>
  </TableRow>
</TableHeader>
```

Replace the GJ `<TableRow key={i}>` body (lines 138–149):

```tsx
<TableRow key={i}>
  <TableCell>{row.date ? formatDate(String(row.date)) : ''}</TableCell>
  <TableCell>{row.accountName != null ? String(row.accountName) : ''}</TableCell>
  <TableCell>{row.subtype != null ? String(row.subtype) : ''}</TableCell>
  <TableCell>{row.description}</TableCell>
  <TableCell>{row.ref ?? ''}</TableCell>
  <TableCell className="text-right">
    {row.debit != null ? formatCurrency(Number(row.debit)) : ''}
  </TableCell>
  <TableCell className="text-right">
    {row.credit != null ? formatCurrency(Number(row.credit)) : ''}
  </TableCell>
</TableRow>
```

- [ ] **Step 4: Verify TypeScript compiles**

```bash
cd frontend && npx tsc --noEmit 2>&1 | head -30
```

Expected: no errors.

- [ ] **Step 5: Run the full backend test suite to confirm no regressions**

```bash
cd backend && php artisan test 2>&1 | tail -5
```

Expected: all tests pass.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/types/report.ts frontend/src/components/reports/BIRBookTable.tsx
git commit -m "feat: add Account Name and Subtype columns to GJ and GL BIR tables"
```
