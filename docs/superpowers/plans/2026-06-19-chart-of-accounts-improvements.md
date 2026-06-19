# Chart of Accounts Improvements — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add industry-aware COA provisioning — clients receive only accounts relevant to their business type, plus EWT and WTC withholding tax accounts for BIR alphalist readiness.

**Architecture:** A new `chart_of_account_industries` pivot table tags master COA accounts by industry; accounts with no pivot rows are universal. `industry_type` is captured optionally at client creation (admin/accountant) and confirmed as required when the client completes their setup page, at which point `seedDefaultAccounts()` is triggered and filtered by industry.

**Tech Stack:** Laravel 11 (PHP), PostgreSQL, Next.js 14 App Router, TypeScript, React Hook Form + Zod, TanStack Query

## Global Constraints

- Do not add anything not in the spec. Stick strictly to the design.
- `industry_type` values (exact strings): `retail` | `services` | `restaurant` | `construction` | `professional_services` | `manufacturing`
- Withholding tax account codes: 2210–2214 (EWT), 2220 (WTC) — universal, no pivot rows
- `seedDefaultAccounts()` is called **only** from `AuthController::setupPassword()` — remove the call from both `ClientController::store()` methods
- PostgreSQL CHECK constraint pattern for enum expansion: `DB::statement("ALTER TABLE ... DROP CONSTRAINT IF EXISTS ..."); DB::statement("ALTER TABLE ... ADD CONSTRAINT ...")`
- All seeders must remain idempotent (`firstOrCreate` / `firstOrNew`)
- Backend tests are Feature tests in `backend/tests/Feature/`, run with `php artisan test --filter=ClassName`
- Frontend tests are not required for this feature (no existing frontend test infrastructure beyond admin ClientModal)

---

## File Map

**Created:**
- `backend/database/migrations/2026_06_19_000001_add_industry_type_to_companies_table.php`
- `backend/database/migrations/2026_06_19_000002_create_chart_of_account_industries_table.php`
- `backend/database/migrations/2026_06_19_000003_add_liability_to_accounts_type_enum.php`
- `backend/database/seeders/ChartOfAccountIndustrySeeder.php`
- `backend/app/Models/ChartOfAccountIndustry.php`
- `backend/tests/Feature/IndustryCoaProvisioningTest.php`

**Modified:**
- `backend/database/seeders/AccountTypeSeeder.php` — add Liabilities
- `backend/database/seeders/ChartOfAccountSeeder.php` — add WHT + industry-specific accounts
- `backend/database/seeders/DatabaseSeeder.php` — call ChartOfAccountIndustrySeeder
- `backend/tests/Feature/ChartOfAccountsSeederTest.php` — update counts (50→76, 7→8)
- `backend/app/Models/ChartOfAccount.php` — add `industryTags()` relationship
- `backend/app/Models/Company.php` — add `industry_type` to fillable
- `backend/app/Services/Accounting/ChartOfAccountsService.php` — filter by industry, add Liabilities mapping
- `backend/app/Http/Requests/Admin/CreateClientRequest.php` — add optional industryType
- `backend/app/Http/Requests/Accountant/CreateClientRequest.php` — add optional industryType
- `backend/app/Http/Requests/Auth/SetupPasswordRequest.php` — add nullable industryType
- `backend/app/Http/Controllers/Admin/ClientController.php` — save industry_type, remove seedDefaultAccounts call
- `backend/app/Http/Controllers/Accountant/ClientController.php` — save industry_type, remove seedDefaultAccounts call
- `backend/app/Http/Controllers/AuthController.php` — validateToken returns industryType; setupPassword saves it and seeds
- `frontend/src/lib/api/auth.ts` — validateSetupToken returns industryType; setupPassword accepts it
- `frontend/src/lib/api/admin/clients.ts` — add optional industryType to payload
- `frontend/src/lib/api/accountant/clients.ts` — add optional industryType to payload
- `frontend/src/app/(auth)/setup/page.tsx` — add industry dropdown (required for client role)
- `frontend/src/components/admin/ClientModal.tsx` — add optional industry dropdown
- `frontend/src/components/accountant/NewClientModal.tsx` — add optional industry dropdown

---

## Task 1: Database Migrations

**Files:**
- Create: `backend/database/migrations/2026_06_19_000001_add_industry_type_to_companies_table.php`
- Create: `backend/database/migrations/2026_06_19_000002_create_chart_of_account_industries_table.php`
- Create: `backend/database/migrations/2026_06_19_000003_add_liability_to_accounts_type_enum.php`

**Interfaces:**
- Produces: `companies.industry_type` nullable string column; `chart_of_account_industries` pivot table; `accounts_type_check` constraint includes `liability`

- [ ] **Step 1: Create migration — add industry_type to companies**

```php
// backend/database/migrations/2026_06_19_000001_add_industry_type_to_companies_table.php
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('companies', function (Blueprint $table) {
            $table->string('industry_type')->nullable()->after('bir_type');
        });
    }

    public function down(): void
    {
        Schema::table('companies', function (Blueprint $table) {
            $table->dropColumn('industry_type');
        });
    }
};
```

- [ ] **Step 2: Create migration — pivot table**

```php
// backend/database/migrations/2026_06_19_000002_create_chart_of_account_industries_table.php
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('chart_of_account_industries', function (Blueprint $table) {
            $table->id();
            $table->foreignUuid('chart_of_account_id')
                  ->references('id')->on('chart_of_accounts')
                  ->cascadeOnDelete();
            $table->string('industry', 50);

            $table->unique(['chart_of_account_id', 'industry']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('chart_of_account_industries');
    }
};
```

- [ ] **Step 3: Create migration — add liability to accounts type enum**

```php
// backend/database/migrations/2026_06_19_000003_add_liability_to_accounts_type_enum.php
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        if (DB::getDriverName() === 'pgsql') {
            DB::statement("ALTER TABLE accounts DROP CONSTRAINT IF EXISTS accounts_type_check");
            DB::statement("ALTER TABLE accounts ADD CONSTRAINT accounts_type_check CHECK (type IN ('income','expense','cash','vat','equity','liability'))");
        }
    }

    public function down(): void
    {
        if (DB::getDriverName() === 'pgsql') {
            DB::statement("ALTER TABLE accounts DROP CONSTRAINT IF EXISTS accounts_type_check");
            DB::statement("ALTER TABLE accounts ADD CONSTRAINT accounts_type_check CHECK (type IN ('income','expense','cash','vat','equity'))");
        }
    }
};
```

- [ ] **Step 4: Run migrations**

```bash
cd backend && php artisan migrate
```

Expected: 3 new migrations applied, no errors.

- [ ] **Step 5: Commit**

```bash
git add backend/database/migrations/2026_06_19_000001_add_industry_type_to_companies_table.php \
        backend/database/migrations/2026_06_19_000002_create_chart_of_account_industries_table.php \
        backend/database/migrations/2026_06_19_000003_add_liability_to_accounts_type_enum.php
git commit -m "feat: add industry_type, COA industry pivot, and liability account type migrations"
```

---

## Task 2: Liabilities Account Type + WHT COA Accounts

**Files:**
- Modify: `backend/database/seeders/AccountTypeSeeder.php`
- Modify: `backend/database/seeders/ChartOfAccountSeeder.php`
- Modify: `backend/app/Services/Accounting/ChartOfAccountsService.php`
- Modify: `backend/tests/Feature/ChartOfAccountsSeederTest.php`

**Interfaces:**
- Produces: `account_types` row for 'Liabilities' (code_prefix 2000); 6 WHT accounts in `chart_of_accounts` (codes 2210–2214, 2220); `COA_TYPE_TO_ACCOUNT_TYPE` maps 'Liabilities' → 'liability'

- [ ] **Step 1: Write the failing tests**

Update `backend/tests/Feature/ChartOfAccountsSeederTest.php`:

```php
// Replace the two count assertions and add new ones:

public function test_seeds_8_account_types(): void
{
    $this->assertDatabaseCount('account_types', 8);
}

// DELETE the old test_seeds_7_account_types method and replace with the above.

public function test_seeds_76_chart_of_accounts(): void
{
    $this->assertDatabaseCount('chart_of_accounts', 76);
}

// DELETE the old test_seeds_50_chart_of_accounts method and replace with the above.

public function test_liabilities_type_exists(): void
{
    $this->assertDatabaseHas('account_types', [
        'name'           => 'Liabilities',
        'code_prefix'    => 2000,
        'normal_balance' => 'credit',
    ]);
}

public function test_ewt_professional_fees_account_exists(): void
{
    $this->assertDatabaseHas('chart_of_accounts', [
        'code' => '2210',
        'name' => 'EWT Payable — Professional Fees (10%/15%)',
    ]);
}

public function test_wtc_payable_account_exists(): void
{
    $this->assertDatabaseHas('chart_of_accounts', [
        'code' => '2220',
        'name' => 'Withholding Tax on Compensation Payable',
    ]);
}

// Also update test_seeders_are_idempotent to use new counts:
public function test_seeders_are_idempotent(): void
{
    $this->seed(\Database\Seeders\AccountTypeSeeder::class);
    $this->seed(\Database\Seeders\ChartOfAccountSeeder::class);
    $this->seed(\Database\Seeders\ChartOfAccountSubtypeSeeder::class);

    $this->assertDatabaseCount('account_types', 8);
    $this->assertDatabaseCount('chart_of_accounts', 76);
    $this->assertDatabaseCount('chart_of_account_subtypes', 121);
}
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd backend && php artisan test --filter=ChartOfAccountsSeederTest
```

Expected: `test_seeds_8_account_types`, `test_seeds_76_chart_of_accounts`, `test_liabilities_type_exists`, `test_ewt_professional_fees_account_exists`, `test_wtc_payable_account_exists` FAIL.

- [ ] **Step 3: Add Liabilities to AccountTypeSeeder**

In `backend/database/seeders/AccountTypeSeeder.php`, add one entry to the `$types` array (before the closing bracket):

```php
['name' => 'Liabilities', 'code_prefix' => 2000, 'normal_balance' => 'credit', 'sort_order' => 2],
```

The full updated `$types` array becomes:
```php
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
```

Also update the info line:
```php
$this->command->info('AccountTypeSeeder: ' . count($types) . ' account types seeded.');
```

- [ ] **Step 4: Add WHT accounts to ChartOfAccountSeeder**

In `backend/database/seeders/ChartOfAccountSeeder.php`, add 6 WHT entries to the `$accounts` array immediately after the Assets section (before Owner's Equity):

```php
// Liabilities (2000s) — Withholding Tax Payable (universal)
['type' => 'Liabilities', 'code' => '2210', 'name' => 'EWT Payable — Professional Fees (10%/15%)', 'sort_order' => 1],
['type' => 'Liabilities', 'code' => '2211', 'name' => 'EWT Payable — Rental (5%)',                 'sort_order' => 2],
['type' => 'Liabilities', 'code' => '2212', 'name' => 'EWT Payable — Services (2%)',               'sort_order' => 3],
['type' => 'Liabilities', 'code' => '2213', 'name' => 'EWT Payable — Goods & Supplies (1%)',       'sort_order' => 4],
['type' => 'Liabilities', 'code' => '2214', 'name' => 'EWT Payable — Contractors (2%)',            'sort_order' => 5],
['type' => 'Liabilities', 'code' => '2220', 'name' => 'Withholding Tax on Compensation Payable',   'sort_order' => 6],
```

Also update the info line at the bottom to reflect the new count (will be updated further in Task 3 — leave the `count($accounts)` dynamic expression, it auto-updates).

- [ ] **Step 5: Add Liabilities mapping to ChartOfAccountsService**

In `backend/app/Services/Accounting/ChartOfAccountsService.php`, update the `COA_TYPE_TO_ACCOUNT_TYPE` constant:

```php
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
```

- [ ] **Step 6: Run tests to verify new WHT assertions pass (counts still wrong — that's fine, Task 3 finishes it)**

```bash
cd backend && php artisan test --filter=ChartOfAccountsSeederTest
```

Expected: `test_liabilities_type_exists`, `test_ewt_professional_fees_account_exists`, `test_wtc_payable_account_exists` now PASS. Count tests still FAIL (50+6=56, not 76 yet — Task 3 adds the remaining 20).

- [ ] **Step 7: Commit**

```bash
git add backend/database/seeders/AccountTypeSeeder.php \
        backend/database/seeders/ChartOfAccountSeeder.php \
        backend/app/Services/Accounting/ChartOfAccountsService.php \
        backend/tests/Feature/ChartOfAccountsSeederTest.php
git commit -m "feat: add Liabilities account type and WHT payable accounts to master COA"
```

---

## Task 3: Industry-Specific COA Accounts + ChartOfAccountIndustrySeeder

**Files:**
- Modify: `backend/database/seeders/ChartOfAccountSeeder.php` — add 20 new industry-specific accounts
- Create: `backend/database/seeders/ChartOfAccountIndustrySeeder.php`
- Modify: `backend/database/seeders/DatabaseSeeder.php`

**Interfaces:**
- Produces: 76 total COA accounts; `chart_of_account_industries` rows tagging each industry-specific account

- [ ] **Step 1: Add 20 industry-specific accounts to ChartOfAccountSeeder**

Append the following to the `$accounts` array in `backend/database/seeders/ChartOfAccountSeeder.php` (add these to the existing sections):

In the **Assets** section (after the existing `1020` entry):
```php
// Assets — Inventory (industry-specific, tagged via pivot)
['type' => 'Assets', 'code' => '1030', 'name' => 'Merchandise Inventory',              'sort_order' => 3],
['type' => 'Assets', 'code' => '1031', 'name' => 'Food Inventory',                     'sort_order' => 4],
['type' => 'Assets', 'code' => '1032', 'name' => 'Beverage Inventory',                 'sort_order' => 5],
['type' => 'Assets', 'code' => '1033', 'name' => 'Construction Materials Inventory',   'sort_order' => 6],
['type' => 'Assets', 'code' => '1034', 'name' => 'Retention Receivable',               'sort_order' => 7],
['type' => 'Assets', 'code' => '1035', 'name' => 'Raw Materials Inventory',            'sort_order' => 8],
['type' => 'Assets', 'code' => '1036', 'name' => 'Work-in-Progress Inventory',         'sort_order' => 9],
['type' => 'Assets', 'code' => '1037', 'name' => 'Finished Goods Inventory',           'sort_order' => 10],
```

In the **Revenue / Income** section (after existing `4099` entry):
```php
// Revenue — industry-specific
['type' => 'Revenue / Income', 'code' => '4021', 'name' => 'Contract Revenue',    'sort_order' => 11],
['type' => 'Revenue / Income', 'code' => '4041', 'name' => 'Deferred Revenue',    'sort_order' => 12],
['type' => 'Revenue / Income', 'code' => '4042', 'name' => 'Unbilled Revenue',    'sort_order' => 13],
```

In the **Cost of Goods Sold** section (after existing `5050` entry):
```php
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
```

- [ ] **Step 2: Create ChartOfAccountIndustrySeeder**

```php
// backend/database/seeders/ChartOfAccountIndustrySeeder.php
<?php

namespace Database\Seeders;

use App\Models\ChartOfAccount;
use App\Models\ChartOfAccountIndustry;
use Illuminate\Database\Seeder;

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
                ChartOfAccountIndustry::firstOrCreate([
                    'chart_of_account_id' => $coaId,
                    'industry'            => $industry,
                ]);
                $inserted++;
            }
        }

        $this->command->info("ChartOfAccountIndustrySeeder: {$inserted} industry tags seeded.");
    }
}
```

- [ ] **Step 3: Update DatabaseSeeder**

In `backend/database/seeders/DatabaseSeeder.php`, add `ChartOfAccountIndustrySeeder` after `ChartOfAccountSeeder`:

```php
public function run(): void
{
    $this->call(AdminSeeder::class);
    $this->call(AccountTypeSeeder::class);
    $this->call(ChartOfAccountSeeder::class);
    $this->call(ChartOfAccountIndustrySeeder::class);
    $this->call(ChartOfAccountSubtypeSeeder::class);
    $this->call(SubtypeSeeder::class);
    $this->call(DemoDataSeeder::class);
}
```

- [ ] **Step 4: Run tests — count tests should now pass**

```bash
cd backend && php artisan test --filter=ChartOfAccountsSeederTest
```

Expected: ALL tests PASS. Count is now 76 accounts, 8 account types, 121 subtypes.

- [ ] **Step 5: Commit**

```bash
git add backend/database/seeders/ChartOfAccountSeeder.php \
        backend/database/seeders/ChartOfAccountIndustrySeeder.php \
        backend/database/seeders/DatabaseSeeder.php
git commit -m "feat: add industry-specific COA accounts and ChartOfAccountIndustrySeeder"
```

---

## Task 4: ChartOfAccountIndustry Model + Updated seedDefaultAccounts()

**Files:**
- Create: `backend/app/Models/ChartOfAccountIndustry.php`
- Modify: `backend/app/Models/ChartOfAccount.php`
- Modify: `backend/app/Services/Accounting/ChartOfAccountsService.php`
- Create: `backend/tests/Feature/IndustryCoaProvisioningTest.php`

**Interfaces:**
- Consumes: `chart_of_account_industries` table; `Company->industry_type`
- Produces: `ChartOfAccount::industryTags()` HasMany; `seedDefaultAccounts($company)` filters by industry

- [ ] **Step 1: Write the failing test**

```php
// backend/tests/Feature/IndustryCoaProvisioningTest.php
<?php

namespace Tests\Feature;

use App\Models\Company;
use App\Models\User;
use App\Services\Accounting\ChartOfAccountsService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class IndustryCoaProvisioningTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(\Database\Seeders\AccountTypeSeeder::class);
        $this->seed(\Database\Seeders\ChartOfAccountSeeder::class);
        $this->seed(\Database\Seeders\ChartOfAccountIndustrySeeder::class);
    }

    private function makeCompany(string $industry): Company
    {
        return Company::create([
            'name'          => 'Test Co',
            'mobile'        => '09000000000',
            'bir_type'      => 'non_vat',
            'plan'          => 'starter',
            'industry_type' => $industry,
        ]);
    }

    public function test_retail_client_gets_merchandise_inventory_account(): void
    {
        $company = $this->makeCompany('retail');
        (new ChartOfAccountsService())->seedDefaultAccounts($company);

        $this->assertDatabaseHas('accounts', [
            'company_id' => $company->id,
            'code'       => '1030',
            'name'       => 'Merchandise Inventory',
        ]);
    }

    public function test_retail_client_does_not_get_food_inventory(): void
    {
        $company = $this->makeCompany('retail');
        (new ChartOfAccountsService())->seedDefaultAccounts($company);

        $this->assertDatabaseMissing('accounts', [
            'company_id' => $company->id,
            'code'       => '1031',
        ]);
    }

    public function test_restaurant_client_gets_food_and_beverage_inventory(): void
    {
        $company = $this->makeCompany('restaurant');
        (new ChartOfAccountsService())->seedDefaultAccounts($company);

        $this->assertDatabaseHas('accounts', ['company_id' => $company->id, 'code' => '1031']);
        $this->assertDatabaseHas('accounts', ['company_id' => $company->id, 'code' => '1032']);
    }

    public function test_all_clients_get_ewt_professional_fees_account(): void
    {
        foreach (['retail', 'services', 'restaurant', 'construction', 'professional_services', 'manufacturing'] as $industry) {
            $company = $this->makeCompany($industry);
            (new ChartOfAccountsService())->seedDefaultAccounts($company);

            $this->assertDatabaseHas('accounts', [
                'company_id' => $company->id,
                'code'       => '2210',
            ], "EWT account missing for industry: {$industry}");
        }
    }

    public function test_all_clients_get_wtc_payable_account(): void
    {
        foreach (['retail', 'services', 'restaurant', 'construction', 'professional_services', 'manufacturing'] as $industry) {
            $company = $this->makeCompany($industry);
            (new ChartOfAccountsService())->seedDefaultAccounts($company);

            $this->assertDatabaseHas('accounts', [
                'company_id' => $company->id,
                'code'       => '2220',
            ], "WTC account missing for industry: {$industry}");
        }
    }

    public function test_manufacturing_client_gets_raw_materials_and_finished_goods(): void
    {
        $company = $this->makeCompany('manufacturing');
        (new ChartOfAccountsService())->seedDefaultAccounts($company);

        $this->assertDatabaseHas('accounts', ['company_id' => $company->id, 'code' => '1035']);
        $this->assertDatabaseHas('accounts', ['company_id' => $company->id, 'code' => '1036']);
        $this->assertDatabaseHas('accounts', ['company_id' => $company->id, 'code' => '1037']);
    }

    public function test_services_client_does_not_get_merchandise_inventory(): void
    {
        $company = $this->makeCompany('services');
        (new ChartOfAccountsService())->seedDefaultAccounts($company);

        $this->assertDatabaseMissing('accounts', [
            'company_id' => $company->id,
            'code'       => '1030',
        ]);
    }

    public function test_liability_type_accounts_are_seeded_correctly(): void
    {
        $company = $this->makeCompany('retail');
        (new ChartOfAccountsService())->seedDefaultAccounts($company);

        $this->assertDatabaseHas('accounts', [
            'company_id' => $company->id,
            'code'       => '2210',
            'type'       => 'liability',
        ]);
    }
}
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd backend && php artisan test --filter=IndustryCoaProvisioningTest
```

Expected: FAIL — `ChartOfAccountIndustry` class not found, `seedDefaultAccounts` doesn't filter yet.

- [ ] **Step 3: Create ChartOfAccountIndustry model**

```php
// backend/app/Models/ChartOfAccountIndustry.php
<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ChartOfAccountIndustry extends Model
{
    public $timestamps = false;

    protected $fillable = ['chart_of_account_id', 'industry'];

    public function chartOfAccount(): BelongsTo
    {
        return $this->belongsTo(ChartOfAccount::class);
    }
}
```

- [ ] **Step 4: Add industryTags relationship to ChartOfAccount model**

In `backend/app/Models/ChartOfAccount.php`, add the import and relationship:

```php
use Illuminate\Database\Eloquent\Relations\HasMany;
// (HasMany is already imported for subtypes — add ChartOfAccountIndustry use if needed)

public function industryTags(): HasMany
{
    return $this->hasMany(ChartOfAccountIndustry::class);
}
```

The full updated model:
```php
<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class ChartOfAccount extends Model
{
    use HasUuids, HasFactory;

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

    public function industryTags(): HasMany
    {
        return $this->hasMany(ChartOfAccountIndustry::class);
    }
}
```

- [ ] **Step 5: Update seedDefaultAccounts() to filter by industry**

Replace the body of `seedDefaultAccounts()` in `backend/app/Services/Accounting/ChartOfAccountsService.php`:

```php
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
```

- [ ] **Step 6: Run tests to verify they pass**

```bash
cd backend && php artisan test --filter=IndustryCoaProvisioningTest
```

Expected: ALL 8 tests PASS.

Also run the existing seeder test to make sure nothing broke:

```bash
cd backend && php artisan test --filter=ChartOfAccountsSeederTest
```

Expected: ALL tests PASS.

- [ ] **Step 7: Commit**

```bash
git add backend/app/Models/ChartOfAccountIndustry.php \
        backend/app/Models/ChartOfAccount.php \
        backend/app/Services/Accounting/ChartOfAccountsService.php \
        backend/tests/Feature/IndustryCoaProvisioningTest.php
git commit -m "feat: add industry COA filtering to seedDefaultAccounts"
```

---

## Task 5: Backend — Company Model + Client Creation

**Files:**
- Modify: `backend/app/Models/Company.php`
- Modify: `backend/app/Http/Requests/Admin/CreateClientRequest.php`
- Modify: `backend/app/Http/Requests/Accountant/CreateClientRequest.php`
- Modify: `backend/app/Http/Controllers/Admin/ClientController.php`
- Modify: `backend/app/Http/Controllers/Accountant/ClientController.php`

**Interfaces:**
- Produces: `Company::$fillable` includes `industry_type`; both `CreateClientRequest` accept optional `industryType`; both `ClientController::store()` save `industry_type` and no longer call `seedDefaultAccounts()`

- [ ] **Step 1: Add industry_type to Company model fillable**

In `backend/app/Models/Company.php`, add `'industry_type'` to `$fillable`:

```php
protected $fillable = [
    'name',
    'mobile',
    'email',
    'tin',
    'contact_person',
    'bir_type',
    'industry_type',
    'plan',
    'accountant_id',
];
```

- [ ] **Step 2: Add optional industryType to Admin CreateClientRequest**

In `backend/app/Http/Requests/Admin/CreateClientRequest.php`, add to `rules()`:

```php
'industryType' => ['nullable', 'in:retail,services,restaurant,construction,professional_services,manufacturing'],
```

Full updated rules:
```php
public function rules(): array
{
    return [
        'businessName'  => ['required', 'string', 'max:255'],
        'mobile'        => ['required', 'string', 'max:20'],
        'planType'      => ['required', 'in:starter,growth,premium'],
        'birType'       => ['required', 'in:vat,non_vat'],
        'accountantId'  => ['required', 'exists:users,id'],
        'tin'           => ['nullable', 'string', 'max:20'],
        'email'         => ['nullable', 'email', 'max:255'],
        'contactPerson' => ['nullable', 'string', 'max:255'],
        'industryType'  => ['nullable', 'in:retail,services,restaurant,construction,professional_services,manufacturing'],
    ];
}
```

- [ ] **Step 3: Add optional industryType to Accountant CreateClientRequest**

In `backend/app/Http/Requests/Accountant/CreateClientRequest.php`, add the same rule:

```php
public function rules(): array
{
    return [
        'businessName'  => ['required', 'string', 'max:255'],
        'mobile'        => ['required', 'string', 'max:20'],
        'planType'      => ['required', 'in:starter,growth,premium'],
        'birType'       => ['required', 'in:vat,non_vat'],
        'tin'           => ['nullable', 'string', 'max:20'],
        'email'         => ['nullable', 'email', 'max:255'],
        'contactPerson' => ['nullable', 'string', 'max:255'],
        'industryType'  => ['nullable', 'in:retail,services,restaurant,construction,professional_services,manufacturing'],
    ];
}
```

- [ ] **Step 4: Update Admin ClientController::store()**

In `backend/app/Http/Controllers/Admin/ClientController.php`:

1. Remove the `ChartOfAccountsService` import and usage in `store()`.
2. Add `'industry_type' => $request->industryType` to the `Company::create()` call.

Find the `Company::create([...])` call (around line 68–77) and update it:

```php
$company = Company::create([
    'name'           => $request->businessName,
    'mobile'         => $request->mobile,
    'email'          => $request->email,
    'tin'            => $request->tin,
    'contact_person' => $request->contactPerson,
    'bir_type'       => $request->birType,
    'industry_type'  => $request->industryType,
    'plan'           => $request->planType,
    'accountant_id'  => $request->accountantId,
]);
```

Remove the line `(new ChartOfAccountsService())->seedDefaultAccounts($company);` (line 90 in the original).

Also remove the `use App\Services\Accounting\ChartOfAccountsService;` import if it is no longer used anywhere else in the file.

- [ ] **Step 5: Update Accountant ClientController::store()**

In `backend/app/Http/Controllers/Accountant/ClientController.php` (around line 145):

Add `'industry_type' => $request->industryType` to `Company::create()`:

```php
$company = Company::create([
    'name'           => $request->businessName,
    'mobile'         => $request->mobile,
    'email'          => $request->email,
    'tin'            => $request->tin,
    'contact_person' => $request->contactPerson,
    'bir_type'       => $request->birType,
    'industry_type'  => $request->industryType,
    'plan'           => $request->planType,
    'accountant_id'  => $accountant->id,
]);
```

Remove `(new ChartOfAccountsService())->seedDefaultAccounts($company);` from the transaction.

Also remove `use App\Services\Accounting\ChartOfAccountsService;` if no longer used.

- [ ] **Step 6: Verify existing tests still pass**

```bash
cd backend && php artisan test --filter=AccountantClientsIndexTest
```

Expected: PASS (no behavior change to the index endpoint).

- [ ] **Step 7: Commit**

```bash
git add backend/app/Models/Company.php \
        backend/app/Http/Requests/Admin/CreateClientRequest.php \
        backend/app/Http/Requests/Accountant/CreateClientRequest.php \
        backend/app/Http/Controllers/Admin/ClientController.php \
        backend/app/Http/Controllers/Accountant/ClientController.php
git commit -m "feat: save industry_type at client creation, defer COA seeding to setup"
```

---

## Task 6: Backend — Auth Setup Endpoint

**Files:**
- Modify: `backend/app/Http/Requests/Auth/SetupPasswordRequest.php`
- Modify: `backend/app/Http/Controllers/AuthController.php`

**Interfaces:**
- Consumes: `industry_type` from request; `User->company` relationship
- Produces: `validateToken` response includes `industryType`; `setupPassword` saves `industry_type` to company and calls `seedDefaultAccounts($company)`

- [ ] **Step 1: Write the failing test**

Add two test methods to `backend/tests/Feature/IndustryCoaProvisioningTest.php` (in the existing test class, add these after the existing tests):

```php
public function test_setup_endpoint_seeds_accounts_for_client(): void
{
    $this->seed(\Database\Seeders\AdminSeeder::class);

    // Create a company and client user
    $company = Company::create([
        'name'     => 'Setup Test Co',
        'mobile'   => '09111111111',
        'bir_type' => 'non_vat',
        'plan'     => 'starter',
    ]);

    $user = User::create([
        'name'       => 'Setup Test Co',
        'username'   => 'setuptestco',
        'password'   => bcrypt('temppass'),
        'role'       => 'client',
        'status'     => 'active',
        'company_id' => $company->id,
    ]);

    // Generate invite token
    $tokenService = new \App\Services\Auth\InviteTokenService();
    $rawToken = $tokenService->generate($user);

    $response = $this->postJson('/api/auth/setup', [
        'token'                 => $rawToken,
        'name'                  => 'Test Owner',
        'password'              => 'Password123!',
        'password_confirmation' => 'Password123!',
        'industry_type'         => 'retail',
    ]);

    $response->assertStatus(200);

    // Company industry_type was saved
    $this->assertDatabaseHas('companies', [
        'id'            => $company->id,
        'industry_type' => 'retail',
    ]);

    // Accounts were seeded — retail-specific account exists
    $this->assertDatabaseHas('accounts', [
        'company_id' => $company->id,
        'code'       => '1030',
    ]);

    // Non-retail account was NOT seeded
    $this->assertDatabaseMissing('accounts', [
        'company_id' => $company->id,
        'code'       => '1031',
    ]);
}

public function test_setup_endpoint_returns_422_for_client_without_industry_type(): void
{
    $company = Company::create([
        'name'     => 'No Industry Co',
        'mobile'   => '09222222222',
        'bir_type' => 'non_vat',
        'plan'     => 'starter',
    ]);

    $user = User::create([
        'name'       => 'No Industry Co',
        'username'   => 'noindustryco',
        'password'   => bcrypt('temppass'),
        'role'       => 'client',
        'status'     => 'active',
        'company_id' => $company->id,
    ]);

    $tokenService = new \App\Services\Auth\InviteTokenService();
    $rawToken = $tokenService->generate($user);

    $response = $this->postJson('/api/auth/setup', [
        'token'                 => $rawToken,
        'name'                  => 'Test Owner',
        'password'              => 'Password123!',
        'password_confirmation' => 'Password123!',
        // industry_type intentionally omitted
    ]);

    $response->assertStatus(422);
}
```

You will also need to add the User model import at the top of the test class:
```php
use App\Models\User;
use App\Services\Auth\InviteTokenService;
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd backend && php artisan test --filter=IndustryCoaProvisioningTest::test_setup_endpoint_seeds_accounts_for_client
cd backend && php artisan test --filter=IndustryCoaProvisioningTest::test_setup_endpoint_returns_422_for_client_without_industry_type
```

Expected: Both FAIL.

- [ ] **Step 3: Update SetupPasswordRequest**

In `backend/app/Http/Requests/Auth/SetupPasswordRequest.php`, add nullable `industry_type` rule:

```php
public function rules(): array
{
    return [
        'token'                 => ['required', 'string'],
        'name'                  => ['required', 'string', 'max:255'],
        'password'              => ['required', 'string', 'min:8', 'confirmed'],
        'password_confirmation' => ['required'],
        'industry_type'         => ['nullable', 'in:retail,services,restaurant,construction,professional_services,manufacturing'],
    ];
}
```

- [ ] **Step 4: Update AuthController**

In `backend/app/Http/Controllers/AuthController.php`:

1. Add `ChartOfAccountsService` import at the top:
```php
use App\Services\Accounting\ChartOfAccountsService;
```

2. Update `validateToken()` to return `industryType`:
```php
public function validateToken(Request $request): JsonResponse
{
    $rawToken = $request->query('token', '');

    $inviteToken = $this->inviteTokenService->validate($rawToken);

    if (! $inviteToken) {
        return response()->json(['valid' => false, 'role' => null, 'expired' => true, 'industryType' => null]);
    }

    $user = \App\Models\User::with('company')->find($inviteToken->user_id);

    return response()->json([
        'valid'        => true,
        'role'         => $inviteToken->role,
        'expired'      => false,
        'industryType' => $user?->company?->industry_type,
    ]);
}
```

3. Update `setupPassword()` to handle `industry_type`:
```php
public function setupPassword(SetupPasswordRequest $request): JsonResponse
{
    $inviteToken = $this->inviteTokenService->validate($request->token);

    if (! $inviteToken) {
        return response()->json(['message' => 'Invalid or expired invite link'], 422);
    }

    $user = User::findOrFail($inviteToken->user_id);

    if ($inviteToken->role === 'client') {
        if (! $request->filled('industry_type')) {
            return response()->json(['message' => 'Industry type is required.'], 422);
        }

        $company = $user->company;
        if ($company) {
            $company->update(['industry_type' => $request->industry_type]);
            (new ChartOfAccountsService())->seedDefaultAccounts($company->fresh());
        }
    }

    $user->name     = $request->name;
    $user->password = Hash::make($request->password);
    $user->save();

    $this->inviteTokenService->consume($inviteToken);

    $token = $user->createToken('api-token')->plainTextToken;

    return response()->json([
        'token' => $token,
        'user'  => [
            'id'        => $user->id,
            'name'      => $user->name,
            'role'      => $user->role,
            'companyId' => $user->company_id,
            'status'    => $user->status,
        ],
    ]);
}
```

Note: `User` model already has a `company()` relationship defined (via `company_id` foreign key — verify this exists in the User model; if not, it's accessed via `$user->company` using the BelongsTo from `company_id`).

- [ ] **Step 5: Verify User model has company relationship**

Read `backend/app/Models/User.php` and confirm a `company()` BelongsTo relationship exists. If it only has `company_id` as a FK without a defined relationship, add:
```php
public function company(): \Illuminate\Database\Eloquent\Relations\BelongsTo
{
    return $this->belongsTo(Company::class);
}
```

- [ ] **Step 6: Run tests**

```bash
cd backend && php artisan test --filter=IndustryCoaProvisioningTest
```

Expected: ALL 10 tests PASS.

- [ ] **Step 7: Commit**

```bash
git add backend/app/Http/Requests/Auth/SetupPasswordRequest.php \
        backend/app/Http/Controllers/AuthController.php \
        backend/app/Models/User.php \
        backend/tests/Feature/IndustryCoaProvisioningTest.php
git commit -m "feat: setup endpoint saves industry_type and seeds COA for client"
```

---

## Task 7: Frontend — Setup Page

**Files:**
- Modify: `frontend/src/lib/api/auth.ts`
- Modify: `frontend/src/app/(auth)/setup/page.tsx`

**Interfaces:**
- Consumes: `validateSetupToken` now returns `industryType: string | null`; `setupPassword` now accepts `industryType: string`
- Produces: Industry dropdown shown and required for client role; skipped for accountant role

- [ ] **Step 1: Update validateSetupToken and setupPassword in auth.ts**

In `frontend/src/lib/api/auth.ts`, update the two functions:

```typescript
export async function validateSetupToken(
  token: string
): Promise<{ valid: boolean; role: Role; expired: boolean; industryType: string | null }> {
  const { data } = await api.get<{ valid: boolean; role: Role; expired: boolean; industryType: string | null }>(
    `/auth/validate-token?token=${token}`
  )
  return data
}

export async function setupPassword(
  token: string,
  name: string,
  password: string,
  industryType?: string
): Promise<{ token: string; user: User }> {
  const { data } = await api.post<{ token: string; user: User }>('/auth/setup', {
    token,
    name,
    password,
    password_confirmation: password,
    ...(industryType ? { industry_type: industryType } : {}),
  })
  localStorage.setItem('b4b_token', data.token)
  localStorage.setItem('b4b_user', JSON.stringify(data.user))
  setCookies(data.user.role, data.user.status, data.user.companyId)
  return data
}
```

- [ ] **Step 2: Update setup page schema and state**

In `frontend/src/app/(auth)/setup/page.tsx`:

Update the Zod schema to include `industryType` (conditionally required based on role — we handle this via a custom refinement):

```typescript
const INDUSTRY_OPTIONS = [
  { value: 'retail',                label: 'Retail' },
  { value: 'services',              label: 'Services' },
  { value: 'restaurant',            label: 'Restaurant / F&B' },
  { value: 'construction',          label: 'Construction' },
  { value: 'professional_services', label: 'Professional Services' },
  { value: 'manufacturing',         label: 'Manufacturing' },
] as const

type IndustryValue = typeof INDUSTRY_OPTIONS[number]['value']

const schema = z
  .object({
    name:            z.string().min(2, 'Full name required'),
    password:        z.string().min(8, 'Password must be at least 8 characters'),
    confirmPassword: z.string().min(1, 'Required'),
    industryType:    z.string().optional(),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: 'Passwords do not match',
    path:    ['confirmPassword'],
  })

type FormValues = z.infer<typeof schema>
```

- [ ] **Step 3: Update SetupForm component state and token validation**

In `SetupForm()`, add `industryType` state and update the `validateSetupToken` effect:

Add to state declarations (after the existing state lines):
```typescript
const [prefillIndustry, setPrefillIndustry] = useState<string | null>(null)
```

Update the `validateSetupToken` effect:
```typescript
useEffect(() => {
  if (!token) { router.replace('/login'); return }
  validateSetupToken(token)
    .then((result) => {
      if (!result.valid)       setTokenState('invalid')
      else if (result.expired) setTokenState('expired')
      else {
        setRole(result.role)
        setPrefillIndustry(result.industryType)
        setTokenState('form')
      }
    })
    .catch(() => setTokenState('invalid'))
}, [token, router])
```

Update the `onSubmit` function to validate industry for client and pass it to the API:
```typescript
const onSubmit = async (values: FormValues) => {
  if (!token) return
  setApiError(null)

  if (isClient && !values.industryType) {
    setApiError('Please select your industry type.')
    return
  }

  try {
    const { user } = await setupPassword(token, values.name, values.password, values.industryType)
    setSubmitStatus('success')
    redirectTimer.current = setTimeout(() => router.push(`/${user.role}/dashboard`), 1500)
  } catch (err) {
    if (axios.isAxiosError(err) && err.response?.status === 422) {
      setApiError(err.response.data?.message ?? 'Invalid data.')
    } else {
      setApiError('Something went wrong. Please try again.')
    }
  }
}
```

- [ ] **Step 4: Add industry dropdown to the form JSX**

In the form section (inside the `else` branch of `leftContent`, after the Confirm Password field and before the submit button), add the industry dropdown — but only when `isClient` is true:

```tsx
{/* Industry Type — clients only */}
{isClient && (
  <div className="lv2-field">
    <label className="lv2-label" htmlFor="su-industry">
      Industry Type <span className="form-req">*</span>
    </label>
    <div className="lv2-input" style={{ padding: 0, overflow: 'hidden' }}>
      <select
        id="su-industry"
        disabled={isSubmitting || submitStatus === 'success'}
        defaultValue={prefillIndustry ?? ''}
        {...register('industryType')}
        style={{
          width: '100%',
          border: 'none',
          background: 'transparent',
          padding: '10px 14px',
          fontSize: 14,
          color: 'inherit',
          outline: 'none',
          cursor: 'pointer',
        }}
      >
        <option value="" disabled>Select your industry…</option>
        {INDUSTRY_OPTIONS.map((opt) => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>
    </div>
    {errors.industryType && (
      <div className="field-error">{errors.industryType.message}</div>
    )}
    <p className="lv2-hint">Used to set up your chart of accounts.</p>
  </div>
)}
```

Place this block between the Confirm Password `</div>` and the submit `<button>`.

- [ ] **Step 5: Verify the `isClient` variable is defined before the form section**

`isClient` is already defined on line 140 of the original file as:
```typescript
const isClient = role === 'client'
```
This is correct — no change needed.

- [ ] **Step 6: Run TypeScript check**

```bash
cd frontend && npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 7: Commit**

```bash
git add frontend/src/lib/api/auth.ts \
        frontend/src/app/'(auth)'/setup/page.tsx
git commit -m "feat: add industry type field to setup page (required for client role)"
```

---

## Task 8: Frontend — Client Creation Modals

**Files:**
- Modify: `frontend/src/lib/api/admin/clients.ts`
- Modify: `frontend/src/components/admin/ClientModal.tsx`
- Modify: `frontend/src/lib/api/accountant/clients.ts`
- Modify: `frontend/src/components/accountant/NewClientModal.tsx`

**Interfaces:**
- Produces: Both modals send optional `industryType` to their respective API endpoints; both API files include `industryType?` in payload types

- [ ] **Step 1: Update admin clients API type**

In `frontend/src/lib/api/admin/clients.ts`, find the `CreateClientPayload` or the inline type. The current `createClient` function likely sends the form data directly. Add `industryType?` to the payload type:

Check the current content by reading the file, then add to the payload interface:
```typescript
export interface CreateClientPayload {
  businessName:  string
  mobile:        string
  planType:      'starter' | 'growth' | 'premium'
  birType:       'vat' | 'non_vat'
  accountantId:  string
  tin?:          string
  email?:        string
  contactPerson?: string
  industryType?: string
}
```

If the function currently takes a `CreateForm` directly, ensure `industryType` flows through.

- [ ] **Step 2: Update accountant clients API type**

In `frontend/src/lib/api/accountant/clients.ts`, update `CreateClientPayload`:

```typescript
export interface CreateClientPayload {
  businessName:   string
  mobile:         string
  planType:       'starter' | 'growth' | 'premium'
  birType:        'vat' | 'non_vat'
  tin?:           string
  email?:         string
  contactPerson?: string
  industryType?:  string
}
```

- [ ] **Step 3: Add industry dropdown to Admin ClientModal**

In `frontend/src/components/admin/ClientModal.tsx`:

1. Update the Zod `createSchema` to add optional `industryType`:
```typescript
const createSchema = z.object({
  businessName:  z.string().min(1, 'Required'),
  mobile:        z.string().min(1, 'Required'),
  planType:      z.enum(['starter', 'growth', 'premium']),
  birType:       z.enum(['vat', 'non_vat']),
  accountantId:  z.string().min(1, 'Required'),
  tin:           z.string().optional(),
  email:         z.string().email().optional().or(z.literal('')),
  contactPerson: z.string().optional(),
  industryType:  z.string().optional(),
})
```

2. Add `INDUSTRY_OPTIONS` constant at the top of the file (after imports):
```typescript
const INDUSTRY_OPTIONS = [
  { value: 'retail',                label: 'Retail' },
  { value: 'services',              label: 'Services' },
  { value: 'restaurant',            label: 'Restaurant / F&B' },
  { value: 'construction',          label: 'Construction' },
  { value: 'professional_services', label: 'Professional Services' },
  { value: 'manufacturing',         label: 'Manufacturing' },
]
```

3. In the form JSX (inside `<form>`), add the industry dropdown after the VAT Type field and before the Email field:
```tsx
<div style={{ gridColumn: '1 / -1' }}>
  <label style={{ display: 'block', fontSize: 11, color: 'var(--t-muted)', marginBottom: 4 }}>
    Industry Type
  </label>
  <select
    value={watch('industryType') ?? ''}
    onChange={(e) => setValue('industryType', e.target.value || undefined)}
    className={inputCls()}
  >
    <option value="">Select industry… (optional)</option>
    {INDUSTRY_OPTIONS.map((opt) => (
      <option key={opt.value} value={opt.value}>{opt.label}</option>
    ))}
  </select>
  <div style={{ fontSize: 10.5, color: 'var(--t-faint)', marginTop: 3 }}>
    Client can also set this during account setup.
  </div>
</div>
```

- [ ] **Step 4: Add industry dropdown to Accountant NewClientModal**

In `frontend/src/components/accountant/NewClientModal.tsx`:

1. Add `INDUSTRY_OPTIONS` constant (same as above, after imports).

2. The component uses uncontrolled state via `useState<CreateClientPayload>`. Add `industryType` to the `EMPTY` object:
```typescript
const EMPTY: CreateClientPayload = {
  businessName:  '',
  mobile:        '',
  planType:      'starter',
  birType:       'non_vat',
  tin:           '',
  email:         '',
  contactPerson: '',
  industryType:  '',
}
```

3. In the form grid (after the VAT Type select, before the Email input), add:
```tsx
<div style={{ gridColumn: '1 / -1' }}>
  <label style={{ display: 'block', fontSize: 11, color: 'var(--t-muted)', marginBottom: 4 }}>Industry Type</label>
  <select
    className={inputCls('industryType' as keyof CreateClientPayload)}
    value={form.industryType ?? ''}
    onChange={(e) => set('industryType' as keyof CreateClientPayload, e.target.value)}
  >
    <option value="">Select industry… (optional)</option>
    {INDUSTRY_OPTIONS.map((opt) => (
      <option key={opt.value} value={opt.value}>{opt.label}</option>
    ))}
  </select>
  <div style={{ fontSize: 10.5, color: 'var(--t-faint)', marginTop: 3 }}>
    Client can also set this during account setup.
  </div>
</div>
```

Note: `set` and `inputCls` accept `Field = keyof CreateClientPayload`. Since `industryType` is now in `CreateClientPayload`, it will type-check correctly.

- [ ] **Step 5: Run TypeScript check**

```bash
cd frontend && npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 6: Run full backend test suite to confirm nothing regressed**

```bash
cd backend && php artisan test
```

Expected: All tests PASS.

- [ ] **Step 7: Commit**

```bash
git add frontend/src/lib/api/admin/clients.ts \
        frontend/src/components/admin/ClientModal.tsx \
        frontend/src/lib/api/accountant/clients.ts \
        frontend/src/components/accountant/NewClientModal.tsx
git commit -m "feat: add optional industry type to client creation modals"
```

---

## Self-Review Checklist

- [x] **Spec coverage:** All spec sections covered — data model (Tasks 1–4), client creation flow (Tasks 5–6), setup page (Task 7), modals (Task 8)
- [x] **No placeholders:** All code blocks are complete
- [x] **Type consistency:** `industry_type` (PHP snake_case) maps to `industryType` (TS camelCase) consistently; backend validation uses the same 6 enum values throughout; `ChartOfAccountIndustry` model name matches import in seeder
- [x] **seedDefaultAccounts called exactly once:** Removed from both ClientControllers, added to AuthController::setupPassword for client role only
- [x] **WHT accounts are universal:** They appear in `ChartOfAccountSeeder` but NOT in `ChartOfAccountIndustrySeeder::MAPPING`, so `whereDoesntHave('industryTags')` catches them for every client
- [x] **Industry dropdown hidden for accountant role on setup page:** `{isClient && (...)}` guard on the JSX
