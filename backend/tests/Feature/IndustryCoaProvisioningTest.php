<?php

namespace Tests\Feature;

use App\Models\Company;
use App\Models\User;
use App\Services\Accounting\ChartOfAccountsService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class IndustryCoaProvisioningTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(\Database\Seeders\AccountTypeSeeder::class);
        $this->seed(\Database\Seeders\ChartOfAccountSeeder::class);
        $this->seed(\Database\Seeders\ChartOfAccountIndustrySeeder::class);
    }

    private function makeCompany(string $industry): Company
    {
        return Company::create([
            'name'          => 'Test Co',
            'mobile'        => '09000000000',
            'bir_type'      => 'non_vat',
            'plan'          => 'starter',
            'industry_type' => $industry,
        ]);
    }

    public function test_retail_client_gets_merchandise_inventory_account(): void
    {
        $company = $this->makeCompany('retail');
        (new ChartOfAccountsService())->seedDefaultAccounts($company);

        $this->assertDatabaseHas('accounts', [
            'company_id' => $company->id,
            'code'       => '1030',
            'name'       => 'Merchandise Inventory',
        ]);
    }

    public function test_retail_client_does_not_get_food_inventory(): void
    {
        $company = $this->makeCompany('retail');
        (new ChartOfAccountsService())->seedDefaultAccounts($company);

        $this->assertDatabaseMissing('accounts', [
            'company_id' => $company->id,
            'code'       => '1031',
        ]);
    }

    public function test_restaurant_client_gets_food_and_beverage_inventory(): void
    {
        $company = $this->makeCompany('restaurant');
        (new ChartOfAccountsService())->seedDefaultAccounts($company);

        $this->assertDatabaseHas('accounts', ['company_id' => $company->id, 'code' => '1031']);
        $this->assertDatabaseHas('accounts', ['company_id' => $company->id, 'code' => '1032']);
    }

    public function test_all_clients_get_ewt_professional_fees_account(): void
    {
        foreach (['retail', 'services', 'restaurant', 'construction', 'professional_services', 'manufacturing'] as $industry) {
            $company = $this->makeCompany($industry);
            (new ChartOfAccountsService())->seedDefaultAccounts($company);

            $exists = \App\Models\Account::where('company_id', $company->id)->where('code', '2210')->exists();
            $this->assertTrue($exists, "EWT account missing for industry: {$industry}");
        }
    }

    public function test_all_clients_get_wtc_payable_account(): void
    {
        foreach (['retail', 'services', 'restaurant', 'construction', 'professional_services', 'manufacturing'] as $industry) {
            $company = $this->makeCompany($industry);
            (new ChartOfAccountsService())->seedDefaultAccounts($company);

            $exists = \App\Models\Account::where('company_id', $company->id)->where('code', '2220')->exists();
            $this->assertTrue($exists, "WTC account missing for industry: {$industry}");
        }
    }

    public function test_manufacturing_client_gets_raw_materials_and_finished_goods(): void
    {
        $company = $this->makeCompany('manufacturing');
        (new ChartOfAccountsService())->seedDefaultAccounts($company);

        $this->assertDatabaseHas('accounts', ['company_id' => $company->id, 'code' => '1035']);
        $this->assertDatabaseHas('accounts', ['company_id' => $company->id, 'code' => '1036']);
        $this->assertDatabaseHas('accounts', ['company_id' => $company->id, 'code' => '1037']);
    }

    public function test_services_client_does_not_get_merchandise_inventory(): void
    {
        $company = $this->makeCompany('services');
        (new ChartOfAccountsService())->seedDefaultAccounts($company);

        $this->assertDatabaseMissing('accounts', [
            'company_id' => $company->id,
            'code'       => '1030',
        ]);
    }

    public function test_liability_type_accounts_are_seeded_correctly(): void
    {
        $company = $this->makeCompany('retail');
        (new ChartOfAccountsService())->seedDefaultAccounts($company);

        $this->assertDatabaseHas('accounts', [
            'company_id' => $company->id,
            'code'       => '2210',
            'type'       => 'liability',
        ]);
    }
}
