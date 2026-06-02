# BIR Books URL Param Auto-Generate — Design Spec

**Date:** 2026-06-03
**Status:** Approved

## Problem

When a client fills in the BIR books modal (dates, book type, and optionally an account for GL) and clicks "View Book →", the app navigates to `/client/reports/bir?start=...&end=...&book=...` (plus `&accountId=...` for GL). `BIRBooksView` ignores all URL params and initializes with empty state, so the user arrives at a blank page and must re-enter everything manually.

The same issue would affect accountant/admin if they ever navigate to their BIR books page with URL params.

## Solution

Add `useSearchParams()` to `BIRBooksView`. Initialize `start`, `end`, `book`, and `accountId` state from URL params. When `start` and `end` are both present (and `accountId` too if `book === 'gl'`), pre-populate `loadedBooks` with the current book on mount — skipping the empty state and triggering the data fetch immediately.

When no URL params are present (accountant/admin navigating via direct link), all reads return empty/null, defaults apply, and `loadedBooks` stays empty — existing behavior is unchanged.

---

## Changes

**File:** `frontend/src/components/reports/BIRBooksView.tsx`

### New import

```typescript
import { useSearchParams } from 'next/navigation'
```

### Read params at top of component

```typescript
const searchParams = useSearchParams()

const initStart     = searchParams.get('start')     ?? ''
const initEnd       = searchParams.get('end')       ?? ''
const initBook      = searchParams.get('book')      ?? 'crb'
const initAccountId = searchParams.get('accountId') ?? undefined
```

### State initialization (replace empty defaults)

```diff
- const [book,      setBook]      = useState('crb')
- const [start,     setStart]     = useState('')
- const [end,       setEnd]       = useState('')
- const [accountId, setAccountId] = useState<string | undefined>()
+ const [book,      setBook]      = useState(initBook)
+ const [start,     setStart]     = useState(initStart)
+ const [end,       setEnd]       = useState(initEnd)
+ const [accountId, setAccountId] = useState<string | undefined>(initAccountId)
```

### `loadedBooks` lazy initializer (replace `new Set()`)

```diff
- const [loadedBooks, setLoadedBooks] = useState<Set<string>>(new Set())
+ const [loadedBooks, setLoadedBooks] = useState<Set<string>>(() => {
+   if (!initStart || !initEnd) return new Set()
+   if (initBook === 'gl' && !initAccountId) return new Set()
+   return new Set([initBook])
+ })
```

**Auto-generate condition:**
- `initStart` and `initEnd` are both non-empty, AND
- if `initBook === 'gl'`, `initAccountId` is also non-empty

When the condition passes, the component mounts with `loadedBooks = Set { book }`, rendering `BIRBookTable` immediately. When it fails, `loadedBooks` is empty and the component behaves exactly as before.

---

## Page wrappers

No changes required. All three page wrappers already have `<Suspense>` (needed for `useSearchParams`):

- `frontend/src/app/client/reports/bir/page.tsx`
- `frontend/src/app/accountant/reports/bir/page.tsx`
- `frontend/src/app/admin/reports/bir/page.tsx`

---

## Files Changed

| File | Change |
|---|---|
| `frontend/src/components/reports/BIRBooksView.tsx` | Add `useSearchParams`, initialize state from URL params, lazy-init `loadedBooks` for auto-generate |

## Out of Scope

- Changes to any page wrappers.
- Changes to the client modal navigation — it already passes the correct params.
- Default date pre-fill when no params are present (accountant/admin direct nav).
- Any changes to `BIRBookTable`, `BIREmptyState`, or `ExportPDFButton`.
