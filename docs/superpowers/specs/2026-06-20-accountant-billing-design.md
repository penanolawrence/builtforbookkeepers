# Accountant Billing — Design Spec

**Date:** 2026-06-20
**Status:** Approved

## Overview

Extend the existing manual billing system so that admin can record subscription payments from **accountants** as well as clients. Accountants are now a target market paying a flat subscription fee. The `plan` field is retired from the UI entirely — the backend always writes `'starter'` for all new payments.

## Scope

- Extend the `payments` table with a nullable `user_id` FK so a payment belongs to either a company (client) or a user (accountant)
- Add three new API routes for accountant billing under `/admin/billing/accountants`
- Extend the admin billing page with a Clients / Accountants tab strip
- Remove the plan field from the `ReceivePaymentModal` UI
- No self-serve payment flow — all payments are recorded manually by admin

## Data Layer

### Migration

Add a nullable `user_id` column (UUID, FK → `users.id`, `ON DELETE SET NULL`) to the `payments` table. Existing rows are unaffected — their `user_id` remains `NULL`.

A payment row is exclusively one of:
- **Client payment**: `company_id` set, `user_id` NULL
- **Accountant payment**: `user_id` set, `company_id` NULL

The `plan` column stays in the schema but is always written as `'starter'` by the backend. It is no longer accepted from the frontend.

### Payment Model

Add a `user()` `belongsTo User` relationship alongside the existing `company()` relationship.

## Backend API

### Remove plan from request validation

`ReceivePaymentRequest` drops the `plan` rule. Both the existing `receivePayment` and the new `receiveAccountantPayment` controller methods hardcode `plan = 'starter'`.

### New routes (all under `admin` middleware)

| Method | URI | Controller method | Purpose |
|--------|-----|-------------------|---------|
| GET | `/admin/billing/accountants` | `BillingController@accountantIndex` | List all accountant users with last payment |
| GET | `/admin/billing/accountants/{userId}` | `BillingController@accountantPayments` | Payment history for one accountant |
| POST | `/admin/billing/accountants/{userId}` | `BillingController@receiveAccountantPayment` | Record a new accountant payment |

### `accountantIndex`

Queries `users` where `role = 'accountant'`, left-joins with `payments` on `user_id` to get the most recent payment per user. Returns all accountants regardless of whether they have any payments yet.

### `accountantIndex` response shape

```json
[
  {
    "userId": "uuid",
    "name": "Maria Santos",
    "email": "maria@example.com",
    "lastPaymentDate": "2026-05-01",
    "lastPaymentAmount": "999.00"
  }
]
```

### `accountantPayments` / `receiveAccountantPayment`

Same request/response shape as the existing client endpoints (`amount`, `dateReceived`, `referenceNumber`). `plan` is always set to `'starter'` server-side.

## Frontend

### Billing page tabs

A "Clients" / "Accountants" tab strip is added at the top of the table card. Default tab is "Clients". Switching tabs replaces the table body while keeping the summary cards and date-range filter at the top unchanged.

**Clients tab** — existing table, plan column removed from display.

**Accountants tab** — new table with columns: Accountant, Email, Last Payment, Last Amount, action button. Each row has a "Receive Payment" button that opens `ReceivePaymentModal`.

### `ReceivePaymentModal` changes

- Remove the plan field and its label entirely
- Add an optional `userId?: string` prop
- When `userId` is set, calls `receiveAccountantPayment(userId, data)` instead of `receivePayment(clientId, data)`

### New API functions (`frontend/src/lib/api/admin/billing.ts`)

```ts
getAccountantsList(): Promise<AccountantBillingRow[]>
getAccountantPayments(userId: string): Promise<PaymentRecord[]>
receiveAccountantPayment(userId: string, data: ReceivePaymentData): Promise<PaymentRecord>
```

### New type (`frontend/src/types/admin.ts`)

```ts
interface AccountantBillingRow {
  userId: string
  name: string
  email: string
  lastPaymentDate: string | null
  lastPaymentAmount: string | null
}
```

## What Does Not Change

- Client payment history routes (`/admin/billing` and `/admin/billing/{clientId}`)
- Accountant-side and client-side UI — billing is admin-only
- Payment status field — remains `'pending'` by default (existing behaviour)
