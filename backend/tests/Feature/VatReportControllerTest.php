<?php

namespace Tests\Feature;

use App\Models\Account;
use App\Models\Company;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class VatReportControllerTest extends TestCase
{
    use RefreshDatabase;

    private User $accountant;
    private Company $vatCompany;

    protected function setUp(): void
    {
        parent::setUp();
        $this->accountant = User::factory()->create(['role' => 'accountant']);
        $this->vatCompany = Company::factory()->create([
            'accountant_id' => $this->accountant->id,
            'bir_type'      => 'vat',
        ]);

        // Seed VAT accounts so JE queries don't fail on missing accounts
        Account::factory()->create(['company_id' => $this->vatCompany->id, 'code' => '2101', 'type' => 'vat']);
        Account::factory()->create(['company_id' => $this->vatCompany->id, 'code' => '1101', 'type' => 'vat']);
    }

    public function test_monthly_pdf_returns_pdf_for_vat_company(): void
    {
        $this->actingAs($this->accountant)
            ->get("/api/reports/vat/2550m/pdf?clientId={$this->vatCompany->id}&month=1&year=2026")
            ->assertOk()
            ->assertHeader('content-type', 'application/pdf');
    }

    public function test_quarterly_pdf_returns_pdf(): void
    {
        $this->actingAs($this->accountant)
            ->get("/api/reports/vat/2550q/pdf?clientId={$this->vatCompany->id}&quarter=1&year=2026")
            ->assertOk()
            ->assertHeader('content-type', 'application/pdf');
    }

    public function test_sls_pdf_returns_pdf(): void
    {
        $this->actingAs($this->accountant)
            ->get("/api/reports/vat/sls/pdf?clientId={$this->vatCompany->id}&quarter=1&year=2026")
            ->assertOk()
            ->assertHeader('content-type', 'application/pdf');
    }

    public function test_slp_pdf_returns_pdf(): void
    {
        $this->actingAs($this->accountant)
            ->get("/api/reports/vat/slp/pdf?clientId={$this->vatCompany->id}&quarter=1&year=2026")
            ->assertOk()
            ->assertHeader('content-type', 'application/pdf');
    }

    public function test_returns_422_for_non_vat_company(): void
    {
        $nonVatCompany = Company::factory()->create([
            'accountant_id' => $this->accountant->id,
            'bir_type'      => 'non_vat',
        ]);

        $this->actingAs($this->accountant)
            ->get("/api/reports/vat/2550m/pdf?clientId={$nonVatCompany->id}&month=1&year=2026")
            ->assertStatus(422);
    }

    public function test_accountant_cannot_access_other_companys_report(): void
    {
        $otherCompany = Company::factory()->create(['bir_type' => 'vat']);

        $this->actingAs($this->accountant)
            ->get("/api/reports/vat/2550m/pdf?clientId={$otherCompany->id}&month=1&year=2026")
            ->assertForbidden();
    }

    public function test_client_user_can_access_own_report(): void
    {
        $clientUser = User::factory()->create([
            'role'       => 'client',
            'company_id' => $this->vatCompany->id,
        ]);

        $this->actingAs($clientUser)
            ->get("/api/reports/vat/2550m/pdf?month=1&year=2026")
            ->assertOk()
            ->assertHeader('content-type', 'application/pdf');
    }
}
