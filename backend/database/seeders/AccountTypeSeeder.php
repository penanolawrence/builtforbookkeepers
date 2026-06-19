<?php

namespace Database\Seeders;

use App\Models\AccountType;
use Illuminate\Database\Seeder;

class AccountTypeSeeder extends Seeder
{
    public function run(): void
    {
        $types = [
            ['name' => 'Assets',              'code_prefix' => 1000, 'normal_balance' => 'debit',  'sort_order' => 1],
            ['name' => 'Liabilities',         'code_prefix' => 2000, 'normal_balance' => 'credit', 'sort_order' => 2],
            ['name' => "Owner's Equity",      'code_prefix' => 3000, 'normal_balance' => 'credit', 'sort_order' => 3],
            ['name' => 'Revenue / Income',    'code_prefix' => 4000, 'normal_balance' => 'credit', 'sort_order' => 4],
            ['name' => 'Cost of Goods Sold',  'code_prefix' => 5000, 'normal_balance' => 'debit',  'sort_order' => 5],
            ['name' => 'Expenses',            'code_prefix' => 6000, 'normal_balance' => 'debit',  'sort_order' => 6],
            ['name' => 'Other Income',        'code_prefix' => 7000, 'normal_balance' => 'credit', 'sort_order' => 7],
            ['name' => 'Other Expenses',      'code_prefix' => 8000, 'normal_balance' => 'debit',  'sort_order' => 8],
        ];

        foreach ($types as $type) {
            AccountType::firstOrCreate(['name' => $type['name']], $type);
        }

        $this->command->info('AccountTypeSeeder: ' . count($types) . ' account types seeded.');
    }
}
