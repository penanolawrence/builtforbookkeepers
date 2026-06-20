<?php

namespace Tests\Feature;

use App\Models\ChartOfAccount;
use Database\Seeders\AccountTypeSeeder;
use Database\Seeders\ChartOfAccountSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Schema;
use Tests\TestCase;

class AlphaListMigrationTest extends TestCase
{
    use RefreshDatabase;

    public function test_chart_of_accounts_has_atc_and_rate_columns(): void
    {
        $this->assertTrue(Schema::hasColumn('chart_of_accounts', 'atc_code'));
        $this->assertTrue(Schema::hasColumn('chart_of_accounts', 'ewt_rate'));
    }

    public function test_seeder_populates_ewt_accounts_with_atc_codes(): void
    {
        $this->seed(AccountTypeSeeder::class);
        $this->seed(ChartOfAccountSeeder::class);

        $expected = [
            '2210' => ['atc_code' => 'WC010', 'ewt_rate' => '10.00'],
            '2211' => ['atc_code' => 'WC158', 'ewt_rate' =>  '5.00'],
            '2212' => ['atc_code' => 'WC120', 'ewt_rate' =>  '2.00'],
            '2213' => ['atc_code' => 'WC100', 'ewt_rate' =>  '1.00'],
            '2214' => ['atc_code' => 'WC140', 'ewt_rate' =>  '2.00'],
            '2215' => ['atc_code' => 'WC160', 'ewt_rate' => '10.00'],
        ];

        foreach ($expected as $code => $fields) {
            $coa = ChartOfAccount::where('code', $code)->first();
            $this->assertNotNull($coa, "COA {$code} not found");
            $this->assertSame($fields['atc_code'], $coa->atc_code);
            $this->assertSame($fields['ewt_rate'], $coa->ewt_rate);
        }
    }
}
