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

    public function test_execute_close_creates_period_closing_record(): void
    {
        $this->postJournalEntry(2025, 1, 'income', 48500);
        $this->postJournalEntry(2025, 1, 'expense', 10000);

        $service = app(PeriodClosingService::class);
        $closing = $service->executeClose($this->company, 2025, 1, $this->accountant);

        $this->assertInstanceOf(PeriodClosing::class, $closing);
        $this->assertDatabaseHas('period_closings', [
            'company_id'   => $this->company->id,
            'period_year'  => 2025,
            'period_month' => 1,
            'closed_by'    => $this->accountant->id,
        ]);
    }

    public function test_execute_close_posts_two_journal_entries_tagged_with_closing_id(): void
    {
        $this->postJournalEntry(2025, 1, 'income', 48500);
        $this->postJournalEntry(2025, 1, 'expense', 10000);

        $service = app(PeriodClosingService::class);
        $closing = $service->executeClose($this->company, 2025, 1, $this->accountant);

        $taggedJEs = JournalEntry::where('period_closing_id', $closing->id)->count();
        $this->assertSame(2, $taggedJEs);
    }

    public function test_execute_close_throws_when_period_not_ready(): void
    {
        // No JEs at all → no first month → status is 'future'
        $this->expectException(\RuntimeException::class);

        $service = app(PeriodClosingService::class);
        $service->executeClose($this->company, 2025, 1, $this->accountant);
    }

    public function test_execute_close_throws_on_double_close(): void
    {
        $this->postJournalEntry(2025, 1, 'income', 1000);

        $service = app(PeriodClosingService::class);
        $service->executeClose($this->company, 2025, 1, $this->accountant);

        $this->expectException(\RuntimeException::class);
        $this->expectExceptionMessage('already closed');
        $service->executeClose($this->company, 2025, 1, $this->accountant);
    }

    public function test_closing_entries_excluded_from_subsequent_preview(): void
    {
        $this->postJournalEntry(2025, 1, 'income', 48500);
        $this->postJournalEntry(2025, 1, 'expense', 10000);

        $service = app(PeriodClosingService::class);
        $service->executeClose($this->company, 2025, 1, $this->accountant);

        // Preview for Feb should not include closed Jan income/expenses
        $this->postJournalEntry(2025, 2, 'income', 5000);

        // Close Jan to satisfy sequential requirement
        // (Jan is already closed above)

        // Jan preview should now show 0 income/expense (nothing open)
        $preview = $service->preview($this->company, 2025, 1);
        $this->assertSame(0.0, $preview['totalIncome']);
        $this->assertSame(0.0, $preview['totalExpense']);
    }

    public function test_posting_document_je_to_closed_period_throws(): void
    {
        $this->postJournalEntry(2025, 1, 'income', 1000);

        // Close January
        $service = app(\App\Services\Accounting\PeriodClosingService::class);
        $service->executeClose($this->company, 2025, 1, $this->accountant);

        // Try to post another JE dated in January
        $doc = Document::factory()->create([
            'company_id'    => $this->company->id,
            'status'        => 'approved',
            'document_date' => Carbon::create(2025, 1, 20)->toDateString(),
        ]);

        $this->expectException(\RuntimeException::class);
        $this->expectExceptionMessage('locked');

        app(\App\Services\Accounting\JournalEntryService::class)
            ->postFromDocument($doc, $this->accountant);
    }

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

    public function test_execute_close_throws_when_income_summary_has_preexisting_balance(): void
    {
        $this->postJournalEntry(2026, 1, 'income', 10000);

        $incomeSummary = Account::factory()->create([
            'company_id' => $this->company->id,
            'name'       => 'Income Summary',
            'type'       => 'equity',
            'code'       => '3900',
        ]);

        $je = JournalEntry::create([
            'company_id'  => $this->company->id,
            'entry_date'  => '2026-01-31',
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

        app(PeriodClosingService::class)->executeClose($this->company, 2026, 1, $this->accountant);
    }

    public function test_execute_close_throws_when_draft_je_exists_in_period(): void
    {
        $this->postJournalEntry(2026, 1, 'income', 10000);

        JournalEntry::create([
            'company_id'  => $this->company->id,
            'entry_date'  => '2026-01-20',
            'description' => 'Orphaned draft',
            'status'      => 'draft',
            'posted_by'   => $this->accountant->id,
            'posted_at'   => now(),
        ]);

        $this->expectException(\RuntimeException::class);
        $this->expectExceptionMessage('still in draft');

        app(PeriodClosingService::class)->executeClose($this->company, 2026, 1, $this->accountant);
    }

    public function test_original_jes_are_tagged_with_closing_id_after_close(): void
    {
        $je = $this->postJournalEntry(2026, 1, 'income', 48500);
        $this->postJournalEntry(2026, 1, 'expense', 10000);

        $closing = app(PeriodClosingService::class)->executeClose($this->company, 2026, 1, $this->accountant);

        $je->refresh();
        $this->assertSame($closing->id, $je->period_closing_id);
    }
}
