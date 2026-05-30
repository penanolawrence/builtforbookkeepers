# Queue Review Modal UI Fixes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix three UI issues in the queue review modal: widen the modal, add column headers to transaction line rows, and filter account dropdowns by type (income/expense).

**Architecture:** All three changes are confined to a single file — `frontend/src/components/queue/QueueReviewModal.tsx`. No new components, no backend changes, no API changes.

**Tech Stack:** Next.js 14, TypeScript, Tailwind CSS, shadcn/ui Dialog

---

### Task 1: Widen the modal

**Files:**
- Modify: `frontend/src/components/queue/QueueReviewModal.tsx:300`

- [ ] **Step 1: Change `sm:max-w-5xl` to `sm:max-w-7xl` on line 300**

Find this line (line 300):
```tsx
        <DialogContent className="sm:max-w-5xl p-0 gap-0 overflow-hidden flex flex-col max-h-[90vh]">
```

Replace with:
```tsx
        <DialogContent className="sm:max-w-7xl p-0 gap-0 overflow-hidden flex flex-col max-h-[90vh]">
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/components/queue/QueueReviewModal.tsx
git commit -m "fix: widen queue review modal to max-w-7xl"
```

---

### Task 2: Add column headers above income lines

**Files:**
- Modify: `frontend/src/components/queue/QueueReviewModal.tsx:402`

- [ ] **Step 1: Insert header row after the "Income" label on line 402**

Find this block:
```tsx
                  <div className="text-xs font-semibold text-green-700 mb-2">Income</div>
                  {incomeLines.length === 0 && (
```

Replace with:
```tsx
                  <div className="text-xs font-semibold text-green-700 mb-1">Income</div>
                  <div className="flex gap-1.5 items-center mb-1">
                    <div className="w-44 shrink-0 text-[10px] font-semibold text-gray-400 uppercase">Account</div>
                    <div className="w-20 text-[10px] font-semibold text-gray-400 uppercase">Category</div>
                    <div className="w-20 text-[10px] font-semibold text-gray-400 uppercase">Amount</div>
                    <div className="w-32 text-[10px] font-semibold text-gray-400 uppercase">Date</div>
                    <div className="flex-1 text-[10px] font-semibold text-gray-400 uppercase">Description</div>
                    <div className="w-6 shrink-0" />
                  </div>
                  {incomeLines.length === 0 && (
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/components/queue/QueueReviewModal.tsx
git commit -m "fix: add column headers above income transaction lines"
```

---

### Task 3: Add column headers above expense lines

**Files:**
- Modify: `frontend/src/components/queue/QueueReviewModal.tsx:426`

- [ ] **Step 1: Insert header row after the "Expense" label on line 426**

Find this block:
```tsx
                  <div className="text-xs font-semibold text-red-700 mb-2">Expense</div>
                  {expenseLines.length === 0 && (
```

Replace with:
```tsx
                  <div className="text-xs font-semibold text-red-700 mb-1">Expense</div>
                  <div className="flex gap-1.5 items-center mb-1">
                    <div className="w-44 shrink-0 text-[10px] font-semibold text-gray-400 uppercase">Account</div>
                    <div className="w-20 text-[10px] font-semibold text-gray-400 uppercase">Category</div>
                    <div className="w-20 text-[10px] font-semibold text-gray-400 uppercase">Amount</div>
                    <div className="w-32 text-[10px] font-semibold text-gray-400 uppercase">Date</div>
                    <div className="flex-1 text-[10px] font-semibold text-gray-400 uppercase">Description</div>
                    <div className="w-6 shrink-0" />
                  </div>
                  {expenseLines.length === 0 && (
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/components/queue/QueueReviewModal.tsx
git commit -m "fix: add column headers above expense transaction lines"
```

---

### Task 4: Filter account dropdowns by line type

**Files:**
- Modify: `frontend/src/components/queue/QueueReviewModal.tsx:406-414` (income LineRows)
- Modify: `frontend/src/components/queue/QueueReviewModal.tsx:430-438` (expense LineRows)

- [ ] **Step 1: Derive filtered account arrays just above the return statement**

The `accounts` array (from `useQuery`) contains all account types. Add two filtered arrays directly after the `flagCls` definition (around line 289), before the `return` statement:

Find:
```tsx
  return (
    <>
      {toast && (
```

Insert before it:
```tsx
  const incomeAccounts  = accounts.filter((a) => a.type === 'income')
  const expenseAccounts = accounts.filter((a) => a.type === 'expense')

  return (
    <>
      {toast && (
```

- [ ] **Step 2: Pass `incomeAccounts` to income LineRows**

Find (in the income section, around line 406):
```tsx
                  {incomeLines.map((l) => (
                    <LineRow
                      key={l.id ?? `new-${l.index}`}
                      line={l}
                      accounts={accounts}
                      isNew={!l.id}
```

Replace with:
```tsx
                  {incomeLines.map((l) => (
                    <LineRow
                      key={l.id ?? `new-${l.index}`}
                      line={l}
                      accounts={incomeAccounts}
                      isNew={!l.id}
```

- [ ] **Step 3: Pass `expenseAccounts` to expense LineRows**

Find (in the expense section, around line 430):
```tsx
                  {expenseLines.map((l) => (
                    <LineRow
                      key={l.id ?? `new-${l.index}`}
                      line={l}
                      accounts={accounts}
                      isNew={!l.id}
```

Replace with:
```tsx
                  {expenseLines.map((l) => (
                    <LineRow
                      key={l.id ?? `new-${l.index}`}
                      line={l}
                      accounts={expenseAccounts}
                      isNew={!l.id}
```

- [ ] **Step 4: Commit**

```bash
git add frontend/src/components/queue/QueueReviewModal.tsx
git commit -m "fix: filter account dropdown by type in income/expense line rows"
```
