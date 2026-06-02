# New Adjusting Entry Modal — Design Spec

**Date:** 2026-06-02
**Status:** Approved

## Problem

The "New Entry" flow for adjusting entries navigates to a separate page (`/adjusting-entries/new`), breaking context. The user wants the form to open as a large modal dialog directly on the list page, matching the pattern used by other modals in the app. The action button label also needs updating to "Approve only".

## Solution

Replace the `/new` page navigation with a shared `NewEntryModal` component used by both the accountant and admin list pages. The modal manages client selection and account fetching internally. On success it closes the modal and refreshes the list. The `/new` pages are deleted.

---

## Section 1 — `NewEntryModal` component

**File:** `frontend/src/components/adjusting-entries/NewEntryModal.tsx`

### Props

```typescript
interface Props {
  open: boolean
  onClose: () => void
  isAdmin?: boolean
}
```

### Behaviour

- Uses `Dialog, DialogContent` from `@/components/ui/dialog` (existing pattern)
- Size: `sm:max-w-2xl`, `overflow-y-auto max-h-[90vh]`
- Manages `selectedClientId: string | undefined` state internally; reset to `undefined` when modal closes (`onOpenChange`)
- Shows a client `<select>` at top of modal body:
  - Admin: fetches via `getClients()` (queryKey `['admin-clients', {}]`), maps `clientsData?.data`
  - Accountant: fetches via `getAccountantClients()` (queryKey `['accountant-clients']`), maps array directly
- Client data mapping (both cases produce `{ id: string; name: string }[]`):
  - Admin: `(clientsData as any)?.data?.map((c: any) => ({ id: c.id, name: c.name })) ?? []`
  - Accountant: `((clientsData as any[]) ?? []).map((c: any) => ({ id: c.id, name: c.name }))`
- Once client selected, fetches accounts: `getAccounts(selectedClientId)` (queryKey `['accounts', selectedClientId]`, `enabled: !!selectedClientId`)
- Renders `<EntryForm key={selectedClientId} companyId={selectedClientId} onSave={onSave} onCancel={onClose} accounts={accounts ?? []} />` only when `selectedClientId` is set
- `onSave` handler:
  ```typescript
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
    onClose()
  }
  ```
- Modal header: `<h2>` "New Adjusting Entry" in `text-sm font-bold text-gray-900`
- Client selector label: `text-[10px] font-bold uppercase tracking-wide text-gray-500`, select styled `w-full border border-gray-200 rounded px-2 py-1.5 text-sm`

### Imports needed

```typescript
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { createEntry, submitEntry } from '@/lib/api/adjusting-entries'
import { getAccounts } from '@/lib/api/accounts'
import { getClients } from '@/lib/api/admin/clients'
import { getAccountantClients } from '@/lib/api/accountant/clients'
import { EntryForm } from './EntryForm'
import { useToast } from '@/hooks/use-toast'
```

---

## Section 2 — `EntryForm` changes

**File:** `frontend/src/components/adjusting-entries/EntryForm.tsx`

### Changes

1. Add `onCancel?: () => void` to `Props` interface and function destructuring.
2. Rename button label: `"Approve Immediately"` → `"Approve only"`.
3. If `onCancel` is provided, render a Cancel button to the left of "Approve only":

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

---

## Section 3 — List page changes

### Accountant list — `frontend/src/app/accountant/adjusting-entries/page.tsx`

- Add `import { NewEntryModal } from '@/components/adjusting-entries/NewEntryModal'`
- Add `const [newEntryOpen, setNewEntryOpen] = useState(false)`
- Replace `onClick={() => router.push('/accountant/adjusting-entries/new')}` with `onClick={() => setNewEntryOpen(true)}`
- Add before closing `</div>`:
  ```tsx
  <NewEntryModal open={newEntryOpen} onClose={() => setNewEntryOpen(false)} />
  ```

### Admin list — `frontend/src/app/admin/adjusting-entries/page.tsx`

- Same pattern, with `isAdmin` prop:
  ```tsx
  <NewEntryModal open={newEntryOpen} onClose={() => setNewEntryOpen(false)} isAdmin />
  ```

---

## Section 4 — Delete new pages

Delete both files:
- `frontend/src/app/accountant/adjusting-entries/new/page.tsx`
- `frontend/src/app/admin/adjusting-entries/new/page.tsx`

These have no remaining consumers once the list pages open the modal instead.

---

## Files Changed

| File | Change |
|---|---|
| `frontend/src/components/adjusting-entries/NewEntryModal.tsx` | **Create** |
| `frontend/src/components/adjusting-entries/EntryForm.tsx` | **Update** — add `onCancel` prop, rename button |
| `frontend/src/app/accountant/adjusting-entries/page.tsx` | **Update** — modal state + `<NewEntryModal>` |
| `frontend/src/app/admin/adjusting-entries/page.tsx` | **Update** — modal state + `<NewEntryModal isAdmin>` |
| `frontend/src/app/accountant/adjusting-entries/new/page.tsx` | **Delete** |
| `frontend/src/app/admin/adjusting-entries/new/page.tsx` | **Delete** |

## Out of Scope

- Admin `[id]` detail page — the DRAFT edit form on this page is unchanged; it does not use the new modal.
- Account dropdown runtime verification — confirmed working in manual testing step of the plan.
- Accountant `[id]` detail page — does not exist yet.
