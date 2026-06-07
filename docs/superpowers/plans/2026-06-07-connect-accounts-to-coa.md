# Connect Accounts to Chart of Accounts — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Connect the existing company-scoped `accounts` table to the new global `chart_of_accounts` template, retarget `transaction_lines.subtype_id` and `adjusting_entry_lines.subtype_id` to reference `chart_of_account_subtypes` instead of the old flat `subtypes` table, update all services and controllers, and fix the DemoDataSeeder to use new CoA codes.

**Architecture:**
- `accounts` remains company-scoped (each company still has its own rows) but now each account carries a nullable `chart_of_account_id` FK linking it to its global CoA template entry
- `accounts.type` ENUM is expanded from 4 values to 5: adds `equity` for Owner's Equity accounts
- Both `transaction_lines.subtype_id` and `adjusting_entry_lines.subtype_id` drop their FK to the old `subtypes` table and gain a new FK to `chart_of_account_subtypes` (old UUIDs are nullified because they do not exist in the new table)
- `ChartOfAccountsService::seedDefaultAccounts()` is rewritten to pull from the global `chart_of_accounts` template and set `chart_of_account_id` on each created account
- `TransactionLine::subtype()` and `AdjustingEntryLine::subtype()` are updated to return `ChartOfAccountSubtype`; downstream services (`GLService`, `IncomeStatementService`) call `->subtype?->name` and work unchanged

**Tech Stack:** Laravel 11, PostgreSQL, UUID primary keys (HasUuids), Docker (`docker exec sofia-backend php artisan ...`)

**Docker command:** `docker exec sofia-backend php artisan <command>`

**Type mapping (accounts.type):**
| CoA Account Type      | accounts.type |
|-----------------------|---------------|
| Assets                | cash          |
| Owner's Equity        | equity        |
| Revenue / Income      | income        |
| Cost of Goods Sold    | expense       |
| Expenses              | expense       |
| Other Income          | income        |
| Other Expenses        | expense       |

---

### Task 1: Add `chart_of_account_id` FK and expand `type` ENUM on `accounts`

**Files:**
- Create: `backend/database/migrations/2026_06_07_000004_link_accounts_to_chart_of_accounts.php`
- Modify: `backend/app/Models/Account.php`

**Context:**
- `accounts` table currently has `type ENUM('income','expense','cash','vat')` — needs `equity` added for Owner's Equity accounts
- PostgreSQL stores Laravel ENUMs as CHECK constraints, not native PG ENUM types. The constraint name for a column `type` on table `accounts` is `accounts_type_check`. Changing the allowed values requires dropping and re-adding that constraint.
- `chart_of_accounts` table has UUID primary key and is already seeded by `ChartOfAccountSeeder`
- `Account` model is at `backend/app/Models/Account.php`

- [ ] **Step 1: Write the migration**

```php
<?php
// backend/database/migrations/2026_06_07_000004_link_accounts_to_chart_of_accounts.php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // 1. Add chart_of_account_id FK (nullable — VAT accounts have no CoA entry)
        Schema::table('accounts', function (Blueprint $table) {
            $table->foreignUuid('chart_of_account_id')
                  ->nullable()
                  ->after('company_id')
                  ->references('id')->on('chart_of_accounts')
                  ->nullOnDelete();
        });

        // 2. Expand type ENUM — PostgreSQL stores this as a CHECK constraint
        DB::statement("ALTER TABLE accounts DROP CONSTRAINT IF EXISTS accounts_type_check");
        DB::statement("ALTER TABLE accounts ADD CONSTRAINT accounts_type_check CHECK (type IN ('income','expense','cash','vat','equity'))");
    }

    public function down(): void
    {
        Schema::table('accounts', function (Blueprint $table) {
            $table->dropForeign(['chart_of_account_id']);
            $table->dropColumn('chart_of_account_id');
        });

        DB::statement("ALTER TABLE accounts DROP CONSTRAINT IF EXISTS accounts_type_check");
        DB::statement("ALTER TABLE accounts ADD CONSTRAINT accounts_type_check CHECK (type IN ('income','expense','cash','vat'))");
    }
};
```

- [ ] **Step 2: Update `Account` model**

```php
<?php
// backend/app/Models/Account.php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Account extends Model
{
    use HasUuids, HasFactory;

    protected $fillable = [
        'company_id',
        'chart_of_account_id',
        'code',
        'name',
        'type',
        'is_system_managed',
        'is_active',
    ];

    protected $casts = [
        'is_system_managed' => 'boolean',
        'is_active'         => 'boolean',
    ];

    public function company(): BelongsTo
    {
        return $this->belongsTo(Company::class);
    }

    public function chartOfAccount(): BelongsTo
    {
        return $this->belongsTo(ChartOfAccount::class);
    }
}
```

- [ ] **Step 3: Run the migration**

```bash
docker exec sofia-backend php artisan migrate
```

Expected: migration runs without error. No existing data is affected because the new column is nullable.

- [ ] **Step 4: Verify**

```bash
docker exec sofia-backend php artisan tinker --execute="echo \App\Models\Account::count();"
```

Expected: outputs current count (no crash = migration succeeded).

- [ ] **Step 5: Commit**

```bash
git add backend/database/migrations/2026_06_07_000004_link_accounts_to_chart_of_accounts.php backend/app/Models/Account.php
git commit -m "feat: add chart_of_account_id FK and expand type ENUM on accounts"
```

---

### Task 2: Re-point `transaction_lines.subtype_id` → `chart_of_account_subtypes`

**Files:**
- Create: `backend/database/migrations/2026_06_07_000005_retarget_transaction_lines_subtype.php`
- Modify: `backend/app/Models/TransactionLine.php`

**Context:**
- Current: `transaction_lines.subtype_id` FK → `subtypes.id` (old flat table)
- Target: `transaction_lines.subtype_id` FK → `chart_of_account_subtypes.id`
- Existing `subtype_id` values in the DB reference UUIDs from `subtypes` which do NOT exist in `chart_of_account_subtypes`. They must be nullified before re-adding the FK.
- In PostgreSQL, the FK constraint name is `transaction_lines_subtype_id_foreign`
- `TransactionLine::subtype()` relationship must be updated to point to `ChartOfAccountSubtype` instead of `Subtype`
- Services that call `$txLine->subtype?->name` (GLService, IncomeStatementService) continue to work unchanged because the method name stays `subtype()`

- [ ] **Step 1: Write the migration**

```php
<?php
// backend/database/migrations/2026_06_07_000005_retarget_transaction_lines_subtype.php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // 1. Drop the old FK (subtype_id → subtypes)
        Schema::table('transaction_lines', function (Blueprint $table) {
            $table->dropForeign(['subtype_id']);
        });

        // 2. Nullify existing values — old subtypes UUIDs don't exist in chart_of_account_subtypes
        DB::table('transaction_lines')->update(['subtype_id' => null]);

        // 3. Add new FK (subtype_id → chart_of_account_subtypes)
        Schema::table('transaction_lines', function (Blueprint $table) {
            $table->foreign('subtype_id')
                  ->references('id')->on('chart_of_account_subtypes')
                  ->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('transaction_lines', function (Blueprint $table) {
            $table->dropForeign(['subtype_id']);
        });

        DB::table('transaction_lines')->update(['subtype_id' => null]);

        Schema::table('transaction_lines', function (Blueprint $table) {
            $table->foreign('subtype_id')
                  ->references('id')->on('subtypes')
                  ->nullOnDelete();
        });
    }
};
```

- [ ] **Step 2: Update `TransactionLine` model**

```php
<?php
// backend/app/Models/TransactionLine.php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class TransactionLine extends Model
{
    use HasUuids, HasFactory;

    protected $fillable = [
        'document_id',
        'account_id',
        'account_code',
        'type',
        'subtype_id',
        'amount',
        'description',
        'date',
    ];

    protected $casts = [
        'amount' => 'decimal:2',
        'date'   => 'date',
    ];

    public function document(): BelongsTo
    {
        return $this->belongsTo(Document::class);
    }

    public function account(): BelongsTo
    {
        return $this->belongsTo(Account::class);
    }

    public function subtype(): BelongsTo
    {
        return $this->belongsTo(ChartOfAccountSubtype::class);
    }
}
```

- [ ] **Step 3: Run the migration**

```bash
docker exec sofia-backend php artisan migrate
```

Expected: migration runs without error.

- [ ] **Step 4: Commit**

```bash
git add backend/database/migrations/2026_06_07_000005_retarget_transaction_lines_subtype.php backend/app/Models/TransactionLine.php
git commit -m "feat: retarget transaction_lines.subtype_id to chart_of_account_subtypes"
```

---

### Task 3: Re-point `adjusting_entry_lines.subtype_id` → `chart_of_account_subtypes`

**Files:**
- Create: `backend/database/migrations/2026_06_07_000006_retarget_adjusting_entry_lines_subtype.php`
- Modify: `backend/app/Models/AdjustingEntryLine.php`

**Context:**
- Same pattern as Task 2 but for `adjusting_entry_lines`
- Current FK: `adjusting_entry_lines.subtype_id` → `subtypes.id`
- FK constraint name: `adjusting_entry_lines_subtype_id_foreign`
- `AdjustingEntryLine` is at `backend/app/Models/AdjustingEntryLine.php`

- [ ] **Step 1: Write the migration**

```php
<?php
// backend/database/migrations/2026_06_07_000006_retarget_adjusting_entry_lines_subtype.php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('adjusting_entry_lines', function (Blueprint $table) {
            $table->dropForeign(['subtype_id']);
        });

        DB::table('adjusting_entry_lines')->update(['subtype_id' => null]);

        Schema::table('adjusting_entry_lines', function (Blueprint $table) {
            $table->foreign('subtype_id')
                  ->references('id')->on('chart_of_account_subtypes')
                  ->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('adjusting_entry_lines', function (Blueprint $table) {
            $table->dropForeign(['subtype_id']);
        });

        DB::table('adjusting_entry_lines')->update(['subtype_id' => null]);

        Schema::table('adjusting_entry_lines', function (Blueprint $table) {
            $table->foreign('subtype_id')
                  ->references('id')->on('subtypes')
                  ->nullOnDelete();
        });
    }
};
```

- [ ] **Step 2: Update `AdjustingEntryLine` model**

```php
<?php
// backend/app/Models/AdjustingEntryLine.php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class AdjustingEntryLine extends Model
{
    protected $fillable = [
        'adjusting_entry_id',
        'account_id',
        'subtype_id',
        'debit',
        'credit',
        'description',
    ];

    protected $casts = [
        'debit'  => 'decimal:2',
        'credit' => 'decimal:2',
    ];

    public function adjustingEntry(): BelongsTo
    {
        return $this->belongsTo(AdjustingEntry::class);
    }

    public function account(): BelongsTo
    {
        return $this->belongsTo(Account::class);
    }

    public function subtype(): BelongsTo
    {
        return $this->belongsTo(ChartOfAccountSubtype::class);
    }
}
```

- [ ] **Step 3: Run the migration**

```bash
docker exec sofia-backend php artisan migrate
```

Expected: migration runs without error.

- [ ] **Step 4: Commit**

```bash
git add backend/database/migrations/2026_06_07_000006_retarget_adjusting_entry_lines_subtype.php backend/app/Models/AdjustingEntryLine.php
git commit -m "feat: retarget adjusting_entry_lines.subtype_id to chart_of_account_subtypes"
```

---

### Task 4: Rewrite `ChartOfAccountsService` to seed from global CoA template

**Files:**
- Modify: `backend/app/Services/Accounting/ChartOfAccountsService.php`

**Context:**
- `seedDefaultAccounts(Company $company)` currently hardcodes old account codes (1001-5008). It must be rewritten to pull from the global `chart_of_accounts` table and `account_types`, set `chart_of_account_id` on each created account.
- `getNextCode(Company $company, string $type)` currently only handles `income` and `expense`. It must be expanded for new type values.
- Type mapping: Assets→cash, Owner's Equity→equity, Revenue / Income→income, Cost of Goods Sold→expense, Expenses→expense, Other Income→income, Other Expenses→expense
- VAT accounts (1101 Input VAT, 2101 Output VAT) remain hardcoded as `type='vat'` with `chart_of_account_id=null`
- `chart_of_accounts` has 50 entries already seeded; all will be created as company accounts
- `AccountType` and `ChartOfAccount` models are available

**Account type prefix map (for getNextCode):**
- income → 4000
- expense → 6000
- cash → 1000
- equity → 3000

- [ ] **Step 1: Write the updated service**

```php
<?php
// backend/app/Services/Accounting/ChartOfAccountsService.php

namespace App\Services\Accounting;

use App\Models\Account;
use App\Models\ChartOfAccount;
use App\Models\Company;

class ChartOfAccountsService
{
    private const COA_TYPE_TO_ACCOUNT_TYPE = [
        'Assets'             => 'cash',
        "Owner's Equity"     => 'equity',
        'Revenue / Income'   => 'income',
        'Cost of Goods Sold' => 'expense',
        'Expenses'           => 'expense',
        'Other Income'       => 'income',
        'Other Expenses'     => 'expense',
    ];

    public function seedDefaultAccounts(Company $company): void
    {
        // Seed all global CoA entries as company accounts
        $coaEntries = ChartOfAccount::with('accountType')
            ->where('is_active', true)
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

        // VAT accounts — system-managed, no CoA entry
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
```

- [ ] **Step 2: Run tests to verify no breakage**

```bash
docker exec sofia-backend php artisan test --filter=ChartOfAccountsSeederTest
```

Expected: all 11 tests pass (the seeder tests don't test `ChartOfAccountsService` directly).

- [ ] **Step 3: Commit**

```bash
git add backend/app/Services/Accounting/ChartOfAccountsService.php
git commit -m "feat: rewrite ChartOfAccountsService to seed from global CoA template"
```

---

### Task 5: Fix `DemoDataSeeder` — remove documents, use new codes

**Files:**
- Modify: `backend/database/seeders/DemoDataSeeder.php`

**Context:**
- Current DemoDataSeeder seeds: users, company, company accounts (old codes), subtypes, PARKED document, APPROVED document with journal entry
- Must keep: users (admin lookup, accountant, company, client)
- Must remove: sections 3b (SubtypeSeeder call + subtype lookups), 4 (PARKED document), 5 (APPROVED document + journal entry)
- Section 3 (company accounts): replace hardcoded old-code list with a call to `ChartOfAccountsService::seedDefaultAccounts()`; this also sets `chart_of_account_id` on each account
- Remove unused imports: `Document`, `JournalEntry`, `JournalEntryLine`, `Subtype`, `TransactionLine`

- [ ] **Step 1: Write the updated seeder**

```php
<?php
// backend/database/seeders/DemoDataSeeder.php

namespace Database\Seeders;

use App\Models\Company;
use App\Models\User;
use App\Services\Accounting\ChartOfAccountsService;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class DemoDataSeeder extends Seeder
{
    public function run(): void
    {
        // ── 1. Users ────────────────────────────────────────────────────

        $admin = User::where('role', 'admin')->firstOrFail();

        $accountant = User::firstOrCreate(
            ['email' => 'maria@sofiabooks.ph'],
            [
                'name'       => 'Maria Santos',
                'password'   => Hash::make('Accountant@2026!'),
                'role'       => 'accountant',
                'status'     => 'active',
                'mobile'     => '09990001111',
                'company_id' => null,
            ]
        );

        // ── 2. Company ──────────────────────────────────────────────────

        $company = Company::firstOrCreate(
            ['name' => 'ABC Trading Corp.'],
            [
                'mobile'         => '09990002222',
                'email'          => 'abc@trading.ph',
                'tin'            => '123-456-789-000',
                'contact_person' => 'Juan dela Cruz',
                'bir_type'       => 'vat',
                'plan'           => 'growth',
                'accountant_id'  => $accountant->id,
            ]
        );

        $client = User::firstOrCreate(
            ['email' => 'client@abctrading.ph'],
            [
                'name'       => 'ABC Trading Corp.',
                'password'   => Hash::make('Client@2026!'),
                'role'       => 'client',
                'status'     => 'active',
                'mobile'     => '09990002222',
                'username'   => 'abctrading',
                'company_id' => $company->id,
            ]
        );

        $this->command->info("Company:    {$company->name} (VAT, {$company->plan})");
        $this->command->info("Accountant: {$accountant->email} / Accountant@2026!");
        $this->command->info("Client:     {$client->email} / Client@2026!");

        // ── 3. Chart of accounts (from global template) ─────────────────

        (new ChartOfAccountsService())->seedDefaultAccounts($company);

        $this->command->info('Chart of accounts seeded from global CoA template.');
    }
}
```

- [ ] **Step 2: Run fresh migration + seed**

```bash
docker exec sofia-backend php artisan migrate:fresh --seed
```

Expected: runs to completion with no error, outputs the three info lines (Company, Accountant, Client) and "Chart of accounts seeded from global CoA template."

- [ ] **Step 3: Verify accounts were created with chart_of_account_id set**

```bash
docker exec sofia-backend php artisan tinker --execute="
\$company = \App\Models\Company::where('name', 'ABC Trading Corp.')->first();
echo 'Total accounts: ' . \App\Models\Account::where('company_id', \$company->id)->count() . PHP_EOL;
echo 'With CoA link: ' . \App\Models\Account::where('company_id', \$company->id)->whereNotNull('chart_of_account_id')->count() . PHP_EOL;
echo 'VAT accounts: ' . \App\Models\Account::where('company_id', \$company->id)->where('type', 'vat')->count() . PHP_EOL;
"
```

Expected output (company is VAT):
```
Total accounts: 52
With CoA link: 50
VAT accounts: 2
```

- [ ] **Step 4: Run the seeder tests**

```bash
docker exec sofia-backend php artisan test --filter=ChartOfAccountsSeederTest
```

Expected: all 11 pass.

- [ ] **Step 5: Commit**

```bash
git add backend/database/seeders/DemoDataSeeder.php
git commit -m "fix: DemoDataSeeder — remove document seeding, seed accounts from global CoA template"
```

---

### Task 6: Update `GLService` and `IncomeStatementService` for new type values

**Files:**
- Modify: `backend/app/Services/BIR/GLService.php`
- Modify: `backend/app/Services/Report/IncomeStatementService.php`

**Context:**

**GLService** at line 70:
```php
$normalBalance = in_array($account->type, ['cash', 'expense']) ? 'debit' : 'credit';
```
This must include `equity` → credit (already handled by fallthrough), but `cogs` accounts (mapped as `expense`) are already in the list. The only real change needed is that `equity` accounts must return `credit` (they do, via fallthrough). No code change needed for GLService unless testing reveals an issue.

Wait — actually there IS a code change needed: GLService calls `$line->transactionLine?->subtype?->name` which resolves via `TransactionLine::subtype()`. Since that relationship now points to `ChartOfAccountSubtype`, it still works — the method name is unchanged. No code change needed in GLService.

**IncomeStatementService** groups lines by `$account->type === 'income'` and `$account->type === 'expense'`. The new `equity` type accounts (3xxx Owner's Equity) are correctly excluded from income/expense reports. No code change needed.

HOWEVER — `IncomeStatementService::buildSubtypeLookup()` at line 92 uses `TransactionLine::with('subtype')`. Since `TransactionLine::subtype()` now returns `ChartOfAccountSubtype` instead of `Subtype`, the eager load still works. No code change needed.

Conclusion: both services work unchanged after the model updates in Tasks 2 and 3. The only action for this task is to verify by running the test suite.

- [ ] **Step 1: Run all tests**

```bash
docker exec sofia-backend php artisan test
```

Expected: all previously-passing tests continue to pass. The 4 GLServiceTest failures and 3 IncomeStatementServiceTest failures are pre-existing (caused by `chk_journal_source` constraint on journal_entries, unrelated to CoA work). Any NEW failures must be investigated and fixed.

- [ ] **Step 2: If GLService normal_balance breaks with equity accounts, apply this fix**

If tests or manual testing show that `equity` accounts return the wrong normal_balance, update `GLService.php` line 70:

```php
// Before:
$normalBalance = in_array($account->type, ['cash', 'expense']) ? 'debit' : 'credit';

// After (explicit — equity is credit, same as before via fallthrough, just documented):
$normalBalance = match($account->type) {
    'cash', 'expense'  => 'debit',
    'income', 'equity', 'vat' => 'credit',
    default => 'credit',
};
```

- [ ] **Step 3: Commit (only if a fix was applied in Step 2)**

```bash
git add backend/app/Services/BIR/GLService.php
git commit -m "fix: GLService normalBalance — handle equity account type explicitly"
```

---

### Task 7: Update `ChartOfAccountsController` for new type values

**Files:**
- Modify: `backend/app/Http/Controllers/Admin/ChartOfAccountsController.php`

**Context:**
- `update()` at line 71: `$type = $item['type'] ?? 'expense';` — this already defaults to `expense`, works with new types
- `getNextCode($company, $type)` is called with `$type` from the request. The new service handles `income`, `expense`, `cash`, `equity` — any unrecognized type defaults to 6000 prefix
- `index()` returns `type` as a field — if the frontend needs to display `equity` accounts, no change needed
- The `index()` response shape is unchanged; `type` is already included

The only real update needed is ensuring the `index()` response includes `chartOfAccountId` for the frontend to optionally use when building drill-down links. If the frontend doesn't use it yet, skip it.

- [ ] **Step 1: Update `index()` to include `chartOfAccountId` in the response**

In `ChartOfAccountsController::index()`, update the map to include the CoA link:

```php
// Existing line in index():
->map(fn ($a) => [
    'id'              => $a->id,
    'code'            => $a->code,
    'name'            => $a->name,
    'type'            => $a->type,
    'isActive'        => $a->is_active,
    'isSystemManaged' => $a->is_system_managed,
]);
```

Change to:

```php
->map(fn ($a) => [
    'id'                => $a->id,
    'code'              => $a->code,
    'name'              => $a->name,
    'type'              => $a->type,
    'chartOfAccountId'  => $a->chart_of_account_id,
    'isActive'          => $a->is_active,
    'isSystemManaged'   => $a->is_system_managed,
]);
```

Also update `AccountController::index()` (the client-facing endpoint at `backend/app/Http/Controllers/AccountController.php`) with the same addition.

- [ ] **Step 2: Commit**

```bash
git add backend/app/Http/Controllers/Admin/ChartOfAccountsController.php backend/app/Http/Controllers/AccountController.php
git commit -m "feat: include chartOfAccountId in accounts API responses"
```

---

### Task 8: Update frontend `Account` type and `ClientModal` grouping

**Files:**
- Modify: `frontend/src/types/admin.ts`
- Modify: `frontend/src/components/admin/ClientModal.tsx`

**Context:**
- `Account` interface in `admin.ts` currently: `type: 'income' | 'expense' | 'cash' | 'vat'`
- Must add `'equity'` to the union type
- Must add `chartOfAccountId?: string | null` field
- `ClientModal.tsx` groups accounts into 4 buckets (Income, Expense, Cash/Payment, VAT). Owner's Equity accounts (type='equity') currently have no bucket — they need to be added or excluded
- For the ClientModal UI: add an "Owner's Equity" group for `equity` type accounts

To find the exact lines in ClientModal.tsx, read the file first and locate the grouping logic.

- [ ] **Step 1: Read the frontend files to find the exact code**

Read `frontend/src/types/admin.ts` and `frontend/src/components/admin/ClientModal.tsx` to locate:
1. The `Account` interface definition
2. The type grouping logic in `ClientModal`

- [ ] **Step 2: Update `Account` interface in `admin.ts`**

Find the `Account` interface and update the `type` union and add `chartOfAccountId`:

```typescript
export interface Account {
  id: string;
  code: string;
  name: string;
  type: 'income' | 'expense' | 'cash' | 'vat' | 'equity';
  chartOfAccountId?: string | null;
  isActive: boolean;
  isSystemManaged: boolean;
}
```

- [ ] **Step 3: Update `ClientModal` grouping to include equity**

Find the section that groups accounts by type and add a bucket for `equity`. The pattern will be something like:

```typescript
const incomeAccounts  = accounts.filter(a => a.type === 'income');
const expenseAccounts = accounts.filter(a => a.type === 'expense');
const cashAccounts    = accounts.filter(a => a.type === 'cash');
const vatAccounts     = accounts.filter(a => a.type === 'vat');
```

Add:
```typescript
const equityAccounts  = accounts.filter(a => a.type === 'equity');
```

And add a corresponding UI section for equity accounts in the render. Follow the same pattern as the other groups.

- [ ] **Step 4: Build and verify no TypeScript errors**

```bash
cd frontend && npm run build
```

Expected: build succeeds with no type errors.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/types/admin.ts frontend/src/components/admin/ClientModal.tsx
git commit -m "feat: add equity type to Account interface and ClientModal grouping"
```

---

### Task 9: Final verification — run full test suite and check migration fresh

**Files:** None (verification only)

- [ ] **Step 1: Run migrate:fresh --seed**

```bash
docker exec sofia-backend php artisan migrate:fresh --seed
```

Expected: completes without error.

- [ ] **Step 2: Run full test suite**

```bash
docker exec sofia-backend php artisan test
```

Expected: all previously-passing tests continue to pass. Known pre-existing failures (GLServiceTest ×4, IncomeStatementServiceTest ×3) are acceptable if they remain unchanged from before this work.

- [ ] **Step 3: Spot-check via tinker — verify the full chain works**

```bash
docker exec sofia-backend php artisan tinker --execute="
\$company = \App\Models\Company::where('name', 'ABC Trading Corp.')->first();
\$acc = \App\Models\Account::where('company_id', \$company->id)->whereNotNull('chart_of_account_id')->first();
echo 'Account: ' . \$acc->code . ' ' . \$acc->name . PHP_EOL;
echo 'Type: ' . \$acc->type . PHP_EOL;
echo 'CoA name: ' . \$acc->chartOfAccount->name . PHP_EOL;
echo 'Account type: ' . \$acc->chartOfAccount->accountType->name . PHP_EOL;
"
```

Expected: prints a valid account with a linked CoA entry and its account type name.

- [ ] **Step 4: Verify subtype FK is correct**

```bash
docker exec sofia-backend php artisan tinker --execute="
\$fk = \Illuminate\Support\Facades\DB::select(\"
    SELECT tc.table_name, kcu.column_name, ccu.table_name AS foreign_table
    FROM information_schema.table_constraints AS tc
    JOIN information_schema.key_column_usage AS kcu ON tc.constraint_name = kcu.constraint_name
    JOIN information_schema.constraint_column_usage AS ccu ON ccu.constraint_name = tc.constraint_name
    WHERE tc.constraint_type = 'FOREIGN KEY'
    AND kcu.column_name = 'subtype_id'
    AND tc.table_name IN ('transaction_lines', 'adjusting_entry_lines')
\");
foreach(\$fk as \$row) { echo \$row->table_name . '.subtype_id → ' . \$row->foreign_table . PHP_EOL; }
"
```

Expected:
```
transaction_lines.subtype_id → chart_of_account_subtypes
adjusting_entry_lines.subtype_id → chart_of_account_subtypes
```
