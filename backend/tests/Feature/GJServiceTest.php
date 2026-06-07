<?php

namespace Tests\Feature;

use App\Models\Account;
use App\Models\ChartOfAccountSubtype;
use App\Models\Company;
use App\Models\Document;
use App\Models\JournalEntry;
use App\Models\JournalEntryLine;
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
        $subtype = ChartOfAccountSubtype::factory()->create(['name' => 'Internet Expense']);

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

    public function test_description_uses_transaction_line_description_when_available(): void
    {
        $account = $this->makeAccount('expense');

        $document = Document::factory()->create([
            'company_id'    => $this->company->id,
            'document_date' => '2026-02-01',
            'status'        => 'approved',
        ]);

        $txLine = TransactionLine::factory()->create([
            'document_id' => $document->id,
            'account_id'  => $account->id,
            'description' => 'Purchased office supplies',
            'type'        => 'expense',
            'amount'      => 1000.0,
        ]);

        $entry = JournalEntry::create([
            'company_id'  => $this->company->id,
            'document_id' => $document->id,
            'entry_date'  => '2026-02-01',
            'description' => 'Entry description',
            'status'      => 'posted',
            'posted_by'   => $this->user->id,
            'posted_at'   => Carbon::now(),
        ]);

        JournalEntryLine::create([
            'journal_entry_id'    => $entry->id,
            'account_id'          => $account->id,
            'transaction_line_id' => $txLine->id,
            'description'         => 'JEL description',
            'debit'               => 1000.0,
            'credit'              => null,
        ]);

        $result = (new GJService())->getData($this->company, $this->start, $this->end);

        $this->assertCount(1, $result);
        $this->assertSame('Purchased office supplies', $result[0]['description']);
    }

    public function test_description_falls_back_to_jel_description_when_no_transaction_line(): void
    {
        $account = $this->makeAccount('expense');

        $entry = JournalEntry::create([
            'company_id'  => $this->company->id,
            'entry_date'  => '2026-02-01',
            'description' => 'Entry description',
            'status'      => 'posted',
            'posted_by'   => $this->user->id,
            'posted_at'   => Carbon::now(),
        ]);

        JournalEntryLine::create([
            'journal_entry_id' => $entry->id,
            'account_id'       => $account->id,
            'description'      => 'JEL description',
            'debit'            => 500.0,
            'credit'           => null,
        ]);

        $result = (new GJService())->getData($this->company, $this->start, $this->end);

        $this->assertCount(1, $result);
        $this->assertSame('JEL description', $result[0]['description']);
    }

    public function test_description_falls_back_to_entry_description_when_no_line_descriptions(): void
    {
        $account = $this->makeAccount('expense');

        $entry = JournalEntry::create([
            'company_id'  => $this->company->id,
            'entry_date'  => '2026-02-01',
            'description' => 'Entry description',
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
        $this->assertSame('Entry description', $result[0]['description']);
    }

    public function test_description_falls_back_to_jel_description_when_transaction_line_has_null_description(): void
    {
        $account = $this->makeAccount('expense');

        $document = Document::factory()->create([
            'company_id'    => $this->company->id,
            'document_date' => '2026-02-01',
            'status'        => 'approved',
        ]);

        $txLine = TransactionLine::factory()->create([
            'document_id' => $document->id,
            'account_id'  => $account->id,
            'description' => null,
            'type'        => 'expense',
            'amount'      => 1000.0,
        ]);

        $entry = JournalEntry::create([
            'company_id'  => $this->company->id,
            'document_id' => $document->id,
            'entry_date'  => '2026-02-01',
            'description' => 'Entry description',
            'status'      => 'posted',
            'posted_by'   => $this->user->id,
            'posted_at'   => Carbon::now(),
        ]);

        JournalEntryLine::create([
            'journal_entry_id'    => $entry->id,
            'account_id'          => $account->id,
            'transaction_line_id' => $txLine->id,
            'description'         => 'JEL description',
            'debit'               => 1000.0,
            'credit'              => null,
        ]);

        $result = (new GJService())->getData($this->company, $this->start, $this->end);

        $this->assertCount(1, $result);
        $this->assertSame('JEL description', $result[0]['description']);
    }
}
