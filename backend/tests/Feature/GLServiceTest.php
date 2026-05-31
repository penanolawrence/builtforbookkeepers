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
