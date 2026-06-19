<?php

namespace Tests\Feature;

use App\Models\AccountType;
use App\Models\ChartOfAccount;
use App\Models\ChartOfAccountSubtype;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ChartOfAccountsSeederTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(\Database\Seeders\AccountTypeSeeder::class);
        $this->seed(\Database\Seeders\ChartOfAccountSeeder::class);
        $this->seed(\Database\Seeders\ChartOfAccountSubtypeSeeder::class);
    }

    public function test_seeds_8_account_types(): void
    {
        $this->assertDatabaseCount('account_types', 8);
    }

    public function test_seeds_77_chart_of_accounts(): void
    {
        $this->assertDatabaseCount('chart_of_accounts', 77);
    }

    public function test_seeds_121_subtypes(): void
    {
        $this->assertDatabaseCount('chart_of_account_subtypes', 121);
    }

    public function test_assets_type_has_debit_normal_balance(): void
    {
        $this->assertDatabaseHas('account_types', [
            'name'           => 'Assets',
            'code_prefix'    => 1000,
            'normal_balance' => 'debit',
        ]);
    }

    public function test_cash_on_hand_account_exists(): void
    {
        $this->assertDatabaseHas('chart_of_accounts', ['code' => '1010', 'name' => 'Cash on Hand']);
    }

    public function test_cash_in_bank_account_exists(): void
    {
        $this->assertDatabaseHas('chart_of_accounts', ['code' => '1020', 'name' => 'Cash in Bank']);
    }

    public function test_income_summary_is_under_owners_equity(): void
    {
        $equityType = AccountType::where('name', "Owner's Equity")->first();
        $this->assertNotNull($equityType, "Owner's Equity account type was not seeded");
        $this->assertDatabaseHas('chart_of_accounts', [
            'code'            => '3030',
            'name'            => 'Income Summary',
            'account_type_id' => $equityType->id,
        ]);
    }

    public function test_gcash_subtype_exists_under_cash_on_hand(): void
    {
        $account = ChartOfAccount::where('code', '1010')->first();
        $this->assertNotNull($account, 'Cash on Hand account (1010) was not seeded');
        $this->assertDatabaseHas('chart_of_account_subtypes', [
            'code'                => '1010-02',
            'name'                => 'GCash',
            'chart_of_account_id' => $account->id,
        ]);
    }

    public function test_bpi_subtype_exists_under_cash_in_bank(): void
    {
        $account = ChartOfAccount::where('code', '1020')->first();
        $this->assertNotNull($account, 'Cash in Bank account (1020) was not seeded');
        $this->assertDatabaseHas('chart_of_account_subtypes', [
            'code'                => '1020-01',
            'name'                => 'BPI',
            'chart_of_account_id' => $account->id,
        ]);
    }

    public function test_sss_phic_pagibig_splits_into_3_subtypes(): void
    {
        $account = ChartOfAccount::where('code', '6030')->first();
        $this->assertNotNull($account, 'SSS/PhilHealth/Pag-IBIG account (6030) was not seeded');
        $this->assertSame(3, ChartOfAccountSubtype::where('chart_of_account_id', $account->id)->count());
        $this->assertDatabaseHas('chart_of_account_subtypes', ['code' => '6030-01', 'name' => 'SSS Contribution']);
        $this->assertDatabaseHas('chart_of_account_subtypes', ['code' => '6030-02', 'name' => 'PhilHealth Contribution']);
        $this->assertDatabaseHas('chart_of_account_subtypes', ['code' => '6030-03', 'name' => 'Pag-IBIG Contribution']);
    }

    public function test_liabilities_type_exists(): void
    {
        $this->assertDatabaseHas('account_types', [
            'name'           => 'Liabilities',
            'code_prefix'    => 2000,
            'normal_balance' => 'credit',
        ]);
    }

    public function test_ewt_professional_fees_account_exists(): void
    {
        $this->assertDatabaseHas('chart_of_accounts', [
            'code' => '2210',
            'name' => 'EWT Payable — Professional Fees (5%/10%)',
        ]);
    }

    public function test_wtc_payable_account_exists(): void
    {
        $this->assertDatabaseHas('chart_of_accounts', [
            'code' => '2220',
            'name' => 'Withholding Tax on Compensation Payable',
        ]);
    }

    public function test_seeders_are_idempotent(): void
    {
        // Run all three seeders a second time — counts must not change
        $this->seed(\Database\Seeders\AccountTypeSeeder::class);
        $this->seed(\Database\Seeders\ChartOfAccountSeeder::class);
        $this->seed(\Database\Seeders\ChartOfAccountSubtypeSeeder::class);

        $this->assertDatabaseCount('account_types', 8);
        $this->assertDatabaseCount('chart_of_accounts', 77);
        $this->assertDatabaseCount('chart_of_account_subtypes', 121);
    }
}
