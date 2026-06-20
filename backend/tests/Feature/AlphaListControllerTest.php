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
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Tests\TestCase;

class AlphaListControllerTest extends TestCase
{
    use RefreshDatabase;

    private User    $client;
    private Company $company;

    protected function setUp(): void
    {
        parent::setUp();

        $this->company = Company::factory()->create();
        $this->client  = User::factory()->create([
            'role'       => 'client',
            'company_id' => $this->company->id,
        ]);
    }

    private function makeEwtSetup(): void
    {
        $coa = ChartOfAccount::factory()->create([
            'code'     => '2210',
            'atc_code' => 'WC010',
            'ewt_rate' => 10.00,
        ]);
        $account = Account::factory()->create([
            'company_id'          => $this->company->id,
            'chart_of_account_id' => $coa->id,
            'code'                => '2210',
            'type'                => 'tax_credit',
        ]);
        $merchant = Merchant::factory()->create([
            'company_id' => $this->company->id,
            'name'       => 'Test Payee',
            'tin'        => '123-456-789',
        ]);
        $doc = Document::factory()->create([
            'company_id'  => $this->company->id,
            'merchant_id' => $merchant->id,
            'status'      => 'approved',
        ]);
        $entry = JournalEntry::create([
            'company_id'  => $this->company->id,
            'document_id' => $doc->id,
            'entry_date'  => '2026-03-01',
            'description' => 'EWT',
            'status'      => 'posted',
            'posted_by'   => $this->client->id,
            'posted_at'   => Carbon::now(),
        ]);
        JournalEntryLine::create([
            'journal_entry_id' => $entry->id,
            'account_id'       => $account->id,
            'credit'           => 100.00,
        ]);
    }

    public function test_json_endpoint_returns_rows_for_client(): void
    {
        $this->makeEwtSetup();

        $response = $this->actingAs($this->client)
            ->getJson('/api/reports/alpha-list?start=2026-01-01&end=2026-12-31');

        $response->assertOk()
            ->assertJsonStructure(['rows', 'period'])
            ->assertJsonCount(1, 'rows')
            ->assertJsonPath('rows.0.atcCode', 'WC010')
            ->assertJsonPath('rows.0.tin', '123-456-789');
    }

    public function test_json_endpoint_returns_empty_rows_when_no_ewt(): void
    {
        $response = $this->actingAs($this->client)
            ->getJson('/api/reports/alpha-list?start=2026-01-01&end=2026-12-31');

        $response->assertOk()->assertJsonCount(0, 'rows');
    }

    public function test_csv_endpoint_returns_csv_content_type(): void
    {
        $this->makeEwtSetup();

        $response = $this->actingAs($this->client)
            ->get('/api/reports/alpha-list/csv?start=2026-01-01&end=2026-12-31');

        $response->assertOk();
        $this->assertStringContainsString('text/csv', $response->headers->get('Content-Type'));
        $this->assertStringContainsString('alpha-list-1604e', $response->headers->get('Content-Disposition'));
    }

    public function test_pdf_endpoint_returns_pdf_content_type(): void
    {
        $this->makeEwtSetup();

        $response = $this->actingAs($this->client)
            ->get('/api/reports/alpha-list/pdf?start=2026-01-01&end=2026-12-31');

        $response->assertOk();
        $this->assertStringContainsString('application/pdf', $response->headers->get('Content-Type'));
    }

    public function test_unauthenticated_request_is_rejected(): void
    {
        $this->getJson('/api/reports/alpha-list?start=2026-01-01&end=2026-12-31')
             ->assertUnauthorized();
    }
}
