# BIR Books Modal Filter Improvements — Design Spec

**Date:** 2026-06-02
**Status:** Approved

## Problem

The BIR Books modal has three issues:
1. Client users see a disabled "Your account" client selector that serves no purpose — they are always viewing their own account.
2. The GL book has no account selector in the modal, so users can't pre-select an account before navigating.
3. The destination book pages don't read `accountId` from the URL, so any account selection made in the modal would be lost on navigation.

## Solution

Three targeted changes across the modal pages and destination book pages:
1. Remove the client selector from the client-role modal.
2. Add a GL account selector to all three modals (client, accountant, admin).
3. Pass `accountId` in the navigation URL and have destination pages read it as initial state.

---

## Section 1 — Remove Client selector for client role

**File:** `frontend/src/app/client/reports/page.tsx`

Remove the entire `<div>` block containing the disabled "Client" `<select>` from the modal body. No other changes to this block. The modal starts directly with the From/To date range.

---

## Section 2 — GL account filter in modals

Changes apply to all three modal pages:
- `frontend/src/app/client/reports/page.tsx`
- `frontend/src/app/accountant/reports/page.tsx`
- `frontend/src/app/admin/reports/page.tsx`

### New state

```typescript
const [accountId, setAccountId] = useState<string | undefined>()
```

Reset to `undefined` when the modal opens (inside `openModal()`), alongside any existing resets.

### New query

**Client:**
```typescript
const { data: accounts } = useQuery({
  queryKey: ['accounts'],
  queryFn: () => getAccounts(),
  enabled: pending === 'bir' && birBook === 'gl',
})
```

**Accountant:**
```typescript
const { data: accounts } = useQuery({
  queryKey: ['accounts', clientId],
  queryFn: () => getAccounts(clientId),
  enabled: pending === 'bir' && birBook === 'gl' && !!clientId,
})
```

**Admin:**
```typescript
const { data: accounts } = useQuery({
  queryKey: ['accounts', clientId],
  queryFn: () => getAccounts(clientId),
  enabled: pending === 'bir' && birBook === 'gl' && !!clientId,
})
```

### Account selector in modal body

Rendered below the Book selector, only when `pending === 'bir' && birBook === 'gl'`:

```tsx
{pending === 'bir' && birBook === 'gl' && (
  <div>
    <label className={labelCls}>Account</label>
    <select
      value={accountId ?? ''}
      onChange={(e) => setAccountId(e.target.value || undefined)}
      className={inputCls}
    >
      <option value="">Select account…</option>
      {(accounts ?? []).map((a) => (
        <option key={a.id} value={a.id}>{a.code} — {a.name}</option>
      ))}
    </select>
  </div>
)}
```

For accountant/admin: accounts only populate once `clientId` is set (enforced by the `enabled` condition on the query).

### View Book disabled state

Add `accountId` to the existing disabled guard:

```typescript
// accountant/admin — existing guard:
disabled={!clientId || (pending === 'bir' && birBook === 'gl' && !accountId)}

// client — new guard (currently no disabled on View Book):
disabled={pending === 'bir' && birBook === 'gl' && !accountId}
```

### Imports needed

All three pages need:
```typescript
import { getAccounts } from '@/lib/api/accounts'
```

---

## Section 3 — Pass accountId through navigation

### Modal navigation — `handleView()`

When `birBook === 'gl'`, append `&accountId=${accountId}` to the query string.

**Client:**
```typescript
if (pending === 'bir') {
  const acct = birBook === 'gl' && accountId ? `&accountId=${accountId}` : ''
  router.push(`/client/reports/bir${qs}&book=${birBook}${acct}`)
}
```

**Accountant:**
```typescript
if (pending === 'bir') {
  const acct = birBook === 'gl' && accountId ? `&accountId=${accountId}` : ''
  router.push(`${base}/bir/${birBook}${qs}${acct}`)
}
```

**Admin:** same as accountant.

### Destination page — client (`frontend/src/app/client/reports/bir/page.tsx`)

Initialize `accountId` from search params:

```typescript
const [accountId, setAccountId] = useState<string | undefined>(
  searchParams.get('accountId') ?? undefined
)
```

No other changes. The user still clicks "View Book" on the page to generate the book; the account is just pre-selected.

### Destination pages — accountant + admin

Both `frontend/src/app/accountant/reports/[clientId]/bir/[book]/page.tsx` and `frontend/src/app/admin/reports/[clientId]/bir/[book]/page.tsx` (currently identical) get the same change:

Initialize `accountId` from search params:

```typescript
const [accountId, setAccountId] = useState<string | undefined>(
  searchParams.get('accountId') ?? undefined
)
```

Keep the existing `accountId ?? accounts?.[0]?.id` fallback in the `BIRBookTable` and `ExportPDFButton` props — it handles direct navigation to a GL URL without an `accountId` param (e.g. bookmarked links). When coming from the modal, `accountId` will be set and the fallback is never reached.

---

## Files Changed

| File | Change |
|---|---|
| `frontend/src/app/client/reports/page.tsx` | Remove client selector; add GL account state + query + selector; add disabled guard; update `handleView` |
| `frontend/src/app/accountant/reports/page.tsx` | Add GL account state + query + selector; update disabled guard; update `handleView` |
| `frontend/src/app/admin/reports/page.tsx` | Add GL account state + query + selector; update disabled guard; update `handleView` |
| `frontend/src/app/client/reports/bir/page.tsx` | Initialize `accountId` from search params |
| `frontend/src/app/accountant/reports/[clientId]/bir/[book]/page.tsx` | Initialize `accountId` from search params |
| `frontend/src/app/admin/reports/[clientId]/bir/[book]/page.tsx` | Initialize `accountId` from search params |

## Out of Scope

- Auto-generating the book on the client BIR page when both `book` and `accountId` are pre-filled from URL — user still clicks "View Book" manually.
- Any changes to the Income Statement or Expense Breakdown flows — BIR Books only.
- The `ReportClientSelector` component — not used in these pages.
