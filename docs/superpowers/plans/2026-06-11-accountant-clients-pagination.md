# Accountant Clients Server-Side Pagination Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add server-side pagination and search to `GET /accountant/clients`, embed queue counts per client, compute cross-page summary stats, and wire the result into the accountant clients page with a pagination bar.

**Architecture:** The backend `index()` method gains `search`, `page`, and `per_page` params; it embeds RED/YEL/GRN queue counts per company via an aggregated query and computes summary totals across the full matching set. The frontend `getAccountantClients()` API function returns the new `PagedClients` shape; the clients page gains debounced search + page state and a pagination bar; the dashboard page is updated to read `data.data` instead of the old flat array.

**Tech Stack:** Laravel 11 (PHP), PHPUnit/Pest, Next.js 14 App Router, TypeScript, React Query (@tanstack/react-query), Jest + React Testing Library

---

## File Map

| Action | Path | Responsibility |
|---|---|---|
| Modify | `backend/app/Http/Controllers/Accountant/ClientController.php` | Add pagination, search, embedded queue counts, summary |
| Create | `backend/tests/Feature/AccountantClientsIndexTest.php` | Feature tests for the updated `index()` endpoint |
| Modify | `frontend/src/types/admin.ts` | Add `queueCounts` to `ClientProfile`; add `PagedClients` type |
| Modify | `frontend/src/lib/api/accountant/clients.ts` | Update `getAccountantClients()` signature and return type |
| Modify | `frontend/src/app/accountant/dashboard/page.tsx` | Adapt to `PagedClients` shape (`data.data`, `data.total`) |
| Modify | `frontend/src/app/accountant/dashboard/__tests__/page.test.tsx` | Update mock to return `PagedClients` shape |
| Modify | `frontend/src/app/accountant/clients/page.tsx` | Debounced search + page state, remove queue call, pagination bar |

---

## Task 1: Backend — write failing feature tests

**Files:**
- Create: `backend/tests/Feature/AccountantClientsIndexTest.php`

- [ ] **Step 1: Create the test file**

```php
<?php

namespace Tests\Feature;

use App\Models\Company;
use App\Models\Document;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AccountantClientsIndexTest extends TestCase
{
    use RefreshDatabase;

    private User $accountant;

    protected function setUp(): void
    {
        parent::setUp();
        $this->accountant = User::factory()->create(['role' => 'accountant']);
    }

    public function test_returns_paginated_shape(): void
    {
        Company::factory()->count(3)->create(['accountant_id' => $this->accountant->id]);

        $response = $this->actingAs($this->accountant)
            ->getJson('/api/accountant/clients?per_page=2&page=1');

        $response->assertOk()
            ->assertJsonStructure([
                'data' => [['id', 'name', 'queueCounts']],
                'total', 'perPage', 'currentPage', 'lastPage',
                'summary' => ['needAttention', 'pendingReview', 'allClear'],
            ])
            ->assertJsonPath('total', 3)
            ->assertJsonPath('lastPage', 2)
            ->assertJsonCount(2, 'data');
    }

    public function test_second_page_returns_remaining_items(): void
    {
        Company::factory()->count(3)->create(['accountant_id' => $this->accountant->id]);

        $response = $this->actingAs($this->accountant)
            ->getJson('/api/accountant/clients?per_page=2&page=2');

        $response->assertOk()
            ->assertJsonPath('currentPage', 2)
            ->assertJsonCount(1, 'data');
    }

    public function test_search_filters_by_company_name(): void
    {
        Company::factory()->create(['name' => 'Reyes Bakery',    'accountant_id' => $this->accountant->id]);
        Company::factory()->create(['name' => 'Santos Trading',  'accountant_id' => $this->accountant->id]);

        $response = $this->actingAs($this->accountant)
            ->getJson('/api/accountant/clients?search=Reyes');

        $response->assertOk()
            ->assertJsonPath('total', 1)
            ->assertJsonPath('data.0.name', 'Reyes Bakery');
    }

    public function test_search_is_case_insensitive(): void
    {
        Company::factory()->create(['name' => 'Reyes Bakery', 'accountant_id' => $this->accountant->id]);

        $response = $this->actingAs($this->accountant)
            ->getJson('/api/accountant/clients?search=reyes');

        $response->assertOk()->assertJsonPath('total', 1);
    }

    public function test_queue_counts_embedded_per_client(): void
    {
        $company = Company::factory()->create(['accountant_id' => $this->accountant->id]);
        Document::factory()->create([
            'company_id' => $company->id, 'status' => 'parked', 'flag' => 'RED',
        ]);
        Document::factory()->create([
            'company_id' => $company->id, 'status' => 'parked', 'flag' => 'YELLOW',
        ]);
        Document::factory()->create([
            'company_id' => $company->id, 'status' => 'parked', 'flag' => 'GREEN',
        ]);

        $response = $this->actingAs($this->accountant)
            ->getJson('/api/accountant/clients');

        $response->assertOk()
            ->assertJsonPath('data.0.queueCounts.red',    1)
            ->assertJsonPath('data.0.queueCounts.yellow', 1)
            ->assertJsonPath('data.0.queueCounts.green',  1);
    }

    public function test_non_parked_documents_not_counted_in_queue(): void
    {
        $company = Company::factory()->create(['accountant_id' => $this->accountant->id]);
        // approved docs should not appear in queue counts
        Document::factory()->create([
            'company_id' => $company->id, 'status' => 'approved', 'flag' => 'GREEN',
        ]);

        $response = $this->actingAs($this->accountant)
            ->getJson('/api/accountant/clients');

        $response->assertOk()
            ->assertJsonPath('data.0.queueCounts.red',    0)
            ->assertJsonPath('data.0.queueCounts.yellow', 0)
            ->assertJsonPath('data.0.queueCounts.green',  0);
    }

    public function test_summary_reflects_all_clients_not_just_current_page(): void
    {
        $company1 = Company::factory()->create(['accountant_id' => $this->accountant->id]);
        $company2 = Company::factory()->create(['accountant_id' => $this->accountant->id]);
        Document::factory()->create([
            'company_id' => $company1->id, 'status' => 'parked', 'flag' => 'RED',
        ]);

        // Request page 2 (where company2 lives) — company1 is on page 1 but summary still shows needAttention=1
        $response = $this->actingAs($this->accountant)
            ->getJson('/api/accountant/clients?per_page=1&page=2');

        $response->assertOk()
            ->assertJsonPath('summary.needAttention', 1);
    }

    public function test_summary_need_attention_counts_companies_with_red(): void
    {
        $c1 = Company::factory()->create(['accountant_id' => $this->accountant->id]);
        $c2 = Company::factory()->create(['accountant_id' => $this->accountant->id]);
        Document::factory()->create(['company_id' => $c1->id, 'status' => 'parked', 'flag' => 'RED']);
        Document::factory()->create(['company_id' => $c1->id, 'status' => 'parked', 'flag' => 'RED']); // 2 RED on same company

        $response = $this->actingAs($this->accountant)->getJson('/api/accountant/clients');

        $response->assertOk()
            ->assertJsonPath('summary.needAttention', 1)   // 1 company has red, not 2 docs
            ->assertJsonPath('summary.pendingReview',  2);  // 2 total RED+YELLOW docs
    }

    public function test_summary_all_clear_requires_green_and_no_red_yellow(): void
    {
        $c1 = Company::factory()->create(['accountant_id' => $this->accountant->id]);
        $c2 = Company::factory()->create(['accountant_id' => $this->accountant->id]);
        Document::factory()->create(['company_id' => $c1->id, 'status' => 'parked', 'flag' => 'GREEN']);
        // c2 has no parked docs at all — not "all clear" (no green)

        $response = $this->actingAs($this->accountant)->getJson('/api/accountant/clients');

        $response->assertOk()->assertJsonPath('summary.allClear', 1);
    }

    public function test_only_returns_own_clients(): void
    {
        $other = User::factory()->create(['role' => 'accountant']);
        Company::factory()->create(['accountant_id' => $other->id]);
        Company::factory()->create(['accountant_id' => $this->accountant->id]);

        $response = $this->actingAs($this->accountant)->getJson('/api/accountant/clients');

        $response->assertOk()->assertJsonPath('total', 1);
    }
}
```

- [ ] **Step 2: Run tests to verify they all fail**

```bash
cd backend && php artisan test tests/Feature/AccountantClientsIndexTest.php --ansi
```

Expected: all tests FAIL — the endpoint currently returns a flat array, not the paginated shape.

---

## Task 2: Backend — update `ClientController::index()`

**Files:**
- Modify: `backend/app/Http/Controllers/Accountant/ClientController.php`

- [ ] **Step 1: Replace the `index()` method**

Replace the entire `index()` method (lines 15–49) with:

```php
public function index(Request $request): JsonResponse
{
    $user    = auth()->user();
    $search  = $request->get('search', '');
    $perPage = min(100, max(1, (int) $request->get('per_page', 15)));
    $page    = max(1, (int) $request->get('page', 1));

    $baseQuery = Company::where('accountant_id', $user->id)
        ->when($search !== '', fn ($q) => $q->where('name', 'LIKE', "%{$search}%"));

    // ── Summary (all matching companies, not just this page) ─────────────
    $allIds = (clone $baseQuery)->pluck('id');

    $parkedAll = Document::whereIn('company_id', $allIds)
        ->where('status', 'parked')
        ->selectRaw('company_id, flag, COUNT(*) as cnt')
        ->groupBy('company_id', 'flag')
        ->get()
        ->groupBy('company_id');

    $needAttention = $allIds->filter(fn ($id) =>
        ($parkedAll[$id] ?? collect())->where('flag', 'RED')->sum('cnt') > 0
    )->count();

    $pendingReview = $allIds->sum(fn ($id) =>
        ($parkedAll[$id] ?? collect())->whereIn('flag', ['RED', 'YELLOW'])->sum('cnt')
    );

    $allClear = $allIds->filter(fn ($id) => {
        $counts = $parkedAll[$id] ?? collect();
        return $counts->where('flag', 'RED')->sum('cnt') === 0
            && $counts->where('flag', 'YELLOW')->sum('cnt') === 0
            && $counts->where('flag', 'GREEN')->sum('cnt') > 0;
    })->count();

    // ── Paginated fetch ───────────────────────────────────────────────────
    $paginated = (clone $baseQuery)
        ->with(['users' => fn ($q) => $q->where('role', 'client')])
        ->latest('id')
        ->paginate($perPage, ['*'], 'page', $page);

    // ── Per-page queue counts (one query for the current page) ────────────
    $pageIds = $paginated->getCollection()->pluck('id');

    $parkedPage = Document::whereIn('company_id', $pageIds)
        ->where('status', 'parked')
        ->selectRaw('company_id, flag, COUNT(*) as cnt')
        ->groupBy('company_id', 'flag')
        ->get()
        ->groupBy('company_id');

    $lastPayments = Payment::whereIn('company_id', $pageIds)
        ->latest('date_received')
        ->get()
        ->groupBy('company_id');

    $data = $paginated->getCollection()->map(function ($company) use ($user, $parkedPage, $lastPayments) {
        $client      = $company->users->first();
        $lastPayment = $lastPayments[$company->id]->first() ?? null;
        $counts      = $parkedPage[$company->id] ?? collect();

        return [
            'id'             => $company->id,
            'name'           => $company->name,
            'mobile'         => $company->mobile,
            'email'          => $company->email,
            'tin'            => $company->tin,
            'contactPerson'  => $company->contact_person,
            'birType'        => $company->bir_type,
            'plan'           => $company->plan,
            'accountantId'   => $company->accountant_id,
            'accountantName' => $user->name,
            'clientId'       => $client?->id,
            'clientStatus'   => $client ? strtoupper($client->status) : null,
            'username'       => $client?->username,
            'lastPayment'    => $lastPayment ? [
                'amount'          => $lastPayment->amount,
                'dateReceived'    => $lastPayment->date_received?->toDateString(),
                'referenceNumber' => $lastPayment->reference_number,
            ] : null,
            'queueCounts'    => [
                'red'    => (int) $counts->where('flag', 'RED')->sum('cnt'),
                'yellow' => (int) $counts->where('flag', 'YELLOW')->sum('cnt'),
                'green'  => (int) $counts->where('flag', 'GREEN')->sum('cnt'),
            ],
        ];
    });

    return response()->json([
        'data'        => $data,
        'total'       => $paginated->total(),
        'perPage'     => $perPage,
        'currentPage' => $paginated->currentPage(),
        'lastPage'    => $paginated->lastPage(),
        'summary'     => [
            'needAttention' => $needAttention,
            'pendingReview' => (int) $pendingReview,
            'allClear'      => $allClear,
        ],
    ]);
}
```

Also ensure `Payment` is imported at the top of the file — it is already used in `show()`, so check line 10 area. If the `use App\Models\Payment;` import is missing, add it.

- [ ] **Step 2: Run the tests**

```bash
cd backend && php artisan test tests/Feature/AccountantClientsIndexTest.php --ansi
```

Expected: all tests PASS.

- [ ] **Step 3: Run the full backend test suite to check for regressions**

```bash
cd backend && php artisan test --ansi
```

Expected: all tests PASS.

- [ ] **Step 4: Commit**

```bash
git add backend/app/Http/Controllers/Accountant/ClientController.php \
        backend/tests/Feature/AccountantClientsIndexTest.php
git commit -m "feat(accountant): paginate clients index with search, embedded queue counts, and summary"
```

---

## Task 3: Frontend types

**Files:**
- Modify: `frontend/src/types/admin.ts`

- [ ] **Step 1: Add `queueCounts` to `ClientProfile` and add `PagedClients`**

Open `frontend/src/types/admin.ts`. After the closing brace of the `ClientProfile` interface, add:

```ts
export interface ClientProfile extends Company {
  clientId: string
  clientStatus: AccountStatus
  username: string
  accountantName: string
  lastPayment: { amount: number; dateReceived: string; referenceNumber: string } | null
  queueCounts?: { red: number; yellow: number; green: number }
}

export interface PagedClients {
  data: ClientProfile[]
  total: number
  perPage: number
  currentPage: number
  lastPage: number
  summary: {
    needAttention: number
    pendingReview: number
    allClear: number
  }
}
```

(Replace the existing `ClientProfile` interface — only the `queueCounts?` field is new. `PagedClients` is a new addition at the bottom of the file.)

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd frontend && npx tsc --noEmit 2>&1 | head -30
```

Expected: no new errors.

---

## Task 4: Frontend API client

**Files:**
- Modify: `frontend/src/lib/api/accountant/clients.ts`

- [ ] **Step 1: Update `getAccountantClients`**

Replace the entire file content:

```ts
import api from '../client'
import type { ClientProfile, PagedClients } from '@/types/admin'
import type { PagedDocs } from '@/types/document'

export async function getAccountantClients(params?: {
  page?: number
  per_page?: number
  search?: string
}): Promise<PagedClients> {
  const { data } = await api.get<PagedClients>('/accountant/clients', { params })
  return data
}

export async function getAccountantClient(id: string): Promise<ClientProfile & {
  queueCounts: { red: number; yellow: number; green: number }
  pendingEntries: number
  draftEntries: number
}> {
  const { data } = await api.get(`/accountant/clients/${id}`)
  return data
}

export async function getAccountantClientDocuments(
  id: string,
  params?: { status?: string; type?: string; start?: string; end?: string; page?: number; per_page?: number }
): Promise<PagedDocs> {
  const { data } = await api.get<PagedDocs>(`/accountant/clients/${id}/documents`, { params })
  return data
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd frontend && npx tsc --noEmit 2>&1 | head -30
```

Expected: TypeScript errors appear on `dashboard/page.tsx` and `accountant/clients/page.tsx` because they still use the old flat-array shape. This is expected — we fix them in the next two tasks.

---

## Task 5: Fix the accountant dashboard

**Files:**
- Modify: `frontend/src/app/accountant/dashboard/page.tsx`

The dashboard used `clients` (flat array). After Task 4 it gets `PagedClients`. We adapt it to use `data.data` for the list and `data.total` for the count.

- [ ] **Step 1: Update the dashboard page**

Find the line (around line 32):
```ts
const { data: clients = [], isLoading: cLoading } = useQuery({ queryKey: ['accountant-clients'], queryFn: getAccountantClients })
```

Replace with:
```ts
const { data: clientsPage, isLoading: cLoading } = useQuery({ queryKey: ['accountant-clients'], queryFn: () => getAccountantClients() })
const clients = clientsPage?.data ?? []
```

Find the subtitle line (around line 87):
```tsx
{today} · {clients.length} active clients · {(queue as QueueItem[]).length} items in your queue
```

Replace with:
```tsx
{today} · {clientsPage?.total ?? clients.length} active clients · {(queue as QueueItem[]).length} items in your queue
```

- [ ] **Step 2: Verify TypeScript compiles with no errors**

```bash
cd frontend && npx tsc --noEmit 2>&1 | head -30
```

Expected: `dashboard/page.tsx` errors gone. Only `accountant/clients/page.tsx` errors remain.

---

## Task 6: Fix the dashboard test

**Files:**
- Modify: `frontend/src/app/accountant/dashboard/__tests__/page.test.tsx`

The test mocks `accountant-clients` as a flat array. Now it must return a `PagedClients` object.

- [ ] **Step 1: Update the mock**

Find the block in the `useQuery` mock (around lines 29–37):
```ts
if (queryKey[0] === 'accountant-clients') {
  return {
    data: [
      { id: 'c1', name: 'ABC Trading Corp.', birType: 'vat',   plan: 'Growth' },
      { id: 'c2', name: 'Northwind Logistics', birType: 'vat', plan: 'Growth' },
    ],
    isLoading: false,
  }
}
```

Replace with:
```ts
if (queryKey[0] === 'accountant-clients') {
  return {
    data: {
      data: [
        { id: 'c1', name: 'ABC Trading Corp.',  birType: 'vat', plan: 'Growth', queueCounts: { red: 0, yellow: 0, green: 0 } },
        { id: 'c2', name: 'Northwind Logistics', birType: 'vat', plan: 'Growth', queueCounts: { red: 0, yellow: 0, green: 0 } },
      ],
      total: 2,
      perPage: 15,
      currentPage: 1,
      lastPage: 1,
      summary: { needAttention: 0, pendingReview: 0, allClear: 0 },
    },
    isLoading: false,
  }
}
```

- [ ] **Step 2: Run the dashboard tests**

```bash
cd frontend && npx jest src/app/accountant/dashboard/__tests__/page.test.tsx --no-coverage
```

Expected: all 6 tests PASS.

---

## Task 7: Rewrite the accountant clients page

**Files:**
- Modify: `frontend/src/app/accountant/clients/page.tsx`

This task: add `page` state, debounce `search`, remove the `getQueue()` call, read queue counts from embedded data, read summary from `data.summary`, and add a pagination bar.

- [ ] **Step 1: Write a failing test first**

Create `frontend/src/app/accountant/clients/__tests__/page.test.tsx`:

```tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import AccountantClientsPage from '../page'

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn() }),
}))
jest.mock('@/components/accountant/ClientDetailModal', () => ({
  ClientDetailModal: () => <div data-testid="client-modal" />,
}))
jest.mock('@/components/shared/Breadcrumb', () => ({
  Breadcrumb: () => null,
}))
jest.mock('@/components/shared/SummaryCard', () => ({
  SummaryCard: ({ label, value }: { label: string; value: string }) => (
    <div data-testid={`summary-${label}`}>{value}</div>
  ),
}))

const mockPagedClients = (overrides = {}) => ({
  data: [
    { id: 'c1', name: 'ABC Trading Corp.',   birType: 'vat',     plan: 'starter', accountantName: 'Ana',
      clientId: 'u1', clientStatus: 'ACTIVE', username: 'abc', lastPayment: null,
      queueCounts: { red: 1, yellow: 0, green: 2 } },
    { id: 'c2', name: 'Northwind Logistics', birType: 'non_vat', plan: 'growth',  accountantName: 'Ana',
      clientId: 'u2', clientStatus: 'ACTIVE', username: 'nw',  lastPayment: null,
      queueCounts: { red: 0, yellow: 1, green: 0 } },
  ],
  total: 2,
  perPage: 15,
  currentPage: 1,
  lastPage: 1,
  summary: { needAttention: 1, pendingReview: 2, allClear: 0 },
  ...overrides,
})

jest.mock('@tanstack/react-query', () => ({
  useQuery: ({ queryKey }: { queryKey: unknown[] }) => {
    if ((queryKey as string[])[0] === 'accountant-clients') {
      return { data: mockPagedClients(), isLoading: false }
    }
    return { data: undefined, isLoading: false }
  },
}))

describe('AccountantClientsPage', () => {
  it('renders the client names', () => {
    render(<AccountantClientsPage />)
    expect(screen.getByText('ABC Trading Corp.')).toBeInTheDocument()
    expect(screen.getByText('Northwind Logistics')).toBeInTheDocument()
  })

  it('shows correct total from summary', () => {
    render(<AccountantClientsPage />)
    expect(screen.getByTestId('summary-Total Clients').textContent).toBe('2')
  })

  it('shows need attention count from summary', () => {
    render(<AccountantClientsPage />)
    expect(screen.getByTestId('summary-Need Attention').textContent).toBe('1')
  })

  it('hides pagination bar when only one page', () => {
    render(<AccountantClientsPage />)
    expect(screen.queryByRole('button', { name: '‹' })).not.toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

```bash
cd frontend && npx jest src/app/accountant/clients/__tests__/page.test.tsx --no-coverage
```

Expected: FAIL — the page still uses the old flat-array shape and `getQueue()`.

- [ ] **Step 3: Rewrite the clients page**

Replace the entire content of `frontend/src/app/accountant/clients/page.tsx`:

```tsx
'use client'

import { useState, useCallback, useRef, useEffect, type CSSProperties } from 'react'
import { useQuery } from '@tanstack/react-query'
import { getAccountantClients } from '@/lib/api/accountant/clients'
import type { ClientProfile } from '@/types/admin'
import { Breadcrumb } from '@/components/shared/Breadcrumb'
import { SummaryCard } from '@/components/shared/SummaryCard'
import { Search, Users } from 'lucide-react'
import { ClientDetailModal } from '@/components/accountant/ClientDetailModal'

const PER_PAGE = 15

function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(id)
  }, [value, delay])
  return debounced
}

export default function AccountantClientsPage() {
  const [search,         setSearch]         = useState('')
  const [page,           setPage]           = useState(1)
  const [hoveredId,      setHoveredId]      = useState<string | null>(null)
  const [selectedClient, setSelectedClient] = useState<ClientProfile | null>(null)

  const debouncedSearch = useDebounce(search, 300)

  // Reset to page 1 whenever the search term changes.
  const prevSearch = useRef(debouncedSearch)
  useEffect(() => {
    if (prevSearch.current !== debouncedSearch) {
      prevSearch.current = debouncedSearch
      setPage(1)
    }
  }, [debouncedSearch])

  const { data, isLoading } = useQuery({
    queryKey: ['accountant-clients', debouncedSearch, page],
    queryFn:  () => getAccountantClients({ search: debouncedSearch, page, per_page: PER_PAGE }),
  })

  const clients    = data?.data    ?? []
  const total      = data?.total   ?? 0
  const lastPage   = data?.lastPage ?? 1
  const summary    = data?.summary ?? { needAttention: 0, pendingReview: 0, allClear: 0 }

  // ── Pagination helpers ─────────────────────────────────────────────────
  const pageStart  = (page - 1) * PER_PAGE

  const totalPages = Math.max(1, lastPage)
  const pageNumbers = Array.from({ length: totalPages }, (_, i) => i + 1)
    .filter((p) => p === 1 || p === totalPages || Math.abs(p - page) <= 1)
    .reduce<(number | '…')[]>((acc, p, idx, arr) => {
      if (idx > 0 && p - (arr[idx - 1] as number) > 1) acc.push('…')
      acc.push(p)
      return acc
    }, [])

  // ── Table layout ───────────────────────────────────────────────────────
  const COLS = 'minmax(200px, 3fr) 90px 100px 70px 70px 70px'

  const COL_HEADERS: { label: string; align: CSSProperties['textAlign']; color: string }[] = [
    { label: 'Business Name', align: 'left',   color: 'var(--t-faint)' },
    { label: 'VAT',           align: 'left',   color: 'var(--t-faint)' },
    { label: 'Plan',          align: 'left',   color: 'var(--t-faint)' },
    { label: 'RED',           align: 'center', color: 'var(--t-tier-review-fg)' },
    { label: 'YEL',           align: 'center', color: 'var(--t-tier-check-fg)'  },
    { label: 'GRN',           align: 'center', color: 'var(--t-tier-ready-fg)'  },
  ]

  function CountBadge({ n, tier }: { n: number; tier: 'review' | 'check' | 'ready' }) {
    if (n === 0) return <span style={{ color: 'var(--t-faint)', fontSize: 13 }}>—</span>
    return (
      <span style={{
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        padding: '3px 10px', borderRadius: 8, fontSize: 12.5, fontWeight: 700,
        background: `var(--t-tier-${tier}-bg)`,
        color:      `var(--t-tier-${tier}-fg)`,
        border:     `1px solid var(--t-tier-${tier}-ring)`,
        minWidth:   28,
      }}>{n}</span>
    )
  }

  const needsAttentionOnPage = clients.filter((c) => (c.queueCounts?.red ?? 0) > 0).length

  return (
    <div className="max-w-[1280px] mx-auto px-4 py-5 md:px-9 md:py-7">
      <Breadcrumb crumbs={[{ label: 'Dashboard', href: '/accountant' }, { label: 'My Clients' }]} />

      <div className="flex items-start justify-between mb-[22px]">
        <div>
          <h1 className="text-[34px] font-bold tracking-[-0.025em] text-t-ink m-0" style={{ fontFamily: 'var(--font-display)' }}>
            My Clients
          </h1>
          <p className="text-[14.5px] text-t-muted mt-[5px]">
            {isLoading ? '…' : `${total} assigned clients`}
          </p>
        </div>
      </div>

      {!isLoading && (
        <div className="grid grid-cols-2 gap-3 md:flex md:gap-[14px] mb-[22px]">
          <SummaryCard label="Total Clients"   value={String(total)}                   subnote="assigned to you" />
          <SummaryCard label="Need Attention"  value={String(summary.needAttention)}   subnote="have RED flags"       valueStyle={{ color: 'var(--t-tier-review-fg)' }} />
          <SummaryCard label="Pending Review"  value={String(summary.pendingReview)}   subnote="total flagged items"  valueStyle={{ color: 'var(--t-tier-check-fg)'  }} />
          <SummaryCard label="All Clear"       value={String(summary.allClear)}        subnote="no open flags"        valueStyle={{ color: 'var(--t-tier-ready-fg)'  }} />
        </div>
      )}

      {/* Search + count */}
      <div className="flex gap-2.5 items-center mb-5">
        <div className="flex items-center gap-2 h-10 px-3.5 border-[1.5px] border-t-line rounded-[11px] bg-t-card w-full md:w-72">
          <Search className="h-4 w-4 text-t-faint flex-none" />
          <input
            type="text"
            placeholder="Search business name…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="border-0 outline-none bg-transparent text-[13.5px] text-t-ink w-full"
          />
        </div>
        <div className="flex-1" />
        <span className="text-[13px] text-t-muted font-medium">
          {clients.length} of {total} clients
        </span>
      </div>

      {/* Table card */}
      <div style={{ background: 'var(--t-card)', border: '1px solid var(--t-line)', borderRadius: 20, overflow: 'hidden', boxShadow: 'var(--t-shadow)' }}>

        {/* Card header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '18px 24px', borderBottom: '1px solid var(--t-line)' }}>
          <Users size={18} style={{ color: 'var(--t-primary)', flexShrink: 0 }} />
          <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 16, color: 'var(--t-ink)' }}>My Clients</span>
          <span style={{ background: 'var(--t-primary-soft)', color: 'var(--t-primary)', border: '1px solid var(--t-line)', borderRadius: 999, padding: '2px 9px', fontSize: 11.5, fontWeight: 800 }}>
            {clients.length}
          </span>
          {needsAttentionOnPage > 0 && (
            <span style={{ background: 'var(--t-tier-review-bg)', color: 'var(--t-tier-review-fg)', border: '1px solid var(--t-tier-review-ring)', borderRadius: 999, padding: '2px 9px', fontSize: 11.5, fontWeight: 800 }}>
              {needsAttentionOnPage} need attention
            </span>
          )}
        </div>

        {isLoading ? (
          <div style={{ padding: 32, textAlign: 'center', fontSize: 14, color: 'var(--t-faint)' }}>Loading…</div>
        ) : clients.length === 0 ? (
          <div style={{ padding: 32, textAlign: 'center', fontSize: 14, color: 'var(--t-faint)' }}>No clients found.</div>
        ) : (
          <>
            {/* ── Desktop table ── */}
            <div className="hidden md:block">
              <div style={{ display: 'grid', gridTemplateColumns: COLS, columnGap: 16, padding: '12px 24px', borderBottom: '1px solid var(--t-line)' }}>
                {COL_HEADERS.map(({ label, align, color }) => (
                  <span key={label} style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.06em', color, textAlign: align, overflow: 'hidden', whiteSpace: 'nowrap' }}>
                    {label}
                  </span>
                ))}
              </div>
              {clients.map((c, i) => {
                const counts    = c.queueCounts ?? { red: 0, yellow: 0, green: 0 }
                const isFlagged = counts.red > 0
                const isHovered = hoveredId === c.id
                const rowBg     = isHovered ? 'var(--t-primary-soft)' : i % 2 === 1 ? 'var(--t-card-alt)' : 'transparent'
                return (
                  <div
                    key={c.id}
                    onClick={() => setSelectedClient(c)}
                    onMouseEnter={() => setHoveredId(c.id)}
                    onMouseLeave={() => setHoveredId(null)}
                    style={{
                      display: 'grid', gridTemplateColumns: COLS, columnGap: 16,
                      padding: '13px 24px', alignItems: 'center',
                      borderBottom: '1px solid var(--t-line-soft)',
                      cursor: 'pointer', transition: 'background 0.14s',
                      background: rowBg,
                      boxShadow: isFlagged ? 'inset 3px 0 0 var(--t-tier-review-fg)' : 'inset 3px 0 0 transparent',
                    }}
                  >
                    <span style={{ fontWeight: 700, fontSize: 13.5, color: 'var(--t-ink)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', paddingRight: 16 }}>{c.name}</span>
                    <span style={{ fontSize: 13.5, color: 'var(--t-muted)', fontWeight: 500 }}>{c.birType === 'vat' ? 'VAT' : 'Non-VAT'}</span>
                    <span style={{ fontSize: 13.5, color: 'var(--t-muted)', fontWeight: 500, textTransform: 'capitalize' }}>{c.plan}</span>
                    <div style={{ display: 'flex', justifyContent: 'center' }}><CountBadge n={counts.red}    tier="review" /></div>
                    <div style={{ display: 'flex', justifyContent: 'center' }}><CountBadge n={counts.yellow} tier="check"  /></div>
                    <div style={{ display: 'flex', justifyContent: 'center' }}><CountBadge n={counts.green}  tier="ready"  /></div>
                  </div>
                )
              })}
            </div>

            {/* ── Mobile cards ── */}
            <div className="block md:hidden">
              {clients.map((c, i) => {
                const counts    = c.queueCounts ?? { red: 0, yellow: 0, green: 0 }
                const isFlagged = counts.red > 0
                return (
                  <div
                    key={c.id}
                    onClick={() => setSelectedClient(c)}
                    className="flex items-center justify-between px-4 py-3 cursor-pointer"
                    style={{
                      borderBottom: '1px solid var(--t-line-soft)',
                      background: i % 2 === 1 ? 'var(--t-card-alt)' : 'transparent',
                      boxShadow: isFlagged ? 'inset 3px 0 0 var(--t-tier-review-fg)' : 'inset 3px 0 0 transparent',
                    }}
                  >
                    <div className="flex flex-col gap-[3px] min-w-0 pr-3">
                      <span className="font-bold text-[13.5px] text-t-ink truncate">{c.name}</span>
                      <span className="text-[12px] text-t-muted capitalize">{c.birType === 'vat' ? 'VAT' : 'Non-VAT'} · {c.plan}</span>
                    </div>
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <CountBadge n={counts.red}    tier="review" />
                      <CountBadge n={counts.yellow} tier="check"  />
                      <CountBadge n={counts.green}  tier="ready"  />
                    </div>
                  </div>
                )
              })}
            </div>

            {/* ── Pagination bar ── */}
            {totalPages > 1 && (
              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '12px 24px', borderTop: '1px solid var(--t-line)', background: 'var(--t-card)',
              }}>
                <span style={{ fontSize: 12.5, color: 'var(--t-faint)', fontWeight: 500 }}>
                  Showing {pageStart + 1}–{Math.min(pageStart + PER_PAGE, total)} of {total}
                </span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                    style={{
                      width: 32, height: 32, borderRadius: 8, border: '1px solid var(--t-line)',
                      background: 'var(--t-card)', color: 'var(--t-ink)', fontSize: 14,
                      cursor: page === 1 ? 'not-allowed' : 'pointer',
                      opacity: page === 1 ? 0.35 : 1,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}
                  >
                    ‹
                  </button>
                  {pageNumbers.map((p, idx) =>
                    p === '…' ? (
                      <span key={`ellipsis-${idx}`} style={{ fontSize: 13, color: 'var(--t-faint)', padding: '0 4px' }}>…</span>
                    ) : (
                      <button
                        key={p}
                        onClick={() => setPage(p as number)}
                        style={{
                          width: 32, height: 32, borderRadius: 8, fontSize: 13,
                          fontWeight: p === page ? 700 : 500,
                          border: p === page ? '1.5px solid var(--t-primary)' : '1px solid var(--t-line)',
                          background: p === page ? 'var(--t-primary-soft)' : 'var(--t-card)',
                          color: p === page ? 'var(--t-primary)' : 'var(--t-ink)',
                          cursor: 'pointer',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}
                      >
                        {p}
                      </button>
                    )
                  )}
                  <button
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                    style={{
                      width: 32, height: 32, borderRadius: 8, border: '1px solid var(--t-line)',
                      background: 'var(--t-card)', color: 'var(--t-ink)', fontSize: 14,
                      cursor: page === totalPages ? 'not-allowed' : 'pointer',
                      opacity: page === totalPages ? 0.35 : 1,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}
                  >
                    ›
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {selectedClient && (
        <ClientDetailModal
          client={selectedClient}
          onClose={() => setSelectedClient(null)}
        />
      )}
    </div>
  )
}
```

- [ ] **Step 4: Run the new clients page tests**

```bash
cd frontend && npx jest src/app/accountant/clients/__tests__/page.test.tsx --no-coverage
```

Expected: all 4 tests PASS.

- [ ] **Step 5: Run the full frontend test suite**

```bash
cd frontend && npm test -- --no-coverage 2>&1 | tail -20
```

Expected: all tests PASS. If any test fails unexpectedly, fix it before continuing.

- [ ] **Step 6: Verify TypeScript compiles clean**

```bash
cd frontend && npx tsc --noEmit 2>&1 | head -30
```

Expected: no errors.

- [ ] **Step 7: Commit**

```bash
git add frontend/src/types/admin.ts \
        frontend/src/lib/api/accountant/clients.ts \
        frontend/src/app/accountant/dashboard/page.tsx \
        frontend/src/app/accountant/dashboard/__tests__/page.test.tsx \
        frontend/src/app/accountant/clients/page.tsx \
        frontend/src/app/accountant/clients/__tests__/page.test.tsx
git commit -m "feat(accountant): server-side pagination and search for clients table"
```

---

## Self-Review

**Spec coverage check:**

| Spec requirement | Covered by |
|---|---|
| `search`, `page`, `per_page` params on `GET /accountant/clients` | Task 2 |
| Per-page queue counts (RED/YEL/GRN) embedded in each client row | Task 2 |
| Summary aggregates across full matching set (not just current page) | Task 2 |
| Summary cross-page accuracy test | Task 1 (`test_summary_reflects_all_clients_not_just_current_page`) |
| `PagedClients` type + `queueCounts` on `ClientProfile` | Task 3 |
| `getAccountantClients()` updated signature | Task 4 |
| Dashboard adapted to `data.data` / `data.total` | Task 5 |
| Dashboard test updated | Task 6 |
| Debounced search (300 ms) | Task 7 |
| Page resets to 1 on search change | Task 7 |
| Separate `getQueue()` call removed from clients page | Task 7 |
| Summary cards read from `data.summary` | Task 7 |
| Pagination bar (prev/next, numbered pages, ellipsis, "Showing X–Y of Z") | Task 7 |
| Mobile card layout preserved | Task 7 |

**Placeholder scan:** None found.

**Type consistency:**
- `PagedClients` defined in Task 3, imported in Tasks 4, 7 ✓
- `queueCounts` field on `ClientProfile` defined in Task 3, read in Task 7 as `c.queueCounts ?? { red: 0, yellow: 0, green: 0 }` ✓
- `summary.needAttention / pendingReview / allClear` defined in backend Task 2 and `PagedClients` Task 3, read in Task 7 ✓
- `getAccountantClients()` returns `PagedClients` set in Task 4, consumed in Tasks 5 and 7 ✓
