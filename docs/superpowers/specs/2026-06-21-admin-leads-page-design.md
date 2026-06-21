# Admin Leads Page — Design Spec
**Date:** 2026-06-21
**Status:** Approved

## Overview

Add a new admin-only page at `/admin/leads` that lists all submitted leads with pagination (10/page), filter tabs (All / Unread / Read), and an inline toggle to mark leads as read or unread.

---

## Data Layer (Backend)

### Migration
Add `is_read` boolean column to the existing `leads` table:
```php
$table->boolean('is_read')->default(false)->after('message');
```

### Model
Add `is_read` to `Lead::$fillable`.

### Controller — `App\Http\Controllers\Admin\LeadController`

**`index(Request $request): JsonResponse`**
- Query param: `filter` — one of `all` (default), `unread`, `read`
- Query param: `page` — integer, default 1
- Per-page: 10 (hardcoded)
- Order: `is_read ASC, created_at DESC` (unread float to top within each tab)
- Returns:
  ```json
  {
    "data": [{ "id", "contact", "message", "is_read", "created_at" }],
    "pagination": { "currentPage", "perPage", "total" }
  }
  ```

**`toggleRead(Lead $lead): JsonResponse`**
- Flips `$lead->is_read` and saves
- Returns the updated lead object

### Routes
Added inside the existing `role:admin` middleware group in `routes/api.php`:
```
GET   /admin/leads
PATCH /admin/leads/{id}/toggle-read
```

---

## Frontend

### API Helper — `frontend/src/lib/api/admin/leads.ts`

**Types:**
```ts
interface Lead {
  id: string
  contact: string
  message: string | null
  is_read: boolean
  created_at: string
}
```

**Functions:**
- `getLeads({ filter?: 'all' | 'unread' | 'read', page?: number })` — GET `/admin/leads`
  - Returns `{ data: Lead[], pagination: { currentPage, perPage, total } }`
- `toggleLeadRead(id: string)` — PATCH `/admin/leads/{id}/toggle-read`
  - Returns updated `Lead`

### Page — `frontend/src/app/admin/leads/page.tsx`

**Structure** (matches existing admin page pattern):

1. **Breadcrumb** — `Admin > Leads`
2. **Header** — Title "Leads" + subtitle `{total} total leads`
3. **Summary cards** — Total, Unread (using existing `SummaryCard` component)
4. **Filter tabs** — All | Unread | Read — switching resets to page 1
5. **Table card** with columns:

| Column | Notes |
|--------|-------|
| Contact | Bold on unread rows |
| Message | Truncated with `text-overflow: ellipsis`; full text on `title` attribute (hover tooltip) |
| Received | Formatted `created_at` date |
| Action | "Mark as read" / "Mark as unread" button |

6. **Row styling** — Unread rows: `inset 3px 0 0 var(--t-primary)` left-border accent + bold contact text
7. **Pagination footer** — 10/page, same button style as clients page (`‹ 1 2 3 … N ›`)

**Data fetching:**
- `useQuery` with key `['admin-leads', { filter, page }]`
- Toggle via `useMutation` calling `toggleLeadRead`, with optimistic update via `queryClient.setQueryData` so the row flips instantly without a loading state

**No modal needed** — all interactions are inline.

---

## Out of Scope
- Deleting leads
- Bulk mark-as-read
- Search/filter by contact text
- Pagination in the nav sidebar (unread badge count)
