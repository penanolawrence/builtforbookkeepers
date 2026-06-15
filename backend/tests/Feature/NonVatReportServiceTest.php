<?php

namespace Tests\Feature;

use App\Models\Company;
use App\Models\Document;
use App\Models\User;
use App\Services\Report\NonVatReportService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class NonVatReportServiceTest extends TestCase
{
    use RefreshDatabase;

    private NonVatReportService $service;
    private Company $company;

    protected function setUp(): void
    {
        parent::setUp();
        $this->service = new NonVatReportService();
        $this->company = Company::factory()->create(['bir_type' => 'non_vat']);
    }

    private function makeDocument(string $date, float $amount, string $type = 'income'): void
    {
        $uploader = User::factory()->create();
        Document::factory()->create([
            'company_id'    => $this->company->id,
            'uploaded_by'   => $uploader->id,
            'document_type' => $type,
            'document_date' => $date,
            'amount'        => $amount,
            'status'        => 'approved',
        ]);
    }

    public function test_quarterly_sums_income_per_month_and_computes_3_percent_tax(): void
    {
        $this->makeDocument('2026-01-10', 10000.00);
        $this->makeDocument('2026-01-20', 5000.00);
        $this->makeDocument('2026-02-05', 8000.00);
        // March: no income

        $result = $this->service->quarterly($this->company, 1, 2026);

        $jan = collect($result['months'])->firstWhere('month', 1);
        $feb = collect($result['months'])->firstWhere('month', 2);
        $mar = collect($result['months'])->firstWhere('month', 3);

        $this->assertEquals(15000.00, $jan['gross_receipts']);
        $this->assertEquals(450.00,   $jan['percentage_tax']);

        $this->assertEquals(8000.00, $feb['gross_receipts']);
        $this->assertEquals(240.00,  $feb['percentage_tax']);

        $this->assertEquals(0.00, $mar['gross_receipts']);
        $this->assertEquals(0.00, $mar['percentage_tax']);

        $this->assertEquals(23000.00, $result['totals']['gross_receipts']);
        $this->assertEquals(690.00,   $result['totals']['percentage_tax']);
    }

    public function test_expense_documents_are_excluded(): void
    {
        $this->makeDocument('2026-01-10', 10000.00, 'income');
        $this->makeDocument('2026-01-15', 3000.00,  'expense');

        $result = $this->service->quarterly($this->company, 1, 2026);

        $jan = collect($result['months'])->firstWhere('month', 1);
        $this->assertEquals(10000.00, $jan['gross_receipts']);
    }

    public function test_non_approved_documents_are_excluded(): void
    {
        $uploader = User::factory()->create();
        Document::factory()->create([
            'company_id'    => $this->company->id,
            'uploaded_by'   => $uploader->id,
            'document_type' => 'income',
            'document_date' => '2026-01-10',
            'amount'        => 10000.00,
            'status'        => 'parked',
        ]);

        $result = $this->service->quarterly($this->company, 1, 2026);

        $jan = collect($result['months'])->firstWhere('month', 1);
        $this->assertEquals(0.00, $jan['gross_receipts']);
    }

    public function test_returns_correct_structure(): void
    {
        $result = $this->service->quarterly($this->company, 2, 2026);

        $this->assertEquals(2,    $result['quarter']);
        $this->assertEquals(2026, $result['year']);
        $this->assertCount(3, $result['months']);
        $this->assertArrayHasKey('gross_receipts', $result['totals']);
        $this->assertArrayHasKey('percentage_tax',  $result['totals']);

        $firstMonth = $result['months'][0];
        $this->assertArrayHasKey('month',          $firstMonth);
        $this->assertArrayHasKey('label',          $firstMonth);
        $this->assertArrayHasKey('gross_receipts', $firstMonth);
        $this->assertArrayHasKey('percentage_tax', $firstMonth);
    }
}
