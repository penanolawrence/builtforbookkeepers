<?php

namespace Tests\Feature;

use App\Models\Company;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class NonVatReportControllerTest extends TestCase
{
    use RefreshDatabase;

    private User $accountant;
    private Company $nonVatCompany;

    protected function setUp(): void
    {
        parent::setUp();
        $this->accountant    = User::factory()->create(['role' => 'accountant']);
        $this->nonVatCompany = Company::factory()->create([
            'accountant_id' => $this->accountant->id,
            'bir_type'      => 'non_vat',
        ]);
    }

    public function test_quarterly_pdf_returns_pdf_for_non_vat_company(): void
    {
        $this->actingAs($this->accountant)
            ->get("/api/reports/non-vat/2551q/pdf?clientId={$this->nonVatCompany->id}&quarter=1&year=2026")
            ->assertOk()
            ->assertHeader('content-type', 'application/pdf');
    }

    public function test_returns_422_for_vat_company(): void
    {
        $vatCompany = Company::factory()->create([
            'accountant_id' => $this->accountant->id,
            'bir_type'      => 'vat',
        ]);

        $this->actingAs($this->accountant)
            ->get("/api/reports/non-vat/2551q/pdf?clientId={$vatCompany->id}&quarter=1&year=2026")
            ->assertStatus(422);
    }

    public function test_accountant_cannot_access_other_companys_report(): void
    {
        $otherCompany = Company::factory()->create(['bir_type' => 'non_vat']);

        $this->actingAs($this->accountant)
            ->get("/api/reports/non-vat/2551q/pdf?clientId={$otherCompany->id}&quarter=1&year=2026")
            ->assertStatus(403);
    }
}
