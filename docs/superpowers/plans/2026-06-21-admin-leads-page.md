# Admin Leads Page — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a paginated admin page at `/admin/leads` that lists submitted leads and lets the admin toggle each lead's read/unread status inline.

**Architecture:** Add `is_read` to the `leads` table via migration, expose two admin-only API endpoints (`GET /admin/leads`, `PATCH /admin/leads/{id}/toggle-read`) via a new `Admin\LeadController`, then build the Next.js page following the existing clients-page pattern — `useQuery` for data, `useMutation` with optimistic update for the toggle.

**Tech Stack:** Laravel 11 (PHPUnit feature tests), Next.js 14 App Router, TypeScript, `@tanstack/react-query` v5, shadcn/ui design tokens.

## Global Constraints

- All backend routes live inside the `role:admin` middleware group in `routes/api.php`
- Pagination shape must match existing convention: `{ data: [...], pagination: { currentPage, perPage, total } }`
- Per-page is hardcoded at 10
- `filter` query param accepts exactly: `all` (default), `unread`, `read`
- Default sort: `is_read ASC, created_at DESC` (unread float to top)
- Follow existing file/namespace conventions — controllers under `App\Http\Controllers\Admin`, frontend API helpers under `frontend/src/lib/api/admin/`
- No new npm packages

---

## File Map

| File | Action | Purpose |
|------|--------|---------|
| `backend/database/migrations/2026_06_21_000001_add_is_read_to_leads_table.php` | Create | Adds `is_read` boolean column |
| `backend/database/factories/LeadFactory.php` | Create | Factory for test seeding |
| `backend/app/Models/Lead.php` | Modify | Add `is_read` to `$fillable` |
| `backend/app/Http/Controllers/Admin/LeadController.php` | Create | `index` + `toggleRead` |
| `backend/routes/api.php` | Modify | Register two admin lead routes |
| `backend/tests/Feature/AdminLeadsTest.php` | Create | Feature tests for both endpoints |
| `frontend/src/lib/api/admin/leads.ts` | Create | `getLeads` + `toggleLeadRead` helpers |
| `frontend/src/app/admin/leads/page.tsx` | Create | The leads list page |
| `frontend/src/app/admin/leads/__tests__/page.test.tsx` | Create | Jest tests for the page |

---

## Task 1: Migration, Model, Factory

**Files:**
- Create: `backend/database/migrations/2026_06_21_000001_add_is_read_to_leads_table.php`
- Create: `backend/database/factories/LeadFactory.php`
- Modify: `backend/app/Models/Lead.php`

**Interfaces:**
- Produces: `Lead` model with `is_read` (bool), usable in tests via `Lead::factory()->create([...])`

- [ ] **Step 1: Create the migration**

Create `backend/database/migrations/2026_06_21_000001_add_is_read_to_leads_table.php`:

```php
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('leads', function (Blueprint $table) {
            $table->boolean('is_read')->default(false)->after('message');
        });
    }

    public function down(): void
    {
        Schema::table('leads', function (Blueprint $table) {
            $table->dropColumn('is_read');
        });
    }
};
```

- [ ] **Step 2: Update the Lead model**

Open `backend/app/Models/Lead.php`. Replace the `$fillable` line so the full file reads:

```php
<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Lead extends Model
{
    use HasUuids, HasFactory;

    protected $fillable = ['contact', 'message', 'is_read'];
}
```

- [ ] **Step 3: Create the LeadFactory**

Create `backend/database/factories/LeadFactory.php`:

```php
<?php

namespace Database\Factories;

use Illuminate\Database\Eloquent\Factories\Factory;

class LeadFactory extends Factory
{
    public function definition(): array
    {
        return [
            'contact' => $this->faker->safeEmail(),
            'message' => $this->faker->sentence(),
            'is_read' => false,
        ];
    }
}
```

- [ ] **Step 4: Run the migration**

```bash
php artisan migrate
```

Expected: migration runs without error.

- [ ] **Step 5: Commit**

```bash
git add backend/database/migrations/2026_06_21_000001_add_is_read_to_leads_table.php \
        backend/database/factories/LeadFactory.php \
        backend/app/Models/Lead.php
git commit -m "feat: add is_read to leads, create LeadFactory"
```

---

## Task 2: Admin\LeadController + Routes + Tests

**Files:**
- Create: `backend/app/Http/Controllers/Admin/LeadController.php`
- Modify: `backend/routes/api.php`
- Create: `backend/tests/Feature/AdminLeadsTest.php`

**Interfaces:**
- Consumes: `Lead` model with `is_read` from Task 1
- Produces:
  - `GET /api/admin/leads?filter=all|unread|read&page=N` → `{ data: Lead[], pagination: { currentPage, perPage, total } }`
  - `PATCH /api/admin/leads/{id}/toggle-read` → `{ id, contact, message, is_read, created_at }`

- [ ] **Step 1: Write the failing tests**

Create `backend/tests/Feature/AdminLeadsTest.php`:

```php
<?php

namespace Tests\Feature;

use App\Models\Lead;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AdminLeadsTest extends TestCase
{
    use RefreshDatabase;

    private User $admin;

    protected function setUp(): void
    {
        parent::setUp();
        $this->admin = User::factory()->create(['role' => 'admin']);
    }

    public function test_index_returns_paginated_leads(): void
    {
        Lead::factory()->count(15)->create();

        $this->actingAs($this->admin)
            ->getJson('/api/admin/leads')
            ->assertOk()
            ->assertJsonStructure([
                'data' => [['id', 'contact', 'message', 'is_read', 'created_at']],
                'pagination' => ['currentPage', 'perPage', 'total'],
            ])
            ->assertJsonPath('pagination.perPage', 10)
            ->assertJsonPath('pagination.total', 15)
            ->assertJsonCount(10, 'data');
    }

    public function test_index_filter_unread_returns_only_unread(): void
    {
        Lead::factory()->count(3)->create(['is_read' => false]);
        Lead::factory()->count(2)->create(['is_read' => true]);

        $response = $this->actingAs($this->admin)
            ->getJson('/api/admin/leads?filter=unread')
            ->assertOk();

        $this->assertCount(3, $response->json('data'));
        foreach ($response->json('data') as $lead) {
            $this->assertFalse($lead['is_read']);
        }
    }

    public function test_index_filter_read_returns_only_read(): void
    {
        Lead::factory()->count(3)->create(['is_read' => false]);
        Lead::factory()->count(2)->create(['is_read' => true]);

        $response = $this->actingAs($this->admin)
            ->getJson('/api/admin/leads?filter=read')
            ->assertOk();

        $this->assertCount(2, $response->json('data'));
        foreach ($response->json('data') as $lead) {
            $this->assertTrue($lead['is_read']);
        }
    }

    public function test_index_unread_leads_appear_before_read(): void
    {
        Lead::factory()->create(['is_read' => true]);
        Lead::factory()->create(['is_read' => false]);

        $data = $this->actingAs($this->admin)
            ->getJson('/api/admin/leads')
            ->assertOk()
            ->json('data');

        $this->assertFalse($data[0]['is_read']);
        $this->assertTrue($data[1]['is_read']);
    }

    public function test_toggle_read_marks_unread_lead_as_read(): void
    {
        $lead = Lead::factory()->create(['is_read' => false]);

        $this->actingAs($this->admin)
            ->patchJson("/api/admin/leads/{$lead->id}/toggle-read")
            ->assertOk()
            ->assertJsonPath('is_read', true);

        $this->assertDatabaseHas('leads', ['id' => $lead->id, 'is_read' => true]);
    }

    public function test_toggle_read_marks_read_lead_as_unread(): void
    {
        $lead = Lead::factory()->create(['is_read' => true]);

        $this->actingAs($this->admin)
            ->patchJson("/api/admin/leads/{$lead->id}/toggle-read")
            ->assertOk()
            ->assertJsonPath('is_read', false);

        $this->assertDatabaseHas('leads', ['id' => $lead->id, 'is_read' => false]);
    }

    public function test_non_admin_cannot_list_leads(): void
    {
        $accountant = User::factory()->create(['role' => 'accountant']);

        $this->actingAs($accountant)
            ->getJson('/api/admin/leads')
            ->assertForbidden();
    }

    public function test_non_admin_cannot_toggle_lead(): void
    {
        $lead = Lead::factory()->create();
        $accountant = User::factory()->create(['role' => 'accountant']);

        $this->actingAs($accountant)
            ->patchJson("/api/admin/leads/{$lead->id}/toggle-read")
            ->assertForbidden();
    }
}
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd backend && php artisan test tests/Feature/AdminLeadsTest.php
```

Expected: all tests FAIL — controller and routes don't exist yet.

- [ ] **Step 3: Create the controller**

Create `backend/app/Http/Controllers/Admin/LeadController.php`:

```php
<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Lead;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class LeadController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $filter = $request->query('filter', 'all');
        $page   = max(1, (int) $request->query('page', 1));

        $query = Lead::query()->orderBy('is_read', 'asc')->orderBy('created_at', 'desc');

        if ($filter === 'unread') {
            $query->where('is_read', false);
        } elseif ($filter === 'read') {
            $query->where('is_read', true);
        }

        $paginated = $query->paginate(10, ['*'], 'page', $page);

        return response()->json([
            'data' => $paginated->map(fn (Lead $l) => [
                'id'         => $l->id,
                'contact'    => $l->contact,
                'message'    => $l->message,
                'is_read'    => (bool) $l->is_read,
                'created_at' => $l->created_at?->toISOString(),
            ]),
            'pagination' => [
                'currentPage' => $paginated->currentPage(),
                'perPage'     => $paginated->perPage(),
                'total'       => $paginated->total(),
            ],
        ]);
    }

    public function toggleRead(Lead $lead): JsonResponse
    {
        $lead->update(['is_read' => !$lead->is_read]);

        return response()->json([
            'id'         => $lead->id,
            'contact'    => $lead->contact,
            'message'    => $lead->message,
            'is_read'    => (bool) $lead->is_read,
            'created_at' => $lead->created_at?->toISOString(),
        ]);
    }
}
```

- [ ] **Step 4: Register the routes**

Open `backend/routes/api.php`. Inside the `role:admin` middleware group (after the existing admin routes, e.g. after the accountants block), add:

```php
Route::get('/admin/leads',                          [Admin\LeadController::class, 'index']);
Route::patch('/admin/leads/{lead}/toggle-read',     [Admin\LeadController::class, 'toggleRead']);
```

Also add the use statement at the top of the file if `Admin\LeadController` isn't auto-resolved — the existing `use App\Http\Controllers\Admin;` namespace import covers it already since other `Admin\*` controllers follow the same pattern.

- [ ] **Step 5: Run tests to verify they pass**

```bash
cd backend && php artisan test tests/Feature/AdminLeadsTest.php
```

Expected: all 8 tests PASS.

- [ ] **Step 6: Commit**

```bash
git add backend/app/Http/Controllers/Admin/LeadController.php \
        backend/routes/api.php \
        backend/tests/Feature/AdminLeadsTest.php
git commit -m "feat: add Admin\LeadController with index and toggleRead"
```

---

## Task 3: Frontend API Helper

**Files:**
- Create: `frontend/src/lib/api/admin/leads.ts`

**Interfaces:**
- Produces:
  - `Lead` type: `{ id: string; contact: string; message: string | null; is_read: boolean; created_at: string }`
  - `getLeads({ filter?, page? }): Promise<{ data: Lead[]; pagination: { currentPage: number; perPage: number; total: number } }>`
  - `toggleLeadRead(id: string): Promise<Lead>`

- [ ] **Step 1: Create the API helper**

Create `frontend/src/lib/api/admin/leads.ts`:

```ts
import api from '../client'

export interface Lead {
  id: string
  contact: string
  message: string | null
  is_read: boolean
  created_at: string
}

export async function getLeads(params?: {
  filter?: 'all' | 'unread' | 'read'
  page?: number
}): Promise<{ data: Lead[]; pagination: { currentPage: number; perPage: number; total: number } }> {
  const { data } = await api.get('/admin/leads', { params })
  return data
}

export async function toggleLeadRead(id: string): Promise<Lead> {
  const { data } = await api.patch<Lead>(`/admin/leads/${id}/toggle-read`)
  return data
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/lib/api/admin/leads.ts
git commit -m "feat: add admin leads API helper"
```

---

## Task 4: Admin Leads Page + Tests

**Files:**
- Create: `frontend/src/app/admin/leads/page.tsx`
- Create: `frontend/src/app/admin/leads/__tests__/page.test.tsx`

**Interfaces:**
- Consumes:
  - `getLeads({ filter?, page? })` from `@/lib/api/admin/leads`
  - `toggleLeadRead(id: string)` from `@/lib/api/admin/leads`
  - `Lead` type from `@/lib/api/admin/leads`
  - `Breadcrumb` from `@/components/shared/Breadcrumb`
  - `SummaryCard` from `@/components/shared/SummaryCard`

- [ ] **Step 1: Write the failing tests**

Create `frontend/src/app/admin/leads/__tests__/page.test.tsx`:

```tsx
import { render, screen, fireEvent } from '@testing-library/react'
import AdminLeadsPage from '../page'

jest.mock('@/components/layout/ThemeProvider', () => ({
  useTheme: () => ({ theme: 'sofia', setTheme: jest.fn() }),
}))
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn() }),
}))
jest.mock('@/lib/hooks/useAuth', () => ({
  useAuth: () => ({ user: { name: 'Admin User', role: 'admin' } }),
}))

const mockLeads = [
  { id: '1', contact: 'juan@example.com', message: 'Interested in Growth plan', is_read: false, created_at: '2026-06-21T10:00:00Z' },
  { id: '2', contact: '09171234567', message: null, is_read: true, created_at: '2026-06-20T08:00:00Z' },
]

const mockMutate = jest.fn()

jest.mock('@tanstack/react-query', () => ({
  useQuery: ({ queryKey }: { queryKey: unknown[] }) => {
    if ((queryKey as string[])[0] === 'admin-leads') {
      return {
        data: {
          data: mockLeads,
          pagination: { currentPage: 1, perPage: 10, total: 2 },
        },
        isLoading: false,
      }
    }
    return { data: undefined, isLoading: false }
  },
  useMutation: () => ({ mutate: mockMutate }),
  useQueryClient: () => ({ setQueryData: jest.fn() }),
}))

function wrap() {
  return render(
    <div data-theme="sofia">
      <AdminLeadsPage />
    </div>
  )
}

describe('AdminLeadsPage', () => {
  it('renders page title', () => {
    wrap()
    expect(screen.getByText('Leads')).toBeInTheDocument()
  })

  it('renders total and unread summary cards', () => {
    wrap()
    expect(screen.getByText('Total')).toBeInTheDocument()
    expect(screen.getByText('Unread')).toBeInTheDocument()
  })

  it('renders All / Unread / Read filter tabs', () => {
    wrap()
    expect(screen.getByText('All')).toBeInTheDocument()
    expect(screen.getByText('Unread')).toBeInTheDocument()
    expect(screen.getByText('Read')).toBeInTheDocument()
  })

  it('renders lead contact and message', () => {
    wrap()
    expect(screen.getByText('juan@example.com')).toBeInTheDocument()
    expect(screen.getByText('Interested in Growth plan')).toBeInTheDocument()
  })

  it('shows Mark as read button for unread lead', () => {
    wrap()
    const buttons = screen.getAllByRole('button', { name: /mark as read/i })
    expect(buttons.length).toBeGreaterThan(0)
  })

  it('shows Mark as unread button for read lead', () => {
    wrap()
    const buttons = screen.getAllByRole('button', { name: /mark as unread/i })
    expect(buttons.length).toBeGreaterThan(0)
  })

  it('calls mutate when toggle button is clicked', () => {
    wrap()
    const button = screen.getAllByRole('button', { name: /mark as read/i })[0]
    fireEvent.click(button)
    expect(mockMutate).toHaveBeenCalledWith('1')
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd frontend && npx jest src/app/admin/leads/__tests__/page.test.tsx --no-coverage
```

Expected: FAIL — page doesn't exist yet.

- [ ] **Step 3: Create the page**

Create `frontend/src/app/admin/leads/page.tsx`:

```tsx
'use client'

import { useState, type CSSProperties } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getLeads, toggleLeadRead, type Lead } from '@/lib/api/admin/leads'
import { Breadcrumb } from '@/components/shared/Breadcrumb'
import { SummaryCard } from '@/components/shared/SummaryCard'

type Filter = 'all' | 'unread' | 'read'

export default function AdminLeadsPage() {
  const [filter, setFilter] = useState<Filter>('all')
  const [page, setPage]     = useState(1)
  const queryClient         = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ['admin-leads', { filter, page }],
    queryFn: () => getLeads({ filter, page }),
  })

  const { mutate: toggle } = useMutation({
    mutationFn: toggleLeadRead,
    onMutate: async (id: string) => {
      await queryClient.cancelQueries({ queryKey: ['admin-leads', { filter, page }] })
      const previous = queryClient.getQueryData(['admin-leads', { filter, page }])
      queryClient.setQueryData(['admin-leads', { filter, page }], (old: typeof data) => {
        if (!old) return old
        return {
          ...old,
          data: old.data.map((l: Lead) =>
            l.id === id ? { ...l, is_read: !l.is_read } : l
          ),
        }
      })
      return { previous }
    },
    onError: (_err, _id, ctx) => {
      if (ctx?.previous) {
        queryClient.setQueryData(['admin-leads', { filter, page }], ctx.previous)
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-leads'] })
    },
  })

  const leads      = data?.data ?? []
  const pagination = data?.pagination
  const total      = pagination?.total ?? 0
  const perPage    = pagination?.perPage ?? 10
  const currentPage = pagination?.currentPage ?? 1
  const totalPages = Math.max(1, Math.ceil(total / perPage))
  const from = total === 0 ? 0 : (currentPage - 1) * perPage + 1
  const to   = Math.min(currentPage * perPage, total)
  const unreadCount = leads.filter((l) => !l.is_read).length

  const pageNums = (() => {
    if (totalPages <= 5) return Array.from({ length: totalPages }, (_, i) => i + 1)
    if (currentPage <= 3) return [1, 2, 3, 4, 5]
    if (currentPage >= totalPages - 2) return [totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages]
    return [currentPage - 2, currentPage - 1, currentPage, currentPage + 1, currentPage + 2]
  })()

  const COLS = 'minmax(140px, 1.5fr) minmax(200px, 3fr) 120px 140px'
  const TABS: { label: string; value: Filter }[] = [
    { label: 'All',    value: 'all'    },
    { label: 'Unread', value: 'unread' },
    { label: 'Read',   value: 'read'   },
  ]

  return (
    <div className="max-w-[1280px] mx-auto px-9 py-7">
      <Breadcrumb crumbs={[{ label: 'Admin' }, { label: 'Leads' }]} />

      <div className="flex items-start justify-between mb-[22px]">
        <div>
          <h1
            className="text-[34px] font-bold tracking-[-0.025em] text-t-ink m-0"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            Leads
          </h1>
          <p className="text-[14.5px] text-t-muted mt-[5px]">
            {isLoading ? '…' : `${total} total leads`}
          </p>
        </div>
      </div>

      {!isLoading && (
        <div className="flex gap-[14px] mb-[22px]">
          <SummaryCard label="Total"  value={String(total)}        subnote="all leads"    />
          <SummaryCard label="Unread" value={String(unreadCount)}  subnote="not yet read" />
        </div>
      )}

      {/* Filter tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 20 }}>
        {TABS.map((tab) => (
          <button
            key={tab.value}
            onClick={() => { setFilter(tab.value); setPage(1) }}
            style={{
              padding: '6px 16px',
              borderRadius: 9999,
              fontSize: 13,
              fontWeight: 700,
              border: '1.5px solid',
              cursor: 'pointer',
              transition: 'all 0.12s',
              background:   filter === tab.value ? 'var(--t-primary)'      : 'var(--t-card)',
              color:        filter === tab.value ? '#fff'                   : 'var(--t-muted)',
              borderColor:  filter === tab.value ? 'var(--t-primary)'      : 'var(--t-line)',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Table card */}
      <div style={{ background: 'var(--t-card)', border: '1px solid var(--t-line)', borderRadius: 20, overflow: 'hidden', boxShadow: 'var(--t-shadow)' }}>
        {/* Card header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '18px 24px', borderBottom: '1px solid var(--t-line)' }}>
          <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} style={{ color: 'var(--t-primary)', flexShrink: 0 }}>
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
          <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 16, color: 'var(--t-ink)' }}>Leads</span>
          <span style={{ background: 'var(--t-primary-soft)', color: 'var(--t-primary)', border: '1px solid var(--t-line)', borderRadius: 999, padding: '2px 9px', fontSize: 11.5, fontWeight: 800 }}>
            {total}
          </span>
        </div>

        {isLoading ? (
          <div style={{ padding: 32, textAlign: 'center', fontSize: 14, color: 'var(--t-faint)' }}>Loading…</div>
        ) : leads.length === 0 ? (
          <div style={{ padding: 32, textAlign: 'center', fontSize: 14, color: 'var(--t-faint)' }}>No leads found.</div>
        ) : (
          <>
            {/* Column headers */}
            <div style={{ display: 'grid', gridTemplateColumns: COLS, columnGap: 16, padding: '12px 24px', borderBottom: '1px solid var(--t-line)' }}>
              {(['Contact', 'Message', 'Received', ''] as const).map((label) => (
                <span key={label} style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.06em', color: 'var(--t-faint)' }}>
                  {label}
                </span>
              ))}
            </div>

            {/* Data rows */}
            {leads.map((lead, i) => {
              const isUnread = !lead.is_read
              const rowBg    = i % 2 === 1 ? 'var(--t-card-alt)' : 'transparent'

              return (
                <div
                  key={lead.id}
                  style={{
                    display: 'grid', gridTemplateColumns: COLS, columnGap: 16,
                    padding: '13px 24px', alignItems: 'center',
                    borderBottom: '1px solid var(--t-line-soft)',
                    background: rowBg,
                    boxShadow: isUnread ? 'inset 3px 0 0 var(--t-primary)' : 'inset 3px 0 0 transparent',
                  }}
                >
                  <span style={{ fontWeight: isUnread ? 700 : 500, fontSize: 13.5, color: 'var(--t-ink)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {lead.contact}
                  </span>
                  <span
                    title={lead.message ?? ''}
                    style={{ fontSize: 13.5, color: 'var(--t-muted)', fontWeight: 400, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                  >
                    {lead.message ?? <span style={{ color: 'var(--t-faint)', fontStyle: 'italic' }}>No message</span>}
                  </span>
                  <span style={{ fontSize: 12.5, color: 'var(--t-faint)', fontWeight: 500 }}>
                    {new Date(lead.created_at).toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: 'numeric' })}
                  </span>
                  <button
                    onClick={() => toggle(lead.id)}
                    style={{
                      padding: '5px 12px', borderRadius: 8, fontSize: 12.5, fontWeight: 700, cursor: 'pointer',
                      background: isUnread ? 'var(--t-primary-soft)' : 'var(--t-card-alt)',
                      color:      isUnread ? 'var(--t-primary)'      : 'var(--t-muted)',
                      border:     isUnread ? '1px solid var(--t-primary)' : '1px solid var(--t-line)',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {isUnread ? 'Mark as read' : 'Mark as unread'}
                  </button>
                </div>
              )
            })}

            {/* Footer — entry count + pagination */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 24px', borderTop: '2px solid var(--t-line)', background: 'var(--t-card-alt)' }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--t-muted)' }}>
                {from}–{to} of {total} leads
              </span>
              {totalPages > 1 && (
                <div style={{ display: 'flex', gap: 4 }}>
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    style={{ width: 28, height: 28, border: '1px solid var(--t-line)', borderRadius: 8, fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--t-card)', color: 'var(--t-muted)', cursor: 'pointer', opacity: currentPage === 1 ? 0.4 : 1 }}
                  >‹</button>
                  {pageNums.map((pg) => (
                    <button
                      key={pg}
                      onClick={() => setPage(pg)}
                      style={{
                        width: 28, height: 28, borderRadius: 8, fontSize: 13,
                        fontWeight: pg === currentPage ? 700 : 500,
                        display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
                        background:   pg === currentPage ? 'var(--t-primary)' : 'var(--t-card)',
                        color:        pg === currentPage ? '#fff'              : 'var(--t-muted)',
                        border:       pg === currentPage ? '1px solid var(--t-primary)' : '1px solid var(--t-line)',
                      }}
                    >{pg}</button>
                  ))}
                  {pageNums[pageNums.length - 1] < totalPages && (
                    <>
                      <span style={{ width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, color: 'var(--t-faint)' }}>…</span>
                      <button onClick={() => setPage(totalPages)} style={{ width: 28, height: 28, border: '1px solid var(--t-line)', borderRadius: 8, fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--t-card)', color: 'var(--t-muted)', cursor: 'pointer' }}>{totalPages}</button>
                    </>
                  )}
                  <button
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    style={{ width: 28, height: 28, border: '1px solid var(--t-line)', borderRadius: 8, fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--t-card)', color: 'var(--t-muted)', cursor: 'pointer', opacity: currentPage === totalPages ? 0.4 : 1 }}
                  >›</button>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
cd frontend && npx jest src/app/admin/leads/__tests__/page.test.tsx --no-coverage
```

Expected: all 7 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/app/admin/leads/page.tsx \
        frontend/src/app/admin/leads/__tests__/page.test.tsx
git commit -m "feat: add admin leads page with filter tabs and read toggle"
```

---

## Self-Review

**Spec coverage:**
- ✅ Paginated list (10/page) — Task 2 index method + Task 4 page
- ✅ `is_read` toggle — Task 1 migration, Task 2 `toggleRead`, Task 4 mutation
- ✅ Filter tabs All / Unread / Read — Task 4 page
- ✅ Unread rows visually distinct (left border + bold contact) — Task 4 page
- ✅ Optimistic update — Task 4 `onMutate`
- ✅ Admin-only routes — Task 2 routes under `role:admin` middleware
- ✅ Pagination footer — Task 4 page

**Placeholder scan:** None found.

**Type consistency:**
- `Lead` type defined once in `leads.ts`, imported in page — consistent
- `getLeads` returns `{ data: Lead[], pagination: { currentPage, perPage, total } }` — matches backend shape and page consumption
- `toggleLeadRead(id: string)` called as `toggle(lead.id)` in page — consistent
- `queryKey: ['admin-leads', { filter, page }]` used identically in `useQuery`, `onMutate`, `onSettled` — consistent
