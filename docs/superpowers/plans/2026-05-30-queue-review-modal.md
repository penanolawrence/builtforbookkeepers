# Queue Review Modal Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a `QueueReviewModal` to the queue page that lets accountants/admins edit all AI-classified fields and transaction lines inline before approving, rejecting, or returning a document — and persists an override trail visible on the approved document.

**Architecture:** A new `QueueReviewModal` component (separate from `DocumentDetailModal`) replaces the Review button navigation in `QueuePageContent`. The backend `approve` endpoint is extended to accept field edits, transaction line upserts, and line deletions; it computes and stores the diff in a new `field_overrides` JSON column on `documents`. `DocumentDetailModal` renders a "Reviewed Edits" card on approved documents where `fieldOverrides` is non-null.

**Tech Stack:** Laravel 11 (PHP), Next.js 14 App Router, TypeScript, shadcn/ui, TanStack Query v5, Axios

---

### Task 1: Migration + Document model

**Files:**
- Create: `backend/database/migrations/2026_05_30_000001_add_field_overrides_to_documents.php`
- Modify: `backend/app/Models/Document.php`

- [ ] **Step 1: Write the migration**

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
            $table->json('field_overrides')->nullable()->after('note');
        });
    }

    public function down(): void
    {
        Schema::table('documents', function (Blueprint $table) {
            $table->dropColumn('field_overrides');
        });
    }
};
```

- [ ] **Step 2: Run the migration**

```bash
cd backend && php artisan migrate
```

Expected: `Migrating: 2026_05_30_000001_add_field_overrides_to_documents` → `Migrated`

- [ ] **Step 3: Update Document model — add `field_overrides` to `$fillable` and `$casts`**

In `backend/app/Models/Document.php`, add `'field_overrides'` to `$fillable` (after `'note'`):

```php
'note',
'field_overrides',
```

Add to `$casts` (after `'cancelled_at' => 'datetime'`):

```php
'field_overrides' => 'array',
```

- [ ] **Step 4: Commit**

```bash
git add backend/database/migrations/2026_05_30_000001_add_field_overrides_to_documents.php backend/app/Models/Document.php
git commit -m "feat: add field_overrides JSON column to documents"
```

---

### Task 2: Extend ApproveItemRequest + QueueController::show

**Files:**
- Modify: `backend/app/Http/Requests/Queue/ApproveItemRequest.php`
- Modify: `backend/app/Http/Controllers/QueueController.php`

- [ ] **Step 1: Write the failing test for transaction lines in show response**

Create `backend/tests/Feature/QueueReviewTest.php`:

```php
<?php

namespace Tests\Feature;

use App\Models\Account;
use App\Models\Company;
use App\Models\Document;
use App\Models\TransactionLine;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class QueueReviewTest extends TestCase
{
    use RefreshDatabase;

    private User $accountant;
    private Company $company;
    private Document $document;

    protected function setUp(): void
    {
        parent::setUp();

        $this->accountant = User::factory()->create(['role' => 'accountant']);

        $this->company = Company::factory()->create([
            'accountant_id' => $this->accountant->id,
            'bir_type'      => 'non_vat',
        ]);

        $this->document = Document::factory()->create([
            'company_id'    => $this->company->id,
            'status'        => 'parked',
            'merchant_name' => 'MERALCO',
            'document_date' => '2026-05-20',
            'document_type' => 'expense',
            'payment_method'=> 'cash',
            'flag'          => 'GREEN',
        ]);
    }

    public function test_show_includes_transaction_lines(): void
    {
        $account = Account::factory()->create([
            'company_id' => $this->company->id,
            'code'       => '5100',
            'name'       => 'Utilities Expense',
            'type'       => 'expense',
        ]);

        TransactionLine::factory()->create([
            'document_id'  => $this->document->id,
            'account_id'   => $account->id,
            'account_code' => '5100',
            'type'         => 'expense',
            'category'     => 'Utilities',
            'amount'       => 1200.00,
            'description'  => 'Meralco bill',
            'date'         => '2026-05-20',
        ]);

        $response = $this->actingAs($this->accountant)
            ->getJson("/api/queue/{$this->document->id}");

        $response->assertOk();
        $response->assertJsonCount(1, 'transactionLines');
        $response->assertJsonPath('transactionLines.0.accountCode', '5100');
        $response->assertJsonPath('transactionLines.0.accountName', 'Utilities Expense');
        $response->assertJsonPath('transactionLines.0.type', 'expense');
        $response->assertJsonPath('transactionLines.0.amount', 1200.0);
        $response->assertJsonPath('transactionLines.0.date', '2026-05-20');
    }
}
```

- [ ] **Step 2: Run test to confirm it fails**

```bash
cd backend && php artisan test --filter=QueueReviewTest::test_show_includes_transaction_lines
```

Expected: FAIL — `transactionLines` key not found

- [ ] **Step 3: Update ApproveItemRequest validation rules**

Replace the entire `rules()` body in `backend/app/Http/Requests/Queue/ApproveItemRequest.php`:

```php
public function rules(): array
{
    return [
        'fields'                    => ['nullable', 'array'],
        'fields.merchantName'       => ['nullable', 'string'],
        'fields.date'               => ['nullable', 'date'],
        'fields.declaredType'       => ['nullable', 'string', 'in:income,expense'],
        'fields.paymentMethod'      => ['nullable', 'string'],
        'lines'                     => ['nullable', 'array'],
        'lines.*.id'                => ['nullable', 'string'],
        'lines.*.type'              => ['nullable', 'string', 'in:income,expense'],
        'lines.*.accountId'         => ['nullable', 'string'],
        'lines.*.accountCode'       => ['nullable', 'string'],
        'lines.*.category'          => ['nullable', 'string'],
        'lines.*.amount'            => ['nullable', 'numeric'],
        'lines.*.description'       => ['nullable', 'string'],
        'lines.*.date'              => ['nullable', 'date'],
        'removedLineIds'            => ['nullable', 'array'],
        'removedLineIds.*'          => ['nullable', 'string'],
    ];
}
```

- [ ] **Step 4: Extend QueueController::show — add `transactionLines.account` eager load and include lines in response**

In `backend/app/Http/Controllers/QueueController.php`, update the `show` method:

```php
public function show(string $id): JsonResponse
{
    $document = Document::with(['company', 'ocrResult', 'transactionLines.account'])->findOrFail($id);

    try {
        $journalPreview = (new JournalEntryService())->previewFromDocument($document);
    } catch (Throwable) {
        $journalPreview = [];
    }

    return response()->json([
        'documentId'       => $document->id,
        'clientId'         => $document->company_id,
        'clientName'       => $document->company->name,
        'flag'             => $document->flag,
        'anomalyReasons'   => $document->anomaly_reason ?? [],
        'merchantName'     => $document->merchant_name,
        'amount'           => $document->amount,
        'vatAmount'        => $document->vat_amount,
        'date'             => $document->document_date?->toDateString(),
        'category'         => $document->category,
        'paymentMethod'    => $document->payment_method,
        'refNumber'        => $document->ref_number,
        'isNoReceipt'      => $document->is_no_receipt,
        'isOcrFailed'      => $document->is_ocr_failed,
        'declaredType'     => $document->document_type,
        'isVat'            => $document->company->bir_type === 'vat',
        'journalPreview'   => $journalPreview,
        'transactionLines' => $document->transactionLines->map(fn ($l) => [
            'id'          => $l->id,
            'accountId'   => $l->account_id,
            'accountCode' => $l->account_code,
            'accountName' => $l->account?->name,
            'type'        => $l->type,
            'category'    => $l->category,
            'amount'      => (float) $l->amount,
            'description' => $l->description,
            'date'        => $l->date?->toDateString(),
        ])->values()->all(),
    ]);
}
```

- [ ] **Step 5: Run test to confirm it passes**

```bash
cd backend && php artisan test --filter=QueueReviewTest::test_show_includes_transaction_lines
```

Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add backend/app/Http/Requests/Queue/ApproveItemRequest.php backend/app/Http/Controllers/QueueController.php backend/tests/Feature/QueueReviewTest.php
git commit -m "feat: extend queue show with transaction lines, update approve request validation"
```

---

### Task 3: Update QueueController::approve

**Files:**
- Modify: `backend/app/Http/Controllers/QueueController.php`
- Modify: `backend/tests/Feature/QueueReviewTest.php`

- [ ] **Step 1: Write failing tests for the new approve behavior**

Append these test methods to `backend/tests/Feature/QueueReviewTest.php`. First, update the class to add the `$expenseAccount` property and extend `setUp` with the accounts needed by `JournalEntryService`. Replace the existing `setUp` method (the one that creates `$this->accountant`, `$this->company`, and `$this->document`) with this complete version:

```php
private User $accountant;
private Company $company;
private Document $document;
private Account $expenseAccount;

protected function setUp(): void
{
    parent::setUp();

    $this->accountant = User::factory()->create(['role' => 'accountant']);

    $this->company = Company::factory()->create([
        'accountant_id' => $this->accountant->id,
        'bir_type'      => 'non_vat',
    ]);

    $this->document = Document::factory()->create([
        'company_id'    => $this->company->id,
        'status'        => 'parked',
        'merchant_name' => 'MERALCO',
        'document_date' => '2026-05-20',
        'document_type' => 'expense',
        'payment_method'=> 'cash',
        'flag'          => 'GREEN',
    ]);

    $this->expenseAccount = Account::factory()->create([
        'company_id' => $this->company->id,
        'code'       => '5100',
        'name'       => 'Utilities Expense',
        'type'       => 'expense',
    ]);

    // Cash account required by JournalEntryService
    Account::factory()->create([
        'company_id' => $this->company->id,
        'code'       => '1001',
        'name'       => 'Cash on Hand',
        'type'       => 'cash',
    ]);
}
```

Then add the tests:

```php
public function test_approve_with_field_overrides_stores_diff(): void
{
    $this->document->update([
        'merchant_name'  => 'MERALCO',
        'document_date'  => '2026-05-20',
        'account_id'     => $this->expenseAccount->id,
    ]);

    TransactionLine::factory()->create([
        'document_id'  => $this->document->id,
        'account_id'   => $this->expenseAccount->id,
        'account_code' => '5100',
        'type'         => 'expense',
        'amount'       => 1200.00,
    ]);

    $response = $this->actingAs($this->accountant)
        ->postJson("/api/queue/{$this->document->id}/approve", [
            'fields' => [
                'merchantName' => 'Manila Electric Company',
                'date'         => '2026-05-25',
                'declaredType' => 'expense',
                'paymentMethod'=> 'cash',
            ],
        ]);

    $response->assertOk();

    $overrides = $this->document->fresh()->field_overrides;
    $this->assertNotNull($overrides);
    $this->assertEquals($this->accountant->id, $overrides['overriddenBy']);

    $fieldKeys = collect($overrides['fields'])->pluck('field')->all();
    $this->assertContains('merchantName', $fieldKeys);
    $this->assertContains('date', $fieldKeys);

    $merchantOverride = collect($overrides['fields'])->firstWhere('field', 'merchantName');
    $this->assertEquals('MERALCO', $merchantOverride['original']);
    $this->assertEquals('Manila Electric Company', $merchantOverride['override']);
}

public function test_approve_without_changes_leaves_field_overrides_null(): void
{
    $this->document->update([
        'merchant_name'  => 'MERALCO',
        'document_date'  => '2026-05-20',
        'document_type'  => 'expense',
        'payment_method' => 'cash',
        'account_id'     => $this->expenseAccount->id,
    ]);

    TransactionLine::factory()->create([
        'document_id'  => $this->document->id,
        'account_id'   => $this->expenseAccount->id,
        'account_code' => '5100',
        'type'         => 'expense',
        'amount'       => 1200.00,
    ]);

    $response = $this->actingAs($this->accountant)
        ->postJson("/api/queue/{$this->document->id}/approve", [
            'fields' => [
                'merchantName' => 'MERALCO',
                'date'         => '2026-05-20',
                'declaredType' => 'expense',
                'paymentMethod'=> 'cash',
            ],
        ]);

    $response->assertOk();
    $this->assertNull($this->document->fresh()->field_overrides);
}

public function test_approve_updates_existing_transaction_lines(): void
{
    $this->document->update(['account_id' => $this->expenseAccount->id]);

    $line = TransactionLine::factory()->create([
        'document_id'  => $this->document->id,
        'account_id'   => $this->expenseAccount->id,
        'account_code' => '5100',
        'type'         => 'expense',
        'amount'       => 1200.00,
        'category'     => 'Utilities',
    ]);

    $newAccount = Account::factory()->create([
        'company_id' => $this->company->id,
        'code'       => '5200',
        'name'       => 'Rent Expense',
        'type'       => 'expense',
    ]);

    $response = $this->actingAs($this->accountant)
        ->postJson("/api/queue/{$this->document->id}/approve", [
            'lines' => [[
                'id'          => $line->id,
                'accountId'   => $newAccount->id,
                'accountCode' => '5200',
                'category'    => 'Rent',
                'amount'      => 1500.00,
                'description' => 'Monthly rent',
                'date'        => '2026-05-20',
            ]],
        ]);

    $response->assertOk();

    $updated = $line->fresh();
    $this->assertEquals('5200', $updated->account_code);
    $this->assertEquals('Rent', $updated->category);
    $this->assertEquals('1500.00', $updated->amount);
}

public function test_approve_creates_new_transaction_lines(): void
{
    $this->document->update(['account_id' => $this->expenseAccount->id]);

    TransactionLine::factory()->create([
        'document_id'  => $this->document->id,
        'account_id'   => $this->expenseAccount->id,
        'account_code' => '5100',
        'type'         => 'expense',
        'amount'       => 1200.00,
    ]);

    $response = $this->actingAs($this->accountant)
        ->postJson("/api/queue/{$this->document->id}/approve", [
            'lines' => [[
                'type'         => 'expense',
                'accountId'    => $this->expenseAccount->id,
                'accountCode'  => '5100',
                'category'     => 'Office',
                'amount'       => 300.00,
                'description'  => 'Printer paper',
                'date'         => '2026-05-20',
            ]],
        ]);

    $response->assertOk();
    $this->assertDatabaseHas('transaction_lines', [
        'document_id' => $this->document->id,
        'category'    => 'Office',
        'amount'      => '300.00',
    ]);
}

public function test_approve_deletes_removed_lines(): void
{
    $this->document->update(['account_id' => $this->expenseAccount->id]);

    $line1 = TransactionLine::factory()->create([
        'document_id'  => $this->document->id,
        'account_id'   => $this->expenseAccount->id,
        'account_code' => '5100',
        'type'         => 'expense',
        'amount'       => 1200.00,
    ]);

    $line2 = TransactionLine::factory()->create([
        'document_id'  => $this->document->id,
        'account_id'   => $this->expenseAccount->id,
        'account_code' => '5100',
        'type'         => 'expense',
        'amount'       => 300.00,
    ]);

    $response = $this->actingAs($this->accountant)
        ->postJson("/api/queue/{$this->document->id}/approve", [
            'removedLineIds' => [$line2->id],
        ]);

    $response->assertOk();
    $this->assertDatabaseMissing('transaction_lines', ['id' => $line2->id]);
    $this->assertDatabaseHas('transaction_lines', ['id' => $line1->id]);
}
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
cd backend && php artisan test --filter=QueueReviewTest
```

Expected: several FAIL — override diff, line update, line create, line delete not yet implemented

- [ ] **Step 3: Add `TransactionLine` import to QueueController**

At the top of `backend/app/Http/Controllers/QueueController.php`, add:

```php
use App\Models\TransactionLine;
```

- [ ] **Step 4: Add the `computeOverrideDiff` private method to QueueController**

Add this private method at the bottom of the `QueueController` class (before the closing `}`):

```php
private function computeOverrideDiff(ApproveItemRequest $request, Document $document): array
{
    $diff = ['fields' => [], 'lines' => []];

    $docFieldMap = [
        'merchantName'  => 'merchant_name',
        'date'          => 'document_date',
        'declaredType'  => 'document_type',
        'paymentMethod' => 'payment_method',
    ];

    if ($request->filled('fields')) {
        foreach ($request->fields as $key => $value) {
            if (!isset($docFieldMap[$key])) continue;
            $dbCol    = $docFieldMap[$key];
            $original = (string) ($document->$dbCol ?? '');
            $newVal   = (string) $value;
            if ($original !== $newVal) {
                $diff['fields'][] = [
                    'field'    => $key,
                    'original' => $original,
                    'override' => $newVal,
                ];
            }
        }
    }

    if ($request->filled('lines')) {
        foreach ($request->lines as $lineData) {
            if (empty($lineData['id'])) continue;
            $line = $document->transactionLines->firstWhere('id', $lineData['id']);
            if (!$line) continue;
            foreach (['accountCode' => 'account_code', 'category' => 'category'] as $field => $dbCol) {
                if (!isset($lineData[$field])) continue;
                $original = (string) ($line->$dbCol ?? '');
                $newVal   = (string) $lineData[$field];
                if ($original !== $newVal) {
                    $diff['lines'][] = [
                        'lineId'   => $line->id,
                        'field'    => $field,
                        'original' => $original,
                        'override' => $newVal,
                    ];
                }
            }
        }
    }

    return $diff;
}
```

- [ ] **Step 5: Update `approve` method — load transactionLines, compute diff, apply line ops, store diff**

Replace the entire `approve` method in `backend/app/Http/Controllers/QueueController.php`:

```php
public function approve(ApproveItemRequest $request, string $id): JsonResponse
{
    $document = Document::with(['company', 'transactionLines'])->findOrFail($id);
    $user     = auth()->user();

    if ($document->status !== 'parked') {
        return response()->json(['message' => 'Document is not in the queue.'], 422);
    }

    if ($user->role === 'accountant' && $document->company->accountant_id !== $user->id) {
        return response()->json(['message' => 'Forbidden.'], 403);
    }

    // Compute diff before any changes so original values are preserved
    $diff = $this->computeOverrideDiff($request, $document);

    // Apply document-level field edits
    if ($request->filled('fields')) {
        $fieldMap = [
            'merchantName'  => 'merchant_name',
            'date'          => 'document_date',
            'amount'        => 'amount',
            'vatAmount'     => 'vat_amount',
            'category'      => 'category',
            'paymentMethod' => 'payment_method',
            'accountId'     => 'account_id',
            'declaredType'  => 'document_type',
        ];
        $mapped = [];
        foreach ($request->fields as $key => $value) {
            if (isset($fieldMap[$key])) {
                $mapped[$fieldMap[$key]] = $value;
            }
        }
        if ($mapped) {
            $document->fill($mapped);
            $document->save();
        }
    }

    $overrideData = (!empty($diff['fields']) || !empty($diff['lines']))
        ? array_merge($diff, [
            'overriddenBy' => $user->id,
            'overriddenAt' => now()->toIso8601String(),
        ])
        : null;

    DB::transaction(function () use ($document, $user, $request, $overrideData) {
        // Delete removed lines (scoped to this document for safety)
        if ($request->filled('removedLineIds')) {
            TransactionLine::where('document_id', $document->id)
                ->whereIn('id', $request->removedLineIds)
                ->delete();
        }

        // Update existing lines / create new lines
        if ($request->filled('lines')) {
            foreach ($request->lines as $lineData) {
                if (!empty($lineData['id'])) {
                    $updateData = [];
                    if (array_key_exists('accountId', $lineData))   $updateData['account_id']   = $lineData['accountId'];
                    if (array_key_exists('accountCode', $lineData)) $updateData['account_code'] = $lineData['accountCode'];
                    if (array_key_exists('category', $lineData))    $updateData['category']     = $lineData['category'];
                    if (array_key_exists('amount', $lineData))      $updateData['amount']       = $lineData['amount'];
                    if (array_key_exists('description', $lineData)) $updateData['description']  = $lineData['description'];
                    if (array_key_exists('date', $lineData))        $updateData['date']         = $lineData['date'];
                    if ($updateData) {
                        TransactionLine::where('id', $lineData['id'])
                            ->where('document_id', $document->id)
                            ->update($updateData);
                    }
                } else {
                    $document->transactionLines()->create([
                        'type'         => $lineData['type'],
                        'account_id'   => $lineData['accountId'] ?? null,
                        'account_code' => $lineData['accountCode'] ?? null,
                        'category'     => $lineData['category'] ?? null,
                        'amount'       => $lineData['amount'] ?? 0,
                        'description'  => $lineData['description'] ?? null,
                        'date'         => $lineData['date'] ?? null,
                    ]);
                }
            }
        }

        // Refresh lines before journal posting (picks up deletions and updates)
        $document->setRelation('transactionLines', $document->transactionLines()->get());

        (new JournalEntryService())->postFromDocument($document, $user);

        $document->update([
            'status'          => 'approved',
            'approved_by'     => $user->id,
            'approved_at'     => now(),
            'field_overrides' => $overrideData,
        ]);

        rescue(fn () => event(new QueueItemRemoved($document->id)));

        rescue(fn () => event(new DocumentStatusChanged(
            companyId:      $document->company_id,
            documentId:     $document->id,
            status:         'approved',
            flag:           $document->flag,
            anomalyReasons: [],
        )));
    });

    if ($user->role === 'accountant' && $document->document_date) {
        $isPastPeriod = Carbon::parse($document->document_date)->lt(Carbon::now()->startOfMonth());
        if ($isPastPeriod) {
            $period = Carbon::parse($document->document_date)->format('m/Y');
            $msg    = "Alert: A transaction dated {$period} was just posted into a past period."
                . " Client: {$document->company->name} | Amount: PHP {$document->amount}"
                . " | Posted by: " . $user->name;
            (new NotificationService())->notifyAdmin('past_period_approval', $msg, [
                'documentId' => $document->id,
                'companyId'  => $document->company_id,
            ]);
        }
    }

    return response()->json(['message' => 'Approved.']);
}
```

- [ ] **Step 6: Run all QueueReviewTest tests**

```bash
cd backend && php artisan test --filter=QueueReviewTest
```

Expected: all PASS

- [ ] **Step 7: Run full test suite to check for regressions**

```bash
cd backend && php artisan test
```

Expected: all PASS

- [ ] **Step 8: Commit**

```bash
git add backend/app/Http/Controllers/QueueController.php backend/tests/Feature/QueueReviewTest.php
git commit -m "feat: extend approve endpoint with line ops and override diff storage"
```

---

### Task 4: DocumentController::toDetail + signed URL route + field overrides in response

**Files:**
- Modify: `backend/app/Http/Controllers/DocumentController.php`
- Modify: `backend/routes/api.php`
- Modify: `backend/tests/Feature/QueueReviewTest.php`

- [ ] **Step 1: Write failing tests**

Append to `backend/tests/Feature/QueueReviewTest.php`:

```php
public function test_document_detail_includes_field_overrides(): void
{
    $this->document->update([
        'status'          => 'approved',
        'approved_by'     => $this->accountant->id,
        'approved_at'     => now(),
        'field_overrides' => [
            'overriddenBy' => $this->accountant->id,
            'overriddenAt' => now()->toIso8601String(),
            'fields'       => [
                ['field' => 'merchantName', 'original' => 'MERALCO', 'override' => 'Manila Electric Co.'],
            ],
            'lines' => [],
        ],
    ]);

    $client = User::factory()->create([
        'role'       => 'client',
        'company_id' => $this->company->id,
    ]);

    $response = $this->actingAs($client)
        ->getJson("/api/documents/{$this->document->id}");

    $response->assertOk();
    $response->assertJsonPath('fieldOverrides.fields.0.field', 'merchantName');
    $response->assertJsonPath('fieldOverrides.fields.0.original', 'MERALCO');
}

public function test_signed_url_accessible_to_accountant(): void
{
    $response = $this->actingAs($this->accountant)
        ->getJson("/api/documents/{$this->document->id}/image");

    // 200 or null url (MinIO may not be running) — not 403/404
    $response->assertStatus(200);
}
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
cd backend && php artisan test --filter="QueueReviewTest::test_document_detail_includes_field_overrides|QueueReviewTest::test_signed_url_accessible_to_accountant"
```

Expected: both FAIL

- [ ] **Step 3: Update `DocumentController::toDetail` to include `fieldOverrides`**

In `backend/app/Http/Controllers/DocumentController.php`, inside the `toDetail` method, add `'fieldOverrides'` to the `array_merge` call:

```php
private function toDetail(Document $d): array
{
    return array_merge($this->toListItem($d), [
        'internalStatus'   => $d->internal_status,
        'approvedAt'       => $d->approved_at?->toIso8601String(),
        'returnedAt'       => $d->returned_at?->toIso8601String(),
        'rejectedAt'       => $d->rejected_at?->toIso8601String(),
        'fieldOverrides'   => $d->field_overrides,
        'ocrResult'        => $d->ocrResult ? [
            'rawText'    => $d->ocrResult->extracted_data['raw_text'] ?? null,
            'confidence' => $d->ocrResult->confidence,
        ] : null,
        'transactionLines' => $d->transactionLines->map(fn($l) => [
            'id'          => $l->id,
            'accountCode' => $l->account_code,
            'accountName' => $l->account?->name,
            'type'        => $l->type,
            'category'    => $l->category,
            'amount'      => (float) $l->amount,
            'description' => $l->description,
            'date'        => $l->date?->toDateString(),
        ])->values()->all(),
    ]);
}
```

- [ ] **Step 4: Add signed URL route to accountant+admin shared group**

In `backend/routes/api.php`, inside the `role:accountant,admin` group (around line 60), add:

```php
Route::get('/documents/{id}/image', [DocumentController::class, 'getSignedUrl']);
```

The `DocumentController::getSignedUrl` controller already handles accountant authorization — no controller changes needed.

- [ ] **Step 5: Run failing tests**

```bash
cd backend && php artisan test --filter="QueueReviewTest::test_document_detail_includes_field_overrides|QueueReviewTest::test_signed_url_accessible_to_accountant"
```

Expected: both PASS

- [ ] **Step 6: Run full test suite**

```bash
cd backend && php artisan test
```

Expected: all PASS

- [ ] **Step 7: Commit**

```bash
git add backend/app/Http/Controllers/DocumentController.php backend/routes/api.php backend/tests/Feature/QueueReviewTest.php
git commit -m "feat: include fieldOverrides in document detail, expose signed URL to accountants"
```

---

### Task 5: Frontend types

**Files:**
- Modify: `frontend/src/types/document.ts`
- Modify: `frontend/src/types/queue.ts`

- [ ] **Step 1: Add `date` and `accountId` to `TransactionLine`, add `FieldOverride` and `fieldOverrides` to `Document`**

Replace `frontend/src/types/document.ts` with:

```typescript
export type DocumentStatus = 'PROCESSING' | 'PARKED' | 'APPROVED' | 'RETURNED' | 'REJECTED' | 'CANCELLED'
export type FlagColor = 'RED' | 'YELLOW' | 'GREEN'
export type DeclaredType = 'income' | 'expense'

export interface TransactionLine {
  id: string
  accountId: string | null
  accountCode: string | null
  accountName: string | null
  type: 'income' | 'expense'
  category: string | null
  amount: number
  description: string | null
  date: string | null
}

export interface FieldOverrideEntry {
  field: string
  original: string
  override: string
}

export interface LineOverrideEntry {
  lineId: string
  field: string
  original: string
  override: string
}

export interface FieldOverrides {
  overriddenBy: string
  overriddenAt: string
  fields: FieldOverrideEntry[]
  lines: LineOverrideEntry[]
}

export interface Document {
  id: string
  companyId: string
  declaredType: DeclaredType
  status: DocumentStatus
  flag: FlagColor | null
  anomalyReasons: string[]
  merchantName: string | null
  date: string | null
  amount: number | null
  vatAmount: number | null
  category: string | null
  paymentMethod: string | null
  imageUrl: string
  isNoReceipt: boolean
  isOcrFailed: boolean
  returnNote: string | null
  rejectionReason: string | null
  expiresAt: string | null
  refNumber: string | null
  note: string | null
  inflow: number
  outflow: number
  transactionLines: TransactionLine[]
  fieldOverrides: FieldOverrides | null
  createdAt: string
  updatedAt: string
}
```

- [ ] **Step 2: Add `QueueItemDetail` type to `frontend/src/types/queue.ts`**

Append to `frontend/src/types/queue.ts`:

```typescript
import type { TransactionLine } from './document'

export interface QueueItemDetail extends QueueItem {
  isVat: boolean
  journalPreview: JournalPreviewLine[]
  transactionLines: TransactionLine[]
}
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/types/document.ts frontend/src/types/queue.ts
git commit -m "feat: add fieldOverrides to Document type, add QueueItemDetail type"
```

---

### Task 6: Update queue API

**Files:**
- Modify: `frontend/src/lib/api/queue.ts`

- [ ] **Step 1: Update `getQueueItem` return type, add `LinePayload`, update `approveItem` signature**

Replace `frontend/src/lib/api/queue.ts` with:

```typescript
import api from './client'
import type { QueueItem, QueueItemDetail, JournalPreviewLine } from '@/types/queue'

export type { JournalPreviewLine }

export interface LinePayload {
  id?: string
  type?: 'income' | 'expense'
  accountId?: string | null
  accountCode?: string | null
  category?: string | null
  amount?: number
  description?: string | null
  date?: string | null
}

export async function getQueue(params?: { clientId?: string }): Promise<QueueItem[]> {
  const { data } = await api.get<QueueItem[]>('/queue', { params })
  return data
}

export async function getQueueItem(id: string): Promise<QueueItemDetail> {
  const { data } = await api.get<QueueItemDetail>(`/queue/${id}`)
  return data
}

export async function approveItem(
  id: string,
  payload?: {
    fields?: Record<string, unknown>
    lines?: LinePayload[]
    removedLineIds?: string[]
  }
): Promise<void> {
  await api.post(`/queue/${id}/approve`, payload)
}

export async function returnItem(id: string, note: string): Promise<void> {
  await api.post(`/queue/${id}/return`, { note })
}

export async function rejectItem(id: string, reason: string): Promise<void> {
  await api.post(`/queue/${id}/reject`, { reason })
}

export async function batchApprove(
  ids: string[]
): Promise<{ approved: string[]; failed: { id: string; reason: string }[] }> {
  const { data } = await api.post('/queue/batch-approve', { ids })
  return data
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd frontend && npx tsc --noEmit
```

Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add frontend/src/lib/api/queue.ts
git commit -m "feat: update queue API — typed QueueItemDetail, extended approveItem payload"
```

---

### Task 7: Create QueueReviewModal

**Files:**
- Create: `frontend/src/components/queue/QueueReviewModal.tsx`

- [ ] **Step 1: Create the component**

Create `frontend/src/components/queue/QueueReviewModal.tsx`:

```tsx
'use client'

import { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { getQueueItem, approveItem, returnItem, rejectItem } from '@/lib/api/queue'
import { getSignedUrl } from '@/lib/api/documents'
import { getAccounts } from '@/lib/api/accounts'
import type { Account } from '@/types/admin'
import type { LinePayload } from '@/lib/api/queue'

interface LineState {
  id?: string
  type: 'income' | 'expense'
  accountId: string
  accountCode: string
  category: string
  amount: string
  description: string
  date: string
}

interface Props {
  documentId: string
  onClose: () => void
}

function AccountSelect({
  value,
  accounts,
  onChange,
}: {
  value: string
  accounts: Account[]
  onChange: (accountId: string, accountCode: string) => void
}) {
  const [search, setSearch] = useState('')
  const [open, setOpen]     = useState(false)

  const selected = accounts.find((a) => a.id === value)
  const filtered = accounts.filter(
    (a) =>
      a.code.toLowerCase().includes(search.toLowerCase()) ||
      a.name.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="relative">
      <input
        type="text"
        value={open ? search : selected ? `${selected.code} — ${selected.name}` : ''}
        onFocus={() => { setOpen(true); setSearch('') }}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        onChange={(e) => setSearch(e.target.value)}
        className="w-full border border-gray-200 rounded px-2 py-1 text-xs"
        placeholder="Search accounts…"
      />
      {open && filtered.length > 0 && (
        <ul className="absolute z-50 w-full bg-white border border-gray-200 rounded shadow-md max-h-48 overflow-y-auto text-xs">
          {filtered.map((a) => (
            <li
              key={a.id}
              onMouseDown={() => { onChange(a.id, a.code); setOpen(false) }}
              className="px-2 py-1.5 hover:bg-gray-50 cursor-pointer"
            >
              {a.code} — {a.name}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function LineRow({
  line,
  accounts,
  isNew,
  onChange,
  onRemove,
}: {
  line: LineState & { index: number }
  accounts: Account[]
  isNew: boolean
  onChange: (patch: Partial<LineState>) => void
  onRemove: () => void
}) {
  return (
    <div className={`flex gap-1.5 items-center mb-1.5 ${isNew ? 'border-l-2 border-indigo-300 pl-2' : ''}`}>
      <div className="w-44 shrink-0">
        <AccountSelect
          value={line.accountId}
          accounts={accounts}
          onChange={(accountId, accountCode) => onChange({ accountId, accountCode })}
        />
      </div>
      <input
        type="text"
        value={line.category}
        onChange={(e) => onChange({ category: e.target.value })}
        placeholder="Category"
        className="border border-gray-200 rounded px-2 py-1 text-xs w-20"
      />
      <input
        type="number"
        value={line.amount}
        onChange={(e) => onChange({ amount: e.target.value })}
        placeholder="Amount"
        className="border border-gray-200 rounded px-2 py-1 text-xs w-20"
      />
      <input
        type="date"
        value={line.date}
        onChange={(e) => onChange({ date: e.target.value })}
        className="border border-gray-200 rounded px-2 py-1 text-xs w-32"
      />
      <input
        type="text"
        value={line.description}
        onChange={(e) => onChange({ description: e.target.value })}
        placeholder="Description"
        className="border border-gray-200 rounded px-2 py-1 text-xs flex-1"
      />
      <button
        onClick={onRemove}
        className="text-gray-300 hover:text-red-500 transition-colors text-sm px-1 shrink-0"
        title="Remove line"
      >
        ✕
      </button>
    </div>
  )
}

export function QueueReviewModal({ documentId, onClose }: Props) {
  const { data: item, isLoading } = useQuery({
    queryKey: ['queue-item', documentId],
    queryFn:  () => getQueueItem(documentId),
  })

  const { data: accounts = [] } = useQuery({
    queryKey: ['accounts', item?.clientId],
    queryFn:  () => getAccounts(item!.clientId),
    enabled:  !!item?.clientId,
  })

  const [imageUrl, setImageUrl] = useState<string | null>(null)

  useEffect(() => {
    if (!item || item.isNoReceipt) return
    let cancelled = false
    getSignedUrl(documentId)
      .then(({ url }) => { if (!cancelled) setImageUrl(url) })
      .catch(() => {})
    return () => { cancelled = true }
  }, [documentId, item?.isNoReceipt])

  const [merchantName, setMerchantName] = useState('')
  const [date, setDate]                 = useState('')
  const [declaredType, setDeclaredType] = useState<'income' | 'expense'>('expense')
  const [paymentMethod, setPaymentMethod] = useState('')

  const [lines, setLines]               = useState<LineState[]>([])
  const [removedLineIds, setRemovedLineIds] = useState<Set<string>>(new Set())

  useEffect(() => {
    if (!item) return
    setMerchantName(item.merchantName ?? '')
    setDate(item.date ?? '')
    setDeclaredType(item.declaredType ?? 'expense')
    setPaymentMethod(item.paymentMethod ?? '')
    setLines(
      item.transactionLines.map((l) => ({
        id:          l.id,
        type:        l.type,
        accountId:   l.accountId ?? '',
        accountCode: l.accountCode ?? '',
        category:    l.category ?? '',
        amount:      String(l.amount ?? ''),
        description: l.description ?? '',
        date:        l.date ?? '',
      }))
    )
  }, [item])

  const [footerMode, setFooterMode]   = useState<'default' | 'reject' | 'return'>('default')
  const [rejectReason, setRejectReason] = useState('')
  const [returnNote, setReturnNote]   = useState('')
  const [submitting, setSubmitting]   = useState(false)
  const [toast, setToast]             = useState<string | null>(null)

  const showToast = (msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(null), 3000)
  }

  function updateLine(index: number, patch: Partial<LineState>) {
    setLines((prev) => prev.map((l, i) => (i === index ? { ...l, ...patch } : l)))
  }

  function removeLine(index: number) {
    const line = lines[index]
    if (line.id) setRemovedLineIds((prev) => new Set([...prev, line.id!]))
    setLines((prev) => prev.filter((_, i) => i !== index))
  }

  function addLine(type: 'income' | 'expense') {
    setLines((prev) => [
      ...prev,
      { type, accountId: '', accountCode: '', category: '', amount: '', description: '', date: '' },
    ])
  }

  const handleApprove = async () => {
    if (!item) return
    setSubmitting(true)
    try {
      const linePayloads: LinePayload[] = lines.map((l) => ({
        id:          l.id,
        type:        l.type,
        accountId:   l.accountId || null,
        accountCode: l.accountCode || null,
        category:    l.category || null,
        amount:      parseFloat(l.amount) || 0,
        description: l.description || null,
        date:        l.date || null,
      }))

      await approveItem(documentId, {
        fields: {
          merchantName:  merchantName || null,
          date:          date || null,
          declaredType,
          paymentMethod: paymentMethod || null,
        },
        lines:          linePayloads,
        removedLineIds: Array.from(removedLineIds),
      })

      showToast('Document approved.')
      setTimeout(onClose, 500)
    } catch {
      showToast('Approval failed. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  const handleReject = async () => {
    if (!rejectReason.trim()) return
    setSubmitting(true)
    try {
      await rejectItem(documentId, rejectReason)
      showToast('Document rejected.')
      setTimeout(onClose, 500)
    } catch {
      showToast('Rejection failed. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  const handleReturn = async () => {
    if (!returnNote.trim()) return
    setSubmitting(true)
    try {
      await returnItem(documentId, returnNote)
      showToast('Document returned for re-upload.')
      setTimeout(onClose, 500)
    } catch {
      showToast('Return failed. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  const incomeLines  = lines.map((l, i) => ({ ...l, index: i })).filter((l) => l.type === 'income')
  const expenseLines = lines.map((l, i) => ({ ...l, index: i })).filter((l) => l.type === 'expense')

  function aiHint(current: string, original: string | null | undefined) {
    if (!original || current === original) return null
    return <div className="text-[10px] text-amber-500 mt-0.5">AI: {original}</div>
  }

  const flagCls: Record<string, string> = {
    RED:    'bg-red-100 text-red-700',
    YELLOW: 'bg-yellow-100 text-yellow-700',
    GREEN:  'bg-green-100 text-green-700',
  }

  return (
    <>
      {toast && (
        <div className="fixed top-4 right-4 z-[60] px-4 py-2.5 bg-gray-900 text-white text-xs font-medium rounded-lg shadow-lg">
          {toast}
        </div>
      )}

      <Dialog open onOpenChange={(open) => { if (!open) onClose() }}>
        <DialogContent className="sm:max-w-5xl p-0 gap-0 overflow-hidden flex flex-col max-h-[90vh]">

          {/* Header */}
          <div className="px-6 pt-5 pb-4 pr-10 border-b border-gray-100 shrink-0 flex items-center justify-between">
            <div>
              <div className="text-[15px] font-bold text-gray-900">
                {item?.refNumber ?? `#${documentId.slice(0, 8)}`}
              </div>
              <div className="text-[11px] text-gray-500 mt-0.5">{item?.clientName}</div>
            </div>
            {item?.flag && (
              <span className={`inline-flex items-center text-[10px] font-semibold px-2 py-0.5 rounded-full ${flagCls[item.flag] ?? ''}`}>
                {item.flag}
              </span>
            )}
          </div>

          {/* Body */}
          {isLoading ? (
            <div className="flex-1 flex items-center justify-center text-sm text-gray-400 p-8">Loading…</div>
          ) : (
            <div className="flex divide-x divide-gray-100 overflow-hidden flex-1 min-h-0">

              {/* LEFT: receipt + fields */}
              <div className="w-2/5 p-5 overflow-y-auto space-y-4">
                {item?.isNoReceipt ? (
                  <div className="bg-gray-50 border border-dashed border-gray-200 rounded-lg py-10 text-center">
                    <div className="text-3xl mb-2">📋</div>
                    <div className="text-[11px] text-gray-400">Manual Entry — no receipt</div>
                  </div>
                ) : imageUrl ? (
                  <img src={imageUrl} alt="Receipt" className="w-full rounded-lg border border-gray-200 object-contain" />
                ) : (
                  <div className="bg-gray-100 rounded-lg h-48 flex items-center justify-center border border-gray-200">
                    <div className="text-3xl">🧾</div>
                  </div>
                )}

                <div className="space-y-3 border-t border-gray-100 pt-4">
                  <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">Document Fields</div>

                  <div>
                    <label className="block text-[11px] text-gray-500 mb-1">Merchant Name</label>
                    <input
                      type="text"
                      value={merchantName}
                      onChange={(e) => setMerchantName(e.target.value)}
                      className="w-full border border-gray-200 rounded-md px-2.5 py-1.5 text-xs text-gray-800"
                    />
                    {aiHint(merchantName, item?.merchantName)}
                  </div>

                  <div>
                    <label className="block text-[11px] text-gray-500 mb-1">Date</label>
                    <input
                      type="date"
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                      className="w-full border border-gray-200 rounded-md px-2.5 py-1.5 text-xs text-gray-800"
                    />
                    {aiHint(date, item?.date)}
                  </div>

                  <div>
                    <label className="block text-[11px] text-gray-500 mb-1">Declared Type</label>
                    <select
                      value={declaredType}
                      onChange={(e) => setDeclaredType(e.target.value as 'income' | 'expense')}
                      className="w-full border border-gray-200 rounded-md px-2.5 py-1.5 text-xs text-gray-800 bg-white"
                    >
                      <option value="income">Income</option>
                      <option value="expense">Expense</option>
                    </select>
                    {aiHint(declaredType, item?.declaredType ?? undefined)}
                  </div>

                  <div>
                    <label className="block text-[11px] text-gray-500 mb-1">Payment Method</label>
                    <select
                      value={paymentMethod}
                      onChange={(e) => setPaymentMethod(e.target.value)}
                      className="w-full border border-gray-200 rounded-md px-2.5 py-1.5 text-xs text-gray-800 bg-white"
                    >
                      <option value="">— Select —</option>
                      <option value="cash">Cash</option>
                      <option value="gcash">GCash</option>
                      <option value="maya">Maya</option>
                      <option value="bank">Bank</option>
                      <option value="check">Check</option>
                    </select>
                    {aiHint(paymentMethod, item?.paymentMethod ?? undefined)}
                  </div>
                </div>
              </div>

              {/* RIGHT: transaction lines + anomalies */}
              <div className="flex-1 p-5 overflow-y-auto space-y-4">

                <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">Transaction Lines</div>

                {/* Income */}
                <div>
                  <div className="text-xs font-semibold text-green-700 mb-2">Income</div>
                  {incomeLines.length === 0 && (
                    <div className="text-[11px] text-gray-400 mb-2">No income lines.</div>
                  )}
                  {incomeLines.map((l) => (
                    <LineRow
                      key={l.id ?? `new-${l.index}`}
                      line={l}
                      accounts={accounts}
                      isNew={!l.id}
                      onChange={(patch) => updateLine(l.index, patch)}
                      onRemove={() => removeLine(l.index)}
                    />
                  ))}
                  <button
                    onClick={() => addLine('income')}
                    className="text-[11px] text-indigo-600 hover:underline mt-1"
                  >
                    + Add income line
                  </button>
                </div>

                {/* Expense */}
                <div>
                  <div className="text-xs font-semibold text-red-700 mb-2">Expense</div>
                  {expenseLines.length === 0 && (
                    <div className="text-[11px] text-gray-400 mb-2">No expense lines.</div>
                  )}
                  {expenseLines.map((l) => (
                    <LineRow
                      key={l.id ?? `new-${l.index}`}
                      line={l}
                      accounts={accounts}
                      isNew={!l.id}
                      onChange={(patch) => updateLine(l.index, patch)}
                      onRemove={() => removeLine(l.index)}
                    />
                  ))}
                  <button
                    onClick={() => addLine('expense')}
                    className="text-[11px] text-indigo-600 hover:underline mt-1"
                  >
                    + Add expense line
                  </button>
                </div>

                {/* Anomaly reasons */}
                {item?.anomalyReasons && item.anomalyReasons.length > 0 && (
                  <div className="border-t border-gray-100 pt-4">
                    <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-2">
                      Anomaly Reasons
                    </div>
                    <ul className="space-y-1">
                      {item.anomalyReasons.map((r, i) => (
                        <li key={i} className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded px-3 py-1.5">
                          · {r}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Footer */}
          <div className="border-t border-gray-100 px-6 py-3 shrink-0">
            {footerMode === 'default' && (
              <div className="flex items-center justify-between">
                <button
                  onClick={() => setFooterMode('reject')}
                  className="border border-red-300 text-red-600 hover:bg-red-50 text-xs font-semibold px-4 py-2 rounded-lg transition-colors"
                >
                  Reject
                </button>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setFooterMode('return')}
                    className="border border-amber-400 text-amber-600 hover:bg-amber-50 text-xs font-semibold px-4 py-2 rounded-lg transition-colors"
                  >
                    Return for Re-upload
                  </button>
                  <button
                    onClick={handleApprove}
                    disabled={submitting}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold px-5 py-2 rounded-lg transition-colors disabled:opacity-50"
                  >
                    {submitting ? 'Approving…' : 'Approve'}
                  </button>
                </div>
              </div>
            )}

            {footerMode === 'reject' && (
              <div className="space-y-2">
                <div className="text-xs font-semibold text-gray-700">Reason for rejection</div>
                <textarea
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  rows={2}
                  className="w-full border border-gray-200 rounded-md px-3 py-2 text-xs resize-none"
                  placeholder="Enter rejection reason…"
                />
                <div className="flex justify-end gap-2">
                  <button
                    onClick={() => { setFooterMode('default'); setRejectReason('') }}
                    className="text-xs text-gray-500 hover:text-gray-700 px-3 py-1.5"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleReject}
                    disabled={!rejectReason.trim() || submitting}
                    className="bg-red-600 hover:bg-red-700 text-white text-xs font-semibold px-4 py-1.5 rounded-lg transition-colors disabled:opacity-50"
                  >
                    {submitting ? 'Rejecting…' : 'Confirm Reject'}
                  </button>
                </div>
              </div>
            )}

            {footerMode === 'return' && (
              <div className="space-y-2">
                <div className="text-xs font-semibold text-gray-700">Note for client</div>
                <textarea
                  value={returnNote}
                  onChange={(e) => setReturnNote(e.target.value)}
                  rows={2}
                  className="w-full border border-gray-200 rounded-md px-3 py-2 text-xs resize-none"
                  placeholder="Explain what needs to be corrected…"
                />
                <div className="flex justify-end gap-2">
                  <button
                    onClick={() => { setFooterMode('default'); setReturnNote('') }}
                    className="text-xs text-gray-500 hover:text-gray-700 px-3 py-1.5"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleReturn}
                    disabled={!returnNote.trim() || submitting}
                    className="bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold px-4 py-1.5 rounded-lg transition-colors disabled:opacity-50"
                  >
                    {submitting ? 'Returning…' : 'Confirm Return'}
                  </button>
                </div>
              </div>
            )}
          </div>

        </DialogContent>
      </Dialog>
    </>
  )
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd frontend && npx tsc --noEmit
```

Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/queue/QueueReviewModal.tsx
git commit -m "feat: add QueueReviewModal component"
```

---

### Task 8: Update QueuePageContent — replace Review button with modal

**Files:**
- Modify: `frontend/src/components/queue/QueuePageContent.tsx`

- [ ] **Step 1: Add `reviewingId` state, import modal, replace Review `<Link>` with `<button>`**

At the top of `frontend/src/components/queue/QueuePageContent.tsx`, add the import:

```typescript
import { QueueReviewModal } from './QueueReviewModal'
```

Remove the `import Link from 'next/link'` line (it is no longer used).

Inside the `QueuePageContent` function, add state after the existing state declarations:

```typescript
const [reviewingId, setReviewingId] = useState<string | null>(null)
```

Replace **all three** occurrences of the Review `<Link>` (in redItems, yellowItems, and greenItems map blocks). Each currently looks like:

```tsx
<Link href={`${reviewBasePath}/${item.documentId}`} className="text-[11px] font-semibold px-2.5 py-1 border border-gray-200 rounded text-gray-700 hover:bg-gray-50 transition-colors">
  Review
</Link>
```

Replace with:

```tsx
<button
  onClick={() => setReviewingId(item.documentId)}
  className="text-[11px] font-semibold px-2.5 py-1 border border-gray-200 rounded text-gray-700 hover:bg-gray-50 transition-colors"
>
  Review
</button>
```

At the bottom of the JSX return (just before the closing `</div>`), add the modal:

```tsx
{reviewingId && (
  <QueueReviewModal
    documentId={reviewingId}
    onClose={() => setReviewingId(null)}
  />
)}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd frontend && npx tsc --noEmit
```

Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/queue/QueuePageContent.tsx
git commit -m "feat: replace Review navigation with QueueReviewModal in queue page"
```

---

### Task 9: Update DocumentDetailModal — Reviewed Edits card

**Files:**
- Modify: `frontend/src/components/documents/DocumentDetailModal.tsx`

- [ ] **Step 1: Add `ReviewedEditsCard` component and render it for approved documents**

Add this component function to `frontend/src/components/documents/DocumentDetailModal.tsx`, after the `ExpiryCountdown` function (around line 263):

```tsx
const FIELD_LABELS: Record<string, string> = {
  merchantName:  'Merchant',
  date:          'Date',
  declaredType:  'Type',
  paymentMethod: 'Payment Method',
  accountCode:   'Account Code',
  category:      'Category',
}

function ReviewedEditsCard({ doc }: { doc: Document }) {
  const overrides = doc.fieldOverrides
  if (!overrides) return null

  const hasFields = overrides.fields.length > 0
  const hasLines  = overrides.lines.length > 0
  if (!hasFields && !hasLines) return null

  return (
    <div className="border border-amber-200 bg-amber-50 rounded-lg px-4 py-3">
      <div className="text-[10px] font-bold text-amber-700 uppercase tracking-wide mb-2">
        Reviewed Edits
      </div>
      <div className="space-y-1">
        {overrides.fields.map((f, i) => (
          <div key={i} className="flex items-baseline gap-1 text-xs">
            <span className="text-gray-500 w-28 shrink-0">{FIELD_LABELS[f.field] ?? f.field}</span>
            <span className="text-gray-400 line-through">{f.original}</span>
            <span className="text-gray-400 mx-0.5">→</span>
            <span className="text-gray-800 font-medium">{f.override}</span>
          </div>
        ))}
        {overrides.lines.map((l, i) => (
          <div key={i} className="flex items-baseline gap-1 text-xs">
            <span className="text-gray-500 w-28 shrink-0">
              Line {doc.transactionLines.findIndex((tl) => tl.id === l.lineId) + 1} {FIELD_LABELS[l.field] ?? l.field}
            </span>
            <span className="text-gray-400 line-through">{l.original}</span>
            <span className="text-gray-400 mx-0.5">→</span>
            <span className="text-gray-800 font-medium">{l.override}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
```

In the APPROVED status block (around line 368), add `<ReviewedEditsCard>` after `<TransactionLinesTable>`:

```tsx
{doc.status === 'APPROVED' && (
  <>
    <TransactionLinesTable doc={fullDoc} />
    <ReviewedEditsCard doc={fullDoc} />
    <div className="bg-green-50 border border-green-200 rounded-lg px-4 py-3 text-xs text-green-800">
      ✅ Approved and posted to your books.
    </div>
  </>
)}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd frontend && npx tsc --noEmit
```

Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/documents/DocumentDetailModal.tsx
git commit -m "feat: show Reviewed Edits card in DocumentDetailModal for approved documents"
```

---

### Self-review checklist

After all tasks are complete, verify:

- [ ] `GET /queue/{id}` returns `transactionLines` with `accountId`, `accountCode`, `accountName`, `date`
- [ ] `POST /queue/{id}/approve` with `fields`, `lines`, `removedLineIds` applies all changes
- [ ] `field_overrides` is stored when values differ from AI, null when they match
- [ ] `GET /documents/{id}` includes `fieldOverrides`
- [ ] `GET /documents/{id}/image` returns 200 for accountant role
- [ ] `QueueReviewModal` opens when Review button is clicked in queue table
- [ ] Account dropdown searches by code and name
- [ ] AI hint text appears only when field value differs from original
- [ ] Reject / Return / Approve footer panels work with inline confirmation
- [ ] `DocumentDetailModal` shows Reviewed Edits card on approved documents with `fieldOverrides`
- [ ] Full backend test suite passes: `cd backend && php artisan test`
- [ ] Frontend TypeScript compiles: `cd frontend && npx tsc --noEmit`
