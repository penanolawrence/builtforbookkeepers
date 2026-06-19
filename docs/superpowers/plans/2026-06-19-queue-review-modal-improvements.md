# Queue Review Modal Improvements — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix three bugs in the document review flow (AI VAT recomputation, wrong VAT account on expense docs, EWT account invisible in dropdown) and add account-type-based line grouping with a live net cash summary.

**Architecture:** Two-file change. Backend: update the AI classifier system prompt so it distinguishes explicit-VAT invoices from embedded-VAT receipts and strengthens the Input VAT rule for expense docs. Frontend: expand the account filter to include liability accounts, add approval validation, replace the flat line list with primary/counter grouping driven by account type at render time, and render a live cash summary derived from line amounts.

**Tech Stack:** Laravel 11 (PHP), Next.js 14 App Router, TypeScript, React Testing Library, Jest, TanStack Query

## Global Constraints

- Do not touch any file not listed in the File Map below.
- `QueueReviewModal.tsx` existing `data-testid` attributes (`expense-lines-section`, `income-lines-section`, `receipt-viewer`, `receipt-lightbox`) must be preserved — existing tests assert on them.
- No new API endpoints, no schema changes, no new components — all changes are within the two target files.
- Frontend tests run with: `cd frontend && npx jest --testPathPattern=QueueReviewModal`
- Backend tests run with: `cd backend && php artisan test`

---

## File Map

**Modified:**
- `backend/app/Services/AI/TransactionClassifier.php` — VAT prompt rule (Fix 1) + Input VAT emphasis (Fix 2)
- `frontend/src/components/queue/QueueReviewModal.tsx` — account filter, AccountSelect disabled+hasError, approval validation, line grouping, cash summary
- `frontend/src/components/queue/__tests__/QueueReviewModal.test.tsx` — new tests for validation, grouping, cash summary

---

## Task 1: Backend — AI Classifier Prompt Fixes

**Files:**
- Modify: `backend/app/Services/AI/TransactionClassifier.php`

**Interfaces:**
- Produces: updated `$systemPrompt` that correctly handles explicit-VAT invoices and always uses 1101 for expense VAT lines

No automated test for prompt text — verify by diffing the output and running the full backend suite to confirm nothing regressed.

- [ ] **Step 1: Replace the VAT rule block**

In `backend/app/Services/AI/TransactionClassifier.php`, find the block starting at `if ($company->bir_type === 'vat') {` (around line 64). Replace the entire inner string with:

```php
if ($company->bir_type === 'vat') {
    $systemPrompt .=
        "- VAT line rule (client is VAT-Registered): when a VAT amount is visible on the document:\n" .
        "  * Always create a SEPARATE line for the VAT amount.\n" .
        "  * For expense documents: assign the VAT line to account code 1101 (Input VAT).\n" .
        "  * For income documents: assign the VAT line to account code 2101 (Output VAT).\n" .
        "  * IMPORTANT — Philippine Sales Invoices are written from the SELLER's perspective and may use the term 'Output VAT'.\n" .
        "    When the document is an EXPENSE in the client's books, that VAT is Input VAT for the buyer.\n" .
        "    Always use account 1101 on expense documents regardless of what the invoice calls the VAT.\n" .
        "  * Determine line amounts using the document structure:\n" .
        "    EXPLICIT-VAT INVOICE: the document shows individual line amounts AND a separately labeled VAT total\n" .
        "    AND Total = sum(line amounts) + VAT. The line amounts are already net — use them as-is.\n" .
        "    Use the printed VAT figure as the VAT line amount.\n" .
        "    Example: invoice shows 'Services ₱20,000', 'VAT ₱3,600', 'Total ₱23,600' →\n" .
        "    net line = ₱20,000 (as-is), VAT line = ₱3,600.\n" .
        "    EMBEDDED-VAT RECEIPT: the document shows only a grand total with no net breakdown.\n" .
        "    Each line's amount = printed AMOUNT column ÷ 1.12. VAT line = total_amount × 12/112.\n" .
        "    Example: receipt AMOUNT shows ₱25.00 → net line = 25.00 ÷ 1.12 = 22.32, VAT = 25.00 × 12/112 = 2.68.\n" .
        "  * sum(lines[].amount) must still equal document.total_amount (the gross total).\n";
```

- [ ] **Step 2: Update the tool schema `amount` field description**

In the same file, inside `buildTool()`, find the `'amount'` property description (around line 324). Replace it with:

```php
'amount' => ['type' => 'number', 'minimum' => 0.01,
             'description' => 'For non-VAT clients: the gross amount. For VAT-registered clients: the net amount for this line. For explicit-VAT invoices (individual line amounts + separate VAT total shown), use the printed line amount as-is. For embedded-VAT receipts (only a grand total shown), divide the printed amount by 1.12. For itemized receipts: use only the AMOUNT column — it is already QTY × UNIT PRICE, so disregard QTY.'],
```

- [ ] **Step 3: Run backend test suite**

```bash
cd backend && php artisan test
```

Expected: all existing tests pass. No new tests for this task.

- [ ] **Step 4: Commit**

```bash
git add backend/app/Services/AI/TransactionClassifier.php
git commit -m "fix: update AI VAT rule to handle explicit-VAT invoices and enforce Input VAT for expense docs"
```

---

## Task 2: Frontend — Account Filter, AccountSelect Disabled + HasError, Approval Validation

**Files:**
- Modify: `frontend/src/components/queue/QueueReviewModal.tsx`
- Modify: `frontend/src/components/queue/__tests__/QueueReviewModal.test.tsx`

**Interfaces:**
- Produces:
  - `AccountSelect` now accepts `disabled?: boolean` and `hasError?: boolean`
  - `LineRow` now accepts `disabled?: boolean`
  - `expenseAccounts` / `incomeAccounts` include `type === 'liability'`
  - `hasEmptyAccount: boolean` — true when any line has no `accountId`
  - Approve button: `disabled={submitting || hasEmptyAccount}`

- [ ] **Step 1: Write the failing tests**

Add the following describe block at the bottom of `frontend/src/components/queue/__tests__/QueueReviewModal.test.tsx`:

```typescript
describe('QueueReviewModal — account validation', () => {
  afterEach(() => jest.clearAllMocks())

  it('approve button is disabled when a line has no accountId', () => {
    const { useQuery } = require('@tanstack/react-query')
    ;(useQuery as jest.Mock).mockImplementation(({ queryKey }: { queryKey: unknown[] }) => {
      if (queryKey[0] === 'queue-item') return {
        data: makeItem({
          declaredType: 'expense',
          transactionLines: [{
            id: 'l-empty', type: 'expense', accountId: '', accountCode: '',
            accountName: null, subtypeId: null, subtypeName: null,
            amount: 100, description: 'Test', date: '2026-06-19',
          }],
        }),
        isLoading: false,
      }
      if (queryKey[0] === 'accounts') return { data: [], isLoading: false }
      return { data: undefined, isLoading: false }
    })
    wrap()
    expect(screen.getByText('Approve').closest('button')).toBeDisabled()
  })

  it('approve button is enabled when all lines have accountId', () => {
    const { useQuery } = require('@tanstack/react-query')
    ;(useQuery as jest.Mock).mockImplementation(({ queryKey }: { queryKey: unknown[] }) => {
      if (queryKey[0] === 'queue-item') return {
        data: makeItem({ declaredType: 'expense', transactionLines: [expenseLine] }),
        isLoading: false,
      }
      if (queryKey[0] === 'accounts') return { data: [], isLoading: false }
      return { data: undefined, isLoading: false }
    })
    wrap()
    expect(screen.getByText('Approve').closest('button')).not.toBeDisabled()
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd frontend && npx jest --testPathPattern=QueueReviewModal
```

Expected: `approve button is disabled when a line has no accountId` FAILS (button is not disabled yet).

- [ ] **Step 3: Add `disabled` and `hasError` props to `AccountSelect`**

In `QueueReviewModal.tsx`, find `function AccountSelect(` and update its signature and body:

```typescript
function AccountSelect({
  value,
  accounts,
  onChange,
  disabled,
  hasError,
}: {
  value: string
  accounts: Account[]
  onChange: (accountId: string, accountCode: string) => void
  disabled?: boolean
  hasError?: boolean
}) {
  const [search, setSearch]           = useState('')
  const [open, setOpen]               = useState(false)
  const [dropdownPos, setDropdownPos] = useState<{ top: number; left: number; width: number }>({ top: 0, left: 0, width: 0 })
  const inputRef                      = useRef<HTMLInputElement>(null)

  const selected = accounts.find((a) => a.id === value)
  const filtered = accounts.filter(
    (a) =>
      a.code.toLowerCase().includes(search.toLowerCase()) ||
      a.name.toLowerCase().includes(search.toLowerCase())
  )

  function handleFocus() {
    if (disabled) return
    setOpen(true)
    setSearch('')
    if (inputRef.current) {
      const rect = inputRef.current.getBoundingClientRect()
      setDropdownPos({ top: rect.bottom + 2, left: rect.left, width: rect.width })
    }
  }

  return (
    <div className="relative">
      <input
        ref={inputRef}
        type="text"
        disabled={disabled}
        value={open ? search : selected ? `${selected.code} — ${selected.name}` : ''}
        onFocus={handleFocus}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        onChange={(e) => setSearch(e.target.value)}
        className={`w-full border rounded px-2 py-1 text-xs ${hasError ? 'border-red-400' : 'border-t-line'}`}
        placeholder="Search accounts…"
      />
      {open && filtered.length > 0 && createPortal(
        <ul
          style={{ position: 'fixed', top: dropdownPos.top, left: dropdownPos.left, width: dropdownPos.width, zIndex: 99999, pointerEvents: 'auto' }}
          className="bg-t-card border border-t-line rounded shadow-md max-h-48 overflow-y-auto text-xs"
          onPointerDown={(e) => { e.preventDefault(); e.stopPropagation() }}
          onWheel={(e) => { e.stopPropagation(); e.currentTarget.scrollTop += e.deltaMode === 0 ? e.deltaY : e.deltaY * 32 }}
        >
          {filtered.map((a) => (
            <li
              key={a.id}
              onPointerDown={(e) => { e.preventDefault(); e.stopPropagation(); onChange(a.id, a.code); setOpen(false) }}
              className="px-2 py-1.5 hover:bg-t-surface cursor-pointer"
            >
              {a.code} — {a.name}
            </li>
          ))}
        </ul>,
        document.body
      )}
    </div>
  )
}
```

- [ ] **Step 4: Add `disabled` prop to `LineRow` and thread it through**

Find `function LineRow(` and update it:

```typescript
function LineRow({
  line,
  accounts,
  isNew,
  onChange,
  onRemove,
  disabled,
}: {
  line: LineState & { index: number }
  accounts: Account[]
  isNew: boolean
  onChange: (patch: Partial<LineState>) => void
  onRemove: () => void
  disabled?: boolean
}) {
  return (
    <div className={`flex gap-1.5 items-center mb-1.5 ${isNew ? 'border-l-2 border-t-primary pl-2' : ''}`}>
      <div className="w-44 shrink-0">
        <AccountSelect
          value={line.accountId}
          accounts={accounts}
          onChange={(accountId, accountCode) => onChange({ accountId, accountCode })}
          disabled={disabled}
          hasError={!line.accountId}
        />
        {!line.accountId && (
          <div className="text-[10px] text-red-500 mt-0.5">Account required</div>
        )}
      </div>
      <div className="w-40 shrink-0">
        <SubtypeCombobox
          subtypeId={line.subtypeId}
          subtypeName={line.subtypeName}
          onChange={(subtypeId, subtypeName) => onChange({ subtypeId, subtypeName })}
        />
      </div>
      <div className="relative w-24 shrink-0">
        <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-t-muted pointer-events-none">₱</span>
        <input
          type="number"
          value={line.amount}
          onChange={(e) => onChange({ amount: e.target.value })}
          placeholder="0"
          disabled={disabled}
          className="border border-t-line rounded pl-5 pr-2 py-1 text-xs w-full disabled:opacity-50"
        />
      </div>
      <input
        type="date"
        value={line.date}
        onChange={(e) => onChange({ date: e.target.value })}
        disabled={disabled}
        className="border border-t-line rounded px-2 py-1 text-xs w-32 disabled:opacity-50"
      />
      <input
        type="text"
        value={line.description}
        onChange={(e) => onChange({ description: e.target.value })}
        placeholder="Description"
        disabled={disabled}
        className="border border-t-line rounded px-2 py-1 text-xs flex-1 disabled:opacity-50"
      />
      <button
        onClick={onRemove}
        disabled={disabled}
        className="text-t-faint hover:text-red-500 transition-colors text-sm px-1 shrink-0 disabled:opacity-50"
        title="Remove line"
      >
        ✕
      </button>
    </div>
  )
}
```

- [ ] **Step 5: Add `liability` to account filters and add `hasEmptyAccount`**

Find the two account filter lines (around line 347) and the `handleApprove` function area. Make these changes:

```typescript
// Account filters — add liability
const incomeAccounts  = accounts.filter((a) => a.type === 'income'  || a.type === 'vat' || a.type === 'liability')
const expenseAccounts = accounts.filter((a) => a.type === 'expense' || a.type === 'vat' || a.type === 'liability')

// Add below the account filters
const hasEmptyAccount = lines.some((l) => !l.accountId)
```

- [ ] **Step 6: Disable Approve button when `hasEmptyAccount` is true**

Find the Approve button inside `{footerMode === 'default' && (`:

```typescript
<button
  onClick={handleApprove}
  disabled={submitting || hasEmptyAccount}
  className="bg-t-primary hover:bg-t-primary-deep text-white text-xs font-semibold px-5 py-2 rounded-lg transition-colors disabled:opacity-50"
>
  {submitting ? 'Approving…' : 'Approve'}
</button>
```

Also add `disabled={submitting}` to all `<LineRow ... />` calls in the expense and income sections. Find each `<LineRow` inside `expenseLines.map` and `incomeLines.map` and add the prop:

```typescript
<LineRow
  key={l.id ?? `new-${l.index}`}
  line={l}
  accounts={expenseAccounts}   // or incomeAccounts for income section
  isNew={!l.id}
  onChange={(patch) => updateLine(l.index, patch)}
  onRemove={() => removeLine(l.index)}
  disabled={submitting}
/>
```

- [ ] **Step 7: Run tests to verify they pass**

```bash
cd frontend && npx jest --testPathPattern=QueueReviewModal
```

Expected: ALL tests pass including the two new ones.

- [ ] **Step 8: Commit**

```bash
git add frontend/src/components/queue/QueueReviewModal.tsx \
        frontend/src/components/queue/__tests__/QueueReviewModal.test.tsx
git commit -m "fix: add liability accounts to filter, block approve on empty account, disable inputs during submit"
```

---

## Task 3: Frontend — Transaction Lines Grouping

**Files:**
- Modify: `frontend/src/components/queue/QueueReviewModal.tsx`
- Modify: `frontend/src/components/queue/__tests__/QueueReviewModal.test.tsx`

**Interfaces:**
- Consumes: `accounts` array (already loaded), `lines` state, `declaredType`
- Produces:
  - `accountTypeOf(line) → string | undefined` — looks up account type by accountId
  - `visibleLines` — replaces `incomeLines` / `expenseLines` derivations (same filter: `l.type === declaredType`)
  - `primaryLines` — subset of `visibleLines` where account type is expense/income or unknown
  - `counterLines` — subset of `visibleLines` where account type is liability or vat
  - `data-testid="counter-lines-section"` rendered when `counterLines.length > 0`

- [ ] **Step 1: Write the failing tests**

Add a new describe block in `QueueReviewModal.test.tsx`:

```typescript
const expenseAccount  = { id: 'a-exp', code: '6160', name: 'Professional Fees',    type: 'expense',   isSystemManaged: false, isActive: true }
const liabilityAccount = { id: 'a-lib', code: '2210', name: 'EWT Payable',          type: 'liability', isSystemManaged: true,  isActive: true }
const vatAccount       = { id: 'a-vat', code: '1101', name: 'Input VAT',            type: 'vat',       isSystemManaged: true,  isActive: true }

function mockQueriesWithAccounts(item = makeItem(), accts: typeof expenseAccount[] = []) {
  const { useQuery } = require('@tanstack/react-query')
  ;(useQuery as jest.Mock).mockImplementation(({ queryKey }: { queryKey: unknown[] }) => {
    if (queryKey[0] === 'queue-item') return { data: item, isLoading: false }
    if (queryKey[0] === 'accounts')   return { data: accts, isLoading: false }
    return { data: undefined, isLoading: false }
  })
}

describe('QueueReviewModal — counter entries grouping', () => {
  afterEach(() => jest.clearAllMocks())

  it('renders counter-lines-section when a line uses a liability account', () => {
    const ewtLine = {
      id: 'l-ewt', type: 'expense' as const, accountId: 'a-lib', accountCode: '2210',
      accountName: null, subtypeId: null, subtypeName: null,
      amount: 1500, description: 'EWT Payable', date: '2026-06-19',
    }
    mockQueriesWithAccounts(
      makeItem({ declaredType: 'expense', transactionLines: [expenseLine, ewtLine] }),
      [expenseAccount, liabilityAccount],
    )
    wrap()
    expect(screen.getByTestId('counter-lines-section')).toBeInTheDocument()
  })

  it('renders counter-lines-section when a line uses a vat account', () => {
    const vatLine = {
      id: 'l-vat', type: 'expense' as const, accountId: 'a-vat', accountCode: '1101',
      accountName: null, subtypeId: null, subtypeName: null,
      amount: 3600, description: 'Input VAT', date: '2026-06-19',
    }
    mockQueriesWithAccounts(
      makeItem({ declaredType: 'expense', transactionLines: [expenseLine, vatLine] }),
      [expenseAccount, vatAccount],
    )
    wrap()
    expect(screen.getByTestId('counter-lines-section')).toBeInTheDocument()
  })

  it('does not render counter-lines-section when all lines have expense accounts', () => {
    mockQueriesWithAccounts(
      makeItem({ declaredType: 'expense', transactionLines: [expenseLine] }),
      [expenseAccount],
    )
    wrap()
    expect(screen.queryByTestId('counter-lines-section')).not.toBeInTheDocument()
  })

  it('does not render counter-lines-section when lines have no account selected', () => {
    const emptyLine = {
      id: 'l-empty', type: 'expense' as const, accountId: '', accountCode: '',
      accountName: null, subtypeId: null, subtypeName: null,
      amount: 100, description: 'Pending', date: '2026-06-19',
    }
    mockQueriesWithAccounts(
      makeItem({ declaredType: 'expense', transactionLines: [emptyLine] }),
      [],
    )
    wrap()
    expect(screen.queryByTestId('counter-lines-section')).not.toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd frontend && npx jest --testPathPattern=QueueReviewModal
```

Expected: all four new grouping tests FAIL (`counter-lines-section` not found).

- [ ] **Step 3: Replace line derivations and update the render**

In `QueueReviewModal.tsx`, find the two lines:
```typescript
const incomeLines  = lines.map((l, i) => ({ ...l, index: i })).filter((l) => l.type === 'income')
const expenseLines = lines.map((l, i) => ({ ...l, index: i })).filter((l) => l.type === 'expense')
```

Replace them with:
```typescript
const accountTypeOf  = (line: LineState): string | undefined =>
  accounts.find((a) => a.id === line.accountId)?.type

const visibleLines   = lines.map((l, i) => ({ ...l, index: i })).filter((l) => l.type === declaredType)
const primaryLines   = visibleLines.filter((l) => { const t = accountTypeOf(l); return !t || t === 'expense' || t === 'income' })
const counterLines   = visibleLines.filter((l) => { const t = accountTypeOf(l); return t === 'liability' || t === 'vat' })
```

- [ ] **Step 4: Update the income section render**

Find `{declaredType === 'income' && (` and its inner section. Replace `incomeLines` with `primaryLines`:

```tsx
{declaredType === 'income' && (
<div data-testid="income-lines-section">
  <div className="text-xs font-semibold text-green-700 mb-1">Income</div>
  <div className="flex gap-1.5 items-center mb-1">
    <div className="w-44 shrink-0 text-[10px] font-semibold text-t-faint uppercase">Account</div>
    <div className="w-40 shrink-0 text-[10px] font-semibold text-t-faint uppercase">Category</div>
    <div className="w-24 shrink-0 text-[10px] font-semibold text-t-faint uppercase">Amount</div>
    <div className="w-32 shrink-0 text-[10px] font-semibold text-t-faint uppercase">Date</div>
    <div className="flex-1 text-[10px] font-semibold text-t-faint uppercase">Notes</div>
    <div className="w-6 shrink-0" />
  </div>
  {primaryLines.length === 0 && (
    <div className="text-[11px] text-t-faint mb-2">No income lines.</div>
  )}
  {primaryLines.map((l) => (
    <LineRow
      key={l.id ?? `new-${l.index}`}
      line={l}
      accounts={incomeAccounts}
      isNew={!l.id}
      onChange={(patch) => updateLine(l.index, patch)}
      onRemove={() => removeLine(l.index)}
      disabled={submitting}
    />
  ))}
  <button
    onClick={() => addLine('income')}
    className="text-[11px] text-t-primary hover:underline mt-1"
  >
    + Add income line
  </button>
</div>
)}
```

- [ ] **Step 5: Update the expense section render**

Find `{declaredType === 'expense' && (` and replace `expenseLines` with `primaryLines`:

```tsx
{declaredType === 'expense' && (
<div data-testid="expense-lines-section">
  <div className="text-xs font-semibold text-red-700 mb-1">Expense</div>
  <div className="flex gap-1.5 items-center mb-1">
    <div className="w-44 shrink-0 text-[10px] font-semibold text-t-faint uppercase">Account</div>
    <div className="w-40 shrink-0 text-[10px] font-semibold text-t-faint uppercase">Category</div>
    <div className="w-24 shrink-0 text-[10px] font-semibold text-t-faint uppercase">Amount</div>
    <div className="w-32 shrink-0 text-[10px] font-semibold text-t-faint uppercase">Date</div>
    <div className="flex-1 text-[10px] font-semibold text-t-faint uppercase">Notes</div>
    <div className="w-6 shrink-0" />
  </div>
  {primaryLines.length === 0 && (
    <div className="text-[11px] text-t-faint mb-2">No expense lines.</div>
  )}
  {primaryLines.map((l) => (
    <LineRow
      key={l.id ?? `new-${l.index}`}
      line={l}
      accounts={expenseAccounts}
      isNew={!l.id}
      onChange={(patch) => updateLine(l.index, patch)}
      onRemove={() => removeLine(l.index)}
      disabled={submitting}
    />
  ))}
  <button
    onClick={() => addLine('expense')}
    className="text-[11px] text-t-primary hover:underline mt-1"
  >
    + Add expense line
  </button>
</div>
)}
```

- [ ] **Step 6: Add the Counter Entries section after the primary section**

Immediately after the closing `)}` of the expense/income section (and before the anomaly reasons block), add:

```tsx
{/* Counter Entries — rendered for both income and expense declaredType */}
{counterLines.length > 0 && (
  <div data-testid="counter-lines-section" className="mt-3">
    <div className="text-xs font-semibold text-amber-700 mb-1">
      Counter Entries{' '}
      <span className="text-[10px] text-t-faint font-normal">· payables & tax</span>
    </div>
    <div className="flex gap-1.5 items-center mb-1">
      <div className="w-44 shrink-0 text-[10px] font-semibold text-t-faint uppercase">Account</div>
      <div className="w-40 shrink-0 text-[10px] font-semibold text-t-faint uppercase">Category</div>
      <div className="w-24 shrink-0 text-[10px] font-semibold text-t-faint uppercase">Amount</div>
      <div className="w-32 shrink-0 text-[10px] font-semibold text-t-faint uppercase">Date</div>
      <div className="flex-1 text-[10px] font-semibold text-t-faint uppercase">Notes</div>
      <div className="w-6 shrink-0" />
    </div>
    {counterLines.map((l) => (
      <div key={l.id ?? `counter-${l.index}`} className="bg-t-surface rounded mb-1">
        <LineRow
          line={l}
          accounts={declaredType === 'expense' ? expenseAccounts : incomeAccounts}
          isNew={!l.id}
          onChange={(patch) => updateLine(l.index, patch)}
          onRemove={() => removeLine(l.index)}
          disabled={submitting}
        />
      </div>
    ))}
  </div>
)}
```

- [ ] **Step 7: Run tests**

```bash
cd frontend && npx jest --testPathPattern=QueueReviewModal
```

Expected: ALL tests pass.

- [ ] **Step 8: Commit**

```bash
git add frontend/src/components/queue/QueueReviewModal.tsx \
        frontend/src/components/queue/__tests__/QueueReviewModal.test.tsx
git commit -m "feat: group transaction lines into primary and counter entries by account type"
```

---

## Task 4: Frontend — Cash Summary Bar

**Files:**
- Modify: `frontend/src/components/queue/QueueReviewModal.tsx`
- Modify: `frontend/src/components/queue/__tests__/QueueReviewModal.test.tsx`

**Interfaces:**
- Consumes: `primaryLines`, `counterLines`, `accountTypeOf` (all from Task 3), `declaredType`, `paymentMethod`
- Produces:
  - `data-testid="cash-summary"` block — hidden when `primaryLines.length === 0`
  - `data-testid="net-cash-label"` — text is "Net Cash Out" for expense, "Net Cash In" for income
  - `data-testid="net-cash-value"` — formatted peso amount

- [ ] **Step 1: Write the failing tests**

Add a new describe block in `QueueReviewModal.test.tsx`:

```typescript
describe('QueueReviewModal — cash summary', () => {
  afterEach(() => jest.clearAllMocks())

  it('shows cash-summary with correct Net Cash Out for expense doc', () => {
    const expLine = {
      id: 'l-exp', type: 'expense' as const, accountId: 'a-exp', accountCode: '6160',
      accountName: null, subtypeId: null, subtypeName: null,
      amount: 30000, description: 'Professional Fees', date: '2026-06-19',
    }
    const vatLine = {
      id: 'l-vat', type: 'expense' as const, accountId: 'a-vat', accountCode: '1101',
      accountName: null, subtypeId: null, subtypeName: null,
      amount: 3600, description: 'Input VAT', date: '2026-06-19',
    }
    const ewtLine = {
      id: 'l-ewt', type: 'expense' as const, accountId: 'a-lib', accountCode: '2210',
      accountName: null, subtypeId: null, subtypeName: null,
      amount: 1500, description: 'EWT Payable', date: '2026-06-19',
    }
    mockQueriesWithAccounts(
      makeItem({ declaredType: 'expense', transactionLines: [expLine, vatLine, ewtLine] }),
      [expenseAccount, vatAccount, liabilityAccount],
    )
    wrap()
    expect(screen.getByTestId('cash-summary')).toBeInTheDocument()
    expect(screen.getByTestId('net-cash-label')).toHaveTextContent('Net Cash Out')
    expect(screen.getByTestId('net-cash-value')).toHaveTextContent('₱32,100.00')
  })

  it('shows Net Cash In for income doc', () => {
    const incLine = {
      id: 'l-inc', type: 'income' as const, accountId: 'a-inc', accountCode: '4010',
      accountName: null, subtypeId: null, subtypeName: null,
      amount: 30000, description: 'Service Revenue', date: '2026-06-19',
    }
    const incomeAccount = { id: 'a-inc', code: '4010', name: 'Service Revenue', type: 'income', isSystemManaged: false, isActive: true }
    mockQueriesWithAccounts(
      makeItem({ declaredType: 'income', transactionLines: [incLine] }),
      [incomeAccount],
    )
    wrap()
    expect(screen.getByTestId('net-cash-label')).toHaveTextContent('Net Cash In')
  })

  it('hides cash-summary when there are no primary lines', () => {
    mockQueriesWithAccounts(
      makeItem({ declaredType: 'expense', transactionLines: [] }),
      [],
    )
    wrap()
    expect(screen.queryByTestId('cash-summary')).not.toBeInTheDocument()
  })

  it('hides the VAT row when vatTotal is 0', () => {
    const expLine = {
      id: 'l-exp', type: 'expense' as const, accountId: 'a-exp', accountCode: '6160',
      accountName: null, subtypeId: null, subtypeName: null,
      amount: 30000, description: 'Expense', date: '2026-06-19',
    }
    mockQueriesWithAccounts(
      makeItem({ declaredType: 'expense', transactionLines: [expLine] }),
      [expenseAccount],
    )
    wrap()
    expect(screen.queryByText(/Input VAT/)).not.toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd frontend && npx jest --testPathPattern=QueueReviewModal
```

Expected: all four new cash summary tests FAIL (`cash-summary` not found).

- [ ] **Step 3: Add cash summary derivations**

In `QueueReviewModal.tsx`, immediately after the `counterLines` derivation (added in Task 3), add:

```typescript
const primaryTotal   = primaryLines.reduce((s, l) => s + (parseFloat(l.amount) || 0), 0)
const vatTotal       = counterLines
  .filter((l) => accountTypeOf(l) === 'vat')
  .reduce((s, l) => s + (parseFloat(l.amount) || 0), 0)
const liabilityTotal = counterLines
  .filter((l) => accountTypeOf(l) === 'liability')
  .reduce((s, l) => s + (parseFloat(l.amount) || 0), 0)
const invoiceTotal   = primaryTotal + vatTotal
const netCash        = invoiceTotal - liabilityTotal
```

- [ ] **Step 4: Add the cash summary JSX**

Immediately after the closing `)}` of the Counter Entries section (added in Task 3) and before the anomaly reasons block, add:

```tsx
{/* Cash Summary */}
{primaryLines.length > 0 && (
  <div
    data-testid="cash-summary"
    className="mt-4 border border-t-line rounded-lg p-4 bg-t-card-alt text-xs space-y-1.5"
  >
    <div className="flex justify-between">
      <span className="text-t-muted">
        Net {declaredType === 'expense' ? 'Expense' : 'Income'}
      </span>
      <span className="font-semibold text-t-ink tabular-nums">{fmtPeso(primaryTotal)}</span>
    </div>
    {vatTotal > 0 && (
      <div className="flex justify-between">
        <span className="text-t-muted">
          + {declaredType === 'expense' ? 'Input VAT' : 'Output VAT'}
        </span>
        <span className="font-semibold text-t-ink tabular-nums">{fmtPeso(vatTotal)}</span>
      </div>
    )}
    <div className="flex justify-between border-t border-t-line pt-1.5">
      <span className="text-t-muted">Invoice Total</span>
      <span className="font-semibold text-t-ink tabular-nums">{fmtPeso(invoiceTotal)}</span>
    </div>
    {liabilityTotal > 0 && (
      <div className="flex justify-between">
        <span className="text-t-muted">− EWT Withheld</span>
        <span className="font-semibold text-t-ink tabular-nums">({fmtPeso(liabilityTotal)})</span>
      </div>
    )}
    <div className="flex justify-between items-center border-t-2 border-t-line pt-1.5">
      <span data-testid="net-cash-label" className="font-bold text-t-ink">
        {declaredType === 'expense' ? 'Net Cash Out' : 'Net Cash In'}
      </span>
      <div className="flex items-center gap-2">
        <span data-testid="net-cash-value" className="font-bold text-t-ink tabular-nums">
          {fmtPeso(netCash)}
        </span>
        {paymentMethod && (
          <span className="text-[10px] text-t-faint bg-t-card border border-t-line rounded px-1.5 py-0.5 capitalize">
            {paymentMethod}
          </span>
        )}
      </div>
    </div>
  </div>
)}
```

- [ ] **Step 5: Run all tests**

```bash
cd frontend && npx jest --testPathPattern=QueueReviewModal
```

Expected: ALL tests pass including the four new cash summary tests and all previous tests.

- [ ] **Step 6: Run backend tests to confirm nothing regressed**

```bash
cd backend && php artisan test
```

Expected: all existing backend tests pass.

- [ ] **Step 7: Commit**

```bash
git add frontend/src/components/queue/QueueReviewModal.tsx \
        frontend/src/components/queue/__tests__/QueueReviewModal.test.tsx
git commit -m "feat: add live cash summary bar to queue review modal"
```

---

## Self-Review Checklist

- [x] **Spec coverage:**
  - Fix 1 (explicit-VAT prompt) → Task 1 Step 1
  - Fix 2 (Input VAT emphasis) → Task 1 Step 1 (same block)
  - Account filter + liability → Task 2 Step 5
  - AccountSelect disabled prop → Task 2 Step 3
  - Approval validation (hasEmptyAccount) → Task 2 Steps 5–6
  - Line grouping by account type → Task 3 Steps 3–6
  - Counter entries section hidden when empty → Task 3 Step 6 (`counterLines.length > 0`)
  - Cash summary formula and JSX → Task 4 Steps 3–4
  - Cash summary hidden when no primary lines → Task 4 Step 4 (`primaryLines.length > 0`)
  - VAT row hidden when vatTotal is 0 → Task 4 Step 4
  - EWT row hidden when liabilityTotal is 0 → Task 4 Step 4
- [x] **No placeholders:** All code is complete.
- [x] **Type consistency:** `accountTypeOf`, `visibleLines`, `primaryLines`, `counterLines` are defined in Task 3 and consumed in Task 4. `expenseAccount`, `liabilityAccount`, `vatAccount`, `mockQueriesWithAccounts` are defined in the Task 3 test block and reused in Task 4 test block — both are in the same test file, so they share scope.
- [x] **Existing test compatibility:** `data-testid="expense-lines-section"` and `data-testid="income-lines-section"` are preserved. The `incomeLines`/`expenseLines` variable names are replaced with `primaryLines` in the render, but the section data-testids stay unchanged. The `approve payload excludes lines` test still passes because `hasEmptyAccount` is false for the existing fixture (`accountId: 'a1'` is truthy).
