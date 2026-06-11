# Accountant Clients Table — Server-Side Pagination

**Date:** 2026-06-11
**Scope:** `/accountant/clients` page — paginate the clients table with server-side search

---

## Problem

`GET /accountant/clients` returns all clients in a flat array. The frontend filters locally with a search box and computes queue counts by joining against a separate full-queue fetch. There is no pagination bar. As the number of clients grows this becomes slow and unwieldy.

---

## Architecture

Three layers change: backend controller, frontend API client, frontend page component.

### Backend — `ClientController::index()`

Accepts query params:

| Param | Default | Notes |
|---|---|---|
| `search` | `""` | Filters on `companies.name` (case-insensitive LIKE) |
| `per_page` | `15` | Clamped to 1–100 |
| `page` | `1` | |

**Queries:**

1. Base query: `Company::where('accountant_id', $user->id)`, optionally `->where('name', 'LIKE', "%{$search}%")`.
2. **Summary aggregate** (runs on the full matching set before pagination):
   - `needAttention` — count of *companies* that have at least one parked doc with `flag = 'RED'`
   - `pendingReview` — sum of all parked RED + YELLOW *documents* across all matching companies
   - `allClear` — count of *companies* with no RED and no YELLOW parked docs but at least one GREEN
3. **Paginated fetch**: `->paginate($perPage)`.
4. **Per-page queue counts**: one query — `Document::whereIn('company_id', $page->pluck('id'))->where('status', 'parked')->selectRaw('company_id, flag, COUNT(*) as cnt')->groupBy('company_id', 'flag')->get()` — then keyed by company ID for the map.

**Response shape:**

```json
{
  "data": [
    {
      "id": "...",
      "name": "Reyes Bakery",
      "mobile": "09...",
      "email": "...",
      "tin": "...",
      "contactPerson": "...",
      "birType": "vat",
      "plan": "basic",
      "accountantId": "...",
      "accountantName": "...",
      "clientId": "...",
      "clientStatus": "ACTIVE",
      "username": "...",
      "lastPayment": null,
      "queueCounts": { "red": 1, "yellow": 0, "green": 3 }
    }
  ],
  "total": 42,
  "perPage": 15,
  "currentPage": 1,
  "lastPage": 3,
  "summary": {
    "needAttention": 5,
    "pendingReview": 11,
    "allClear": 20
  }
}
```

### Frontend — API client (`src/lib/api/accountant/clients.ts`)

`getAccountantClients()` signature changes to:

```ts
getAccountantClients(params?: {
  page?: number
  per_page?: number
  search?: string
}): Promise<PagedClients>
```

A `PagedClients` type is added (in `src/types/admin.ts` or alongside `PagedDocs`):

```ts
interface PagedClients {
  data: ClientProfile[]        // ClientProfile gains queueCounts field
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

`ClientProfile` gains an optional `queueCounts?: { red: number; yellow: number; green: number }` field.

### Frontend — Page (`src/app/accountant/clients/page.tsx`)

- Add `page` state (number, default 1). Reset to 1 whenever `search` changes.
- Add `debouncedSearch` (300 ms) derived from `search` state.
- Query key: `['accountant-clients', debouncedSearch, page]`.
- `queryFn`: `getAccountantClients({ search: debouncedSearch, page, per_page: 15 })`.
- Remove the separate `getQueue()` call and all `queueCountsForClient` logic — counts come from `client.queueCounts` directly.
- Summary cards read from `data.summary` (accurate across all pages).
- "X of Y clients" label uses `data.total` for Y and `data.data.length` for X.
- Pagination bar added inside the table card below the last row, matching the `DocumentsTable` visual pattern: prev/next buttons, numbered page buttons with ellipsis for large page counts, "Showing X–Y of Z" label.

---

## Error handling

No special error handling beyond what React Query provides by default (the page already has no explicit error UI). If the search yields zero results the existing "No clients found." empty state is shown.

---

## Testing

- Existing unit tests for the page are minimal; no new tests are required by this spec.
- Manual: verify pagination bar appears, prev/next work, page resets when search changes, summary cards reflect all-clients totals not just current page.

---

## What is NOT changing

- The `show()`, `getDocuments()` controller methods — untouched.
- `ClientDetailModal` — untouched.
- The `getQueue()` endpoint itself — still exists for the queue page; only the clients page stops calling it.
