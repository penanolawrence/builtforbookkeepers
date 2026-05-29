# TransactionClassifier — Tool Use + Per-Line Date Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace `TransactionClassifier`'s fragile `json_decode(raw text)` approach with Claude tool use so line items are always generated reliably, add a `date` column to `transaction_lines` so each line has its own authoritative posting date.

**Architecture:** `TransactionClassifier` is rewritten to define a `classify_transaction` tool and force Claude to call it (`tool_choice: force`), eliminating JSON parse failures entirely. The OCR prompt is rebuilt using the `header`/`body`/`footer` sections the OCR service already produces. Claude returns `date` per line; `ClassifyWithAI` falls back to `document_date` when Claude returns null. A new migration adds the nullable `date` column; `TransactionLine` model gains the cast.

**Tech Stack:** Laravel 11, PHP 8.2+, Anthropic PHP SDK, PHPUnit, PostgreSQL.

**Spec:** `docs/superpowers/specs/2026-05-29-claude-tool-use-classifier-design.md`

---

## File Map

| File | Action |
|---|---|
| `backend/database/migrations/2026_05_29_000022_add_date_to_transaction_lines_table.php` | Create |
| `backend/app/Models/TransactionLine.php` | Modify — add `date` to `$fillable` + `$casts` |
| `backend/app/Services/AI/TransactionClassifier.php` | Full rewrite |
| `backend/tests/Unit/TransactionClassifierTest.php` | Create |
| `backend/app/Jobs/ClassifyWithAI.php` | Modify — read `document` key, write `date` per line |
| `backend/tests/Feature/TransactionLinesTest.php` | Modify — add date tests |

---

## Task 1 — Add `date` column to `transaction_lines`

**Files:**
- Create: `backend/database/migrations/2026_05_29_000022_add_date_to_transaction_lines_table.php`

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
        Schema::table('transaction_lines', function (Blueprint $table) {
            $table->date('date')->nullable()->after('description');
        });
    }

    public function down(): void
    {
        Schema::table('transaction_lines', function (Blueprint $table) {
            $table->dropColumn('date');
        });
    }
};
```

Save as `backend/database/migrations/2026_05_29_000022_add_date_to_transaction_lines_table.php`.

- [ ] **Step 2: Run the migration**

```bash
cd backend && php artisan migrate
```

Expected output includes: `2026_05_29_000022_add_date_to_transaction_lines_table ......... DONE`

- [ ] **Step 3: Verify the column exists**

```bash
cd backend && php artisan tinker --execute="echo Schema::hasColumn('transaction_lines', 'date') ? 'OK' : 'MISSING';"
```

Expected: `OK`

- [ ] **Step 4: Commit**

```bash
git add backend/database/migrations/2026_05_29_000022_add_date_to_transaction_lines_table.php
git commit -m "feat: add date column to transaction_lines"
```

---

## Task 2 — Update `TransactionLine` model

**Files:**
- Modify: `backend/app/Models/TransactionLine.php`

- [ ] **Step 1: Add `date` to `$fillable` and `$casts`**

Replace the entire file:

```php
<?php

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
        'category',
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
}
```

- [ ] **Step 2: Verify the model loads**

```bash
cd backend && php artisan tinker --execute="echo App\Models\TransactionLine::count() . ' lines';"
```

Expected: `0 lines` (or however many exist — no error).

- [ ] **Step 3: Commit**

```bash
git add backend/app/Models/TransactionLine.php
git commit -m "feat: TransactionLine — add date to fillable and casts"
```

---

## Task 3 — Write unit tests for `TransactionClassifier` (TDD — write first)

**Files:**
- Create: `backend/tests/Unit/TransactionClassifierTest.php`

These tests verify the prompt content and tool schema without making real API calls. They use a subclass that overrides a protected `callApi()` method (added in Task 4) to return a fake response.

- [ ] **Step 1: Create the test file**

```php
<?php

namespace Tests\Unit;

use App\Models\Company;
use App\Services\AI\TransactionClassifier;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class TransactionClassifierTest extends TestCase
{
    use RefreshDatabase;

    // -----------------------------------------------------------------------
    // Fake response helpers
    // -----------------------------------------------------------------------

    private function fakeToolResponse(array $lines, array $document = []): object
    {
        $block = (object) [
            'type'  => 'tool_use',
            'name'  => 'classify_transaction',
            'input' => [
                'document' => array_merge([
                    'merchant'     => 'TEST STORE',
                    'date'         => '2026-05-29',
                    'total_amount' => array_sum(array_column($lines, 'amount')),
                    'vat_amount'   => null,
                    'or_number'    => null,
                ], $document),
                'lines'      => $lines,
                'confidence' => 0.95,
            ],
        ];

        return (object) ['content' => [$block]];
    }

    private function defaultLine(array $overrides = []): array
    {
        return array_merge([
            'description'  => 'Test item',
            'amount'       => 100.00,
            'account_code' => '4001',
            'type'         => 'income',
            'category'     => 'Sales Revenue',
            'date'         => '2026-05-29',
        ], $overrides);
    }

    private function makeCompany(): Company
    {
        return Company::factory()->create(['bir_type' => 'non_vat']);
    }

    // -----------------------------------------------------------------------
    // Spy subclass — captures params sent to Claude, returns fake response
    // -----------------------------------------------------------------------

    private function makeClassifier(mixed $fakeResponse): TransactionClassifier
    {
        return new class($fakeResponse) extends TransactionClassifier {
            public array $capturedParams = [];

            public function __construct(private mixed $fakeResp)
            {
                // skip parent constructor — no real client needed
            }

            protected function callApi(array $params): mixed
            {
                $this->capturedParams = $params;
                return $this->fakeResp;
            }
        };
    }

    // -----------------------------------------------------------------------
    // Tests
    // -----------------------------------------------------------------------

    public function test_classify_returns_lines_and_document_from_tool_response(): void
    {
        $company  = $this->makeCompany();
        $response = $this->fakeToolResponse([$this->defaultLine()]);
        $cls      = $this->makeClassifier($response);

        $result = $cls->classify(['raw_text' => 'TEST', 'header' => [], 'body' => [], 'footer' => []], $company);

        $this->assertArrayHasKey('lines', $result);
        $this->assertArrayHasKey('document', $result);
        $this->assertCount(1, $result['lines']);
        $this->assertEquals('4001', $result['lines'][0]['account_code']);
    }

    public function test_classify_throws_when_no_tool_block_returned(): void
    {
        $company      = $this->makeCompany();
        $fakeResponse = (object) ['content' => [(object) ['type' => 'text', 'text' => 'oops']]];
        $cls          = $this->makeClassifier($fakeResponse);

        $this->expectException(\RuntimeException::class);
        $this->expectExceptionMessageMatches('/classify_transaction/');

        $cls->classify(['raw_text' => 'TEST', 'header' => [], 'body' => [], 'footer' => []], $company);
    }

    public function test_ocr_prompt_includes_header_body_footer_sections(): void
    {
        $company = $this->makeCompany();
        $cls     = $this->makeClassifier($this->fakeToolResponse([$this->defaultLine()]));

        $cls->classify([
            'raw_text' => 'ignored',
            'header'   => ['JOLLIBEE FOOD CORP', 'TIN: 001-234-567'],
            'body'     => ['Chicken Joy x2', '220.00'],
            'footer'   => ['Total: 220.00', 'OR No: 9999'],
        ], $company);

        $userMessage = $cls->capturedParams['messages'][0]['content'];

        $this->assertStringContainsString('HEADER', $userMessage);
        $this->assertStringContainsString('JOLLIBEE FOOD CORP', $userMessage);
        $this->assertStringContainsString('BODY', $userMessage);
        $this->assertStringContainsString('Chicken Joy x2', $userMessage);
        $this->assertStringContainsString('FOOTER', $userMessage);
        $this->assertStringContainsString('OR No: 9999', $userMessage);
    }

    public function test_ocr_prompt_falls_back_to_raw_text_when_sections_empty(): void
    {
        $company = $this->makeCompany();
        $cls     = $this->makeClassifier($this->fakeToolResponse([$this->defaultLine()]));

        $cls->classify([
            'raw_text' => 'SOME RAW TEXT HERE',
            'header'   => [],
            'body'     => [],
            'footer'   => [],
        ], $company);

        $userMessage = $cls->capturedParams['messages'][0]['content'];
        $this->assertStringContainsString('SOME RAW TEXT HERE', $userMessage);
    }

    public function test_manual_prompt_includes_lines_and_date_extraction_instruction(): void
    {
        $company = $this->makeCompany();
        $cls     = $this->makeClassifier($this->fakeToolResponse([$this->defaultLine()]));

        $cls->classify([
            'declared_type' => 'expense',
            'date'          => '2026-05-29',
            'paymentMethod' => 'Cash',
            'lines'         => [['description' => 'kita kahapon 2026-05-28', 'amount' => 500]],
        ], $company);

        $userMessage = $cls->capturedParams['messages'][0]['content'];
        $this->assertStringContainsString('kita kahapon', $userMessage);
        $this->assertStringContainsString('date', strtolower($userMessage));
    }

    public function test_tool_schema_enforces_date_per_line_and_required_fields(): void
    {
        $company = $this->makeCompany();
        $cls     = $this->makeClassifier($this->fakeToolResponse([$this->defaultLine()]));

        $cls->classify(['raw_text' => 'x', 'header' => [], 'body' => [], 'footer' => []], $company);

        $tools      = $cls->capturedParams['tools'];
        $this->assertCount(1, $tools);
        $schema     = $tools[0]['input_schema'];
        $lineProps  = $schema['properties']['lines']['items']['properties'];

        $this->assertArrayHasKey('date', $lineProps);
        $this->assertArrayHasKey('account_code', $lineProps);
        $this->assertContains('income', $lineProps['type']['enum']);
        $this->assertContains('expense', $lineProps['type']['enum']);

        // tool_choice must force the tool
        $this->assertEquals(['type' => 'tool', 'name' => 'classify_transaction'], $cls->capturedParams['tool_choice']);
    }

    public function test_per_line_date_is_returned_in_result(): void
    {
        $company = $this->makeCompany();
        $lines   = [
            $this->defaultLine(['date' => '2026-05-25', 'amount' => 2500.00]),
            $this->defaultLine(['date' => '2026-05-26', 'amount' => 3000.00]),
        ];
        $cls = $this->makeClassifier($this->fakeToolResponse($lines, ['total_amount' => 5500.00]));

        $result = $cls->classify(['raw_text' => 'x', 'header' => [], 'body' => [], 'footer' => []], $company);

        $this->assertEquals('2026-05-25', $result['lines'][0]['date']);
        $this->assertEquals('2026-05-26', $result['lines'][1]['date']);
    }
}
```

- [ ] **Step 2: Run the tests — they must FAIL (TransactionClassifier not rewritten yet)**

```bash
cd backend && php artisan test tests/Unit/TransactionClassifierTest.php --stop-on-failure
```

Expected: test failures — `callApi` method not found, or similar. This confirms TDD red phase.

- [ ] **Step 3: Commit the failing tests**

```bash
git add backend/tests/Unit/TransactionClassifierTest.php
git commit -m "test: TransactionClassifier unit tests (red — awaiting implementation)"
```

---

## Task 4 — Rewrite `TransactionClassifier`

**Files:**
- Rewrite: `backend/app/Services/AI/TransactionClassifier.php`

- [ ] **Step 1: Replace the full file**

```php
<?php

namespace App\Services\AI;

use Anthropic\Client;
use App\Models\Company;

class TransactionClassifier
{
    private Client $client;

    public function __construct(?Client $client = null)
    {
        $this->client = $client ?? new Client(apiKey: config('services.anthropic.key'));
    }

    public function classify(array $inputData, Company $company): array
    {
        $accounts = $company->accounts()->where('is_active', true)->get()
            ->map(fn($a) => "{$a->code}: {$a->name} ({$a->type})")
            ->join("\n");

        $vatStatus = $company->bir_type === 'vat' ? 'VAT-Registered' : 'Non-VAT';

        $systemPrompt =
            "You are a bookkeeping assistant for a Philippine SME.\n" .
            "Client: {$company->name}\n" .
            "VAT Status: {$vatStatus}\n" .
            "Chart of Accounts:\n{$accounts}\n\n" .
            "Rules:\n" .
            "- Each line must use an account_code from the Chart of Accounts above.\n" .
            "- sum(lines[].amount) MUST equal document.total_amount.\n" .
            "- Use one line for simple single-purpose documents.\n" .
            "- Use multiple lines when the document clearly covers multiple categories or multiple dates.\n" .
            "- For each line, always try to assign a date (YYYY-MM-DD). " .
            "For multi-date documents (e.g. daily sales records), each row has its own date. " .
            "For manual entries, extract any date mentioned in the description text " .
            "(e.g. 'kita kahapon 2026-05-28' → date: '2026-05-28'). " .
            "Return null only if you truly cannot determine the date for that specific line.";

        $isOcrPath   = array_key_exists('raw_text', $inputData);
        $userPrompt  = $isOcrPath
            ? $this->buildOcrPrompt($inputData)
            : $this->buildManualPrompt($inputData);

        try {
            $response = $this->callApi([
                'maxTokens'   => 1536,
                'messages'    => [['role' => 'user', 'content' => $userPrompt]],
                'model'       => 'claude-haiku-4-5-20251001',
                'system'      => $systemPrompt,
                'temperature' => 0.0,
                'tools'       => [$this->buildTool()],
                'tool_choice' => ['type' => 'tool', 'name' => 'classify_transaction'],
            ]);

            $toolBlock = collect($response->content)
                ->first(fn($c) => $c->type === 'tool_use');

            if (!$toolBlock || $toolBlock->name !== 'classify_transaction') {
                throw new \RuntimeException("Claude did not call classify_transaction tool");
            }

            $result = (array) $toolBlock->input;

            if (empty($result['lines']) || !is_array($result['lines'])) {
                throw new \RuntimeException("classify_transaction tool returned no lines");
            }

            return $result;

        } catch (\RuntimeException $e) {
            throw $e;
        } catch (\Exception $e) {
            throw new \RuntimeException("AI classification failed: " . $e->getMessage());
        }
    }

    protected function callApi(array $params): mixed
    {
        return $this->client->messages->create(
            maxTokens:   $params['maxTokens'],
            messages:    $params['messages'],
            model:       $params['model'],
            system:      $params['system'],
            temperature: $params['temperature'],
            tools:       $params['tools'],
            tool_choice: $params['tool_choice'],
        );
    }

    private function buildOcrPrompt(array $inputData): string
    {
        $sections = [];

        if (!empty($inputData['header'])) {
            $sections[] = "HEADER (store name, address, BIR TIN):\n" .
                          implode("\n", $inputData['header']);
        }
        if (!empty($inputData['body'])) {
            $sections[] = "BODY (items, quantities, unit prices):\n" .
                          implode("\n", $inputData['body']);
        }
        if (!empty($inputData['footer'])) {
            $sections[] = "FOOTER (totals, VAT, OR number):\n" .
                          implode("\n", $inputData['footer']);
        }

        if (empty($sections)) {
            $sections[] = "Full receipt text:\n" . ($inputData['raw_text'] ?? '');
        }

        return "You are reading a receipt photographed by a Philippine SME client.\n" .
               "The text below was extracted by OCR — it may contain noise or misread characters.\n\n" .
               "Receipt sections:\n\n" . implode("\n\n", $sections) . "\n\n" .
               "Extract all structured fields and classify the transaction " .
               "using the classify_transaction tool.";
    }

    private function buildManualPrompt(array $inputData): string
    {
        return "The client has manually entered this transaction. " .
               "Assign the correct account_code and category to each line from the Chart of Accounts. " .
               "Also extract any dates mentioned in the description text " .
               "(e.g. 'kita kahapon 2026-05-28' → date: '2026-05-28').\n\n" .
               "Transaction data: " . json_encode($inputData) . "\n\n" .
               "Classify using the classify_transaction tool. " .
               "For document.merchant, document.date, document.or_number — return null " .
               "(those fields are already set on the document).";
    }

    private function buildTool(): array
    {
        return [
            'name'         => 'classify_transaction',
            'description'  => 'Classify a Philippine SME transaction and return structured line items.',
            'input_schema' => [
                'type'       => 'object',
                'required'   => ['document', 'lines', 'confidence'],
                'properties' => [

                    'document' => [
                        'type'       => 'object',
                        'required'   => ['total_amount'],
                        'properties' => [
                            'merchant'     => ['type' => ['string', 'null'],
                                              'description' => 'Business or store name, or null'],
                            'date'         => ['type' => ['string', 'null'],
                                              'description' => 'YYYY-MM-DD or null'],
                            'total_amount' => ['type' => 'number',  'minimum' => 0.01,
                                              'description' => 'Final total amount on the document'],
                            'vat_amount'   => ['type' => ['number', 'null'], 'minimum' => 0],
                            'or_number'    => ['type' => ['string', 'null'],
                                              'description' => 'Official Receipt or invoice number'],
                        ],
                    ],

                    'lines' => [
                        'type'     => 'array',
                        'minItems' => 1,
                        'items'    => [
                            'type'       => 'object',
                            'required'   => ['description', 'amount', 'account_code', 'type', 'category'],
                            'properties' => [
                                'description'  => ['type' => 'string',
                                                   'description' => 'What this line covers'],
                                'amount'       => ['type' => 'number', 'minimum' => 0.01],
                                'account_code' => ['type' => 'string',
                                                   'description' => 'Code from the Chart of Accounts'],
                                'type'         => ['type' => 'string', 'enum' => ['income', 'expense']],
                                'category'     => ['type' => 'string',
                                                   'description' => 'Short category label'],
                                'date'         => [
                                    'type'        => ['string', 'null'],
                                    'description' => 'YYYY-MM-DD posting date for this specific line. ' .
                                                     'For multi-date documents, each row gets its own date. ' .
                                                     'For manual entries, extract from description text. ' .
                                                     'Return null only if you cannot determine the date.',
                                ],
                            ],
                        ],
                    ],

                    'confidence' => [
                        'type'    => 'number',
                        'minimum' => 0,
                        'maximum' => 1,
                        'description' => 'How confident you are in the classification (0–1)',
                    ],
                ],
            ],
        ];
    }
}
```

- [ ] **Step 2: Verify no syntax errors**

```bash
cd backend && php -l app/Services/AI/TransactionClassifier.php
```

Expected: `No syntax errors detected`

- [ ] **Step 3: Run the unit tests — they must now PASS**

```bash
cd backend && php artisan test tests/Unit/TransactionClassifierTest.php --stop-on-failure
```

Expected: `5 tests, N assertions` — all green. Fix any failures before proceeding.

- [ ] **Step 4: Commit**

```bash
git add backend/app/Services/AI/TransactionClassifier.php
git commit -m "feat: TransactionClassifier — tool use, sectioned OCR input, per-line date"
```

---

## Task 5 — Update `ClassifyWithAI`

**Files:**
- Modify: `backend/app/Jobs/ClassifyWithAI.php`

Two changes only:
1. The result now uses `$classification['document']` (was `$classification['cleanedFields']`) and `$classification['document']['total_amount']` (was `$classification['totalAmount']`).
2. Line creation now includes `date` with a fallback to `document_date`.
3. Account lookup key changes from `$line['accountCode']` to `$line['account_code']`.

- [ ] **Step 1: Replace the `handle()` method body (Steps D, E, and the OCR field block)**

Find and replace the **STEP D through end-of-handle** section. The `failed()` method is unchanged — leave it.

Replace everything from `// STEP D` to `$this->document->save();` with:

```php
        // STEP D — Cross-check rules (upload area mismatch, low confidence)
        if (!$this->document->is_no_receipt) {
            $aiType = $classification['lines'][0]['type'] ?? null;
            if ($aiType && $this->document->document_type && $this->document->document_type !== $aiType) {
                $this->document->flag           = 'RED';
                $this->document->anomaly_reason = ['Upload area mismatch'];
            }
        } else {
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

        $docDate = $this->document->document_date?->format('Y-m-d');

        foreach ($classification['lines'] ?? [] as $line) {
            $accountId = Account::where('company_id', $company->id)
                ->where('code', $line['account_code'] ?? '')
                ->value('id');

            $this->document->transactionLines()->create([
                'account_id'   => $accountId,
                'account_code' => $line['account_code'] ?? null,
                'type'         => $line['type'],
                'category'     => $line['category'] ?? null,
                'amount'       => $line['amount'],
                'description'  => $line['description'] ?? null,
                'date'         => $line['date'] ?? $docDate,
            ]);
        }

        // Set document category to first line's category as a summary label
        $this->document->category = $classification['lines'][0]['category'] ?? $this->document->category;

        // Apply cleaned fields from Claude (OCR path only)
        if (!$this->document->is_no_receipt && !empty($classification['document'])) {
            $doc = $classification['document'];
            $this->document->merchant_name = $doc['merchant']     ?? $this->document->merchant_name;
            $this->document->document_date = $doc['date']         ?? $this->document->document_date;
            $this->document->vat_amount    = $doc['vat_amount']   ?? $this->document->vat_amount;

            if (empty($this->document->ref_number) && !empty($doc['or_number'])) {
                $this->document->ref_number = $doc['or_number'];
            }
            if (!empty($doc['total_amount'])) {
                $this->document->amount = $doc['total_amount'];
            }
        }

        $this->document->save();

        // STEP F — Dispatch DetectAnomalies
        DetectAnomalies::dispatch($this->document);
```

- [ ] **Step 2: Verify no syntax errors**

```bash
cd backend && php -l app/Jobs/ClassifyWithAI.php
```

Expected: `No syntax errors detected`

- [ ] **Step 3: Commit**

```bash
git add backend/app/Jobs/ClassifyWithAI.php
git commit -m "feat: ClassifyWithAI — read document key, write date per line with doc_date fallback"
```

---

## Task 6 — Feature tests for per-line date

**Files:**
- Modify: `backend/tests/Feature/TransactionLinesTest.php`

- [ ] **Step 1: Update `DocumentController::toDetail()` to expose `date` per line**

Open `backend/app/Http/Controllers/DocumentController.php`. In the `toDetail()` method, find the `transactionLines` map and add `'date'`:

```php
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
```

- [ ] **Step 2: Verify no syntax errors**

```bash
cd backend && php -l app/Http/Controllers/DocumentController.php
```

Expected: `No syntax errors detected`

- [ ] **Step 3: Add three tests at the end of the class, before the closing `}`**

```php
    public function test_transaction_line_date_is_stored_and_cast(): void
    {
        $doc = Document::factory()->create([
            'company_id'    => $this->company->id,
            'document_type' => 'income',
            'document_date' => '2026-05-29',
        ]);

        TransactionLine::factory()->create([
            'document_id' => $doc->id,
            'type'        => 'income',
            'amount'      => 2500.00,
            'date'        => '2026-05-25',
        ]);

        $line = TransactionLine::where('document_id', $doc->id)->first();

        $this->assertNotNull($line->date);
        $this->assertInstanceOf(\Carbon\Carbon::class, $line->date);
        $this->assertEquals('2026-05-25', $line->date->toDateString());
    }

    public function test_transaction_line_date_null_is_allowed_for_pre_classification_rows(): void
    {
        $doc = Document::factory()->create([
            'company_id'    => $this->company->id,
            'document_date' => '2026-05-29',
        ]);

        // Pre-classification rows created by manualEntry() have no date yet
        $line = TransactionLine::factory()->create([
            'document_id' => $doc->id,
            'type'        => 'expense',
            'amount'      => 100.00,
            'date'        => null,
        ]);

        $this->assertNull($line->fresh()->date);
    }

    public function test_document_detail_includes_line_date(): void
    {
        $doc = Document::factory()->create([
            'company_id'    => $this->company->id,
            'document_type' => 'income',
            'status'        => 'approved',
        ]);

        TransactionLine::factory()->create([
            'document_id' => $doc->id,
            'type'        => 'income',
            'amount'      => 1000.00,
            'date'        => '2026-05-25',
        ]);

        $response = $this->actingAs($this->client)
            ->getJson("/api/documents/{$doc->id}");

        $response->assertOk();
        $response->assertJsonPath('transactionLines.0.date', '2026-05-25');
    }
```

- [ ] **Step 4: Update `TransactionLineFactory` to include `date`**

Open `backend/database/factories/TransactionLineFactory.php` and add `date` to `definition()`:

```php
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
        'date'         => $this->faker->dateTimeBetween('-1 year', 'now')->format('Y-m-d'),
    ];
}
```

- [ ] **Step 5: Run all feature tests**

```bash
cd backend && php artisan test tests/Feature/TransactionLinesTest.php --stop-on-failure
```

Expected: all tests pass. Fix any failures before proceeding.

- [ ] **Step 6: Run the full test suite**

```bash
cd backend && php artisan test --stop-on-failure
```

Expected: all tests pass.

- [ ] **Step 7: Commit**

```bash
git add backend/tests/Feature/TransactionLinesTest.php
git add backend/database/factories/TransactionLineFactory.php
git add backend/app/Http/Controllers/DocumentController.php
git commit -m "test: per-line date on TransactionLine; expose date in document detail response"
```

---

## Self-Review Checklist

| Spec requirement | Covered by |
|---|---|
| Zero JSON parse failures — tool use forced | Task 4 (`tool_choice: force`, `callApi` extract) |
| OCR path uses header/body/footer sections | Task 4 (`buildOcrPrompt`) |
| Falls back to `raw_text` when sections empty | Task 4 (`buildOcrPrompt` fallback) |
| Manual path prompts for date extraction from description | Task 4 (`buildManualPrompt`) |
| `lines[].date` in tool schema | Task 4 (`buildTool`) |
| `lines[].type` enforced as enum `income\|expense` | Task 4 (`buildTool`) |
| `lines[].amount` enforced as number ≥ 0.01 | Task 4 (`buildTool`) |
| `lines[].account_code` required string | Task 4 (`buildTool`) |
| `lines` minItems: 1 | Task 4 (`buildTool`) |
| `maxTokens` bumped to 1536 | Task 4 (`callApi`) |
| `date` column added to `transaction_lines` | Task 1 |
| `TransactionLine.date` fillable + cast to `date` | Task 2 |
| ClassifyWithAI reads `document` key | Task 5 |
| ClassifyWithAI reads `document.total_amount` | Task 5 |
| ClassifyWithAI account lookup uses `account_code` key | Task 5 |
| ClassifyWithAI writes `date` per line with `document_date` fallback | Task 5 |
| `date` exposed in document detail API response | Task 6 |
| `transaction_lines.date` authoritative — always non-null after AI | Task 5 (fallback) + Task 6 (factory) |
