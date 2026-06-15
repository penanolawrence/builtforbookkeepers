# Spec: Merchants Tab in Client Detail Modal

**Date:** 2026-06-16
**Status:** Approved

## Problem

Merchants (vendors/suppliers linked to client documents) are resolved and stored by the AI classifier but have no UI for the accountant or admin to view or correct them. There's no way to manually add merchants or fix a merchant's name, TIN, or address from the client view.

## Goal

Add a Merchants tab to the shared `ClientDetailModal` for both roles. The tab lists a client's merchants with inline add/edit capability and conditional delete (only if no documents are linked).

## Tab Order

Updated tab order in `ClientDetailModal`:

**Overview · Submit · Documents · Merchants · Chart of Accounts**

Both roles see all tabs including Merchants — no role gating.

## MerchantsTab Layout

### Header
- Section label: uppercase, faint, "Merchants" style (matches COA section labels)
- "Add Merchant" button: top right, dashed border style matching "+ Add Account" in CoaTab

### List Rows (read-only)

Three columns per row:

| Column | Content |
|---|---|
| Name | Merchant name (bold) |
| TIN | TIN or `—` if empty |
| Address | Address or `—` if empty |

Plus two icon buttons on the right:
- **Pencil** — enter edit mode for this row
- **Trash** — only rendered when `documentCount === 0`

Alternating row background (`var(--t-card-alt)` on odd rows), matching CoaTab row style.

### Active Edit Row

Clicking the pencil icon converts Name, TIN, Address into inline inputs (same style as Overview form inputs). The pencil is replaced by:
- **Save** button (primary style, small)
- **X** cancel button

Only one row is editable at a time. Switching to another row cancels unsaved changes on the current row without prompting.

### New Merchant Row

Clicking "Add Merchant" prepends an empty editable row at the top of the list with the same three inputs + Save + X. On save, calls POST; on success collapses the row and the new merchant appears in the list. X dismisses without saving.

### Empty State

Centered, faint text: "No merchants yet." with the Add Merchant button below it.

## Backend API

Four endpoints, mirroring the existing admin/accountant role split:

| Method | Admin route | Accountant route | Purpose |
|---|---|---|---|
| GET | `/api/admin/clients/{id}/merchants` | `/api/accountant/clients/{id}/merchants` | List merchants with documentCount |
| POST | `/api/admin/clients/{id}/merchants` | `/api/accountant/clients/{id}/merchants` | Create merchant |
| PUT | `/api/admin/merchants/{id}` | `/api/accountant/merchants/{id}` | Update merchant |
| DELETE | `/api/admin/merchants/{id}` | `/api/accountant/merchants/{id}` | Delete (422 if has docs) |

### Response Shape (per merchant)

```json
{ "id": "...", "name": "...", "tin": "...", "address": "...", "documentCount": 3 }
```

### Validation

- `name`: required string
- `tin`: optional string
- `address`: optional string

### Delete Guard

Server-side: query `documents` count for the merchant before deleting. Return `422` with message `"Cannot delete a merchant with linked documents."` if count > 0.

## Frontend API Layer

New functions added to both API files:

```ts
// admin/clients.ts and accountant/clients.ts
getMerchants(clientId: string): Promise<Merchant[]>
createMerchant(clientId: string, data: { name: string; tin?: string; address?: string }): Promise<Merchant>
updateMerchant(merchantId: string, data: { name: string; tin?: string; address?: string }): Promise<Merchant>
deleteMerchant(merchantId: string): Promise<void>
```

`MerchantsTab` receives a `role` prop and selects the right API set internally, matching the `DocumentsTab` `queryFn` pattern.

React Query key: `['client-merchants', clientId]` — invalidated on create, update, and delete.

## Types

A local `Merchant` interface defined at the top of `ClientDetailModal.tsx` alongside existing local types — no new types file needed:

```ts
interface Merchant {
  id: string
  name: string
  tin: string | null
  address: string | null
  documentCount: number
}
```

## Error Handling & Toasts

- **Save (create/update):** success → `toast({ title: 'Merchant saved.' })`, error → destructive toast with `response.data.message` fallback
- **Delete:** success → `toast({ title: 'Merchant deleted.' })`, 422 → `toast({ title: 'Cannot delete — merchant has linked documents.', variant: 'destructive' })`
- No optimistic UI — wait for server response before updating list (consistent with COA save)

## Files Changed

| File | Change |
|---|---|
| `frontend/src/components/clients/ClientDetailModal.tsx` | Add `MerchantsTab` component, add `'merchants'` to `Tab` type and tabs array, reorder tabs |
| `frontend/src/lib/api/admin/clients.ts` | Add `getMerchants`, `createMerchant`, `updateMerchant`, `deleteMerchant` |
| `frontend/src/lib/api/accountant/clients.ts` | Add same 4 merchant API functions |
| `backend/app/Http/Controllers/Admin/ClientController.php` | Add `merchants`, `storeMerchant`, `updateMerchant`, `destroyMerchant` methods |
| `backend/app/Http/Controllers/Accountant/ClientController.php` | Add same 4 methods |
| `backend/routes/api.php` | Register 4 routes per role (8 total) |

## Out of Scope

- New migrations — `merchants` table already exists
- Merchant creation during AI classification — unchanged
- Merging duplicate merchants
- Searching or filtering the merchant list
