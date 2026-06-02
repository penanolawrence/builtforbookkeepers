# Adjusting Entry Form Simplification Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove the Save as Draft button, replace Submit to Admin with a single Approve Immediately button, and replace the custom AccountSelect combobox with a native `<select>` in each journal line row.

**Architecture:** All changes are frontend-only and confined to `EntryForm.tsx`, `EntryLineRow.tsx`, and the three pages that consume `EntryForm`. `AccountSelect.tsx` is deleted. The `onSave` prop loses its `asDraft: boolean` parameter — pages always take the approve path.

**Tech Stack:** Next.js 14 App Router, React Hook Form, Zod, TypeScript

---

## File Map

| File | Change |
|---|---|
| `frontend/src/components/adjusting-entries/EntryForm.tsx` | Remove Draft/Submit buttons; Approve Immediately always shown; remove `isAdmin` prop; simplify `onSave` signature and `submit()` helper |
| `frontend/src/components/adjusting-entries/EntryLineRow.tsx` | Replace `<AccountSelect>` with native `<select>`; remove import |
| `frontend/src/components/adjusting-entries/AccountSelect.tsx` | **Delete** |
| `frontend/src/app/accountant/adjusting-entries/new/page.tsx` | Simplify `onSave` — remove `asDraft` param, always call `submitEntry(entryId, true)` |
| `frontend/src/app/admin/adjusting-entries/new/page.tsx` | Same; remove `isAdmin` from `<EntryForm>` |
| `frontend/src/app/admin/adjusting-entries/[id]/page.tsx` | Same; remove `isAdmin` from `<EntryForm>` |

---

### Task 1: Simplify `EntryForm.tsx`

**Files:**
- Modify: `frontend/src/components/adjusting-entries/EntryForm.tsx`

- [ ] **Step 1: Update the Props interface — remove `isAdmin`, simplify `onSave` signature**

Replace the current `Props` interface (lines 37–44):

```typescript
interface Props {
  companyId?: string
  initialData?: AdjustingEntry
  onSave: (data: FormValues) => Promise<void>
  accounts: Account[]
  clients?: { id: string; name: string }[]
}
```

Update the function signature to match (remove `isAdmin` from destructuring):

```typescript
export function EntryForm({ companyId, initialData, onSave, accounts, clients }: Props) {
```

- [ ] **Step 2: Simplify the internal `submit()` helper**

Replace the current `submit` function (lines 91–97):

```typescript
const submit = async (values: FormValues) => {
  if (!checkBalance()) {
    toast({ title: 'Entry is not balanced. Total debits must equal total credits.', variant: 'destructive' })
    return
  }
  await onSave({ ...values, selfApprove: true } as FormValues)
}
```

- [ ] **Step 3: Replace the three action buttons with one**

Replace the entire `<div className="flex gap-2 flex-wrap">` block (lines 200–227) with:

```tsx
<div className="flex gap-2 flex-wrap">
  <button
    type="button"
    disabled={isSubmitting}
    onClick={handleSubmit((v) => submit(v))}
    className="bg-green-600 text-white text-xs font-semibold px-4 py-2 rounded-md hover:bg-green-700 transition-colors disabled:opacity-50"
  >
    Approve Immediately
  </button>
</div>
```

- [ ] **Step 4: Verify TypeScript compiles**

Run from `frontend/`:
```bash
npx tsc --noEmit
```

Expected: errors about the `onSave` call sites in the three pages (they still pass `asDraft`). This is expected — fix in Tasks 3–5.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/adjusting-entries/EntryForm.tsx
git commit -m "feat: replace draft/submit buttons with single approve immediately button"
```

---

### Task 2: Replace AccountSelect with native `<select>` in `EntryLineRow.tsx`

**Files:**
- Modify: `frontend/src/components/adjusting-entries/EntryLineRow.tsx`
- Delete: `frontend/src/components/adjusting-entries/AccountSelect.tsx`

- [ ] **Step 1: Replace the `AccountSelect` import and usage**

Remove the import line:
```typescript
import { AccountSelect } from './AccountSelect'
```

Replace the `<div className="w-44 shrink-0">` block that wraps `<AccountSelect>` (lines 24–35):

```tsx
<div className="w-44 shrink-0">
  <Controller
    control={control}
    name={`lines.${index}.accountId`}
    render={({ field }) => (
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
    )}
  />
</div>
```

- [ ] **Step 2: Delete `AccountSelect.tsx`**

```bash
rm frontend/src/components/adjusting-entries/AccountSelect.tsx
```

- [ ] **Step 3: Verify TypeScript compiles**

Run from `frontend/`:
```bash
npx tsc --noEmit
```

Expected: only the page-level `onSave` arity errors remain (from Task 1).

- [ ] **Step 4: Commit**

```bash
git add frontend/src/components/adjusting-entries/EntryLineRow.tsx
git rm frontend/src/components/adjusting-entries/AccountSelect.tsx
git commit -m "feat: replace AccountSelect combobox with native select in journal line rows"
```

---

### Task 3: Simplify accountant new entry page

**Files:**
- Modify: `frontend/src/app/accountant/adjusting-entries/new/page.tsx`

- [ ] **Step 1: Replace `onSave` — remove `asDraft`, always approve**

Replace the current `onSave` function (lines 34–55):

```typescript
const onSave = async (data: any) => { // eslint-disable-line @typescript-eslint/no-explicit-any
  const { entryId } = await createEntry({
    companyId: data.companyId,
    date: data.date,
    memo: data.memo,
    type: data.type,
    lines: data.lines.map((l: any) => ({ // eslint-disable-line @typescript-eslint/no-explicit-any
      accountId:   l.accountId,
      subtypeId:   l.subtypeId ?? null,
      debit:       l.debit,
      credit:      l.credit,
      description: l.description ?? null,
    })),
  })
  await submitEntry(entryId, true)
  toast({ title: 'Entry approved.' })
  router.push(`/accountant/adjusting-entries/${entryId}`)
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run from `frontend/`:
```bash
npx tsc --noEmit
```

Expected: fewer errors — the accountant page error should be gone.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/app/accountant/adjusting-entries/new/page.tsx
git commit -m "feat: simplify accountant new entry onSave to always approve immediately"
```

---

### Task 4: Simplify admin new entry page

**Files:**
- Modify: `frontend/src/app/admin/adjusting-entries/new/page.tsx`

- [ ] **Step 1: Replace `onSave` — remove `asDraft` and `selfApprove` branching, always approve**

Replace the current `onSave` function (lines 31–56):

```typescript
const onSave = async (data: any) => { // eslint-disable-line @typescript-eslint/no-explicit-any
  const { entryId } = await createEntry({
    companyId: data.companyId,
    date:      data.date,
    memo:      data.memo,
    type:      data.type,
    lines:     data.lines.map((l: any) => ({ // eslint-disable-line @typescript-eslint/no-explicit-any
      accountId:   l.accountId,
      subtypeId:   l.subtypeId ?? null,
      debit:       l.debit,
      credit:      l.credit,
      description: l.description ?? null,
    })),
  })
  await submitEntry(entryId, true)
  toast({ title: 'Entry approved.' })
  router.push(`/admin/adjusting-entries/${entryId}`)
}
```

- [ ] **Step 2: Remove `isAdmin` prop from `<EntryForm>`**

Find the `<EntryForm>` JSX (around line 83) and remove the `isAdmin` prop:

```tsx
<EntryForm
  key={selectedCompanyId}
  companyId={selectedCompanyId}
  onSave={onSave}
  accounts={accounts ?? []}
  clients={clients}
/>
```

- [ ] **Step 3: Verify TypeScript compiles**

Run from `frontend/`:
```bash
npx tsc --noEmit
```

Expected: only the admin `[id]` page error remains.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/app/admin/adjusting-entries/new/page.tsx
git commit -m "feat: simplify admin new entry onSave to always approve immediately"
```

---

### Task 5: Simplify admin entry detail page

**Files:**
- Modify: `frontend/src/app/admin/adjusting-entries/[id]/page.tsx`

- [ ] **Step 1: Replace `onSave` — remove `asDraft` and `selfApprove` branching, always approve**

Replace the current `onSave` function (lines 111–131):

```typescript
const onSave = async (data: any) => { // eslint-disable-line @typescript-eslint/no-explicit-any
  await updateEntry(id, {
    date: data.date,
    memo: data.memo,
    type: data.type,
    lines: data.lines,
  })
  await submitEntry(id, true)
  toast({ title: 'Entry approved.' })
  router.push('/admin/adjusting-entries')
}
```

- [ ] **Step 2: Remove `isAdmin` prop from `<EntryForm>`**

Find the `<EntryForm>` JSX in the `entry.status === 'DRAFT'` block (around line 193) and remove the `isAdmin` prop:

```tsx
<EntryForm
  companyId={entry.companyId}
  initialData={entry}
  onSave={onSave}
  accounts={accounts ?? []}
/>
```

- [ ] **Step 3: Final TypeScript compile — must be clean**

Run from `frontend/`:
```bash
npx tsc --noEmit
```

Expected: **zero errors**.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/app/admin/adjusting-entries/[id]/page.tsx
git commit -m "feat: simplify admin entry detail onSave to always approve immediately"
```

---

### Task 6: Manual verification

**Files:** None — observation only.

- [ ] **Step 1: Start the dev server**

From `frontend/`:
```bash
npm run dev
```

- [ ] **Step 2: Verify accountant new entry form**

Navigate to `/accountant/adjusting-entries/new`.

Check:
- Account column in each journal line shows a native `<select>` dropdown (not a text search input)
- Only one action button is visible: **Approve Immediately** (green)
- No "Save as Draft" or "Submit to Admin" buttons

- [ ] **Step 3: Verify admin new entry form**

Navigate to `/admin/adjusting-entries/new`, select a client.

Check:
- Account column shows native `<select>` dropdown
- Only **Approve Immediately** button (green)

- [ ] **Step 4: Verify unbalanced entry is blocked**

Fill in two lines with mismatched debit/credit totals and click Approve Immediately.

Expected: toast error "Entry is not balanced. Total debits must equal total credits." — form does not submit.

- [ ] **Step 5: Verify balanced entry submits**

Fill a valid balanced entry and click Approve Immediately.

Expected: redirected to entry detail or list, toast "Entry approved."
