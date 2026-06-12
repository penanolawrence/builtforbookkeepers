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
        $doc = Document::factory()->create([
            'company_id'    => $this->company->id,
            'status'        => 'approved',
            'document_date' => Carbon::create($year, $month, 15),
        ]);
        $entry = JournalEntry::create([
            'company_id'  => $this->company->id,
            'document_id' => $doc->id,
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
            'status'        => 'processing',
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
        $closing = new PeriodClosing([
            'company_id'   => $this->company->id,
            'period_year'  => 2025,
            'period_month' => 1,
        ]);
        $closing->closed_by = $this->accountant->id;
        $closing->closed_at = now();
        $closing->save();

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
