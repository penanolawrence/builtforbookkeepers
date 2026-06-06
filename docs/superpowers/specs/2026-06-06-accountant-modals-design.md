# Accountant Modals Design

**Date:** 2026-06-06
**Status:** Approved

## Overview

Replace the two route navigations on `/admin/accountants` with in-page modals:

1. Clicking an accountant row currently navigates to `/admin/accountants/[id]` → becomes a **detail modal**
2. Clicking "Invite Accountant" currently navigates to `/admin/accountants/create` → becomes an **invite modal**

The old route pages are deleted after the modals are in place.

## Component

**`src/components/admin/AccountantModal.tsx`**

A single component with a discriminated `mode` prop:

```ts
type Props =
  | { mode: 'detail'; accountantId: string; onClose: () => void }
  | { mode: 'invite'; onClose: () => void }
```

### Detail mode

- Large modal (`max-w-4xl`)
- Header: initials avatar + name + status chip + close `×` button
- Body: two-column layout
  - Left: info card (name, email, mobile — disabled inputs matching current detail page)
  - Right sidebar: status card, workload stats (clients / open RED / pending), actions (send password reset, deactivate)
- Below two columns: full-width assigned clients table (business name, plan, status, open RED, view button)
- Deactivate confirmation renders as a layered overlay on top of the detail modal (same pattern as the existing deactivate modal in the detail page)
- Data fetched internally via `useQuery(['admin-accountant', accountantId], () => getAccountant(accountantId))`
- On deactivate success: invalidate `['accountants']` and close the modal

### Invite mode

- Small modal (`max-w-sm`)
- Name + email fields, validated with zod (same schema as current create page: name required, email valid)
- Submit calls `createAccountant({ name, email })`
- On success: shows inline confirmation "Invite sent to `{email}`" with a close button — no navigation
- On error: inline error message below form

## State in `page.tsx`

```ts
const [modal, setModal] = useState<
  | { mode: 'detail'; accountantId: string }
  | { mode: 'invite' }
  | null
>(null)
```

- Non-pending row click → `setModal({ mode: 'detail', accountantId: a.id })`
- "Invite Accountant" button click → `setModal({ mode: 'invite' })`
- `onClose` → `setModal(null)`

The existing deactivate modal already on `page.tsx` (in the Actions column) is unchanged — it handles quick deactivation without opening the detail modal first.

## Route Cleanup

Delete the following files and their parent directories if empty:

- `frontend/src/app/admin/accountants/[id]/page.tsx` (and `[id]/` directory)
- `frontend/src/app/admin/accountants/create/page.tsx` (and `create/` directory)

## Data

No new API endpoints required. Existing functions are reused:

- `getAccountant(id)` — detail data (name, email, mobile, status, clientCount, redCount, pendingEntries, assignedClients)
- `getAccountants()` — used for replacement accountant dropdown in deactivate flow
- `createAccountant({ name, email })` — invite
- `resetAccountantPassword(id)` — send password reset
- `deactivateAccountant(id, replacementId?)` — deactivate with optional client transfer

## Error Handling

- Detail modal: if `getAccountant` returns null/404, show "Accountant not found." message inside modal body
- Invite modal: server error shown inline below form fields
- Deactivate: error shown inline in deactivate overlay (same as current behavior)
