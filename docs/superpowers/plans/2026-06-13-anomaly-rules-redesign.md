# Anomaly Rules Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Strip AnomalyDetector to 3 reliable rules with a period-close-aware past-date check, add pre/post-close guards to PeriodClosingService, and block AJE submissions into locked periods.

**Architecture:** Clean up AnomalyDetector (remove dead/noisy rules 4–7, upgrade rule 8 to query period_closings). Extend PeriodClosingService with `assertPreCloseConditions()` and `assertPostCloseIntegrity()` private methods called from `executeClose()`, and tag original JEs with `period_closing_id` after close. Add closed-period check to `AdjustingEntryController::create()` and `submit()`.

**Tech Stack:** Laravel 11, PostgreSQL, PHPUnit (feature tests with RefreshDatabase)

---

## File Map

| File | Action |
|---|---|
| `backend/app/Services/Accounting/AnomalyDetector.php` | Modify — strip rules 4–7, upgrade rule 8, swap imports |
| `backend/app/Services/Accounting/PeriodClosingService.php` | Modify — add `assertPreCloseConditions()`, `assertPostCloseIntegrity()`, JE tagging, update `executeClose()` |
| `backend/app/Http/Controllers/AdjustingEntryController.php` | Modify — add closed-period guard to `create()` and `submit()` |
| `backend/tests/Feature/AnomalyDetectorTest.php` | Create |
| `backend/tests/Feature/PeriodClosingTest.php` | Modify — add 3 new tests |
| `backend/tests/Feature/AdjustingEntryTest.php` | Modify — add 2 new tests |

---

### Task 1: Upgrade AnomalyDetector

**Files:**
- Modify: `backend/app/Services/Accounting/AnomalyDetector.php`
- Create: `backend/tests/Feature/AnomalyDetectorTest.php`

- [ ] **Step 1: Create the test file with 6 tests**

Create `backend/tests/Feature/AnomalyDetectorTest.php`:

```php
<?php

namespace Tests\Feature;

use App\Models\Company;
use App\Models\Document;
use App\Models\PeriodClosing;
use App\Models\User;
use App\Services\Accounting\AnomalyDetector;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AnomalyDetectorTest extends TestCase
{
    use RefreshDatabase;

    private Company $company;
    private User $user;

    protected function setUp(): void
    {
        parent::setUp();
        $this->user    = User::factory()->create(['role' => 'accountant']);
        $this->company = Company::factory()->create(['accountant_id' => $this->user->id]);
    }

    private function makeDoc(array $attrs = []): Document
    {
        return Document::factory()->create(array_merge([
            'company_id'    => $this->company->id,
            'is_no_receipt' => false,
            'ref_number'    => null,
            'amount'        => null,
            'merchant_name' => null,
            'document_date' => Carbon::now()->toDateString(),
        ], $attrs));
    }

    public function test_manual_entry_is_always_yellow(): void
    {
        $doc    = $this->makeDoc(['is_no_receipt' => true]);
        $result = (new AnomalyDetector())->detect($doc);

        $this->assertSame('YELLOW', $result['flag']);
        $this->assertEmpty($result['reasons']);
    }

    public function test_document_dated_in_locked_period_is_red(): void
    {
        $closing            = new PeriodClosing(['company_id' => $this->company->id, 'period_year' => 2025, 'period_month' => 1]);
        $closing->closed_by = $this->user->id;
        $closing->closed_at = now();
        $closing->save();

        $doc    = $this->makeDoc(['document_date' => '2025-01-15']);
        $result = (new AnomalyDetector())->detect($doc);

        $this->assertSame('RED', $result['flag']);
        $this->assertContains('Transaction date is in a locked period — an adjusting entry is required', $result['reasons']);
    }

    public function test_document_dated_in_open_past_period_is_yellow(): void
    {
        $lastMonth = Carbon::now()->subMonthNoOverflow()->format('Y-m-15');
        $doc       = $this->makeDoc(['document_date' => $lastMonth]);
        $result    = (new AnomalyDetector())->detect($doc);

        $this->assertSame('YELLOW', $result['flag']);
        $this->assertContains('Transaction date is in a past period', $result['reasons']);
    }

    public function test_document_dated_in_current_month_has_no_period_flag(): void
    {
        $doc    = $this->makeDoc(['document_date' => Carbon::now()->toDateString()]);
        $result = (new AnomalyDetector())->detect($doc);

        $this->assertSame('GREEN', $result['flag']);
        $this->assertNotContains('Transaction date is in a past period', $result['reasons']);
        $this->assertNotContains('Transaction date is in a locked period — an adjusting entry is required', $result['reasons']);
    }

    public function test_duplicate_or_number_in_same_period_is_red(): void
    {
        Document::factory()->create([
            'company_id'    => $this->company->id,
            'ref_number'    => 'OR-2025-001',
            'document_date' => '2025-01-10',
            'status'        => 'approved',
        ]);

        $doc    = $this->makeDoc(['ref_number' => 'OR-2025-001', 'document_date' => '2025-01-20']);
        $result = (new AnomalyDetector())->detect($doc);

        $this->assertSame('RED', $result['flag']);
        $this->assertContains('Duplicate OR number', $result['reasons']);
    }

    public function test_same_amount_and_merchant_within_7_days_is_red(): void
    {
        Document::factory()->create([
            'company_id'    => $this->company->id,
            'amount'        => '500.00',
            'merchant_name' => 'Jollibee',
            'document_date' => Carbon::now()->subDays(3)->toDateString(),
            'status'        => 'approved',
        ]);

        $doc    = $this->makeDoc(['amount' => '500.00', 'merchant_name' => 'Jollibee']);
        $result = (new AnomalyDetector())->detect($doc);

        $this->assertSame('RED', $result['flag']);
        $this->assertContains('Possible duplicate — same amount and merchant within 7 days', $result['reasons']);
    }
}
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd backend && vendor/bin/phpunit tests/Feature/AnomalyDetectorTest.php`

Expected: `test_document_dated_in_locked_period_is_red` FAILS (rule doesn't exist), `test_document_dated_in_open_past_period_is_yellow` FAILS (currently returns RED).

- [ ] **Step 3: Replace AnomalyDetector.php**

Full replacement of `backend/app/Services/Accounting/AnomalyDetector.php`:

```php
<?php

namespace App\Services\Accounting;

use App\Models\Document;
use App\Models\PeriodClosing;
use Illuminate\Support\Carbon;

class AnomalyDetector
{
    public function detect(Document $doc): array
    {
        if ($doc->is_no_receipt) {
            return ['flag' => 'YELLOW', 'reasons' => []];
        }

        $reasons     = [];
        $softReasons = [];
        $company     = $doc->company;

        // RULE 1 — Duplicate OR Number
        if (
            $doc->ref_number !== null &&
            !str_starts_with($doc->ref_number, 'OCR-') &&
            !str_starts_with($doc->ref_number, 'MNL-')
        ) {
            $period = Carbon::parse($doc->document_date)->format('Y-m');
            $exists = Document::where('company_id', $company->id)
                ->where('id', '!=', $doc->id)
                ->where('ref_number', $doc->ref_number)
                ->whereRaw("to_char(document_date, 'YYYY-MM') = ?", [$period])
                ->where('status', '!=', 'rejected')
                ->exists();
            if ($exists) {
                $reasons[] = 'Duplicate OR number';
            }
        }

        // RULE 2 — Same Amount + Merchant within 7 Days
        if ($doc->amount !== null && $doc->merchant_name !== null) {
            $sevenDaysAgo = Carbon::parse($doc->document_date)->subDays(7);
            $duplicate    = Document::where('company_id', $company->id)
                ->where('id', '!=', $doc->id)
                ->where('amount', $doc->amount)
                ->where('merchant_name', $doc->merchant_name)
                ->whereBetween('document_date', [$sevenDaysAgo, Carbon::parse($doc->document_date)])
                ->where('status', '!=', 'rejected')
                ->exists();
            if ($duplicate) {
                $reasons[] = 'Possible duplicate — same amount and merchant within 7 days';
            }
        }

        // RULE 3 — Closed or Past-Period Date
        $txDate            = Carbon::parse($doc->document_date);
        $currentMonthStart = Carbon::now()->startOfMonth();

        if ($txDate->lt($currentMonthStart)) {
            $isClosed = PeriodClosing::where('company_id', $company->id)
                ->where('period_year', $txDate->year)
                ->where('period_month', $txDate->month)
                ->exists();

            if ($isClosed) {
                $reasons[] = 'Transaction date is in a locked period — an adjusting entry is required';
            } else {
                $softReasons[] = 'Transaction date is in a past period';
            }
        }

        if (count($reasons) > 0) {
            $flag = 'RED';
        } elseif (count($softReasons) > 0) {
            $flag = 'YELLOW';
        } else {
            $flag = 'GREEN';
        }

        return ['flag' => $flag, 'reasons' => array_merge($reasons, $softReasons)];
    }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd backend && vendor/bin/phpunit tests/Feature/AnomalyDetectorTest.php`

Expected: `OK (6 tests, ...)`

- [ ] **Step 5: Commit**

```bash
git add backend/app/Services/Accounting/AnomalyDetector.php backend/tests/Feature/AnomalyDetectorTest.php
git commit -m "feat(anomaly): strip noisy rules, add period-close-aware Rule 3"
```

---

### Task 2: Pre-close checks in PeriodClosingService

**Files:**
- Modify: `backend/app/Services/Accounting/PeriodClosingService.php`
- Modify: `backend/tests/Feature/PeriodClosingTest.php`

- [ ] **Step 1: Add two failing tests to PeriodClosingTest.php**

Add these two methods to the existing `PeriodClosingTest` class:

```php
public function test_execute_close_throws_when_income_summary_has_preexisting_balance(): void
{
    $this->postJournalEntry(2025, 1, 'income', 10000);

    $incomeSummary = Account::factory()->create([
        'company_id' => $this->company->id,
        'name'       => 'Income Summary',
        'type'       => 'equity',
        'code'       => '3900',
    ]);

    $je = JournalEntry::create([
        'company_id'  => $this->company->id,
        'entry_date'  => '2025-01-31',
        'description' => 'Manual IS entry',
        'status'      => 'posted',
        'posted_by'   => $this->accountant->id,
        'posted_at'   => now(),
    ]);
    JournalEntryLine::create([
        'journal_entry_id' => $je->id,
        'account_id'       => $incomeSummary->id,
        'credit'           => 5000,
    ]);

    $this->expectException(\RuntimeException::class);
    $this->expectExceptionMessage('Income Summary account has a pre-existing balance');

    app(PeriodClosingService::class)->executeClose($this->company, 2025, 1, $this->accountant);
}

public function test_execute_close_throws_when_draft_je_exists_in_period(): void
{
    $this->postJournalEntry(2025, 1, 'income', 10000);

    JournalEntry::create([
        'company_id'  => $this->company->id,
        'entry_date'  => '2025-01-20',
        'description' => 'Orphaned draft',
        'status'      => 'draft',
        'posted_by'   => $this->accountant->id,
        'posted_at'   => null,
    ]);

    $this->expectException(\RuntimeException::class);
    $this->expectExceptionMessage('journal');

    app(PeriodClosingService::class)->executeClose($this->company, 2025, 1, $this->accountant);
}
```

- [ ] **Step 2: Run to verify they fail**

Run: `cd backend && vendor/bin/phpunit tests/Feature/PeriodClosingTest.php --filter="test_execute_close_throws_when_income_summary|test_execute_close_throws_when_draft_je"`

Expected: Both FAIL.

- [ ] **Step 3: Add `Account` import and `assertPreCloseConditions` to PeriodClosingService**

Add `use App\Models\Account;` to the imports at the top of `PeriodClosingService.php` (it is not currently imported).

Add this private method to the class:

```php
private function assertPreCloseConditions(Company $company, int $year, int $month): void
{
    $start = Carbon::create($year, $month, 1)->startOfMonth();
    $end   = Carbon::create($year, $month, 1)->endOfMonth();

    $incomeSummary = Account::where('company_id', $company->id)
        ->where('name', 'Income Summary')
        ->first();

    if ($incomeSummary) {
        $netBalance = (float) JournalEntryLine::whereHas('journalEntry', function ($q) use ($company, $start, $end) {
                $q->where('company_id', $company->id)
                  ->whereBetween('entry_date', [$start, $end])
                  ->whereNull('period_closing_id');
            })
            ->where('account_id', $incomeSummary->id)
            ->selectRaw('COALESCE(SUM(credit), 0) - COALESCE(SUM(debit), 0) as net')
            ->value('net');

        if (abs($netBalance) > 0.01) {
            throw new \RuntimeException(
                "Income Summary account has a pre-existing balance of {$netBalance} — manual entries must be reversed before closing."
            );
        }
    }

    $draftCount = JournalEntry::where('company_id', $company->id)
        ->whereBetween('entry_date', [$start, $end])
        ->whereIn('status', ['draft', 'pending'])
        ->count();

    if ($draftCount > 0) {
        $label = $draftCount === 1 ? 'entry' : 'entries';
        throw new \RuntimeException(
            "{$draftCount} journal {$label} in this period are still in draft and will be permanently locked. Post or delete them before closing."
        );
    }
}
```

- [ ] **Step 4: Call assertPreCloseConditions from executeClose**

Inside `executeClose()`, in the `DB::transaction` closure, add the call after the inner status re-check and before `$closing->save()`:

```php
$innerStatus = $this->getMonthStatus($company, $year, $month);
if ($innerStatus !== 'ready') {
    throw new \RuntimeException("Cannot close period: status is '{$innerStatus}'.");
}

$this->assertPreCloseConditions($company, $year, $month);

$closing = new PeriodClosing([...
```

- [ ] **Step 5: Run all PeriodClosing tests**

Run: `cd backend && vendor/bin/phpunit tests/Feature/PeriodClosingTest.php`

Expected: `OK (all tests pass)`

- [ ] **Step 6: Commit**

```bash
git add backend/app/Services/Accounting/PeriodClosingService.php backend/tests/Feature/PeriodClosingTest.php
git commit -m "feat(period-closing): block close when Income Summary has balance or draft JEs exist"
```

---

### Task 3: Post-close assertions and original JE tagging

**Files:**
- Modify: `backend/app/Services/Accounting/PeriodClosingService.php`
- Modify: `backend/tests/Feature/PeriodClosingTest.php`

- [ ] **Step 1: Add one failing test to PeriodClosingTest.php**

Add this method to the `PeriodClosingTest` class:

```php
public function test_original_jes_are_tagged_with_closing_id_after_close(): void
{
    $je = $this->postJournalEntry(2025, 1, 'income', 48500);
    $this->postJournalEntry(2025, 1, 'expense', 10000);

    $closing = app(PeriodClosingService::class)->executeClose($this->company, 2025, 1, $this->accountant);

    $je->refresh();
    $this->assertSame($closing->id, $je->period_closing_id);
}
```

- [ ] **Step 2: Run to verify it fails**

Run: `cd backend && vendor/bin/phpunit tests/Feature/PeriodClosingTest.php --filter="test_original_jes_are_tagged_with_closing_id_after_close"`

Expected: FAIL — `period_closing_id` on the original JE is null.

- [ ] **Step 3: Add assertPostCloseIntegrity to PeriodClosingService**

Add this private method to `PeriodClosingService`:

```php
private function assertPostCloseIntegrity(
    JournalEntry $je1,
    JournalEntry $je2,
    Company $company,
    int $year,
    int $month
): void {
    $start = Carbon::create($year, $month, 1)->startOfMonth();
    $end   = Carbon::create($year, $month, 1)->endOfMonth();

    foreach ([$je1->id, $je2->id] as $jeId) {
        $totalDebit  = (float) JournalEntryLine::where('journal_entry_id', $jeId)->sum('debit');
        $totalCredit = (float) JournalEntryLine::where('journal_entry_id', $jeId)->sum('credit');
        if (abs($totalDebit - $totalCredit) > 0.01) {
            throw new \RuntimeException(
                "Closing entry {$jeId} is unbalanced (Dr {$totalDebit} ≠ Cr {$totalCredit}) — this is a system error."
            );
        }
    }

    $orphanCount = JournalEntry::where('company_id', $company->id)
        ->whereBetween('entry_date', [$start, $end])
        ->where('status', 'posted')
        ->whereNull('period_closing_id')
        ->count();

    if ($orphanCount > 0) {
        $label = $orphanCount === 1 ? 'entry' : 'entries';
        throw new \RuntimeException(
            "{$orphanCount} posted journal {$label} in this period were not captured by the closing — data integrity error."
        );
    }
}
```

- [ ] **Step 4: Add JE tagging and assertPostCloseIntegrity call to executeClose**

Inside `executeClose()`, in the DB transaction, after all `JournalEntryLine::create()` calls for `$je2` and before `return $closing;`, add:

```php
// Tag all original posted JEs in this period so they're traceable to this closing
JournalEntry::where('company_id', $company->id)
    ->whereBetween('entry_date', [$start, $end])
    ->where('status', 'posted')
    ->whereNull('period_closing_id')
    ->update(['period_closing_id' => $closing->id]);

$this->assertPostCloseIntegrity($je1, $je2, $company, $year, $month);

return $closing;
```

Note: `$je1` and `$je2` were created with `period_closing_id` already set, so the bulk update's `whereNull('period_closing_id')` filter will not touch them. After the bulk update, Check D will find zero orphans in a clean close.

- [ ] **Step 5: Run all PeriodClosing tests**

Run: `cd backend && vendor/bin/phpunit tests/Feature/PeriodClosingTest.php`

Expected: `OK (all tests pass)`

- [ ] **Step 6: Commit**

```bash
git add backend/app/Services/Accounting/PeriodClosingService.php backend/tests/Feature/PeriodClosingTest.php
git commit -m "feat(period-closing): tag original JEs with closing ID and assert post-close integrity"
```

---

### Task 4: AJE closed-period guard

**Files:**
- Modify: `backend/app/Http/Controllers/AdjustingEntryController.php`
- Modify: `backend/tests/Feature/AdjustingEntryTest.php`

- [ ] **Step 1: Add two failing tests to AdjustingEntryTest.php**

Add `use App\Models\PeriodClosing;` to the existing imports at the top of `AdjustingEntryTest.php`.

Then add these two test methods to the class (setUp uses `$this->accountant`, `$this->company`, `$this->debitAccount`, `$this->creditAccount`):

```php
public function test_create_returns_422_when_period_is_closed(): void
{
    $closing            = new PeriodClosing(['company_id' => $this->company->id, 'period_year' => 2025, 'period_month' => 1]);
    $closing->closed_by = $this->accountant->id;
    $closing->closed_at = now();
    $closing->save();

    $this->actingAs($this->accountant, 'sanctum')
         ->postJson('/api/adjusting-entries', [
             'companyId' => $this->company->id,
             'type'      => 'accrual',
             'date'      => '2025-01-31',
             'memo'      => 'Test',
             'lines'     => [
                 ['accountId' => $this->debitAccount->id,  'debit' => 1000, 'credit' => null, 'description' => null],
                 ['accountId' => $this->creditAccount->id, 'debit' => null, 'credit' => 1000, 'description' => null],
             ],
         ])
         ->assertUnprocessable()
         ->assertJsonFragment(['message' => 'The period Jan 2025 is locked. Adjusting entries cannot be posted to a closed period.']);
}

public function test_submit_returns_422_when_period_is_closed(): void
{
    $entry = AdjustingEntry::factory()->create([
        'company_id' => $this->company->id,
        'created_by' => $this->accountant->id,
        'status'     => 'draft',
        'entry_date' => '2025-01-31',
    ]);

    $closing            = new PeriodClosing(['company_id' => $this->company->id, 'period_year' => 2025, 'period_month' => 1]);
    $closing->closed_by = $this->accountant->id;
    $closing->closed_at = now();
    $closing->save();

    $this->actingAs($this->accountant, 'sanctum')
         ->postJson("/api/adjusting-entries/{$entry->id}/submit")
         ->assertUnprocessable()
         ->assertJsonFragment(['message' => 'The period Jan 2025 is locked. Adjusting entries cannot be posted to a closed period.']);
}
```

- [ ] **Step 2: Run to verify they fail**

Run: `cd backend && vendor/bin/phpunit tests/Feature/AdjustingEntryTest.php --filter="test_create_returns_422_when_period_is_closed|test_submit_returns_422_when_period_is_closed"`

Expected: Both FAIL (guard not yet in controller).

- [ ] **Step 3: Add guard to AdjustingEntryController**

Add these imports at the top of `AdjustingEntryController.php` if not already present:

```php
use App\Models\PeriodClosing;
use Illuminate\Support\Carbon;
```

In `create()`, after the accountant scope check (`if ($user->role === 'accountant' && ...) { return 403; }`) and before `$ref = ...`, add:

```php
$year  = Carbon::parse($request->date)->year;
$month = Carbon::parse($request->date)->month;
if (PeriodClosing::where('company_id', $company->id)
    ->where('period_year', $year)
    ->where('period_month', $month)
    ->exists()
) {
    $label = Carbon::create($year, $month, 1)->format('M Y');
    return response()->json([
        'message' => "The period {$label} is locked. Adjusting entries cannot be posted to a closed period.",
    ], 422);
}
```

In `submit()`, after the debit/credit balance check (`if (abs($debitTotal - $creditTotal) >= 0.01) { return 422; }`) and before `if ($request->boolean('selfApprove'))`, add:

```php
$year  = $entry->entry_date->year;
$month = $entry->entry_date->month;
if (PeriodClosing::where('company_id', $entry->company_id)
    ->where('period_year', $year)
    ->where('period_month', $month)
    ->exists()
) {
    $label = Carbon::create($year, $month, 1)->format('M Y');
    return response()->json([
        'message' => "The period {$label} is locked. Adjusting entries cannot be posted to a closed period.",
    ], 422);
}
```

- [ ] **Step 4: Run AdjustingEntry tests**

Run: `cd backend && vendor/bin/phpunit tests/Feature/AdjustingEntryTest.php`

Expected: `OK (all tests pass)`

- [ ] **Step 5: Run the full test suite to check for regressions**

Run: `cd backend && vendor/bin/phpunit`

Expected: `OK` — no regressions across AnomalyDetectorTest, PeriodClosingTest, AdjustingEntryTest, or any other suite.

- [ ] **Step 6: Commit**

```bash
git add backend/app/Http/Controllers/AdjustingEntryController.php backend/tests/Feature/AdjustingEntryTest.php
git commit -m "feat(adjusting-entry): block create and submit when period is locked"
```
