# GL Report Fixes & Enhancements Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix the duplicate Opening Balance row in the GL report, add a DR/CR normal-balance indicator with green/red coloring on the running balance, and show an amber banner when parked documents exist within the selected date range.

**Architecture:** All backend changes are isolated to `GLService.php` — the service derives `normalBalance` from account type, removes the Opening Balance from `$rows` (it is already a top-level field), and appends a `parkedCount`. The frontend changes are isolated to `BIRBookTable.tsx` and the `GLBook` type.

**Tech Stack:** Laravel 11 (PHP), PHPUnit, Next.js 14 App Router, TypeScript, shadcn/ui

---

## File Map

| File | Role |
|---|---|
| `backend/app/Services/BIR/GLService.php` | Remove opening balance row from `$rows`; add `normalBalance`; add `parkedCount` |
| `backend/tests/Feature/GLServiceTest.php` | New — feature tests for all three changes |
| `frontend/src/types/report.ts` | Add `normalBalance` and `parkedCount` to `GLBook` |
| `frontend/src/components/reports/BIRBookTable.tsx` | Parked banner; DR/CR badge + color on running balance; header sub-label |

---

## Task 1: Write failing tests for GLService

**Files:**
- Create: `backend/tests/Feature/GLServiceTest.php`

- [ ] **Step 1: Create the test file**

```php
<?php

namespace Tests\Feature;

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

class GLServiceTest extends TestCase
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

    private function makeEntry(Account $account, string $date, float $debit = 0, float $credit = 0): void
    {
        $entry = JournalEntry::create([
            'company_id'  => $this->company->id,
            'entry_date'  => $date,
            'description' => 'Test entry',
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

    // ── Bug fix ──────────────────────────────────────────────────────────────

    public function test_rows_do_not_contain_opening_balance_entry(): void
    {
        $account = $this->makeAccount('cash');
        $result  = (new GLService())->getData($this->company, $account, $this->start, $this->end);

        $descriptions = collect($result['rows'])->pluck('description')->toArray();
        $this->assertNotContains('Opening Balance', $descriptions);
    }

    // ── Normal balance ────────────────────────────────────────────────────────

    public function test_normal_balance_is_debit_for_cash_account(): void
    {
        $account = $this->makeAccount('cash');
        $result  = (new GLService())->getData($this->company, $account, $this->start, $this->end);

        $this->assertSame('debit', $result['account']['normalBalance']);
    }

    public function test_normal_balance_is_debit_for_expense_account(): void
    {
        $account = $this->makeAccount('expense');
        $result  = (new GLService())->getData($this->company, $account, $this->start, $this->end);

        $this->assertSame('debit', $result['account']['normalBalance']);
    }

    public function test_normal_balance_is_credit_for_income_account(): void
    {
        $account = $this->makeAccount('income');
        $result  = (new GLService())->getData($this->company, $account, $this->start, $this->end);

        $this->assertSame('credit', $result['account']['normalBalance']);
    }

    public function test_normal_balance_is_credit_for_vat_account(): void
    {
        $account = $this->makeAccount('vat');
        $result  = (new GLService())->getData($this->company, $account, $this->start, $this->end);

        $this->assertSame('credit', $result['account']['normalBalance']);
    }

    // ── Parked count ──────────────────────────────────────────────────────────

    public function test_parked_count_counts_parked_documents_within_range(): void
    {
        $account = $this->makeAccount('cash');

        Document::factory()->create([
            'company_id'    => $this->company->id,
            'status'        => 'parked',
            'document_date' => '2026-02-15',
        ]);
        Document::factory()->create([
            'company_id'    => $this->company->id,
            'status'        => 'parked',
            'document_date' => '2026-03-01',
        ]);

        $result = (new GLService())->getData($this->company, $account, $this->start, $this->end);

        $this->assertSame(2, $result['parkedCount']);
    }

    public function test_parked_count_excludes_documents_outside_date_range(): void
    {
        $account = $this->makeAccount('cash');

        Document::factory()->create([
            'company_id'    => $this->company->id,
            'status'        => 'parked',
            'document_date' => '2026-02-01', // inside
        ]);
        Document::factory()->create([
            'company_id'    => $this->company->id,
            'status'        => 'parked',
            'document_date' => '2026-04-01', // after end
        ]);

        $result = (new GLService())->getData($this->company, $account, $this->start, $this->end);

        $this->assertSame(1, $result['parkedCount']);
    }

    public function test_parked_count_excludes_non_parked_documents(): void
    {
        $account = $this->makeAccount('cash');

        Document::factory()->create([
            'company_id'    => $this->company->id,
            'status'        => 'processing',
            'document_date' => '2026-02-01',
        ]);

        $result = (new GLService())->getData($this->company, $account, $this->start, $this->end);

        $this->assertSame(0, $result['parkedCount']);
    }

    public function test_parked_count_excludes_parked_documents_from_other_company(): void
    {
        $account      = $this->makeAccount('cash');
        $otherCompany = Company::factory()->create();

        Document::factory()->create([
            'company_id'    => $otherCompany->id,
            'status'        => 'parked',
            'document_date' => '2026-02-01',
        ]);

        $result = (new GLService())->getData($this->company, $account, $this->start, $this->end);

        $this->assertSame(0, $result['parkedCount']);
    }
}
```

- [ ] **Step 2: Run tests and confirm they all fail**

```bash
cd backend && php artisan test tests/Feature/GLServiceTest.php
```

Expected: all tests fail — most with "Undefined array key 'normalBalance'" or "Undefined array key 'parkedCount'", and `test_rows_do_not_contain_opening_balance_entry` fails because the Opening Balance IS currently in rows.

---

## Task 2: Fix GLService — remove Opening Balance from rows, add normalBalance, add parkedCount

**Files:**
- Modify: `backend/app/Services/BIR/GLService.php`

- [ ] **Step 1: Replace the entire `getData` method**

The current method is at lines 13–74. Replace it with:

```php
public function getData(Company $co, Account $account, Carbon $start, Carbon $end): array
{
    // Step 1 — Opening balance (all activity before start date)
    $openingBalance = JournalEntryLine::whereHas('journalEntry', function ($q) use ($co, $start) {
            $q->where('company_id', $co->id)
              ->whereDate('entry_date', '<', $start->toDateString());
        })
        ->where('account_id', $account->id)
        ->selectRaw('COALESCE(SUM(debit), 0) - COALESCE(SUM(credit), 0) as balance')
        ->value('balance') ?? 0;

    // Step 2 — Lines in range
    $lines = JournalEntryLine::with(['journalEntry.document', 'journalEntry.adjustingEntry'])
        ->where('account_id', $account->id)
        ->whereHas('journalEntry', function ($q) use ($co, $start, $end) {
            $q->where('company_id', $co->id)
              ->whereDate('entry_date', '>=', $start->toDateString())
              ->whereDate('entry_date', '<=', $end->toDateString());
        })
        ->join('journal_entries', 'journal_entries.id', '=', 'journal_entry_lines.journal_entry_id')
        ->orderBy('journal_entries.entry_date')
        ->orderBy('journal_entries.created_at')
        ->select('journal_entry_lines.*')
        ->get();

    // Step 3 — Build rows (no Opening Balance row — it is the top-level openingBalance field)
    $rows           = [];
    $runningBalance = (float) $openingBalance;

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

    // Step 4 — Normal balance derived from account type
    $normalBalance = in_array($account->type, ['cash', 'expense']) ? 'debit' : 'credit';

    // Step 5 — Parked documents within the selected date range
    $parkedCount = \App\Models\Document::where('company_id', $co->id)
        ->where('status', 'parked')
        ->whereDate('document_date', '>=', $start->toDateString())
        ->whereDate('document_date', '<=', $end->toDateString())
        ->count();

    return [
        'account' => [
            'code'          => $account->code,
            'name'          => $account->name,
            'normalBalance' => $normalBalance,
        ],
        'openingBalance' => (float) $openingBalance,
        'parkedCount'    => $parkedCount,
        'rows'           => $rows,
    ];
}
```

- [ ] **Step 2: Run the tests and confirm they all pass**

```bash
cd backend && php artisan test tests/Feature/GLServiceTest.php
```

Expected: all 9 tests pass.

- [ ] **Step 3: Commit**

```bash
cd backend && git add app/Services/BIR/GLService.php tests/Feature/GLServiceTest.php
git commit -m "feat: GL — fix duplicate opening balance row, add normalBalance and parkedCount"
```

---

## Task 3: Update TypeScript GLBook type

**Files:**
- Modify: `frontend/src/types/report.ts`

- [ ] **Step 1: Update the `GLBook` interface**

In `frontend/src/types/report.ts`, replace the existing `GLBook` interface (lines 49–53):

```ts
export interface GLBook {
  account: { code: string; name: string; normalBalance: 'debit' | 'credit' }
  openingBalance: number
  parkedCount: number
  rows: GLRow[]
}
```

- [ ] **Step 2: Verify TypeScript compilation**

```bash
cd frontend && npx tsc --noEmit
```

Expected: no errors. If there are errors, they will point to `BIRBookTable.tsx` where `gl.account.normalBalance` or `gl.parkedCount` are now expected — fix those in Task 4.

---

## Task 4: Update BIRBookTable — parked banner, DR/CR badge, color, header sub-label

**Files:**
- Modify: `frontend/src/components/reports/BIRBookTable.tsx`

- [ ] **Step 1: Replace the entire GL branch (lines 34–75) with the updated version**

Find the block starting at `if (book === 'gl' || isGLBook(data)) {` and replace everything up to and including its closing `}` with:

```tsx
  if (book === 'gl' || isGLBook(data)) {
    const gl = data as GLBook
    const openingRow: GLRow = {
      date: '',
      description: 'Opening Balance',
      ref: null,
      debit: null,
      credit: null,
      runningBalance: gl.openingBalance,
    }
    const rows = [openingRow, ...gl.rows]
    return (
      <div>
        {gl.parkedCount > 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 flex items-center gap-3 mb-4 text-sm text-amber-800">
            <span className="text-base flex-shrink-0">⏳</span>
            <span>
              <strong>
                {gl.parkedCount} parked {gl.parkedCount === 1 ? 'document' : 'documents'}
              </strong>{' '}
              are awaiting accountant review and are not included in these totals.
            </span>
          </div>
        )}
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Ref</TableHead>
              <TableHead className="text-right">Debit</TableHead>
              <TableHead className="text-right">Credit</TableHead>
              <TableHead className="text-right">
                Balance
                <span className="block text-xs font-normal text-muted-foreground">
                  {gl.account.normalBalance === 'credit' ? 'CR normal' : 'DR normal'}
                </span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row, i) => {
              const side =
                row.runningBalance > 0 ? 'debit' : row.runningBalance < 0 ? 'credit' : null
              const isNormal = side === null || side === gl.account.normalBalance
              const colorClass =
                side === null ? '' : isNormal ? 'text-green-600' : 'text-red-600'
              const badge = side === 'debit' ? 'DR' : side === 'credit' ? 'CR' : null
              return (
                <TableRow key={i} className={i === 0 ? 'font-bold' : ''}>
                  <TableCell>{row.date ? formatDate(row.date) : ''}</TableCell>
                  <TableCell>{row.description}</TableCell>
                  <TableCell>{row.ref ?? ''}</TableCell>
                  <TableCell className="text-right">
                    {row.debit != null ? formatCurrency(row.debit) : ''}
                  </TableCell>
                  <TableCell className="text-right">
                    {row.credit != null ? formatCurrency(row.credit) : ''}
                  </TableCell>
                  <TableCell className={`text-right ${colorClass}`}>
                    {formatCurrency(Math.abs(row.runningBalance))}
                    {badge && <span className="ml-1 text-xs">{badge}</span>}
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </div>
    )
  }
```

- [ ] **Step 2: Verify TypeScript compilation**

```bash
cd frontend && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
cd frontend && git add src/types/report.ts src/components/reports/BIRBookTable.tsx
git commit -m "feat: GL — add parked banner, DR/CR normal-balance indicator with color"
```

---

## Self-Review Notes

- **Spec coverage:** All three spec sections covered — duplicate row fix (Task 2), normalBalance (Tasks 2–4), parked banner (Tasks 2–4).
- **No placeholders.**
- **Type consistency:** `normalBalance: 'debit' | 'credit'` defined in Task 3, consumed in Task 4. `parkedCount: number` defined in Task 3, consumed in Task 4.
- **PDF export:** Intentionally out of scope per spec.
