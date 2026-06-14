<?php

namespace Tests\Feature;

use App\Models\Company;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class VatReportJsonTest extends TestCase
{
    use RefreshDatabase;

    private User $client;
    private Company $company;

    protected function setUp(): void
    {
        parent::setUp();

        $this->company = Company::factory()->create(['bir_type' => 'vat']);
        $this->client  = User::factory()->create([
            'role'       => 'client',
            'company_id' => $this->company->id,
        ]);
    }

    public function test_monthly_2550m_returns_json_structure(): void
    {
        $this->actingAs($this->client)
            ->getJson('/api/reports/vat/2550m?month=1&year=2025')
            ->assertOk()
            ->assertJsonStructure([
                'month', 'year', 'period_label',
                'taxable_sales', 'output_vat',
                'taxable_purchases', 'input_vat', 'net_vat_payable',
                'company' => ['name', 'tin'],
            ]);
    }

    public function test_quarterly_2550q_returns_json_structure(): void
    {
        $this->actingAs($this->client)
            ->getJson('/api/reports/vat/2550q?quarter=1&year=2025')
            ->assertOk()
            ->assertJsonStructure([
                'quarter', 'year',
                'months' => [['month', 'label', 'taxable_sales', 'output_vat', 'taxable_purchases', 'input_vat', 'net_vat_payable']],
                'totals' => ['taxable_sales', 'output_vat', 'taxable_purchases', 'input_vat', 'net_vat_payable'],
                'company' => ['name', 'tin'],
            ]);
    }

    public function test_sls_returns_json_structure(): void
    {
        $this->actingAs($this->client)
            ->getJson('/api/reports/vat/sls?quarter=1&year=2025')
            ->assertOk()
            ->assertJsonStructure([
                'quarter', 'year', 'rows', 'totals', 'company',
            ]);
    }

    public function test_slp_returns_json_structure(): void
    {
        $this->actingAs($this->client)
            ->getJson('/api/reports/vat/slp?quarter=1&year=2025')
            ->assertOk()
            ->assertJsonStructure([
                'quarter', 'year', 'rows', 'totals', 'company',
            ]);
    }

    public function test_non_vat_client_gets_422(): void
    {
        $nonVatCompany = Company::factory()->create(['bir_type' => 'non_vat']);
        $nonVatClient  = User::factory()->create([
            'role'       => 'client',
            'company_id' => $nonVatCompany->id,
        ]);

        $this->actingAs($nonVatClient)
            ->getJson('/api/reports/vat/2550m?month=1&year=2025')
            ->assertStatus(422);
    }

    public function test_unauthenticated_gets_401(): void
    {
        $this->getJson('/api/reports/vat/2550m?month=1&year=2025')
            ->assertUnauthorized();
    }
}
