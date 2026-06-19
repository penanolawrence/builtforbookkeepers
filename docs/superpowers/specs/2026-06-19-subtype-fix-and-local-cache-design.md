# Subtype Fix & Local Cache Speed Improvements — Design Spec
**Date:** 2026-06-19

## Overview

Two problems solved together:

**Part 1 — Fix broken subtype plumbing.**
`SubtypeController` still writes to the old global `subtypes` table, but `transaction_lines.subtype_id` and `adjusting_entry_lines.subtype_id` were retargeted (June 7 migrations) to FK-reference `chart_of_account_subtypes`. This means every subtype save from the UI currently violates the FK constraint. Fix: retarget the controller to `ChartOfAccountSubtype`, relax the schema for user-created free-text subtypes, and drop the obsolete `subtypes` table.

**Part 2 — localStorage caching for speed.**
On initial app load (after login), pre-fetch the full subtype list and chart of accounts for each accessible client. Store in localStorage with TTL. Components read from cache first — the subtype combobox becomes instant (client-side filter, zero network per keystroke). Write-through on create so the cache stays fresh without a re-fetch.

---

## Goals

- Fix the silent FK violation on every subtype save
- Make subtype search instant (no debounced network call per keystroke)
- Eliminate redundant account fetches across components on the same client
- Cache stable reference data (clients list, accountants list) to reduce queue page load time
- Keep cache keys consistent with the existing `b4b_` localStorage convention

---

## Part 1 — Backend: Fix Subtype Plumbing

### 1.1 Schema migration on `chart_of_account_subtypes`

Three columns become nullable to support user-created free-text subtypes:

| Column | Before | After | Reason |
|--------|--------|-------|--------|
| `chart_of_account_id` | required FK | nullable FK | User-created subtypes have no COA link |
| `code` | required string(10), unique | nullable string(10), unique | No BIR code for free-text tags |
| `sort_order` | required unsigned smallint | unsigned smallint, default `0` | No meaningful ordering for user-created ones |

User-created subtypes: `chart_of_account_id = null`, `code = null`, `sort_order = 0`.
Seeded/predefined subtypes (from `ChartOfAccountSubtypeSeeder`): unchanged — they retain their COA link and code.

### 1.2 `SubtypeController` updates

**`index()` — search / preload**

```
Query: ChartOfAccountSubtype WHERE chart_of_account_id IS NULL
  If q param present AND length >= 3 → filter by name LIKE %q%
  If no q param → return all (full preload)
Response: [{ id, name }]
```

**`store()` — create**

```
ChartOfAccountSubtype::firstOrCreate(
  ['name' => $request->name],
  ['chart_of_account_id' => null, 'code' => null, 'sort_order' => 0]
)
Response: { id, name }
```

Route registration in `api.php` is unchanged — same `GET /subtypes` and `POST /subtypes` endpoints.

### 1.3 Cleanup

| File | Action |
|------|--------|
| `app/Models/Subtype.php` | Delete |
| `database/migrations/*_create_subtypes_table.php` | Retained (history), but new migration drops the table |
| `database/seeders/SubtypeSeeder.php` | Repurpose: seed 22 canonical names into `chart_of_account_subtypes` with null `chart_of_account_id` and null `code` |
| `database/seeders/DatabaseSeeder.php` | Keep `SubtypeSeeder::class` call (now seeds into the new table) |
| `tests/Feature/SubtypeTest.php` | Rewrite assertions against `ChartOfAccountSubtype` |
| `subtypes` table | Dropped via new migration |

**Repurposed `SubtypeSeeder` canonical names (seeded as user-created, null COA link):**
Sales Revenue, Service Revenue, Interest Income, Rental Income, Commission Income, Other Income, Cost of Goods Sold, Salaries and Wages, Rent Expense, Utilities Expense, Communication Expense, Supplies Expense, Transportation Expense, Meals and Entertainment, Advertising Expense, Professional Fees, Repairs and Maintenance, Insurance Expense, Depreciation Expense, Taxes and Licenses, Interest Expense, Other Expense.

---

## Part 2 — Frontend: localStorage Caching

### 2.1 Cache keys & TTL

| Data | localStorage key | TTL | Scope |
|------|-----------------|-----|-------|
| All user-created subtypes | `b4b_subtypes` | 24h | Global |
| Chart of accounts | `b4b_accounts_{clientId}` | 24h | Per client |
| Client list (queue filter) | `b4b_clients_{userId}` | 30min | Per authenticated user |
| Accountant list (admin queue filter) | `b4b_accountants` | 1h | Global (admin only) |

**Not cached:** queue items (real-time WebSocket), document details, reports.

### 2.2 `localCache.ts` utility

Location: `frontend/src/lib/localCache.ts`

```ts
interface CacheEntry<T> {
  data: T
  expiresAt: number
}

get<T>(key: string): T | null
  // returns null if key missing or expired

set<T>(key: string, data: T, ttlMs: number): void
  // stores { data, expiresAt: Date.now() + ttlMs }

invalidate(key: string): void
  // removes the key

invalidatePrefix(prefix: string): void
  // removes all keys starting with prefix
```

All reads/writes are wrapped in try/catch — if localStorage is full or unavailable, the cache silently no-ops and the app falls back to live API calls.

### 2.3 `useAppPreloader` hook

Location: `frontend/src/lib/hooks/useAppPreloader.ts`

Fires once after login, called from the authenticated layout. Runs preloads in parallel:

```
1. GET /subtypes (no q param)
     → localCache.set('b4b_subtypes', data, 24h)

2. For each clientId the user can access:
     GET /accounts?clientId=X
     → localCache.set(`b4b_accounts_${clientId}`, data, 24h)

3. GET /clients (accountant's client list or admin's full list)
     → localCache.set(`b4b_clients_${userId}`, data, 30min)

4. (Admin only) GET /admin/accountants
     → localCache.set('b4b_accountants', data, 1h)
```

On cache hit (TTL still valid), skip the fetch — no redundant network call on revisit within the TTL window.

### 2.4 `SubtypeCombobox` changes

- On open: read `b4b_subtypes` from `localCache`. If cache hit, filter client-side. If cache miss, fall back to existing debounced server search (graceful degradation).
- 3-character minimum enforced client-side (same UX as before).
- On create (`POST /subtypes` success): append new `{ id, name }` to `b4b_subtypes` in cache immediately — no re-fetch.

### 2.5 Account cache invalidation

When an accountant adds a new COA account through the UI:
- Call `localCache.invalidate('b4b_accounts_{clientId}')` on the mutation's `onSuccess`
- Next fetch for that client re-populates the cache

### 2.6 Queue page — client & accountant list

`QueuePageContent` currently fetches the client/accountant lists on every mount. With caching:
- Read from `b4b_clients_{userId}` / `b4b_accountants` first
- If cache hit → skip fetch, populate dropdowns immediately
- React Query still owns in-memory deduplication within a session; localStorage cache handles cross-refresh persistence

---

## What stays the same

- `frontend/src/lib/api/subtypes.ts` — no changes (same endpoints, same response shape)
- `SubtypeCombobox` props interface — unchanged
- All other components that consume subtypes — unchanged
- `ChartOfAccountSubtypeSeeder` — untouched (structured COA-linked subtypes)
- Route paths in `api.php` — unchanged

---

## Out of Scope

- Caching queue items or document details (real-time, must stay live)
- Per-client subtype scoping on the backend (subtypes remain global)
- Structured COA-linked subtype UI (predefined categories per account — future feature)
- Service worker or HTTP cache-control headers
- Migrating existing subtype data from `subtypes` to `chart_of_account_subtypes` (existing `subtype_id` values on old rows were already nullified by the June 7 migration)
