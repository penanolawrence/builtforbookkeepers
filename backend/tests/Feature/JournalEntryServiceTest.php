<?php

namespace Tests\Feature;

use App\Models\Account;
use App\Models\AdjustingEntry;
use App\Models\AdjustingEntryLine;
use App\Models\Company;
use App\Models\Document;
use App\Models\JournalEntry;
use App\Models\JournalEntryLine;
use App\Models\TransactionLine;
use App\Models\User;
use App\Services\Accounting\JournalEntryService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class JournalEntryServiceTest extends TestCase
{
    use RefreshDatabase;

    private Company $company;
    private User $user;
    private Account $cashAccount;
    private Account $revenueAccount;
    private Account $expenseAccount;

    protected function setUp(): void
    {
        parent::setUp();

        $this->user = User::factory()->create(['role' => 'accountant']);

        $this->company = Company::factory()->create([
            'accountant_id' => $this->user->id,
            'bir_type'      => 'non_vat',
        ]);

        $this->cashAccount = Account::factory()->create([
            'company_id' => $this->company->id,
            'code'       => '1001',
            'name'       => 'Cash on Hand',
            'type'       => 'cash',
        ]);

        $this->revenueAccount = Account::factory()->create([
            'company_id' => $this->company->id,
            'code'       => '4001',
            'name'       => 'Sales Revenue',
            'type'       => 'income',
        ]);

        $this->expenseAccount = Account::factory()->create([
            'company_id' => $this->company->id,
            'code'       => '5001',
            'name'       => 'Utilities Expense',
            'type'       => 'expense',
        ]);
    }

    private function makeDocument(array $attrs = []): Document
    {
        return Document::factory()->create(array_merge([
            'company_id'     => $this->company->id,
            'status'         => 'parked',
            'document_type'  => 'income',
            'document_date'  => '2024-05-20',
            'payment_method' => 'cash',
            'amount'         => 1000.00,
            'account_id'     => null,
        ], $attrs));
    }

    public function test_posts_income_lines_as_credits_with_cash_debit(): void
    {
        $doc = $this->makeDocument();
        TransactionLine::factory()->create([
            'document_id' => $doc->id,
            'account_id'  => $this->revenueAccount->id,
            'type'        => 'income',
            'amount'      => 600.00,
            'date'        => '2024-05-20',
        ]);
        TransactionLine::factory()->create([
            'document_id' => $doc->id,
            'account_id'  => $this->revenueAccount->id,
            'type'        => 'income',
            'amount'      => 400.00,
            'date'        => '2024-05-20',
        ]);

        $doc->load('transactionLines');
        (new JournalEntryService())->postFromDocument($doc, $this->user);

        $lines = JournalEntryLine::all();
        $this->assertCount(3, $lines); // 2 income credits + 1 cash debit

        $cashLine = $lines->firstWhere('account_id', $this->cashAccount->id);
        $this->assertEquals('1000.00', $cashLine->debit);
        $this->assertNull($cashLine->credit);

        $creditLines = $lines->where('account_id', $this->revenueAccount->id);
        $this->assertCount(2, $creditLines);
        foreach ($creditLines as $line) {
            $this->assertNull($line->debit);
            $this->assertNotNull($line->credit);
        }
        $this->assertEquals('1000.00', $creditLines->sum('credit'));
    }

    public function test_posts_expense_lines_as_debits_with_cash_credit(): void
    {
        $doc = $this->makeDocument(['document_type' => 'expense', 'amount' => 500.00]);
        TransactionLine::factory()->create([
            'document_id' => $doc->id,
            'account_id'  => $this->expenseAccount->id,
            'type'        => 'expense',
            'amount'      => 500.00,
            'date'        => '2024-05-20',
        ]);

        $doc->load('transactionLines');
        (new JournalEntryService())->postFromDocument($doc, $this->user);

        $lines = JournalEntryLine::all();
        $this->assertCount(2, $lines); // 1 expense debit + 1 cash credit

        $cashLine = $lines->firstWhere('account_id', $this->cashAccount->id);
        $this->assertNull($cashLine->debit);
        $this->assertEquals('500.00', $cashLine->credit);

        $expenseLine = $lines->firstWhere('account_id', $this->expenseAccount->id);
        $this->assertEquals('500.00', $expenseLine->debit);
        $this->assertNull($expenseLine->credit);
    }

    public function test_mixed_lines_net_to_single_cash_line(): void
    {
        $doc = $this->makeDocument(['amount' => 1000.00]);
        TransactionLine::factory()->create([
            'document_id' => $doc->id,
            'account_id'  => $this->revenueAccount->id,
            'type'        => 'income',
            'amount'      => 1000.00,
            'date'        => '2024-05-20',
        ]);
        TransactionLine::factory()->create([
            'document_id' => $doc->id,
            'account_id'  => $this->expenseAccount->id,
            'type'        => 'expense',
            'amount'      => 200.00,
            'date'        => '2024-05-20',
        ]);

        $doc->load('transactionLines');
        (new JournalEntryService())->postFromDocument($doc, $this->user);

        $lines = JournalEntryLine::all();
        $this->assertCount(3, $lines); // 1 revenue credit + 1 expense debit + 1 cash debit (net)

        $cashLine = $lines->firstWhere('account_id', $this->cashAccount->id);
        $this->assertEquals('800.00', $cashLine->debit);
        $this->assertNull($cashLine->credit);

        $revenueLine = $lines->firstWhere('account_id', $this->revenueAccount->id);
        $this->assertNull($revenueLine->debit);
        $this->assertEquals('1000.00', $revenueLine->credit);

        $expenseLine = $lines->firstWhere('account_id', $this->expenseAccount->id);
        $this->assertEquals('200.00', $expenseLine->debit);
        $this->assertNull($expenseLine->credit);
    }

    public function test_does_not_require_document_account_id(): void
    {
        $doc = $this->makeDocument(['account_id' => null]);
        TransactionLine::factory()->create([
            'document_id' => $doc->id,
            'account_id'  => $this->revenueAccount->id,
            'type'        => 'income',
            'amount'      => 500.00,
            'date'        => '2024-05-20',
        ]);

        $doc->load('transactionLines');

        $this->expectNotToPerformAssertions();
        (new JournalEntryService())->postFromDocument($doc, $this->user);
    }

    public function test_null_payment_method_uses_cash_on_hand(): void
    {
        $doc = $this->makeDocument(['payment_method' => null]);
        TransactionLine::factory()->create([
            'document_id' => $doc->id,
            'account_id'  => $this->revenueAccount->id,
            'type'        => 'income',
            'amount'      => 300.00,
            'date'        => '2024-05-20',
        ]);

        $doc->load('transactionLines');
        (new JournalEntryService())->postFromDocument($doc, $this->user);

        $cashLine = JournalEntryLine::where('account_id', $this->cashAccount->id)->first();
        $this->assertNotNull($cashLine);
        $this->assertEquals('300.00', $cashLine->debit);
    }

    public function test_throws_when_line_is_missing_account_id(): void
    {
        $doc = $this->makeDocument();
        TransactionLine::factory()->create([
            'document_id' => $doc->id,
            'account_id'  => null,
            'type'        => 'income',
            'amount'      => 500.00,
            'date'        => '2024-05-20',
        ]);

        $doc->load('transactionLines');

        $this->expectException(\RuntimeException::class);
        $this->expectExceptionMessageMatches('/missing an account/i');
        (new JournalEntryService())->postFromDocument($doc, $this->user);
    }

    public function test_journal_entry_is_created_with_posted_status(): void
    {
        $doc = $this->makeDocument();
        TransactionLine::factory()->create([
            'document_id' => $doc->id,
            'account_id'  => $this->revenueAccount->id,
            'type'        => 'income',
            'amount'      => 500.00,
            'date'        => '2024-05-20',
        ]);

        $doc->load('transactionLines');
        (new JournalEntryService())->postFromDocument($doc, $this->user);

        $this->assertEquals('posted', JournalEntry::first()->status);
    }

    public function test_post_from_adjusting_entry_copies_line_description_to_journal_entry_lines(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);

        $entry = AdjustingEntry::create([
            'company_id'  => $this->company->id,
            'created_by'  => $this->user->id,
            'status'      => 'pending',
            'type'        => 'Reclassification',
            'entry_date'  => '2026-06-02',
            'description' => 'Test adjusting entry',
            'ref_number'  => 'ADJ-001',
        ]);

        AdjustingEntryLine::create([
            'adjusting_entry_id' => $entry->id,
            'account_id'         => $this->expenseAccount->id,
            'debit'              => 500.00,
            'credit'             => null,
            'description'        => 'Office supplies purchase',
        ]);

        AdjustingEntryLine::create([
            'adjusting_entry_id' => $entry->id,
            'account_id'         => $this->revenueAccount->id,
            'debit'              => null,
            'credit'             => 500.00,
            'description'        => null,
        ]);

        $entry->load('lines');
        (new JournalEntryService())->postFromAdjustingEntry($entry, $admin);

        $debitJEL = JournalEntryLine::where('account_id', $this->expenseAccount->id)->first();
        $this->assertEquals('Office supplies purchase', $debitJEL->description);

        $creditJEL = JournalEntryLine::where('account_id', $this->revenueAccount->id)->first();
        $this->assertNull($creditJEL->description);
    }
}
