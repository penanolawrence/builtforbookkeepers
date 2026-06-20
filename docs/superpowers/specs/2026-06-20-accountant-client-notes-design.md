# Accountant Client Notes — Design Spec
**Date:** 2026-06-20
**Status:** Approved

## Overview

Add a "Notes" tab to the `ClientDetailModal` that is visible only to accountants and admins. The accountant writes freeform standing context about the client's business. That text is stored on the `companies` table and injected into the AI system prompt on every classification job for that client — alongside the client's per-document note.

## Data Layer

### Migration
Add a nullable `TEXT` column `accountant_notes` to the `companies` table.

```sql
ALTER TABLE companies ADD COLUMN accountant_notes TEXT NULL;
```

### Model
Add `accountant_notes` to `Company::$fillable`.

## Backend API

Two endpoints, added to both the accountant and admin route groups:

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/accountant/clients/{id}/notes` | `role:accountant` | Returns `{ notes: string\|null }` |
| `PATCH` | `/accountant/clients/{id}/notes` | `role:accountant` | Saves `{ notes: string }` |
| `GET` | `/admin/clients/{id}/notes` | `role:admin` | Same response shape |
| `PATCH` | `/admin/clients/{id}/notes` | `role:admin` | Same payload |

Both GET endpoints return the current `accountant_notes` value (or `null`). Both PATCH endpoints validate `notes` as a nullable string (max 5000 chars) and save it to `companies.accountant_notes`.

Authorization: accountant endpoints verify `company->accountant_id === auth()->id()`. Admin endpoints have no additional scope check beyond the role middleware (matching existing admin patterns).

The GET and PATCH can be implemented as two methods on the existing `Accountant\ClientController` and `Admin\ClientController` — no new controller needed.

## AI Integration

### `TransactionClassifier::classify()`
Add a `?string $accountantNote = null` parameter. If non-empty, append a dedicated block to the **system prompt** (not the user message):

```
Client Context (set by accountant):
"<accountant_notes text>"
Use this as standing background about the client's business when classifying any document.
```

This is separate from the per-document `$userNote`, which stays in the user message. The two are distinct: accountant notes = persistent client context; user note = per-document clarification from the client.

### `ClassifyWithAI::handle()`
After loading `$company`, pass `$company->accountant_notes` as the new `$accountantNote` argument to `$classifier->classify(...)`.

## Frontend

### `ClientDetailModal.tsx`

**Tab type:** Add `'notes'` to the `Tab` union type.

**Tab visibility:** The `tabs` array is built conditionally — the Notes tab is only included when `role === 'accountant' || role === 'admin'`:

```ts
const tabs = [
  { id: 'overview',   label: 'Overview' },
  { id: 'submit',     label: 'Submit & Review' },
  { id: 'documents',  label: 'Documents' },
  { id: 'merchants',  label: 'Merchants' },
  { id: 'coa',        label: 'Chart of Accounts' },
  ...(role === 'accountant' || role === 'admin'
    ? [{ id: 'notes' as Tab, label: 'Notes' }]
    : []),
]
```

**`NotesTab` component** (co-located in the same file):
- On mount: fetches notes via `GET /accountant/clients/{id}/notes` (or admin equivalent) using `useQuery`
- Renders a `<textarea>` with the current notes value
- Save button triggers `PATCH` via `useMutation`; shows `saving…` while pending
- On success: shows "Last saved [time]" below the textarea (state updated from mutation response timestamp)
- No auto-save — explicit save only

### API functions

Add to `frontend/src/lib/api/accountant/clients.ts`:
```ts
export async function getClientNotes(id: string): Promise<{ notes: string | null }>
export async function saveClientNotes(id: string, notes: string): Promise<void>
```

Mirror the same two functions in `frontend/src/lib/api/admin/clients.ts`, pointing to `/admin/clients/{id}/notes`.

In `ClientDetailModal`, the correct get/save functions are selected by `role`, the same pattern used for merchants.

## Data Flow

```
Accountant writes notes → PATCH /accountant/clients/{id}/notes
→ companies.accountant_notes saved

On document upload:
ClassifyWithAI::handle()
  → loads $company (already fetched)
  → passes $company->accountant_notes to TransactionClassifier::classify()
  → classifier appends it to system prompt
  → AI classifies with: chart of accounts + accountant notes + client doc note
```

## Constraints

- Notes are capped at 5000 characters (validated on backend, enforced via `maxLength` on the textarea)
- The Notes tab is invisible to clients — it never appears in their view
- Admin can read and edit notes (same endpoints, different route prefix)
- No versioning or history — last save wins
