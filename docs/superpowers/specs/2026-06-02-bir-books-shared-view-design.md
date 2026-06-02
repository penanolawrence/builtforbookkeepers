# BIR Books Shared View — Design Spec

**Date:** 2026-06-02
**Status:** Approved

## Problem

The client BIR books experience (single page with tabs, date inputs, account selector, "View Book" button) is not shared with accountant/admin. Accountant/admin navigate through a modal to a separate per-book page that loads immediately with no interactive controls. The two experiences are inconsistent — they should be identical except that accountant/admin have an additional client selector.

## Solution

Extract the client BIR page into a shared `BIRBooksView` component. All three roles use it. A `showClientSelector` prop controls whether the client dropdown is rendered. The accountant/admin modal for BIR Books is removed; the card on the reports landing page becomes a direct link to the new BIR books page.

---

## Section 1 — Shared `BIRBooksView` component

**New file:** `frontend/src/components/reports/BIRBooksView.tsx`

### Props

```typescript
interface Props {
  fetchClients?: () => Promise<Client[]>
  // When provided, a client selector is shown and must be filled before "View Book" is enabled.
  // Omit for the client role (no selector needed).
}
```

### State

```typescript
const [clientId, setClientId] = useState<string | undefined>()  // accountant/admin only
const [book, setBook] = useState('crb')
const [start, setStart] = useState<string>('')
const [end, setEnd] = useState<string>('')
const [accountId, setAccountId] = useState<string | undefined>()
const [loadedBooks, setLoadedBooks] = useState<Set<string>>(new Set())
```

Reset `accountId` and `loadedBooks` when `clientId` changes:

```typescript
useEffect(() => {
  setAccountId(undefined)
  setLoadedBooks(new Set())
}, [clientId])
```

### Queries

**Clients (accountant/admin only):**
```typescript
const { data: clients } = useQuery({
  queryKey: ['clients'],
  queryFn: fetchClients!,
  enabled: !!fetchClients,
})
```

**Accounts:**
```typescript
const { data: accounts } = useQuery({
  queryKey: ['accounts', clientId],
  queryFn: () => getAccounts(clientId),
  enabled: book === 'gl' && (!fetchClients || !!clientId),
})
```

For the client role `clientId` is `undefined` and `getAccounts()` is called without a client — identical to the current client page behaviour. For accountant/admin the query only fires once a client is selected.

### UI structure (top to bottom)

1. **Client selector** — only when `showClientSelector` is true
   ```tsx
   {fetchClients && (
     <div>
       <label className={labelCls}>Client</label>
       <select value={clientId ?? ''} onChange={(e) => setClientId(e.target.value || undefined)} className={inputCls}>
         <option value="">Select client…</option>
         {(clients ?? []).map((c) => (
           <option key={c.id} value={c.id}>{c.name}</option>
         ))}
       </select>
     </div>
   )}
   ```

2. **Book tabs** — CRB / CDB / GJ / GL segmented control (same as current client page)

3. **Date range inputs** — start and end date inputs

4. **Account selector** — only when `book === 'gl'`

5. **"View Book" button** — disabled when:
   - `!!fetchClients && !clientId`, or
   - `book === 'gl' && !accountId`

6. **`BIRBookTable` / `BIREmptyState`** — same conditional rendering as current client page; `clientId` passed through (undefined for client role)

---

## Section 2 — Routes and pages

### New pages

| File | Content |
|---|---|
| `frontend/src/app/accountant/reports/bir/page.tsx` | `<BIRBooksView fetchClients={getAccountantClients} />` |
| `frontend/src/app/admin/reports/bir/page.tsx` | `<BIRBooksView fetchClients={getClients} />` |

### Updated pages

| File | Change |
|---|---|
| `frontend/src/app/client/reports/bir/page.tsx` | Replace inline logic with `<BIRBooksView showClientSelector={false} />` |
| `frontend/src/app/accountant/reports/page.tsx` | BIR Books card becomes direct link to `/accountant/reports/bir`; BIR-specific modal fields removed |
| `frontend/src/app/admin/reports/page.tsx` | BIR Books card becomes direct link to `/admin/reports/bir`; BIR-specific modal fields removed |

### Removed pages

| File | Reason |
|---|---|
| `frontend/src/app/accountant/reports/[clientId]/bir/[book]/page.tsx` | Only reachable from now-removed modal navigation |
| `frontend/src/app/admin/reports/[clientId]/bir/[book]/page.tsx` | Only reachable from now-removed modal navigation |

The `[clientId]` dynamic segment continues to exist for Income Statement and Expense Breakdown routes — only the `bir/[book]` leaf pages are removed.

---

## Section 3 — Data flow

- `BIRBookTable` receives `clientId` as a prop in all cases. For the client role it is `undefined`; the backend uses the auth token to scope the data. For accountant/admin it is the user-selected value.
- The accounts query key includes `clientId` so it re-fetches automatically when the client changes.
- `loadedBooks` and `accountId` reset on `clientId` change to prevent stale table data from a previous client appearing.

---

## Files Changed

| File | Change |
|---|---|
| `frontend/src/components/reports/BIRBooksView.tsx` | **New** — shared component |
| `frontend/src/app/client/reports/bir/page.tsx` | Replace with thin wrapper |
| `frontend/src/app/accountant/reports/bir/page.tsx` | **New** — thin wrapper |
| `frontend/src/app/admin/reports/bir/page.tsx` | **New** — thin wrapper |
| `frontend/src/app/accountant/reports/page.tsx` | BIR Books card → direct link, remove BIR modal fields |
| `frontend/src/app/admin/reports/page.tsx` | BIR Books card → direct link, remove BIR modal fields |
| `frontend/src/app/accountant/reports/[clientId]/bir/[book]/page.tsx` | **Deleted** |
| `frontend/src/app/admin/reports/[clientId]/bir/[book]/page.tsx` | **Deleted** |

## Out of Scope

- Income Statement and Expense Breakdown modal flows — unchanged.
- Any changes to `BIRBookTable` internals.
- URL-param pre-population of dates/book/account from the landing page (the shared page starts with empty state; user fills everything in).
