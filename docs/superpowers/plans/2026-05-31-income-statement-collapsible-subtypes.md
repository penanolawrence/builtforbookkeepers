# Income Statement Collapsible Subtype Breakdown Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a collapsible chevron to each income/expense account row in the income statement that expands to show a per-subtype breakdown, with unclassified amounts bucketed as "Others."

**Architecture:** `IncomeStatementService` is extended with a second query pass that bridges `JournalEntry.document_id → TransactionLine → Subtype` to build a subtype lookup per account. The authoritative account total stays the journal entry sum; the "Others" bucket absorbs any gap (adjusting entries, untagged lines). Frontend adds per-row expanded state and renders sub-rows inline.

**Tech Stack:** Laravel 11 (PHP), PHPUnit/Pest via `php artisan test`, Next.js 14 App Router, React, TypeScript, Lucide icons, TanStack Query.

---

## File Map

| Action | Path | Responsibility |
|---|---|---|
| Modify | `backend/app/Services/Report/IncomeStatementService.php` | Add subtype bridge + `buildSubtypes()` helper |
| Create | `backend/tests/Feature/IncomeStatementServiceTest.php` | Unit tests for three subtype scenarios |
| Modify | `frontend/src/types/report.ts` | Add `SubtypeLine`, extend `ReportLine` |
| Modify | `frontend/src/components/reports/IncomeStatementTable.tsx` | Collapsible rows with chevron + sub-rows |

---

## Task 1: Backend — test `IncomeStatementService` subtype behaviour

**Files:**
- Create: `backend/tests/Feature/IncomeStatementServiceTest.php`

- [ ] **Step 1: Write the failing test file**

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
use App\Services\Report\IncomeStatementService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Tests\TestCase;

class IncomeStatementServiceTest extends TestCase
{
    use RefreshDatabase;

    private Company $company;
    private Account $expenseAccount;

    protected function setUp(): void
    {
        parent::setUp();

        $user = User::factory()->create(['role' => 'accountant']);

        $this->company = Company::factory()->create([
            'accountant_id' => $user->id,
            'bir_type'      => 'non_vat',
        ]);

        $this->expenseAccount = Account::factory()->create([
            'company_id' => $this->company->id,
            'code'       => '6001',
            'name'       => 'Meals and Entertainment',
            'type'       => 'expense',
        ]);
    }

    private function makeEntry(?string $documentId = null): JournalEntry
    {
        return JournalEntry::create([
            'company_id'  => $this->company->id,
            'document_id' => $documentId,
            'entry_date'  => '2024-05-15',
            'description' => 'Test entry',
            'status'      => 'posted',
        ]);
    }

    private function makeExpenseLine(JournalEntry $entry, float $amount): void
    {
        JournalEntryLine::create([
            'journal_entry_id' => $entry->id,
            'account_id'       => $this->expenseAccount->id,
            'debit'            => $amount,
            'credit'           => null,
        ]);
    }

    // ── Test 1 ──────────────────────────────────────────────────────────────

    public function test_adjusting_entry_account_returns_empty_subtypes(): void
    {
        // Adjusting entry: no document_id → no TransactionLines
        $entry = $this->makeEntry(null);
        $this->makeExpenseLine($entry, 500.00);

        $result = (new IncomeStatementService())->getData(
            $this->company,
            Carbon::parse('2024-05-01'),
            Carbon::parse('2024-05-31'),
        );

        $this->assertCount(1, $result['expenses']);
        $this->assertSame([], $result['expenses'][0]['subtypes']);
    }

    // ── Test 2 ──────────────────────────────────────────────────────────────

    public function test_all_lines_have_subtypes_returns_no_others_bucket(): void
    {
        $subtype = Subtype::factory()->create(['name' => 'Lunch']);

        $doc = Document::factory()->create([
            'company_id'    => $this->company->id,
            'document_date' => '2024-05-15',
        ]);

        TransactionLine::factory()->create([
            'document_id' => $doc->id,
            'account_id'  => $this->expenseAccount->id,
            'type'        => 'expense',
            'subtype_id'  => $subtype->id,
            'amount'      => 500.00,
            'date'        => '2024-05-15',
        ]);

        $entry = $this->makeEntry($doc->id);
        $this->makeExpenseLine($entry, 500.00);

        $result = (new IncomeStatementService())->getData(
            $this->company,
            Carbon::parse('2024-05-01'),
            Carbon::parse('2024-05-31'),
        );

        $subtypes = $result['expenses'][0]['subtypes'];
        $this->assertCount(1, $subtypes);
        $this->assertSame('Lunch', $subtypes[0]['name']);
        $this->assertSame(500.0, $subtypes[0]['total']);

        $names = array_column($subtypes, 'name');
        $this->assertNotContains('Others', $names);
    }

    // ── Test 3 ──────────────────────────────────────────────────────────────

    public function test_mixed_lines_include_others_bucket(): void
    {
        $subtype = Subtype::factory()->create(['name' => 'Coffee']);

        $doc = Document::factory()->create([
            'company_id'    => $this->company->id,
            'document_date' => '2024-05-15',
        ]);

        // One line with subtype
        TransactionLine::factory()->create([
            'document_id' => $doc->id,
            'account_id'  => $this->expenseAccount->id,
            'type'        => 'expense',
            'subtype_id'  => $subtype->id,
            'amount'      => 150.00,
            'date'        => '2024-05-15',
        ]);

        // One line without subtype
        TransactionLine::factory()->create([
            'document_id' => $doc->id,
            'account_id'  => $this->expenseAccount->id,
            'type'        => 'expense',
            'subtype_id'  => null,
            'amount'      => 65.00,
            'date'        => '2024-05-15',
        ]);

        // Journal entry total = 215.00
        $entry = $this->makeEntry($doc->id);
        $this->makeExpenseLine($entry, 215.00);

        $result = (new IncomeStatementService())->getData(
            $this->company,
            Carbon::parse('2024-05-01'),
            Carbon::parse('2024-05-31'),
        );

        $subtypes = $result['expenses'][0]['subtypes'];

        $this->assertCount(2, $subtypes);

        $coffee = collect($subtypes)->firstWhere('name', 'Coffee');
        $others = collect($subtypes)->firstWhere('name', 'Others');

        $this->assertNotNull($coffee);
        $this->assertSame(150.0, $coffee['total']);

        $this->assertNotNull($others);
        $this->assertSame(65.0, $others['total']);

        // "Others" must be last
        $this->assertSame('Others', end($subtypes)['name']);
    }
}
```

- [ ] **Step 2: Run to confirm all three tests fail**

```bash
cd backend && php artisan test --filter=IncomeStatementServiceTest
```

Expected: 3 failures — method `getData` does not yet return `subtypes`.

---

## Task 2: Backend — implement subtype bridge in `IncomeStatementService`

**Files:**
- Modify: `backend/app/Services/Report/IncomeStatementService.php`

- [ ] **Step 3: Replace the full service with the new implementation**

```php
<?php

namespace App\Services\Report;

use App\Models\Company;
use App\Models\JournalEntry;
use App\Models\JournalEntryLine;
use App\Models\TransactionLine;
use Illuminate\Support\Carbon;

class IncomeStatementService
{
    public function getData(Company $co, Carbon $start, Carbon $end): array
    {
        $entries = JournalEntry::where('company_id', $co->id)
            ->whereDate('entry_date', '>=', $start->toDateString())
            ->whereDate('entry_date', '<=', $end->toDateString())
            ->get(['id', 'document_id']);

        $entryIds    = $entries->pluck('id');
        $documentIds = $entries->whereNotNull('document_id')->pluck('document_id');

        $lines = JournalEntryLine::with('account')
            ->whereIn('journal_entry_id', $entryIds)
            ->get();

        $income   = [];
        $expenses = [];

        foreach ($lines as $line) {
            $account = $line->account;
            if (!$account) continue;

            if ($account->type === 'income') {
                $key = $account->id;
                if (!isset($income[$key])) {
                    $income[$key] = [
                        'accountCode' => $account->code,
                        'accountName' => $account->name,
                        'total'       => 0,
                        'subtypes'    => [],
                    ];
                }
                $income[$key]['total'] += (float) ($line->credit ?? 0);
            } elseif ($account->type === 'expense') {
                $key = $account->id;
                if (!isset($expenses[$key])) {
                    $expenses[$key] = [
                        'accountCode' => $account->code,
                        'accountName' => $account->name,
                        'total'       => 0,
                        'subtypes'    => [],
                    ];
                }
                $expenses[$key]['total'] += (float) ($line->debit ?? 0);
            }
        }

        if ($documentIds->isNotEmpty()) {
            $subtypeLookup = $this->buildSubtypeLookup($documentIds->all());

            foreach ($income as $accountId => &$row) {
                $row['subtypes'] = $this->buildSubtypes($row['total'], $subtypeLookup[$accountId] ?? []);
            }
            unset($row);

            foreach ($expenses as $accountId => &$row) {
                $row['subtypes'] = $this->buildSubtypes($row['total'], $subtypeLookup[$accountId] ?? []);
            }
            unset($row);
        }

        $incomeList    = array_values($income);
        $expenseList   = array_values($expenses);
        $totalIncome   = array_sum(array_column($incomeList, 'total'));
        $totalExpenses = array_sum(array_column($expenseList, 'total'));

        return [
            'income'   => $incomeList,
            'expenses' => $expenseList,
            'totals'   => [
                'totalIncome'   => $totalIncome,
                'totalExpenses' => $totalExpenses,
                'netIncome'     => $totalIncome - $totalExpenses,
            ],
        ];
    }

    /** @param string[] $documentIds */
    private function buildSubtypeLookup(array $documentIds): array
    {
        $txLines = TransactionLine::with('subtype')
            ->whereIn('document_id', $documentIds)
            ->get();

        $lookup = []; // account_id => [ subtype_name => total ]

        foreach ($txLines as $txLine) {
            $accountId   = $txLine->account_id;
            if (!$accountId) continue;
            $subtypeName = $txLine->subtype?->name ?? '__others__';

            $lookup[$accountId][$subtypeName] = ($lookup[$accountId][$subtypeName] ?? 0) + (float) $txLine->amount;
        }

        return $lookup;
    }

    /** @param array<string,float> $lookup subtype_name => subtotal */
    private function buildSubtypes(float $accountTotal, array $lookup): array
    {
        if (empty($lookup)) {
            return [];
        }

        $named = [];
        foreach ($lookup as $name => $subtotal) {
            if ($name === '__others__') continue;
            $named[] = ['name' => $name, 'total' => $subtotal];
        }

        usort($named, fn ($a, $b) => $b['total'] <=> $a['total']);

        $namedTotal  = array_sum(array_column($named, 'total'));
        $othersTotal = round($accountTotal - $namedTotal, 2);

        if ($othersTotal > 0) {
            $named[] = ['name' => 'Others', 'total' => $othersTotal];
        }

        return $named;
    }
}
```

- [ ] **Step 4: Run tests to confirm all three pass**

```bash
cd backend && php artisan test --filter=IncomeStatementServiceTest
```

Expected: 3 tests, 3 passed.

- [ ] **Step 5: Commit**

```bash
git add backend/app/Services/Report/IncomeStatementService.php backend/tests/Feature/IncomeStatementServiceTest.php
git commit -m "feat: extend IncomeStatementService with per-account subtype breakdown"
```

---

## Task 3: Frontend — extend `ReportLine` type

**Files:**
- Modify: `frontend/src/types/report.ts`

- [ ] **Step 6: Add `SubtypeLine` and update `ReportLine`**

Replace the `ReportLine` interface in `frontend/src/types/report.ts`:

```ts
export interface SubtypeLine {
  name: string
  total: number
}

export interface ReportLine {
  accountCode: string
  accountName: string
  total: number
  subtypes: SubtypeLine[]
}
```

The rest of the file (`ReportTotals`, `IncomeStatement`, `ExpenseBreakdown`, etc.) is unchanged.

- [ ] **Step 7: Verify TypeScript compiles cleanly**

```bash
cd frontend && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 8: Commit**

```bash
git add frontend/src/types/report.ts
git commit -m "feat: add SubtypeLine type and subtypes field to ReportLine"
```

---

## Task 4: Frontend — collapsible rows in `IncomeStatementTable`

**Files:**
- Modify: `frontend/src/components/reports/IncomeStatementTable.tsx`

- [ ] **Step 9: Replace the full component**

```tsx
'use client'

import { useState, useEffect, Fragment } from 'react'
import { useQuery } from '@tanstack/react-query'
import { ChevronRight } from 'lucide-react'
import { getIncomeStatement } from '@/lib/api/reports'
import { formatCurrency } from '@/lib/utils/formatCurrency'
import { Skeleton } from '@/components/ui/skeleton'
import { EmptyState } from '@/components/shared/EmptyState'

interface Props {
  clientId?: string
  start: string
  end: string
  refetchKey?: number
}

export function IncomeStatementTable({ clientId, start, end, refetchKey = 0 }: Props) {
  const { data, isLoading } = useQuery({
    queryKey: ['income-statement', clientId, start, end, refetchKey],
    queryFn: () => getIncomeStatement({ clientId, start, end }),
    enabled: !!start && !!end,
  })

  const [expanded, setExpanded] = useState<Record<string, boolean>>({})

  useEffect(() => {
    setExpanded({})
  }, [start, end])

  if (isLoading) return <Skeleton className="h-40 w-full" />
  if (!data) return <EmptyState message="No data available." />

  const isProfit = data.totals.netIncome >= 0

  const toggle = (code: string) =>
    setExpanded(prev => ({ ...prev, [code]: !prev[code] }))

  return (
    <table className="w-full border-collapse text-sm">
      <tbody>
        {/* INCOME section header */}
        <tr className="bg-gray-50">
          <td
            colSpan={2}
            className="px-3.5 py-1.5 text-[10px] font-bold uppercase tracking-wide text-gray-500 border-b border-gray-200"
          >
            Income
          </td>
        </tr>

        {data.income.map((row) => (
          <Fragment key={row.accountCode}>
            <tr
              className={`border-b border-gray-50 ${row.subtypes.length > 0 ? 'cursor-pointer hover:bg-gray-50' : ''}`}
              onClick={() => row.subtypes.length > 0 && toggle(row.accountCode)}
            >
              <td className="px-3.5 py-2 text-gray-700">
                <div className="flex items-center gap-1.5">
                  {row.subtypes.length > 0 && (
                    <ChevronRight
                      className={`h-3.5 w-3.5 shrink-0 text-gray-400 transition-transform duration-150 ${
                        expanded[row.accountCode] ? 'rotate-90' : ''
                      }`}
                    />
                  )}
                  {row.accountName}
                </div>
              </td>
              <td className="px-3.5 py-2 text-right text-gray-700 tabular-nums">
                {formatCurrency(row.total)}
              </td>
            </tr>
            {expanded[row.accountCode] &&
              row.subtypes.map((sub) => (
                <tr key={sub.name} className="border-b border-gray-50">
                  <td className="pl-8 pr-3.5 py-1.5 text-sm text-gray-500">
                    — {sub.name}
                  </td>
                  <td className="px-3.5 py-1.5 text-right text-sm text-gray-500 tabular-nums">
                    {formatCurrency(sub.total)}
                  </td>
                </tr>
              ))}
          </Fragment>
        ))}

        {/* Total Income subtotal */}
        <tr className="bg-gray-50 border-b border-gray-200">
          <td className="px-3.5 py-2 font-bold text-green-700">Total Income</td>
          <td className="px-3.5 py-2 text-right font-bold text-green-700 tabular-nums">
            {formatCurrency(data.totals.totalIncome)}
          </td>
        </tr>

        {/* EXPENSES section header */}
        <tr className="bg-gray-50">
          <td
            colSpan={2}
            className="px-3.5 py-1.5 text-[10px] font-bold uppercase tracking-wide text-gray-500 border-b border-gray-200"
          >
            Expenses
          </td>
        </tr>

        {data.expenses.map((row) => (
          <Fragment key={row.accountCode}>
            <tr
              className={`border-b border-gray-50 ${row.subtypes.length > 0 ? 'cursor-pointer hover:bg-gray-50' : ''}`}
              onClick={() => row.subtypes.length > 0 && toggle(row.accountCode)}
            >
              <td className="px-3.5 py-2 text-gray-700">
                <div className="flex items-center gap-1.5">
                  {row.subtypes.length > 0 && (
                    <ChevronRight
                      className={`h-3.5 w-3.5 shrink-0 text-gray-400 transition-transform duration-150 ${
                        expanded[row.accountCode] ? 'rotate-90' : ''
                      }`}
                    />
                  )}
                  {row.accountName}
                </div>
              </td>
              <td className="px-3.5 py-2 text-right text-gray-700 tabular-nums">
                {formatCurrency(row.total)}
              </td>
            </tr>
            {expanded[row.accountCode] &&
              row.subtypes.map((sub) => (
                <tr key={sub.name} className="border-b border-gray-50">
                  <td className="pl-8 pr-3.5 py-1.5 text-sm text-gray-500">
                    — {sub.name}
                  </td>
                  <td className="px-3.5 py-1.5 text-right text-sm text-gray-500 tabular-nums">
                    {formatCurrency(sub.total)}
                  </td>
                </tr>
              ))}
          </Fragment>
        ))}

        {/* Total Expenses subtotal */}
        <tr className="bg-gray-50 border-b border-gray-200">
          <td className="px-3.5 py-2 font-bold text-red-700">Total Expenses</td>
          <td className="px-3.5 py-2 text-right font-bold text-red-700 tabular-nums">
            {formatCurrency(data.totals.totalExpenses)}
          </td>
        </tr>

        {/* Net Income row */}
        <tr className={`border-t-2 border-indigo-500 ${isProfit ? 'bg-green-50' : 'bg-red-50'}`}>
          <td
            className={`px-3.5 py-3 text-[14px] font-extrabold ${
              isProfit ? 'text-green-800' : 'text-red-800'
            }`}
          >
            Net Income
          </td>
          <td
            className={`px-3.5 py-3 text-right text-[14px] font-extrabold tabular-nums ${
              isProfit ? 'text-green-800' : 'text-red-800'
            }`}
          >
            {formatCurrency(data.totals.netIncome)}
          </td>
        </tr>
      </tbody>
    </table>
  )
}
```

- [ ] **Step 10: Verify TypeScript compiles cleanly**

```bash
cd frontend && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 11: Commit**

```bash
git add frontend/src/types/report.ts frontend/src/components/reports/IncomeStatementTable.tsx
git commit -m "feat: collapsible subtype breakdown rows in IncomeStatementTable"
```
