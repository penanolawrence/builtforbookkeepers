<?php

namespace App\Services\Accounting;

use App\Models\Account;
use App\Models\Company;

class ChartOfAccountsService
{
    public function seedDefaultAccounts(Company $company): void
    {
        $accounts = [
            // Income (is_system_managed = false)
            ['code' => '4001', 'name' => 'Sales Revenue',         'type' => 'income', 'is_system_managed' => false],
            ['code' => '4002', 'name' => 'Service Revenue',       'type' => 'income', 'is_system_managed' => false],
            ['code' => '4003', 'name' => 'Other Income',          'type' => 'income', 'is_system_managed' => false],
            // Expense (is_system_managed = false)
            ['code' => '5001', 'name' => 'Utilities Expense',       'type' => 'expense', 'is_system_managed' => false],
            ['code' => '5002', 'name' => 'Supplies Expense',        'type' => 'expense', 'is_system_managed' => false],
            ['code' => '5003', 'name' => 'Rent Expense',            'type' => 'expense', 'is_system_managed' => false],
            ['code' => '5004', 'name' => 'Transportation Expense',  'type' => 'expense', 'is_system_managed' => false],
            ['code' => '5005', 'name' => 'Meals and Entertainment', 'type' => 'expense', 'is_system_managed' => false],
            ['code' => '5006', 'name' => 'Communication Expense',   'type' => 'expense', 'is_system_managed' => false],
            ['code' => '5007', 'name' => 'Taxes and Licenses',      'type' => 'expense', 'is_system_managed' => false],
            ['code' => '5008', 'name' => 'Other Expense',           'type' => 'expense', 'is_system_managed' => false],
            // Cash (is_system_managed = true)
            ['code' => '1001', 'name' => 'Cash on Hand', 'type' => 'cash', 'is_system_managed' => true],
            ['code' => '1002', 'name' => 'GCash',        'type' => 'cash', 'is_system_managed' => true],
            ['code' => '1003', 'name' => 'Maya',         'type' => 'cash', 'is_system_managed' => true],
            ['code' => '1004', 'name' => 'Bank',         'type' => 'cash', 'is_system_managed' => true],
        ];

        if ($company->bir_type === 'vat') {
            $accounts[] = ['code' => '1101', 'name' => 'Input VAT',  'type' => 'vat', 'is_system_managed' => true];
            $accounts[] = ['code' => '2101', 'name' => 'Output VAT', 'type' => 'vat', 'is_system_managed' => true];
        }

        foreach ($accounts as $account) {
            Account::create([
                'company_id'        => $company->id,
                'code'              => $account['code'],
                'name'              => $account['name'],
                'type'              => $account['type'],
                'is_system_managed' => $account['is_system_managed'],
                'is_active'         => true,
            ]);
        }
    }

    public function getNextCode(Company $company, string $type): string
    {
        $prefixMap = ['income' => 4000, 'expense' => 5000];
        $start     = $prefixMap[$type] + 1;
        $end       = $prefixMap[$type] + 999;

        $highest = Account::where('company_id', $company->id)
                          ->whereBetween('code', [(string) ($prefixMap[$type] + 1), (string) ($prefixMap[$type] + 999)])
                          ->max('code');

        return $highest ? (string) ((int) $highest + 1) : (string) $start;
    }
}
