# Backend — Multi-Line Transaction Support Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the single `account_id` on a document with a `transaction_lines` table so each document can carry multiple AI-classified line items (e.g. one receipt → "Service Revenue ₱500" + "Sales Revenue ₱500").

**Architecture:** A new `transaction_lines` table stores per-line data (description, amount, account code, AI-assigned category). `TransactionClassifier` is rewritten to return an array of lines. `ClassifyWithAI` creates `TransactionLine` records instead of writing `account_id`. `DocumentController` eager-loads lines and exposes `inflow`, `outflow`, and `transactionLines` in every list/detail response. `manualEntry()` is redesigned to accept one document with multiple lines (not one document per line).

**Tech Stack:** Laravel 11, PHP 8.2+, PostgreSQL 16, Eloquent, Anthropic SDK (Claude Haiku), PHPUnit.

**Pre-requisite:** The frontend changes (Task 1–8 of `docs/superpowers/plans/2026-05-29-upload-ui-line-items.md`) are already merged. The backend must expose the new `inflow`, `outflow`, and `transactionLines` fields that the frontend now expects.

---

## File Map

| File | Action |
|---|---|
| `backend/database/migrations/2026_05_29_000021_create_transaction_lines_table.php` | Create |
| `backend/app/Models/TransactionLine.php` | Create |
| `backend/app/Models/Document.php` | Modify — add `transactionLines()` relation |
| `backend/app/Services/AI/TransactionClassifier.php` | Rewrite |
| `backend/app/Jobs/ClassifyWithAI.php` | Modify — write `TransactionLine` records |
| `backend/app/Http/Requests/Document/ManualEntryRequest.php` | Rewrite |
| `backend/app/Http/Controllers/DocumentController.php` | Modify — `manualEntry()`, `index()`, `show()`, `clientDocuments()`, `toListItem()`, `toDetail()` |
| `backend/tests/Feature/TransactionLinesTest.php` | Create |

---

## Task 1 — Create `transaction_lines` migration

**Files:**
- Create: `backend/database/migrations/2026_05_29_000021_create_transaction_lines_table.php`

- [ ] **Step 1: Create the migration file**

```php
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('transaction_lines', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('document_id')
                  ->references('id')->on('documents')
                  ->cascadeOnDelete();
            $table->foreignUuid('account_id')
                  ->nullable()
                  ->references('id')->on('accounts')
                  ->nullOnDelete();
            $table->string('account_code')->nullable();
            $table->enum('type', ['income', 'expense']);
            $table->string('category')->nullable();
            $table->decimal('amount', 15, 2);
            $table->string('description')->nullable();
            $table->timestamps();

            $table->index('document_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('transaction_lines');
    }
};
```

Save this file as `backend/database/migrations/2026_05_29_000021_create_transaction_lines_table.php`.

- [ ] **Step 2: Run the migration**

```bash
cd backend && php artisan migrate
```

Expected output includes: `2026_05_29_000021_create_transaction_lines_table ........... DONE`

- [ ] **Step 3: Confirm the table exists**

```bash
cd backend && php artisan tinker --execute="echo Schema::hasTable('transaction_lines') ? 'OK' : 'MISSING';"
```

Expected: `OK`

- [ ] **Step 4: Commit**

```bash
git add backend/database/migrations/2026_05_29_000021_create_transaction_lines_table.php
git commit -m "feat: add transaction_lines migration"
```

---

## Task 2 — Create `TransactionLine` model

**Files:**
- Create: `backend/app/Models/TransactionLine.php`

- [ ] **Step 1: Create the model**

```php
<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class TransactionLine extends Model
{
    use HasUuids;

    protected $fillable = [
        'document_id',
        'account_id',
        'account_code',
        'type',
        'category',
        'amount',
        'description',
    ];

    protected $casts = [
        'amount' => 'decimal:2',
    ];

    public function document(): BelongsTo
    {
        return $this->belongsTo(Document::class);
    }

    public function account(): BelongsTo
    {
        return $this->belongsTo(Account::class);
    }
}
```

- [ ] **Step 2: Verify model resolves**

```bash
cd backend && php artisan tinker --execute="echo App\Models\TransactionLine::count();"
```

Expected: `0` (table exists and is empty)

- [ ] **Step 3: Commit**

```bash
git add backend/app/Models/TransactionLine.php
git commit -m "feat: add TransactionLine model"
```

---

## Task 3 — Add `transactionLines()` relation to `Document`

**Files:**
- Modify: `backend/app/Models/Document.php`

- [ ] **Step 1: Add the import and relation**

Add `HasMany` to the `use` imports at the top of `Document.php`:

```php
use Illuminate\Database\Eloquent\Relations\HasMany;
```

Then add this method after the `ocrResult()` method:

```php
public function transactionLines(): HasMany
{
    return $this->hasMany(TransactionLine::class);
}
```

- [ ] **Step 2: Verify relation resolves**

```bash
cd backend && php artisan tinker --execute="
\$d = App\Models\Document::first();
if (\$d) { echo \$d->transactionLines()->count() . ' lines'; } else { echo 'no documents yet'; }
"
```

Expected: `0 lines` or `no documents yet` — no error.

- [ ] **Step 3: Commit**

```bash
git add backend/app/Models/Document.php
git commit -m "feat: Document model — add transactionLines() relation"
```

---

## Task 4 — Rewrite `TransactionClassifier::classify()`

**Files:**
- Rewrite: `backend/app/Services/AI/TransactionClassifier.php`

The classifier now returns an **array of lines** instead of a single account code. The response shape changes from:

```json
{ "type": "...", "accountCode": "...", "category": "...", "confidence": 0.9, "cleanedFields": {} }
```

to:

```json
{
  "lines": [
    { "accountCode": "4001", "type": "income", "category": "Sales Revenue", "amount": 500.00, "description": "Product sales" }
  ],
  "totalAmount": 500.00,
  "confidence": 0.9,
  "cleanedFields": { "merchant": "...", "date": "...", "vat_amount": 0, "or_number": "..." }
}
```

- [ ] **Step 1: Replace the full file**

```php
<?php

namespace App\Services\AI;

use Anthropic\Client;
use App\Models\Company;

class TransactionClassifier
{
    public function classify(array $inputData, Company $company): array
    {
        $accounts = $company->accounts()->where('is_active', true)->get()
            ->map(fn($a) => "{$a->code}: {$a->name} ({$a->type})")
            ->join("\n");

        $vatStatus = $company->bir_type === 'vat' ? 'VAT-Registered' : 'Non-VAT';

        $systemPrompt = "You are a bookkeeping assistant for a Philippine SME. Your job is to " .
            "classify a transaction and suggest the correct account code(s) from the provided Chart of Accounts.\n" .
            "Client: {$company->name}\n" .
            "VAT Status: {$vatStatus}\n" .
            "Chart of Accounts:\n{$accounts}\n\n" .
            "Rules:\n" .
            "- Each line must use an accountCode from the Chart of Accounts above.\n" .
            "- sum(lines[].amount) MUST equal totalAmount.\n" .
            "- Use one line for simple single-purpose documents.\n" .
            "- Use multiple lines only when the document clearly covers multiple categories.\n" .
            "Respond ONLY with a JSON object. No explanation. No markdown. Raw JSON only.";

        $isOcrPath = array_key_exists('or_number', $inputData)
                  || array_key_exists('merchant', $inputData);

        if ($isOcrPath) {
            $userPrompt = "Clean and classify this transaction extracted from a receipt via OCR. " .
                "The text may be noisy — normalize dates to YYYY-MM-DD, amounts to float, " .
                "merchant names to proper case.\n" .
                "Raw OCR data: " . json_encode($inputData) . "\n\n" .
                "Return JSON with EXACTLY these keys:\n" .
                "{\n" .
                "  \"lines\": [\n" .
                "    {\n" .
                "      \"accountCode\": \"matching code from Chart of Accounts\",\n" .
                "      \"type\": \"income\" or \"expense\",\n" .
                "      \"category\": \"short category label\",\n" .
                "      \"amount\": 0.00,\n" .
                "      \"description\": \"brief description of what this line covers\"\n" .
                "    }\n" .
                "  ],\n" .
                "  \"totalAmount\": 0.00,\n" .
                "  \"confidence\": 0.0 to 1.0,\n" .
                "  \"cleanedFields\": {\n" .
                "    \"merchant\": \"cleaned name or null\",\n" .
                "    \"date\": \"YYYY-MM-DD or null\",\n" .
                "    \"vat_amount\": 0.00 or null,\n" .
                "    \"or_number\": \"string or null\"\n" .
                "  }\n" .
                "}";
        } else {
            // Manual entry path: lines array is already provided by the client
            $userPrompt = "The client has already split this transaction into lines. " .
                "Assign the correct account code and category to each line from the Chart of Accounts.\n" .
                "Transaction data: " . json_encode($inputData) . "\n\n" .
                "Return JSON with EXACTLY these keys:\n" .
                "{\n" .
                "  \"lines\": [\n" .
                "    {\n" .
                "      \"accountCode\": \"matching code from Chart of Accounts\",\n" .
                "      \"type\": \"income\" or \"expense\",\n" .
                "      \"category\": \"short category label\",\n" .
                "      \"amount\": 0.00,\n" .
                "      \"description\": \"same description as input\"\n" .
                "    }\n" .
                "  ],\n" .
                "  \"totalAmount\": 0.00,\n" .
                "  \"confidence\": 0.0 to 1.0,\n" .
                "  \"cleanedFields\": {}\n" .
                "}";
        }

        try {
            $client = new Client(apiKey: config('services.anthropic.key'));
            $response = $client->messages->create(
                maxTokens: 1024,
                messages:  [['role' => 'user', 'content' => $userPrompt]],
                model:     'claude-haiku-4-5-20251001',
                system:    $systemPrompt,
                temperature: 0.0,
            );

            $raw    = $response->content[0]->text;
            $result = json_decode($raw, true);

            if ($result === null || !isset($result['lines']) || !is_array($result['lines'])) {
                throw new \RuntimeException("Invalid AI response — expected 'lines' array: {$raw}");
            }

            return $result;
        } catch (\RuntimeException $e) {
            throw $e;
        } catch (\Exception $e) {
            throw new \RuntimeException("AI classification failed: " . $e->getMessage());
        }
    }
}
```

- [ ] **Step 2: Verify class loads**

```bash
cd backend && php artisan tinker --execute="new App\Services\AI\TransactionClassifier(); echo 'OK';"
```

Expected: `OK`

- [ ] **Step 3: Commit**

```bash
git add backend/app/Services/AI/TransactionClassifier.php
git commit -m "feat: TransactionClassifier — return multi-line response, bump maxTokens to 1024"
```

---

## Task 5 — Update `ClassifyWithAI` job

**Files:**
- Modify: `backend/app/Jobs/ClassifyWithAI.php`

Replace **Steps B, D, and E** of the `handle()` method. The key changes are:
1. Manual entry input now reads lines from `transactionLines()` relation (pre-created in Task 6 below)
2. After classification, create `TransactionLine` records instead of writing `account_id`

- [ ] **Step 1: Replace the full `handle()` method body**

The entire `handle()` method becomes:

```php
public function handle(): void
{
    // STEP A — Broadcast "ai" stage
    rescue(fn () => event(new DocumentStageUpdated(
        companyId:  $this->document->company_id,
        documentId: $this->document->id,
        stage:      'ai',
        status:     'processing',
        label:      'Categorizing...',
    )));

    // STEP B — Determine input data
    $company = $this->document->company;

    if ($this->document->is_no_receipt) {
        // Manual path: lines were pre-created by DocumentController::manualEntry()
        $lines = $this->document->transactionLines()->get();
        $inputData = [
            'declared_type' => $this->document->document_type,
            'date'          => $this->document->document_date?->format('Y-m-d'),
            'paymentMethod' => $this->document->payment_method,
            'lines'         => $lines->map(fn($l) => [
                'description' => $l->description,
                'amount'      => (float) $l->amount,
            ])->toArray(),
        ];
    } else {
        $inputData = $this->ocrResult;
    }

    // STEP C — Classify
    $classifier     = new TransactionClassifier();
    $classification = $classifier->classify($inputData, $company);

    // STEP D — Cross-check rules (upload area mismatch, low confidence)
    if (!$this->document->is_no_receipt) {
        $aiType = $classification['lines'][0]['type'] ?? null;
        if ($aiType && $this->document->document_type && $this->document->document_type !== $aiType) {
            $this->document->flag          = 'RED';
            $this->document->anomaly_reason = ['Upload area mismatch'];
        }
    } else {
        // Manual entries are always YELLOW (no receipt)
        $this->document->flag = 'YELLOW';
    }

    if (
        isset($classification['confidence']) &&
        $classification['confidence'] < 0.6 &&
        $this->document->flag !== 'RED'
    ) {
        $this->document->flag = 'YELLOW';
    }

    // STEP E — Write TransactionLine records (delete+recreate = safe re-run)
    $this->document->transactionLines()->delete();

    foreach ($classification['lines'] ?? [] as $line) {
        $accountId = Account::where('company_id', $company->id)
            ->where('code', $line['accountCode'])
            ->value('id');

        $this->document->transactionLines()->create([
            'account_id'   => $accountId,
            'account_code' => $line['accountCode'] ?? null,
            'type'         => $line['type'],
            'category'     => $line['category'] ?? null,
            'amount'       => $line['amount'],
            'description'  => $line['description'] ?? null,
        ]);
    }

    // Set document category to first line's category as a summary label
    $this->document->category = $classification['lines'][0]['category'] ?? $this->document->category;

    // Apply cleaned OCR fields (OCR path only)
    if (!$this->document->is_no_receipt && !empty($classification['cleanedFields'])) {
        $cleaned = $classification['cleanedFields'];
        $this->document->merchant_name = $cleaned['merchant']   ?? $this->document->merchant_name;
        $this->document->document_date = $cleaned['date']       ?? $this->document->document_date;
        $this->document->vat_amount    = $cleaned['vat_amount'] ?? $this->document->vat_amount;

        if (empty($this->document->ref_number) && !empty($cleaned['or_number'])) {
            $this->document->ref_number = $cleaned['or_number'];
        }

        // Set document amount from AI totalAmount (OCR path)
        if (isset($classification['totalAmount'])) {
            $this->document->amount = $classification['totalAmount'];
        }
    }

    $this->document->save();

    // STEP F — Dispatch DetectAnomalies
    DetectAnomalies::dispatch($this->document);
}
```

The `failed()` method is **unchanged** — leave it as-is.

- [ ] **Step 2: Verify the file has no syntax errors**

```bash
cd backend && php -l app/Jobs/ClassifyWithAI.php
```

Expected: `No syntax errors detected in app/Jobs/ClassifyWithAI.php`

- [ ] **Step 3: Commit**

```bash
git add backend/app/Jobs/ClassifyWithAI.php
git commit -m "feat: ClassifyWithAI — write TransactionLine records, read lines from pre-created rows for manual path"
```

---

## Task 6 — Rewrite `ManualEntryRequest` + `DocumentController::manualEntry()`

**Files:**
- Rewrite: `backend/app/Http/Requests/Document/ManualEntryRequest.php`
- Modify: `backend/app/Http/Controllers/DocumentController.php` (only the `manualEntry()` method)

The old format sent `{ entries: [{declared_type, date, amount, payment_method, note}] }` and created one document per entry. The new format sends `{ declared_type, date, payment_method, lines: [{description, amount}] }` and creates **one document** with the lines pre-stored.

The response changes from `{ documentIds: [] }` to `{ documentId: "uuid" }`.

- [ ] **Step 1: Replace `ManualEntryRequest.php`**

```php
<?php

namespace App\Http\Requests\Document;

use Illuminate\Foundation\Http\FormRequest;

class ManualEntryRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'declared_type'           => ['required', 'in:income,expense'],
            'date'                    => ['required', 'date', 'before_or_equal:today'],
            'payment_method'          => ['required', 'in:Cash,GCash,Maya,Bank'],
            'lines'                   => ['required', 'array', 'min:1', 'max:50'],
            'lines.*.description'     => ['required', 'string', 'max:500'],
            'lines.*.amount'          => ['required', 'numeric', 'min:0.01'],
        ];
    }

    public function messages(): array
    {
        return [
            'declared_type.required'       => 'Transaction type (income or expense) is required.',
            'declared_type.in'             => 'Type must be income or expense.',
            'date.required'                => 'Date is required.',
            'date.before_or_equal'         => 'Date cannot be in the future.',
            'payment_method.required'      => 'Payment method is required.',
            'payment_method.in'            => 'Payment method must be Cash, GCash, Maya, or Bank.',
            'lines.required'               => 'At least one line is required.',
            'lines.min'                    => 'At least one line is required.',
            'lines.*.description.required' => 'Each line must have a description.',
            'lines.*.amount.min'           => 'Each line amount must be greater than zero.',
        ];
    }
}
```

- [ ] **Step 2: Replace only the `manualEntry()` method in `DocumentController.php`**

Find the existing `manualEntry()` method and replace it entirely:

```php
public function manualEntry(ManualEntryRequest $request): JsonResponse
{
    $user       = auth()->user();
    $company    = Company::findOrFail($user->company_id);
    $refService = new RefSequenceService();
    $ref        = $refService->nextRef($company, 'MNL');

    $totalAmount = collect($request->lines)->sum('amount');

    $document = Document::create([
        'company_id'        => $company->id,
        'uploaded_by'       => $user->id,
        'original_filename' => 'manual-entry',
        'storage_path'      => '',
        'document_type'     => $request->declared_type,
        'status'            => 'processing',
        'internal_status'   => 'OCR_COMPLETE',
        'flag'              => null,
        'is_no_receipt'     => true,
        'is_ocr_failed'     => false,
        'ref_number'        => $ref,
        'file_hash'         => null,
        'document_date'     => $request->date,
        'amount'            => $totalAmount,
        'payment_method'    => $request->payment_method,
    ]);

    // Pre-create lines (description + amount only; AI will assign account codes)
    foreach ($request->lines as $line) {
        $document->transactionLines()->create([
            'type'        => $request->declared_type,
            'description' => $line['description'],
            'amount'      => $line['amount'],
        ]);
    }

    ClassifyWithAI::dispatch($document, null);

    rescue(fn () => event(new DocumentStageUpdated(
        companyId:  $company->id,
        documentId: $document->id,
        stage:      'ai',
        status:     'processing',
        label:      'Categorizing...',
    )));

    return response()->json(['documentId' => $document->id], 201);
}
```

- [ ] **Step 3: Verify no syntax errors**

```bash
cd backend && php -l app/Http/Requests/Document/ManualEntryRequest.php
cd backend && php -l app/Http/Controllers/DocumentController.php
```

Both expected: `No syntax errors detected`

- [ ] **Step 4: Commit**

```bash
git add backend/app/Http/Requests/Document/ManualEntryRequest.php
git add backend/app/Http/Controllers/DocumentController.php
git commit -m "feat: manualEntry() — single doc + multi-line format, returns documentId (singular)"
```

---

## Task 7 — Update `DocumentController` responses

**Files:**
- Modify: `backend/app/Http/Controllers/DocumentController.php`

Add `inflow`, `outflow`, `transactionLines` to API responses and eager-load lines to avoid N+1.

- [ ] **Step 1: Add eager loading to `index()`**

In `index()`, change:

```php
$documents = $query->latest()->get();
```

to:

```php
$documents = $query->with('transactionLines')->latest()->get();
```

- [ ] **Step 2: Add eager loading to `clientDocuments()`**

In `clientDocuments()`, change:

```php
$documents = $query->latest()->get();
```

to:

```php
$documents = $query->with('transactionLines')->latest()->get();
```

- [ ] **Step 3: Add eager loading to `show()`**

In `show()`, change:

```php
$document = Document::with(['company', 'ocrResult'])->findOrFail($id);
```

to:

```php
$document = Document::with(['company', 'ocrResult', 'transactionLines.account'])->findOrFail($id);
```

- [ ] **Step 4: Update `toListItem()` to include `inflow` and `outflow`**

Replace the `toListItem()` method:

```php
private function toListItem(Document $d): array
{
    $inflow  = (float) $d->transactionLines->where('type', 'income')->sum('amount');
    $outflow = (float) $d->transactionLines->where('type', 'expense')->sum('amount');

    return [
        'id'              => $d->id,
        'companyId'       => $d->company_id,
        'declaredType'    => $d->document_type,
        'status'          => strtoupper($d->status),
        'flag'            => $d->flag,
        'anomalyReasons'  => $d->anomaly_reason ?? [],
        'merchantName'    => $d->merchant_name,
        'date'            => $d->document_date?->toDateString(),
        'amount'          => $d->amount,
        'vatAmount'       => $d->vat_amount,
        'category'        => $d->category,
        'paymentMethod'   => $d->payment_method,
        'imageUrl'        => null,
        'isNoReceipt'     => $d->is_no_receipt,
        'isOcrFailed'     => $d->is_ocr_failed,
        'returnNote'      => $d->return_note,
        'rejectionReason' => $d->rejection_reason,
        'expiresAt'       => $d->expires_at?->toIso8601String(),
        'refNumber'       => $d->ref_number,
        'note'            => $d->note,
        'inflow'          => $inflow,
        'outflow'         => $outflow,
        'createdAt'       => $d->created_at?->toIso8601String(),
        'updatedAt'       => $d->updated_at?->toIso8601String(),
    ];
}
```

- [ ] **Step 5: Update `toDetail()` to include `transactionLines`**

Replace the `toDetail()` method:

```php
private function toDetail(Document $d): array
{
    return array_merge($this->toListItem($d), [
        'internalStatus'   => $d->internal_status,
        'approvedAt'       => $d->approved_at?->toIso8601String(),
        'returnedAt'       => $d->returned_at?->toIso8601String(),
        'rejectedAt'       => $d->rejected_at?->toIso8601String(),
        'ocrResult'        => $d->ocrResult ? [
            'merchant'   => $d->ocrResult->extracted_data['merchant'] ?? null,
            'date'       => $d->ocrResult->extracted_data['date'] ?? null,
            'amount'     => $d->ocrResult->extracted_data['amount'] ?? null,
            'vatAmount'  => $d->ocrResult->extracted_data['vat_amount'] ?? null,
            'orNumber'   => $d->ocrResult->extracted_data['or_number'] ?? null,
            'tin'        => $d->ocrResult->extracted_data['tin'] ?? null,
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
        ])->values()->all(),
    ]);
}
```

- [ ] **Step 6: Verify syntax**

```bash
cd backend && php -l app/Http/Controllers/DocumentController.php
```

Expected: `No syntax errors detected`

- [ ] **Step 7: Commit**

```bash
git add backend/app/Http/Controllers/DocumentController.php
git commit -m "feat: DocumentController — add inflow, outflow, transactionLines to responses + eager loading"
```

---

## Task 8 — Feature tests

**Files:**
- Create: `backend/tests/Feature/TransactionLinesTest.php`

- [ ] **Step 1: Create the test file**

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

class TransactionLinesTest extends TestCase
{
    use RefreshDatabase;

    private User $client;
    private Company $company;

    protected function setUp(): void
    {
        parent::setUp();

        $this->company = Company::factory()->create([
            'bir_type' => 'non_vat',
        ]);

        $this->client = User::factory()->create([
            'role'       => 'client',
            'company_id' => $this->company->id,
        ]);
    }

    public function test_document_list_includes_inflow_and_outflow(): void
    {
        $doc = Document::factory()->create([
            'company_id'   => $this->company->id,
            'document_type' => 'income',
            'status'        => 'approved',
        ]);

        TransactionLine::factory()->create([
            'document_id' => $doc->id,
            'type'        => 'income',
            'amount'      => 500.00,
        ]);

        TransactionLine::factory()->create([
            'document_id' => $doc->id,
            'type'        => 'income',
            'amount'      => 300.00,
        ]);

        $response = $this->actingAs($this->client)
            ->getJson('/api/documents');

        $response->assertOk();
        $response->assertJsonFragment([
            'inflow'  => 800.0,
            'outflow' => 0.0,
        ]);
    }

    public function test_document_detail_includes_transaction_lines(): void
    {
        $account = Account::factory()->create([
            'company_id'  => $this->company->id,
            'code'        => '4001',
            'name'        => 'Sales Revenue',
            'type'        => 'income',
        ]);

        $doc = Document::factory()->create([
            'company_id'   => $this->company->id,
            'document_type' => 'income',
            'status'        => 'approved',
        ]);

        TransactionLine::factory()->create([
            'document_id'  => $doc->id,
            'account_id'   => $account->id,
            'account_code' => '4001',
            'type'         => 'income',
            'category'     => 'Sales Revenue',
            'amount'       => 1000.00,
            'description'  => 'Product sales',
        ]);

        $response = $this->actingAs($this->client)
            ->getJson("/api/documents/{$doc->id}");

        $response->assertOk();
        $response->assertJsonCount(1, 'transactionLines');
        $response->assertJsonFragment([
            'accountCode' => '4001',
            'accountName' => 'Sales Revenue',
            'type'        => 'income',
            'amount'      => 1000.0,
            'description' => 'Product sales',
        ]);
    }

    public function test_manual_entry_new_format_creates_one_document_with_lines(): void
    {
        $payload = [
            'declared_type'  => 'expense',
            'date'           => '2026-05-29',
            'payment_method' => 'Cash',
            'lines'          => [
                ['description' => 'Bayad kuryente', 'amount' => 200.00],
                ['description' => 'Office supplies', 'amount' => 150.00],
            ],
        ];

        $response = $this->actingAs($this->client)
            ->postJson('/api/documents/manual', $payload);

        $response->assertCreated();
        $response->assertJsonStructure(['documentId']);

        // One document created (not two)
        $this->assertDatabaseCount('documents', 1);

        $docId = $response->json('documentId');

        // Two pre-classification lines created
        $this->assertDatabaseCount('transaction_lines', 2);
        $this->assertDatabaseHas('transaction_lines', [
            'document_id' => $docId,
            'description' => 'Bayad kuryente',
            'amount'      => '200.00',
            'type'        => 'expense',
        ]);
        $this->assertDatabaseHas('transaction_lines', [
            'document_id' => $docId,
            'description' => 'Office supplies',
            'amount'      => '150.00',
            'type'        => 'expense',
        ]);
    }

    public function test_manual_entry_old_format_is_rejected(): void
    {
        // Old format with 'entries' array should now fail validation
        $payload = [
            'entries' => [
                ['declared_type' => 'expense', 'date' => '2026-05-29', 'amount' => 200, 'payment_method' => 'Cash'],
            ],
        ];

        $response = $this->actingAs($this->client)
            ->postJson('/api/documents/manual', $payload);

        $response->assertUnprocessable(); // 422
    }

    public function test_outflow_zero_for_income_document(): void
    {
        $doc = Document::factory()->create([
            'company_id'   => $this->company->id,
            'document_type' => 'income',
            'status'        => 'parked',
        ]);

        TransactionLine::factory()->create([
            'document_id' => $doc->id,
            'type'        => 'income',
            'amount'      => 750.00,
        ]);

        $response = $this->actingAs($this->client)
            ->getJson('/api/documents');

        $response->assertJsonFragment([
            'inflow'  => 750.0,
            'outflow' => 0.0,
        ]);
    }
}
```

- [ ] **Step 2: Create the necessary factories if they don't exist**

Check for existing factories:

```bash
ls backend/database/factories/
```

If `TransactionLineFactory.php` is missing, create it:

```php
<?php

namespace Database\Factories;

use App\Models\Document;
use Illuminate\Database\Eloquent\Factories\Factory;

class TransactionLineFactory extends Factory
{
    public function definition(): array
    {
        return [
            'document_id'  => Document::factory(),
            'account_id'   => null,
            'account_code' => null,
            'type'         => $this->faker->randomElement(['income', 'expense']),
            'category'     => $this->faker->words(2, true),
            'amount'       => $this->faker->randomFloat(2, 10, 5000),
            'description'  => $this->faker->sentence(3),
        ];
    }
}
```

Save as `backend/database/factories/TransactionLineFactory.php`.

Then add `HasFactory` to `TransactionLine.php`:

```php
use Illuminate\Database\Eloquent\Factories\HasFactory;

class TransactionLine extends Model
{
    use HasUuids, HasFactory;
    // ...
}
```

- [ ] **Step 3: Check for missing Document/Company/User/Account factories**

```bash
ls backend/database/factories/
```

If `DocumentFactory.php`, `CompanyFactory.php`, `UserFactory.php`, or `AccountFactory.php` are missing, check the existing `DatabaseSeeder.php` and factories. If they don't exist, create minimal versions. A minimal `DocumentFactory`:

```php
<?php

namespace Database\Factories;

use App\Models\Company;
use Illuminate\Database\Eloquent\Factories\Factory;

class DocumentFactory extends Factory
{
    public function definition(): array
    {
        return [
            'company_id'        => Company::factory(),
            'uploaded_by'       => null,
            'original_filename' => $this->faker->word . '.jpg',
            'storage_path'      => 'documents/' . $this->faker->uuid . '.jpg',
            'file_hash'         => $this->faker->sha256,
            'file_type'         => 'jpg',
            'document_type'     => $this->faker->randomElement(['income', 'expense']),
            'status'            => 'parked',
            'internal_status'   => 'OCR_COMPLETE',
            'flag'              => 'GREEN',
            'is_no_receipt'     => false,
            'is_ocr_failed'     => false,
            'document_date'     => now()->toDateString(),
            'amount'            => $this->faker->randomFloat(2, 50, 10000),
        ];
    }
}
```

A minimal `CompanyFactory`:

```php
<?php

namespace Database\Factories;

use Illuminate\Database\Eloquent\Factories\Factory;

class CompanyFactory extends Factory
{
    public function definition(): array
    {
        return [
            'name'         => $this->faker->company,
            'mobile'       => '09' . $this->faker->numerify('#########'),
            'bir_type'     => 'non_vat',
            'plan'         => 'starter',
            'accountant_id' => null,
        ];
    }
}
```

A minimal `AccountFactory`:

```php
<?php

namespace Database\Factories;

use App\Models\Company;
use Illuminate\Database\Eloquent\Factories\Factory;

class AccountFactory extends Factory
{
    public function definition(): array
    {
        return [
            'company_id'        => Company::factory(),
            'code'              => $this->faker->unique()->numerify('####'),
            'name'              => $this->faker->words(2, true),
            'type'              => $this->faker->randomElement(['income', 'expense']),
            'is_system_managed' => false,
            'is_active'         => true,
        ];
    }
}
```

**Note:** If `User::factory()` already exists (from the initial seeder setup), use it as-is. If any factory already exists for a model, do NOT create a duplicate — skip that step.

- [ ] **Step 4: Run the tests**

```bash
cd backend && php artisan test tests/Feature/TransactionLinesTest.php --stop-on-failure
```

Expected: `4 tests, N assertions` — all passing. Fix any failures before committing.

- [ ] **Step 5: Commit**

```bash
git add backend/tests/Feature/TransactionLinesTest.php
git add backend/database/factories/
git add backend/app/Models/TransactionLine.php   # HasFactory addition
git commit -m "test: TransactionLinesTest — inflow/outflow, detail lines, new manual entry format"
```

---

## Self-Review Checklist

| Spec requirement (from handoff.md) | Covered by |
|---|---|
| `transaction_lines` migration with all columns | Task 1 |
| `TransactionLine` model with `HasUuids`, `document()`, `account()` | Task 2 |
| `Document::transactionLines()` `HasMany` relation | Task 3 |
| `TransactionClassifier` returns `lines[]` array | Task 4 |
| `maxTokens` bumped to 1024 | Task 4 |
| `ClassifyWithAI` deletes+recreates `TransactionLine` records | Task 5 |
| `ClassifyWithAI` manual path reads pre-created lines from DB | Task 5 |
| Old `account_id` write removed from `ClassifyWithAI` | Task 5 |
| `document.category` set from first line | Task 5 |
| `manualEntry()` accepts new `{declared_type, date, payment_method, lines[]}` format | Task 6 |
| `manualEntry()` creates one document + pre-classified lines | Task 6 |
| `manualEntry()` returns `{documentId}` singular | Task 6 |
| `index()` and `clientDocuments()` eager-load `transactionLines` | Task 7 |
| `show()` eager-loads `transactionLines.account` | Task 7 |
| `toListItem()` includes `inflow` and `outflow` | Task 7 |
| `toDetail()` includes `transactionLines[]` with all fields | Task 7 |
| `documents.account_id` column left in DB (not dropped) | Not applicable — no migration drops it |
