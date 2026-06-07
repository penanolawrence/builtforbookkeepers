# Chart of Accounts Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Create three new global reference tables (`account_types`, `chart_of_accounts`, `chart_of_account_subtypes`) seeded with a full Philippine sole-proprietor CoA — 7 account types, 50 account codes, and 121 subtypes (e.g. GCash, Maya, BPI) — without touching the existing company-scoped `accounts` or `subtypes` tables.

**Architecture:** Three new global (non-company-scoped) tables act as a canonical CoA template. `account_types` holds the 7 major groupings. `chart_of_accounts` holds the numbered account codes (1010–8040) linked to their type. `chart_of_account_subtypes` holds specific instances (GCash, BPI, SSS Contribution, etc.) linked to their parent account. Existing `accounts` (company-scoped), `subtypes`, and `transaction_lines` tables are untouched.

**Tech Stack:** Laravel 11, PostgreSQL, Eloquent ORM, UUID primary keys via `HasUuids`, PHP seeders, PHPUnit feature tests with `RefreshDatabase`.

---

## File Map

**Create:**
- `backend/database/migrations/2026_06_07_000001_create_account_types_table.php`
- `backend/database/migrations/2026_06_07_000002_create_chart_of_accounts_table.php`
- `backend/database/migrations/2026_06_07_000003_create_chart_of_account_subtypes_table.php`
- `backend/app/Models/AccountType.php`
- `backend/app/Models/ChartOfAccount.php`
- `backend/app/Models/ChartOfAccountSubtype.php`
- `backend/database/seeders/AccountTypeSeeder.php`
- `backend/database/seeders/ChartOfAccountSeeder.php`
- `backend/database/seeders/ChartOfAccountSubtypeSeeder.php`
- `backend/tests/Feature/ChartOfAccountsSeederTest.php`

**Modify:**
- `backend/database/seeders/DatabaseSeeder.php` — add new seeders after `AdminSeeder`, before `DemoDataSeeder`

---

## Task 1: Migration — `account_types` table

**Files:**
- Create: `backend/database/migrations/2026_06_07_000001_create_account_types_table.php`

- [ ] **Step 1: Create the migration**

```php
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('account_types', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('name', 100);
            $table->unsignedSmallInteger('code_prefix');
            $table->enum('normal_balance', ['debit', 'credit']);
            $table->unsignedTinyInteger('sort_order');
            $table->timestamps();

            $table->unique('name');
            $table->unique('code_prefix');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('account_types');
    }
};
```

- [ ] **Step 2: Run the migration**

```bash
cd backend && php artisan migrate
```

Expected: `account_types` table created with no errors.

---

## Task 2: Migration — `chart_of_accounts` table

**Files:**
- Create: `backend/database/migrations/2026_06_07_000002_create_chart_of_accounts_table.php`

- [ ] **Step 1: Create the migration**

```php
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('chart_of_accounts', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('account_type_id')
                  ->references('id')->on('account_types')
                  ->cascadeOnDelete();
            $table->string('code', 10);
            $table->string('name', 150);
            $table->boolean('is_active')->default(true);
            $table->unsignedSmallInteger('sort_order');
            $table->timestamps();

            $table->unique('code');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('chart_of_accounts');
    }
};
```

- [ ] **Step 2: Run the migration**

```bash
php artisan migrate
```

Expected: `chart_of_accounts` table created.

---

## Task 3: Migration — `chart_of_account_subtypes` table

**Files:**
- Create: `backend/database/migrations/2026_06_07_000003_create_chart_of_account_subtypes_table.php`

- [ ] **Step 1: Create the migration**

```php
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('chart_of_account_subtypes', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('chart_of_account_id')
                  ->references('id')->on('chart_of_accounts')
                  ->cascadeOnDelete();
            $table->string('code', 10);
            $table->string('name', 150);
            $table->boolean('is_active')->default(true);
            $table->unsignedSmallInteger('sort_order');
            $table->timestamps();

            $table->unique('code');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('chart_of_account_subtypes');
    }
};
```

- [ ] **Step 2: Run the migration**

```bash
php artisan migrate
```

Expected: `chart_of_account_subtypes` table created.

---

## Task 4: Models

**Files:**
- Create: `backend/app/Models/AccountType.php`
- Create: `backend/app/Models/ChartOfAccount.php`
- Create: `backend/app/Models/ChartOfAccountSubtype.php`

- [ ] **Step 1: Create `AccountType` model**

```php
<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class AccountType extends Model
{
    use HasUuids;

    protected $fillable = ['name', 'code_prefix', 'normal_balance', 'sort_order'];

    public function chartOfAccounts(): HasMany
    {
        return $this->hasMany(ChartOfAccount::class);
    }
}
```

- [ ] **Step 2: Create `ChartOfAccount` model**

```php
<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class ChartOfAccount extends Model
{
    use HasUuids;

    protected $fillable = ['account_type_id', 'code', 'name', 'is_active', 'sort_order'];

    protected $casts = ['is_active' => 'boolean'];

    public function accountType(): BelongsTo
    {
        return $this->belongsTo(AccountType::class);
    }

    public function subtypes(): HasMany
    {
        return $this->hasMany(ChartOfAccountSubtype::class);
    }
}
```

- [ ] **Step 3: Create `ChartOfAccountSubtype` model**

```php
<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ChartOfAccountSubtype extends Model
{
    use HasUuids;

    protected $fillable = ['chart_of_account_id', 'code', 'name', 'is_active', 'sort_order'];

    protected $casts = ['is_active' => 'boolean'];

    public function chartOfAccount(): BelongsTo
    {
        return $this->belongsTo(ChartOfAccount::class);
    }
}
```

---

## Task 5: Seeder — `AccountTypeSeeder`

**Files:**
- Create: `backend/database/seeders/AccountTypeSeeder.php`

- [ ] **Step 1: Create the seeder**

```php
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
            ['name' => "Owner's Equity",      'code_prefix' => 3000, 'normal_balance' => 'credit', 'sort_order' => 2],
            ['name' => 'Revenue / Income',    'code_prefix' => 4000, 'normal_balance' => 'credit', 'sort_order' => 3],
            ['name' => 'Cost of Goods Sold',  'code_prefix' => 5000, 'normal_balance' => 'debit',  'sort_order' => 4],
            ['name' => 'Expenses',            'code_prefix' => 6000, 'normal_balance' => 'debit',  'sort_order' => 5],
            ['name' => 'Other Income',        'code_prefix' => 7000, 'normal_balance' => 'credit', 'sort_order' => 6],
            ['name' => 'Other Expenses',      'code_prefix' => 8000, 'normal_balance' => 'debit',  'sort_order' => 7],
        ];

        foreach ($types as $type) {
            AccountType::firstOrCreate(['name' => $type['name']], $type);
        }

        $this->command->info('AccountTypeSeeder: 7 account types seeded.');
    }
}
```

---

## Task 6: Seeder — `ChartOfAccountSeeder`

**Files:**
- Create: `backend/database/seeders/ChartOfAccountSeeder.php`

- [ ] **Step 1: Create the seeder**

```php
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

            // Cost of Goods Sold (5000s)
            ['type' => 'Cost of Goods Sold', 'code' => '5010', 'name' => 'Purchases',                             'sort_order' => 1],
            ['type' => 'Cost of Goods Sold', 'code' => '5020', 'name' => 'Freight-in',                            'sort_order' => 2],
            ['type' => 'Cost of Goods Sold', 'code' => '5030', 'name' => 'Direct Labor',                          'sort_order' => 3],
            ['type' => 'Cost of Goods Sold', 'code' => '5040', 'name' => 'Purchase Returns',                      'sort_order' => 4],
            ['type' => 'Cost of Goods Sold', 'code' => '5050', 'name' => 'Direct Materials',                      'sort_order' => 5],

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
            ChartOfAccount::firstOrCreate(
                ['code' => $account['code']],
                [
                    'account_type_id' => $typeMap[$account['type']],
                    'name'            => $account['name'],
                    'sort_order'      => $account['sort_order'],
                ]
            );
        }

        $this->command->info('ChartOfAccountSeeder: 50 accounts seeded.');
    }
}
```

---

## Task 7: Seeder — `ChartOfAccountSubtypeSeeder`

**Files:**
- Create: `backend/database/seeders/ChartOfAccountSubtypeSeeder.php`

- [ ] **Step 1: Create the seeder**

```php
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
```

---

## Task 8: Write the Feature Test

**Files:**
- Create: `backend/tests/Feature/ChartOfAccountsSeederTest.php`

- [ ] **Step 1: Write the failing test first**

```php
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

    public function test_seeds_7_account_types(): void
    {
        $this->assertDatabaseCount('account_types', 7);
    }

    public function test_seeds_50_chart_of_accounts(): void
    {
        $this->assertDatabaseCount('chart_of_accounts', 50);
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
        $this->assertDatabaseHas('chart_of_accounts', [
            'code'            => '3030',
            'name'            => 'Income Summary',
            'account_type_id' => $equityType->id,
        ]);
    }

    public function test_gcash_subtype_exists_under_cash_on_hand(): void
    {
        $account = ChartOfAccount::where('code', '1010')->first();
        $this->assertDatabaseHas('chart_of_account_subtypes', [
            'code'                => '1010-02',
            'name'                => 'GCash',
            'chart_of_account_id' => $account->id,
        ]);
    }

    public function test_bpi_subtype_exists_under_cash_in_bank(): void
    {
        $account = ChartOfAccount::where('code', '1020')->first();
        $this->assertDatabaseHas('chart_of_account_subtypes', [
            'code'                => '1020-01',
            'name'                => 'BPI',
            'chart_of_account_id' => $account->id,
        ]);
    }

    public function test_sss_phic_pagibig_splits_into_3_subtypes(): void
    {
        $account = ChartOfAccount::where('code', '6030')->first();
        $this->assertSame(3, ChartOfAccountSubtype::where('chart_of_account_id', $account->id)->count());
        $this->assertDatabaseHas('chart_of_account_subtypes', ['code' => '6030-01', 'name' => 'SSS Contribution']);
        $this->assertDatabaseHas('chart_of_account_subtypes', ['code' => '6030-02', 'name' => 'PhilHealth Contribution']);
        $this->assertDatabaseHas('chart_of_account_subtypes', ['code' => '6030-03', 'name' => 'Pag-IBIG Contribution']);
    }

    public function test_seeders_are_idempotent(): void
    {
        // Run all three seeders a second time — counts must not change
        $this->seed(\Database\Seeders\AccountTypeSeeder::class);
        $this->seed(\Database\Seeders\ChartOfAccountSeeder::class);
        $this->seed(\Database\Seeders\ChartOfAccountSubtypeSeeder::class);

        $this->assertDatabaseCount('account_types', 7);
        $this->assertDatabaseCount('chart_of_accounts', 50);
        $this->assertDatabaseCount('chart_of_account_subtypes', 121);
    }
}
```

- [ ] **Step 2: Run the test to confirm it fails (models and seeders not yet created)**

```bash
cd backend && php artisan test tests/Feature/ChartOfAccountsSeederTest.php
```

Expected: FAIL — class not found or table not found errors.

- [ ] **Step 3: After all models and seeders are created (Tasks 4–7), run again**

```bash
php artisan test tests/Feature/ChartOfAccountsSeederTest.php
```

Expected: All 10 tests PASS.

---

## Task 9: Update `DatabaseSeeder`

**Files:**
- Modify: `backend/database/seeders/DatabaseSeeder.php`

- [ ] **Step 1: Add the three new seeders in dependency order**

```php
<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        $this->call(AdminSeeder::class);
        $this->call(AccountTypeSeeder::class);
        $this->call(ChartOfAccountSeeder::class);
        $this->call(ChartOfAccountSubtypeSeeder::class);
        $this->call(SubtypeSeeder::class);
        $this->call(DemoDataSeeder::class);
    }
}
```

---

## Task 10: Run Full Migration and Verify

- [ ] **Step 1: Fresh migrate and seed**

```bash
cd backend && php artisan migrate:fresh --seed
```

Expected: All migrations run, all seeders output their info lines:
```
AccountTypeSeeder: 7 account types seeded.
ChartOfAccountSeeder: 50 accounts seeded.
ChartOfAccountSubtypeSeeder: 121 subtypes seeded.
```

- [ ] **Step 2: Run the full test suite to confirm no regressions**

```bash
php artisan test
```

Expected: All tests pass including `ChartOfAccountsSeederTest`.

- [ ] **Step 3: Commit**

```bash
git add \
  backend/database/migrations/2026_06_07_000001_create_account_types_table.php \
  backend/database/migrations/2026_06_07_000002_create_chart_of_accounts_table.php \
  backend/database/migrations/2026_06_07_000003_create_chart_of_account_subtypes_table.php \
  backend/app/Models/AccountType.php \
  backend/app/Models/ChartOfAccount.php \
  backend/app/Models/ChartOfAccountSubtype.php \
  backend/database/seeders/AccountTypeSeeder.php \
  backend/database/seeders/ChartOfAccountSeeder.php \
  backend/database/seeders/ChartOfAccountSubtypeSeeder.php \
  backend/database/seeders/DatabaseSeeder.php \
  backend/tests/Feature/ChartOfAccountsSeederTest.php

git commit -m "feat: add Chart of Accounts — account types, codes, and subtypes with PH sole-proprietor defaults"
```

---

## Spec Coverage Check

| Requirement | Covered by |
|---|---|
| 7 account types with normal balance | Task 5, Task 8 |
| 50 account codes (1010–8040) with codes | Task 6, Task 8 |
| 121 subtypes (GCash, Maya, BPI, SSS split, etc.) | Task 7, Task 8 |
| Income Summary under Owner's Equity | Task 6, Task 8 |
| Seeders idempotent (firstOrCreate) | Task 5–7, Task 8 |
| No changes to existing accounts/subtypes/transaction_lines tables | Architecture decision — new tables only |
| Models with correct relationships | Task 4 |
