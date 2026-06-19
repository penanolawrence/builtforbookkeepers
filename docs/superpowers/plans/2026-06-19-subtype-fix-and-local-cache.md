# Subtype Fix & Local Cache Speed Improvements — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix the broken subtype FK plumbing (controller still writes to the dropped `subtypes` table) and add a localStorage caching layer so chart-of-accounts lookups and subtype search are instant.

**Architecture:** Backend retargets `SubtypeController` to `ChartOfAccountSubtype` with a schema migration that makes `chart_of_account_id` and `code` nullable for user-created subtypes, then drops the old `subtypes` table. Frontend adds a `localCache` utility (TTL-aware localStorage wrapper), a `useAppPreloader` hook that fires once after login to warm the cache, and updates `SubtypeCombobox` to do client-side filtering instead of a debounced server search per keystroke.

**Tech Stack:** Laravel 11 (migrations, PHPUnit), Next.js 14 App Router / React 18 (custom hook, localStorage), Jest + React Testing Library.

**Reference spec:** `docs/superpowers/specs/2026-06-19-subtype-fix-and-local-cache-design.md`

## Global Constraints

- localStorage key prefix: `b4b_cache_` — all cache keys stored as `b4b_cache_{key}`
- Cache keys (without prefix): `subtypes`, `accounts_{clientId}`, `clients_{userId}`, `accountants`
- TTLs: subtypes 24 h, accounts 24 h, clients 30 min, accountants 1 h
- `SubtypeController` only surfaces user-created subtypes (`chart_of_account_id IS NULL`); COA-linked subtypes stay hidden from this API
- `GET /subtypes` with no `q` param → return all user-created subtypes (preload call)
- `GET /subtypes?q=xxx` with `q` < 3 chars → return empty array
- Response shape for subtypes stays `{ id: string, name: string }[]` — no frontend API contract change
- All cache reads/writes wrapped in try/catch — localStorage unavailability must be a silent no-op

---

## File Structure

**Backend — modify:**
- `backend/app/Http/Controllers/SubtypeController.php` — retarget to `ChartOfAccountSubtype`
- `backend/database/seeders/SubtypeSeeder.php` — seed 22 canonical names into `chart_of_account_subtypes`
- `backend/tests/Feature/SubtypeTest.php` — rewrite against `ChartOfAccountSubtype`

**Backend — create:**
- `backend/database/migrations/2026_06_19_000001_relax_chart_of_account_subtypes_schema.php`
- `backend/database/migrations/2026_06_19_000002_drop_subtypes_table.php`

**Backend — delete:**
- `backend/app/Models/Subtype.php`

**Frontend — create:**
- `frontend/src/lib/localCache.ts` — TTL-aware localStorage wrapper
- `frontend/src/lib/__tests__/localCache.test.ts`
- `frontend/src/lib/hooks/useAppPreloader.ts` — fires once after login to warm all caches
- `frontend/src/components/queue/__tests__/SubtypeCombobox.test.tsx`

**Frontend — modify:**
- `frontend/src/lib/api/subtypes.ts` — make `q` param optional
- `frontend/src/app/accountant/layout.tsx` — call `useAppPreloader`
- `frontend/src/app/admin/layout.tsx` — call `useAppPreloader`
- `frontend/src/components/queue/SubtypeCombobox.tsx` — client-side filter + write-through
- `frontend/src/components/queue/QueuePageContent.tsx` — `initialData` from cache for client/accountant lists
- `frontend/src/components/queue/QueueReviewModal.tsx` — `initialData` from cache for accounts
- `frontend/src/components/accountant/NewClientModal.tsx` — invalidate `clients_` cache on create
- `frontend/src/components/admin/AccountantModal.tsx` — invalidate `accountants` cache on create

---

### Task 1: Backend — Relax `chart_of_account_subtypes` schema

**Files:**
- Create: `backend/database/migrations/2026_06_19_000001_relax_chart_of_account_subtypes_schema.php`

**Interfaces:**
- Produces: `chart_of_account_subtypes.chart_of_account_id` nullable, `chart_of_account_subtypes.code` nullable, `chart_of_account_subtypes.sort_order` default 0 — required by Tasks 3 and 4

- [ ] **Step 1: Create the migration**

```php
<?php
// backend/database/migrations/2026_06_19_000001_relax_chart_of_account_subtypes_schema.php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('chart_of_account_subtypes', function (Blueprint $table) {
            $table->uuid('chart_of_account_id')->nullable()->change();
            $table->string('code', 10)->nullable()->change();
            $table->unsignedSmallInteger('sort_order')->default(0)->change();
        });
    }

    public function down(): void
    {
        Schema::table('chart_of_account_subtypes', function (Blueprint $table) {
            $table->uuid('chart_of_account_id')->nullable(false)->change();
            $table->string('code', 10)->nullable(false)->change();
            $table->unsignedSmallInteger('sort_order')->default(null)->change();
        });
    }
};
```

- [ ] **Step 2: Run the migration**

Run: `cd backend && php artisan migrate`
Expected: `2026_06_19_000001_relax_chart_of_account_subtypes_schema ... DONE`

- [ ] **Step 3: Commit**

```bash
git add backend/database/migrations/2026_06_19_000001_relax_chart_of_account_subtypes_schema.php
git commit -m "feat: make chart_of_account_id and code nullable on chart_of_account_subtypes"
```

---

### Task 2: Backend — Drop `subtypes` table and delete `Subtype` model

**Files:**
- Create: `backend/database/migrations/2026_06_19_000002_drop_subtypes_table.php`
- Delete: `backend/app/Models/Subtype.php`

**Interfaces:**
- Produces: `subtypes` table removed; `Subtype` model gone — Tasks 3 and 4 must not import it

- [ ] **Step 1: Create the migration**

```php
<?php
// backend/database/migrations/2026_06_19_000002_drop_subtypes_table.php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::dropIfExists('subtypes');
    }

    public function down(): void
    {
        Schema::create('subtypes', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('name')->unique();
            $table->timestamps();
        });
    }
};
```

- [ ] **Step 2: Run the migration**

Run: `cd backend && php artisan migrate`
Expected: `2026_06_19_000002_drop_subtypes_table ... DONE`

- [ ] **Step 3: Delete the Subtype model**

Delete the file `backend/app/Models/Subtype.php`.

- [ ] **Step 4: Commit**

```bash
git add backend/database/migrations/2026_06_19_000002_drop_subtypes_table.php
git rm backend/app/Models/Subtype.php
git commit -m "feat: drop subtypes table and delete Subtype model"
```

---

### Task 3: Backend — Retarget `SubtypeController` to `ChartOfAccountSubtype`

**Files:**
- Modify: `backend/app/Http/Controllers/SubtypeController.php`
- Modify: `backend/tests/Feature/SubtypeTest.php`

**Interfaces:**
- Consumes: `chart_of_account_subtypes` schema from Task 1 (nullable `chart_of_account_id`, nullable `code`)
- Produces: `GET /subtypes` (no q) → all user-created subtypes; `GET /subtypes?q=xxx` (≥3 chars) → filtered; `POST /subtypes` → creates in `chart_of_account_subtypes` with null FK

- [ ] **Step 1: Rewrite `SubtypeTest.php` with failing tests**

```php
<?php
// backend/tests/Feature/SubtypeTest.php

namespace Tests\Feature;

use App\Models\ChartOfAccountSubtype;
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

    private function makeSubtype(string $name): ChartOfAccountSubtype
    {
        return ChartOfAccountSubtype::create([
            'name'                 => $name,
            'chart_of_account_id' => null,
            'code'                 => null,
            'sort_order'           => 0,
        ]);
    }

    public function test_index_with_no_query_returns_all_user_created_subtypes(): void
    {
        $this->makeSubtype('Internet');
        $this->makeSubtype('Telephone');

        $this->actingAs($this->accountant)
            ->getJson('/api/subtypes')
            ->assertOk()
            ->assertJsonCount(2);
    }

    public function test_search_returns_empty_array_when_query_under_3_chars(): void
    {
        $this->makeSubtype('Internet');

        $this->actingAs($this->accountant)
            ->getJson('/api/subtypes?q=In')
            ->assertOk()
            ->assertExactJson([]);
    }

    public function test_search_returns_matching_subtypes_for_3_or_more_chars(): void
    {
        $this->makeSubtype('Internet');
        $this->makeSubtype('Telephone');
        $this->makeSubtype('Load');

        $this->actingAs($this->accountant)
            ->getJson('/api/subtypes?q=Int')
            ->assertOk()
            ->assertJsonCount(1)
            ->assertJsonFragment(['name' => 'Internet']);
    }

    public function test_search_is_case_insensitive(): void
    {
        $this->makeSubtype('Internet');

        $this->actingAs($this->accountant)
            ->getJson('/api/subtypes?q=int')
            ->assertOk()
            ->assertJsonFragment(['name' => 'Internet']);
    }

    public function test_create_stores_new_subtype_in_chart_of_account_subtypes(): void
    {
        $this->actingAs($this->accountant)
            ->postJson('/api/subtypes', ['name' => 'Internet'])
            ->assertStatus(201)
            ->assertJsonFragment(['name' => 'Internet']);

        $this->assertDatabaseHas('chart_of_account_subtypes', [
            'name'                 => 'Internet',
            'chart_of_account_id' => null,
            'code'                 => null,
        ]);
    }

    public function test_create_returns_existing_subtype_when_name_already_exists(): void
    {
        $existing = $this->makeSubtype('Internet');

        $this->actingAs($this->accountant)
            ->postJson('/api/subtypes', ['name' => 'Internet'])
            ->assertStatus(201)
            ->assertJsonFragment(['id' => $existing->id, 'name' => 'Internet']);

        $this->assertDatabaseCount('chart_of_account_subtypes', 1);
    }

    public function test_routes_require_authentication(): void
    {
        $this->getJson('/api/subtypes?q=int')->assertUnauthorized();
        $this->postJson('/api/subtypes', ['name' => 'test'])->assertUnauthorized();
    }
}
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd backend && php artisan test --filter SubtypeTest`
Expected: FAIL — tests reference `chart_of_account_subtypes` but controller still uses `Subtype`.

- [ ] **Step 3: Rewrite `SubtypeController.php`**

```php
<?php
// backend/app/Http/Controllers/SubtypeController.php

namespace App\Http\Controllers;

use App\Models\ChartOfAccountSubtype;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class SubtypeController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $q = $request->query('q', '');

        $query = ChartOfAccountSubtype::whereNull('chart_of_account_id')
            ->orderBy('name');

        if (strlen($q) >= 3) {
            $operator = config('database.default') === 'pgsql' ? 'ilike' : 'like';
            $query->where('name', $operator, "%{$q}%");
        } elseif (strlen($q) > 0) {
            return response()->json([]);
        }

        return response()->json($query->get(['id', 'name']));
    }

    public function store(Request $request): JsonResponse
    {
        $request->validate(['name' => ['required', 'string', 'max:255']]);

        $subtype = ChartOfAccountSubtype::firstOrCreate(
            ['name' => $request->name, 'chart_of_account_id' => null],
            ['code' => null, 'sort_order' => 0]
        );

        return response()->json(['id' => $subtype->id, 'name' => $subtype->name], 201);
    }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd backend && php artisan test --filter SubtypeTest`
Expected: `Tests: 6 passed, 6 total`

- [ ] **Step 5: Commit**

```bash
git add backend/app/Http/Controllers/SubtypeController.php backend/tests/Feature/SubtypeTest.php
git commit -m "feat: retarget SubtypeController to ChartOfAccountSubtype"
```

---

### Task 4: Backend — Repurpose `SubtypeSeeder`

**Files:**
- Modify: `backend/database/seeders/SubtypeSeeder.php`

**Interfaces:**
- Consumes: `chart_of_account_subtypes` schema from Task 1 (nullable `chart_of_account_id`, nullable `code`)

- [ ] **Step 1: Rewrite `SubtypeSeeder.php`**

```php
<?php
// backend/database/seeders/SubtypeSeeder.php

namespace Database\Seeders;

use App\Models\ChartOfAccountSubtype;
use Illuminate\Database\Seeder;

class SubtypeSeeder extends Seeder
{
    public function run(): void
    {
        $names = [
            // Income
            'Sales Revenue',
            'Service Revenue',
            'Interest Income',
            'Rental Income',
            'Commission Income',
            'Other Income',
            // Expense
            'Cost of Goods Sold',
            'Salaries and Wages',
            'Rent Expense',
            'Utilities Expense',
            'Communication Expense',
            'Supplies Expense',
            'Transportation Expense',
            'Meals and Entertainment',
            'Advertising Expense',
            'Professional Fees',
            'Repairs and Maintenance',
            'Insurance Expense',
            'Depreciation Expense',
            'Taxes and Licenses',
            'Interest Expense',
            'Other Expense',
        ];

        foreach ($names as $name) {
            ChartOfAccountSubtype::firstOrCreate(
                ['name' => $name, 'chart_of_account_id' => null],
                ['code' => null, 'sort_order' => 0]
            );
        }

        $this->command->info('Subtypes: ' . count($names) . ' canonical subtypes seeded into chart_of_account_subtypes.');
    }
}
```

- [ ] **Step 2: Run the seeder to verify**

Run: `cd backend && php artisan db:seed --class=SubtypeSeeder`
Expected: `Subtypes: 22 canonical subtypes seeded into chart_of_account_subtypes.`

- [ ] **Step 3: Run the full backend test suite**

Run: `cd backend && php artisan test`
Expected: all tests pass.

- [ ] **Step 4: Commit**

```bash
git add backend/database/seeders/SubtypeSeeder.php
git commit -m "feat: repurpose SubtypeSeeder to seed canonical names into chart_of_account_subtypes"
```

---

### Task 5: Frontend — `localCache.ts` utility

**Files:**
- Create: `frontend/src/lib/localCache.ts`
- Create: `frontend/src/lib/__tests__/localCache.test.ts`

**Interfaces:**
- Produces: `localCache.get<T>(key)`, `localCache.set(key, data, ttlMs)`, `localCache.invalidate(key)`, `localCache.invalidatePrefix(prefix)` — used by Tasks 6, 7, 8, 9, 10

- [ ] **Step 1: Write the failing tests**

```ts
// frontend/src/lib/__tests__/localCache.test.ts
import { localCache } from '../localCache'

describe('localCache', () => {
  beforeEach(() => {
    localStorage.clear()
    jest.useFakeTimers()
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  describe('get / set', () => {
    it('returns null for a missing key', () => {
      expect(localCache.get('missing')).toBeNull()
    })

    it('returns stored data within TTL', () => {
      localCache.set('key', { value: 42 }, 60_000)
      expect(localCache.get('key')).toEqual({ value: 42 })
    })

    it('returns null after TTL expires', () => {
      localCache.set('key', 'hello', 1_000)
      jest.advanceTimersByTime(2_000)
      expect(localCache.get('key')).toBeNull()
    })

    it('removes the expired entry from localStorage on read', () => {
      localCache.set('key', 'hello', 1_000)
      jest.advanceTimersByTime(2_000)
      localCache.get('key')
      expect(localStorage.getItem('b4b_cache_key')).toBeNull()
    })
  })

  describe('invalidate', () => {
    it('removes the entry', () => {
      localCache.set('key', 'hello', 60_000)
      localCache.invalidate('key')
      expect(localCache.get('key')).toBeNull()
    })
  })

  describe('invalidatePrefix', () => {
    it('removes all keys starting with prefix and leaves others', () => {
      localCache.set('accounts_abc', [1], 60_000)
      localCache.set('accounts_def', [2], 60_000)
      localCache.set('subtypes', [3], 60_000)
      localCache.invalidatePrefix('accounts_')
      expect(localCache.get('accounts_abc')).toBeNull()
      expect(localCache.get('accounts_def')).toBeNull()
      expect(localCache.get('subtypes')).toEqual([3])
    })
  })

  describe('error handling', () => {
    it('returns null when localStorage.getItem throws', () => {
      jest.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
        throw new Error('SecurityError')
      })
      expect(localCache.get('key')).toBeNull()
    })

    it('silently no-ops when localStorage.setItem throws', () => {
      jest.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
        throw new Error('QuotaExceededError')
      })
      expect(() => localCache.set('key', 'data', 60_000)).not.toThrow()
    })
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd frontend && npx jest localCache`
Expected: FAIL — cannot find module `'../localCache'`.

- [ ] **Step 3: Write the implementation**

```ts
// frontend/src/lib/localCache.ts
const PREFIX = 'b4b_cache_'

interface CacheEntry<T> {
  data: T
  expiresAt: number
}

export const localCache = {
  get<T>(key: string): T | null {
    try {
      const raw = localStorage.getItem(PREFIX + key)
      if (!raw) return null
      const entry: CacheEntry<T> = JSON.parse(raw)
      if (Date.now() > entry.expiresAt) {
        localStorage.removeItem(PREFIX + key)
        return null
      }
      return entry.data
    } catch {
      return null
    }
  },

  set<T>(key: string, data: T, ttlMs: number): void {
    try {
      const entry: CacheEntry<T> = { data, expiresAt: Date.now() + ttlMs }
      localStorage.setItem(PREFIX + key, JSON.stringify(entry))
    } catch {
      // localStorage full or unavailable — silent no-op
    }
  },

  invalidate(key: string): void {
    try {
      localStorage.removeItem(PREFIX + key)
    } catch {
      // silent no-op
    }
  },

  invalidatePrefix(prefix: string): void {
    try {
      const fullPrefix = PREFIX + prefix
      Object.keys(localStorage)
        .filter((k) => k.startsWith(fullPrefix))
        .forEach((k) => localStorage.removeItem(k))
    } catch {
      // silent no-op
    }
  },
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd frontend && npx jest localCache`
Expected: `Tests: 8 passed, 8 total`

- [ ] **Step 5: Commit**

```bash
git add frontend/src/lib/localCache.ts frontend/src/lib/__tests__/localCache.test.ts
git commit -m "feat: add localCache TTL-aware localStorage utility"
```

---

### Task 6: Frontend — `subtypes.ts` API update and `useAppPreloader` hook

**Files:**
- Modify: `frontend/src/lib/api/subtypes.ts`
- Create: `frontend/src/lib/hooks/useAppPreloader.ts`

**Interfaces:**
- Consumes: `localCache` from Task 5; `getAccounts` from `accounts.ts`; `getAccountantClients`, `getClients`, `getAccountants` from their respective API files; `User` type from `@/types/auth`
- Produces: `useAppPreloader(user: User | null): void` — used by Task 7; `searchSubtypes(q?: string)` (q now optional) — used by Task 8

- [ ] **Step 1: Make `q` optional in `subtypes.ts`**

In `frontend/src/lib/api/subtypes.ts`, change:

```ts
export async function searchSubtypes(q: string): Promise<Subtype[]> {
  const { data } = await api.get<Subtype[]>('/subtypes', { params: { q } })
  return data
}
```

to:

```ts
export async function searchSubtypes(q?: string): Promise<Subtype[]> {
  const { data } = await api.get<Subtype[]>('/subtypes', { params: q ? { q } : undefined })
  return data
}
```

- [ ] **Step 2: Create `useAppPreloader.ts`**

```ts
// frontend/src/lib/hooks/useAppPreloader.ts
'use client'

import { useEffect, useRef } from 'react'
import { searchSubtypes } from '@/lib/api/subtypes'
import { getAccounts } from '@/lib/api/accounts'
import { getAccountantClients } from '@/lib/api/accountant/clients'
import { getClients } from '@/lib/api/admin/clients'
import { getAccountants } from '@/lib/api/admin/accountants'
import { localCache } from '@/lib/localCache'
import type { User } from '@/types/auth'

const TTL_24H = 24 * 60 * 60 * 1000
const TTL_30M = 30 * 60 * 1000
const TTL_1H  = 60 * 60 * 1000

export function useAppPreloader(user: User | null): void {
  const ran = useRef(false)

  useEffect(() => {
    if (!user || ran.current) return
    ran.current = true
    void preload(user)
  }, [user?.id])
}

async function preload(user: User): Promise<void> {
  // 1. Subtypes (all roles, global)
  if (!localCache.get('subtypes')) {
    try {
      const subtypes = await searchSubtypes()
      localCache.set('subtypes', subtypes, TTL_24H)
    } catch { /* silent — cache miss means combobox falls back to server search */ }
  }

  if (user.role === 'accountant') {
    await preloadAccountantData(user.id)
  }

  if (user.role === 'admin') {
    await preloadAdminData(user.id)
  }
}

async function preloadAccountantData(userId: string): Promise<void> {
  const clientsKey = `clients_${userId}`
  let clientIds: string[] = []

  if (!localCache.get(clientsKey)) {
    try {
      const result = await getAccountantClients({ per_page: 100 })
      localCache.set(clientsKey, result.data, TTL_30M)
      clientIds = result.data.map((c) => c.id)
    } catch { return }
  } else {
    const cached = localCache.get<{ id: string }[]>(clientsKey)
    clientIds = cached?.map((c) => c.id) ?? []
  }

  await Promise.all(
    clientIds.map(async (clientId) => {
      const key = `accounts_${clientId}`
      if (localCache.get(key)) return
      try {
        const accounts = await getAccounts(clientId)
        localCache.set(key, accounts, TTL_24H)
      } catch { /* silent */ }
    })
  )
}

async function preloadAdminData(userId: string): Promise<void> {
  const clientsKey = `clients_${userId}`
  let clientIds: string[] = []

  if (!localCache.get(clientsKey)) {
    try {
      const result = await getClients()
      localCache.set(clientsKey, result.data, TTL_30M)
      clientIds = result.data.map((c: { id: string }) => c.id)
    } catch { return }
  } else {
    const cached = localCache.get<{ id: string }[]>(clientsKey)
    clientIds = cached?.map((c) => c.id) ?? []
  }

  await Promise.all(
    clientIds.map(async (clientId) => {
      const key = `accounts_${clientId}`
      if (localCache.get(key)) return
      try {
        const accounts = await getAccounts(clientId)
        localCache.set(key, accounts, TTL_24H)
      } catch { /* silent */ }
    })
  )

  if (!localCache.get('accountants')) {
    try {
      const accountants = await getAccountants()
      localCache.set('accountants', accountants, TTL_1H)
    } catch { /* silent */ }
  }
}
```

- [ ] **Step 3: Run the frontend type check**

Run: `cd frontend && npx tsc --noEmit`
Expected: no errors on the new files.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/lib/api/subtypes.ts frontend/src/lib/hooks/useAppPreloader.ts
git commit -m "feat: add useAppPreloader hook and make searchSubtypes q param optional"
```

---

### Task 7: Frontend — Wire `useAppPreloader` into accountant and admin layouts

**Files:**
- Modify: `frontend/src/app/accountant/layout.tsx`
- Modify: `frontend/src/app/admin/layout.tsx`

**Interfaces:**
- Consumes: `useAppPreloader` from Task 6; `useAuth` from `@/lib/hooks/useAuth`

- [ ] **Step 1: Update `accountant/layout.tsx`**

Change:

```tsx
'use client'

import { ThemeProvider } from '@/components/layout/ThemeProvider'
import { Topbar } from '@/components/layout/Topbar'
import { BottomTabBar } from '@/components/layout/BottomTabBar'

export default function AccountantLayout({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
```

to:

```tsx
'use client'

import { ThemeProvider } from '@/components/layout/ThemeProvider'
import { Topbar } from '@/components/layout/Topbar'
import { BottomTabBar } from '@/components/layout/BottomTabBar'
import { useAuth } from '@/lib/hooks/useAuth'
import { useAppPreloader } from '@/lib/hooks/useAppPreloader'

export default function AccountantLayout({ children }: { children: React.ReactNode }) {
  const { user } = useAuth()
  useAppPreloader(user)

  return (
    <ThemeProvider>
```

- [ ] **Step 2: Update `admin/layout.tsx`**

Change:

```tsx
'use client'

import { ThemeProvider } from '@/components/layout/ThemeProvider'
import { Topbar } from '@/components/layout/Topbar'

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
```

to:

```tsx
'use client'

import { ThemeProvider } from '@/components/layout/ThemeProvider'
import { Topbar } from '@/components/layout/Topbar'
import { useAuth } from '@/lib/hooks/useAuth'
import { useAppPreloader } from '@/lib/hooks/useAppPreloader'

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user } = useAuth()
  useAppPreloader(user)

  return (
    <ThemeProvider>
```

- [ ] **Step 3: Run the frontend type check**

Run: `cd frontend && npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/app/accountant/layout.tsx frontend/src/app/admin/layout.tsx
git commit -m "feat: wire useAppPreloader into accountant and admin layouts"
```

---

### Task 8: Frontend — `SubtypeCombobox` cache-first with write-through

**Files:**
- Modify: `frontend/src/components/queue/SubtypeCombobox.tsx`
- Create: `frontend/src/components/queue/__tests__/SubtypeCombobox.test.tsx`

**Interfaces:**
- Consumes: `localCache` from Task 5; `searchSubtypes` (optional q) from Task 6
- Produces: same props interface and `onChange` callback — no external contract change

- [ ] **Step 1: Write the failing tests**

```tsx
// frontend/src/components/queue/__tests__/SubtypeCombobox.test.tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { SubtypeCombobox } from '../SubtypeCombobox'
import { localCache } from '@/lib/localCache'

jest.mock('@/lib/api/subtypes', () => ({
  searchSubtypes: jest.fn().mockResolvedValue([{ id: 'server-1', name: 'Server Result' }]),
  createSubtype: jest.fn(),
}))

const { searchSubtypes, createSubtype } = jest.requireMock('@/lib/api/subtypes')

describe('SubtypeCombobox', () => {
  beforeEach(() => {
    localStorage.clear()
    jest.clearAllMocks()
  })

  it('shows no options when query is under 3 chars even if cache is populated', () => {
    localCache.set('subtypes', [{ id: '1', name: 'Internet' }], 60_000)
    render(<SubtypeCombobox subtypeId={null} subtypeName={null} onChange={jest.fn()} />)
    fireEvent.focus(screen.getByPlaceholderText('Subtype…'))
    fireEvent.change(screen.getByPlaceholderText('Subtype…'), { target: { value: 'In' } })
    expect(screen.queryByText('Internet')).not.toBeInTheDocument()
  })

  it('filters from cache without calling the API when cache is populated', () => {
    localCache.set('subtypes', [
      { id: '1', name: 'Internet' },
      { id: '2', name: 'Telephone' },
    ], 60_000)
    render(<SubtypeCombobox subtypeId={null} subtypeName={null} onChange={jest.fn()} />)
    fireEvent.focus(screen.getByPlaceholderText('Subtype…'))
    fireEvent.change(screen.getByPlaceholderText('Subtype…'), { target: { value: 'Int' } })
    expect(screen.getByText('Internet')).toBeInTheDocument()
    expect(screen.queryByText('Telephone')).not.toBeInTheDocument()
    expect(searchSubtypes).not.toHaveBeenCalled()
  })

  it('falls back to server search when cache is empty', async () => {
    // no cache set
    render(<SubtypeCombobox subtypeId={null} subtypeName={null} onChange={jest.fn()} />)
    fireEvent.focus(screen.getByPlaceholderText('Subtype…'))
    fireEvent.change(screen.getByPlaceholderText('Subtype…'), { target: { value: 'Ser' } })
    await waitFor(() => expect(screen.getByText('Server Result')).toBeInTheDocument())
    expect(searchSubtypes).toHaveBeenCalledWith('Ser')
  })

  it('writes new subtype to cache on create', async () => {
    createSubtype.mockResolvedValue({ id: '99', name: 'New Tag' })
    localCache.set('subtypes', [{ id: '1', name: 'Internet' }], 60_000)
    const onChange = jest.fn()
    render(<SubtypeCombobox subtypeId={null} subtypeName={null} onChange={onChange} />)
    fireEvent.focus(screen.getByPlaceholderText('Subtype…'))
    fireEvent.change(screen.getByPlaceholderText('Subtype…'), { target: { value: 'New Tag' } })
    fireEvent.mouseDown(screen.getByText(/Create:/))
    await waitFor(() => expect(onChange).toHaveBeenCalledWith('99', 'New Tag'))
    const cached = localCache.get<{ id: string; name: string }[]>('subtypes')
    expect(cached).toContainEqual({ id: '99', name: 'New Tag' })
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd frontend && npx jest SubtypeCombobox`
Expected: FAIL — component doesn't use cache yet.

- [ ] **Step 3: Update `SubtypeCombobox.tsx`**

```tsx
// frontend/src/components/queue/SubtypeCombobox.tsx
'use client'

import { useState, useEffect, useRef } from 'react'
import { searchSubtypes, createSubtype, type Subtype } from '@/lib/api/subtypes'
import { localCache } from '@/lib/localCache'

const TTL_24H = 24 * 60 * 60 * 1000

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

    const cached = localCache.get<Subtype[]>('subtypes')
    if (cached && cached.length > 0) {
      const q = query.toLowerCase()
      setOptions(cached.filter((s) => s.name.toLowerCase().includes(q)))
      return
    }

    // cache miss — fall back to debounced server search
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
      // write-through to cache
      const current = localCache.get<Subtype[]>('subtypes') ?? []
      localCache.set('subtypes', [...current, created], TTL_24H)
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
        className="border border-t-line rounded px-2 py-1 text-xs w-full"
      />
      {creating && (
        <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-t-faint">
          Saving…
        </span>
      )}
      {open && !creating && (options.length > 0 || showCreate) && (
        <ul className="absolute z-50 w-48 bg-t-card border border-t-line rounded shadow-md max-h-48 overflow-y-auto text-xs">
          {options.map((o) => (
            <li
              key={o.id}
              onMouseDown={() => { onChange(o.id, o.name); setQuery(''); setOpen(false) }}
              className="px-2 py-1.5 hover:bg-t-surface cursor-pointer"
            >
              {o.name}
            </li>
          ))}
          {showCreate && (
            <li
              onMouseDown={handleCreate}
              className="px-2 py-1.5 hover:bg-t-primary-soft cursor-pointer text-t-primary border-t border-t-line"
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

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd frontend && npx jest SubtypeCombobox`
Expected: `Tests: 4 passed, 4 total`

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/queue/SubtypeCombobox.tsx frontend/src/components/queue/__tests__/SubtypeCombobox.test.tsx
git commit -m "feat: SubtypeCombobox reads from localStorage cache, falls back to server search"
```

---

### Task 9: Frontend — `QueuePageContent` and `QueueReviewModal` cache-first

**Files:**
- Modify: `frontend/src/components/queue/QueuePageContent.tsx`
- Modify: `frontend/src/components/queue/QueueReviewModal.tsx`

**Interfaces:**
- Consumes: `localCache` from Task 5; existing `useQuery` calls already in both files
- Produces: client/accountant dropdowns populated immediately from cache; account dropdown in review modal populated from cache

- [ ] **Step 1: Add `initialData` to client and accountant queries in `QueuePageContent.tsx`**

In `frontend/src/components/queue/QueuePageContent.tsx`, change:

```tsx
  const { data: adminClientsData } = useQuery({
    queryKey: ['admin-clients', {}],
    queryFn: () => getClients(),
    enabled: showAccountant,
  })
  const { data: accountantClientsData } = useQuery({
    queryKey: ['accountant-clients'],
    queryFn: () => getAccountantClients({ per_page: 100 }),
    enabled: !showAccountant,
  })
```

to:

```tsx
  const { data: adminClientsData } = useQuery({
    queryKey: ['admin-clients', {}],
    queryFn: () => getClients(),
    enabled: showAccountant,
    initialData: () => {
      if (!user) return undefined
      const cached = localCache.get<ClientProfile[]>(`clients_${user.id}`)
      return cached ? { data: cached, pagination: { total: cached.length, perPage: 100, currentPage: 1, lastPage: 1 } } : undefined
    },
    staleTime: 30 * 60 * 1000,
  })
  const { data: accountantClientsData } = useQuery({
    queryKey: ['accountant-clients'],
    queryFn: () => getAccountantClients({ per_page: 100 }),
    enabled: !showAccountant,
    initialData: () => {
      if (!user) return undefined
      const cached = localCache.get<ClientProfile[]>(`clients_${user.id}`)
      return cached ? { data: cached, pagination: { total: cached.length, perPage: 100, currentPage: 1, lastPage: 1 } } : undefined
    },
    staleTime: 30 * 60 * 1000,
  })
```

Change:

```tsx
  const { data: accountantsData } = useQuery({
    queryKey: ['admin-accountants'],
    queryFn: () => getAccountants(),
    enabled: showAccountant,
  })
```

to:

```tsx
  const { data: accountantsData } = useQuery({
    queryKey: ['admin-accountants'],
    queryFn: () => getAccountants(),
    enabled: showAccountant,
    initialData: () => localCache.get('accountants') ?? undefined,
    staleTime: 60 * 60 * 1000,
  })
```

Add the `localCache` import at the top of the file alongside existing imports:

```tsx
import { localCache } from '@/lib/localCache'
```

- [ ] **Step 2: Add `initialData` to the accounts query in `QueueReviewModal.tsx`**

First, find the accounts query in `frontend/src/components/queue/QueueReviewModal.tsx`. It will look like:

```tsx
  const { data: accounts = [] } = useQuery({
    queryKey: ['accounts', item?.clientId],
    queryFn: () => getAccounts(item!.clientId),
    enabled: !!item?.clientId,
  })
```

Change it to:

```tsx
  const { data: accounts = [] } = useQuery({
    queryKey: ['accounts', item?.clientId],
    queryFn: () => getAccounts(item!.clientId),
    enabled: !!item?.clientId,
    initialData: () => {
      if (!item?.clientId) return undefined
      return localCache.get<Account[]>(`accounts_${item.clientId}`) ?? undefined
    },
    staleTime: 24 * 60 * 60 * 1000,
  })
```

Add the `localCache` import and the `Account` type import if not already present:

```tsx
import { localCache } from '@/lib/localCache'
import type { Account } from '@/types/admin'
```

- [ ] **Step 3: Run the frontend type check**

Run: `cd frontend && npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 4: Run the existing queue tests**

Run: `cd frontend && npx jest QueuePageContent QueueReviewModal`
Expected: all existing tests pass.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/queue/QueuePageContent.tsx frontend/src/components/queue/QueueReviewModal.tsx
git commit -m "feat: populate queue dropdowns and account list from localStorage cache"
```

---

### Task 10: Frontend — Cache invalidation on client and accountant create

**Files:**
- Modify: `frontend/src/components/accountant/NewClientModal.tsx`
- Modify: `frontend/src/components/admin/AccountantModal.tsx`

**Interfaces:**
- Consumes: `localCache` from Task 5

- [ ] **Step 1: Invalidate client cache in `NewClientModal.tsx`**

Open `frontend/src/components/accountant/NewClientModal.tsx`. Find the `onSuccess` callback after `createAccountantClient` is called. It will look something like:

```tsx
const result = await createAccountantClient(payload)
onSuccess(result)
```

or inside a try block. Add cache invalidation immediately after the successful API call:

```tsx
import { localCache } from '@/lib/localCache'
// ... inside the success path after createAccountantClient resolves:
localCache.invalidatePrefix('clients_')
```

The `invalidatePrefix('clients_')` clears every user's client list cache so the next queue page load re-fetches the updated list.

- [ ] **Step 2: Invalidate accountant cache in `AccountantModal.tsx`**

Open `frontend/src/components/admin/AccountantModal.tsx`. Find the `onSuccess` callback after `createAccountant` is called. Add:

```tsx
import { localCache } from '@/lib/localCache'
// ... inside the success path after createAccountant resolves:
localCache.invalidate('accountants')
```

- [ ] **Step 3: Run the frontend type check**

Run: `cd frontend && npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/components/accountant/NewClientModal.tsx frontend/src/components/admin/AccountantModal.tsx
git commit -m "feat: invalidate client and accountant caches on create"
```

---

### Task 11: Verification

- [ ] **Step 1: Run the full backend test suite**

Run: `cd backend && php artisan test`
Expected: all tests pass including the rewritten `SubtypeTest`.

- [ ] **Step 2: Run the full frontend test suite**

Run: `cd frontend && npm test`
Expected: all tests pass including `localCache`, `SubtypeCombobox`, and existing queue tests.

- [ ] **Step 3: Run the frontend type check**

Run: `cd frontend && npx tsc --noEmit`
Expected: no type errors.

- [ ] **Step 4: Run the frontend production build**

Run: `cd frontend && npm run build`
Expected: build succeeds with no errors.

- [ ] **Step 5: Manual smoke test**

Start the dev stack. Log in as an accountant and confirm:

1. Open the browser DevTools → Application → Local Storage. After login, within a few seconds you should see `b4b_cache_subtypes`, `b4b_cache_accounts_{clientId}`, and `b4b_cache_clients_{userId}` keys populated.
2. Open the Review Queue, click a document, open a line item's Subtype field. Type 3+ characters — results appear instantly with no network request in the DevTools Network tab.
3. Create a new subtype via the combobox ("Create: test tag"). Verify `b4b_cache_subtypes` in localStorage now includes the new entry.
4. Reload the page and open the queue again — the client filter dropdown should populate immediately (no loading flicker).
5. Confirm `GET /subtypes` is called only once (the preload), not on every keystroke.

---

## Self-Review Notes

- **Spec coverage:** Tasks 1–2 → schema fix; Task 3 → controller retarget; Task 4 → seeder; Task 5 → `localCache` utility; Tasks 6–7 → preloader + wiring; Task 8 → SubtypeCombobox cache-first; Task 9 → queue page cache; Task 10 → invalidation on create. All spec sections covered.
- **Placeholder scan:** No TBD/TODO markers. All code blocks are complete.
- **Type consistency:** `localCache.get<T>` / `localCache.set<T>` generic used consistently. `Subtype` type `{ id: string, name: string }` is the same shape returned by the backend and used in `SubtypeCombobox`. `ClientProfile[]` used consistently between preloader and `initialData`.
- **`getClients()` return shape:** Admin `getClients()` returns a paged object with `.data`. The `initialData` in Task 9 reconstructs a minimal paged shape `{ data, pagination }` — only `.data` is accessed by the component so the fake pagination fields are harmless.
