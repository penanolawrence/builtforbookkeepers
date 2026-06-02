# Adjusting Entry Form Simplification — Design Spec

**Date:** 2026-06-02
**Status:** Approved

## Problem

The adjusting entry form has three buttons ("Save as Draft", "Submit to Admin", "Approve Immediately") and a custom searchable `AccountSelect` combobox. The draft/submit split adds unnecessary workflow complexity. The search combobox is being replaced with a plain native select.

## Solution

1. Remove "Save as Draft" button entirely.
2. Replace "Submit to Admin" with "Approve Immediately" as the sole action button — always shown (no `isAdmin` guard).
3. Replace the custom `AccountSelect` searchable combobox with a native `<select>` in each journal line row.

---

## Section 1 — Button Simplification

### `EntryForm.tsx`

**Before (action area):**
```
[Save as Draft]  [Submit to Admin]  [Approve Immediately — admin only]
```

**After:**
```
[Approve Immediately]
```

- Remove the "Save as Draft" `<button>` and its `handleSubmit((v) => submit(v, true))` handler.
- Remove the "Submit to Admin" `<button>`.
- Remove the `isAdmin &&` guard from Approve Immediately — it is always rendered.
- Remove the `asDraft` parameter from the `onSave` prop:
  ```typescript
  // Before
  onSave: (data: FormValues, asDraft: boolean) => Promise<void>
  // After
  onSave: (data: FormValues) => Promise<void>
  ```
- The `submit()` internal helper always calls `onSave` with `selfApprove: true` and no draft path. Simplify to:
  ```typescript
  const submit = async (values: FormValues) => {
    if (!checkBalance()) {
      toast({ title: 'Entry is not balanced. Total debits must equal total credits.', variant: 'destructive' })
      return
    }
    await onSave({ ...values, selfApprove: true } as FormValues)
  }
  ```
- Remove `isAdmin` from the `Props` interface.

### Pages

All three pages that use `EntryForm` currently branch on `asDraft` in their `onSave` handler. With draft removed, simplify each to always take the approve path.

**`frontend/src/app/accountant/adjusting-entries/new/page.tsx`**

```typescript
// Before
const onSave = async (data: any, asDraft: boolean) => {
  if (!asDraft) { /* submit */ }
  else { /* draft */ }
}
// After
const onSave = async (data: any) => {
  // always submit/approve path
}
```

**`frontend/src/app/admin/adjusting-entries/new/page.tsx`** — same pattern.

**`frontend/src/app/admin/adjusting-entries/[id]/page.tsx`** — same pattern.

---

## Section 2 — Account Field

### `EntryLineRow.tsx`

Replace `<AccountSelect>` with a native `<select>` element inside the `Controller` render prop.

```tsx
// Before
<AccountSelect
  value={field.value ?? ''}
  accounts={accounts}
  onChange={field.onChange}
/>

// After
<select
  value={field.value ?? ''}
  onChange={(e) => field.onChange(e.target.value)}
  className="w-full border border-gray-200 rounded px-2 py-1 text-xs"
>
  <option value="">Select account…</option>
  {accounts.map((a) => (
    <option key={a.id} value={a.id}>{a.code} — {a.name}</option>
  ))}
</select>
```

The wrapping `<div className="w-44 shrink-0">` stays unchanged.

Remove the `import { AccountSelect }` import from `EntryLineRow.tsx`.

### `AccountSelect.tsx`

Delete `frontend/src/components/adjusting-entries/AccountSelect.tsx` — it has no remaining consumers.

---

## Files Changed

| File | Change |
|---|---|
| `frontend/src/components/adjusting-entries/EntryForm.tsx` | Remove Draft/Submit buttons; Approve Immediately always shown; simplify `onSave` prop and `submit()` helper; remove `isAdmin` prop |
| `frontend/src/components/adjusting-entries/EntryLineRow.tsx` | Replace `<AccountSelect>` with native `<select>`; remove `AccountSelect` import |
| `frontend/src/components/adjusting-entries/AccountSelect.tsx` | **Delete** |
| `frontend/src/app/accountant/adjusting-entries/new/page.tsx` | Simplify `onSave` — remove `asDraft` param and draft branch |
| `frontend/src/app/admin/adjusting-entries/new/page.tsx` | Same |
| `frontend/src/app/admin/adjusting-entries/[id]/page.tsx` | Same |

## Out of Scope

- Backend changes — no status or workflow logic changes on the server side.
- `BalanceIndicator` — no changes.
- `SubtypeCombobox` — no changes.
- Accountant `[id]` detail page — no adjusting entry detail view exists for accountants yet.
