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

        $txLine = TransactionLine::factory()->create([
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
            'journal_entry_id'    => $entry->id,
            'account_id'          => $account->id,
            'transaction_line_id' => $txLine->id,
            'debit'               => $debit ?: null,
            'credit'              => $credit ?: null,
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

    public function test_opening_balance_field_reflects_entries_before_start_date(): void
    {
        $account = $this->makeAccount('cash');
        $this->makeEntry($account, '2025-12-31', debit: 500.0); // before start

        $result = (new GLService())->getData($this->company, $account, $this->start, $this->end);

        $this->assertArrayHasKey('openingBalance', $result);
        $this->assertSame(500.0, $result['openingBalance']);
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

    public function test_parked_count_excludes_documents_before_start_date(): void
    {
        $account = $this->makeAccount('cash');

        Document::factory()->create([
            'company_id'    => $this->company->id,
            'status'        => 'parked',
            'document_date' => '2025-12-31', // before start
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

    public function test_subtype_resolves_to_correct_line_for_multi_line_document(): void
    {
        $account1 = $this->makeAccount('expense');
        $account2 = $this->makeAccount('income');
        $subtype1 = Subtype::factory()->create(['name' => 'Internet']);
        $subtype2 = Subtype::factory()->create(['name' => 'Sales']);

        $document = Document::factory()->create([
            'company_id'    => $this->company->id,
            'document_date' => '2026-02-01',
            'status'        => 'approved',
        ]);

        $txLine1 = TransactionLine::factory()->create([
            'document_id' => $document->id,
            'account_id'  => $account1->id,
            'subtype_id'  => $subtype1->id,
            'type'        => 'expense',
            'amount'      => 1000.0,
        ]);

        $txLine2 = TransactionLine::factory()->create([
            'document_id' => $document->id,
            'account_id'  => $account2->id,
            'subtype_id'  => $subtype2->id,
            'type'        => 'income',
            'amount'      => 1000.0,
        ]);

        $entry = JournalEntry::create([
            'company_id'  => $this->company->id,
            'document_id' => $document->id,
            'entry_date'  => '2026-02-01',
            'description' => 'Multi-line doc',
            'status'      => 'posted',
            'posted_by'   => $this->user->id,
            'posted_at'   => Carbon::now(),
        ]);

        JournalEntryLine::create([
            'journal_entry_id'    => $entry->id,
            'account_id'          => $account1->id,
            'transaction_line_id' => $txLine1->id,
            'debit'               => 1000.0,
            'credit'              => null,
        ]);

        JournalEntryLine::create([
            'journal_entry_id'    => $entry->id,
            'account_id'          => $account2->id,
            'transaction_line_id' => $txLine2->id,
            'debit'               => null,
            'credit'              => 1000.0,
        ]);

        // GL for account1 must show subtype1, not subtype2
        $result = (new GLService())->getData($this->company, $account1, $this->start, $this->end);

        $this->assertCount(1, $result['rows']);
        $this->assertSame('Internet', $result['rows'][0]['subtype']);
    }

    public function test_subtype_disambiguates_when_two_lines_share_same_account(): void
    {
        $account  = $this->makeAccount('expense');
        $subtype1 = Subtype::factory()->create(['name' => 'Internet']);
        $subtype2 = Subtype::factory()->create(['name' => 'Phone']);

        $document = Document::factory()->create([
            'company_id'    => $this->company->id,
            'document_date' => '2026-02-01',
            'status'        => 'approved',
        ]);

        $txLine1 = TransactionLine::factory()->create([
            'document_id' => $document->id,
            'account_id'  => $account->id,
            'subtype_id'  => $subtype1->id,
            'type'        => 'expense',
            'amount'      => 500.0,
        ]);

        $txLine2 = TransactionLine::factory()->create([
            'document_id' => $document->id,
            'account_id'  => $account->id,
            'subtype_id'  => $subtype2->id,
            'type'        => 'expense',
            'amount'      => 300.0,
        ]);

        $entry = JournalEntry::create([
            'company_id'  => $this->company->id,
            'document_id' => $document->id,
            'entry_date'  => '2026-02-01',
            'description' => 'Multi-line same account',
            'status'      => 'posted',
            'posted_by'   => $this->user->id,
            'posted_at'   => Carbon::now(),
        ]);

        JournalEntryLine::create([
            'journal_entry_id'    => $entry->id,
            'account_id'          => $account->id,
            'transaction_line_id' => $txLine1->id,
            'debit'               => 500.0,
            'credit'              => null,
        ]);

        JournalEntryLine::create([
            'journal_entry_id'    => $entry->id,
            'account_id'          => $account->id,
            'transaction_line_id' => $txLine2->id,
            'debit'               => 300.0,
            'credit'              => null,
        ]);

        $result   = (new GLService())->getData($this->company, $account, $this->start, $this->end);
        $subtypes = collect($result['rows'])->pluck('subtype')->toArray();

        $this->assertCount(2, $result['rows']);
        $this->assertContains('Internet', $subtypes);
        $this->assertContains('Phone', $subtypes);
    }
}
