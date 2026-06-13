<?php

namespace Tests\Feature;

use App\Models\Company;
use App\Models\Document;
use App\Models\PeriodClosing;
use App\Models\User;
use App\Services\Accounting\AnomalyDetector;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AnomalyDetectorTest extends TestCase
{
    use RefreshDatabase;

    private Company $company;
    private User $user;

    protected function setUp(): void
    {
        parent::setUp();
        $this->user    = User::factory()->create(['role' => 'accountant']);
        $this->company = Company::factory()->create(['accountant_id' => $this->user->id]);
    }

    private function makeDoc(array $attrs = []): Document
    {
        return Document::factory()->create(array_merge([
            'company_id'    => $this->company->id,
            'is_no_receipt' => false,
            'ref_number'    => null,
            'amount'        => null,
            'merchant_name' => null,
            'document_date' => Carbon::now()->toDateString(),
        ], $attrs));
    }

    public function test_manual_entry_is_always_yellow(): void
    {
        $doc    = $this->makeDoc(['is_no_receipt' => true]);
        $result = (new AnomalyDetector())->detect($doc);

        $this->assertSame('YELLOW', $result['flag']);
        $this->assertEmpty($result['reasons']);
    }

    public function test_document_dated_in_locked_period_is_red(): void
    {
        $closing            = new PeriodClosing(['company_id' => $this->company->id, 'period_year' => 2025, 'period_month' => 1]);
        $closing->closed_by = $this->user->id;
        $closing->closed_at = now();
        $closing->save();

        $doc    = $this->makeDoc(['document_date' => '2025-01-15']);
        $result = (new AnomalyDetector())->detect($doc);

        $this->assertSame('RED', $result['flag']);
        $this->assertContains('Transaction date is in a locked period — an adjusting entry is required', $result['reasons']);
    }

    public function test_document_dated_in_open_past_period_is_yellow(): void
    {
        $lastMonth = Carbon::now()->subMonthNoOverflow()->format('Y-m-15');
        $doc       = $this->makeDoc(['document_date' => $lastMonth]);
        $result    = (new AnomalyDetector())->detect($doc);

        $this->assertSame('YELLOW', $result['flag']);
        $this->assertContains('Transaction date is in a past period', $result['reasons']);
    }

    public function test_document_dated_in_current_month_has_no_period_flag(): void
    {
        $doc    = $this->makeDoc(['document_date' => Carbon::now()->toDateString()]);
        $result = (new AnomalyDetector())->detect($doc);

        $this->assertSame('GREEN', $result['flag']);
        $this->assertNotContains('Transaction date is in a past period', $result['reasons']);
        $this->assertNotContains('Transaction date is in a locked period — an adjusting entry is required', $result['reasons']);
    }

    public function test_duplicate_or_number_in_same_period_is_red(): void
    {
        Document::factory()->create([
            'company_id'    => $this->company->id,
            'ref_number'    => 'OR-2025-001',
            'document_date' => '2025-01-10',
            'status'        => 'approved',
        ]);

        $doc    = $this->makeDoc(['ref_number' => 'OR-2025-001', 'document_date' => '2025-01-20']);
        $result = (new AnomalyDetector())->detect($doc);

        $this->assertSame('RED', $result['flag']);
        $this->assertContains('Duplicate OR number', $result['reasons']);
    }

    public function test_same_amount_and_merchant_within_7_days_is_red(): void
    {
        Document::factory()->create([
            'company_id'    => $this->company->id,
            'amount'        => '500.00',
            'merchant_name' => 'Jollibee',
            'document_date' => Carbon::now()->subDays(3)->toDateString(),
            'status'        => 'approved',
        ]);

        $doc    = $this->makeDoc(['amount' => '500.00', 'merchant_name' => 'Jollibee']);
        $result = (new AnomalyDetector())->detect($doc);

        $this->assertSame('RED', $result['flag']);
        $this->assertContains('Possible duplicate — same amount and merchant within 7 days', $result['reasons']);
    }
}
