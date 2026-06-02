# New Adjusting Entry Modal Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the `/adjusting-entries/new` page navigation with a large modal dialog that opens directly on the list page for both admin and accountant portals.

**Architecture:** A shared `NewEntryModal` component wraps `EntryForm` in a `Dialog`. It manages client selection and account fetching internally. Both list pages swap `router.push('/new')` for modal state. The `/new` pages are deleted. `EntryForm` gains an optional `onCancel` prop and the button label changes to "Approve only".

**Tech Stack:** Next.js 14 App Router, React, react-query, shadcn/ui Dialog, react-hook-form

---

## File Map

| File | Change |
|---|---|
| `frontend/src/components/adjusting-entries/EntryForm.tsx` | Add `onCancel?` prop, rename button label |
| `frontend/src/components/adjusting-entries/NewEntryModal.tsx` | **Create** — modal wrapper with client selector + EntryForm |
| `frontend/src/app/accountant/adjusting-entries/page.tsx` | Add modal state, render `<NewEntryModal>`, remove `/new` navigation |
| `frontend/src/app/admin/adjusting-entries/page.tsx` | Same, with `isAdmin` |
| `frontend/src/app/accountant/adjusting-entries/new/page.tsx` | **Delete** |
| `frontend/src/app/admin/adjusting-entries/new/page.tsx` | **Delete** |

---

### Task 1: Update `EntryForm` — add `onCancel` prop and rename button

**Files:**
- Modify: `frontend/src/components/adjusting-entries/EntryForm.tsx`

- [ ] **Step 1: Add `onCancel` to the Props interface**

The current Props interface is around line 37. Replace it with:

```typescript
interface Props {
  companyId?: string
  initialData?: AdjustingEntry
  onSave: (data: FormValues) => Promise<void>
  onCancel?: () => void
  accounts: Account[]
  clients?: { id: string; name: string }[]
}
```

Update the function signature (line 46) to destructure `onCancel`:

```typescript
export function EntryForm({ companyId, initialData, onSave, onCancel, accounts, clients }: Props) {
```

- [ ] **Step 2: Replace the button area**

Find the current `<div className="flex gap-2 flex-wrap">` block at the bottom of the return (currently contains a single "Approve Immediately" button). Replace the entire block with:

```tsx
<div className="flex gap-2 flex-wrap">
  {onCancel && (
    <button
      type="button"
      onClick={onCancel}
      className="border border-gray-200 text-gray-700 text-xs font-semibold px-4 py-2 rounded-md hover:bg-gray-50 transition-colors"
    >
      Cancel
    </button>
  )}
  <button
    type="button"
    disabled={isSubmitting}
    onClick={handleSubmit((v) => submit(v))}
    className="bg-green-600 text-white text-xs font-semibold px-4 py-2 rounded-md hover:bg-green-700 transition-colors disabled:opacity-50"
  >
    Approve only
  </button>
</div>
```

- [ ] **Step 3: Verify TypeScript compiles**

Run from `frontend/`:
```bash
npx tsc --noEmit 2>&1 | grep -v "EntryForm.tsx"
```

Expected: no new errors (only the 2 pre-existing zodResolver errors in `EntryForm.tsx` are acceptable).

- [ ] **Step 4: Commit**

```bash
git add src/components/adjusting-entries/EntryForm.tsx
git commit -m "feat: add onCancel prop to EntryForm and rename button to Approve only"
```

---

### Task 2: Create `NewEntryModal`

**Files:**
- Create: `frontend/src/components/adjusting-entries/NewEntryModal.tsx`

- [ ] **Step 1: Create the file with the full implementation**

```tsx
'use client'

import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { createEntry, submitEntry } from '@/lib/api/adjusting-entries'
import { getAccounts } from '@/lib/api/accounts'
import { getClients } from '@/lib/api/admin/clients'
import { getAccountantClients } from '@/lib/api/accountant/clients'
import { EntryForm } from './EntryForm'
import { useToast } from '@/hooks/use-toast'

interface Props {
  open: boolean
  onClose: () => void
  isAdmin?: boolean
}

export function NewEntryModal({ open, onClose, isAdmin }: Props) {
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const [selectedClientId, setSelectedClientId] = useState<string | undefined>()

  const { data: clientsData } = useQuery({
    queryKey: isAdmin ? ['admin-clients', {}] : ['accountant-clients'],
    queryFn: isAdmin ? () => getClients() : () => getAccountantClients(),
    enabled: open,
  })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const clients: { id: string; name: string }[] = isAdmin
    ? ((clientsData as any)?.data ?? []).map((c: any) => ({ id: c.id, name: c.name })) // eslint-disable-line @typescript-eslint/no-explicit-any
    : ((clientsData as any[]) ?? []).map((c: any) => ({ id: c.id, name: c.name })) // eslint-disable-line @typescript-eslint/no-explicit-any

  const { data: accounts } = useQuery({
    queryKey: ['accounts', selectedClientId],
    queryFn: () => getAccounts(selectedClientId),
    enabled: !!selectedClientId,
  })

  const handleOpenChange = (o: boolean) => {
    if (!o) {
      setSelectedClientId(undefined)
      onClose()
    }
  }

  const onSave = async (data: any) => { // eslint-disable-line @typescript-eslint/no-explicit-any
    const { entryId } = await createEntry({
      companyId: data.companyId,
      date:      data.date,
      memo:      data.memo,
      type:      data.type,
      lines:     data.lines.map((l: any) => ({ // eslint-disable-line @typescript-eslint/no-explicit-any
        accountId:   l.accountId,
        subtypeId:   l.subtypeId ?? null,
        debit:       l.debit,
        credit:      l.credit,
        description: l.description ?? null,
      })),
    })
    await submitEntry(entryId, true)
    toast({ title: 'Entry approved.' })
    queryClient.invalidateQueries({ queryKey: ['adjusting-entries'] })
    setSelectedClientId(undefined)
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <h2 className="text-sm font-bold text-gray-900 mb-4">New Adjusting Entry</h2>

        <div className="mb-4">
          <label className="text-[10px] font-bold uppercase tracking-wide text-gray-500 mb-1.5 block">
            Client
          </label>
          <select
            value={selectedClientId ?? ''}
            onChange={(e) => setSelectedClientId(e.target.value || undefined)}
            className="w-full border border-gray-200 rounded px-2 py-1.5 text-sm"
          >
            <option value="">Select client…</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>

        {selectedClientId && (
          <EntryForm
            key={selectedClientId}
            companyId={selectedClientId}
            onSave={onSave}
            onCancel={() => { setSelectedClientId(undefined); onClose() }}
            accounts={accounts ?? []}
          />
        )}
      </DialogContent>
    </Dialog>
  )
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run from `frontend/`:
```bash
npx tsc --noEmit 2>&1 | grep -v "EntryForm.tsx"
```

Expected: no errors (only the 2 pre-existing zodResolver errors in `EntryForm.tsx` remain).

- [ ] **Step 3: Commit**

```bash
git add src/components/adjusting-entries/NewEntryModal.tsx
git commit -m "feat: create NewEntryModal for adjusting entries"
```

---

### Task 3: Update accountant list page

**Files:**
- Modify: `frontend/src/app/accountant/adjusting-entries/page.tsx`

Current file for reference — key parts to change:

```typescript
// Current imports (line 1-11)
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { getEntries } from '@/lib/api/adjusting-entries'
...
import { useRouter } from 'next/navigation'

// Current button (line 53-58)
<button
  onClick={() => router.push('/accountant/adjusting-entries/new')}
  className="..."
>
  + New Entry
</button>
```

- [ ] **Step 1: Add `NewEntryModal` import**

Add this import after the existing imports at the top of the file:

```typescript
import { NewEntryModal } from '@/components/adjusting-entries/NewEntryModal'
```

- [ ] **Step 2: Add modal state**

Inside `AccountantAdjustingEntriesPage`, after the existing `useState` calls, add:

```typescript
const [newEntryOpen, setNewEntryOpen] = useState(false)
```

- [ ] **Step 3: Change the "+ New Entry" button**

Replace `onClick={() => router.push('/accountant/adjusting-entries/new')}` with:

```typescript
onClick={() => setNewEntryOpen(true)}
```

- [ ] **Step 4: Add modal to JSX**

Before the final closing `</div>` of the return, add:

```tsx
<NewEntryModal open={newEntryOpen} onClose={() => setNewEntryOpen(false)} />
```

- [ ] **Step 5: Verify TypeScript compiles**

Run from `frontend/`:
```bash
npx tsc --noEmit 2>&1 | grep -v "EntryForm.tsx"
```

Expected: no new errors.

- [ ] **Step 6: Commit**

```bash
git add src/app/accountant/adjusting-entries/page.tsx
git commit -m "feat: open new adjusting entry as modal on accountant list page"
```

---

### Task 4: Update admin list page

**Files:**
- Modify: `frontend/src/app/admin/adjusting-entries/page.tsx`

Current file for reference — key parts to change:

```typescript
// Current imports (line 1-8)
import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
...

// Current button (line 81-86)
<button
  onClick={() => router.push('/admin/adjusting-entries/new')}
  className="..."
>
  + New Entry
</button>
```

- [ ] **Step 1: Add `NewEntryModal` import**

Add after the existing imports:

```typescript
import { NewEntryModal } from '@/components/adjusting-entries/NewEntryModal'
```

- [ ] **Step 2: Add modal state**

Inside `AdminAdjustingEntriesPage`, after the existing `useState` calls, add:

```typescript
const [newEntryOpen, setNewEntryOpen] = useState(false)
```

- [ ] **Step 3: Change the "+ New Entry" button**

Replace `onClick={() => router.push('/admin/adjusting-entries/new')}` with:

```typescript
onClick={() => setNewEntryOpen(true)}
```

- [ ] **Step 4: Add modal to JSX**

Before the final closing `</div>` of the return, add:

```tsx
<NewEntryModal open={newEntryOpen} onClose={() => setNewEntryOpen(false)} isAdmin />
```

- [ ] **Step 5: Verify TypeScript compiles**

Run from `frontend/`:
```bash
npx tsc --noEmit 2>&1 | grep -v "EntryForm.tsx"
```

Expected: no new errors.

- [ ] **Step 6: Commit**

```bash
git add src/app/admin/adjusting-entries/page.tsx
git commit -m "feat: open new adjusting entry as modal on admin list page"
```

---

### Task 5: Delete `/new` pages

**Files:**
- Delete: `frontend/src/app/accountant/adjusting-entries/new/page.tsx`
- Delete: `frontend/src/app/admin/adjusting-entries/new/page.tsx`

- [ ] **Step 1: Delete both files and commit**

Run from `frontend/`:
```bash
git rm src/app/accountant/adjusting-entries/new/page.tsx
git rm src/app/admin/adjusting-entries/new/page.tsx
git commit -m "chore: remove new entry pages replaced by modal"
```

- [ ] **Step 2: Verify TypeScript compiles clean**

```bash
npx tsc --noEmit 2>&1 | grep -v "EntryForm.tsx"
```

Expected: zero output (no errors except the 2 pre-existing zodResolver ones).

---

### Task 6: Manual verification

**Files:** None — observation only.

- [ ] **Step 1: Start the dev server**

From `frontend/`:
```bash
npm run dev
```

- [ ] **Step 2: Verify accountant modal**

Navigate to `/accountant/adjusting-entries`.

Check:
- "+ New Entry" button opens a modal (not navigates away)
- Modal shows "New Adjusting Entry" heading
- Client `<select>` is present
- Selecting a client reveals the form (Entry Details + Journal Lines cards)
- Account column shows a native `<select>` dropdown with accounts listed as `code — name`
- Buttons at bottom: "Cancel" (gray outline) + "Approve only" (green)
- "Cancel" closes the modal
- Submitting a balanced entry closes the modal, shows "Entry approved." toast, and the list refreshes

- [ ] **Step 3: Verify admin modal**

Navigate to `/admin/adjusting-entries`.

Check same points as above — modal should behave identically.

- [ ] **Step 4: Verify account select dropdown works**

In a journal line row, click the Account select. Verify the dropdown opens and shows accounts formatted as `code — name`. Select one and verify it sticks.

- [ ] **Step 5: Verify balance check**

Enter mismatched debit/credit totals and click "Approve only". Expected: toast "Entry is not balanced. Total debits must equal total credits." — modal stays open.
