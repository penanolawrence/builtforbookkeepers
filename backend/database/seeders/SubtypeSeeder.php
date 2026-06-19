<?php
// backend/database/seeders/SubtypeSeeder.php

namespace Database\Seeders;

use App\Models\ChartOfAccountSubtype;
use Illuminate\Database\Seeder;

class SubtypeSeeder extends Seeder
{
    public function run(): void
    {
        $names = [
            // Income
            'Sales Revenue',
            'Service Revenue',
            'Interest Income',
            'Rental Income',
            'Commission Income',
            'Other Income',
            // Expense
            'Cost of Goods Sold',
            'Salaries and Wages',
            'Rent Expense',
            'Utilities Expense',
            'Communication Expense',
            'Supplies Expense',
            'Transportation Expense',
            'Meals and Entertainment',
            'Advertising Expense',
            'Professional Fees',
            'Repairs and Maintenance',
            'Insurance Expense',
            'Depreciation Expense',
            'Taxes and Licenses',
            'Interest Expense',
            'Other Expense',
        ];

        foreach ($names as $name) {
            ChartOfAccountSubtype::firstOrCreate(
                ['name' => $name, 'chart_of_account_id' => null],
                ['code' => null, 'sort_order' => 0]
            );
        }

        $this->command->info('Subtypes: ' . count($names) . ' canonical subtypes seeded into chart_of_account_subtypes.');
    }
}
