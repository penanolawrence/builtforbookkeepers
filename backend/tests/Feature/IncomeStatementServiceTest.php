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
    private User $user;
    private Account $expenseAccount;

    protected function setUp(): void
    {
        parent::setUp();

        $this->user = User::factory()->create(['role' => 'accountant']);

        $this->company = Company::factory()->create([
            'accountant_id' => $this->user->id,
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
            'posted_by'   => $this->user->id,
            'posted_at'   => Carbon::now(),
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
