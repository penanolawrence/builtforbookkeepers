<?php

namespace Tests\Feature;

use App\Models\Company;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class NonVatReportJsonTest extends TestCase
{
    use RefreshDatabase;

    private User $client;
    private Company $company;

    protected function setUp(): void
    {
        parent::setUp();
        $this->company = Company::factory()->create(['bir_type' => 'non_vat']);
        $this->client  = User::factory()->create([
            'role'       => 'client',
            'company_id' => $this->company->id,
        ]);
    }

    public function test_quarterly_2551q_returns_json_structure(): void
    {
        $this->actingAs($this->client)
            ->getJson('/api/reports/non-vat/2551q?quarter=1&year=2026')
            ->assertOk()
            ->assertJsonStructure([
                'quarter', 'year',
                'months' => [['month', 'label', 'gross_receipts', 'percentage_tax']],
                'totals' => ['gross_receipts', 'percentage_tax'],
                'company' => ['name', 'tin'],
            ]);
    }

    public function test_vat_client_gets_422(): void
    {
        $vatCompany = Company::factory()->create(['bir_type' => 'vat']);
        $vatClient  = User::factory()->create([
            'role'       => 'client',
            'company_id' => $vatCompany->id,
        ]);

        $this->actingAs($vatClient)
            ->getJson('/api/reports/non-vat/2551q?quarter=1&year=2026')
            ->assertStatus(422);
    }
}
