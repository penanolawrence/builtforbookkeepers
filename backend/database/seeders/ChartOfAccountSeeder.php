<?php

namespace Database\Seeders;

use App\Models\AccountType;
use App\Models\ChartOfAccount;
use Illuminate\Database\Seeder;

class ChartOfAccountSeeder extends Seeder
{
    public function run(): void
    {
        $accounts = [
            // Assets (1000s)
            ['type' => 'Assets',             'code' => '1010', 'name' => 'Cash on Hand',                          'sort_order' => 1],
            ['type' => 'Assets',             'code' => '1020', 'name' => 'Cash in Bank',                          'sort_order' => 2],

            // Assets — Tax Credits (universal)
            ['type' => 'Assets', 'code' => '1102', 'name' => 'EWT Withheld by Customers (Tax Credit)', 'sort_order' => 3],

            // Assets — Inventory (industry-specific, tagged via pivot)
            ['type' => 'Assets', 'code' => '1030', 'name' => 'Merchandise Inventory',            'sort_order' => 3],
            ['type' => 'Assets', 'code' => '1031', 'name' => 'Food Inventory',                   'sort_order' => 4],
            ['type' => 'Assets', 'code' => '1032', 'name' => 'Beverage Inventory',               'sort_order' => 5],
            ['type' => 'Assets', 'code' => '1033', 'name' => 'Construction Materials Inventory', 'sort_order' => 6],
            ['type' => 'Assets', 'code' => '1034', 'name' => 'Retention Receivable',             'sort_order' => 7],
            ['type' => 'Assets', 'code' => '1035', 'name' => 'Raw Materials Inventory',          'sort_order' => 8],
            ['type' => 'Assets', 'code' => '1036', 'name' => 'Work-in-Progress Inventory',       'sort_order' => 9],
            ['type' => 'Assets', 'code' => '1037', 'name' => 'Finished Goods Inventory',         'sort_order' => 10],

            // Liabilities (2000s) — Withholding Tax Payable (universal)
            ['type' => 'Liabilities', 'code' => '2210', 'name' => 'EWT Payable — Professional Fees (5%/10%)',  'sort_order' => 1],
            ['type' => 'Liabilities', 'code' => '2211', 'name' => 'EWT Payable — Rental (5%)',                 'sort_order' => 2],
            ['type' => 'Liabilities', 'code' => '2212', 'name' => 'EWT Payable — Services (2%)',               'sort_order' => 3],
            ['type' => 'Liabilities', 'code' => '2213', 'name' => 'EWT Payable — Goods & Supplies (1%)',       'sort_order' => 4],
            ['type' => 'Liabilities', 'code' => '2214', 'name' => 'EWT Payable — Contractors (2%)',            'sort_order' => 5],
            ['type' => 'Liabilities', 'code' => '2215', 'name' => 'EWT Payable — Commissions (10%)',           'sort_order' => 6],
            ['type' => 'Liabilities', 'code' => '2220', 'name' => 'Withholding Tax on Compensation Payable',   'sort_order' => 7],

            // Owner's Equity (3000s)
            ['type' => "Owner's Equity",     'code' => '3010', 'name' => "Owner's Capital",                       'sort_order' => 1],
            ['type' => "Owner's Equity",     'code' => '3020', 'name' => "Owner's Drawings",                      'sort_order' => 2],
            ['type' => "Owner's Equity",     'code' => '3030', 'name' => 'Income Summary',                        'sort_order' => 3],

            // Revenue / Income (4000s)
            ['type' => 'Revenue / Income',   'code' => '4010', 'name' => 'Service Revenue',                       'sort_order' => 1],
            ['type' => 'Revenue / Income',   'code' => '4020', 'name' => 'Sales Revenue',                         'sort_order' => 2],
            ['type' => 'Revenue / Income',   'code' => '4030', 'name' => 'Consulting Fees',                       'sort_order' => 3],
            ['type' => 'Revenue / Income',   'code' => '4040', 'name' => 'Professional Fees',                     'sort_order' => 4],
            ['type' => 'Revenue / Income',   'code' => '4050', 'name' => 'Commission Income',                     'sort_order' => 5],
            ['type' => 'Revenue / Income',   'code' => '4060', 'name' => 'Rental Income',                         'sort_order' => 6],
            ['type' => 'Revenue / Income',   'code' => '4070', 'name' => 'Subscription Revenue',                  'sort_order' => 7],
            ['type' => 'Revenue / Income',   'code' => '4080', 'name' => 'Project-based Revenue',                 'sort_order' => 8],
            ['type' => 'Revenue / Income',   'code' => '4090', 'name' => 'Government Grants / Subsidies',         'sort_order' => 9],
            ['type' => 'Revenue / Income',   'code' => '4099', 'name' => 'Other Operating Income',                'sort_order' => 10],

            // Revenue — industry-specific
            ['type' => 'Revenue / Income', 'code' => '4021', 'name' => 'Contract Revenue', 'sort_order' => 11],
            ['type' => 'Revenue / Income', 'code' => '4041', 'name' => 'Deferred Revenue',  'sort_order' => 12],
            ['type' => 'Revenue / Income', 'code' => '4042', 'name' => 'Unbilled Revenue',  'sort_order' => 13],

            // Cost of Goods Sold (5000s)
            ['type' => 'Cost of Goods Sold', 'code' => '5010', 'name' => 'Purchases',                             'sort_order' => 1],
            ['type' => 'Cost of Goods Sold', 'code' => '5020', 'name' => 'Freight-in',                            'sort_order' => 2],
            ['type' => 'Cost of Goods Sold', 'code' => '5030', 'name' => 'Direct Labor',                          'sort_order' => 3],
            ['type' => 'Cost of Goods Sold', 'code' => '5040', 'name' => 'Purchase Returns',                      'sort_order' => 4],
            ['type' => 'Cost of Goods Sold', 'code' => '5050', 'name' => 'Direct Materials',                      'sort_order' => 5],

            // COGS — industry-specific
            ['type' => 'Cost of Goods Sold', 'code' => '5060', 'name' => 'COGS — Merchandise',            'sort_order' => 6],
            ['type' => 'Cost of Goods Sold', 'code' => '5061', 'name' => 'COGS — Food Cost',              'sort_order' => 7],
            ['type' => 'Cost of Goods Sold', 'code' => '5062', 'name' => 'COGS — Beverage Cost',          'sort_order' => 8],
            ['type' => 'Cost of Goods Sold', 'code' => '5063', 'name' => 'COGS — Materials',              'sort_order' => 9],
            ['type' => 'Cost of Goods Sold', 'code' => '5064', 'name' => 'COGS — Labor (Subcontractors)', 'sort_order' => 10],
            ['type' => 'Cost of Goods Sold', 'code' => '5065', 'name' => 'COGS — Equipment Rental',       'sort_order' => 11],
            ['type' => 'Cost of Goods Sold', 'code' => '5066', 'name' => 'COGS — Raw Materials',          'sort_order' => 12],
            ['type' => 'Cost of Goods Sold', 'code' => '5067', 'name' => 'COGS — Direct Labor',           'sort_order' => 13],
            ['type' => 'Cost of Goods Sold', 'code' => '5068', 'name' => 'COGS — Manufacturing Overhead', 'sort_order' => 14],

            // Expenses (6000s)
            ['type' => 'Expenses',           'code' => '6010', 'name' => 'Salaries and Wages',                    'sort_order' => 1],
            ['type' => 'Expenses',           'code' => '6020', 'name' => "Owner's Compensation",                  'sort_order' => 2],
            ['type' => 'Expenses',           'code' => '6030', 'name' => 'SSS / PhilHealth / Pag-IBIG — Employer Share', 'sort_order' => 3],
            ['type' => 'Expenses',           'code' => '6040', 'name' => '13th Month Pay',                        'sort_order' => 4],
            ['type' => 'Expenses',           'code' => '6050', 'name' => 'Rent Expense',                          'sort_order' => 5],
            ['type' => 'Expenses',           'code' => '6060', 'name' => 'Utilities — Electricity',               'sort_order' => 6],
            ['type' => 'Expenses',           'code' => '6070', 'name' => 'Utilities — Water',                     'sort_order' => 7],
            ['type' => 'Expenses',           'code' => '6080', 'name' => 'Utilities — Internet and Phone',        'sort_order' => 8],
            ['type' => 'Expenses',           'code' => '6090', 'name' => 'Office Supplies Expense',               'sort_order' => 9],
            ['type' => 'Expenses',           'code' => '6100', 'name' => 'Depreciation Expense',                  'sort_order' => 10],
            ['type' => 'Expenses',           'code' => '6110', 'name' => 'Repairs and Maintenance',               'sort_order' => 11],
            ['type' => 'Expenses',           'code' => '6120', 'name' => 'Advertising and Marketing',             'sort_order' => 12],
            ['type' => 'Expenses',           'code' => '6130', 'name' => 'Transportation and Travel',             'sort_order' => 13],
            ['type' => 'Expenses',           'code' => '6140', 'name' => 'Meals and Representation',              'sort_order' => 14],
            ['type' => 'Expenses',           'code' => '6150', 'name' => 'Professional Fees — Legal',             'sort_order' => 15],
            ['type' => 'Expenses',           'code' => '6160', 'name' => 'Professional Fees — Accounting',        'sort_order' => 16],
            ['type' => 'Expenses',           'code' => '6170', 'name' => 'Insurance Expense',                     'sort_order' => 17],
            ['type' => 'Expenses',           'code' => '6180', 'name' => 'Taxes and Licenses',                    'sort_order' => 18],
            ['type' => 'Expenses',           'code' => '6190', 'name' => 'Bank Charges',                          'sort_order' => 19],
            ['type' => 'Expenses',           'code' => '6200', 'name' => 'Subscriptions and Software',            'sort_order' => 20],
            ['type' => 'Expenses',           'code' => '6210', 'name' => 'Miscellaneous Expense',                 'sort_order' => 21],

            // Other Income (7000s)
            ['type' => 'Other Income',       'code' => '7010', 'name' => 'Interest Income',                       'sort_order' => 1],
            ['type' => 'Other Income',       'code' => '7020', 'name' => 'Gain on Sale of Assets',                'sort_order' => 2],
            ['type' => 'Other Income',       'code' => '7030', 'name' => 'Foreign Exchange Gain',                 'sort_order' => 3],
            ['type' => 'Other Income',       'code' => '7040', 'name' => 'Dividend Income',                       'sort_order' => 4],
            ['type' => 'Other Income',       'code' => '7050', 'name' => 'Miscellaneous Income',                  'sort_order' => 5],

            // Other Expenses (8000s)
            ['type' => 'Other Expenses',     'code' => '8010', 'name' => 'Interest Expense',                      'sort_order' => 1],
            ['type' => 'Other Expenses',     'code' => '8020', 'name' => 'Loss on Sale of Assets',                'sort_order' => 2],
            ['type' => 'Other Expenses',     'code' => '8030', 'name' => 'Foreign Exchange Loss',                 'sort_order' => 3],
            ['type' => 'Other Expenses',     'code' => '8040', 'name' => 'Bank Penalty / Finance Charges',        'sort_order' => 4],
        ];

        $typeMap = AccountType::pluck('id', 'name');

        foreach ($accounts as $account) {
            $typeId = $typeMap[$account['type']] ?? null;
            if (! $typeId) {
                $this->command->warn("ChartOfAccountSeeder: unknown type '{$account['type']}' — skipping.");
                continue;
            }

            ChartOfAccount::firstOrCreate(
                ['code' => $account['code']],
                [
                    'account_type_id' => $typeId,
                    'name'            => $account['name'],
                    'sort_order'      => $account['sort_order'],
                ]
            );
        }

        $this->command->info('ChartOfAccountSeeder: ' . count($accounts) . ' accounts seeded.');
    }
}
