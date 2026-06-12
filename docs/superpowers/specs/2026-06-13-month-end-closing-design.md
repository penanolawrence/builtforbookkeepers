# Month-End Closing — Design Spec
**Date:** 2026-06-13
**Status:** Approved

---

## Overview

A new Month-End Closing page available to accountant and admin roles. It allows closing a client's income and expense accounts into Income Summary on a per-client, per-month basis. Months must be closed sequentially — a month cannot be closed until all prior months are closed. The closing is permanent; corrections go through adjusting entries in the next open period.

---

## Decisions Made

| Decision | Choice | Reason |
|---|---|---|
| Closing scope | Income + expense → Income Summary only | Equity is managed separately by the firm |
| Reopening | Not allowed | Permanent close; corrections via AJEs in next period |
| Pre-close: documents | Hard block | All documents must be `approved` before closing |
| Pre-close: adjusting entries | Hard block | All AJEs must be `posted` before closing |
| First closeable month | Derived from earliest income/expense JE date for the client | No manual setup needed |

---

## Data Model

### New table: `period_closings`

| Column | Type | Notes |
|---|---|---|
| `id` | uuid | Primary key |
| `client_id` | FK → clients | |
| `period_year` | smallint | e.g. 2025 |
| `period_month` | tinyint | 1–12 |
| `closed_by` | FK → users | The accountant or admin who confirmed |
| `closed_at` | timestamp | |
| `journal_entry_id` | FK → journal_entries | The generated closing journal entry |

**Constraints:**
- Unique on `(client_id, period_year, period_month)` — prevents double-close
- No `status` column — presence of a row means the period is closed
- `journal_entry_id` stores the ID of the first closing JE (income → Income Summary); the expense JE shares the same `closing_id` reference. Implementation may use a pivot table `closing_journal_entries` if needed.

### Journal entry lock

After closing, no new journal entries may be posted with a matching `(client_id, period_year, period_month)`. Enforced at the application layer on JE creation.

---

## Business Rules

### Month status (computed, not stored)

| Status | Condition |
|---|---|
| **Closed** | A `period_closings` row exists for `(client, year, month)` |
| **Ready** | Prior month closed (or first month) AND all docs whose transaction date falls within the calendar month are `approved` AND all AJEs `posted` |
| **Blocked** | Prior month closed, but pending docs or unposted AJEs exist |
| **Future** | Prior month not yet closed |

### First closeable month

Derived by querying the earliest journal entry date (income or expense type) for the client. No manual configuration required.

### Closing rules

- Roles allowed: `accountant` (assigned to client only), `admin` (any client)
- Closing posts two journal entries atomically in a DB transaction:
  1. **Dr** all income accounts → **Cr** Income Summary (total income for the period)
  2. **Dr** Income Summary → **Cr** all expense accounts (total expenses for the period)
- If net income/expense is zero for the period, closing is still allowed — a zero-balance entry is posted as a record that the period was reviewed
- Server-side validation re-checks all pre-close conditions at POST time — the frontend checklist is UX only, not the authority

---

## API Endpoints

All endpoints require authentication. Admin can access any client; accountants are scoped to their assigned clients.

```
GET  /api/period-closings
     ?accountant_id=   (admin only)
     ?status=ready|blocked|closed
     ?search=
     Returns: list of clients with last closed period, next closeable period, and computed status

GET  /api/period-closings/{clientId}
     Returns: ordered array of month objects from first closeable month to current month,
              each with status, document counts, AJE counts

GET  /api/period-closings/{clientId}/{year}/{month}/preview
     Returns: the two closing journal entries (accounts, amounts) that would be posted

POST /api/period-closings/{clientId}/{year}/{month}
     Validates pre-close conditions server-side, posts closing JEs in a transaction,
     creates period_closings record, locks the period
     Returns: 201 with the new period_closing record, or 422 with validation errors
```

---

## Frontend

### Pages

```
/admin/month-end       → MonthEndPage  (showAccountantFilter=true)
/accountant/month-end  → MonthEndPage  (showAccountantFilter=false)
```

A "Month-End" nav link is added to `ADMIN_LINKS` and `ACCOUNTANT_LINKS` in `Topbar.tsx`.

### Components

| Component | File | Responsibility |
|---|---|---|
| `MonthEndPage` | `components/month-end/MonthEndPage.tsx` | Page shell, filter state, client list query |
| `ClientClosingRow` | `components/month-end/ClientClosingRow.tsx` | Table row + expand/collapse month timeline |
| `MonthPill` | `components/month-end/MonthPill.tsx` | Individual month pill with status colour |
| `PeriodClosePanel` | `components/month-end/PeriodClosePanel.tsx` | Side panel — checklist, JE preview, confirm |

### Filter bar

- **Client search** — text input, filters client list client-side
- **Status filter** — All / Ready / Blocked / Up to date (select or tab group)
- **Accountant filter** — dropdown listing all accountants; visible on admin view only (`showAccountantFilter` prop)

### MonthEndPage layout (Approach A — client-first)

1. Page header with title and subtitle
2. Filter bar (search + status + accountant if admin)
3. Table: Client | Last Closed | Next Period | Status | Chevron
4. Click a row → expands inline to show `MonthPill` timeline
5. Click a Ready pill → opens `PeriodClosePanel` as a right-side panel

### PeriodClosePanel

Shows three sections:

1. **Pre-close checklist** — three items with pass/fail icons:
   - Prior months closed (up to `{lastClosedPeriod}`)
   - All documents reviewed (`{n}` of `{n}`)
   - All adjusting entries posted (`{n}` of `{n}`)

2. **Closing entries preview** — loaded via the preview endpoint when the panel opens:
   - Group 1: Dr income accounts → Cr Income Summary
   - Group 2: Dr Income Summary → Cr expense accounts
   - Net income summary line

3. **Permanent-action warning** — plain text noting the action cannot be undone and corrections must go through AJEs in the next period

**Confirm button** is active only when all three checklist items pass. On confirm:
- Fires `POST /api/period-closings/{clientId}/{year}/{month}`
- Optimistically updates the row to Closed state
- On success: closes panel, shows success toast
- On error: reverts optimistic update, shows destructive toast with server message

---

## Error Handling

| Scenario | Behaviour |
|---|---|
| Pending docs detected at POST time | 422 — toast: "X documents are still pending review" |
| Unposted AJEs at POST time | 422 — toast: "X adjusting entries are not yet posted" |
| Prior month not closed at POST time | 422 — toast: "Prior month must be closed first" |
| Double-submit (race condition) | DB unique constraint returns 409 — toast: "This period is already closed" |
| Network error | Revert optimistic update — toast: "Something went wrong. Please try again." |

---

## Out of Scope

- Reopening a closed period
- Closing Income Summary to Retained Earnings (equity step)
- Batch close across multiple clients at once
- Mobile layout (desktop-first, same as existing queue pages)
