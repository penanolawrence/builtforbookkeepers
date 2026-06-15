<?php

namespace Tests\Feature;

use App\Models\Account;
use App\Models\Company;
use App\Models\Document;
use App\Models\JournalEntry;
use App\Models\JournalEntryLine;
use App\Models\Merchant;
use App\Models\User;
use App\Services\Report\VatReportService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class VatReportServiceTest extends TestCase
{
    use RefreshDatabase;

    private VatReportService $service;
    private Company $company;
    private Account $outputVatAccount;
    private Account $inputVatAccount;

    protected function setUp(): void
    {
        parent::setUp();
        $this->service = new VatReportService();
        $this->company = Company::factory()->create(['bir_type' => 'vat']);

        $this->outputVatAccount = Account::factory()->create([
            'company_id' => $this->company->id,
            'code'       => '2101',
            'name'       => 'Output VAT',
            'type'       => 'vat',
        ]);
        $this->inputVatAccount = Account::factory()->create([
            'company_id' => $this->company->id,
            'code'       => '1101',
            'name'       => 'Input VAT',
            'type'       => 'vat',
        ]);
    }

    private function makePostedJournalEntry(string $companyId, string $date): JournalEntry
    {
        $poster = User::factory()->create();
        $doc    = Document::factory()->create([
            'company_id'  => $companyId,
            'uploaded_by' => $poster->id,
            'status'      => 'posted',
        ]);

        return JournalEntry::create([
            'company_id'  => $companyId,
            'document_id' => $doc->id,
            'ref_number'  => 'TEST-' . uniqid(),
            'entry_date'  => $date,
            'description' => 'Test VAT entry',
            'status'      => 'posted',
            'posted_by'   => $poster->id,
            'posted_at'   => now(),
        ]);
    }

    private function seedJournalEntry(string $date, float $outputVat, float $inputVat): void
    {
        $je = $this->makePostedJournalEntry($this->company->id, $date);

        if ($outputVat > 0) {
            JournalEntryLine::create([
                'journal_entry_id' => $je->id,
                'account_id'       => $this->outputVatAccount->id,
                'credit'           => $outputVat,
                'debit'            => null,
            ]);
        }

        if ($inputVat > 0) {
            JournalEntryLine::create([
                'journal_entry_id' => $je->id,
                'account_id'       => $this->inputVatAccount->id,
                'debit'            => $inputVat,
                'credit'           => null,
            ]);
        }
    }

    private function seedDocument(string $date, string $type, float $amount, float $vatAmount): void
    {
        $uploader = User::factory()->create();
        Document::factory()->create([
            'company_id'    => $this->company->id,
            'uploaded_by'   => $uploader->id,
            'status'        => 'approved',
            'document_type' => $type,
            'document_date' => $date,
            'amount'        => $amount,
            'vat_amount'    => $vatAmount,
        ]);
    }

    // ── monthly() ──────────────────────────────────────────────────────────────

    public function test_monthly_returns_zeroes_with_no_data(): void
    {
        $result = $this->service->monthly($this->company, 1, 2026);

        $this->assertEquals(0.0, $result['taxable_sales']);
        $this->assertEquals(0.0, $result['output_vat']);
        $this->assertEquals(0.0, $result['taxable_purchases']);
        $this->assertEquals(0.0, $result['input_vat']);
        $this->assertEquals(0.0, $result['net_vat_payable']);
    }

    public function test_monthly_aggregates_output_and_input_vat(): void
    {
        $this->seedJournalEntry('2026-01-15', outputVat: 1200.0, inputVat: 600.0);
        $this->seedDocument('2026-01-15', 'income',  11200.0, 1200.0);
        $this->seedDocument('2026-01-15', 'expense',  5600.0,  600.0);

        $result = $this->service->monthly($this->company, 1, 2026);

        $this->assertEquals(1200.0, $result['output_vat']);
        $this->assertEquals(600.0,  $result['input_vat']);
        $this->assertEquals(10000.0, $result['taxable_sales']);      // 11200 - 1200
        $this->assertEquals(5000.0,  $result['taxable_purchases']);   //  5600 -  600
        $this->assertEquals(600.0,   $result['net_vat_payable']);     // 1200 - 600
    }

    public function test_monthly_excludes_other_months(): void
    {
        $this->seedJournalEntry('2026-02-01', outputVat: 500.0, inputVat: 0.0);
        $this->seedDocument('2026-02-01', 'income', 5600.0, 500.0);

        $result = $this->service->monthly($this->company, 1, 2026);

        $this->assertEquals(0.0, $result['output_vat']);
        $this->assertEquals(0.0, $result['taxable_sales']);
    }

    public function test_monthly_excludes_other_companies(): void
    {
        $otherCompany       = Company::factory()->create(['bir_type' => 'vat']);
        $otherOutputAccount = Account::factory()->create([
            'company_id' => $otherCompany->id,
            'code'       => '2101',
        ]);
        $je = $this->makePostedJournalEntry($otherCompany->id, '2026-01-10');
        JournalEntryLine::create([
            'journal_entry_id' => $je->id,
            'account_id'       => $otherOutputAccount->id,
            'credit'           => 9999.0,
            'debit'            => null,
        ]);

        $result = $this->service->monthly($this->company, 1, 2026);

        $this->assertEquals(0.0, $result['output_vat']);
    }

    // ── quarterly() ────────────────────────────────────────────────────────────

    public function test_quarterly_sums_three_months(): void
    {
        $this->seedJournalEntry('2026-01-10', outputVat: 100.0, inputVat: 50.0);
        $this->seedJournalEntry('2026-02-10', outputVat: 200.0, inputVat: 80.0);
        $this->seedJournalEntry('2026-03-10', outputVat: 300.0, inputVat: 120.0);

        // The service reads VAT totals from approved documents, not journal entries.
        $this->seedDocument('2026-01-10', 'income',  1100.0, 100.0);
        $this->seedDocument('2026-01-10', 'expense',  550.0,  50.0);
        $this->seedDocument('2026-02-10', 'income',  2200.0, 200.0);
        $this->seedDocument('2026-02-10', 'expense',  880.0,  80.0);
        $this->seedDocument('2026-03-10', 'income',  3300.0, 300.0);
        $this->seedDocument('2026-03-10', 'expense', 1320.0, 120.0);

        $result = $this->service->quarterly($this->company, 1, 2026);

        $this->assertCount(3, $result['months']);
        $this->assertEquals(600.0, $result['totals']['output_vat']);
        $this->assertEquals(250.0, $result['totals']['input_vat']);
        $this->assertEquals(350.0, $result['totals']['net_vat_payable']);
    }

    public function test_quarterly_months_have_correct_labels(): void
    {
        $result = $this->service->quarterly($this->company, 2, 2026);

        $this->assertEquals('April 2026',  $result['months'][0]['label']);
        $this->assertEquals('May 2026',    $result['months'][1]['label']);
        $this->assertEquals('June 2026',   $result['months'][2]['label']);
    }

    // ── salesList() ────────────────────────────────────────────────────────────

    public function test_sales_list_returns_income_documents_with_merchant(): void
    {
        $merchant = Merchant::factory()->create(['company_id' => $this->company->id, 'name' => 'Buyer Co', 'tin' => '111-222-333-000']);
        $uploader = User::factory()->create();
        Document::factory()->create([
            'company_id'    => $this->company->id,
            'uploaded_by'   => $uploader->id,
            'status'        => 'approved',
            'document_type' => 'income',
            'document_date' => '2026-01-15',
            'amount'        => '11200.00',
            'vat_amount'    => '1200.00',
            'merchant_id'   => $merchant->id,
            'ref_number'    => 'OR-001',
        ]);

        $result = $this->service->salesList($this->company, 1, 2026);

        $this->assertCount(1, $result['rows']);
        $row = $result['rows'][0];
        $this->assertEquals('Buyer Co', $row['buyer_name']);
        $this->assertEquals('111-222-333-000', $row['buyer_tin']);
        $this->assertEquals(10000.0, $row['taxable_amount']);   // 11200 - 1200
        $this->assertEquals(1200.0,  $row['vat_amount']);
        $this->assertEquals(11200.0, $row['total_amount']);
        $this->assertEquals('OR-001', $row['ref_number']);
        $this->assertEquals(10000.0, $result['totals']['taxable_amount']);
    }

    public function test_sales_list_excludes_expense_documents(): void
    {
        $uploader = User::factory()->create();
        Document::factory()->create([
            'company_id'    => $this->company->id,
            'uploaded_by'   => $uploader->id,
            'status'        => 'approved',
            'document_type' => 'expense',
            'document_date' => '2026-01-15',
            'amount'        => '5600.00',
            'vat_amount'    => '600.00',
        ]);

        $result = $this->service->salesList($this->company, 1, 2026);

        $this->assertCount(0, $result['rows']);
    }

    public function test_sales_list_excludes_other_companies(): void
    {
        $otherCompany = Company::factory()->create(['bir_type' => 'vat']);
        $uploader     = User::factory()->create();
        Document::factory()->create([
            'company_id'    => $otherCompany->id,
            'uploaded_by'   => $uploader->id,
            'status'        => 'approved',
            'document_type' => 'income',
            'document_date' => '2026-01-15',
            'amount'        => '11200.00',
            'vat_amount'    => '1200.00',
        ]);

        $result = $this->service->salesList($this->company, 1, 2026);

        $this->assertCount(0, $result['rows']);
        $this->assertEquals(0.0, $result['totals']['taxable_amount']);
    }

    // ── purchasesList() ─────────────────────────────────────────────────────────

    public function test_purchases_list_returns_expense_documents_with_merchant(): void
    {
        $merchant = Merchant::factory()->create(['company_id' => $this->company->id, 'name' => 'Supplier Ltd', 'tin' => '444-555-666-000']);
        $uploader = User::factory()->create();
        Document::factory()->create([
            'company_id'    => $this->company->id,
            'uploaded_by'   => $uploader->id,
            'status'        => 'approved',
            'document_type' => 'expense',
            'document_date' => '2026-01-20',
            'amount'        => '5600.00',
            'vat_amount'    => '600.00',
            'merchant_id'   => $merchant->id,
            'ref_number'    => 'INV-002',
        ]);

        $result = $this->service->purchasesList($this->company, 1, 2026);

        $this->assertCount(1, $result['rows']);
        $row = $result['rows'][0];
        $this->assertEquals('Supplier Ltd', $row['supplier_name']);
        $this->assertEquals('444-555-666-000', $row['supplier_tin']);
        $this->assertEquals(5000.0, $row['taxable_amount']);   // 5600 - 600
        $this->assertEquals(600.0,  $row['input_vat']);
        $this->assertEquals(5600.0, $row['total_amount']);
        $this->assertEquals('INV-002', $row['ref_number']);
        $this->assertEquals(5000.0, $result['totals']['taxable_amount']);
    }

    public function test_purchases_list_excludes_income_documents(): void
    {
        $uploader = User::factory()->create();
        Document::factory()->create([
            'company_id'    => $this->company->id,
            'uploaded_by'   => $uploader->id,
            'status'        => 'approved',
            'document_type' => 'income',
            'document_date' => '2026-01-15',
            'amount'        => '11200.00',
            'vat_amount'    => '1200.00',
        ]);

        $result = $this->service->purchasesList($this->company, 1, 2026);

        $this->assertCount(0, $result['rows']);
    }
}
