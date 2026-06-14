# VAT Report Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build BIR-compliant VAT reports (2550M, 2550Q, SLS, SLP) as downloadable PDFs for VAT-registered clients, with a new merchant table auto-populated by AI during receipt classification.

**Architecture:** A `merchants` table (per company) stores supplier/buyer details extracted by AI during `ClassifyWithAI`; documents get a `merchant_id` FK. `VatReportService` queries journal entry lines on accounts 1101/2101 and documents directly. A `VatReportController` exposes four PDF endpoints, rendered via Blade templates and existing `PDFExportService`. The frontend adds a VAT report page (shared component, three role-specific wrappers) and a card on each role's report index.

**Tech Stack:** Laravel 11 (PHP 8.3), PHPUnit, Eloquent, DomPDF (Barryvdh), Next.js 14 App Router, TypeScript, TanStack Query.

---

## File Map

**Backend — create:**
- `database/migrations/2026_06_14_000001_create_merchants_table.php`
- `database/migrations/2026_06_14_000002_add_merchant_id_to_documents_table.php`
- `app/Models/Merchant.php`
- `database/factories/MerchantFactory.php`
- `app/Services/Merchant/MerchantResolverService.php`
- `app/Services/Report/VatReportService.php`
- `app/Http/Controllers/VatReportController.php`
- `resources/views/reports/vat/2550m.blade.php`
- `resources/views/reports/vat/2550q.blade.php`
- `resources/views/reports/vat/sls.blade.php`
- `resources/views/reports/vat/slp.blade.php`
- `tests/Feature/MerchantResolverServiceTest.php`
- `tests/Feature/VatReportServiceTest.php`
- `tests/Feature/VatReportControllerTest.php`

**Backend — modify:**
- `app/Models/Document.php` — add `merchant_id` to `$fillable`, add `merchant()` relationship
- `app/Services/AI/TransactionClassifier.php` — add `merchant_tin` to tool schema
- `app/Jobs/ClassifyWithAI.php` — call `MerchantResolverService` after OCR extraction
- `routes/api.php` — add 4 VAT PDF routes

**Frontend — create:**
- `src/components/reports/VatReportContent.tsx`
- `src/app/client/reports/vat/page.tsx`
- `src/app/accountant/reports/[clientId]/vat/page.tsx`
- `src/app/admin/reports/[clientId]/vat/page.tsx`

**Frontend — modify:**
- `src/lib/api/reports.ts` — add `downloadVatPdf()`
- `src/types/report.ts` — add VAT types
- `src/app/client/reports/page.tsx` — add VAT Report card
- `src/app/accountant/reports/page.tsx` — add VAT Report card
- `src/app/admin/reports/page.tsx` — add VAT Report card

---

## Task 1: Merchant table, model, and factory

**Files:**
- Create: `backend/database/migrations/2026_06_14_000001_create_merchants_table.php`
- Create: `backend/database/migrations/2026_06_14_000002_add_merchant_id_to_documents_table.php`
- Create: `backend/app/Models/Merchant.php`
- Create: `backend/database/factories/MerchantFactory.php`
- Modify: `backend/app/Models/Document.php`

- [ ] **Step 1: Create merchants migration**

Create `backend/database/migrations/2026_06_14_000001_create_merchants_table.php`:

```php
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('merchants', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('company_id')->references('id')->on('companies')->cascadeOnDelete();
            $table->string('name')->nullable();
            $table->string('tin')->nullable();
            $table->string('address')->nullable();
            $table->timestamps();

            $table->index('company_id');
            $table->index('tin');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('merchants');
    }
};
```

- [ ] **Step 2: Create add_merchant_id_to_documents migration**

Create `backend/database/migrations/2026_06_14_000002_add_merchant_id_to_documents_table.php`:

```php
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('documents', function (Blueprint $table) {
            $table->foreignUuid('merchant_id')
                ->nullable()
                ->references('id')
                ->on('merchants')
                ->nullOnDelete()
                ->after('ref_number');
        });
    }

    public function down(): void
    {
        Schema::table('documents', function (Blueprint $table) {
            $table->dropForeign(['merchant_id']);
            $table->dropColumn('merchant_id');
        });
    }
};
```

- [ ] **Step 3: Run migrations**

```bash
cd backend && php artisan migrate
```

Expected: two new migrations run without error.

- [ ] **Step 4: Create Merchant model**

Create `backend/app/Models/Merchant.php`:

```php
<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Merchant extends Model
{
    use HasUuids, HasFactory;

    protected $fillable = ['company_id', 'name', 'tin', 'address'];

    public function company(): BelongsTo
    {
        return $this->belongsTo(Company::class);
    }

    public function documents(): HasMany
    {
        return $this->hasMany(Document::class);
    }
}
```

- [ ] **Step 5: Create MerchantFactory**

Create `backend/database/factories/MerchantFactory.php`:

```php
<?php

namespace Database\Factories;

use App\Models\Company;
use Illuminate\Database\Eloquent\Factories\Factory;

class MerchantFactory extends Factory
{
    public function definition(): array
    {
        return [
            'company_id' => Company::factory(),
            'name'       => $this->faker->company,
            'tin'        => $this->faker->numerify('###-###-###-###'),
            'address'    => $this->faker->address,
        ];
    }
}
```

- [ ] **Step 6: Add merchant_id to Document model**

In `backend/app/Models/Document.php`, add `'merchant_id'` to the `$fillable` array (after `'ref_number'`):

```php
protected $fillable = [
    // ... existing fields ...
    'ref_number',
    'merchant_id',   // ← add this
    'amount',
    // ... rest of fields ...
];
```

Then add the relationship method after the existing relationships:

```php
public function merchant(): BelongsTo
{
    return $this->belongsTo(Merchant::class);
}
```

- [ ] **Step 7: Write tests**

Create `backend/tests/Feature/MerchantResolverServiceTest.php` with just the model assertions (resolver tests come in Task 2):

```php
<?php

namespace Tests\Feature;

use App\Models\Company;
use App\Models\Document;
use App\Models\Merchant;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class MerchantResolverServiceTest extends TestCase
{
    use RefreshDatabase;

    public function test_merchant_belongs_to_company(): void
    {
        $company  = Company::factory()->create();
        $merchant = Merchant::factory()->create(['company_id' => $company->id]);

        $this->assertEquals($company->id, $merchant->company->id);
    }

    public function test_document_belongs_to_merchant(): void
    {
        $user     = User::factory()->create();
        $company  = Company::factory()->create();
        $merchant = Merchant::factory()->create(['company_id' => $company->id]);
        $document = Document::factory()->create([
            'company_id'  => $company->id,
            'uploaded_by' => $user->id,
            'merchant_id' => $merchant->id,
        ]);

        $this->assertEquals($merchant->id, $document->merchant->id);
    }
}
```

- [ ] **Step 8: Run tests**

```bash
cd backend && php artisan test tests/Feature/MerchantResolverServiceTest.php
```

Expected: 2 tests pass.

- [ ] **Step 9: Commit**

```bash
git add backend/database/migrations/2026_06_14_000001_create_merchants_table.php \
        backend/database/migrations/2026_06_14_000002_add_merchant_id_to_documents_table.php \
        backend/app/Models/Merchant.php \
        backend/database/factories/MerchantFactory.php \
        backend/app/Models/Document.php \
        backend/tests/Feature/MerchantResolverServiceTest.php
git commit -m "feat: add merchants table, model, factory, and document relationship"
```

---

## Task 2: MerchantResolverService

**Files:**
- Create: `backend/app/Services/Merchant/MerchantResolverService.php`
- Modify: `backend/tests/Feature/MerchantResolverServiceTest.php`

- [ ] **Step 1: Write the failing resolver tests**

Replace the contents of `backend/tests/Feature/MerchantResolverServiceTest.php` with:

```php
<?php

namespace Tests\Feature;

use App\Models\Company;
use App\Models\Document;
use App\Models\Merchant;
use App\Models\User;
use App\Services\Merchant\MerchantResolverService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class MerchantResolverServiceTest extends TestCase
{
    use RefreshDatabase;

    private MerchantResolverService $service;
    private Company $company;

    protected function setUp(): void
    {
        parent::setUp();
        $this->service = new MerchantResolverService();
        $this->company = Company::factory()->create();
    }

    public function test_returns_null_when_both_name_and_tin_are_null(): void
    {
        $result = $this->service->resolve($this->company->id, null, null);

        $this->assertNull($result);
        $this->assertDatabaseCount('merchants', 0);
    }

    public function test_finds_existing_merchant_by_tin(): void
    {
        $existing = Merchant::factory()->create([
            'company_id' => $this->company->id,
            'tin'        => '123-456-789-000',
            'name'       => 'Old Name',
        ]);

        $result = $this->service->resolve($this->company->id, 'Different Name', '123-456-789-000');

        $this->assertEquals($existing->id, $result->id);
        $this->assertDatabaseCount('merchants', 1);
    }

    public function test_tin_lookup_is_scoped_to_company(): void
    {
        $otherCompany = Company::factory()->create();
        Merchant::factory()->create([
            'company_id' => $otherCompany->id,
            'tin'        => '999-888-777-000',
        ]);

        $result = $this->service->resolve($this->company->id, 'My Supplier', '999-888-777-000');

        $this->assertNotNull($result);
        $this->assertEquals($this->company->id, $result->company_id);
        $this->assertDatabaseCount('merchants', 2);
    }

    public function test_finds_existing_merchant_by_name_case_insensitive(): void
    {
        $existing = Merchant::factory()->create([
            'company_id' => $this->company->id,
            'name'       => 'Jollibee',
            'tin'        => null,
        ]);

        $result = $this->service->resolve($this->company->id, 'JOLLIBEE', null);

        $this->assertEquals($existing->id, $result->id);
        $this->assertDatabaseCount('merchants', 1);
    }

    public function test_creates_new_merchant_when_no_match(): void
    {
        $result = $this->service->resolve($this->company->id, 'New Supplier', '111-222-333-000');

        $this->assertNotNull($result);
        $this->assertEquals('New Supplier', $result->name);
        $this->assertEquals('111-222-333-000', $result->tin);
        $this->assertEquals($this->company->id, $result->company_id);
        $this->assertDatabaseCount('merchants', 1);
    }

    public function test_tin_takes_precedence_over_name_for_lookup(): void
    {
        $byTin = Merchant::factory()->create([
            'company_id' => $this->company->id,
            'tin'        => '111-000-000-000',
            'name'       => 'TIN Match',
        ]);
        Merchant::factory()->create([
            'company_id' => $this->company->id,
            'tin'        => null,
            'name'       => 'Name Match',
        ]);

        $result = $this->service->resolve($this->company->id, 'Name Match', '111-000-000-000');

        $this->assertEquals($byTin->id, $result->id);
    }

    public function test_merchant_belongs_to_company(): void
    {
        $company  = Company::factory()->create();
        $merchant = Merchant::factory()->create(['company_id' => $company->id]);

        $this->assertEquals($company->id, $merchant->company->id);
    }

    public function test_document_belongs_to_merchant(): void
    {
        $user     = User::factory()->create();
        $merchant = Merchant::factory()->create(['company_id' => $this->company->id]);
        $document = Document::factory()->create([
            'company_id'  => $this->company->id,
            'uploaded_by' => $user->id,
            'merchant_id' => $merchant->id,
        ]);

        $this->assertEquals($merchant->id, $document->merchant->id);
    }
}
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
cd backend && php artisan test tests/Feature/MerchantResolverServiceTest.php
```

Expected: FAIL — `MerchantResolverService` class not found.

- [ ] **Step 3: Create MerchantResolverService**

Create `backend/app/Services/Merchant/MerchantResolverService.php`:

```php
<?php

namespace App\Services\Merchant;

use App\Models\Merchant;

class MerchantResolverService
{
    public function resolve(string $companyId, ?string $name, ?string $tin): ?Merchant
    {
        if (!$name && !$tin) {
            return null;
        }

        if ($tin) {
            $merchant = Merchant::where('company_id', $companyId)
                ->where('tin', $tin)
                ->first();
            if ($merchant) {
                return $merchant;
            }
        }

        if ($name) {
            $merchant = Merchant::where('company_id', $companyId)
                ->whereRaw('LOWER(name) = ?', [strtolower($name)])
                ->first();
            if ($merchant) {
                return $merchant;
            }
        }

        return Merchant::create([
            'company_id' => $companyId,
            'name'       => $name,
            'tin'        => $tin,
        ]);
    }
}
```

- [ ] **Step 4: Run tests**

```bash
cd backend && php artisan test tests/Feature/MerchantResolverServiceTest.php
```

Expected: 7 tests pass.

- [ ] **Step 5: Commit**

```bash
git add backend/app/Services/Merchant/MerchantResolverService.php \
        backend/tests/Feature/MerchantResolverServiceTest.php
git commit -m "feat: add MerchantResolverService with TIN/name lookup and auto-create"
```

---

## Task 3: Wire merchants into AI pipeline

**Files:**
- Modify: `backend/app/Services/AI/TransactionClassifier.php`
- Modify: `backend/app/Jobs/ClassifyWithAI.php`

- [ ] **Step 1: Add merchant_tin to TransactionClassifier tool schema**

In `backend/app/Services/AI/TransactionClassifier.php`, find the `buildTool()` method's `document.properties` array. It currently has:

```php
'merchant' => ['type' => ['string', 'null'],
                'description' => 'Business or store name, or null'],
```

Add `merchant_tin` immediately after `merchant`:

```php
'merchant'     => ['type' => ['string', 'null'],
                    'description' => 'Business or store name, or null'],
'merchant_tin' => ['type' => ['string', 'null'],
                    'description' => 'TIN number of the merchant/seller visible on the receipt (e.g. 123-456-789-000), or null if not shown'],
```

- [ ] **Step 2: Wire MerchantResolverService in ClassifyWithAI**

In `backend/app/Jobs/ClassifyWithAI.php`, add the import at the top with the other `use` statements:

```php
use App\Services\Merchant\MerchantResolverService;
```

Then find this existing block in the `handle()` method:

```php
// Apply cleaned fields from Claude (OCR path only)
if (!$this->document->is_no_receipt && !empty($classification['document'])) {
    $doc = $classification['document'];
    $this->document->merchant_name = $doc['merchant']     ?? $this->document->merchant_name;
    $this->document->document_date = $doc['date']         ?? $this->document->document_date;
    $this->document->vat_amount    = $doc['vat_amount']   ?? $this->document->vat_amount;

    if (!empty($doc['payment_method'])) {
        $this->document->payment_method = $doc['payment_method'];
    }

    if (empty($this->document->ref_number) && !empty($doc['or_number'])) {
        $this->document->ref_number = $doc['or_number'];
    }
    if (!empty($doc['total_amount'])) {
        $this->document->amount = $doc['total_amount'];
    }
}
```

Replace it with:

```php
// Apply cleaned fields from Claude (OCR path only)
if (!$this->document->is_no_receipt && !empty($classification['document'])) {
    $doc = $classification['document'];
    $this->document->merchant_name = $doc['merchant']     ?? $this->document->merchant_name;
    $this->document->document_date = $doc['date']         ?? $this->document->document_date;
    $this->document->vat_amount    = $doc['vat_amount']   ?? $this->document->vat_amount;

    if (!empty($doc['payment_method'])) {
        $this->document->payment_method = $doc['payment_method'];
    }

    if (empty($this->document->ref_number) && !empty($doc['or_number'])) {
        $this->document->ref_number = $doc['or_number'];
    }
    if (!empty($doc['total_amount'])) {
        $this->document->amount = $doc['total_amount'];
    }

    $merchant = (new MerchantResolverService())->resolve(
        $this->document->company_id,
        $this->document->merchant_name,
        $doc['merchant_tin'] ?? null,
    );
    if ($merchant) {
        $this->document->merchant_id = $merchant->id;
    }
}
```

- [ ] **Step 3: Run full test suite to check for regressions**

```bash
cd backend && php artisan test
```

Expected: all existing tests pass. Look especially for `TransactionClassifierTest` and `AnomalyDetectorTest`.

- [ ] **Step 4: Commit**

```bash
git add backend/app/Services/AI/TransactionClassifier.php \
        backend/app/Jobs/ClassifyWithAI.php
git commit -m "feat: extract merchant_tin from AI and link merchant to document"
```

---

## Task 4: VatReportService — summary methods (2550M and 2550Q)

**Files:**
- Create: `backend/app/Services/Report/VatReportService.php`
- Create: `backend/tests/Feature/VatReportServiceTest.php`

- [ ] **Step 1: Write failing tests for monthly()**

Create `backend/tests/Feature/VatReportServiceTest.php`:

```php
<?php

namespace Tests\Feature;

use App\Models\Account;
use App\Models\Company;
use App\Models\Document;
use App\Models\JournalEntry;
use App\Models\JournalEntryLine;
use App\Models\User;
use App\Services\Report\VatReportService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class VatReportServiceTest extends TestCase
{
    use RefreshDatabase;

    private VatReportService $service;
    private Company $company;
    private Account $outputVatAccount;
    private Account $inputVatAccount;

    protected function setUp(): void
    {
        parent::setUp();
        $this->service = new VatReportService();
        $this->company = Company::factory()->create(['bir_type' => 'vat']);

        $this->outputVatAccount = Account::factory()->create([
            'company_id' => $this->company->id,
            'code'       => '2101',
            'name'       => 'Output VAT',
            'type'       => 'liability',
        ]);
        $this->inputVatAccount = Account::factory()->create([
            'company_id' => $this->company->id,
            'code'       => '1101',
            'name'       => 'Input VAT',
            'type'       => 'asset',
        ]);
    }

    private function seedJournalEntry(string $date, float $outputVat, float $inputVat): void
    {
        $je = JournalEntry::create([
            'company_id'  => $this->company->id,
            'ref_number'  => 'TEST-' . uniqid(),
            'entry_date'  => $date,
            'description' => 'Test VAT entry',
            'status'      => 'posted',
        ]);

        if ($outputVat > 0) {
            JournalEntryLine::create([
                'journal_entry_id' => $je->id,
                'account_id'       => $this->outputVatAccount->id,
                'credit'           => $outputVat,
                'debit'            => null,
            ]);
        }

        if ($inputVat > 0) {
            JournalEntryLine::create([
                'journal_entry_id' => $je->id,
                'account_id'       => $this->inputVatAccount->id,
                'debit'            => $inputVat,
                'credit'           => null,
            ]);
        }
    }

    private function seedDocument(string $date, string $type, float $amount, float $vatAmount): void
    {
        $uploader = User::factory()->create();
        Document::factory()->create([
            'company_id'    => $this->company->id,
            'uploaded_by'   => $uploader->id,
            'status'        => 'posted',
            'document_type' => $type,
            'document_date' => $date,
            'amount'        => $amount,
            'vat_amount'    => $vatAmount,
        ]);
    }

    // ── monthly() ──────────────────────────────────────────────────────────────

    public function test_monthly_returns_zeroes_with_no_data(): void
    {
        $result = $this->service->monthly($this->company, 1, 2026);

        $this->assertEquals(0.0, $result['taxable_sales']);
        $this->assertEquals(0.0, $result['output_vat']);
        $this->assertEquals(0.0, $result['taxable_purchases']);
        $this->assertEquals(0.0, $result['input_vat']);
        $this->assertEquals(0.0, $result['net_vat_payable']);
    }

    public function test_monthly_aggregates_output_and_input_vat(): void
    {
        $this->seedJournalEntry('2026-01-15', outputVat: 1200.0, inputVat: 600.0);
        $this->seedDocument('2026-01-15', 'income',  11200.0, 1200.0);
        $this->seedDocument('2026-01-15', 'expense',  5600.0,  600.0);

        $result = $this->service->monthly($this->company, 1, 2026);

        $this->assertEquals(1200.0, $result['output_vat']);
        $this->assertEquals(600.0,  $result['input_vat']);
        $this->assertEquals(10000.0, $result['taxable_sales']);      // 11200 - 1200
        $this->assertEquals(5000.0,  $result['taxable_purchases']);   //  5600 -  600
        $this->assertEquals(600.0,   $result['net_vat_payable']);     // 1200 - 600
    }

    public function test_monthly_excludes_other_months(): void
    {
        $this->seedJournalEntry('2026-02-01', outputVat: 500.0, inputVat: 0.0);
        $this->seedDocument('2026-02-01', 'income', 5600.0, 500.0);

        $result = $this->service->monthly($this->company, 1, 2026);

        $this->assertEquals(0.0, $result['output_vat']);
        $this->assertEquals(0.0, $result['taxable_sales']);
    }

    public function test_monthly_excludes_other_companies(): void
    {
        $otherCompany       = Company::factory()->create(['bir_type' => 'vat']);
        $otherOutputAccount = Account::factory()->create([
            'company_id' => $otherCompany->id,
            'code'       => '2101',
        ]);
        $je = JournalEntry::create([
            'company_id'  => $otherCompany->id,
            'ref_number'  => 'OTHER-001',
            'entry_date'  => '2026-01-10',
            'description' => 'Other company',
            'status'      => 'posted',
        ]);
        JournalEntryLine::create([
            'journal_entry_id' => $je->id,
            'account_id'       => $otherOutputAccount->id,
            'credit'           => 9999.0,
            'debit'            => null,
        ]);

        $result = $this->service->monthly($this->company, 1, 2026);

        $this->assertEquals(0.0, $result['output_vat']);
    }

    // ── quarterly() ────────────────────────────────────────────────────────────

    public function test_quarterly_sums_three_months(): void
    {
        $this->seedJournalEntry('2026-01-10', outputVat: 100.0, inputVat: 50.0);
        $this->seedJournalEntry('2026-02-10', outputVat: 200.0, inputVat: 80.0);
        $this->seedJournalEntry('2026-03-10', outputVat: 300.0, inputVat: 120.0);

        $result = $this->service->quarterly($this->company, 1, 2026);

        $this->assertCount(3, $result['months']);
        $this->assertEquals(600.0, $result['totals']['output_vat']);
        $this->assertEquals(250.0, $result['totals']['input_vat']);
        $this->assertEquals(350.0, $result['totals']['net_vat_payable']);
    }

    public function test_quarterly_months_have_correct_labels(): void
    {
        $result = $this->service->quarterly($this->company, 2, 2026);

        $this->assertEquals('April 2026',  $result['months'][0]['label']);
        $this->assertEquals('May 2026',    $result['months'][1]['label']);
        $this->assertEquals('June 2026',   $result['months'][2]['label']);
    }
}
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
cd backend && php artisan test tests/Feature/VatReportServiceTest.php
```

Expected: FAIL — `VatReportService` class not found.

- [ ] **Step 3: Create VatReportService with monthly() and quarterly()**

Create `backend/app/Services/Report/VatReportService.php`:

```php
<?php

namespace App\Services\Report;

use App\Models\Company;
use Carbon\Carbon;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

class VatReportService
{
    public function monthly(Company $company, int $month, int $year): array
    {
        $start = Carbon::create($year, $month, 1)->startOfDay();
        $end   = $start->copy()->endOfMonth()->endOfDay();

        return array_merge(
            ['month' => $month, 'year' => $year, 'period_label' => $start->format('F Y')],
            $this->buildSummary($company, $start, $end)
        );
    }

    public function quarterly(Company $company, int $quarter, int $year): array
    {
        $startMonth = ($quarter - 1) * 3 + 1;
        $months     = [];

        for ($m = $startMonth; $m < $startMonth + 3; $m++) {
            $start     = Carbon::create($year, $m, 1)->startOfDay();
            $end       = $start->copy()->endOfMonth()->endOfDay();
            $summary   = $this->buildSummary($company, $start, $end);
            $months[]  = array_merge(['month' => $m, 'label' => $start->format('F Y')], $summary);
        }

        $col = collect($months);

        return [
            'quarter' => $quarter,
            'year'    => $year,
            'months'  => $months,
            'totals'  => [
                'taxable_sales'     => $col->sum('taxable_sales'),
                'output_vat'        => $col->sum('output_vat'),
                'taxable_purchases' => $col->sum('taxable_purchases'),
                'input_vat'         => $col->sum('input_vat'),
                'net_vat_payable'   => $col->sum('net_vat_payable'),
            ],
        ];
    }

    public function salesList(Company $company, int $quarter, int $year): array
    {
        [$start, $end] = $this->quarterBounds($quarter, $year);

        $rows = DB::table('documents')
            ->leftJoin('merchants', 'merchants.id', '=', 'documents.merchant_id')
            ->where('documents.company_id', $company->id)
            ->where('documents.status', 'posted')
            ->where('documents.document_type', 'income')
            ->whereBetween('documents.document_date', [$start->toDateString(), $end->toDateString()])
            ->orderBy('documents.document_date')
            ->select([
                'documents.document_date',
                'documents.ref_number',
                'merchants.name as merchant_name',
                'merchants.tin as merchant_tin',
                'documents.amount',
                'documents.vat_amount',
            ])
            ->get()
            ->map(fn($row) => [
                'date'           => $row->document_date,
                'ref_number'     => $row->ref_number,
                'buyer_name'     => $row->merchant_name,
                'buyer_tin'      => $row->merchant_tin,
                'taxable_amount' => (float) $row->amount - (float) ($row->vat_amount ?? 0),
                'vat_amount'     => (float) ($row->vat_amount ?? 0),
                'total_amount'   => (float) $row->amount,
            ]);

        return [
            'quarter' => $quarter,
            'year'    => $year,
            'rows'    => $rows,
            'totals'  => [
                'taxable_amount' => $rows->sum('taxable_amount'),
                'vat_amount'     => $rows->sum('vat_amount'),
                'total_amount'   => $rows->sum('total_amount'),
            ],
        ];
    }

    public function purchasesList(Company $company, int $quarter, int $year): array
    {
        [$start, $end] = $this->quarterBounds($quarter, $year);

        $rows = DB::table('documents')
            ->leftJoin('merchants', 'merchants.id', '=', 'documents.merchant_id')
            ->where('documents.company_id', $company->id)
            ->where('documents.status', 'posted')
            ->where('documents.document_type', 'expense')
            ->whereBetween('documents.document_date', [$start->toDateString(), $end->toDateString()])
            ->orderBy('documents.document_date')
            ->select([
                'documents.document_date',
                'documents.ref_number',
                'merchants.name as merchant_name',
                'merchants.tin as merchant_tin',
                'documents.amount',
                'documents.vat_amount',
            ])
            ->get()
            ->map(fn($row) => [
                'date'           => $row->document_date,
                'ref_number'     => $row->ref_number,
                'supplier_name'  => $row->merchant_name,
                'supplier_tin'   => $row->merchant_tin,
                'taxable_amount' => (float) $row->amount - (float) ($row->vat_amount ?? 0),
                'input_vat'      => (float) ($row->vat_amount ?? 0),
                'total_amount'   => (float) $row->amount,
            ]);

        return [
            'quarter' => $quarter,
            'year'    => $year,
            'rows'    => $rows,
            'totals'  => [
                'taxable_amount' => $rows->sum('taxable_amount'),
                'input_vat'      => $rows->sum('input_vat'),
                'total_amount'   => $rows->sum('total_amount'),
            ],
        ];
    }

    private function buildSummary(Company $company, Carbon $start, Carbon $end): array
    {
        $outputVat = (float) DB::table('journal_entry_lines')
            ->join('journal_entries', 'journal_entries.id', '=', 'journal_entry_lines.journal_entry_id')
            ->join('accounts', 'accounts.id', '=', 'journal_entry_lines.account_id')
            ->where('journal_entries.company_id', $company->id)
            ->where('journal_entries.status', 'posted')
            ->where('accounts.code', '2101')
            ->whereBetween('journal_entries.entry_date', [$start, $end])
            ->sum('journal_entry_lines.credit');

        $inputVat = (float) DB::table('journal_entry_lines')
            ->join('journal_entries', 'journal_entries.id', '=', 'journal_entry_lines.journal_entry_id')
            ->join('accounts', 'accounts.id', '=', 'journal_entry_lines.account_id')
            ->where('journal_entries.company_id', $company->id)
            ->where('journal_entries.status', 'posted')
            ->where('accounts.code', '1101')
            ->whereBetween('journal_entries.entry_date', [$start, $end])
            ->sum('journal_entry_lines.debit');

        $taxableSales = (float) DB::table('documents')
            ->where('company_id', $company->id)
            ->where('status', 'posted')
            ->where('document_type', 'income')
            ->whereBetween('document_date', [$start->toDateString(), $end->toDateString()])
            ->selectRaw('COALESCE(SUM(amount - COALESCE(vat_amount, 0)), 0) as total')
            ->value('total');

        $taxablePurchases = (float) DB::table('documents')
            ->where('company_id', $company->id)
            ->where('status', 'posted')
            ->where('document_type', 'expense')
            ->whereBetween('document_date', [$start->toDateString(), $end->toDateString()])
            ->selectRaw('COALESCE(SUM(amount - COALESCE(vat_amount, 0)), 0) as total')
            ->value('total');

        return [
            'taxable_sales'     => $taxableSales,
            'output_vat'        => $outputVat,
            'taxable_purchases' => $taxablePurchases,
            'input_vat'         => $inputVat,
            'net_vat_payable'   => $outputVat - $inputVat,
        ];
    }

    private function quarterBounds(int $quarter, int $year): array
    {
        $startMonth = ($quarter - 1) * 3 + 1;
        $endMonth   = $startMonth + 2;
        $start      = Carbon::create($year, $startMonth, 1)->startOfDay();
        $end        = Carbon::create($year, $endMonth, 1)->endOfMonth()->endOfDay();

        return [$start, $end];
    }
}
```

- [ ] **Step 4: Run tests**

```bash
cd backend && php artisan test tests/Feature/VatReportServiceTest.php
```

Expected: all tests pass.

- [ ] **Step 5: Commit**

```bash
git add backend/app/Services/Report/VatReportService.php \
        backend/tests/Feature/VatReportServiceTest.php
git commit -m "feat: add VatReportService with monthly, quarterly, salesList, purchasesList"
```

---

## Task 5: VatReportController and routes

**Files:**
- Create: `backend/app/Http/Controllers/VatReportController.php`
- Create: `backend/tests/Feature/VatReportControllerTest.php`
- Modify: `backend/routes/api.php`

- [ ] **Step 1: Write failing HTTP tests**

Create `backend/tests/Feature/VatReportControllerTest.php`:

```php
<?php

namespace Tests\Feature;

use App\Models\Account;
use App\Models\Company;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class VatReportControllerTest extends TestCase
{
    use RefreshDatabase;

    private User $accountant;
    private Company $vatCompany;

    protected function setUp(): void
    {
        parent::setUp();
        $this->accountant = User::factory()->create(['role' => 'accountant']);
        $this->vatCompany = Company::factory()->create([
            'accountant_id' => $this->accountant->id,
            'bir_type'      => 'vat',
        ]);

        // Seed VAT accounts so JE queries don't fail on missing accounts
        Account::factory()->create(['company_id' => $this->vatCompany->id, 'code' => '2101', 'type' => 'liability']);
        Account::factory()->create(['company_id' => $this->vatCompany->id, 'code' => '1101', 'type' => 'asset']);
    }

    public function test_monthly_pdf_returns_pdf_for_vat_company(): void
    {
        $this->actingAs($this->accountant)
            ->get("/api/reports/vat/2550m/pdf?clientId={$this->vatCompany->id}&month=1&year=2026")
            ->assertOk()
            ->assertHeader('content-type', 'application/pdf');
    }

    public function test_quarterly_pdf_returns_pdf(): void
    {
        $this->actingAs($this->accountant)
            ->get("/api/reports/vat/2550q/pdf?clientId={$this->vatCompany->id}&quarter=1&year=2026")
            ->assertOk()
            ->assertHeader('content-type', 'application/pdf');
    }

    public function test_sls_pdf_returns_pdf(): void
    {
        $this->actingAs($this->accountant)
            ->get("/api/reports/vat/sls/pdf?clientId={$this->vatCompany->id}&quarter=1&year=2026")
            ->assertOk()
            ->assertHeader('content-type', 'application/pdf');
    }

    public function test_slp_pdf_returns_pdf(): void
    {
        $this->actingAs($this->accountant)
            ->get("/api/reports/vat/slp/pdf?clientId={$this->vatCompany->id}&quarter=1&year=2026")
            ->assertOk()
            ->assertHeader('content-type', 'application/pdf');
    }

    public function test_returns_422_for_non_vat_company(): void
    {
        $nonVatCompany = Company::factory()->create([
            'accountant_id' => $this->accountant->id,
            'bir_type'      => 'non_vat',
        ]);

        $this->actingAs($this->accountant)
            ->get("/api/reports/vat/2550m/pdf?clientId={$nonVatCompany->id}&month=1&year=2026")
            ->assertStatus(422);
    }

    public function test_accountant_cannot_access_other_companys_report(): void
    {
        $otherCompany = Company::factory()->create(['bir_type' => 'vat']);

        $this->actingAs($this->accountant)
            ->get("/api/reports/vat/2550m/pdf?clientId={$otherCompany->id}&month=1&year=2026")
            ->assertForbidden();
    }

    public function test_client_user_can_access_own_report(): void
    {
        $clientUser = User::factory()->create([
            'role'       => 'client',
            'company_id' => $this->vatCompany->id,
        ]);

        $this->actingAs($clientUser)
            ->get("/api/reports/vat/2550m/pdf?month=1&year=2026")
            ->assertOk()
            ->assertHeader('content-type', 'application/pdf');
    }
}
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
cd backend && php artisan test tests/Feature/VatReportControllerTest.php
```

Expected: FAIL — routes not found (404).

- [ ] **Step 3: Create VatReportController**

Create `backend/app/Http/Controllers/VatReportController.php`:

```php
<?php

namespace App\Http\Controllers;

use App\Models\Company;
use App\Services\Report\PDFExportService;
use App\Services\Report\VatReportService;
use Illuminate\Http\Request;
use Illuminate\Http\Response;

class VatReportController extends Controller
{
    private function resolveCompany(Request $request): Company
    {
        $user = auth()->user();

        if ($user->role === 'client') {
            return Company::findOrFail($user->company_id);
        }

        $company = Company::findOrFail($request->clientId);

        if ($user->role === 'accountant' && $company->accountant_id !== $user->id) {
            abort(403, 'Forbidden.');
        }

        return $company;
    }

    private function guardVat(Company $company): void
    {
        if ($company->bir_type !== 'vat') {
            abort(422, 'This client is not VAT-registered.');
        }
    }

    private function pdf(string $view, array $data, string $filename): Response
    {
        return (new PDFExportService())->exportReport($view, $data, $filename);
    }

    public function monthly2550mPdf(Request $request): Response
    {
        $company = $this->resolveCompany($request);
        $this->guardVat($company);

        $month = (int) $request->input('month', now()->month);
        $year  = (int) $request->input('year',  now()->year);
        $data  = (new VatReportService())->monthly($company, $month, $year);

        return $this->pdf(
            'reports.vat.2550m',
            array_merge($data, ['company' => $company]),
            "{$company->name}-2550m-{$year}-{$month}"
        );
    }

    public function quarterly2550qPdf(Request $request): Response
    {
        $company = $this->resolveCompany($request);
        $this->guardVat($company);

        $quarter = (int) $request->input('quarter', (int) ceil(now()->month / 3));
        $year    = (int) $request->input('year', now()->year);
        $data    = (new VatReportService())->quarterly($company, $quarter, $year);

        return $this->pdf(
            'reports.vat.2550q',
            array_merge($data, ['company' => $company]),
            "{$company->name}-2550q-{$year}-Q{$quarter}"
        );
    }

    public function slsPdf(Request $request): Response
    {
        $company = $this->resolveCompany($request);
        $this->guardVat($company);

        $quarter = (int) $request->input('quarter', (int) ceil(now()->month / 3));
        $year    = (int) $request->input('year', now()->year);
        $data    = (new VatReportService())->salesList($company, $quarter, $year);

        return $this->pdf(
            'reports.vat.sls',
            array_merge($data, ['company' => $company]),
            "{$company->name}-sls-{$year}-Q{$quarter}"
        );
    }

    public function slpPdf(Request $request): Response
    {
        $company = $this->resolveCompany($request);
        $this->guardVat($company);

        $quarter = (int) $request->input('quarter', (int) ceil(now()->month / 3));
        $year    = (int) $request->input('year', now()->year);
        $data    = (new VatReportService())->purchasesList($company, $quarter, $year);

        return $this->pdf(
            'reports.vat.slp',
            array_merge($data, ['company' => $company]),
            "{$company->name}-slp-{$year}-Q{$quarter}"
        );
    }
}
```

- [ ] **Step 4: Register routes in api.php**

In `backend/routes/api.php`, find the existing report routes block:

```php
Route::get('/reports/income-statement',      [ReportController::class, 'incomeStatement']);
Route::get('/reports/expense-breakdown',     [ReportController::class, 'expenseBreakdown']);
Route::get('/reports/income-statement/pdf',  [ReportController::class, 'exportPDF'])->defaults('type', 'income-statement');
Route::get('/reports/expense-breakdown/pdf', [ReportController::class, 'exportPDF'])->defaults('type', 'expense-breakdown');
```

Add the VAT routes immediately after:

```php
Route::get('/reports/vat/2550m/pdf',  [VatReportController::class, 'monthly2550mPdf']);
Route::get('/reports/vat/2550q/pdf',  [VatReportController::class, 'quarterly2550qPdf']);
Route::get('/reports/vat/sls/pdf',    [VatReportController::class, 'slsPdf']);
Route::get('/reports/vat/slp/pdf',    [VatReportController::class, 'slpPdf']);
```

Also add the import at the top of the file with other controller imports:

```php
use App\Http\Controllers\VatReportController;
```

- [ ] **Step 5: Run tests — they will fail because Blade views don't exist yet**

```bash
cd backend && php artisan test tests/Feature/VatReportControllerTest.php
```

Expected: FAIL with "View [reports.vat.2550m] not found." (routes now exist, views missing).

- [ ] **Step 6: Commit controller and routes (views come in Task 6)**

```bash
git add backend/app/Http/Controllers/VatReportController.php \
        backend/routes/api.php \
        backend/tests/Feature/VatReportControllerTest.php
git commit -m "feat: add VatReportController and PDF routes for 2550M, 2550Q, SLS, SLP"
```

---

## Task 6: PDF Blade templates

**Files:**
- Create: `backend/resources/views/reports/vat/2550m.blade.php`
- Create: `backend/resources/views/reports/vat/2550q.blade.php`
- Create: `backend/resources/views/reports/vat/sls.blade.php`
- Create: `backend/resources/views/reports/vat/slp.blade.php`

- [ ] **Step 1: Create the views directory**

```bash
mkdir -p backend/resources/views/reports/vat
```

- [ ] **Step 2: Create 2550m.blade.php**

Create `backend/resources/views/reports/vat/2550m.blade.php`:

```blade
<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
    body { font-family: Arial, sans-serif; font-size: 12px; color: #333; margin: 32px; }
    h1 { font-size: 16px; margin-bottom: 2px; }
    h2 { font-size: 13px; font-weight: normal; color: #555; margin: 0 0 4px 0; }
    .meta { font-size: 11px; color: #666; margin-bottom: 20px; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 16px; }
    th { background: #f0f0f0; text-align: left; padding: 6px 8px; border-bottom: 2px solid #ccc; font-size: 11px; }
    td { padding: 5px 8px; border-bottom: 1px solid #e0e0e0; }
    .amount { text-align: right; }
    .net-row td { font-weight: bold; font-size: 13px; background: #f4f4f4; border-top: 2px solid #aaa; }
    .footer { font-size: 10px; color: #aaa; margin-top: 32px; }
</style>
</head>
<body>
<h1>{{ $company->name }}</h1>
<h2>Monthly VAT Return — BIR Form 2550M</h2>
<p class="meta">
    Period: {{ $period_label }}<br>
    @if($company->tin) TIN: {{ $company->tin }}<br> @endif
    @if($company->address) Address: {{ $company->address }} @endif
</p>

<table>
    <thead>
        <tr><th>Description</th><th class="amount">Amount (PHP)</th></tr>
    </thead>
    <tbody>
        <tr><td>Taxable Sales (Net of VAT)</td><td class="amount">{{ number_format($taxable_sales, 2) }}</td></tr>
        <tr><td>Output VAT Due (12%)</td><td class="amount">{{ number_format($output_vat, 2) }}</td></tr>
        <tr><td>Taxable Purchases (Net of VAT)</td><td class="amount">{{ number_format($taxable_purchases, 2) }}</td></tr>
        <tr><td>Input VAT Available</td><td class="amount">{{ number_format($input_vat, 2) }}</td></tr>
        <tr class="net-row">
            <td>Net VAT Payable / (Creditable)</td>
            <td class="amount">{{ number_format($net_vat_payable, 2) }}</td>
        </tr>
    </tbody>
</table>

<p class="footer">Generated: {{ now()->format('Y-m-d H:i') }} &nbsp;|&nbsp; {{ $company->name }} &nbsp;|&nbsp; Period: {{ $period_label }}</p>
</body>
</html>
```

- [ ] **Step 3: Create 2550q.blade.php**

Create `backend/resources/views/reports/vat/2550q.blade.php`:

```blade
<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
    body { font-family: Arial, sans-serif; font-size: 12px; color: #333; margin: 32px; }
    h1 { font-size: 16px; margin-bottom: 2px; }
    h2 { font-size: 13px; font-weight: normal; color: #555; margin: 0 0 4px 0; }
    .meta { font-size: 11px; color: #666; margin-bottom: 20px; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
    th { background: #f0f0f0; text-align: left; padding: 6px 8px; border-bottom: 2px solid #ccc; font-size: 11px; }
    td { padding: 5px 8px; border-bottom: 1px solid #e0e0e0; }
    .amount { text-align: right; }
    .total-row td { font-weight: bold; background: #f4f4f4; border-top: 2px solid #aaa; }
    .footer { font-size: 10px; color: #aaa; margin-top: 32px; }
</style>
</head>
<body>
<h1>{{ $company->name }}</h1>
<h2>Quarterly VAT Return — BIR Form 2550Q &nbsp;|&nbsp; Q{{ $quarter }} {{ $year }}</h2>
<p class="meta">
    @if($company->tin) TIN: {{ $company->tin }}<br> @endif
    @if($company->address) Address: {{ $company->address }} @endif
</p>

<table>
    <thead>
        <tr>
            <th>Month</th>
            <th class="amount">Taxable Sales</th>
            <th class="amount">Output VAT</th>
            <th class="amount">Taxable Purchases</th>
            <th class="amount">Input VAT</th>
            <th class="amount">Net VAT Payable</th>
        </tr>
    </thead>
    <tbody>
        @foreach($months as $m)
        <tr>
            <td>{{ $m['label'] }}</td>
            <td class="amount">{{ number_format($m['taxable_sales'], 2) }}</td>
            <td class="amount">{{ number_format($m['output_vat'], 2) }}</td>
            <td class="amount">{{ number_format($m['taxable_purchases'], 2) }}</td>
            <td class="amount">{{ number_format($m['input_vat'], 2) }}</td>
            <td class="amount">{{ number_format($m['net_vat_payable'], 2) }}</td>
        </tr>
        @endforeach
        <tr class="total-row">
            <td>Quarter Total</td>
            <td class="amount">{{ number_format($totals['taxable_sales'], 2) }}</td>
            <td class="amount">{{ number_format($totals['output_vat'], 2) }}</td>
            <td class="amount">{{ number_format($totals['taxable_purchases'], 2) }}</td>
            <td class="amount">{{ number_format($totals['input_vat'], 2) }}</td>
            <td class="amount">{{ number_format($totals['net_vat_payable'], 2) }}</td>
        </tr>
    </tbody>
</table>

<p class="footer">Generated: {{ now()->format('Y-m-d H:i') }} &nbsp;|&nbsp; {{ $company->name }} &nbsp;|&nbsp; Q{{ $quarter }} {{ $year }}</p>
</body>
</html>
```

- [ ] **Step 4: Create sls.blade.php**

Create `backend/resources/views/reports/vat/sls.blade.php`:

```blade
<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
    body { font-family: Arial, sans-serif; font-size: 11px; color: #333; margin: 32px; }
    h1 { font-size: 16px; margin-bottom: 2px; }
    h2 { font-size: 13px; font-weight: normal; color: #555; margin: 0 0 4px 0; }
    .meta { font-size: 11px; color: #666; margin-bottom: 20px; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 16px; }
    th { background: #f0f0f0; text-align: left; padding: 5px 6px; border-bottom: 2px solid #ccc; font-size: 10px; }
    td { padding: 4px 6px; border-bottom: 1px solid #e8e8e8; }
    .amount { text-align: right; }
    .total-row td { font-weight: bold; background: #f4f4f4; border-top: 2px solid #aaa; }
    .muted { color: #aaa; }
    .footer { font-size: 10px; color: #aaa; margin-top: 32px; }
</style>
</head>
<body>
<h1>{{ $company->name }}</h1>
<h2>Summary List of Sales — Q{{ $quarter }} {{ $year }}</h2>
<p class="meta">
    @if($company->tin) TIN: {{ $company->tin }}<br> @endif
    @if($company->address) Address: {{ $company->address }} @endif
</p>

<table>
    <thead>
        <tr>
            <th>Date</th>
            <th>OR / Invoice No.</th>
            <th>Buyer Name</th>
            <th>Buyer TIN</th>
            <th class="amount">Taxable Amount</th>
            <th class="amount">VAT (12%)</th>
            <th class="amount">Total</th>
        </tr>
    </thead>
    <tbody>
        @forelse($rows as $row)
        <tr>
            <td>{{ $row['date'] }}</td>
            <td>{{ $row['ref_number'] ?? '—' }}</td>
            <td>{{ $row['buyer_name'] ?? '<span class="muted">—</span>' }}</td>
            <td>{{ $row['buyer_tin'] ?? '<span class="muted">—</span>' }}</td>
            <td class="amount">{{ number_format($row['taxable_amount'], 2) }}</td>
            <td class="amount">{{ number_format($row['vat_amount'], 2) }}</td>
            <td class="amount">{{ number_format($row['total_amount'], 2) }}</td>
        </tr>
        @empty
        <tr><td colspan="7" style="text-align:center; color:#aaa; padding:16px;">No sales recorded for this period.</td></tr>
        @endforelse
        <tr class="total-row">
            <td colspan="4">Total</td>
            <td class="amount">{{ number_format($totals['taxable_amount'], 2) }}</td>
            <td class="amount">{{ number_format($totals['vat_amount'], 2) }}</td>
            <td class="amount">{{ number_format($totals['total_amount'], 2) }}</td>
        </tr>
    </tbody>
</table>

<p class="footer">Generated: {{ now()->format('Y-m-d H:i') }} &nbsp;|&nbsp; {{ $company->name }} &nbsp;|&nbsp; Q{{ $quarter }} {{ $year }}</p>
</body>
</html>
```

- [ ] **Step 5: Create slp.blade.php**

Create `backend/resources/views/reports/vat/slp.blade.php`:

```blade
<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
    body { font-family: Arial, sans-serif; font-size: 11px; color: #333; margin: 32px; }
    h1 { font-size: 16px; margin-bottom: 2px; }
    h2 { font-size: 13px; font-weight: normal; color: #555; margin: 0 0 4px 0; }
    .meta { font-size: 11px; color: #666; margin-bottom: 20px; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 16px; }
    th { background: #f0f0f0; text-align: left; padding: 5px 6px; border-bottom: 2px solid #ccc; font-size: 10px; }
    td { padding: 4px 6px; border-bottom: 1px solid #e8e8e8; }
    .amount { text-align: right; }
    .total-row td { font-weight: bold; background: #f4f4f4; border-top: 2px solid #aaa; }
    .muted { color: #aaa; }
    .footer { font-size: 10px; color: #aaa; margin-top: 32px; }
</style>
</head>
<body>
<h1>{{ $company->name }}</h1>
<h2>Summary List of Purchases — Q{{ $quarter }} {{ $year }}</h2>
<p class="meta">
    @if($company->tin) TIN: {{ $company->tin }}<br> @endif
    @if($company->address) Address: {{ $company->address }} @endif
</p>

<table>
    <thead>
        <tr>
            <th>Date</th>
            <th>Invoice No.</th>
            <th>Supplier Name</th>
            <th>Supplier TIN</th>
            <th class="amount">Taxable Amount</th>
            <th class="amount">Input VAT (12%)</th>
            <th class="amount">Total</th>
        </tr>
    </thead>
    <tbody>
        @forelse($rows as $row)
        <tr>
            <td>{{ $row['date'] }}</td>
            <td>{{ $row['ref_number'] ?? '—' }}</td>
            <td>{{ $row['supplier_name'] ?? '<span class="muted">—</span>' }}</td>
            <td>{{ $row['supplier_tin'] ?? '<span class="muted">—</span>' }}</td>
            <td class="amount">{{ number_format($row['taxable_amount'], 2) }}</td>
            <td class="amount">{{ number_format($row['input_vat'], 2) }}</td>
            <td class="amount">{{ number_format($row['total_amount'], 2) }}</td>
        </tr>
        @empty
        <tr><td colspan="7" style="text-align:center; color:#aaa; padding:16px;">No purchases recorded for this period.</td></tr>
        @endforelse
        <tr class="total-row">
            <td colspan="4">Total</td>
            <td class="amount">{{ number_format($totals['taxable_amount'], 2) }}</td>
            <td class="amount">{{ number_format($totals['input_vat'], 2) }}</td>
            <td class="amount">{{ number_format($totals['total_amount'], 2) }}</td>
        </tr>
    </tbody>
</table>

<p class="footer">Generated: {{ now()->format('Y-m-d H:i') }} &nbsp;|&nbsp; {{ $company->name }} &nbsp;|&nbsp; Q{{ $quarter }} {{ $year }}</p>
</body>
</html>
```

- [ ] **Step 6: Run controller tests**

```bash
cd backend && php artisan test tests/Feature/VatReportControllerTest.php
```

Expected: all 6 tests pass.

- [ ] **Step 7: Run full test suite**

```bash
cd backend && php artisan test
```

Expected: all tests pass, no regressions.

- [ ] **Step 8: Commit**

```bash
git add backend/resources/views/reports/vat/
git commit -m "feat: add VAT PDF Blade templates (2550M, 2550Q, SLS, SLP)"
```

---

## Task 7: Frontend types and API client

**Files:**
- Modify: `frontend/src/types/report.ts`
- Modify: `frontend/src/lib/api/reports.ts`

- [ ] **Step 1: Add VAT types to report.ts**

In `frontend/src/types/report.ts`, append at the end of the file:

```typescript
export type VatReportType = '2550m' | '2550q' | 'sls' | 'slp'

export interface VatPdfParams {
  clientId?: string
  month?: number
  year: number
  quarter?: number
}
```

- [ ] **Step 2: Add downloadVatPdf to reports.ts**

In `frontend/src/lib/api/reports.ts`, append at the end of the file:

```typescript
export async function downloadVatPdf(
  type: VatReportType,
  params: VatPdfParams
): Promise<void> {
  const { data } = await api.get(`/reports/vat/${type}/pdf`, {
    params,
    responseType: 'blob',
  })
  const url      = URL.createObjectURL(new Blob([data], { type: 'application/pdf' }))
  const filename = buildVatFilename(type, params)
  const a        = document.createElement('a')
  a.href         = url
  a.download     = filename
  a.click()
  URL.revokeObjectURL(url)
}

function buildVatFilename(type: VatReportType, params: VatPdfParams): string {
  const year = params.year
  if (type === '2550m') return `2550m-${year}-${String(params.month).padStart(2, '0')}.pdf`
  return `${type}-${year}-Q${params.quarter}.pdf`
}
```

Also add the import for the new types at the top of `reports.ts`:

```typescript
import type { IncomeStatement, ExpenseBreakdown, VatReportType, VatPdfParams } from '@/types/report'
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/types/report.ts \
        frontend/src/lib/api/reports.ts
git commit -m "feat: add VAT report types and downloadVatPdf API function"
```

---

## Task 8: VatReportContent shared component

**Files:**
- Create: `frontend/src/components/reports/VatReportContent.tsx`

- [ ] **Step 1: Create VatReportContent.tsx**

Create `frontend/src/components/reports/VatReportContent.tsx`:

```tsx
'use client'

import { useState } from 'react'
import { Breadcrumb } from '@/components/shared/Breadcrumb'
import { downloadVatPdf } from '@/lib/api/reports'
import type { VatReportType } from '@/types/report'

interface Props {
  clientId?: string
  breadcrumbBase: { label: string; href: string }
}

const REPORT_TYPES: { value: VatReportType; label: string }[] = [
  { value: '2550m', label: '2550M — Monthly Return' },
  { value: '2550q', label: '2550Q — Quarterly Return' },
  { value: 'sls',   label: 'Summary List of Sales' },
  { value: 'slp',   label: 'Summary List of Purchases' },
]

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

function currentQuarter() {
  return Math.ceil((new Date().getMonth() + 1) / 3)
}

export function VatReportContent({ clientId, breadcrumbBase }: Props) {
  const now  = new Date()
  const [type,    setType]    = useState<VatReportType>('2550m')
  const [month,   setMonth]   = useState(now.getMonth() + 1)
  const [quarter, setQuarter] = useState(currentQuarter())
  const [year,    setYear]    = useState(now.getFullYear())
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState<string | null>(null)

  const isMonthly = type === '2550m'

  const yearOptions = Array.from({ length: 5 }, (_, i) => now.getFullYear() - i)

  async function handleDownload() {
    setLoading(true)
    setError(null)
    try {
      await downloadVatPdf(type, {
        clientId,
        year,
        month:   isMonthly ? month   : undefined,
        quarter: isMonthly ? undefined : quarter,
      })
    } catch (e: any) {
      const msg = e?.response?.data?.message ?? 'Failed to generate PDF. Please try again.'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  const inputCls = 'border border-t-line rounded-md px-2.5 py-1.5 text-xs text-t-ink bg-t-card'
  const labelCls = 'text-[10px] font-bold uppercase tracking-wide text-t-muted mb-1 block'

  return (
    <div className="max-w-[1280px] mx-auto px-9 py-7">
      <Breadcrumb crumbs={[breadcrumbBase, { label: 'VAT Report' }]} />

      <div className="flex items-start justify-between mb-[22px]">
        <div>
          <h1
            className="text-[34px] font-bold tracking-[-0.025em] text-t-ink m-0"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            VAT Report
          </h1>
          <p className="text-[14.5px] text-t-muted mt-[5px]">BIR-compliant VAT returns and summary lists</p>
        </div>
      </div>

      <div className="bg-t-card border border-t-line rounded-2xl p-6 max-w-md">
        <div className="space-y-4">
          <div>
            <label className={labelCls}>Report Type</label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as VatReportType)}
              className={`${inputCls} w-full`}
            >
              {REPORT_TYPES.map((r) => (
                <option key={r.value} value={r.value}>{r.label}</option>
              ))}
            </select>
          </div>

          <div className="flex gap-3">
            {isMonthly ? (
              <div className="flex-1">
                <label className={labelCls}>Month</label>
                <select
                  value={month}
                  onChange={(e) => setMonth(Number(e.target.value))}
                  className={`${inputCls} w-full`}
                >
                  {MONTHS.map((m, i) => (
                    <option key={i + 1} value={i + 1}>{m}</option>
                  ))}
                </select>
              </div>
            ) : (
              <div className="flex-1">
                <label className={labelCls}>Quarter</label>
                <select
                  value={quarter}
                  onChange={(e) => setQuarter(Number(e.target.value))}
                  className={`${inputCls} w-full`}
                >
                  <option value={1}>Q1 (Jan–Mar)</option>
                  <option value={2}>Q2 (Apr–Jun)</option>
                  <option value={3}>Q3 (Jul–Sep)</option>
                  <option value={4}>Q4 (Oct–Dec)</option>
                </select>
              </div>
            )}

            <div className="flex-1">
              <label className={labelCls}>Year</label>
              <select
                value={year}
                onChange={(e) => setYear(Number(e.target.value))}
                className={`${inputCls} w-full`}
              >
                {yearOptions.map((y) => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>
          </div>

          {error && (
            <p className="text-xs text-red-500">{error}</p>
          )}

          <button
            onClick={handleDownload}
            disabled={loading}
            className="w-full bg-t-primary text-white text-xs font-semibold px-4 py-2.5 rounded-md hover:bg-t-primary-deep transition-colors disabled:opacity-50"
          >
            {loading ? 'Generating PDF…' : 'Download PDF'}
          </button>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/components/reports/VatReportContent.tsx
git commit -m "feat: add VatReportContent shared component with type/period selectors"
```

---

## Task 9: Frontend VAT report pages for all roles + report index cards

**Files:**
- Create: `frontend/src/app/client/reports/vat/page.tsx`
- Create: `frontend/src/app/accountant/reports/[clientId]/vat/page.tsx`
- Create: `frontend/src/app/admin/reports/[clientId]/vat/page.tsx`
- Modify: `frontend/src/app/client/reports/page.tsx`
- Modify: `frontend/src/app/accountant/reports/page.tsx`
- Modify: `frontend/src/app/admin/reports/page.tsx`

- [ ] **Step 1: Create client VAT report page**

Create `frontend/src/app/client/reports/vat/page.tsx`:

```tsx
import { Suspense } from 'react'
import { VatReportContent } from '@/components/reports/VatReportContent'

export default function ClientVatReportPage() {
  return (
    <Suspense>
      <VatReportContent
        breadcrumbBase={{ label: 'Reports', href: '/client/reports' }}
      />
    </Suspense>
  )
}
```

- [ ] **Step 2: Create accountant VAT report page**

Create `frontend/src/app/accountant/reports/[clientId]/vat/page.tsx`:

```tsx
import { Suspense } from 'react'
import { VatReportContent } from '@/components/reports/VatReportContent'

interface Props {
  params: { clientId: string }
}

export default function AccountantVatReportPage({ params }: Props) {
  return (
    <Suspense>
      <VatReportContent
        clientId={params.clientId}
        breadcrumbBase={{ label: 'Reports', href: '/accountant/reports' }}
      />
    </Suspense>
  )
}
```

- [ ] **Step 3: Create admin VAT report page**

Create `frontend/src/app/admin/reports/[clientId]/vat/page.tsx`:

```tsx
import { Suspense } from 'react'
import { VatReportContent } from '@/components/reports/VatReportContent'

interface Props {
  params: { clientId: string }
}

export default function AdminVatReportPage({ params }: Props) {
  return (
    <Suspense>
      <VatReportContent
        clientId={params.clientId}
        breadcrumbBase={{ label: 'Reports', href: '/admin/reports' }}
      />
    </Suspense>
  )
}
```

- [ ] **Step 4: Add VAT card to client reports index**

In `frontend/src/app/client/reports/page.tsx`, the VAT card should navigate directly to `/client/reports/vat` without opening a dialog (no client or date selection needed for the client's own report). Add `Link` to the existing `next/link` import if not present, then add the card inside the `<div className="grid ...">` after the BIR Books card:

```tsx
<Link href="/client/reports/vat" className={cardCls}>
  <div className="flex-shrink-0 text-[24px] md:text-[28px] md:mb-3">📑</div>
  <div className="flex-1 min-w-0 md:flex-none md:w-full">
    <div className="text-sm font-bold text-t-ink mb-1">VAT Report</div>
    <div className="text-xs text-t-muted leading-relaxed">
      BIR-compliant VAT returns (2550M, 2550Q) and summary lists of sales and purchases.
    </div>
  </div>
  <div className="flex-shrink-0 text-xs font-bold t-primary md:mt-3.5">Download PDF →</div>
</Link>
```

Check if `Link` is already imported — the current file does not import it, so add:

```typescript
import Link from 'next/link'
```

No changes needed to `ReportType`, `REPORT_LABELS`, or `handleView`.

- [ ] **Step 5: Add VAT card to accountant reports index**

In `frontend/src/app/accountant/reports/page.tsx`, find the `ReportType` type:

```typescript
type ReportType = 'income-statement' | 'expense-breakdown'
```

Replace with:

```typescript
type ReportType = 'income-statement' | 'expense-breakdown' | 'vat'
```

Add `'vat': 'VAT Report'` to `REPORT_LABELS`.

Update `handleView` to navigate to the VAT page for the vat type:

```typescript
function handleView() {
  if (!clientId || !pending) return
  if (pending === 'vat') {
    router.push(`/accountant/reports/${clientId}/vat`)
  } else {
    const base = `/accountant/reports/${clientId}`
    const qs   = `?start=${start}&end=${end}`
    router.push(`${base}/${pending}${qs}`)
  }
  setPending(null)
}
```

Add the VAT card inside the `<div className="grid ...">` after the BIR Books `<Link>`:

```tsx
<div onClick={() => openModal('vat')} className={cardCls}>
  <div className="flex-shrink-0 text-[24px] md:text-[28px] md:mb-3">🧾</div>
  <div className="flex-1 min-w-0 md:flex-none md:w-full">
    <div className="text-sm font-bold text-t-ink mb-1">VAT Report</div>
    <div className="text-xs text-t-muted leading-relaxed">
      BIR-compliant VAT returns (2550M, 2550Q) and summary lists of sales and purchases.
    </div>
  </div>
  <div className="flex-shrink-0 text-xs font-bold text-t-primary md:mt-3.5">Download PDF →</div>
</div>
```

- [ ] **Step 6: Add VAT card to admin reports index**

In `frontend/src/app/admin/reports/page.tsx`, apply the same changes as the accountant page in Step 5, but with `/admin/reports/${clientId}/vat` as the navigation target.

Find `type ReportType = 'income-statement' | 'expense-breakdown'` and replace with:

```typescript
type ReportType = 'income-statement' | 'expense-breakdown' | 'vat'
```

Add `'vat': 'VAT Report'` to `REPORT_LABELS`.

Update `handleView`:

```typescript
function handleView() {
  if (!clientId || !pending) return
  if (pending === 'vat') {
    router.push(`/admin/reports/${clientId}/vat`)
  } else {
    const base = `/admin/reports/${clientId}`
    const qs   = `?start=${start}&end=${end}`
    router.push(`${base}/${pending}${qs}`)
  }
  setPending(null)
}
```

Add the VAT card inside the grid div after the BIR Books card:

```tsx
<div onClick={() => openModal('vat')} className={cardCls}>
  <div className="text-[28px] mb-3">🧾</div>
  <div className="text-sm font-bold text-t-ink mb-1">VAT Report</div>
  <div className="text-xs text-t-muted leading-relaxed flex-1">
    BIR-compliant VAT returns (2550M, 2550Q) and summary lists of sales and purchases.
  </div>
  <div className="mt-3.5 text-xs font-bold text-t-primary">Download PDF →</div>
</div>
```

- [ ] **Step 7: TypeScript check**

```bash
cd frontend && npx tsc --noEmit
```

Expected: no TypeScript errors.

- [ ] **Step 8: Commit**

```bash
git add frontend/src/app/client/reports/vat/ \
        frontend/src/app/accountant/reports/ \
        frontend/src/app/admin/reports/ \
        frontend/src/app/client/reports/page.tsx \
        frontend/src/app/accountant/reports/page.tsx \
        frontend/src/app/admin/reports/page.tsx
git commit -m "feat: add VAT report pages for all roles and VAT cards on report index"
```

---

## Done

All tasks complete. Verify end-to-end by:
1. Logging in as an accountant, navigating to Reports → VAT Report, selecting a VAT-registered client, choosing 2550M for any month, and confirming the PDF downloads.
2. Repeating for 2550Q, SLS, SLP.
3. Uploading a receipt for a VAT client and confirming a merchant record is created in the `merchants` table with the TIN extracted from the receipt (if visible).
