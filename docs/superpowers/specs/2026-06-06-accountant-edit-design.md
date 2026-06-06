# Accountant Edit Design

**Date:** 2026-06-06
**Status:** Approved

## Overview

Two related changes to the accountant admin UI:

1. **Detail modal — editable info card**: The name, email, and mobile fields in `AccountantModal` (detail mode) become editable, with a "Save Changes" button that persists changes via a new `PUT /admin/accountants/{id}` API endpoint.

2. **Invite modal — add phone field**: A third optional "Phone / Mobile" field is added to the invite form so admins can record a mobile number when inviting a new accountant.

## Detail Modal — Editable Info Card

### UI

- Remove `disabled` from the name, email, and mobile inputs in the info card.
- Manage the form with `react-hook-form`, pre-populated from the fetched accountant data (via `useQuery(['admin-accountant', accountantId])`).
- A "Save Changes" button sits at the bottom of the info card.
- On success: invalidate `['admin-accountant', accountantId]` + show toast "Changes saved."
- On error: inline error message below the Save button ("Failed to save changes. Please try again.").
- The mobile input is **always rendered** (not conditionally on `accountant.mobile`) so admins can add a number even when none exists.

### Validation (frontend, zod)

| Field  | Rule |
|--------|------|
| name   | required string |
| email  | required, valid email format |
| mobile | optional string |

### API call

`PUT /admin/accountants/{id}` with body `{ name, email, mobile }`.

## Invite Modal — Add Phone Field

- Add an optional "Phone / Mobile" input field below email in `InviteMode`.
- Schema: `mobile: z.string().optional()`
- Passed to `createAccountant({ name, email, mobile })`.

## Backend

### New route

```php
Route::put('/admin/accountants/{id}', [Admin\AccountantController::class, 'update']);
```

Add to `backend/routes/api.php` alongside the existing accountant routes.

### New controller method: `AccountantController@update`

```php
public function update(Request $request, string $id): JsonResponse
{
    $accountant = User::where('role', 'accountant')->findOrFail($id);

    $validated = $request->validate([
        'name'   => 'required|string|max:255',
        'email'  => 'required|email|unique:users,email,' . $id,
        'mobile' => 'nullable|string|max:50',
    ]);

    $accountant->update($validated);

    return response()->json([
        'id'     => $accountant->id,
        'name'   => $accountant->name,
        'email'  => $accountant->email,
        'mobile' => $accountant->mobile,
    ]);
}
```

Validation rules:
- `name`: required, string, max 255
- `email`: required, valid email, unique in `users` table ignoring the current user's own ID
- `mobile`: nullable, string, max 50

### Update `store` method to accept mobile

Add `'mobile' => 'nullable|string|max:50'` to `CreateAccountantRequest` validation and pass `mobile` during `User::create`.

## Frontend API Layer

**`frontend/src/lib/api/admin/accountants.ts`**

Add:
```ts
export async function updateAccountant(
  id: string,
  data: { name: string; email: string; mobile?: string | null }
): Promise<{ id: string; name: string; email: string; mobile: string | null }>
{
  const { data: result } = await api.put(`/admin/accountants/${id}`, data)
  return result
}
```

Update `createAccountant` signature to accept optional mobile:
```ts
export async function createAccountant(data: {
  name: string
  email: string
  mobile?: string
}): Promise<{ userId: string }>
```

## Files Changed

| File | Change |
|------|--------|
| `backend/routes/api.php` | Add `PUT /admin/accountants/{id}` route |
| `backend/app/Http/Controllers/Admin/AccountantController.php` | Add `update` method; update `store` to accept mobile |
| `backend/app/Http/Requests/Admin/CreateAccountantRequest.php` | Add mobile field |
| `frontend/src/lib/api/admin/accountants.ts` | Add `updateAccountant`; update `createAccountant` signature |
| `frontend/src/components/admin/AccountantModal.tsx` | Detail mode: editable inputs + Save Changes; Invite mode: add mobile field |

## Error Handling

- Save Changes: server error shown inline below the button; `react-hook-form` shows field-level validation errors
- Invite: existing error state handles mobile field like other fields (optional, no extra error case)
- 422 from backend (e.g. duplicate email): surface as inline error on the email field if possible, otherwise generic inline error
