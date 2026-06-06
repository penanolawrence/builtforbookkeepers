# Client Modals Design

**Date:** 2026-06-06
**Status:** Approved

## Overview

Replace the two route navigations on `/admin/clients` with in-page modals:

1. Clicking a client row currently navigates to `/admin/clients/[id]` → becomes a **detail modal**
2. Clicking "New Client" currently navigates to `/admin/clients/create` → becomes a **create modal**

The old route pages are deleted after the modals are in place.

## Component

**`src/components/admin/ClientModal.tsx`**

A single component with a discriminated `mode` prop, mirroring `AccountantModal`:

```ts
type ClientModalProps =
  | { mode: 'create'; onClose: () => void }
  | { mode: 'detail'; clientId: string; onClose: () => void }
```

Two internal sub-components — `CreateMode` and `DetailMode` — with a single `ClientModal` wrapper exported at the bottom.

### Create mode

- Small modal (`max-w-lg`)
- Fields: Business Name, Mobile, TIN, Email, Contact Person, Plan select, VAT Type select, Accountant select
- Same zod schema as current `create/page.tsx`: businessName required, mobile required, planType enum, birType enum, accountantId required, tin optional, email optional valid email, contactPerson optional
- On submit: calls `createClient(data)`
- On success: inline "Client created!" state showing username + invite link with copy button + "Create Another" button (resets form) + "View Client Profile" button (switches modal to `detail` mode for the new `companyId` — no navigation)
- On error: inline error below form

### Detail mode

- Large modal (`max-w-5xl`, `max-h-[90vh]` with scrollable body)
- Header: business name + status chip + close `×` button
- Three tabs: **Overview · Documents · COA**
- Data fetched internally via `useQuery(['admin-client', clientId], () => getClient(clientId))`

#### Overview tab

Two-column layout:

**Left — profile + plan form:**
- Fields: Business Name, Mobile, Email, Contact Person, TIN (all editable), Username (readonly)
- Below profile fields: Plan select, VAT Type select (merged from `[id]/edit/page.tsx`)
- Warning banner (amber) shown when `updatePlan` returns a `warning` value
- A single "Save Changes" button that saves profile fields and plan/VAT together via `updateClient` and `updatePlan` (two calls, or combined if API supports it)

**Right sidebar:**
- Status card: status chip + plan + VAT type
- Accountant card: assigned accountant name + "Reassign" button (opens `AssignAccountantModal`)
- Billing card: last payment info + "Receive Payment" button (opens `ReceivePaymentModal`)
- Quick Actions card (hidden when INACTIVE):
  - "Mark as Overdue" (ACTIVE only)
  - "Suspend Client" / "Reactivate Client" toggle
  - "Reset Access Link" — shows generated link inline with copy button
  - "Deactivate Client" (red, with `confirm()` guard)

#### Documents tab

Identical to current `[id]/page.tsx` documents tab:
- Filter bar: status select, type select, date range inputs
- Document table: Filename, Type, Amount, Merchant, Uploaded, Status
- Row click navigates to `/admin/queue/[doc.id]`

#### COA tab

Identical to current `[id]/page.tsx` COA tab:
- Collapsible sections: Income, Expense, Cash, VAT
- Income and Expense accounts are editable (add/remove/rename)
- Cash and VAT are system-managed (read-only, lock icon)
- "Save Chart of Accounts" button at bottom

#### Layered modals inside detail

- `AssignAccountantModal` renders over the detail modal (`z-[60]`) when Reassign is clicked
- `ReceivePaymentModal` renders over the detail modal (`z-[60]`) when Receive Payment is clicked
- Both already exist as standalone components and are unchanged

## State in `page.tsx`

```ts
const [modal, setModal] = useState<
  | { mode: 'create' }
  | { mode: 'detail'; clientId: string }
  | null
>(null)
```

- "New Client" button click → `setModal({ mode: 'create' })`
- Row click → `setModal({ mode: 'detail', clientId: c.id })`
- `onClose` → `setModal(null)`
- "View Client Profile" in create success state → `setModal({ mode: 'detail', clientId: newId })`

## Route Cleanup

Delete the following files and their parent directories if empty:

- `frontend/src/app/admin/clients/create/page.tsx` (and `create/` directory)
- `frontend/src/app/admin/clients/[id]/page.tsx`
- `frontend/src/app/admin/clients/[id]/edit/page.tsx` (and `edit/` directory)
- `frontend/src/app/admin/clients/[id]/` directory if empty after deletions

## Data

No new API endpoints required. Existing functions are reused:

- `getClient(id)` — full client detail
- `getClients(params)` — list (unchanged, used by page.tsx)
- `createClient(data)` — create
- `updateClient(id, data)` — save profile fields
- `updatePlan(id, { planType, birType })` — save plan & VAT
- `suspendClient(id)` / `reactivateClient(id)` — suspend toggle
- `markClientOverdue(id)` — mark overdue
- `deactivateClient(id)` — deactivate
- `resetClientAccess(id)` — generate new invite link
- `reassignAccountant(id, accountantId)` — reassign
- `getClientDocumentsAdmin(id, filters)` — documents tab
- `getChartOfAccounts(id)` / `saveChartOfAccounts(id, accounts)` — COA tab
- `getAccountants()` — accountant select (create mode + reassign)

## Error Handling

- Detail modal: if `getClient` returns null/404, show "Client not found." message in modal body
- Create modal: server error shown inline below form
- Plan save warning: amber banner inline in Overview tab (same as current edit page behavior)
- COA save error: shown inline via toast (same as current behavior)
