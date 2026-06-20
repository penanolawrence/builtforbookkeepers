<?php

namespace Tests\Feature;

use App\Models\Account;
use App\Models\ChartOfAccount;
use App\Models\Company;
use App\Models\Document;
use App\Models\JournalEntry;
use App\Models\JournalEntryLine;
use App\Models\Merchant;
use App\Models\User;
use App\Services\BIR\AlphaListService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Tests\TestCase;

class AlphaListServiceTest extends TestCase
{
    use RefreshDatabase;

    private Company $company;
    private User    $user;
    private Carbon  $start;
    private Carbon  $end;

    protected function setUp(): void
    {
        parent::setUp();

        $this->user    = User::factory()->create(['role' => 'accountant']);
        $this->company = Company::factory()->create(['accountant_id' => $this->user->id]);
        $this->start   = Carbon::parse('2026-01-01')->startOfDay();
        $this->end     = Carbon::parse('2026-12-31')->endOfDay();
    }

    private function makeEwtAccount(string $code, string $name, string $atc, float $rate): Account
    {
        $coa = ChartOfAccount::factory()->create([
            'code'     => $code,
            'name'     => $name,
            'atc_code' => $atc,
            'ewt_rate' => $rate,
        ]);
        return Account::factory()->create([
            'company_id'          => $this->company->id,
            'chart_of_account_id' => $coa->id,
            'code'                => $code,
            'name'                => $name,
            'type'                => 'tax_credit',
        ]);
    }

    private function makeEwtJournalEntry(Account $ewtAccount, ?Merchant $merchant, float $ewtCredit, string $date = '2026-03-01'): void
    {
        $doc = Document::factory()->create([
            'company_id'    => $this->company->id,
            'merchant_id'   => $merchant?->id,
            'merchant_name' => $merchant?->name ?? 'Unknown Payee',
            'document_date' => $date,
            'status'        => 'approved',
        ]);

        $entry = JournalEntry::create([
            'company_id'  => $this->company->id,
            'document_id' => $doc->id,
            'entry_date'  => $date,
            'description' => 'EWT entry',
            'status'      => 'posted',
            'posted_by'   => $this->user->id,
            'posted_at'   => Carbon::now(),
        ]);

        JournalEntryLine::create([
            'journal_entry_id' => $entry->id,
            'account_id'       => $ewtAccount->id,
            'debit'            => null,
            'credit'           => $ewtCredit,
        ]);
    }

    public function test_returns_empty_when_no_ewt_lines(): void
    {
        $result = (new AlphaListService())->getData($this->company, $this->start, $this->end);
        $this->assertSame([], $result);
    }

    public function test_single_ewt_line_produces_one_row(): void
    {
        $merchant = Merchant::factory()->create([
            'company_id' => $this->company->id,
            'name'       => 'Acme Corp',
            'tin'        => '123-456-789-000',
            'address'    => '1 Main St, Manila',
        ]);
        $ewtAccount = $this->makeEwtAccount('2210', 'EWT — Professional Fees', 'WC010', 10.00);

        $this->makeEwtJournalEntry($ewtAccount, $merchant, 500.00);

        $result = (new AlphaListService())->getData($this->company, $this->start, $this->end);

        $this->assertCount(1, $result);
        $this->assertSame('123-456-789-000', $result[0]['tin']);
        $this->assertSame('Acme Corp', $result[0]['payeeName']);
        $this->assertSame('1 Main St, Manila', $result[0]['address']);
        $this->assertSame('WC010', $result[0]['atcCode']);
        $this->assertSame('EWT — Professional Fees', $result[0]['natureOfIncome']);
        $this->assertEqualsWithDelta(500.00, $result[0]['ewtAmount'], 0.01);
        $this->assertEqualsWithDelta(10.00, $result[0]['rate'], 0.01);
        $this->assertEqualsWithDelta(5000.00, $result[0]['grossPayment'], 0.01);
    }

    public function test_multiple_lines_same_merchant_and_account_are_consolidated(): void
    {
        $merchant   = Merchant::factory()->create(['company_id' => $this->company->id]);
        $ewtAccount = $this->makeEwtAccount('2211', 'EWT — Rental', 'WC158', 5.00);

        $this->makeEwtJournalEntry($ewtAccount, $merchant, 200.00, '2026-02-01');
        $this->makeEwtJournalEntry($ewtAccount, $merchant, 300.00, '2026-03-01');

        $result = (new AlphaListService())->getData($this->company, $this->start, $this->end);

        $this->assertCount(1, $result);
        $this->assertEqualsWithDelta(500.00, $result[0]['ewtAmount'], 0.01);
        $this->assertEqualsWithDelta(10000.00, $result[0]['grossPayment'], 0.01);
    }

    public function test_different_merchants_produce_separate_rows(): void
    {
        $ewtAccount = $this->makeEwtAccount('2210', 'EWT — Professional Fees', 'WC010', 10.00);
        $merchantA  = Merchant::factory()->create(['company_id' => $this->company->id, 'name' => 'Alpha Co']);
        $merchantB  = Merchant::factory()->create(['company_id' => $this->company->id, 'name' => 'Beta Co']);

        $this->makeEwtJournalEntry($ewtAccount, $merchantA, 100.00);
        $this->makeEwtJournalEntry($ewtAccount, $merchantB, 200.00);

        $result = (new AlphaListService())->getData($this->company, $this->start, $this->end);

        $this->assertCount(2, $result);
    }

    public function test_same_merchant_different_atc_produces_separate_rows(): void
    {
        $merchant    = Merchant::factory()->create(['company_id' => $this->company->id]);
        $profAccount = $this->makeEwtAccount('2210', 'EWT — Professional Fees', 'WC010', 10.00);
        $rentAccount = $this->makeEwtAccount('2211', 'EWT — Rental', 'WC158', 5.00);

        $this->makeEwtJournalEntry($profAccount, $merchant, 100.00);
        $this->makeEwtJournalEntry($rentAccount, $merchant, 50.00);

        $result = (new AlphaListService())->getData($this->company, $this->start, $this->end);

        $this->assertCount(2, $result);
    }

    public function test_document_without_merchant_uses_merchant_name_fallback(): void
    {
        $ewtAccount = $this->makeEwtAccount('2212', 'EWT — Services', 'WC120', 2.00);

        $this->makeEwtJournalEntry($ewtAccount, null, 50.00);

        $result = (new AlphaListService())->getData($this->company, $this->start, $this->end);

        $this->assertCount(1, $result);
        $this->assertSame('', $result[0]['tin']);
        $this->assertSame('Unknown Payee', $result[0]['payeeName']);
        $this->assertSame('', $result[0]['address']);
    }

    public function test_multiple_documents_from_same_unlinked_payee_are_consolidated(): void
    {
        $ewtAccount = $this->makeEwtAccount('2212', 'EWT — Services', 'WC120', 2.00);

        // Two documents, same merchant_name, no linked merchant
        $this->makeEwtJournalEntry($ewtAccount, null, 50.00, '2026-02-01');
        $this->makeEwtJournalEntry($ewtAccount, null, 75.00, '2026-03-01');

        $result = (new AlphaListService())->getData($this->company, $this->start, $this->end);

        $this->assertCount(1, $result);
        $this->assertEqualsWithDelta(125.00, $result[0]['ewtAmount'], 0.01);
    }

    public function test_entries_outside_date_range_are_excluded(): void
    {
        $merchant   = Merchant::factory()->create(['company_id' => $this->company->id]);
        $ewtAccount = $this->makeEwtAccount('2210', 'EWT — Professional Fees', 'WC010', 10.00);

        $this->makeEwtJournalEntry($ewtAccount, $merchant, 100.00, '2025-12-31');

        $result = (new AlphaListService())->getData($this->company, $this->start, $this->end);

        $this->assertSame([], $result);
    }

    public function test_rows_are_sorted_by_payee_name_then_atc(): void
    {
        $zebra = Merchant::factory()->create(['company_id' => $this->company->id, 'name' => 'Zebra Inc']);
        $alpha = Merchant::factory()->create(['company_id' => $this->company->id, 'name' => 'Alpha Co']);
        $acct  = $this->makeEwtAccount('2210', 'EWT — Professional Fees', 'WC010', 10.00);

        $this->makeEwtJournalEntry($acct, $zebra, 100.00);
        $this->makeEwtJournalEntry($acct, $alpha, 200.00);

        $result = (new AlphaListService())->getData($this->company, $this->start, $this->end);

        $this->assertSame('Alpha Co', $result[0]['payeeName']);
        $this->assertSame('Zebra Inc', $result[1]['payeeName']);
    }
}
