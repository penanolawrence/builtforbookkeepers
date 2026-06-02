# BIR Books URL Param Auto-Generate Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `BIRBooksView` reads `start`, `end`, `book`, and `accountId` from URL search params on mount and auto-generates the report when all required params are present.

**Architecture:** Add `useSearchParams()` inside `BIRBooksView`. Derive four `init*` constants from the params, use them as initial values for the matching state variables, and provide `loadedBooks` a lazy initializer that pre-adds the book to the set when the auto-generate condition is met. No page wrapper changes needed — all three already have `<Suspense>`.

**Tech Stack:** Next.js 14 App Router, React, TypeScript. `useSearchParams` from `next/navigation`.

---

## File Map

| File | Change |
|---|---|
| `frontend/src/components/reports/BIRBooksView.tsx` | Add `useSearchParams`, init state from params, lazy-init `loadedBooks` |

---

### Task 1: Initialize state from URL params and auto-generate

**Files:**
- Modify: `frontend/src/components/reports/BIRBooksView.tsx`

- [ ] **Step 1: Add `useSearchParams` to the import**

  In `frontend/src/components/reports/BIRBooksView.tsx`, the first line is:

  ```typescript
  import { useState, useEffect } from 'react'
  ```

  Add `useSearchParams` from `next/navigation` below the React import (keep existing imports intact):

  ```typescript
  import { useState, useEffect } from 'react'
  import { useSearchParams } from 'next/navigation'
  ```

- [ ] **Step 2: Read URL params at the top of the component body**

  Inside `BIRBooksView`, immediately before the existing state declarations, add:

  ```typescript
  const searchParams = useSearchParams()

  const initStart     = searchParams.get('start')     ?? ''
  const initEnd       = searchParams.get('end')       ?? ''
  const initBook      = searchParams.get('book')      ?? 'crb'
  const initAccountId = searchParams.get('accountId') ?? undefined
  ```

- [ ] **Step 3: Replace hardcoded state defaults with the init constants**

  Replace these four existing `useState` declarations:

  ```typescript
  const [book,      setBook]      = useState('crb')
  const [start,     setStart]     = useState('')
  const [end,       setEnd]       = useState('')
  const [accountId, setAccountId] = useState<string | undefined>()
  ```

  With:

  ```typescript
  const [book,      setBook]      = useState(initBook)
  const [start,     setStart]     = useState(initStart)
  const [end,       setEnd]       = useState(initEnd)
  const [accountId, setAccountId] = useState<string | undefined>(initAccountId)
  ```

- [ ] **Step 4: Replace the `loadedBooks` initializer with a lazy one**

  Replace:

  ```typescript
  const [loadedBooks, setLoadedBooks] = useState<Set<string>>(new Set())
  ```

  With:

  ```typescript
  const [loadedBooks, setLoadedBooks] = useState<Set<string>>(() => {
    if (!initStart || !initEnd) return new Set()
    if (initBook === 'gl' && !initAccountId) return new Set()
    return new Set([initBook])
  })
  ```

  **Logic:**
  - If either date is missing → empty set (no auto-generate)
  - If book is GL and no account → empty set (incomplete, can't generate)
  - Otherwise → set containing the book (auto-generates on mount)

- [ ] **Step 5: Run TypeScript type check**

  ```bash
  cd frontend && npx tsc --noEmit
  ```

  Expected: no errors. If there are errors related to `useSearchParams` returning `string | null`, confirm `?? ''` and `?? undefined` are present on all four reads.

- [ ] **Step 6: Verify manually**

  Start the dev server if not already running:
  ```bash
  cd frontend && npm run dev
  ```

  **Test 1 — Client modal flow (non-GL):**
  1. Log in as a client user
  2. Go to Reports → click "BIR Books"
  3. Set From/To dates, select CRB, click "View Book →"
  4. Expected: BIR books page loads with dates pre-filled, CRB tab active, and the CRB table renders immediately (no empty state, no manual "View Book" click needed)

  **Test 2 — Client modal flow (GL):**
  1. Same as above but select GL and pick an account
  2. Expected: BIR books page loads with GL tab active, account pre-selected, table renders immediately

  **Test 3 — No params (direct nav):**
  1. Navigate directly to `/client/reports/bir` (no query string)
  2. Expected: page loads with empty dates, CRB tab active, empty state shown — behavior unchanged

  **Test 4 — GL without accountId param:**
  1. Navigate to `/client/reports/bir?start=2026-01-01&end=2026-12-31&book=gl` (no accountId)
  2. Expected: GL tab active, dates pre-filled, account selector empty, empty state shown (no auto-generate)

- [ ] **Step 7: Commit**

  ```bash
  cd frontend && git add src/components/reports/BIRBooksView.tsx
  git commit -m "feat: auto-generate BIR book from URL params on mount"
  ```

  Then update the submodule pointer from the repo root:

  ```bash
  cd .. && git add frontend
  git commit -m "chore: update frontend submodule to BIR books URL param auto-generate"
  ```
