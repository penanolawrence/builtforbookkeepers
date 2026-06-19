<?php

namespace Database\Seeders;

use App\Models\ChartOfAccount;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class ChartOfAccountIndustrySeeder extends Seeder
{
    // COA code => list of industries that receive this account.
    // Accounts NOT listed here are universal (every client gets them).
    private const MAPPING = [
        // Revenue — industry-specific
        '4020' => ['retail', 'restaurant', 'manufacturing'],
        '4021' => ['construction'],
        '4030' => ['services', 'professional_services'],
        '4040' => ['professional_services'],
        '4041' => ['services'],
        '4042' => ['services', 'professional_services'],
        '4070' => ['services'],
        '4080' => ['construction', 'professional_services', 'services'],
        // COGS — existing accounts made industry-specific
        '5010' => ['retail', 'restaurant'],
        '5020' => ['retail', 'manufacturing', 'construction'],
        '5030' => ['manufacturing', 'construction'],
        '5040' => ['retail', 'restaurant'],
        '5050' => ['manufacturing', 'construction'],
        // COGS — new accounts
        '5060' => ['retail'],
        '5061' => ['restaurant'],
        '5062' => ['restaurant'],
        '5063' => ['construction'],
        '5064' => ['construction'],
        '5065' => ['construction'],
        '5066' => ['manufacturing'],
        '5067' => ['manufacturing'],
        '5068' => ['manufacturing'],
        // Assets — inventory (new accounts)
        '1030' => ['retail'],
        '1031' => ['restaurant'],
        '1032' => ['restaurant'],
        '1033' => ['construction'],
        '1034' => ['construction'],
        '1035' => ['manufacturing'],
        '1036' => ['manufacturing'],
        '1037' => ['manufacturing'],
    ];

    public function run(): void
    {
        $coaByCode = ChartOfAccount::pluck('id', 'code');
        $inserted  = 0;

        foreach (self::MAPPING as $code => $industries) {
            $coaId = $coaByCode[$code] ?? null;
            if (! $coaId) {
                $this->command->warn("ChartOfAccountIndustrySeeder: code '{$code}' not found — skipping.");
                continue;
            }

            foreach ($industries as $industry) {
                DB::table('chart_of_account_industries')->insertOrIgnore([
                    'chart_of_account_id' => $coaId,
                    'industry'            => $industry,
                ]);
                $inserted++;
            }
        }

        $this->command->info("ChartOfAccountIndustrySeeder: {$inserted} industry tags seeded.");
    }
}
