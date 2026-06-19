# Queue Review Modal Improvements — Design Spec
**Date:** 2026-06-19

## Overview

Fix three bugs in the document review flow and add a UX improvement to the `QueueReviewModal` that makes counter-entries (VAT, EWT payable) visually distinct from primary expense/income lines, and shows the accountant the actual net cash amount.

---

## Problems Being Solved

### Bug 1 — AI re-divides explicit-VAT invoice line amounts by 1.12

For formal Philippine Sales Invoices where line amounts are already net (e.g. Bookkeeping Services ₱20,000, VAT ₱3,600 shown separately), the AI classifier incorrectly treats the line amounts as VAT-inclusive and divides them by 1.12. Result: ₱17,857.14 instead of ₱20,000.

### Bug 2 — AI assigns Output VAT (2101) to expense documents

The AI reads a Sales Invoice from the seller's perspective and assigns the VAT line to 2101 (Output VAT). For the buyer (expense document), the correct account is 1101 (Input VAT).

### Bug 3 — EWT payable account shows blank in the review modal

The AI correctly assigns account code 2210–2220 to EWT lines. However `QueueReviewModal.tsx` filters `expenseAccounts` to `type === 'expense' || type === 'vat'`, excluding liability accounts. The EWT account UUID is set on the line but the `AccountSelect` cannot find it in the filtered list and renders blank. The field also silently accepts no-account lines through to approval.

### Improvement — No visual distinction between primary and counter entries

All lines render in a single flat list. Accountants cannot immediately see which lines are direct costs vs VAT/EWT offsets, and there is no computed net cash figure.

---

## Goals

- AI uses explicit VAT amounts from invoices; never re-divides net line amounts when VAT is stated separately
- AI assigns 1101 (Input VAT) for expense docs, not 2101
- EWT accounts are selectable and visible in the review modal
- Approval is blocked until every line has an account assigned
- Lines are grouped into Primary vs Counter Entries by account type
- A live cash summary shows Net Cash In / Out at the bottom of the lines section

---

## Out of Scope

- Changes to the AI tool schema or the `classify_transaction` tool definition
- Any changes to the JournalEntryService or how approvals are stored
- Modifications to the queue list view (SubmitTab or QueuePageContent)
- EWT on income documents (buyer withholds and pays BIR; not modelled here yet)

---

## Section 1 — Backend: AI Classifier Prompt Fixes

**File:** `backend/app/Services/AI/TransactionClassifier.php`

### Fix 1 — Explicit-VAT invoice rule

Replace the current VAT rule (lines 66–72) with a rule that distinguishes two document shapes:

**Embedded-VAT receipt** (POS / simple receipt): the total is VAT-inclusive and no separate VAT breakdown is shown. The AI must divide each line amount by 1.12 to extract the net.

**Explicit-VAT invoice** (BIR Sales Invoice, OR with separate VAT line): the document shows net line amounts AND a separately labeled VAT figure AND `sum(line amounts) + VAT ≈ Total`. The line amounts are already net — use them as-is. The explicit VAT figure becomes the VAT line amount.

Detection cue in the prompt:
> "If the document shows individual line amounts AND a separately labeled VAT figure AND the document Total equals the sum of line amounts plus that VAT figure — the line amounts are already net. Do NOT divide them by 1.12. Use the printed line amounts directly, and use the printed VAT figure as the VAT line amount."

The existing example (`receipt AMOUNT column shows ₱25.00 → 25.00 ÷ 1.12 = 22.32`) is retained but scoped to embedded-VAT receipts.

### Fix 2 — Input VAT vs Output VAT on expense documents

Strengthen the existing rule with an explicit note about Philippine invoice conventions:

> "Philippine Sales Invoices are written from the seller's perspective and will show the term 'Output VAT' or 'VAT (12%)'. When this document is an expense in your client's books, that same VAT is Input VAT for the buyer. For ANY expense document: the VAT line MUST use account code 1101 (Input VAT). Never use 2101 on an expense document, regardless of what the invoice calls it."

---

## Section 2 — Frontend: Account Filter + Approval Validation

**File:** `frontend/src/components/queue/QueueReviewModal.tsx`

### Change 1 — Add `liability` to account filters

```typescript
// Before (line ~347)
const incomeAccounts  = accounts.filter((a) => a.type === 'income'  || a.type === 'vat')
const expenseAccounts = accounts.filter((a) => a.type === 'expense' || a.type === 'vat')

// After
const incomeAccounts  = accounts.filter((a) => a.type === 'income'  || a.type === 'vat' || a.type === 'liability')
const expenseAccounts = accounts.filter((a) => a.type === 'expense' || a.type === 'vat' || a.type === 'liability')
```

This makes accounts 2210–2220 (EWT Payable) searchable and displayable. Lines whose `accountId` was correctly set by the AI but previously rendered blank will now show the correct account name.

### Change 2 — Block approval when any line has no account

Derive before the footer:

```typescript
const hasEmptyAccount = lines.some((l) => !l.accountId)
```

Effects:
- `Approve` button receives `disabled={submitting || hasEmptyAccount}`
- Each `LineRow` where `line.accountId === ''` renders a red border on the `AccountSelect` input (`border-red-400`) and a small label beneath it: `"Account required"`

No banner or toast — the inline indicator on the row itself is the signal.

### Change 3 — `AccountSelect` disabled prop

Add a `disabled?: boolean` prop to `AccountSelect`. When `disabled` is true, the underlying `<input>` receives `disabled` and the component skips opening the dropdown. Thread `submitting` through `LineRow` → `AccountSelect` so all account/amount/date/description inputs lock while a submission is in flight.

---

## Section 3 — Frontend: Transaction Lines Grouping

**File:** `frontend/src/components/queue/QueueReviewModal.tsx`

### Grouping rule

At render time, split lines into two groups based on the type of the selected account:

```typescript
// visibleLines replaces the existing incomeLines / expenseLines derivation
const visibleLines  = lines.filter((l) => l.type === declaredType)

const accountTypeOf = (line: LineState): string | undefined =>
  accounts.find((a) => a.id === line.accountId)?.type

const primaryLines  = visibleLines.filter((l) => {
  const t = accountTypeOf(l)
  return !t || t === 'expense' || t === 'income'
})
const counterLines  = visibleLines.filter((l) => {
  const t = accountTypeOf(l)
  return t === 'liability' || t === 'vat'
})
```

Lines with no account selected default to `primaryLines`. When an accountant changes a line's account to a liability or vat account, it moves to `counterLines` on the next render — no additional state needed.

### Visual layout

```
TRANSACTION LINES
─────────────────────────────────────────────────────
Expense                        ← existing red heading
  [LineRow] ...primary lines...
  + Add expense line

Counter Entries · payables & tax   ← new amber/muted heading
  [LineRow] ...counter lines...
```

The Counter Entries section header style: `text-xs font-semibold text-amber-700`, subtitle `· payables & tax` in `text-t-faint`. Counter entry rows use `bg-t-surface` background to distinguish them from primary rows (which remain transparent/alternating).

Both sections use the same `expenseAccounts` (or `incomeAccounts`) array — no account restriction per section.

No separate "Add counter entry" button. The AI generates counter lines automatically. Accountants who need to add one manually use `+ Add expense line` and then change the account to a liability/vat account.

The Counter Entries section is hidden entirely when `counterLines.length === 0`.

---

## Section 4 — Frontend: Cash Summary Bar

**File:** `frontend/src/components/queue/QueueReviewModal.tsx`

### Placement

Rendered below the Counter Entries section (or below the primary section if no counter lines), above the Anomaly Reasons block.

### Formula

```typescript
const primaryTotal  = primaryLines.reduce((s, l) => s + (parseFloat(l.amount) || 0), 0)
const vatTotal      = counterLines
  .filter((l) => accountTypeOf(l) === 'vat')
  .reduce((s, l) => s + (parseFloat(l.amount) || 0), 0)
const liabilityTotal = counterLines
  .filter((l) => accountTypeOf(l) === 'liability')
  .reduce((s, l) => s + (parseFloat(l.amount) || 0), 0)
const invoiceTotal  = primaryTotal + vatTotal
const netCash       = invoiceTotal - liabilityTotal
```

### Visual layout

```
┌──────────────────────────────────────────────────┐
│  Net Expense              ₱30,000.00             │
│  + Input VAT               ₱3,600.00             │
│  ───────────────────────────────────             │
│  Invoice Total            ₱33,600.00             │
│  − EWT Withheld           (₱1,500.00)            │
│  ═══════════════════════════════════             │
│  Net Cash Out             ₱32,100.00  · Cash     │
└──────────────────────────────────────────────────┘
```

- "Net Cash Out" / "Net Cash In" flips based on `declaredType`
- "Net Expense" / "Net Income" label flips based on `declaredType`
- VAT row label: "Input VAT" for expense docs, "Output VAT" for income docs
- Payment method badge (`· Cash`, `· GCash`, etc.) is pulled from `paymentMethod` state
- The VAT row is hidden when `vatTotal === 0`
- The EWT row is hidden when `liabilityTotal === 0`
- The entire block is hidden when `primaryLines.length === 0` (nothing to compute yet)
- All values update live as the accountant edits amounts

The summary is **display-only** — no inputs.

---

## File Map

**Modified:**
- `backend/app/Services/AI/TransactionClassifier.php` — prompt fixes (Fix 1, Fix 2)
- `frontend/src/components/queue/QueueReviewModal.tsx` — account filter, approval validation, disabled prop, line grouping, cash summary
