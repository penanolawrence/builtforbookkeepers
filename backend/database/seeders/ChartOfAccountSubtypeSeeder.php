<?php

namespace Database\Seeders;

use App\Models\ChartOfAccount;
use App\Models\ChartOfAccountSubtype;
use Illuminate\Database\Seeder;

class ChartOfAccountSubtypeSeeder extends Seeder
{
    public function run(): void
    {
        $subtypes = [
            // 1010 — Cash on Hand
            '1010' => [
                ['code' => '1010-01', 'name' => 'Petty Cash',  'sort_order' => 1],
                ['code' => '1010-02', 'name' => 'GCash',       'sort_order' => 2],
                ['code' => '1010-03', 'name' => 'Maya',        'sort_order' => 3],
                ['code' => '1010-04', 'name' => 'ShopeePay',   'sort_order' => 4],
                ['code' => '1010-05', 'name' => 'Cash Fund',   'sort_order' => 5],
            ],
            // 1020 — Cash in Bank
            '1020' => [
                ['code' => '1020-01', 'name' => 'BPI',           'sort_order' => 1],
                ['code' => '1020-02', 'name' => 'BDO',           'sort_order' => 2],
                ['code' => '1020-03', 'name' => 'UnionBank',     'sort_order' => 3],
                ['code' => '1020-04', 'name' => 'Metrobank',     'sort_order' => 4],
                ['code' => '1020-05', 'name' => 'PNB',           'sort_order' => 5],
                ['code' => '1020-06', 'name' => 'RCBC',          'sort_order' => 6],
                ['code' => '1020-07', 'name' => 'Security Bank', 'sort_order' => 7],
                ['code' => '1020-08', 'name' => 'Landbank',      'sort_order' => 8],
                ['code' => '1020-09', 'name' => 'DBP',           'sort_order' => 9],
                ['code' => '1020-10', 'name' => 'Chinabank',     'sort_order' => 10],
                ['code' => '1020-11', 'name' => 'EastWest Bank', 'sort_order' => 11],
                ['code' => '1020-12', 'name' => 'PSBank',        'sort_order' => 12],
            ],
            // 3010 — Owner's Capital
            '3010' => [
                ['code' => '3010-01', 'name' => 'Initial Investment',    'sort_order' => 1],
                ['code' => '3010-02', 'name' => 'Additional Contribution','sort_order' => 2],
            ],
            // 3020 — Owner's Drawings
            '3020' => [
                ['code' => '3020-01', 'name' => 'General Withdrawal', 'sort_order' => 1],
            ],
            // 3030 — Income Summary
            '3030' => [
                ['code' => '3030-01', 'name' => 'Income Summary', 'sort_order' => 1],
            ],
            // 4010 — Service Revenue
            '4010' => [
                ['code' => '4010-01', 'name' => 'Retainer-based', 'sort_order' => 1],
                ['code' => '4010-02', 'name' => 'Per-hour',        'sort_order' => 2],
                ['code' => '4010-03', 'name' => 'Project-based',   'sort_order' => 3],
            ],
            // 4020 — Sales Revenue
            '4020' => [
                ['code' => '4020-01', 'name' => 'Walk-in / Retail Sales', 'sort_order' => 1],
                ['code' => '4020-02', 'name' => 'Online Sales',            'sort_order' => 2],
                ['code' => '4020-03', 'name' => 'Wholesale',               'sort_order' => 3],
            ],
            // 4030 — Consulting Fees
            '4030' => [
                ['code' => '4030-01', 'name' => 'Consulting Fees — General', 'sort_order' => 1],
            ],
            // 4040 — Professional Fees
            '4040' => [
                ['code' => '4040-01', 'name' => 'Professional Fees — General', 'sort_order' => 1],
            ],
            // 4050 — Commission Income
            '4050' => [
                ['code' => '4050-01', 'name' => 'Sales Commission',    'sort_order' => 1],
                ['code' => '4050-02', 'name' => 'Referral Commission', 'sort_order' => 2],
            ],
            // 4060 — Rental Income
            '4060' => [
                ['code' => '4060-01', 'name' => 'Space Rental',     'sort_order' => 1],
                ['code' => '4060-02', 'name' => 'Equipment Rental', 'sort_order' => 2],
            ],
            // 4070 — Subscription Revenue
            '4070' => [
                ['code' => '4070-01', 'name' => 'Monthly Subscription', 'sort_order' => 1],
                ['code' => '4070-02', 'name' => 'Annual Subscription',  'sort_order' => 2],
            ],
            // 4080 — Project-based Revenue
            '4080' => [
                ['code' => '4080-01', 'name' => 'Project-based Revenue — General', 'sort_order' => 1],
            ],
            // 4090 — Government Grants / Subsidies
            '4090' => [
                ['code' => '4090-01', 'name' => 'DOLE Grant',           'sort_order' => 1],
                ['code' => '4090-02', 'name' => 'DTI Grant',            'sort_order' => 2],
                ['code' => '4090-03', 'name' => 'Other Government Grant','sort_order' => 3],
            ],
            // 4099 — Other Operating Income
            '4099' => [
                ['code' => '4099-01', 'name' => 'Other Operating Income — General', 'sort_order' => 1],
            ],
            // 5010 — Purchases
            '5010' => [
                ['code' => '5010-01', 'name' => 'Purchases — General', 'sort_order' => 1],
            ],
            // 5020 — Freight-in
            '5020' => [
                ['code' => '5020-01', 'name' => 'Freight-in — General', 'sort_order' => 1],
            ],
            // 5030 — Direct Labor
            '5030' => [
                ['code' => '5030-01', 'name' => 'Direct Labor — General', 'sort_order' => 1],
            ],
            // 5040 — Purchase Returns
            '5040' => [
                ['code' => '5040-01', 'name' => 'Purchase Returns — General', 'sort_order' => 1],
            ],
            // 5050 — Direct Materials
            '5050' => [
                ['code' => '5050-01', 'name' => 'Direct Materials — General', 'sort_order' => 1],
            ],
            // 6010 — Salaries and Wages
            '6010' => [
                ['code' => '6010-01', 'name' => 'Regular Pay',       'sort_order' => 1],
                ['code' => '6010-02', 'name' => 'Overtime Pay',       'sort_order' => 2],
                ['code' => '6010-03', 'name' => 'Holiday Pay',        'sort_order' => 3],
                ['code' => '6010-04', 'name' => 'Night Differential', 'sort_order' => 4],
            ],
            // 6020 — Owner's Compensation
            '6020' => [
                ['code' => '6020-01', 'name' => "Owner's Compensation — General", 'sort_order' => 1],
            ],
            // 6030 — SSS / PhilHealth / Pag-IBIG
            '6030' => [
                ['code' => '6030-01', 'name' => 'SSS Contribution',       'sort_order' => 1],
                ['code' => '6030-02', 'name' => 'PhilHealth Contribution', 'sort_order' => 2],
                ['code' => '6030-03', 'name' => 'Pag-IBIG Contribution',   'sort_order' => 3],
            ],
            // 6040 — 13th Month Pay
            '6040' => [
                ['code' => '6040-01', 'name' => '13th Month Pay — General', 'sort_order' => 1],
            ],
            // 6050 — Rent Expense
            '6050' => [
                ['code' => '6050-01', 'name' => 'Office Rent',               'sort_order' => 1],
                ['code' => '6050-02', 'name' => 'Warehouse / Storage Rent',  'sort_order' => 2],
                ['code' => '6050-03', 'name' => 'Equipment Lease',           'sort_order' => 3],
            ],
            // 6060 — Utilities — Electricity
            '6060' => [
                ['code' => '6060-01', 'name' => 'Meralco',               'sort_order' => 1],
                ['code' => '6060-02', 'name' => 'Visayan Electric',       'sort_order' => 2],
                ['code' => '6060-03', 'name' => 'Other Electric Provider','sort_order' => 3],
            ],
            // 6070 — Utilities — Water
            '6070' => [
                ['code' => '6070-01', 'name' => 'Maynilad',         'sort_order' => 1],
                ['code' => '6070-02', 'name' => 'Manila Water',      'sort_order' => 2],
                ['code' => '6070-03', 'name' => 'Local Water District','sort_order' => 3],
            ],
            // 6080 — Utilities — Internet and Phone
            '6080' => [
                ['code' => '6080-01', 'name' => 'PLDT',           'sort_order' => 1],
                ['code' => '6080-02', 'name' => 'Globe',           'sort_order' => 2],
                ['code' => '6080-03', 'name' => 'Converge',        'sort_order' => 3],
                ['code' => '6080-04', 'name' => 'Sky Broadband',   'sort_order' => 4],
                ['code' => '6080-05', 'name' => 'Mobile Postpaid', 'sort_order' => 5],
            ],
            // 6090 — Office Supplies Expense
            '6090' => [
                ['code' => '6090-01', 'name' => 'Office Supplies — General', 'sort_order' => 1],
            ],
            // 6100 — Depreciation Expense
            '6100' => [
                ['code' => '6100-01', 'name' => 'Equipment Depreciation',              'sort_order' => 1],
                ['code' => '6100-02', 'name' => 'Furniture and Fixtures Depreciation', 'sort_order' => 2],
                ['code' => '6100-03', 'name' => 'Vehicle Depreciation',                'sort_order' => 3],
            ],
            // 6110 — Repairs and Maintenance
            '6110' => [
                ['code' => '6110-01', 'name' => 'Equipment Maintenance',        'sort_order' => 1],
                ['code' => '6110-02', 'name' => 'Office / Premises Maintenance','sort_order' => 2],
                ['code' => '6110-03', 'name' => 'Vehicle Maintenance',          'sort_order' => 3],
            ],
            // 6120 — Advertising and Marketing
            '6120' => [
                ['code' => '6120-01', 'name' => 'Social Media Ads',       'sort_order' => 1],
                ['code' => '6120-02', 'name' => 'Print / Tarpaulin',      'sort_order' => 2],
                ['code' => '6120-03', 'name' => 'Promotions and Freebies','sort_order' => 3],
                ['code' => '6120-04', 'name' => 'Website and SEO',        'sort_order' => 4],
            ],
            // 6130 — Transportation and Travel
            '6130' => [
                ['code' => '6130-01', 'name' => 'Fuel',                        'sort_order' => 1],
                ['code' => '6130-02', 'name' => 'Toll and Parking',            'sort_order' => 2],
                ['code' => '6130-03', 'name' => 'Ride-hailing (Grab / transport)','sort_order' => 3],
                ['code' => '6130-04', 'name' => 'Airfare',                     'sort_order' => 4],
                ['code' => '6130-05', 'name' => 'Accommodation',               'sort_order' => 5],
            ],
            // 6140 — Meals and Representation
            '6140' => [
                ['code' => '6140-01', 'name' => 'Client Meals',         'sort_order' => 1],
                ['code' => '6140-02', 'name' => 'Team Meals',           'sort_order' => 2],
                ['code' => '6140-03', 'name' => 'Representation Expense','sort_order' => 3],
            ],
            // 6150 — Professional Fees — Legal
            '6150' => [
                ['code' => '6150-01', 'name' => 'Legal Retainer',     'sort_order' => 1],
                ['code' => '6150-02', 'name' => 'Legal Consultation',  'sort_order' => 2],
                ['code' => '6150-03', 'name' => 'Notarial Fees',       'sort_order' => 3],
            ],
            // 6160 — Professional Fees — Accounting
            '6160' => [
                ['code' => '6160-01', 'name' => 'Bookkeeping Fees', 'sort_order' => 1],
                ['code' => '6160-02', 'name' => 'Audit Fees',       'sort_order' => 2],
                ['code' => '6160-03', 'name' => 'Tax Filing Fees',  'sort_order' => 3],
            ],
            // 6170 — Insurance Expense
            '6170' => [
                ['code' => '6170-01', 'name' => 'Business Insurance',       'sort_order' => 1],
                ['code' => '6170-02', 'name' => 'Vehicle Insurance',         'sort_order' => 2],
                ['code' => '6170-03', 'name' => 'Life / Health Insurance',   'sort_order' => 3],
            ],
            // 6180 — Taxes and Licenses
            '6180' => [
                ['code' => '6180-01', 'name' => 'Business Permit',           'sort_order' => 1],
                ['code' => '6180-02', 'name' => 'BIR Registration / Annual Fee','sort_order' => 2],
                ['code' => '6180-03', 'name' => 'Local Government Tax',      'sort_order' => 3],
                ['code' => '6180-04', 'name' => 'Documentary Stamp Tax',     'sort_order' => 4],
            ],
            // 6190 — Bank Charges
            '6190' => [
                ['code' => '6190-01', 'name' => 'Transaction Fees',   'sort_order' => 1],
                ['code' => '6190-02', 'name' => 'Monthly Service Fee', 'sort_order' => 2],
                ['code' => '6190-03', 'name' => 'Wire Transfer Fee',   'sort_order' => 3],
            ],
            // 6200 — Subscriptions and Software
            '6200' => [
                ['code' => '6200-01', 'name' => 'SaaS Subscriptions',      'sort_order' => 1],
                ['code' => '6200-02', 'name' => 'Domain / Hosting',         'sort_order' => 2],
                ['code' => '6200-03', 'name' => 'Professional Memberships', 'sort_order' => 3],
                ['code' => '6200-04', 'name' => 'Publications and Dues',    'sort_order' => 4],
            ],
            // 6210 — Miscellaneous Expense
            '6210' => [
                ['code' => '6210-01', 'name' => 'Miscellaneous Expense — General', 'sort_order' => 1],
            ],
            // 7010 — Interest Income
            '7010' => [
                ['code' => '7010-01', 'name' => 'Bank Interest',           'sort_order' => 1],
                ['code' => '7010-02', 'name' => 'Loan Interest Received',  'sort_order' => 2],
            ],
            // 7020 — Gain on Sale of Assets
            '7020' => [
                ['code' => '7020-01', 'name' => 'Gain on Sale — General', 'sort_order' => 1],
            ],
            // 7030 — Foreign Exchange Gain
            '7030' => [
                ['code' => '7030-01', 'name' => 'FX Gain — General', 'sort_order' => 1],
            ],
            // 7040 — Dividend Income
            '7040' => [
                ['code' => '7040-01', 'name' => 'Dividend Income — General', 'sort_order' => 1],
            ],
            // 7050 — Miscellaneous Income
            '7050' => [
                ['code' => '7050-01', 'name' => 'Miscellaneous Income — General', 'sort_order' => 1],
            ],
            // 8010 — Interest Expense
            '8010' => [
                ['code' => '8010-01', 'name' => 'Loan Interest',        'sort_order' => 1],
                ['code' => '8010-02', 'name' => 'Credit Card Interest',  'sort_order' => 2],
            ],
            // 8020 — Loss on Sale of Assets
            '8020' => [
                ['code' => '8020-01', 'name' => 'Loss on Sale — General', 'sort_order' => 1],
            ],
            // 8030 — Foreign Exchange Loss
            '8030' => [
                ['code' => '8030-01', 'name' => 'FX Loss — General', 'sort_order' => 1],
            ],
            // 8040 — Bank Penalty / Finance Charges
            '8040' => [
                ['code' => '8040-01', 'name' => 'Late Payment Penalty', 'sort_order' => 1],
                ['code' => '8040-02', 'name' => 'Overdraft Fee',         'sort_order' => 2],
                ['code' => '8040-03', 'name' => 'Returned Check Fee',    'sort_order' => 3],
            ],
        ];

        $accountMap = ChartOfAccount::pluck('id', 'code');

        $total = 0;
        foreach ($subtypes as $accountCode => $entries) {
            $accountId = $accountMap[$accountCode] ?? null;
            if (!$accountId) {
                $this->command->warn("ChartOfAccountSubtypeSeeder: account code {$accountCode} not found — skipping.");
                continue;
            }
            foreach ($entries as $entry) {
                ChartOfAccountSubtype::firstOrCreate(
                    ['code' => $entry['code']],
                    [
                        'chart_of_account_id' => $accountId,
                        'name'                => $entry['name'],
                        'sort_order'          => $entry['sort_order'],
                    ]
                );
                $total++;
            }
        }

        $this->command->info("ChartOfAccountSubtypeSeeder: {$total} subtypes seeded.");
    }
}
