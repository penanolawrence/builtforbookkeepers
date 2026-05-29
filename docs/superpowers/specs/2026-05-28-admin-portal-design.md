# Step 5.6 — Admin Portal Design

**Date:** 2026-05-28
**Project:** Sofia Books (Philippine SME Bookkeeping SaaS)
**Working directory:** `c:\sofia-books\frontend\src\`

---

## Overview

Builds the full admin portal for Sofia Books. Admins manage clients, accountants, billing, approve adjusting entries, and have visibility across all queues and reports. All shared components from Steps 5.4 and 5.5 are reused without modification.

---

## Architecture

### New files (net-new)

**API helper:**
- `lib/api/admin/dashboard.ts` — `getDashboard(): Promise<{ accountants: Accountant[]; openRedItems: number }>` calling `GET /admin/dashboard`

**Layout:**
- `components/layout/AdminSidebar.tsx` — desktop-only sidebar, 8 nav links: Dashboard, Clients, Accountants, Billing, Queue, Adjusting Entries, Reports, Settings

**Admin components (`components/admin/`):**
- `ClientStatusBadge.tsx` — ACTIVE=green, OVERDUE=yellow, SUSPENDED=orange, INACTIVE=gray; tooltip on SUSPENDED ("temporary, reversible") and INACTIVE ("permanent, cannot reactivate")
- `ClientTable.tsx` — table with search + status + accountant filters, pagination; `onRowClick` prop
- `AccountantWorkloadCard.tsx` — name, client count, RED/YELLOW/GREEN queue badges, pending entries count; click → `/admin/accountants/{id}`
- `AssignAccountantModal.tsx` — fetches all accountants for dropdown; reassign button calls `reassignAccountant`
- `SuspendClientModal.tsx` — warns "Client will immediately lose login access"; shows Reactivate option if already SUSPENDED
- `DeactivateClientModal.tsx` — PERMANENT warning; requires typing client name to enable confirm button
- `ReceivePaymentModal.tsx` — react-hook-form: amount, dateReceived, referenceNumber; calls `receivePayment`
- `BillingRecordRow.tsx` — one `<tr>`: Date | Amount | Ref No. | Client (optional)

**Admin layout:**
- `app/(admin)/layout.tsx` — role guard (admin only), AdminSidebar + Topbar

**Admin pages (15 pages):**

| Route | Purpose |
|---|---|
| `app/(admin)/dashboard/page.tsx` | Workload cards + open RED stat |
| `app/(admin)/clients/page.tsx` | ClientTable + [Create Client] |
| `app/(admin)/clients/create/page.tsx` | Create form → success screen with username + invite link |
| `app/(admin)/clients/[id]/page.tsx` | 3 tabs: Overview, Documents, Chart of Accounts |
| `app/(admin)/clients/[id]/edit/page.tsx` | Plan + VAT type only; warning on birType change |
| `app/(admin)/accountants/page.tsx` | Accountant table + [Create Accountant] |
| `app/(admin)/accountants/create/page.tsx` | Name + email form |
| `app/(admin)/accountants/[id]/page.tsx` | Workload stats + deactivate flow with replacement modal |
| `app/(admin)/billing/page.tsx` | All payments with client + date filters |
| `app/(admin)/billing/[clientId]/page.tsx` | Per-client payment history + [Receive Payment] |
| `app/(admin)/queue/page.tsx` | QueueTable (all clients) |
| `app/(admin)/queue/[id]/page.tsx` | ReviewPanel |
| `app/(admin)/adjusting-entries/page.tsx` | All entries; default PENDING; [New Entry] with isAdmin=true |
| `app/(admin)/adjusting-entries/new/page.tsx` | EntryForm isAdmin=true + selfApprove flow |
| `app/(admin)/adjusting-entries/[id]/page.tsx` | PENDING: [Approve]+[Reject]; DRAFT: EntryForm isAdmin=true |
| `app/(admin)/reports/page.tsx` | ReportClientSelector (all clients) |
| `app/(admin)/reports/[clientId]/income-statement/page.tsx` | Reuse shared pattern |
| `app/(admin)/reports/[clientId]/expense-breakdown/page.tsx` | Reuse shared pattern |
| `app/(admin)/reports/[clientId]/bir/[book]/page.tsx` | Reuse shared pattern |
| `app/(admin)/settings/page.tsx` | Full Name, Email, Mobile |

### Existing files reused (no modification)

- `components/queue/QueueTable` — pass `reviewBasePath="/admin/queue"` and `clients={allClients}`
- `components/queue/ReviewPanel` — pass `backUrl="/admin/queue"`
- `components/adjusting-entries/EntryForm` — pass `isAdmin={true}` to enable [Approve Immediately]
- `components/adjusting-entries/EntryStatusBadge`
- `components/reports/*` — all shared; pass `clientId` as prop
- `components/documents/DocumentCard`, `StatusBadge`
- `components/shared/ConfirmModal`, `EmptyState`
- `components/layout/Topbar`, `NotificationBell`
- `lib/api/admin/clients.ts`, `accountants.ts`, `billing.ts` — already exist

---

## Data Flow

### Dashboard
`GET /admin/dashboard` → `{ accountants: Accountant[], openRedItems: number }` → AccountantWorkloadCards grid + open RED stat card

### Client management
- List: `getClients({ search, status, accountantId })` with URL-synced filters
- Create: form → `createClient()` → success screen (username + inviteLink)
- Detail (`[id]`): `getClient(id)` → 3 tabs
  - Overview: inline-editable fields + action buttons (suspend/reactivate/overdue/deactivate/reset-access) + AssignAccountantModal + ReceivePaymentModal
  - Documents: `getClientDocumentsAdmin(id)` with filters
  - COA: `getChartOfAccounts(id)` → grouped by type; system-managed = read-only; `saveChartOfAccounts` on save

### Accountant management
- List: `getAccountants()`
- Detail: `getAccountant(id)` (includes `assignedClients`, `pendingEntries`)
- Deactivate: if has clients → replacement modal → `deactivateAccountant(id, replacementId)`; if no clients → confirm → `deactivateAccountant(id)`

### Queue
- Uses same `useApprovalQueue` hook as accountant
- `getClients()` provides all-clients list for filter dropdown (vs. `getAccountantClients()` for accountant portal)

### Adjusting entries
- `getEntries()` — admin sees all; default filter: `status=PENDING`
- PENDING detail: [Approve] → `approveEntry(id)`; [Reject] → inline reason → `rejectEntry(id, reason)`
- DRAFT (admin-created): EntryForm with `isAdmin=true`; [Approve Immediately] calls `submitEntry(id, true)`
- New entry: `createEntry()` then `submitEntry(id, true)` if selfApprove

### Reports
- Identical structure to `app/(accountant)/reports/` subtree
- `ReportClientSelector` with `role="admin"` already fetches all clients

---

## Key Constraints

- All interactive components need `'use client'`
- Dynamic route params use `use(params)` pattern
- `useQuery` uses object form (TanStack Query v5)
- `searchParams` usage wrapped in `<Suspense>`
- DeactivateClientModal: confirm button disabled until typed name matches `clientName`
- COA: `isSystemManaged === true` rows render read-only (no input, no delete)
- Billing amounts formatted with `formatCurrency`

---

## Verification

```bash
docker exec sofia-frontend npx tsc --noEmit
```
Must return zero errors.
