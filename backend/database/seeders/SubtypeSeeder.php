<?php

namespace Database\Seeders;

use App\Models\Subtype;
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
            Subtype::firstOrCreate(['name' => $name]);
        }

        $this->command->info('Subtypes: ' . count($names) . ' canonical subtypes seeded.');
    }
}
