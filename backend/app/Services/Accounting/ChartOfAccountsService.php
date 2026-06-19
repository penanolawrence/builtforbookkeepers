<?php

namespace App\Services\Accounting;

use App\Models\Account;
use App\Models\ChartOfAccount;
use App\Models\Company;

class ChartOfAccountsService
{
    private const COA_TYPE_TO_ACCOUNT_TYPE = [
        'Assets'             => 'cash',
        'Liabilities'        => 'liability',
        "Owner's Equity"     => 'equity',
        'Revenue / Income'   => 'income',
        'Cost of Goods Sold' => 'expense',
        'Expenses'           => 'expense',
        'Other Income'       => 'income',
        'Other Expenses'     => 'expense',
    ];

    public function seedDefaultAccounts(Company $company): void
    {
        $industry = $company->industry_type;

        $coaEntries = ChartOfAccount::with('accountType')
            ->where('is_active', true)
            ->where(function ($query) use ($industry) {
                $query->whereDoesntHave('industryTags');
                if ($industry) {
                    $query->orWhereHas('industryTags', fn ($q) => $q->where('industry', $industry));
                }
            })
            ->orderBy('sort_order')
            ->get();

        foreach ($coaEntries as $coa) {
            $typeName    = $coa->accountType->name ?? '';
            $accountType = self::COA_TYPE_TO_ACCOUNT_TYPE[$typeName] ?? 'expense';

            Account::firstOrCreate(
                ['company_id' => $company->id, 'code' => $coa->code],
                [
                    'chart_of_account_id' => $coa->id,
                    'name'                => $coa->name,
                    'type'                => $accountType,
                    'is_system_managed'   => $accountType === 'cash',
                    'is_active'           => true,
                ]
            );
        }

        if ($company->bir_type === 'vat') {
            Account::firstOrCreate(
                ['company_id' => $company->id, 'code' => '1101'],
                [
                    'chart_of_account_id' => null,
                    'name'                => 'Input VAT',
                    'type'                => 'vat',
                    'is_system_managed'   => true,
                    'is_active'           => true,
                ]
            );
            Account::firstOrCreate(
                ['company_id' => $company->id, 'code' => '2101'],
                [
                    'chart_of_account_id' => null,
                    'name'                => 'Output VAT',
                    'type'                => 'vat',
                    'is_system_managed'   => true,
                    'is_active'           => true,
                ]
            );
        }
    }

    public function getNextCode(Company $company, string $type): string
    {
        $prefixMap = [
            'income'  => 4000,
            'expense' => 6000,
            'cash'    => 1000,
            'equity'  => 3000,
        ];
        $prefix  = $prefixMap[$type] ?? 6000;
        $highest = Account::where('company_id', $company->id)
                          ->whereBetween('code', [(string) ($prefix + 1), (string) ($prefix + 999)])
                          ->max('code');

        return $highest ? (string) ((int) $highest + 1) : (string) ($prefix + 1);
    }
}
