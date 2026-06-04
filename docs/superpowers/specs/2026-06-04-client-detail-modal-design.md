# Client Detail Modal — Design Spec

**Date:** 2026-06-04
**Status:** Approved

---

## Problem

Clicking a client row on `/accountant/clients` currently navigates to `/accountant/clients/:id` (a separate page). The accountant needs quick access to client info, documents, and chart of accounts without leaving the clients list.

---

## Solution

Replace the row navigation with a large modal containing three tabs: Overview, Documents, and Chart of Accounts. The modal opens when any client row is clicked and closes via the ✕ button or clicking the backdrop.

---

## Modal Structure

### Header (always visible)
- Client avatar icon (primary gradient)
- Client name in Bricolage 800 / 20px
- Plan + Active status chip + VAT chip
- ✕ close button

### Tab Bar
Three tabs: **Overview** · **Documents** · **Chart of Accounts**
Active tab: `t-primary` color + 2.5px bottom border. Inactive: `t-muted`.

---

## Tab 1 — Overview

**Layout:** two-column grid (`1fr 300px`), 24px gap, 24px padding.

### Left — Client Info (read-only)
A card with alternating row backgrounds (`transparent` / `t-card-alt`), one row per field:

| Field | Value source |
|---|---|
| Business Name | `company.name` |
| Mobile | `company.mobile` |
| Email | `company.email` |
| Contact Person | `company.contactPerson` |
| TIN | `company.tin` |
| Username | `client.username` |
| Plan | `company.plan + " · " + company.birType` |

Each row: label column (160px, 12px / 700 / faint / uppercase) + value column (13.5px / 600 / ink).

### Right — Sidebar
Four cards stacked with 14px gap:

1. **Account Status** — Active/Inactive/Suspended chip + plan·VAT label + last login date
2. **Review Queue** — RED / YEL / GRN tier badges in a 3-column flex row
3. **Assigned Accountant** — name + email (read-only)
4. **Quick Actions** — single button: "Reset Access Link" (ghost style, link icon, calls `POST /admin/clients/{id}/reset-access`)

Data source: `GET /accountant/clients/{id}` (already returns all required fields).

---

## Tab 2 — Documents

Identical layout to `/client/documents` filter bar + table, scoped to this client via `GET /accountant/clients/{id}/documents`.

### Filter bar
**Row 1** (grid 2-col): Status select with ✕ | Type select with ✕
**Row 2** (grid 2-col): Start date input | End date input

Default dates: last 7 days (same `lastSevenDayRange()` helper from `utils.ts`).
On mount: if no date params set, apply defaults.

### Table
`sb-table` style. Columns: Reference · Type chip · Amount · Merchant · Uploaded · Status chip

No pagination for now — show all results (matching existing documents page behaviour).

Data source: `GET /accountant/clients/{id}/documents?status=&type=&start=&end=`

---

## Tab 3 — Chart of Accounts

### Sections (all collapsed on first load)
1. **Income Accounts** — editable, `+ Add Account` button
2. **Expense Accounts** — editable, `+ Add Account` button
3. **Cash / Payment Accounts** — read-only, labelled "System managed"
4. **VAT Accounts** — read-only, labelled "System managed · VAT clients only" (shown for VAT clients only)

### Section header
Chevron (rotates on expand) · section title · account count badge · hint label (system) or Add button (editable).

### Editable rows
`code` (read-only, faint) · `name` (editable input) · ✕ remove button
Remove is blocked if account has transactions (backend returns 422 — show toast).

### System-managed rows
`code` · `name` (read-only text) · 🔒 icon

### Save button
Full-width-right `PUT /admin/clients/{id}/accounts` call. Shows success toast on save.

Data sources:
- `GET /admin/clients/{id}/accounts` — load COA
- `PUT /admin/clients/{id}/accounts` — save changes

---

## Row Click Behaviour Change

In `frontend/src/app/accountant/clients/page.tsx`:
- Remove `router.push(\`/accountant/clients/${c.id}\`)` from row `onClick`
- Replace with `setSelectedClient(c)` (local state)
- Render `<ClientDetailModal>` when `selectedClient !== null`

---

## Files

| File | Action |
|---|---|
| `frontend/src/components/accountant/ClientDetailModal.tsx` | Create — modal with 3 tabs |
| `frontend/src/app/accountant/clients/page.tsx` | Modify — open modal on row click |
| `frontend/src/lib/api/accountant/clients.ts` | Modify — add `getClientDetail` and `getClientDocuments` calls if not present; add `resetAccessLink` |
| `frontend/src/lib/api/coa.ts` | Create — `getCoA(clientId)` and `saveCoA(clientId, accounts)` |

---

## Success Criteria

- Clicking any client row opens the modal; clicking backdrop or ✕ closes it
- Overview tab shows all fields read-only, Reset Access Link button calls the endpoint and shows a toast
- Documents tab auto-filters to the selected client, filter bar matches app style (2-row grid, per-select ✕, last-7-days default)
- COA tab loads sections collapsed; sections expand on click; editable accounts can be renamed/removed/added; Save calls the API and shows toast
- Both Sofia and Yoda themes render correctly
- No regression on the existing My Clients table
