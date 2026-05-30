# Transaction Line Subtypes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the free-text `category` column on `transaction_lines` with a structured `subtypes` table (global, user-created labels), wire it through the AI classifier, queue approval flow, and queue review modal UI.

**Architecture:** New `subtypes` table holds globally unique labels. `transaction_lines.category` (string) is replaced with `subtype_id` (nullable FK). The AI classifier does a find-or-create when it writes lines. The queue modal replaces the category text input with a typeahead combobox that creates new subtypes on selection. `GET /api/subtypes` searches; `POST /api/subtypes` creates immediately (on accountant selection, not on save).

**Tech Stack:** Laravel 11 (backend), PostgreSQL, Next.js 14 App Router + TypeScript (frontend), shadcn/ui patterns, React Query, Axios

---

## File Map

**Create:**
- `backend/database/migrations/2026_05_31_000001_create_subtypes_table.php`
- `backend/database/migrations/2026_05_31_000002_replace_category_with_subtype_id_on_transaction_lines.php`
- `backend/app/Models/Subtype.php`
- `backend/database/factories/SubtypeFactory.php`
- `backend/app/Http/Controllers/SubtypeController.php`
- `backend/tests/Feature/SubtypeTest.php`
- `frontend/src/lib/api/subtypes.ts`
- `frontend/src/components/queue/SubtypeCombobox.tsx`

**Modify:**
- `backend/app/Models/TransactionLine.php` — remove `category`, add `subtype_id` + `subtype` relationship
- `backend/database/factories/TransactionLineFactory.php` — remove `category`, add `subtype_id: null`
- `backend/app/Jobs/ClassifyWithAI.php` — find-or-create Subtype, set `subtype_id` instead of `category`
- `backend/app/Http/Controllers/QueueController.php` — `show()` returns subtypeId/subtypeName; `approve()` + `computeOverrideDiff()` use `subtype_id`
- `backend/app/Http/Requests/Queue/ApproveItemRequest.php` — replace `lines.*.category` with `lines.*.subtypeId`
- `backend/routes/api.php` — register subtype routes
- `frontend/src/types/document.ts` — replace `category` with `subtypeId` + `subtypeName` on `TransactionLine`
- `frontend/src/lib/api/queue.ts` — replace `category` with `subtypeId` in `LinePayload`
- `frontend/src/components/queue/QueueReviewModal.tsx` — replace category input with `SubtypeCombobox`, rename Description → Notes

---

## Task 1: Create subtypes table and Subtype model

**Files:**
- Create: `backend/database/migrations/2026_05_31_000001_create_subtypes_table.php`
- Create: `backend/app/Models/Subtype.php`
- Create: `backend/database/factories/SubtypeFactory.php`

- [ ] **Step 1: Write the migration**

```php
<?php
// backend/database/migrations/2026_05_31_000001_create_subtypes_table.php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('subtypes', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('name')->unique();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('subtypes');
    }
};
```

- [ ] **Step 2: Write the Subtype model**

```php
<?php
// backend/app/Models/Subtype.php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Subtype extends Model
{
    use HasUuids, HasFactory;

    protected $fillable = ['name'];

    public function transactionLines(): HasMany
    {
        return $this->hasMany(TransactionLine::class);
    }
}
```

- [ ] **Step 3: Write the factory**

```php
<?php
// backend/database/factories/SubtypeFactory.php

namespace Database\Factories;

use Illuminate\Database\Eloquent\Factories\Factory;

class SubtypeFactory extends Factory
{
    public function definition(): array
    {
        return [
            'name' => $this->faker->unique()->words(2, true),
        ];
    }
}
```

- [ ] **Step 4: Run the migration**

```bash
cd backend && php artisan migrate
```

Expected: `2026_05_31_000001_create_subtypes_table` runs without error, `subtypes` table exists in DB.

- [ ] **Step 5: Commit**

```bash
git add backend/database/migrations/2026_05_31_000001_create_subtypes_table.php \
        backend/app/Models/Subtype.php \
        backend/database/factories/SubtypeFactory.php
git commit -m "feat: add subtypes table and model"
```

---

## Task 2: Migrate transaction_lines.category → subtype_id

**Files:**
- Create: `backend/database/migrations/2026_05_31_000002_replace_category_with_subtype_id_on_transaction_lines.php`
- Modify: `backend/app/Models/TransactionLine.php`
- Modify: `backend/database/factories/TransactionLineFactory.php`

- [ ] **Step 1: Write the migration**

```php
<?php
// backend/database/migrations/2026_05_31_000002_replace_category_with_subtype_id_on_transaction_lines.php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;

return new class extends Migration
{
    public function up(): void
    {
        // 1. Add subtype_id column
        Schema::table('transaction_lines', function (Blueprint $table) {
            $table->foreignUuid('subtype_id')
                  ->nullable()
                  ->after('type')
                  ->references('id')->on('subtypes')
                  ->nullOnDelete();
        });

        // 2. Seed subtypes from existing distinct category values
        $categories = DB::table('transaction_lines')
            ->whereNotNull('category')
            ->where('category', '!=', '')
            ->distinct()
            ->pluck('category');

        $subtypeMap = [];
        foreach ($categories as $name) {
            $name = trim($name);
            if (!$name) continue;
            $existing = DB::table('subtypes')->where('name', $name)->first();
            if ($existing) {
                $subtypeMap[$name] = $existing->id;
            } else {
                $id = (string) Str::uuid();
                DB::table('subtypes')->insert([
                    'id'         => $id,
                    'name'       => $name,
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);
                $subtypeMap[$name] = $id;
            }
        }

        // 3. Back-fill subtype_id on existing lines
        foreach ($subtypeMap as $name => $subtypeId) {
            DB::table('transaction_lines')
                ->where('category', $name)
                ->update(['subtype_id' => $subtypeId]);
        }

        // 4. Drop category column
        Schema::table('transaction_lines', function (Blueprint $table) {
            $table->dropColumn('category');
        });
    }

    public function down(): void
    {
        Schema::table('transaction_lines', function (Blueprint $table) {
            $table->string('category')->nullable()->after('type');
        });

        DB::statement("
            UPDATE transaction_lines tl
            SET category = s.name
            FROM subtypes s
            WHERE tl.subtype_id = s.id
        ");

        Schema::table('transaction_lines', function (Blueprint $table) {
            $table->dropForeign(['subtype_id']);
            $table->dropColumn('subtype_id');
        });
    }
};
```

- [ ] **Step 2: Update TransactionLine model**

Replace the entire file content:

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
        return $this->belongsTo(Subtype::class);
    }
}
```

- [ ] **Step 3: Update TransactionLineFactory**

Replace the `definition()` method — remove `category`, add `subtype_id`:

```php
public function definition(): array
{
    return [
        'document_id'  => Document::factory(),
        'account_id'   => null,
        'account_code' => null,
        'type'         => $this->faker->randomElement(['income', 'expense']),
        'subtype_id'   => null,
        'amount'       => $this->faker->randomFloat(2, 10, 5000),
        'description'  => $this->faker->sentence(3),
        'date'         => $this->faker->dateTimeBetween('-1 year', 'now')->format('Y-m-d'),
    ];
}
```

- [ ] **Step 4: Run migration**

```bash
cd backend && php artisan migrate
```

Expected: migration runs, `category` column gone from `transaction_lines`, `subtype_id` FK column added.

- [ ] **Step 5: Run existing tests to check nothing is broken**

```bash
cd backend && php artisan test
```

Expected: all existing tests pass. If any test references `category` on a transaction line, update it to use `subtype_id`.

- [ ] **Step 6: Commit**

```bash
git add backend/database/migrations/2026_05_31_000002_replace_category_with_subtype_id_on_transaction_lines.php \
        backend/app/Models/TransactionLine.php \
        backend/database/factories/TransactionLineFactory.php
git commit -m "feat: replace transaction_lines.category with subtype_id FK"
```

---

## Task 3: SubtypeController — search and create endpoints

**Files:**
- Create: `backend/app/Http/Controllers/SubtypeController.php`
- Create: `backend/tests/Feature/SubtypeTest.php`
- Modify: `backend/routes/api.php`

- [ ] **Step 1: Write the failing tests**

```php
<?php
// backend/tests/Feature/SubtypeTest.php

namespace Tests\Feature;

use App\Models\Subtype;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class SubtypeTest extends TestCase
{
    use RefreshDatabase;

    private User $accountant;

    protected function setUp(): void
    {
        parent::setUp();
        $this->accountant = User::factory()->create(['role' => 'accountant']);
    }

    public function test_search_returns_empty_array_when_query_under_3_chars(): void
    {
        Subtype::factory()->create(['name' => 'Internet']);

        $this->actingAs($this->accountant)
            ->getJson('/api/subtypes?q=In')
            ->assertOk()
            ->assertExactJson([]);
    }

    public function test_search_returns_matching_subtypes_for_3_or_more_chars(): void
    {
        Subtype::factory()->create(['name' => 'Internet']);
        Subtype::factory()->create(['name' => 'Telephone']);
        Subtype::factory()->create(['name' => 'Load']);

        $this->actingAs($this->accountant)
            ->getJson('/api/subtypes?q=Int')
            ->assertOk()
            ->assertJsonCount(1)
            ->assertJsonFragment(['name' => 'Internet']);
    }

    public function test_search_is_case_insensitive(): void
    {
        Subtype::factory()->create(['name' => 'Internet']);

        $this->actingAs($this->accountant)
            ->getJson('/api/subtypes?q=int')
            ->assertOk()
            ->assertJsonFragment(['name' => 'Internet']);
    }

    public function test_create_stores_new_subtype_and_returns_it(): void
    {
        $this->actingAs($this->accountant)
            ->postJson('/api/subtypes', ['name' => 'Internet'])
            ->assertStatus(201)
            ->assertJsonFragment(['name' => 'Internet']);

        $this->assertDatabaseHas('subtypes', ['name' => 'Internet']);
    }

    public function test_create_returns_existing_subtype_when_name_already_exists(): void
    {
        $existing = Subtype::factory()->create(['name' => 'Internet']);

        $this->actingAs($this->accountant)
            ->postJson('/api/subtypes', ['name' => 'Internet'])
            ->assertStatus(201)
            ->assertJsonFragment(['id' => $existing->id, 'name' => 'Internet']);

        $this->assertDatabaseCount('subtypes', 1);
    }

    public function test_routes_require_authentication(): void
    {
        $this->getJson('/api/subtypes?q=int')->assertUnauthorized();
        $this->postJson('/api/subtypes', ['name' => 'test'])->assertUnauthorized();
    }
}
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
cd backend && php artisan test --filter SubtypeTest
```

Expected: FAIL — routes not found (404).

- [ ] **Step 3: Write the controller**

```php
<?php
// backend/app/Http/Controllers/SubtypeController.php

namespace App\Http\Controllers;

use App\Models\Subtype;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class SubtypeController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $q = $request->query('q', '');
        if (strlen($q) < 3) {
            return response()->json([]);
        }

        $subtypes = Subtype::where('name', 'ilike', "%{$q}%")
            ->orderBy('name')
            ->limit(20)
            ->get(['id', 'name']);

        return response()->json($subtypes);
    }

    public function store(Request $request): JsonResponse
    {
        $request->validate(['name' => ['required', 'string', 'max:255']]);

        $subtype = Subtype::firstOrCreate(['name' => $request->name]);

        return response()->json(['id' => $subtype->id, 'name' => $subtype->name], 201);
    }
}
```

- [ ] **Step 4: Register routes in api.php**

Add the following inside the `role:accountant,admin` middleware group (after the existing adjusting-entries routes):

```php
Route::get('/subtypes',  [SubtypeController::class, 'index']);
Route::post('/subtypes', [SubtypeController::class, 'store']);
```

Also add the import at the top of `api.php`:

```php
use App\Http\Controllers\SubtypeController;
```

- [ ] **Step 5: Run tests to confirm they pass**

```bash
cd backend && php artisan test --filter SubtypeTest
```

Expected: all 6 tests PASS.

- [ ] **Step 6: Commit**

```bash
git add backend/app/Http/Controllers/SubtypeController.php \
        backend/tests/Feature/SubtypeTest.php \
        backend/routes/api.php
git commit -m "feat: add SubtypeController with search and create endpoints"
```

---

## Task 4: ClassifyWithAI — find-or-create subtype per line

**Files:**
- Modify: `backend/app/Jobs/ClassifyWithAI.php`

- [ ] **Step 1: Add Subtype import to ClassifyWithAI**

At the top of `ClassifyWithAI.php`, add after the existing `use` statements:

```php
use App\Models\Subtype;
```

- [ ] **Step 2: Replace the line creation block (lines 90–103)**

Replace:

```php
foreach ($classification['lines'] ?? [] as $line) {
    $accountId = Account::where('company_id', $company->id)
        ->where('code', $line['account_code'] ?? null)
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
```

With:

```php
foreach ($classification['lines'] ?? [] as $line) {
    $accountId = Account::where('company_id', $company->id)
        ->where('code', $line['account_code'] ?? null)
        ->value('id');

    $subtypeId = null;
    if (!empty($line['category'])) {
        $subtypeId = Subtype::firstOrCreate(['name' => trim($line['category'])])->id;
    }

    $this->document->transactionLines()->create([
        'account_id'   => $accountId,
        'account_code' => $line['account_code'] ?? null,
        'type'         => $line['type'],
        'subtype_id'   => $subtypeId,
        'amount'       => $line['amount'],
        'description'  => $line['description'] ?? null,
        'date'         => $line['date'] ?? $docDate,
    ]);
}
```

- [ ] **Step 3: Remove the document-level category assignment (line 107)**

Delete this line:

```php
$this->document->category = $classification['lines'][0]['category'] ?? $this->document->category;
```

The `documents.category` field is a separate concern (used by anomaly detector) and is out of scope for this change.

- [ ] **Step 4: Run full test suite to confirm no regressions**

```bash
cd backend && php artisan test
```

Expected: all tests PASS.

- [ ] **Step 5: Commit**

```bash
git add backend/app/Jobs/ClassifyWithAI.php
git commit -m "feat: ClassifyWithAI sets subtype_id via find-or-create"
```

---

## Task 5: QueueController — return and accept subtypes

**Files:**
- Modify: `backend/app/Http/Controllers/QueueController.php`
- Modify: `backend/app/Http/Requests/Queue/ApproveItemRequest.php`
- Create: `backend/tests/Feature/SubtypeQueueTest.php`

- [ ] **Step 1: Write the failing tests**

```php
<?php
// backend/tests/Feature/SubtypeQueueTest.php

namespace Tests\Feature;

use App\Models\Account;
use App\Models\Company;
use App\Models\Document;
use App\Models\Subtype;
use App\Models\TransactionLine;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Queue;
use Tests\TestCase;

class SubtypeQueueTest extends TestCase
{
    use RefreshDatabase;

    private User $accountant;
    private Company $company;
    private Document $document;

    protected function setUp(): void
    {
        parent::setUp();
        Queue::fake();

        $this->accountant = User::factory()->create(['role' => 'accountant']);

        $this->company = Company::factory()->create([
            'accountant_id' => $this->accountant->id,
            'bir_type'      => 'non_vat',
        ]);

        $this->document = Document::factory()->create([
            'company_id' => $this->company->id,
            'status'     => 'parked',
        ]);
    }

    public function test_queue_show_includes_subtype_id_and_name_on_lines(): void
    {
        $subtype = Subtype::factory()->create(['name' => 'Internet']);
        TransactionLine::factory()->create([
            'document_id' => $this->document->id,
            'subtype_id'  => $subtype->id,
        ]);

        $this->actingAs($this->accountant)
            ->getJson("/api/queue/{$this->document->id}")
            ->assertOk()
            ->assertJsonFragment([
                'subtypeId'   => $subtype->id,
                'subtypeName' => 'Internet',
            ]);
    }

    public function test_queue_show_returns_null_subtype_when_line_has_no_subtype(): void
    {
        TransactionLine::factory()->create([
            'document_id' => $this->document->id,
            'subtype_id'  => null,
        ]);

        $this->actingAs($this->accountant)
            ->getJson("/api/queue/{$this->document->id}")
            ->assertOk()
            ->assertJsonFragment([
                'subtypeId'   => null,
                'subtypeName' => null,
            ]);
    }

    public function test_approve_updates_line_subtype_id(): void
    {
        $account = Account::factory()->create([
            'company_id' => $this->company->id,
            'type'       => 'expense',
        ]);

        $oldSubtype = Subtype::factory()->create(['name' => 'Load']);
        $newSubtype = Subtype::factory()->create(['name' => 'Internet']);

        $line = TransactionLine::factory()->create([
            'document_id' => $this->document->id,
            'account_id'  => $account->id,
            'account_code'=> $account->code,
            'type'        => 'expense',
            'subtype_id'  => $oldSubtype->id,
            'amount'      => 500,
        ]);

        $this->actingAs($this->accountant)
            ->postJson("/api/queue/{$this->document->id}/approve", [
                'lines' => [
                    [
                        'id'        => $line->id,
                        'subtypeId' => $newSubtype->id,
                    ],
                ],
            ])
            ->assertOk();

        $this->assertDatabaseHas('transaction_lines', [
            'id'         => $line->id,
            'subtype_id' => $newSubtype->id,
        ]);
    }
}
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
cd backend && php artisan test --filter SubtypeQueueTest
```

Expected: FAIL — `subtypeId` key missing from show response, approve does not update `subtype_id`.

- [ ] **Step 3: Update QueueController::show() — eager-load subtype, return subtypeId/subtypeName**

In `QueueController::show()`, change the eager load on line 62 from:

```php
$document = Document::with(['company', 'ocrResult', 'transactionLines.account'])->findOrFail($id);
```

to:

```php
$document = Document::with(['company', 'ocrResult', 'transactionLines.account', 'transactionLines.subtype'])->findOrFail($id);
```

Then in the `transactionLines` map (lines 88–98), replace `'category' => $l->category,` with:

```php
'subtypeId'   => $l->subtype_id,
'subtypeName' => $l->subtype?->name,
```

The full updated map block should be:

```php
'transactionLines' => $document->transactionLines->map(fn ($l) => [
    'id'          => $l->id,
    'accountId'   => $l->account_id,
    'accountCode' => $l->account_code,
    'accountName' => $l->account?->name,
    'type'        => $l->type,
    'subtypeId'   => $l->subtype_id,
    'subtypeName' => $l->subtype?->name,
    'amount'      => (float) $l->amount,
    'description' => $l->description,
    'date'        => $l->date?->toDateString(),
])->values()->all(),
```

- [ ] **Step 4: Update QueueController::approve() — replace category with subtype_id**

In the line update block (around line 162–165), replace:

```php
if (array_key_exists('category', $lineData))    $updateData['category']     = $lineData['category'];
```

with:

```php
if (array_key_exists('subtypeId', $lineData))   $updateData['subtype_id']   = $lineData['subtypeId'] ?: null;
```

In the line create block (around line 174–182), replace:

```php
'category'     => $lineData['category'] ?? null,
```

with:

```php
'subtype_id'   => $lineData['subtypeId'] ?? null,
```

- [ ] **Step 5: Update QueueController::computeOverrideDiff() — track subtypeId instead of category**

In `computeOverrideDiff()` around line 265, replace:

```php
foreach (['accountCode' => 'account_code', 'category' => 'category'] as $field => $dbCol) {
```

with:

```php
foreach (['accountCode' => 'account_code', 'subtypeId' => 'subtype_id'] as $field => $dbCol) {
```

- [ ] **Step 6: Update ApproveItemRequest — replace category validation with subtypeId**

In `ApproveItemRequest::rules()`, replace:

```php
'lines.*.category'          => ['nullable', 'string'],
```

with:

```php
'lines.*.subtypeId'         => ['nullable', 'string'],
```

- [ ] **Step 7: Run tests**

```bash
cd backend && php artisan test --filter SubtypeQueueTest
```

Expected: all 3 tests PASS.

- [ ] **Step 8: Run full suite**

```bash
cd backend && php artisan test
```

Expected: all tests PASS.

- [ ] **Step 9: Commit**

```bash
git add backend/app/Http/Controllers/QueueController.php \
        backend/app/Http/Requests/Queue/ApproveItemRequest.php \
        backend/tests/Feature/SubtypeQueueTest.php
git commit -m "feat: QueueController returns and accepts subtypeId on transaction lines"
```

---

## Task 6: Frontend types and API layer

**Files:**
- Modify: `frontend/src/types/document.ts`
- Modify: `frontend/src/lib/api/queue.ts`
- Create: `frontend/src/lib/api/subtypes.ts`

- [ ] **Step 1: Update TransactionLine type in document.ts**

In `frontend/src/types/document.ts`, replace the `TransactionLine` interface:

```typescript
export interface TransactionLine {
  id: string
  accountId: string | null
  accountCode: string | null
  accountName: string | null
  type: 'income' | 'expense'
  subtypeId: string | null
  subtypeName: string | null
  amount: number
  description: string | null
  date: string | null
}
```

- [ ] **Step 2: Update LinePayload in queue.ts**

In `frontend/src/lib/api/queue.ts`, replace the `LinePayload` interface:

```typescript
export interface LinePayload {
  id?: string
  type?: 'income' | 'expense'
  accountId?: string | null
  accountCode?: string | null
  subtypeId?: string | null
  amount?: number
  description?: string | null
  date?: string | null
}
```

- [ ] **Step 3: Create the subtypes API file**

```typescript
// frontend/src/lib/api/subtypes.ts

import api from './client'

export interface Subtype {
  id: string
  name: string
}

export async function searchSubtypes(q: string): Promise<Subtype[]> {
  const { data } = await api.get<Subtype[]>('/subtypes', { params: { q } })
  return data
}

export async function createSubtype(name: string): Promise<Subtype> {
  const { data } = await api.post<Subtype>('/subtypes', { name })
  return data
}
```

- [ ] **Step 4: Run TypeScript compiler to check for type errors**

```bash
cd frontend && npx tsc --noEmit
```

Expected: any type errors related to `category` on `TransactionLine` or `LinePayload` surface here. Fix them before continuing.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/types/document.ts \
        frontend/src/lib/api/queue.ts \
        frontend/src/lib/api/subtypes.ts
git commit -m "feat: update frontend types and add subtypes API"
```

---

## Task 7: SubtypeCombobox component

**Files:**
- Create: `frontend/src/components/queue/SubtypeCombobox.tsx`

- [ ] **Step 1: Create the component**

```tsx
// frontend/src/components/queue/SubtypeCombobox.tsx

'use client'

import { useState, useEffect, useRef } from 'react'
import { searchSubtypes, createSubtype, type Subtype } from '@/lib/api/subtypes'

interface Props {
  subtypeId: string | null
  subtypeName: string | null
  onChange: (subtypeId: string | null, subtypeName: string | null) => void
}

export function SubtypeCombobox({ subtypeId: _subtypeId, subtypeName, onChange }: Props) {
  const [open, setOpen]         = useState(false)
  const [query, setQuery]       = useState('')
  const [options, setOptions]   = useState<Subtype[]>([])
  const [creating, setCreating] = useState(false)
  const debounceRef             = useRef<ReturnType<typeof setTimeout>>()

  useEffect(() => {
    if (query.length < 3) {
      setOptions([])
      return
    }
    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(async () => {
      const results = await searchSubtypes(query)
      setOptions(results)
    }, 300)
    return () => clearTimeout(debounceRef.current)
  }, [query])

  const showCreate = query.length >= 3 && !options.some(
    (o) => o.name.toLowerCase() === query.toLowerCase()
  )

  async function handleCreate() {
    setCreating(true)
    try {
      const created = await createSubtype(query)
      onChange(created.id, created.name)
      setQuery('')
      setOpen(false)
    } finally {
      setCreating(false)
    }
  }

  return (
    <div className="relative">
      <input
        type="text"
        value={creating ? '' : open ? query : (subtypeName ?? '')}
        disabled={creating}
        onFocus={() => { setOpen(true); setQuery(subtypeName ?? '') }}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={creating ? '' : 'Subtype…'}
        className="border border-gray-200 rounded px-2 py-1 text-xs w-24"
      />
      {creating && (
        <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-gray-400">
          Saving…
        </span>
      )}
      {open && !creating && (options.length > 0 || showCreate) && (
        <ul className="absolute z-50 w-48 bg-white border border-gray-200 rounded shadow-md max-h-48 overflow-y-auto text-xs">
          {options.map((o) => (
            <li
              key={o.id}
              onMouseDown={() => { onChange(o.id, o.name); setQuery(''); setOpen(false) }}
              className="px-2 py-1.5 hover:bg-gray-50 cursor-pointer"
            >
              {o.name}
            </li>
          ))}
          {showCreate && (
            <li
              onMouseDown={handleCreate}
              className="px-2 py-1.5 hover:bg-indigo-50 cursor-pointer text-indigo-600 border-t border-gray-100"
            >
              Create: &ldquo;{query}&rdquo;
            </li>
          )}
        </ul>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Run TypeScript check**

```bash
cd frontend && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/queue/SubtypeCombobox.tsx
git commit -m "feat: add SubtypeCombobox typeahead component"
```

---

## Task 8: QueueReviewModal — wire in SubtypeCombobox, rename Description → Notes

**Files:**
- Modify: `frontend/src/components/queue/QueueReviewModal.tsx`

- [ ] **Step 1: Add the SubtypeCombobox import**

At the top of `QueueReviewModal.tsx`, add after the existing imports:

```typescript
import { SubtypeCombobox } from './SubtypeCombobox'
```

- [ ] **Step 2: Update LineState interface**

Replace the `LineState` interface:

```typescript
interface LineState {
  id?: string
  type: 'income' | 'expense'
  accountId: string
  accountCode: string
  subtypeId: string | null
  subtypeName: string | null
  amount: string
  description: string
  date: string
}
```

- [ ] **Step 3: Replace the category input in LineRow with SubtypeCombobox**

In the `LineRow` function, replace:

```tsx
<input
  type="text"
  value={line.category}
  onChange={(e) => onChange({ category: e.target.value })}
  placeholder="Category"
  className="border border-gray-200 rounded px-2 py-1 text-xs w-20"
/>
```

with:

```tsx
<SubtypeCombobox
  subtypeId={line.subtypeId}
  subtypeName={line.subtypeName}
  onChange={(subtypeId, subtypeName) => onChange({ subtypeId, subtypeName })}
/>
```

- [ ] **Step 4: Rename Description column headers to Notes**

There are two column header rows — one for income, one for expense. In both, replace:

```tsx
<div className="flex-1 text-[10px] font-semibold text-gray-400 uppercase">Description</div>
```

with:

```tsx
<div className="flex-1 text-[10px] font-semibold text-gray-400 uppercase">Notes</div>
```

- [ ] **Step 5: Update the useEffect that maps item.transactionLines to LineState**

Replace the `setLines(...)` call inside the `useEffect` (around line 172–183):

```typescript
setLines(
  item.transactionLines.map((l) => ({
    id:          l.id,
    type:        l.type,
    accountId:   l.accountId ?? '',
    accountCode: l.accountCode ?? '',
    subtypeId:   l.subtypeId ?? null,
    subtypeName: l.subtypeName ?? null,
    amount:      String(l.amount ?? ''),
    description: l.description ?? '',
    date:        l.date ?? '',
  }))
)
```

- [ ] **Step 6: Update addLine to include subtypeId/subtypeName**

Replace the `addLine` function:

```typescript
function addLine(type: 'income' | 'expense') {
  setLines((prev) => [
    ...prev,
    { type, accountId: '', accountCode: '', subtypeId: null, subtypeName: null, amount: '', description: '', date: '' },
  ])
}
```

- [ ] **Step 7: Update handleApprove to send subtypeId**

In `handleApprove`, replace the `linePayloads` mapping:

```typescript
const linePayloads: LinePayload[] = lines.map((l) => ({
  id:          l.id,
  type:        l.type,
  accountId:   l.accountId || null,
  accountCode: l.accountCode || null,
  subtypeId:   l.subtypeId || null,
  amount:      parseFloat(l.amount) || 0,
  description: l.description || null,
  date:        l.date || null,
}))
```

- [ ] **Step 8: Run TypeScript check**

```bash
cd frontend && npx tsc --noEmit
```

Expected: no errors. If `category` references remain in other files, fix them now.

- [ ] **Step 9: Run backend tests one final time**

```bash
cd backend && php artisan test
```

Expected: all tests PASS.

- [ ] **Step 10: Commit**

```bash
git add frontend/src/components/queue/QueueReviewModal.tsx
git commit -m "feat: wire SubtypeCombobox into QueueReviewModal, rename Description to Notes"
```
