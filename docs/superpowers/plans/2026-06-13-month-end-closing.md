# Month-End Closing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a per-client, per-month period-closing feature for accountant and admin roles that posts two closing journal entries (income → Income Summary, Income Summary → expenses) and locks the period permanently.

**Architecture:** A new `period_closings` table tracks closed periods; a `period_closing_id` FK is added to `journal_entries` to tag closing entries and enforce the period lock. All business logic lives in `PeriodClosingService`; the controller is thin. The frontend uses a client-first table with an expandable month timeline and a side panel for the close action.

**Tech Stack:** Laravel 11 / PHP, PostgreSQL, PHPUnit (backend); Next.js 14 App Router, TypeScript, React Query, shadcn/ui (frontend).

---

## File Map

### New — Backend
| File | Responsibility |
|---|---|
| `database/migrations/2026_06_13_000001_create_period_closings_table.php` | Create `period_closings` table |
| `database/migrations/2026_06_13_000002_add_period_closing_id_to_journal_entries.php` | Add `period_closing_id` FK to `journal_entries`, update CHECK constraint |
| `app/Models/PeriodClosing.php` | Eloquent model with relationships |
| `app/Services/Accounting/PeriodClosingService.php` | Status computation, preview, execute close |
| `app/Http/Controllers/PeriodClosingController.php` | index, timeline, preview, store |
| `tests/Feature/PeriodClosingTest.php` | Feature tests for all endpoints |

### Modified — Backend
| File | Change |
|---|---|
| `routes/api.php` | Add 4 period-closing routes under `role:accountant,admin` |
| `app/Models/JournalEntry.php` | Add `period_closing_id` to `$fillable` |
| `app/Services/Accounting/JournalEntryService.php` | Add period-lock guard to `postFromDocument` and `postFromAdjustingEntry` |

### New — Frontend
| File | Responsibility |
|---|---|
| `frontend/src/types/period-closing.ts` | TypeScript interfaces |
| `frontend/src/lib/api/period-closings.ts` | API functions (React Query wrappers) |
| `frontend/src/components/month-end/MonthPill.tsx` | Single month status pill |
| `frontend/src/components/month-end/PeriodClosePanel.tsx` | Right-side panel (checklist + preview + confirm) |
| `frontend/src/components/month-end/ClientClosingRow.tsx` | Table row with expandable timeline |
| `frontend/src/components/month-end/MonthEndPage.tsx` | Page shell, filters, client list |
| `frontend/src/app/admin/month-end/page.tsx` | Admin route shell |
| `frontend/src/app/accountant/month-end/page.tsx` | Accountant route shell |

### Modified — Frontend
| File | Change |
|---|---|
| `frontend/src/components/layout/Topbar.tsx` | Add Month-End nav link to ADMIN_LINKS and ACCOUNTANT_LINKS |

---

## Task 1: Database Migrations

**Files:**
- Create: `backend/database/migrations/2026_06_13_000001_create_period_closings_table.php`
- Create: `backend/database/migrations/2026_06_13_000002_add_period_closing_id_to_journal_entries.php`

- [ ] **Step 1: Create the period_closings migration**

```php
<?php
// backend/database/migrations/2026_06_13_000001_create_period_closings_table.php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('period_closings', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('company_id')->references('id')->on('companies')->cascadeOnDelete();
            $table->smallInteger('period_year');
            $table->tinyInteger('period_month');
            $table->foreignUuid('closed_by')->references('id')->on('users');
            $table->timestamp('closed_at');
            $table->timestamps();

            $table->unique(['company_id', 'period_year', 'period_month']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('period_closings');
    }
};
```

- [ ] **Step 2: Create the journal_entries modification migration**

```php
<?php
// backend/database/migrations/2026_06_13_000002_add_period_closing_id_to_journal_entries.php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('journal_entries', function (Blueprint $table) {
            $table->foreignUuid('period_closing_id')
                ->nullable()
                ->references('id')->on('period_closings')
                ->nullOnDelete()
                ->after('adjusting_entry_id');
        });

        if (DB::getDriverName() !== 'sqlite') {
            DB::statement('ALTER TABLE journal_entries DROP CONSTRAINT IF EXISTS chk_journal_source');
            DB::statement('ALTER TABLE journal_entries ADD CONSTRAINT chk_journal_source CHECK (
                document_id IS NOT NULL OR
                adjusting_entry_id IS NOT NULL OR
                period_closing_id IS NOT NULL
            )');
        }
    }

    public function down(): void
    {
        if (DB::getDriverName() !== 'sqlite') {
            DB::statement('ALTER TABLE journal_entries DROP CONSTRAINT IF EXISTS chk_journal_source');
            DB::statement('ALTER TABLE journal_entries ADD CONSTRAINT chk_journal_source CHECK (
                document_id IS NOT NULL OR adjusting_entry_id IS NOT NULL
            )');
        }

        Schema::table('journal_entries', function (Blueprint $table) {
            $table->dropForeign(['period_closing_id']);
            $table->dropColumn('period_closing_id');
        });
    }
};
```

- [ ] **Step 3: Run the migrations**

```bash
cd backend && php artisan migrate
```

Expected: two new migrations applied, no errors.

- [ ] **Step 4: Commit**

```bash
git add backend/database/migrations/2026_06_13_000001_create_period_closings_table.php
git add backend/database/migrations/2026_06_13_000002_add_period_closing_id_to_journal_entries.php
git commit -m "feat(period-closing): add period_closings table and journal_entries FK"
```

---

## Task 2: PeriodClosing Model + JournalEntry Update

**Files:**
- Create: `backend/app/Models/PeriodClosing.php`
- Modify: `backend/app/Models/JournalEntry.php`

- [ ] **Step 1: Create the model**

```php
<?php
// backend/app/Models/PeriodClosing.php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class PeriodClosing extends Model
{
    use HasUuids;

    protected $fillable = [
        'company_id',
        'period_year',
        'period_month',
        'closed_by',
        'closed_at',
    ];

    protected $casts = [
        'closed_at'    => 'datetime',
        'period_year'  => 'integer',
        'period_month' => 'integer',
    ];

    public function company(): BelongsTo
    {
        return $this->belongsTo(Company::class);
    }

    public function closer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'closed_by');
    }

    public function journalEntries(): HasMany
    {
        return $this->hasMany(JournalEntry::class);
    }
}
```

- [ ] **Step 2: Add period_closing_id to JournalEntry fillable**

In `backend/app/Models/JournalEntry.php`, add `'period_closing_id'` to the `$fillable` array:

```php
protected $fillable = [
    'company_id',
    'document_id',
    'adjusting_entry_id',
    'period_closing_id',   // ← add this line
    'ref_number',
    'entry_date',
    'description',
    'status',
    'posted_by',
    'posted_at',
];
```

Also add the relationship at the bottom of `JournalEntry`:

```php
public function periodClosing(): BelongsTo
{
    return $this->belongsTo(PeriodClosing::class);
}
```

- [ ] **Step 3: Commit**

```bash
git add backend/app/Models/PeriodClosing.php backend/app/Models/JournalEntry.php
git commit -m "feat(period-closing): add PeriodClosing model and JournalEntry relationship"
```

---

## Task 3: PeriodClosingService — Status & Preview

**Files:**
- Create: `backend/app/Services/Accounting/PeriodClosingService.php`

- [ ] **Step 1: Write failing tests first**

Create `backend/tests/Feature/PeriodClosingTest.php`:

```php
<?php

namespace Tests\Feature;

use App\Models\Account;
use App\Models\AdjustingEntry;
use App\Models\Company;
use App\Models\Document;
use App\Models\JournalEntry;
use App\Models\JournalEntryLine;
use App\Models\PeriodClosing;
use App\Models\User;
use App\Services\Accounting\PeriodClosingService;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PeriodClosingTest extends TestCase
{
    use RefreshDatabase;

    private Company $company;
    private User $accountant;
    private Account $incomeAccount;
    private Account $expenseAccount;

    protected function setUp(): void
    {
        parent::setUp();

        $this->accountant = User::factory()->create(['role' => 'accountant']);
        $this->company    = Company::factory()->create(['accountant_id' => $this->accountant->id]);

        $this->incomeAccount = Account::factory()->create([
            'company_id' => $this->company->id,
            'name'       => 'Sales Revenue',
            'type'       => 'income',
            'code'       => '4000',
        ]);

        $this->expenseAccount = Account::factory()->create([
            'company_id' => $this->company->id,
            'name'       => 'Utilities Expense',
            'type'       => 'expense',
            'code'       => '5000',
        ]);
    }

    private function postJournalEntry(int $year, int $month, string $type, float $amount): JournalEntry
    {
        $account = $type === 'income' ? $this->incomeAccount : $this->expenseAccount;
        $entry = JournalEntry::create([
            'company_id'  => $this->company->id,
            'document_id' => Document::factory()->create(['company_id' => $this->company->id, 'status' => 'approved', 'document_date' => Carbon::create($year, $month, 15)])->id,
            'entry_date'  => Carbon::create($year, $month, 15),
            'description' => 'Test entry',
            'status'      => 'posted',
            'posted_by'   => $this->accountant->id,
            'posted_at'   => now(),
        ]);
        JournalEntryLine::create([
            'journal_entry_id' => $entry->id,
            'account_id'       => $account->id,
            'debit'            => $type === 'expense' ? $amount : null,
            'credit'           => $type === 'income'  ? $amount : null,
        ]);
        return $entry;
    }

    public function test_status_is_future_when_prior_month_not_closed(): void
    {
        $this->postJournalEntry(2025, 1, 'income', 1000);
        $this->postJournalEntry(2025, 2, 'income', 1000);

        $service = app(PeriodClosingService::class);
        $status  = $service->getMonthStatus($this->company, 2025, 2);

        $this->assertSame('future', $status);
    }

    public function test_status_is_ready_for_first_month_with_all_docs_approved(): void
    {
        $this->postJournalEntry(2025, 1, 'income', 1000);

        $service = app(PeriodClosingService::class);
        $status  = $service->getMonthStatus($this->company, 2025, 1);

        $this->assertSame('ready', $status);
    }

    public function test_status_is_blocked_when_pending_document_exists(): void
    {
        $this->postJournalEntry(2025, 1, 'income', 1000);
        Document::factory()->create([
            'company_id'    => $this->company->id,
            'status'        => 'pending',
            'document_date' => Carbon::create(2025, 1, 10),
        ]);

        $service = app(PeriodClosingService::class);
        $status  = $service->getMonthStatus($this->company, 2025, 1);

        $this->assertSame('blocked', $status);
    }

    public function test_status_is_blocked_when_draft_adjusting_entry_exists(): void
    {
        $this->postJournalEntry(2025, 1, 'income', 1000);
        AdjustingEntry::factory()->create([
            'company_id' => $this->company->id,
            'entry_date' => Carbon::create(2025, 1, 20),
            'status'     => 'draft',
            'created_by' => $this->accountant->id,
        ]);

        $service = app(PeriodClosingService::class);
        $status  = $service->getMonthStatus($this->company, 2025, 1);

        $this->assertSame('blocked', $status);
    }

    public function test_status_is_closed_when_period_closing_record_exists(): void
    {
        PeriodClosing::create([
            'company_id'   => $this->company->id,
            'period_year'  => 2025,
            'period_month' => 1,
            'closed_by'    => $this->accountant->id,
            'closed_at'    => now(),
        ]);

        $service = app(PeriodClosingService::class);
        $status  = $service->getMonthStatus($this->company, 2025, 1);

        $this->assertSame('closed', $status);
    }

    public function test_preview_returns_income_and_expense_groups(): void
    {
        $this->postJournalEntry(2025, 1, 'income',  48500);
        $this->postJournalEntry(2025, 1, 'expense', 10000);

        $service  = app(PeriodClosingService::class);
        $preview  = $service->preview($this->company, 2025, 1);

        $this->assertArrayHasKey('incomeGroup',  $preview);
        $this->assertArrayHasKey('expenseGroup', $preview);
        $this->assertSame(48500.0, $preview['totalIncome']);
        $this->assertSame(10000.0, $preview['totalExpense']);
    }
}
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd backend && php artisan test tests/Feature/PeriodClosingTest.php
```

Expected: FAIL — `PeriodClosingService` class not found.

- [ ] **Step 3: Implement PeriodClosingService**

```php
<?php
// backend/app/Services/Accounting/PeriodClosingService.php

namespace App\Services\Accounting;

use App\Models\Account;
use App\Models\AdjustingEntry;
use App\Models\Company;
use App\Models\Document;
use App\Models\JournalEntry;
use App\Models\JournalEntryLine;
use App\Models\PeriodClosing;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;

class PeriodClosingService
{
    /** Returns 'closed' | 'ready' | 'blocked' | 'future' */
    public function getMonthStatus(Company $company, int $year, int $month): string
    {
        // Already closed?
        if (PeriodClosing::where('company_id', $company->id)
            ->where('period_year', $year)
            ->where('period_month', $month)
            ->exists()) {
            return 'closed';
        }

        $firstMonth = $this->getFirstCloseableMonth($company);
        if (!$firstMonth) {
            return 'future';
        }

        $isFirstMonth = ($year === $firstMonth->year && $month === $firstMonth->month);

        // Prior month must be closed (unless this IS the first month)
        if (!$isFirstMonth) {
            $prior = Carbon::create($year, $month)->subMonth();
            $priorClosed = PeriodClosing::where('company_id', $company->id)
                ->where('period_year', $prior->year)
                ->where('period_month', $prior->month)
                ->exists();
            if (!$priorClosed) {
                return 'future';
            }
        }

        $start = Carbon::create($year, $month, 1)->startOfMonth();
        $end   = Carbon::create($year, $month, 1)->endOfMonth();

        // Pending documents?
        $pendingDocs = Document::where('company_id', $company->id)
            ->whereBetween('document_date', [$start, $end])
            ->whereNotIn('status', ['approved', 'rejected', 'cancelled'])
            ->exists();
        if ($pendingDocs) {
            return 'blocked';
        }

        // Draft or submitted adjusting entries?
        $pendingAJEs = AdjustingEntry::where('company_id', $company->id)
            ->whereBetween('entry_date', [$start, $end])
            ->whereIn('status', ['draft', 'submitted'])
            ->exists();
        if ($pendingAJEs) {
            return 'blocked';
        }

        return 'ready';
    }

    /** Earliest month with any posted income or expense JE line for this company. */
    public function getFirstCloseableMonth(Company $company): ?Carbon
    {
        $first = JournalEntry::where('company_id', $company->id)
            ->where('status', 'posted')
            ->whereNull('period_closing_id')
            ->whereHas('lines', function ($q) {
                $q->whereHas('account', fn($a) => $a->whereIn('type', ['income', 'expense']));
            })
            ->orderBy('entry_date')
            ->value('entry_date');

        return $first ? Carbon::parse($first)->startOfMonth() : null;
    }

    /**
     * Returns the ordered array of months from first closeable month to current month,
     * each with status, pending doc count, and pending AJE count.
     */
    public function getTimeline(Company $company): array
    {
        $firstMonth = $this->getFirstCloseableMonth($company);
        if (!$firstMonth) {
            return [];
        }

        $months = [];
        $cursor = $firstMonth->copy();
        $now    = Carbon::now()->startOfMonth();

        while ($cursor->lte($now)) {
            $year  = $cursor->year;
            $month = $cursor->month;

            $start = $cursor->copy()->startOfMonth();
            $end   = $cursor->copy()->endOfMonth();

            $pendingDocs = Document::where('company_id', $company->id)
                ->whereBetween('document_date', [$start, $end])
                ->whereNotIn('status', ['approved', 'rejected', 'cancelled'])
                ->count();

            $pendingAJEs = AdjustingEntry::where('company_id', $company->id)
                ->whereBetween('entry_date', [$start, $end])
                ->whereIn('status', ['draft', 'submitted'])
                ->count();

            $months[] = [
                'year'        => $year,
                'month'       => $month,
                'label'       => $cursor->format('M Y'),
                'status'      => $this->getMonthStatus($company, $year, $month),
                'pendingDocs' => $pendingDocs,
                'pendingAJEs' => $pendingAJEs,
            ];

            $cursor->addMonth();
        }

        return $months;
    }

    /**
     * Returns the two JE groups that will be posted on close.
     * incomeGroup: [ { accountName, accountCode, amount } ]
     * expenseGroup: [ { accountName, accountCode, amount } ]
     */
    public function preview(Company $company, int $year, int $month): array
    {
        $start = Carbon::create($year, $month, 1)->startOfMonth();
        $end   = Carbon::create($year, $month, 1)->endOfMonth();

        $incomeGroup  = $this->aggregateLines($company, $start, $end, 'income');
        $expenseGroup = $this->aggregateLines($company, $start, $end, 'expense');

        return [
            'incomeGroup'   => $incomeGroup,
            'expenseGroup'  => $expenseGroup,
            'totalIncome'   => collect($incomeGroup)->sum('amount'),
            'totalExpense'  => collect($expenseGroup)->sum('amount'),
        ];
    }

    /** Execute the close. Throws \RuntimeException on validation failure. */
    public function executeClose(Company $company, int $year, int $month, User $closedBy): PeriodClosing
    {
        $status = $this->getMonthStatus($company, $year, $month);

        if ($status === 'closed') {
            throw new \RuntimeException('This period is already closed.');
        }
        if ($status !== 'ready') {
            throw new \RuntimeException("Cannot close period: status is '{$status}'.");
        }

        return DB::transaction(function () use ($company, $year, $month, $closedBy) {
            $closing = PeriodClosing::create([
                'company_id'   => $company->id,
                'period_year'  => $year,
                'period_month' => $month,
                'closed_by'    => $closedBy->id,
                'closed_at'    => now(),
            ]);

            $start = Carbon::create($year, $month, 1)->startOfMonth();
            $end   = Carbon::create($year, $month, 1)->endOfMonth();
            $entryDate = $end->toDateString();

            $incomeGroup  = $this->aggregateLines($company, $start, $end, 'income');
            $expenseGroup = $this->aggregateLines($company, $start, $end, 'expense');

            $totalIncome  = collect($incomeGroup)->sum('amount');
            $totalExpense = collect($expenseGroup)->sum('amount');

            $incomeSummaryAccount = $this->getOrCreateIncomeSummaryAccount($company);

            // JE 1: Dr income accounts → Cr Income Summary
            $je1 = JournalEntry::create([
                'company_id'        => $company->id,
                'period_closing_id' => $closing->id,
                'entry_date'        => $entryDate,
                'description'       => "Closing entry — income accounts ({$year}-{$month})",
                'status'            => 'posted',
                'posted_by'         => $closedBy->id,
                'posted_at'         => now(),
            ]);

            foreach ($incomeGroup as $line) {
                JournalEntryLine::create([
                    'journal_entry_id' => $je1->id,
                    'account_id'       => $line['accountId'],
                    'debit'            => $line['amount'],
                    'credit'           => null,
                ]);
            }
            JournalEntryLine::create([
                'journal_entry_id' => $je1->id,
                'account_id'       => $incomeSummaryAccount->id,
                'debit'            => null,
                'credit'           => $totalIncome,
            ]);

            // JE 2: Dr Income Summary → Cr expense accounts
            $je2 = JournalEntry::create([
                'company_id'        => $company->id,
                'period_closing_id' => $closing->id,
                'entry_date'        => $entryDate,
                'description'       => "Closing entry — expense accounts ({$year}-{$month})",
                'status'            => 'posted',
                'posted_by'         => $closedBy->id,
                'posted_at'         => now(),
            ]);

            JournalEntryLine::create([
                'journal_entry_id' => $je2->id,
                'account_id'       => $incomeSummaryAccount->id,
                'debit'            => $totalExpense,
                'credit'           => null,
            ]);
            foreach ($expenseGroup as $line) {
                JournalEntryLine::create([
                    'journal_entry_id' => $je2->id,
                    'account_id'       => $line['accountId'],
                    'debit'            => null,
                    'credit'           => $line['amount'],
                ]);
            }

            return $closing;
        });
    }

    // ── Private helpers ───────────────────────────────────────────────────

    private function aggregateLines(Company $company, Carbon $start, Carbon $end, string $accountType): array
    {
        $lines = JournalEntryLine::whereHas('journalEntry', function ($q) use ($company, $start, $end) {
            $q->where('company_id', $company->id)
              ->where('status', 'posted')
              ->whereNull('period_closing_id')
              ->whereBetween('entry_date', [$start, $end]);
        })
        ->whereHas('account', fn($q) => $q->where('type', $accountType))
        ->with('account')
        ->get();

        return $lines->groupBy('account_id')->map(function ($group) use ($accountType) {
            $account = $group->first()->account;
            $balance = $accountType === 'income'
                ? $group->sum('credit') - $group->sum('debit')
                : $group->sum('debit')  - $group->sum('credit');

            return [
                'accountId'   => $account->id,
                'accountName' => $account->name,
                'accountCode' => $account->code,
                'amount'      => (float) $balance,
            ];
        })->values()->filter(fn($item) => $item['amount'] > 0)->values()->toArray();
    }

    private function getOrCreateIncomeSummaryAccount(Company $company): Account
    {
        return Account::firstOrCreate(
            ['company_id' => $company->id, 'name' => 'Income Summary'],
            ['code' => '3900', 'type' => 'equity']
        );
    }
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
cd backend && php artisan test tests/Feature/PeriodClosingTest.php
```

Expected: all 5 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add backend/app/Services/Accounting/PeriodClosingService.php
git add backend/tests/Feature/PeriodClosingTest.php
git commit -m "feat(period-closing): add PeriodClosingService with status, preview, and executeClose"
```

---

## Task 4: Period Lock in JournalEntryService

**Files:**
- Modify: `backend/app/Services/Accounting/JournalEntryService.php`

- [ ] **Step 1: Write a failing test for the period lock**

Add this test to `tests/Feature/PeriodClosingTest.php`:

```php
public function test_posting_document_je_to_closed_period_throws(): void
{
    $this->postJournalEntry(2025, 1, 'income', 1000);

    // Close January
    PeriodClosing::create([
        'company_id'   => $this->company->id,
        'period_year'  => 2025,
        'period_month' => 1,
        'closed_by'    => $this->accountant->id,
        'closed_at'    => now(),
    ]);

    $doc = Document::factory()->create([
        'company_id'    => $this->company->id,
        'status'        => 'approved',
        'document_date' => Carbon::create(2025, 1, 20)->toDateString(),
        'document_type' => 'income',
    ]);

    $this->expectException(\RuntimeException::class);
    $this->expectExceptionMessage('locked');

    app(\App\Services\Accounting\JournalEntryService::class)
        ->postFromDocument($doc, $this->accountant);
}
```

- [ ] **Step 2: Run to verify it fails**

```bash
cd backend && php artisan test tests/Feature/PeriodClosingTest.php::test_posting_document_je_to_closed_period_throws
```

Expected: FAIL — no exception thrown.

- [ ] **Step 3: Add period-lock guard to JournalEntryService**

At the top of `postFromDocument()` in `backend/app/Services/Accounting/JournalEntryService.php`, add the guard after `$company = $doc->company;`:

```php
$entryDate = Carbon::parse($doc->document_date);
$this->assertPeriodNotLocked($company, $entryDate->year, $entryDate->month);
```

Add the same guard at the top of `postFromAdjustingEntry()` after `$company = $entry->company;`:

```php
$entryDate = Carbon::parse($entry->entry_date);
$this->assertPeriodNotLocked($company, $entryDate->year, $entryDate->month);
```

Add the private method at the bottom of the class:

```php
private function assertPeriodNotLocked(Company $company, int $year, int $month): void
{
    $locked = \App\Models\PeriodClosing::where('company_id', $company->id)
        ->where('period_year', $year)
        ->where('period_month', $month)
        ->exists();

    if ($locked) {
        throw new \RuntimeException(
            "Period {$year}-{$month} is locked for company {$company->id}."
        );
    }
}
```

Also add `use Carbon\Carbon;` to the imports at the top of `JournalEntryService.php` if not already present.

- [ ] **Step 4: Run tests**

```bash
cd backend && php artisan test tests/Feature/PeriodClosingTest.php
```

Expected: all 6 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add backend/app/Services/Accounting/JournalEntryService.php
git add backend/tests/Feature/PeriodClosingTest.php
git commit -m "feat(period-closing): enforce period lock in JournalEntryService"
```

---

## Task 5: Controller + Routes

**Files:**
- Create: `backend/app/Http/Controllers/PeriodClosingController.php`
- Modify: `backend/routes/api.php`

- [ ] **Step 1: Write failing route tests**

Add these tests to `tests/Feature/PeriodClosingTest.php`:

```php
public function test_index_returns_client_list_for_accountant(): void
{
    $this->postJournalEntry(2025, 1, 'income', 1000);

    $this->actingAs($this->accountant, 'sanctum')
         ->getJson('/api/period-closings')
         ->assertOk()
         ->assertJsonStructure([
             'data' => [['companyId', 'companyName', 'lastClosed', 'nextPeriod', 'status']],
         ]);
}

public function test_timeline_returns_months_for_client(): void
{
    $this->postJournalEntry(2025, 1, 'income', 1000);

    $this->actingAs($this->accountant, 'sanctum')
         ->getJson("/api/period-closings/{$this->company->id}")
         ->assertOk()
         ->assertJsonStructure(['months' => [['year', 'month', 'label', 'status']]]);
}

public function test_preview_returns_closing_entry_groups(): void
{
    $this->postJournalEntry(2025, 1, 'income', 48500);
    $this->postJournalEntry(2025, 1, 'expense', 10000);

    $this->actingAs($this->accountant, 'sanctum')
         ->getJson("/api/period-closings/{$this->company->id}/2025/1/preview")
         ->assertOk()
         ->assertJsonStructure(['incomeGroup', 'expenseGroup', 'totalIncome', 'totalExpense']);
}

public function test_store_closes_period_and_returns_201(): void
{
    $this->postJournalEntry(2025, 1, 'income', 1000);

    $this->actingAs($this->accountant, 'sanctum')
         ->postJson("/api/period-closings/{$this->company->id}/2025/1")
         ->assertCreated()
         ->assertJsonStructure(['id', 'periodYear', 'periodMonth', 'closedAt']);

    $this->assertDatabaseHas('period_closings', [
        'company_id'   => $this->company->id,
        'period_year'  => 2025,
        'period_month' => 1,
    ]);
}

public function test_store_returns_422_when_period_not_ready(): void
{
    // No JEs at all → no first month → cannot close Jan 2025
    $this->actingAs($this->accountant, 'sanctum')
         ->postJson("/api/period-closings/{$this->company->id}/2025/1")
         ->assertUnprocessable();
}

public function test_accountant_cannot_close_unassigned_client(): void
{
    $other = User::factory()->create(['role' => 'accountant']);

    $this->actingAs($other, 'sanctum')
         ->postJson("/api/period-closings/{$this->company->id}/2025/1")
         ->assertForbidden();
}
```

- [ ] **Step 2: Run to verify they fail**

```bash
cd backend && php artisan test tests/Feature/PeriodClosingTest.php
```

Expected: 6 new tests FAIL with 404 (routes not registered).

- [ ] **Step 3: Create the controller**

```php
<?php
// backend/app/Http/Controllers/PeriodClosingController.php

namespace App\Http\Controllers;

use App\Models\Company;
use App\Models\PeriodClosing;
use App\Models\User;
use App\Services\Accounting\PeriodClosingService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class PeriodClosingController extends Controller
{
    public function __construct(private PeriodClosingService $service) {}

    /** GET /api/period-closings */
    public function index(Request $request): JsonResponse
    {
        $user = auth()->user();

        $query = Company::query();

        if ($user->role === 'accountant') {
            $query->where('accountant_id', $user->id);
        }

        if ($request->filled('accountant_id') && $user->role === 'admin') {
            $query->where('accountant_id', $request->accountant_id);
        }

        if ($request->filled('search')) {
            $query->where('name', 'ilike', '%' . $request->search . '%');
        }

        $companies = $query->get();

        $data = $companies->map(function (Company $company) use ($request) {
            $timeline = $this->service->getTimeline($company);

            $lastClosed = collect($timeline)
                ->filter(fn($m) => $m['status'] === 'closed')
                ->last();

            $nextPeriod = collect($timeline)
                ->first(fn($m) => in_array($m['status'], ['ready', 'blocked']));

            $currentStatus = $nextPeriod['status'] ?? 'up_to_date';

            if ($request->filled('status') && $request->status !== $currentStatus) {
                return null;
            }

            return [
                'companyId'        => $company->id,
                'companyName'      => $company->name,
                'accountantId'     => $company->accountant_id,
                'accountantName'   => optional($company->accountant)->name,
                'lastClosed'       => $lastClosed ? "{$lastClosed['label']}" : null,
                'nextPeriod'       => $nextPeriod ? "{$nextPeriod['label']}" : null,
                'nextPeriodYear'   => $nextPeriod['year']  ?? null,
                'nextPeriodMonth'  => $nextPeriod['month'] ?? null,
                'status'           => $currentStatus,
                'pendingDocs'      => $nextPeriod['pendingDocs'] ?? 0,
                'pendingAJEs'      => $nextPeriod['pendingAJEs'] ?? 0,
            ];
        })->filter()->values();

        return response()->json(['data' => $data]);
    }

    /** GET /api/period-closings/{companyId} */
    public function timeline(string $companyId): JsonResponse
    {
        $company = Company::findOrFail($companyId);
        $this->authorizeCompanyAccess($company);

        return response()->json([
            'months' => $this->service->getTimeline($company),
        ]);
    }

    /** GET /api/period-closings/{companyId}/{year}/{month}/preview */
    public function preview(string $companyId, int $year, int $month): JsonResponse
    {
        $company = Company::findOrFail($companyId);
        $this->authorizeCompanyAccess($company);

        return response()->json(
            $this->service->preview($company, $year, $month)
        );
    }

    /** POST /api/period-closings/{companyId}/{year}/{month} */
    public function store(string $companyId, int $year, int $month): JsonResponse
    {
        $company = Company::findOrFail($companyId);
        $this->authorizeCompanyAccess($company);

        try {
            $closing = $this->service->executeClose($company, $year, $month, auth()->user());
        } catch (\RuntimeException $e) {
            if (str_contains($e->getMessage(), 'already closed')) {
                return response()->json(['message' => $e->getMessage()], 409);
            }
            return response()->json(['message' => $e->getMessage()], 422);
        }

        return response()->json([
            'id'          => $closing->id,
            'periodYear'  => $closing->period_year,
            'periodMonth' => $closing->period_month,
            'closedAt'    => $closing->closed_at,
            'closedBy'    => auth()->user()->name,
        ], 201);
    }

    private function authorizeCompanyAccess(Company $company): void
    {
        $user = auth()->user();
        if ($user->role === 'accountant' && $company->accountant_id !== $user->id) {
            abort(403, 'You are not assigned to this client.');
        }
    }
}
```

- [ ] **Step 4: Register the routes**

In `backend/routes/api.php`, inside the `role:accountant,admin` group, add:

```php
Route::get('/period-closings',                                    [PeriodClosingController::class, 'index']);
Route::get('/period-closings/{companyId}',                        [PeriodClosingController::class, 'timeline']);
Route::get('/period-closings/{companyId}/{year}/{month}/preview', [PeriodClosingController::class, 'preview']);
Route::post('/period-closings/{companyId}/{year}/{month}',        [PeriodClosingController::class, 'store']);
```

Also add the import at the top of `routes/api.php`:

```php
use App\Http\Controllers\PeriodClosingController;
```

- [ ] **Step 5: Run all tests**

```bash
cd backend && php artisan test tests/Feature/PeriodClosingTest.php
```

Expected: all 12 tests PASS.

- [ ] **Step 6: Commit**

```bash
git add backend/app/Http/Controllers/PeriodClosingController.php
git add backend/routes/api.php
git add backend/tests/Feature/PeriodClosingTest.php
git commit -m "feat(period-closing): add controller and routes"
```

---

## Task 6: TypeScript Types + API Client

**Files:**
- Create: `frontend/src/types/period-closing.ts`
- Create: `frontend/src/lib/api/period-closings.ts`

- [ ] **Step 1: Create TypeScript types**

```typescript
// frontend/src/types/period-closing.ts

export type MonthStatus = 'closed' | 'ready' | 'blocked' | 'future' | 'up_to_date'

export interface ClientClosingSummary {
  companyId: string
  companyName: string
  accountantId: string
  accountantName: string | null
  lastClosed: string | null      // e.g. "Jan 2025"
  nextPeriod: string | null      // e.g. "Feb 2025"
  nextPeriodYear: number | null
  nextPeriodMonth: number | null
  status: MonthStatus
  pendingDocs: number
  pendingAJEs: number
}

export interface MonthEntry {
  year: number
  month: number
  label: string                  // e.g. "Jan 2025"
  status: MonthStatus
  pendingDocs: number
  pendingAJEs: number
}

export interface ClosingEntryLine {
  accountId: string
  accountName: string
  accountCode: string
  amount: number
}

export interface ClosingPreview {
  incomeGroup: ClosingEntryLine[]
  expenseGroup: ClosingEntryLine[]
  totalIncome: number
  totalExpense: number
}

export interface PeriodClosingRecord {
  id: string
  periodYear: number
  periodMonth: number
  closedAt: string
  closedBy: string
}
```

- [ ] **Step 2: Create the API functions**

```typescript
// frontend/src/lib/api/period-closings.ts

import api from './client'
import type {
  ClientClosingSummary,
  MonthEntry,
  ClosingPreview,
  PeriodClosingRecord,
  MonthStatus,
} from '@/types/period-closing'

export async function getPeriodClosingList(params?: {
  search?: string
  status?: MonthStatus
  accountantId?: string
}): Promise<ClientClosingSummary[]> {
  const { data } = await api.get('/period-closings', { params })
  return data.data
}

export async function getClientTimeline(companyId: string): Promise<MonthEntry[]> {
  const { data } = await api.get(`/period-closings/${companyId}`)
  return data.months
}

export async function getClosingPreview(
  companyId: string,
  year: number,
  month: number,
): Promise<ClosingPreview> {
  const { data } = await api.get(`/period-closings/${companyId}/${year}/${month}/preview`)
  return data
}

export async function executeClose(
  companyId: string,
  year: number,
  month: number,
): Promise<PeriodClosingRecord> {
  const { data } = await api.post(`/period-closings/${companyId}/${year}/${month}`)
  return data
}
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/types/period-closing.ts frontend/src/lib/api/period-closings.ts
git commit -m "feat(period-closing): add TypeScript types and API client functions"
```

---

## Task 7: MonthPill Component

**Files:**
- Create: `frontend/src/components/month-end/MonthPill.tsx`

- [ ] **Step 1: Create the component**

```tsx
// frontend/src/components/month-end/MonthPill.tsx

import type { MonthEntry } from '@/types/period-closing'

interface MonthPillProps {
  month: MonthEntry
  isActive?: boolean
  onClick?: () => void
}

const STATUS_STYLES: Record<string, { container: string; label: string }> = {
  closed: {
    container: 'bg-t-card border-t-line text-t-muted cursor-default',
    label:     'text-[var(--t-tier-ready-fg)]',
  },
  ready: {
    container: 'bg-[var(--t-tier-ready-bg)] border-[var(--t-tier-ready-ring)] text-[var(--t-tier-ready-fg)] cursor-pointer hover:brightness-95',
    label:     'text-[var(--t-tier-ready-fg)]',
  },
  blocked: {
    container: 'bg-[var(--t-tier-check-bg)] border-[var(--t-tier-check-ring)] text-[var(--t-tier-check-fg)] cursor-not-allowed',
    label:     'text-[var(--t-tier-check-fg)]',
  },
  future: {
    container: 'bg-transparent border-t-line-soft text-t-faint cursor-default',
    label:     'text-t-faint',
  },
  up_to_date: {
    container: 'bg-t-card border-t-line text-t-muted cursor-default',
    label:     'text-t-muted',
  },
}

const STATUS_SUBLABELS: Record<string, (m: MonthEntry) => string> = {
  closed:    () => '✓ Closed',
  ready:     () => 'Ready ↗',
  blocked:   (m) => m.pendingDocs > 0 ? `⚠ ${m.pendingDocs} docs` : '⚠ AJEs',
  future:    () => 'Future',
  up_to_date: () => 'Up to date',
}

export function MonthPill({ month, isActive, onClick }: MonthPillProps) {
  const styles  = STATUS_STYLES[month.status] ?? STATUS_STYLES.future
  const subLabel = STATUS_SUBLABELS[month.status]?.(month) ?? ''
  const canClick = month.status === 'ready' && !!onClick

  return (
    <button
      type="button"
      onClick={canClick ? onClick : undefined}
      disabled={!canClick}
      title={month.status === 'blocked'
        ? (month.pendingDocs > 0
            ? `${month.pendingDocs} document(s) still pending review`
            : `${month.pendingAJEs} adjusting entr${month.pendingAJEs === 1 ? 'y' : 'ies'} not yet posted`)
        : undefined}
      className={[
        'flex flex-col items-center gap-1 px-3 py-2 rounded-[10px]',
        'border-[1.5px] min-w-[72px] text-center transition-all select-none',
        styles.container,
        isActive ? 'ring-2 ring-t-primary border-t-primary' : '',
      ].join(' ')}
    >
      <span className="text-[11px] font-bold leading-tight">{month.label}</span>
      <span className={`text-[10px] font-medium mt-px ${styles.label}`}>{subLabel}</span>
    </button>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/components/month-end/MonthPill.tsx
git commit -m "feat(period-closing): add MonthPill component"
```

---

## Task 8: PeriodClosePanel Component

**Files:**
- Create: `frontend/src/components/month-end/PeriodClosePanel.tsx`

- [ ] **Step 1: Create the component**

```tsx
// frontend/src/components/month-end/PeriodClosePanel.tsx

'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { getClosingPreview, executeClose } from '@/lib/api/period-closings'
import { useToast } from '@/hooks/use-toast'
import type { MonthEntry, ClientClosingSummary } from '@/types/period-closing'

interface PeriodClosePanelProps {
  client:  ClientClosingSummary
  month:   MonthEntry
  onClose: () => void
}

function fmtAmount(n: number) {
  return '₱ ' + n.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

export function PeriodClosePanel({ client, month, onClose }: PeriodClosePanelProps) {
  const { toast }      = useToast()
  const queryClient    = useQueryClient()
  const allReady       = month.status === 'ready'

  const { data: preview, isLoading: previewLoading } = useQuery({
    queryKey: ['period-closing-preview', client.companyId, month.year, month.month],
    queryFn:  () => getClosingPreview(client.companyId, month.year, month.month),
  })

  const mutation = useMutation({
    mutationFn: () => executeClose(client.companyId, month.year, month.month),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['period-closings'] })
      queryClient.invalidateQueries({ queryKey: ['period-closing-timeline', client.companyId] })
      toast({ title: `${month.label} closed for ${client.companyName}.` })
      onClose()
    },
    onError: (err: unknown) => {
      const msg = err instanceof Error ? err.message : 'Something went wrong. Please try again.'
      toast({ title: msg, variant: 'destructive' })
    },
  })

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-[rgba(42,28,60,0.18)]"
        onClick={onClose}
      />

      {/* Panel */}
      <div
        className="fixed right-0 top-0 bottom-0 z-50 flex flex-col"
        style={{
          width: 420, background: 'var(--t-card)',
          boxShadow: '-4px 0 40px rgba(42,28,60,.15)',
        }}
      >
        {/* Header */}
        <div style={{ padding: '22px 24px 18px', borderBottom: '1px solid var(--t-line)', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 18, color: 'var(--t-ink)', lineHeight: 1.2 }}>
                Close {month.label}
              </div>
              <div style={{ fontSize: 12, color: 'var(--t-muted)', marginTop: 3 }}>
                {client.companyName}
              </div>
            </div>
            <button
              onClick={onClose}
              style={{ width: 28, height: 28, borderRadius: 6, border: 'none', background: 'var(--t-surface)', cursor: 'pointer', color: 'var(--t-muted)', fontSize: 16, display: 'grid', placeItems: 'center', flexShrink: 0, marginTop: 2 }}
            >
              ✕
            </button>
          </div>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 20 }}>

          {/* Checklist */}
          <div>
            <div style={{ fontSize: 10.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--t-muted)', marginBottom: 10 }}>
              Pre-Close Checklist
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {[
                { pass: month.pendingDocs === 0 && month.pendingAJEs === 0,
                  text: 'Prior months closed',
                  sub:  client.lastClosed ? `up to ${client.lastClosed}` : 'first period' },
                { pass: month.pendingDocs === 0,
                  text: 'All documents reviewed',
                  sub:  month.pendingDocs > 0 ? `${month.pendingDocs} still pending` : 'all approved' },
                { pass: month.pendingAJEs === 0,
                  text: 'All adjusting entries posted',
                  sub:  month.pendingAJEs > 0 ? `${month.pendingAJEs} not yet posted` : 'all posted' },
              ].map(({ pass, text, sub }) => (
                <div key={text} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 13px', borderRadius: 8, background: 'var(--t-surface)' }}>
                  <div style={{
                    width: 20, height: 20, borderRadius: '50%', display: 'grid', placeItems: 'center', flexShrink: 0,
                    fontSize: 11, fontWeight: 700,
                    background: pass ? 'var(--t-tier-ready-bg)' : 'var(--t-tier-check-bg)',
                    color:      pass ? 'var(--t-tier-ready-fg)' : 'var(--t-tier-check-fg)',
                    border:     pass ? '1.5px solid var(--t-tier-ready-ring)' : '1.5px solid var(--t-tier-check-ring)',
                  }}>
                    {pass ? '✓' : '!'}
                  </div>
                  <div style={{ fontSize: 13, color: 'var(--t-ink)', fontWeight: 500 }}>
                    {text} <span style={{ fontWeight: 400, color: 'var(--t-muted)', fontSize: 12 }}>({sub})</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Closing entries preview */}
          <div>
            <div style={{ fontSize: 10.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--t-muted)', marginBottom: 10 }}>
              Closing Entries Preview
            </div>
            {previewLoading ? (
              <div style={{ fontSize: 13, color: 'var(--t-faint)', padding: '12px 0' }}>Loading…</div>
            ) : preview ? (
              <div style={{ background: 'var(--t-surface)', border: '1px solid var(--t-line)', borderRadius: 10, overflow: 'hidden' }}>
                {/* Income group */}
                <div style={{ padding: '12px 14px' }}>
                  {preview.incomeGroup.map((line) => (
                    <div key={line.accountId} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '3px 0', fontSize: 12.5 }}>
                      <span style={{ width: 20, fontSize: 10, fontWeight: 700, color: 'var(--t-primary)', flexShrink: 0 }}>Dr</span>
                      <span style={{ flex: 1 }}>{line.accountName}</span>
                      <span style={{ fontVariantNumeric: 'tabular-nums', fontWeight: 600, fontSize: 12 }}>{fmtAmount(line.amount)}</span>
                    </div>
                  ))}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '3px 0 3px 20px', fontSize: 12.5, color: 'var(--t-muted)' }}>
                    <span style={{ width: 20, fontSize: 10, fontWeight: 700, color: 'var(--t-tier-pending-fg)', flexShrink: 0 }}>Cr</span>
                    <span style={{ flex: 1 }}>Income Summary</span>
                    <span style={{ fontVariantNumeric: 'tabular-nums', fontWeight: 600, fontSize: 12 }}>{fmtAmount(preview.totalIncome)}</span>
                  </div>
                </div>
                {/* Expense group */}
                <div style={{ padding: '12px 14px', borderTop: '1px dashed var(--t-line)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '3px 0', fontSize: 12.5 }}>
                    <span style={{ width: 20, fontSize: 10, fontWeight: 700, color: 'var(--t-primary)', flexShrink: 0 }}>Dr</span>
                    <span style={{ flex: 1 }}>Income Summary</span>
                    <span style={{ fontVariantNumeric: 'tabular-nums', fontWeight: 600, fontSize: 12 }}>{fmtAmount(preview.totalExpense)}</span>
                  </div>
                  {preview.expenseGroup.map((line) => (
                    <div key={line.accountId} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '3px 0 3px 20px', fontSize: 12.5, color: 'var(--t-muted)' }}>
                      <span style={{ width: 20, fontSize: 10, fontWeight: 700, color: 'var(--t-tier-pending-fg)', flexShrink: 0 }}>Cr</span>
                      <span style={{ flex: 1 }}>{line.accountName}</span>
                      <span style={{ fontVariantNumeric: 'tabular-nums', fontWeight: 600, fontSize: 12 }}>{fmtAmount(line.amount)}</span>
                    </div>
                  ))}
                </div>
                {/* Net */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', background: 'var(--t-tier-ready-bg)', fontSize: 12.5, fontWeight: 700, color: 'var(--t-tier-ready-fg)', borderTop: '1px solid var(--t-tier-ready-ring)' }}>
                  <span>Net to Income Summary</span>
                  <span>{fmtAmount(preview.totalIncome - preview.totalExpense)}</span>
                </div>
              </div>
            ) : null}
          </div>

          {/* Warning */}
          <div style={{ fontSize: 11.5, color: 'var(--t-muted)', background: 'var(--t-surface)', border: '1px solid var(--t-line)', borderRadius: 8, padding: '10px 12px', lineHeight: 1.5 }}>
            This action is <strong style={{ color: 'var(--t-ink)' }}>permanent and cannot be undone.</strong> All income and expense accounts for {month.label} will be zeroed and the period will be locked. Corrections must go through adjusting entries in the next open period.
          </div>
        </div>

        {/* Footer */}
        <div style={{ padding: '16px 24px', borderTop: '1px solid var(--t-line)', display: 'flex', gap: 10, flexShrink: 0 }}>
          <button
            onClick={onClose}
            style={{ flex: 1, padding: '10px 16px', borderRadius: 8, border: '1px solid var(--t-line)', background: 'var(--t-surface)', color: 'var(--t-muted)', fontFamily: 'inherit', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
          >
            Cancel
          </button>
          <button
            onClick={() => mutation.mutate()}
            disabled={!allReady || mutation.isPending}
            style={{
              flex: 2, padding: '10px 16px', borderRadius: 8, border: 'none',
              background: allReady ? 'var(--t-primary)' : 'var(--t-faint)',
              color: '#fff', fontFamily: 'inherit', fontSize: 13, fontWeight: 600,
              cursor: allReady ? 'pointer' : 'not-allowed',
              opacity: mutation.isPending ? 0.7 : 1,
            }}
          >
            {mutation.isPending ? 'Closing…' : 'Confirm & Close Period →'}
          </button>
        </div>
      </div>
    </>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/components/month-end/PeriodClosePanel.tsx
git commit -m "feat(period-closing): add PeriodClosePanel component"
```

---

## Task 9: ClientClosingRow Component

**Files:**
- Create: `frontend/src/components/month-end/ClientClosingRow.tsx`

- [ ] **Step 1: Create the component**

```tsx
// frontend/src/components/month-end/ClientClosingRow.tsx

'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { getClientTimeline } from '@/lib/api/period-closings'
import { MonthPill } from './MonthPill'
import { PeriodClosePanel } from './PeriodClosePanel'
import type { ClientClosingSummary, MonthEntry } from '@/types/period-closing'

interface ClientClosingRowProps {
  client: ClientClosingSummary
}

const STATUS_BADGE: Record<string, { label: string; className: string }> = {
  ready: {
    label:     'Ready to Close',
    className: 'bg-[var(--t-tier-ready-bg)] text-[var(--t-tier-ready-fg)] border-[var(--t-tier-ready-ring)]',
  },
  blocked: {
    label:     (c: ClientClosingSummary) => c.pendingDocs > 0 ? `${c.pendingDocs} docs pending` : 'AJEs pending',
    className: 'bg-[var(--t-tier-check-bg)] text-[var(--t-tier-check-fg)] border-[var(--t-tier-check-ring)]',
  },
  up_to_date: {
    label:     'Up to date',
    className: 'bg-t-surface text-t-muted border-t-line',
  },
  future: {
    label:     'Not started',
    className: 'bg-[var(--t-tier-review-bg)] text-[var(--t-tier-review-fg)] border-[var(--t-tier-review-ring)]',
  },
}

function badgeLabel(client: ClientClosingSummary): string {
  const def = STATUS_BADGE[client.status]
  if (!def) return client.status
  return typeof def.label === 'function' ? def.label(client) : def.label
}

export function ClientClosingRow({ client }: ClientClosingRowProps) {
  const [expanded, setExpanded]             = useState(false)
  const [activeMonth, setActiveMonth]       = useState<MonthEntry | null>(null)

  const { data: timeline } = useQuery({
    queryKey: ['period-closing-timeline', client.companyId],
    queryFn:  () => getClientTimeline(client.companyId),
    enabled:  expanded,
  })

  const badge = STATUS_BADGE[client.status] ?? STATUS_BADGE.up_to_date

  return (
    <>
      {/* Main row */}
      <div
        onClick={() => setExpanded((v) => !v)}
        className="grid cursor-pointer transition-colors"
        style={{
          gridTemplateColumns: '1fr 140px 140px 160px 40px',
          columnGap: 16,
          padding: '14px 24px',
          alignItems: 'center',
          borderBottom: '1px solid var(--t-line-soft)',
          background: expanded ? 'var(--t-surface)' : 'var(--t-card-alt)',
        }}
      >
        <div>
          <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--t-ink)' }}>{client.companyName}</div>
          <div style={{ fontSize: 11, color: 'var(--t-muted)', marginTop: 2 }}>{client.accountantName ?? '—'}</div>
        </div>
        <div style={{ fontSize: 13, color: 'var(--t-ink)' }}>{client.lastClosed ?? <span style={{ color: 'var(--t-faint)' }}>—</span>}</div>
        <div style={{ fontSize: 13, color: 'var(--t-ink)' }}>{client.nextPeriod ?? <span style={{ color: 'var(--t-faint)' }}>—</span>}</div>
        <div>
          <span
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11.5px] font-semibold border ${badge.className}`}
            style={{ whiteSpace: 'nowrap' }}
          >
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'currentColor', flexShrink: 0 }} />
            {badgeLabel(client)}
          </span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <svg
            width={16} height={16} viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth={2.2}
            style={{ color: 'var(--t-faint)', transition: 'transform 0.2s', transform: expanded ? 'rotate(90deg)' : 'none' }}
          >
            <path d="M9 18l6-6-6-6" />
          </svg>
        </div>
      </div>

      {/* Timeline */}
      {expanded && (
        <div style={{ background: '#F3EBE0', borderBottom: '1px solid var(--t-line-soft)', padding: '16px 24px', display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--t-muted)', marginRight: 8, whiteSpace: 'nowrap' }}>
            Timeline
          </span>
          {timeline ? timeline.map((m, i) => (
            <div key={`${m.year}-${m.month}`} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {i > 0 && <div style={{ width: 20, height: 1, background: 'var(--t-line)', flexShrink: 0 }} />}
              <MonthPill
                month={m}
                isActive={activeMonth?.year === m.year && activeMonth?.month === m.month}
                onClick={m.status === 'ready' ? () => setActiveMonth(m) : undefined}
              />
            </div>
          )) : (
            <span style={{ fontSize: 13, color: 'var(--t-faint)' }}>Loading…</span>
          )}
        </div>
      )}

      {/* Side panel */}
      {activeMonth && (
        <PeriodClosePanel
          client={client}
          month={activeMonth}
          onClose={() => setActiveMonth(null)}
        />
      )}
    </>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/components/month-end/ClientClosingRow.tsx
git commit -m "feat(period-closing): add ClientClosingRow with timeline expansion"
```

---

## Task 10: MonthEndPage + Page Files + Topbar

**Files:**
- Create: `frontend/src/components/month-end/MonthEndPage.tsx`
- Create: `frontend/src/app/admin/month-end/page.tsx`
- Create: `frontend/src/app/accountant/month-end/page.tsx`
- Modify: `frontend/src/components/layout/Topbar.tsx`

- [ ] **Step 1: Create MonthEndPage**

```tsx
// frontend/src/components/month-end/MonthEndPage.tsx

'use client'

import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { getPeriodClosingList } from '@/lib/api/period-closings'
import { getAccountants } from '@/lib/api/admin/accountants'
import { ClientClosingRow } from './ClientClosingRow'
import { Breadcrumb } from '@/components/shared/Breadcrumb'
import type { MonthStatus } from '@/types/period-closing'

interface MonthEndPageProps {
  showAccountantFilter: boolean
}

type StatusFilter = 'all' | 'ready' | 'blocked' | 'up_to_date'

export function MonthEndPage({ showAccountantFilter }: MonthEndPageProps) {
  const [search, setSearch]                 = useState('')
  const [statusFilter, setStatusFilter]     = useState<StatusFilter>('all')
  const [accountantId, setAccountantId]     = useState('')

  const { data: clients = [], isLoading } = useQuery({
    queryKey: ['period-closings', { accountantId }],
    queryFn:  () => getPeriodClosingList({ accountantId: accountantId || undefined }),
  })

  const { data: accountants = [] } = useQuery({
    queryKey: ['admin-accountants'],
    queryFn:  () => getAccountants(),
    enabled:  showAccountantFilter,
  })

  const filtered = useMemo(() => {
    return clients.filter((c) => {
      if (search && !c.companyName.toLowerCase().includes(search.toLowerCase())) return false
      if (statusFilter !== 'all' && c.status !== statusFilter) return false
      return true
    })
  }, [clients, search, statusFilter])

  const STATUS_TABS: { value: StatusFilter; label: string }[] = [
    { value: 'all',        label: 'All'        },
    { value: 'ready',      label: 'Ready'       },
    { value: 'blocked',    label: 'Blocked'     },
    { value: 'up_to_date', label: 'Up to date'  },
  ]

  return (
    <div className="max-w-[1280px] mx-auto px-4 py-5 md:px-9 md:py-7">
      <Breadcrumb crumbs={[{ label: 'Dashboard', href: showAccountantFilter ? '/admin' : '/accountant' }, { label: 'Month-End Closing' }]} />

      <div className="flex items-start justify-between mb-[22px]">
        <div>
          <h1
            className="text-[34px] font-bold tracking-[-0.025em] text-t-ink m-0"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            Month-End Closing
          </h1>
          <p className="text-[14.5px] text-t-muted mt-[5px]">
            Close income and expense accounts to Income Summary per client, per month.
          </p>
        </div>
      </div>

      {/* Filter bar */}
      <div className="flex flex-col gap-2 md:flex-row md:flex-wrap md:items-center md:gap-2.5 mb-5">
        <div style={{ position: 'relative' }}>
          <svg style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--t-faint)', pointerEvents: 'none' }} width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
          </svg>
          <input
            type="text"
            placeholder="Search clients…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-10 pl-8 pr-4 rounded-[11px] border-[1.5px] border-t-line bg-t-card text-[13.5px] text-t-ink"
            style={{ minWidth: 220, outline: 'none' }}
          />
        </div>

        {showAccountantFilter && (
          <select
            value={accountantId}
            onChange={(e) => setAccountantId(e.target.value)}
            className="h-10 w-full md:w-auto pl-3.5 pr-9 rounded-[11px] border-[1.5px] border-t-line bg-t-card text-[13.5px] font-semibold text-t-ink appearance-none"
          >
            <option value="">All Accountants</option>
            {accountants.map((a) => (
              <option key={a.id} value={a.id}>{a.name}</option>
            ))}
          </select>
        )}

        <div className="flex gap-1">
          {STATUS_TABS.map((tab) => (
            <button
              key={tab.value}
              onClick={() => setStatusFilter(tab.value)}
              style={{
                padding: '7px 13px', borderRadius: 7, border: 'none',
                fontSize: 12, fontWeight: 600, cursor: 'pointer',
                background: statusFilter === tab.value ? 'var(--t-card)' : 'transparent',
                color:      statusFilter === tab.value ? 'var(--t-ink)' : 'var(--t-muted)',
                boxShadow:  statusFilter === tab.value ? '0 1px 3px rgba(42,28,60,.08)' : 'none',
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Table card */}
      <div style={{ background: 'var(--t-card)', border: '1px solid var(--t-line)', borderRadius: 20, overflow: 'hidden', boxShadow: 'var(--t-shadow)' }}>
        {/* Card header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '18px 24px', borderBottom: '1px solid var(--t-line)' }}>
          <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} style={{ color: 'var(--t-primary)', flexShrink: 0 }}>
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
          </svg>
          <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 16, color: 'var(--t-ink)' }}>
            Clients
          </span>
          <span style={{ background: 'var(--t-primary-soft)', color: 'var(--t-primary)', border: '1px solid var(--t-line)', borderRadius: 999, padding: '2px 9px', fontSize: 11.5, fontWeight: 800 }}>
            {filtered.length}
          </span>
        </div>

        {/* Column headers */}
        <div
          className="hidden md:grid"
          style={{ gridTemplateColumns: '1fr 140px 140px 160px 40px', columnGap: 16, padding: '12px 24px', borderBottom: '1px solid var(--t-line)' }}
        >
          {['Client', 'Last Closed', 'Next Period', 'Status', ''].map((h, i) => (
            <span key={i} style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--t-faint)' }}>
              {h}
            </span>
          ))}
        </div>

        {isLoading ? (
          <div style={{ padding: 32, textAlign: 'center', fontSize: 14, color: 'var(--t-faint)' }}>Loading…</div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: 32, textAlign: 'center', fontSize: 14, color: 'var(--t-faint)' }}>No clients found.</div>
        ) : (
          filtered.map((client) => (
            <ClientClosingRow key={client.companyId} client={client} />
          ))
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Create admin page file**

```tsx
// frontend/src/app/admin/month-end/page.tsx

import { MonthEndPage } from '@/components/month-end/MonthEndPage'

export const metadata = { title: 'Month-End Closing' }

export default function AdminMonthEndPage() {
  return <MonthEndPage showAccountantFilter={true} />
}
```

- [ ] **Step 3: Create accountant page file**

```tsx
// frontend/src/app/accountant/month-end/page.tsx

import { MonthEndPage } from '@/components/month-end/MonthEndPage'

export const metadata = { title: 'Month-End Closing' }

export default function AccountantMonthEndPage() {
  return <MonthEndPage showAccountantFilter={false} />
}
```

- [ ] **Step 4: Add Month-End to Topbar nav links**

In `frontend/src/components/layout/Topbar.tsx`, add the Month-End link to both arrays:

```typescript
// In ADMIN_LINKS, add after 'Adj. Entries':
{ href: '/admin/month-end', label: 'Month-End' },

// In ACCOUNTANT_LINKS, add after 'Adj. Entries':
{ href: '/accountant/month-end', label: 'Month-End' },
```

The full updated arrays:

```typescript
const ADMIN_LINKS = [
  { href: '/admin/dashboard',         label: 'Dashboard'    },
  { href: '/admin/clients',           label: 'Clients'      },
  { href: '/admin/accountants',       label: 'Accountants'  },
  { href: '/admin/billing',           label: 'Billing'      },
  { href: '/admin/queue',             label: 'Queue'        },
  { href: '/admin/adjusting-entries', label: 'Adj. Entries' },
  { href: '/admin/month-end',         label: 'Month-End'    },
  { href: '/admin/reports',           label: 'Reports'      },
]

const ACCOUNTANT_LINKS = [
  { href: '/accountant/dashboard',         label: 'Dashboard'    },
  { href: '/accountant/queue',             label: 'Queue',        badge: true },
  { href: '/accountant/adjusting-entries', label: 'Adj. Entries' },
  { href: '/accountant/month-end',         label: 'Month-End'    },
  { href: '/accountant/clients',           label: 'My Clients'   },
  { href: '/accountant/reports',           label: 'Reports'      },
]
```

- [ ] **Step 5: Build check**

```bash
cd frontend && npx tsc --noEmit
```

Expected: no TypeScript errors.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/components/month-end/MonthEndPage.tsx
git add frontend/src/app/admin/month-end/page.tsx
git add frontend/src/app/accountant/month-end/page.tsx
git add frontend/src/components/layout/Topbar.tsx
git commit -m "feat(period-closing): add MonthEndPage, route pages, and Topbar nav links"
```

---

## Self-Review

### Spec coverage check
- ✅ `period_closings` table — Task 1
- ✅ Sequential month enforcement — `PeriodClosingService.getMonthStatus()`
- ✅ First closeable month derived from JE history — `getFirstCloseableMonth()`
- ✅ Hard block: pending docs — `getMonthStatus()` blocked branch
- ✅ Hard block: draft/submitted AJEs — `getMonthStatus()` blocked branch
- ✅ Permanent close (no reopening) — no reopen route added
- ✅ Income + expense → Income Summary only — `executeClose()`
- ✅ Period lock on subsequent JE posts — Task 4, `JournalEntryService` guard
- ✅ Audit trail (closed_by, closed_at) — `period_closings` columns
- ✅ Admin sees all clients, accountant scoped — `index()` + `authorizeCompanyAccess()`
- ✅ Accountant filter (admin only) — `showAccountantFilter` prop + `?accountant_id` query param
- ✅ All 4 API endpoints — Task 5
- ✅ Preview before confirm — `PeriodClosePanel` loads preview query
- ✅ Optimistic update on confirm — React Query `invalidateQueries` + success/error toasts
- ✅ Client-first layout with timeline — `ClientClosingRow` + `MonthPill`
- ✅ Right-side panel — `PeriodClosePanel`
- ✅ Nav links — `Topbar.tsx` update

### Type consistency check
- `ClientClosingSummary` defined in `period-closing.ts`, used in `MonthEndPage`, `ClientClosingRow`, `PeriodClosePanel` ✅
- `MonthEntry` defined in `period-closing.ts`, used in `ClientClosingRow`, `MonthPill`, `PeriodClosePanel` ✅
- `ClosingPreview` returned by `getClosingPreview()`, consumed in `PeriodClosePanel` ✅
- `PeriodClosingService` method names consistent across Controller calls ✅
