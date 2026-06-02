# Adjusting Entry Form Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add `subtype_id` and `description` to adjusting entry lines (backend + frontend) and redesign the entry form to use lean raw inputs matching the queue review modal style.

**Architecture:** Backend migration adds `subtype_id` to `adjusting_entry_lines`; controller wires both fields through create/update/show; `JournalEntryService::postFromAdjustingEntry` copies `description` to `journal_entry_lines`. Frontend replaces shadcn components with raw inputs in a two-card layout, adds `AccountSelect` (searchable) and `SubtypeCombobox` to each line row.

**Tech Stack:** Laravel 11, PHPUnit feature tests, Next.js 14, React Hook Form + Zod, Tailwind CSS

---

## File Map

| File | Action |
|---|---|
| `backend/database/migrations/2026_06_02_000001_add_subtype_id_to_adjusting_entry_lines.php` | Create |
| `backend/app/Models/AdjustingEntryLine.php` | Modify — add `subtype_id` to `$fillable`, add `subtype()` relationship |
| `backend/app/Http/Requests/AdjustingEntry/CreateEntryRequest.php` | Modify — add validation rules for `subtypeId`, `description` |
| `backend/app/Http/Controllers/AdjustingEntryController.php` | Modify — save/return `subtypeId`, `description`; eager-load `lines.subtype` |
| `backend/app/Services/Accounting/JournalEntryService.php` | Modify — copy `description` from AEL to JEL in `postFromAdjustingEntry` |
| `backend/tests/Feature/AdjustingEntryTest.php` | Create — feature tests for create, show, update |
| `backend/tests/Feature/JournalEntryServiceTest.php` | Modify — add test for description pass-through |
| `frontend/src/types/adjusting-entry.ts` | Modify — add `subtypeId`, `subtypeName`, `description` to `EntryLine` |
| `frontend/src/lib/api/adjusting-entries.ts` | Modify — extend `createEntry` line type |
| `frontend/src/components/adjusting-entries/AccountSelect.tsx` | Create — searchable account dropdown |
| `frontend/src/components/adjusting-entries/EntryLineRow.tsx` | Rewrite — lean raw inputs + SubtypeCombobox + description |
| `frontend/src/components/adjusting-entries/EntryForm.tsx` | Rewrite — lean raw inputs, two-card layout, updated schema |
| `frontend/src/app/accountant/adjusting-entries/new/page.tsx` | Modify — add back link |
| `frontend/src/app/admin/adjusting-entries/new/page.tsx` | Modify — raw client selector card, pass `clients` to `EntryForm` |

---

## Task 1: Migration, Model, and Request Rules

**Files:**
- Create: `backend/database/migrations/2026_06_02_000001_add_subtype_id_to_adjusting_entry_lines.php`
- Modify: `backend/app/Models/AdjustingEntryLine.php`
- Modify: `backend/app/Http/Requests/AdjustingEntry/CreateEntryRequest.php`

- [ ] **Step 1: Create the migration**

```php
<?php
// backend/database/migrations/2026_06_02_000001_add_subtype_id_to_adjusting_entry_lines.php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('adjusting_entry_lines', function (Blueprint $table) {
            $table->foreignUuid('subtype_id')
                  ->nullable()
                  ->after('account_id')
                  ->references('id')->on('subtypes')
                  ->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('adjusting_entry_lines', function (Blueprint $table) {
            $table->dropForeign(['subtype_id']);
            $table->dropColumn('subtype_id');
        });
    }
};
```

- [ ] **Step 2: Update `AdjustingEntryLine` model**

Replace the full file content:

```php
<?php

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
        return $this->belongsTo(Subtype::class);
    }
}
```

- [ ] **Step 3: Update `CreateEntryRequest` validation rules**

Add two rules to the `rules()` array:

```php
// backend/app/Http/Requests/AdjustingEntry/CreateEntryRequest.php
// Add these two lines inside rules():
'lines.*.subtypeId'   => ['nullable', 'uuid', 'exists:subtypes,id'],
'lines.*.description' => ['nullable', 'string', 'max:1000'],
```

Full updated `rules()`:

```php
public function rules(): array
{
    return [
        'companyId'           => ['required', 'uuid', 'exists:companies,id'],
        'date'                => ['required', 'date'],
        'memo'                => ['required', 'string', 'max:1000'],
        'type'                => ['required', 'in:Reclassification,Reversal,Other'],
        'lines'               => ['required', 'array', 'min:2'],
        'lines.*.accountId'   => ['required', 'uuid', 'exists:accounts,id'],
        'lines.*.subtypeId'   => ['nullable', 'uuid', 'exists:subtypes,id'],
        'lines.*.debit'       => ['nullable', 'numeric', 'min:0'],
        'lines.*.credit'      => ['nullable', 'numeric', 'min:0'],
        'lines.*.description' => ['nullable', 'string', 'max:1000'],
    ];
}
```

- [ ] **Step 4: Run the migration**

```bash
cd backend && php artisan migrate
```

Expected: `Migrating: 2026_06_02_000001_add_subtype_id_to_adjusting_entry_lines` then `Migrated`.

- [ ] **Step 5: Commit**

```bash
git add backend/database/migrations/2026_06_02_000001_add_subtype_id_to_adjusting_entry_lines.php \
        backend/app/Models/AdjustingEntryLine.php \
        backend/app/Http/Requests/AdjustingEntry/CreateEntryRequest.php
git commit -m "feat: add subtype_id to adjusting_entry_lines migration and update model + request"
```

---

## Task 2: Controller — Save Subtype + Description on Create

**Files:**
- Create: `backend/tests/Feature/AdjustingEntryTest.php`
- Modify: `backend/app/Http/Controllers/AdjustingEntryController.php`

- [ ] **Step 1: Write the failing test**

Create `backend/tests/Feature/AdjustingEntryTest.php`:

```php
<?php

namespace Tests\Feature;

use App\Models\Account;
use App\Models\AdjustingEntry;
use App\Models\AdjustingEntryLine;
use App\Models\Company;
use App\Models\Subtype;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AdjustingEntryTest extends TestCase
{
    use RefreshDatabase;

    private User $accountant;
    private Company $company;
    private Account $debitAccount;
    private Account $creditAccount;

    protected function setUp(): void
    {
        parent::setUp();

        $this->accountant = User::factory()->create(['role' => 'accountant']);

        $this->company = Company::factory()->create([
            'accountant_id' => $this->accountant->id,
            'bir_type'      => 'non_vat',
        ]);

        $this->debitAccount = Account::factory()->create([
            'company_id' => $this->company->id,
            'code'       => '5100',
            'name'       => 'Office Supplies',
            'type'       => 'expense',
        ]);

        $this->creditAccount = Account::factory()->create([
            'company_id' => $this->company->id,
            'code'       => '1001',
            'name'       => 'Cash on Hand',
            'type'       => 'cash',
        ]);
    }

    public function test_create_stores_subtype_and_description_per_line(): void
    {
        $subtype = Subtype::factory()->create(['name' => 'Office Supplies']);

        $response = $this->actingAs($this->accountant)
            ->postJson('/api/adjusting-entries', [
                'companyId' => $this->company->id,
                'date'      => '2026-06-02',
                'memo'      => 'Test entry',
                'type'      => 'Reclassification',
                'lines'     => [
                    [
                        'accountId'   => $this->debitAccount->id,
                        'subtypeId'   => $subtype->id,
                        'debit'       => 500.00,
                        'credit'      => null,
                        'description' => 'Pens and paper',
                    ],
                    [
                        'accountId'   => $this->creditAccount->id,
                        'subtypeId'   => null,
                        'debit'       => null,
                        'credit'      => 500.00,
                        'description' => null,
                    ],
                ],
            ]);

        $response->assertStatus(201);

        $debitLine = AdjustingEntryLine::where('account_id', $this->debitAccount->id)->first();
        $this->assertNotNull($debitLine);
        $this->assertEquals($subtype->id, $debitLine->subtype_id);
        $this->assertEquals('Pens and paper', $debitLine->description);

        $creditLine = AdjustingEntryLine::where('account_id', $this->creditAccount->id)->first();
        $this->assertNull($creditLine->subtype_id);
        $this->assertNull($creditLine->description);
    }
}
```

- [ ] **Step 2: Run the test to confirm it fails**

```bash
cd backend && php artisan test tests/Feature/AdjustingEntryTest.php::test_create_stores_subtype_and_description_per_line --no-coverage
```

Expected: FAIL — `subtype_id` and `description` are null in the DB because the controller doesn't save them yet.

- [ ] **Step 3: Update `AdjustingEntryController::create()` to save subtype + description**

In `backend/app/Http/Controllers/AdjustingEntryController.php`, find the `foreach ($request->lines as $line)` block inside `create()` and replace it:

```php
foreach ($request->lines as $line) {
    AdjustingEntryLine::create([
        'adjusting_entry_id' => $entry->id,
        'account_id'         => $line['accountId'],
        'subtype_id'         => $line['subtypeId'] ?? null,
        'debit'              => $line['debit'] ?? null,
        'credit'             => $line['credit'] ?? null,
        'description'        => $line['description'] ?? null,
    ]);
}
```

- [ ] **Step 4: Run the test to confirm it passes**

```bash
cd backend && php artisan test tests/Feature/AdjustingEntryTest.php::test_create_stores_subtype_and_description_per_line --no-coverage
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add backend/tests/Feature/AdjustingEntryTest.php \
        backend/app/Http/Controllers/AdjustingEntryController.php
git commit -m "feat: save subtypeId and description on adjusting entry line create"
```

---

## Task 3: Controller — Return Subtype + Description in Show

**Files:**
- Modify: `backend/tests/Feature/AdjustingEntryTest.php`
- Modify: `backend/app/Http/Controllers/AdjustingEntryController.php`

- [ ] **Step 1: Add the failing test**

Append this method to `AdjustingEntryTest`:

```php
public function test_show_returns_subtype_and_description_per_line(): void
{
    $subtype = Subtype::factory()->create(['name' => 'Travel']);

    $entry = AdjustingEntry::create([
        'company_id'  => $this->company->id,
        'created_by'  => $this->accountant->id,
        'status'      => 'draft',
        'type'        => 'Reclassification',
        'entry_date'  => '2026-06-02',
        'description' => 'Test entry',
        'ref_number'  => 'ADJ-001',
    ]);

    AdjustingEntryLine::create([
        'adjusting_entry_id' => $entry->id,
        'account_id'         => $this->debitAccount->id,
        'subtype_id'         => $subtype->id,
        'debit'              => 500.00,
        'credit'             => null,
        'description'        => 'Flight to Cebu',
    ]);

    AdjustingEntryLine::create([
        'adjusting_entry_id' => $entry->id,
        'account_id'         => $this->creditAccount->id,
        'subtype_id'         => null,
        'debit'              => null,
        'credit'             => 500.00,
        'description'        => null,
    ]);

    $response = $this->actingAs($this->accountant)
        ->getJson("/api/adjusting-entries/{$entry->id}");

    $response->assertOk();
    $response->assertJsonPath('lines.0.subtypeId', $subtype->id);
    $response->assertJsonPath('lines.0.subtypeName', 'Travel');
    $response->assertJsonPath('lines.0.description', 'Flight to Cebu');
    $response->assertJsonPath('lines.1.subtypeId', null);
    $response->assertJsonPath('lines.1.description', null);
}
```

- [ ] **Step 2: Run to confirm it fails**

```bash
cd backend && php artisan test tests/Feature/AdjustingEntryTest.php::test_show_returns_subtype_and_description_per_line --no-coverage
```

Expected: FAIL — `subtypeId`, `subtypeName`, `description` keys are missing from the response.

- [ ] **Step 3: Update `show()` eager load and `toDetail()` line map**

In `AdjustingEntryController::show()`, update the eager-load to include `lines.subtype`:

```php
$entry = AdjustingEntry::with(['company', 'lines.account', 'lines.subtype', 'creator', 'approver', 'rejecter'])->findOrFail($id);
```

In `toDetail()`, update the `lines` map:

```php
'lines' => $e->lines->map(fn ($l) => [
    'accountId'   => $l->account_id,
    'accountCode' => $l->account?->code,
    'accountName' => $l->account?->name,
    'subtypeId'   => $l->subtype_id,
    'subtypeName' => $l->subtype?->name,
    'debit'       => $l->debit,
    'credit'      => $l->credit,
    'description' => $l->description,
]),
```

- [ ] **Step 4: Run to confirm it passes**

```bash
cd backend && php artisan test tests/Feature/AdjustingEntryTest.php::test_show_returns_subtype_and_description_per_line --no-coverage
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add backend/tests/Feature/AdjustingEntryTest.php \
        backend/app/Http/Controllers/AdjustingEntryController.php
git commit -m "feat: return subtypeId, subtypeName, description in adjusting entry show"
```

---

## Task 4: Controller — Save Subtype + Description on Update

**Files:**
- Modify: `backend/tests/Feature/AdjustingEntryTest.php`
- Modify: `backend/app/Http/Controllers/AdjustingEntryController.php`

- [ ] **Step 1: Add the failing test**

Append to `AdjustingEntryTest`:

```php
public function test_update_stores_subtype_and_description_per_line(): void
{
    $subtype = Subtype::factory()->create(['name' => 'Repairs']);

    $entry = AdjustingEntry::create([
        'company_id'  => $this->company->id,
        'created_by'  => $this->accountant->id,
        'status'      => 'draft',
        'type'        => 'Reclassification',
        'entry_date'  => '2026-06-02',
        'description' => 'Original memo',
        'ref_number'  => 'ADJ-001',
    ]);

    $this->actingAs($this->accountant)
        ->patchJson("/api/adjusting-entries/{$entry->id}", [
            'lines' => [
                [
                    'accountId'   => $this->debitAccount->id,
                    'subtypeId'   => $subtype->id,
                    'debit'       => 300.00,
                    'credit'      => null,
                    'description' => 'Roof repair',
                ],
                [
                    'accountId'   => $this->creditAccount->id,
                    'subtypeId'   => null,
                    'debit'       => null,
                    'credit'      => 300.00,
                    'description' => null,
                ],
            ],
        ])
        ->assertOk();

    $line = AdjustingEntryLine::where('account_id', $this->debitAccount->id)->first();
    $this->assertEquals($subtype->id, $line->subtype_id);
    $this->assertEquals('Roof repair', $line->description);
}
```

- [ ] **Step 2: Run to confirm it fails**

```bash
cd backend && php artisan test tests/Feature/AdjustingEntryTest.php::test_update_stores_subtype_and_description_per_line --no-coverage
```

Expected: FAIL — `subtype_id` and `description` are null after update.

- [ ] **Step 3: Update `AdjustingEntryController::update()` lines loop**

In `update()`, find the `foreach ($request->lines as $line)` block and replace it:

```php
foreach ($request->lines as $line) {
    AdjustingEntryLine::create([
        'adjusting_entry_id' => $entry->id,
        'account_id'         => $line['accountId'],
        'subtype_id'         => $line['subtypeId'] ?? null,
        'debit'              => $line['debit'] ?? null,
        'credit'             => $line['credit'] ?? null,
        'description'        => $line['description'] ?? null,
    ]);
}
```

- [ ] **Step 4: Run to confirm it passes**

```bash
cd backend && php artisan test tests/Feature/AdjustingEntryTest.php::test_update_stores_subtype_and_description_per_line --no-coverage
```

Expected: PASS.

- [ ] **Step 5: Run the full AdjustingEntryTest suite**

```bash
cd backend && php artisan test tests/Feature/AdjustingEntryTest.php --no-coverage
```

Expected: All 3 tests PASS.

- [ ] **Step 6: Commit**

```bash
git add backend/tests/Feature/AdjustingEntryTest.php \
        backend/app/Http/Controllers/AdjustingEntryController.php
git commit -m "feat: save subtypeId and description on adjusting entry line update"
```

---

## Task 5: JournalEntryService — Copy Description to Journal Entry Lines

**Files:**
- Modify: `backend/tests/Feature/JournalEntryServiceTest.php`
- Modify: `backend/app/Services/Accounting/JournalEntryService.php`

- [ ] **Step 1: Add the failing test**

Add these imports to `JournalEntryServiceTest.php` if not already present:

```php
use App\Models\AdjustingEntry;
use App\Models\AdjustingEntryLine;
```

Append this test method to `JournalEntryServiceTest`:

```php
public function test_post_from_adjusting_entry_copies_line_description_to_journal_entry_lines(): void
{
    $admin = User::factory()->create(['role' => 'admin']);

    $entry = AdjustingEntry::create([
        'company_id'  => $this->company->id,
        'created_by'  => $this->user->id,
        'status'      => 'pending',
        'type'        => 'Reclassification',
        'entry_date'  => '2026-06-02',
        'description' => 'Test adjusting entry',
        'ref_number'  => 'ADJ-001',
    ]);

    AdjustingEntryLine::create([
        'adjusting_entry_id' => $entry->id,
        'account_id'         => $this->expenseAccount->id,
        'debit'              => 500.00,
        'credit'             => null,
        'description'        => 'Office supplies purchase',
    ]);

    AdjustingEntryLine::create([
        'adjusting_entry_id' => $entry->id,
        'account_id'         => $this->revenueAccount->id,
        'debit'              => null,
        'credit'             => 500.00,
        'description'        => null,
    ]);

    $entry->load('lines');
    (new JournalEntryService())->postFromAdjustingEntry($entry, $admin);

    $debitJEL = JournalEntryLine::where('account_id', $this->expenseAccount->id)->first();
    $this->assertEquals('Office supplies purchase', $debitJEL->description);

    $creditJEL = JournalEntryLine::where('account_id', $this->revenueAccount->id)->first();
    $this->assertNull($creditJEL->description);
}
```

- [ ] **Step 2: Run to confirm it fails**

```bash
cd backend && php artisan test tests/Feature/JournalEntryServiceTest.php::test_post_from_adjusting_entry_copies_line_description_to_journal_entry_lines --no-coverage
```

Expected: FAIL — `description` on the `JournalEntryLine` is null.

- [ ] **Step 3: Update `postFromAdjustingEntry` in `JournalEntryService`**

In `backend/app/Services/Accounting/JournalEntryService.php`, find the `foreach ($entry->lines as $line)` block inside `postFromAdjustingEntry()` and replace:

```php
foreach ($entry->lines as $line) {
    JournalEntryLine::create([
        'journal_entry_id' => $journalEntry->id,
        'account_id'       => $line->account_id,
        'debit'            => $line->debit ?: null,
        'credit'           => $line->credit ?: null,
        'description'      => $line->description ?? null,
    ]);
}
```

- [ ] **Step 4: Run to confirm it passes**

```bash
cd backend && php artisan test tests/Feature/JournalEntryServiceTest.php --no-coverage
```

Expected: All tests in the file PASS.

- [ ] **Step 5: Commit**

```bash
git add backend/tests/Feature/JournalEntryServiceTest.php \
        backend/app/Services/Accounting/JournalEntryService.php
git commit -m "feat: copy adjusting entry line description to journal entry lines on post"
```

---

## Task 6: Frontend Types and API

**Files:**
- Modify: `frontend/src/types/adjusting-entry.ts`
- Modify: `frontend/src/lib/api/adjusting-entries.ts`

- [ ] **Step 1: Update `EntryLine` type**

Replace `frontend/src/types/adjusting-entry.ts` with:

```typescript
export type EntryStatus = 'DRAFT' | 'PENDING' | 'APPROVED' | 'REJECTED'
export type EntryType = 'Reclassification' | 'Reversal' | 'Other'

export interface EntryLine {
  accountId?: string
  accountCode: string
  accountName: string
  subtypeId: string | null
  subtypeName: string | null
  debit: number | null
  credit: number | null
  description: string | null
}

export interface AdjustingEntry {
  id: string
  companyId: string
  companyName: string
  createdBy: string | null
  approvedBy: string | null
  rejectedBy: string | null
  status: EntryStatus
  type: EntryType
  date: string
  memo: string
  refNumber: string
  lines: EntryLine[]
  rejectionReason: string | null
  parentEntryId: string | null
  submittedAt: string | null
  approvedAt: string | null
  rejectedAt: string | null
  createdAt: string
}
```

- [ ] **Step 2: Update `createEntry` line type in the API module**

In `frontend/src/lib/api/adjusting-entries.ts`, update the `createEntry` function signature:

```typescript
export async function createEntry(data: {
  companyId: string
  date: string
  memo: string
  type: EntryType
  lines: {
    accountId: string
    subtypeId: string | null
    debit: number | null
    credit: number | null
    description: string | null
  }[]
}): Promise<{ entryId: string }> {
  const { data: result } = await api.post<{ entryId: string }>('/adjusting-entries', data)
  return result
}
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/types/adjusting-entry.ts \
        frontend/src/lib/api/adjusting-entries.ts
git commit -m "feat: add subtypeId, subtypeName, description to EntryLine type and API"
```

---

## Task 7: AccountSelect Component

**Files:**
- Create: `frontend/src/components/adjusting-entries/AccountSelect.tsx`

- [ ] **Step 1: Create the component**

```typescript
// frontend/src/components/adjusting-entries/AccountSelect.tsx
'use client'

import { useState } from 'react'
import type { Account } from '@/types/admin'

interface Props {
  value: string
  accounts: Account[]
  onChange: (accountId: string) => void
}

export function AccountSelect({ value, accounts, onChange }: Props) {
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
              onMouseDown={() => { onChange(a.id); setOpen(false) }}
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
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/components/adjusting-entries/AccountSelect.tsx
git commit -m "feat: add AccountSelect searchable dropdown component"
```

---

## Task 8: EntryLineRow Rewrite

**Files:**
- Modify: `frontend/src/components/adjusting-entries/EntryLineRow.tsx`

- [ ] **Step 1: Replace the full file**

```typescript
// frontend/src/components/adjusting-entries/EntryLineRow.tsx
'use client'

import { Controller } from 'react-hook-form'
import type { Control, FieldValues } from 'react-hook-form'
import { AccountSelect } from './AccountSelect'
import { SubtypeCombobox } from '@/components/queue/SubtypeCombobox'
import type { Account } from '@/types/admin'

interface Props {
  index: number
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  control: Control<any, any, any>
  remove: () => void
  accounts: Account[]
}

export function EntryLineRow({ index, control, remove, accounts }: Props) {
  const activeBtn   = 'bg-indigo-600 text-white rounded px-2 py-1 text-xs font-semibold'
  const inactiveBtn = 'border border-gray-200 text-gray-500 rounded px-2 py-1 text-xs'

  return (
    <div className="flex gap-1.5 items-center">
      <div className="w-44 shrink-0">
        <Controller
          control={control}
          name={`lines.${index}.accountId`}
          render={({ field }) => (
            <AccountSelect
              value={field.value ?? ''}
              accounts={accounts}
              onChange={field.onChange}
            />
          )}
        />
      </div>

      <Controller
        control={control}
        name={`lines.${index}.subtypeId`}
        render={({ field: sidField }) => (
          <Controller
            control={control}
            name={`lines.${index}.subtypeName`}
            render={({ field: snField }) => (
              <SubtypeCombobox
                subtypeId={sidField.value}
                subtypeName={snField.value}
                onChange={(id, name) => { sidField.onChange(id); snField.onChange(name) }}
              />
            )}
          />
        )}
      />

      <Controller
        control={control}
        name={`lines.${index}.debit`}
        render={({ field: debitField }) => (
          <Controller
            control={control}
            name={`lines.${index}.credit`}
            render={({ field: creditField }) => {
              const isDebit  = debitField.value !== null && debitField.value !== undefined
              const isCredit = creditField.value !== null && creditField.value !== undefined
              return (
                <>
                  <button
                    type="button"
                    className={isDebit ? activeBtn : inactiveBtn}
                    onClick={() => {
                      if (!isDebit) {
                        debitField.onChange(0)
                        creditField.onChange(null)
                      }
                    }}
                  >
                    Dr
                  </button>
                  <button
                    type="button"
                    className={isCredit ? activeBtn : inactiveBtn}
                    onClick={() => {
                      if (!isCredit) {
                        creditField.onChange(0)
                        debitField.onChange(null)
                      }
                    }}
                  >
                    Cr
                  </button>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    className="w-20 border border-gray-200 rounded px-2 py-1 text-xs"
                    value={isDebit ? (debitField.value ?? '') : isCredit ? (creditField.value ?? '') : ''}
                    onChange={(e) => {
                      const v = e.target.value === '' ? null : parseFloat(e.target.value)
                      if (isDebit) debitField.onChange(v)
                      else if (isCredit) creditField.onChange(v)
                    }}
                    placeholder="Amount"
                  />
                </>
              )
            }}
          />
        )}
      />

      <Controller
        control={control}
        name={`lines.${index}.description`}
        render={({ field }) => (
          <input
            type="text"
            value={field.value ?? ''}
            onChange={(e) => field.onChange(e.target.value || null)}
            placeholder="Description…"
            className="flex-1 border border-gray-200 rounded px-2 py-1 text-xs"
          />
        )}
      />

      <button
        type="button"
        onClick={remove}
        className="text-gray-300 hover:text-red-500 transition-colors text-sm px-1 shrink-0"
        title="Remove line"
      >
        ✕
      </button>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/components/adjusting-entries/EntryLineRow.tsx
git commit -m "feat: rewrite EntryLineRow with lean inputs, SubtypeCombobox, and description"
```

---

## Task 9: EntryForm Rewrite

**Files:**
- Modify: `frontend/src/components/adjusting-entries/EntryForm.tsx`

- [ ] **Step 1: Replace the full file**

```typescript
// frontend/src/components/adjusting-entries/EntryForm.tsx
'use client'

import { useForm, useFieldArray, type Control, type FieldValues } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { EntryLineRow } from './EntryLineRow'
import { BalanceIndicator } from './BalanceIndicator'
import { useToast } from '@/hooks/use-toast'
import type { AdjustingEntry, EntryType } from '@/types/adjusting-entry'
import type { Account } from '@/types/admin'

const lineSchema = z.object({
  accountId:   z.string().min(1, 'Required'),
  subtypeId:   z.string().nullable().default(null),
  subtypeName: z.string().nullable().default(null),
  debit:       z.number().nullable(),
  credit:      z.number().nullable(),
  description: z.string().nullable().default(null),
})

const schema = z.object({
  companyId: z.string().min(1, 'Required'),
  date:      z.string().min(1, 'Required'),
  memo:      z.string().min(1, 'Required').max(1000),
  type:      z.enum(['Reclassification', 'Reversal', 'Other'] as const),
  lines:     z.array(lineSchema).min(2, 'At least 2 lines required'),
})

type FormValues = z.infer<typeof schema>

const emptyLine = () => ({
  accountId: '', subtypeId: null, subtypeName: null,
  debit: null, credit: null, description: null,
})

interface Props {
  companyId?: string
  initialData?: AdjustingEntry
  onSave: (data: FormValues, asDraft: boolean) => Promise<void>
  isAdmin?: boolean
  accounts: Account[]
  clients?: { id: string; name: string }[]
}

export function EntryForm({ companyId, initialData, onSave, isAdmin, accounts, clients }: Props) {
  const { toast } = useToast()

  const {
    register,
    control,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: initialData
      ? {
          companyId: initialData.companyId,
          date:      initialData.date,
          memo:      initialData.memo,
          type:      initialData.type,
          lines:     initialData.lines.map((l) => ({
            accountId:   l.accountId ?? '',
            subtypeId:   l.subtypeId ?? null,
            subtypeName: l.subtypeName ?? null,
            debit:       l.debit,
            credit:      l.credit,
            description: l.description ?? null,
          })),
        }
      : {
          companyId: companyId ?? '',
          date:      '',
          memo:      '',
          type:      'Reclassification',
          lines:     [emptyLine(), emptyLine()],
        },
  })

  const { fields, append, remove } = useFieldArray({ control, name: 'lines' })
  const watchedLines = watch('lines')

  const checkBalance = (): boolean => {
    const totalDebits  = watchedLines.reduce((s, l) => s + (l.debit ?? 0), 0)
    const totalCredits = watchedLines.reduce((s, l) => s + (l.credit ?? 0), 0)
    return Math.abs(totalDebits - totalCredits) < 0.01
  }

  const submit = async (values: FormValues, asDraft: boolean, selfApprove?: boolean) => {
    if (!asDraft && !checkBalance()) {
      toast({ title: 'Entry is not balanced. Total debits must equal total credits.', variant: 'destructive' })
      return
    }
    await onSave({ ...values, ...(selfApprove ? { selfApprove: true } : {}) } as FormValues, asDraft)
  }

  const companyIdLocked = !!initialData || !!companyId
  const inputCls        = 'w-full border border-gray-200 rounded px-2 py-1.5 text-sm'
  const labelCls        = 'text-xs text-gray-500 font-medium mb-0.5 block'
  const sectionHdrCls   = 'text-[10px] font-bold uppercase tracking-wide text-gray-500 mb-3'

  const selectedClient = clients?.find((c) => c.id === watch('companyId'))

  return (
    <div className="space-y-3">
      {/* Entry details card */}
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <p className={sectionHdrCls}>Entry Details</p>
        <div className="grid grid-cols-2 gap-x-4 gap-y-3">
          <div>
            <label className={labelCls}>Client</label>
            {companyIdLocked ? (
              <>
                <input type="hidden" {...register('companyId')} />
                <input
                  disabled
                  value={selectedClient?.name ?? watch('companyId')}
                  className={`${inputCls} bg-gray-50 text-gray-500`}
                  readOnly
                />
              </>
            ) : clients && clients.length > 0 ? (
              <select
                value={watch('companyId')}
                onChange={(e) => setValue('companyId', e.target.value)}
                className={inputCls}
              >
                <option value="">Select client…</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            ) : (
              <input {...register('companyId')} placeholder="Company ID" className={inputCls} />
            )}
            {errors.companyId && <p className="text-xs text-red-500 mt-0.5">{errors.companyId.message}</p>}
          </div>

          <div>
            <label className={labelCls}>Date</label>
            <input type="date" {...register('date')} className={inputCls} />
            {errors.date && <p className="text-xs text-red-500 mt-0.5">{errors.date.message}</p>}
          </div>

          <div className="col-span-2">
            <label className={labelCls}>Memo</label>
            <textarea {...register('memo')} rows={3} className={`${inputCls} resize-none`} />
            {errors.memo && <p className="text-xs text-red-500 mt-0.5">{errors.memo.message}</p>}
          </div>

          <div>
            <label className={labelCls}>Type</label>
            <select
              value={watch('type')}
              onChange={(e) => setValue('type', e.target.value as EntryType)}
              className={inputCls}
            >
              <option value="Reclassification">Reclassification</option>
              <option value="Reversal">Reversal</option>
              <option value="Other">Other</option>
            </select>
          </div>
        </div>
      </div>

      {/* Journal lines card */}
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <p className={sectionHdrCls}>Journal Lines</p>
        <div className="flex gap-1.5 mb-1.5 text-[10px] text-gray-400 font-semibold uppercase tracking-wide">
          <span className="w-44 shrink-0">Account</span>
          <span className="w-24 shrink-0">Subtype</span>
          <span className="w-[148px] shrink-0">Dr / Cr · Amount</span>
          <span className="flex-1">Description</span>
        </div>
        <div className="space-y-1.5">
          {fields.map((field, index) => (
            <EntryLineRow
              key={field.id}
              index={index}
              control={control as unknown as Control<FieldValues>}
              remove={() => remove(index)}
              accounts={accounts}
            />
          ))}
        </div>
        {errors.lines && <p className="text-xs text-red-500 mt-1">{errors.lines.message as string}</p>}
        <button
          type="button"
          onClick={() => append(emptyLine())}
          className="text-xs text-indigo-600 font-semibold hover:text-indigo-800 mt-2"
        >
          + Add Line
        </button>
      </div>

      <BalanceIndicator lines={watchedLines} />

      <div className="flex gap-2 flex-wrap">
        <button
          type="button"
          disabled={isSubmitting}
          onClick={handleSubmit((v) => submit(v, true))}
          className="border border-gray-200 text-gray-700 text-xs font-semibold px-4 py-2 rounded-md hover:bg-gray-50 transition-colors disabled:opacity-50"
        >
          Save as Draft
        </button>
        <button
          type="button"
          disabled={isSubmitting}
          onClick={handleSubmit((v) => submit(v, false))}
          className="bg-indigo-600 text-white text-xs font-semibold px-4 py-2 rounded-md hover:bg-indigo-700 transition-colors disabled:opacity-50"
        >
          Submit to Admin
        </button>
        {isAdmin && (
          <button
            type="button"
            disabled={isSubmitting}
            onClick={handleSubmit((v) => submit(v, false, true))}
            className="bg-green-600 text-white text-xs font-semibold px-4 py-2 rounded-md hover:bg-green-700 transition-colors disabled:opacity-50"
          >
            Approve Immediately
          </button>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/components/adjusting-entries/EntryForm.tsx
git commit -m "feat: rewrite EntryForm with lean two-card layout and subtype + description fields"
```

---

## Task 10: Page Wrappers

**Files:**
- Modify: `frontend/src/app/accountant/adjusting-entries/new/page.tsx`
- Modify: `frontend/src/app/admin/adjusting-entries/new/page.tsx`

- [ ] **Step 1: Add back link to accountant new page**

In `frontend/src/app/accountant/adjusting-entries/new/page.tsx`, add a `Link` import and back link inside `NewEntryContent` above the `EntryForm`:

```typescript
'use client'

import { Suspense } from 'react'
import Link from 'next/link'
import { useSearchParams, useRouter } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { createEntry, submitEntry } from '@/lib/api/adjusting-entries'
import { getAccountantClients } from '@/lib/api/accountant/clients'
import { getAccounts } from '@/lib/api/accounts'
import { EntryForm } from '@/components/adjusting-entries/EntryForm'
import { useToast } from '@/hooks/use-toast'

function NewEntryContent() {
  const router = useRouter()
  const { toast } = useToast()
  const searchParams = useSearchParams()
  const prefilledClientId = searchParams.get('clientId') ?? undefined

  const { data: clients } = useQuery({
    queryKey: ['accountant-clients'],
    queryFn: () => getAccountantClients(),
  })

  const selectedClientId = prefilledClientId

  const { data: accounts } = useQuery({
    queryKey: ['accounts', selectedClientId],
    queryFn: () => getAccounts(selectedClientId),
    enabled: !!selectedClientId,
  })

  const clientOptions = (clients ?? []).map((c) => ({ id: c.id, name: c.name }))

  const onSave = async (data: any, asDraft: boolean) => { // eslint-disable-line @typescript-eslint/no-explicit-any
    const { entryId } = await createEntry({
      companyId: data.companyId,
      date: data.date,
      memo: data.memo,
      type: data.type,
      lines: data.lines.map((l: any) => ({ // eslint-disable-line @typescript-eslint/no-explicit-any
        accountId:   l.accountId,
        subtypeId:   l.subtypeId ?? null,
        debit:       l.debit,
        credit:      l.credit,
        description: l.description ?? null,
      })),
    })
    if (!asDraft) {
      await submitEntry(entryId)
      toast({ title: 'Submitted for approval.' })
    } else {
      toast({ title: 'Draft saved.' })
    }
    router.push(`/accountant/adjusting-entries/${entryId}`)
  }

  return (
    <div className="max-w-2xl">
      <Link
        href="/accountant/adjusting-entries"
        className="inline-flex items-center gap-1 text-xs text-indigo-600 font-medium hover:text-indigo-800 mb-3"
      >
        ← Back to Adjusting Entries
      </Link>
      <h1 className="text-lg font-bold text-gray-900 tracking-tight mb-4">New Adjusting Entry</h1>
      <EntryForm
        companyId={prefilledClientId}
        onSave={onSave}
        accounts={accounts ?? []}
        clients={clientOptions}
      />
    </div>
  )
}

export default function NewAdjustingEntryPage() {
  return (
    <Suspense>
      <NewEntryContent />
    </Suspense>
  )
}
```

- [ ] **Step 2: Update admin new page — replace shadcn client selector, pass `clients` to `EntryForm`**

Replace `frontend/src/app/admin/adjusting-entries/new/page.tsx` with:

```typescript
'use client'

import { Suspense, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { getClients } from '@/lib/api/admin/clients'
import { getAccounts } from '@/lib/api/accounts'
import { createEntry, submitEntry } from '@/lib/api/adjusting-entries'
import { EntryForm } from '@/components/adjusting-entries/EntryForm'
import { useToast } from '@/hooks/use-toast'

function NewEntryContent() {
  const router = useRouter()
  const { toast } = useToast()
  const [selectedCompanyId, setSelectedCompanyId] = useState<string | undefined>()

  const { data: clientsData } = useQuery({
    queryKey: ['admin-clients', {}],
    queryFn: () => getClients(),
  })

  const { data: accounts } = useQuery({
    queryKey: ['accounts', selectedCompanyId],
    queryFn: () => getAccounts(selectedCompanyId),
    enabled: !!selectedCompanyId,
  })

  const clients = (clientsData?.data ?? []).map((c) => ({ id: c.id, name: c.name }))

  const onSave = async (data: any, asDraft: boolean) => { // eslint-disable-line @typescript-eslint/no-explicit-any
    const selfApprove = !!data.selfApprove
    const { entryId } = await createEntry({
      companyId: data.companyId,
      date:      data.date,
      memo:      data.memo,
      type:      data.type,
      lines:     data.lines.map((l: any) => ({ // eslint-disable-line @typescript-eslint/no-explicit-any
        accountId:   l.accountId,
        subtypeId:   l.subtypeId ?? null,
        debit:       l.debit,
        credit:      l.credit,
        description: l.description ?? null,
      })),
    })
    if (selfApprove) {
      await submitEntry(entryId, true)
      toast({ title: 'Entry approved.' })
    } else if (!asDraft) {
      await submitEntry(entryId)
      toast({ title: 'Submitted for approval.' })
    } else {
      toast({ title: 'Draft saved.' })
    }
    router.push(`/admin/adjusting-entries/${entryId}`)
  }

  return (
    <div className="max-w-2xl">
      <Link
        href="/admin/adjusting-entries"
        className="inline-flex items-center gap-1 text-xs text-indigo-600 font-medium hover:text-indigo-800 mb-3"
      >
        ← Back to Adjusting Entries
      </Link>
      <h1 className="text-lg font-bold text-gray-900 tracking-tight mb-4">New Adjusting Entry</h1>

      <div className="bg-white border border-gray-200 rounded-lg p-4 mb-3">
        <p className="text-[10px] font-bold uppercase tracking-wide text-gray-500 mb-2">Client</p>
        <select
          value={selectedCompanyId ?? ''}
          onChange={(e) => setSelectedCompanyId(e.target.value || undefined)}
          className="w-full border border-gray-200 rounded px-2 py-1.5 text-sm"
        >
          <option value="">Select client…</option>
          {clients.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      </div>

      {selectedCompanyId && (
        <EntryForm
          key={selectedCompanyId}
          companyId={selectedCompanyId}
          onSave={onSave}
          isAdmin
          accounts={accounts ?? []}
          clients={clients}
        />
      )}
    </div>
  )
}

export default function AdminNewEntryPage() {
  return (
    <Suspense>
      <NewEntryContent />
    </Suspense>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/app/accountant/adjusting-entries/new/page.tsx \
        frontend/src/app/admin/adjusting-entries/new/page.tsx
git commit -m "feat: update new entry page wrappers with back link and lean client selector"
```

---

## Self-Review

**Spec coverage:**
- ✅ Migration adds `subtype_id` to `adjusting_entry_lines` (Task 1)
- ✅ `AdjustingEntryLine` model updated (Task 1)
- ✅ `CreateEntryRequest` rules updated (Task 1)
- ✅ Controller saves `subtypeId` + `description` on create (Task 2)
- ✅ Controller returns `subtypeId`, `subtypeName`, `description` in show (Task 3)
- ✅ Controller saves `subtypeId` + `description` on update (Task 4)
- ✅ `postFromAdjustingEntry` copies `description` to JEL (Task 5)
- ✅ `EntryLine` type updated (Task 6)
- ✅ `createEntry` API updated (Task 6)
- ✅ `AccountSelect` created (Task 7)
- ✅ `EntryLineRow` rewritten with `SubtypeCombobox` + description (Task 8)
- ✅ `EntryForm` rewritten with two-card layout + updated schema (Task 9)
- ✅ Accountant new page: back link (Task 10)
- ✅ Admin new page: raw client selector, `clients` passed to `EntryForm` (Task 10)

**Type consistency:** `emptyLine()` helper returns the exact shape matching `lineSchema` defaults — used in both `defaultValues` and `append()`. `EntryLine.subtypeId/subtypeName/description` fields defined in Task 6 and consumed in Task 9.
