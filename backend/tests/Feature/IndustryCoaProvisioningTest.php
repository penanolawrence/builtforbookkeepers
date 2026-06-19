<?php

namespace Tests\Feature;

use App\Models\Company;
use App\Models\User;
use App\Services\Accounting\ChartOfAccountsService;
use App\Services\Auth\InviteTokenService;
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

    public function test_setup_endpoint_seeds_accounts_for_client(): void
    {
        $this->seed(\Database\Seeders\AdminSeeder::class);

        // Create a company and client user
        $company = Company::create([
            'name'     => 'Setup Test Co',
            'mobile'   => '09111111111',
            'bir_type' => 'non_vat',
            'plan'     => 'starter',
        ]);

        $user = User::create([
            'name'       => 'Setup Test Co',
            'username'   => 'setuptestco',
            'password'   => bcrypt('temppass'),
            'role'       => 'client',
            'status'     => 'active',
            'company_id' => $company->id,
        ]);

        // Generate invite token
        $tokenService = new InviteTokenService();
        $rawToken = $tokenService->generate($user);

        $response = $this->postJson('/api/auth/setup', [
            'token'                 => $rawToken,
            'name'                  => 'Test Owner',
            'password'              => 'Password123!',
            'password_confirmation' => 'Password123!',
            'industry_type'         => 'retail',
        ]);

        $response->assertStatus(200);

        // Company industry_type was saved
        $this->assertDatabaseHas('companies', [
            'id'            => $company->id,
            'industry_type' => 'retail',
        ]);

        // Accounts were seeded — retail-specific account exists
        $this->assertDatabaseHas('accounts', [
            'company_id' => $company->id,
            'code'       => '1030',
        ]);

        // Non-retail account was NOT seeded
        $this->assertDatabaseMissing('accounts', [
            'company_id' => $company->id,
            'code'       => '1031',
        ]);
    }

    public function test_services_client_gets_no_cogs_accounts(): void
    {
        $company = $this->makeCompany('services');
        (new ChartOfAccountsService())->seedDefaultAccounts($company);

        // Services businesses have no COGS accounts
        $cogsCodesUniversallyRemoved = ['5010', '5020', '5030', '5040', '5050'];
        foreach ($cogsCodesUniversallyRemoved as $code) {
            $this->assertDatabaseMissing('accounts', [
                'company_id' => $company->id,
                'code'       => $code,
            ]);
        }

        // Professional services also gets no COGS
        $company2 = $this->makeCompany('professional_services');
        (new ChartOfAccountsService())->seedDefaultAccounts($company2);
        foreach ($cogsCodesUniversallyRemoved as $code) {
            $this->assertDatabaseMissing('accounts', [
                'company_id' => $company2->id,
                'code'       => $code,
            ]);
        }
    }

    public function test_setup_endpoint_returns_422_for_client_without_industry_type(): void
    {
        $company = Company::create([
            'name'     => 'No Industry Co',
            'mobile'   => '09222222222',
            'bir_type' => 'non_vat',
            'plan'     => 'starter',
        ]);

        $user = User::create([
            'name'       => 'No Industry Co',
            'username'   => 'noindustryco',
            'password'   => bcrypt('temppass'),
            'role'       => 'client',
            'status'     => 'active',
            'company_id' => $company->id,
        ]);

        $tokenService = new InviteTokenService();
        $rawToken = $tokenService->generate($user);

        $response = $this->postJson('/api/auth/setup', [
            'token'                 => $rawToken,
            'name'                  => 'Test Owner',
            'password'              => 'Password123!',
            'password_confirmation' => 'Password123!',
            // industry_type intentionally omitted
        ]);

        $response->assertStatus(422);
    }
}
