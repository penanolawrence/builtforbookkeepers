# Queue Review Modal Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a receipt image hover overlay + full-screen lightbox, and filter the transaction lines panel to only show the section matching the selected declared type.

**Architecture:** Both changes live entirely in `QueueReviewModal.tsx`. Feature 1 adds a CSS group-hover overlay on the receipt image and a conditionally-rendered fixed lightbox controlled by a single `lightboxOpen` boolean. Feature 2 changes the line section render from "always both" to "only the active type", and filters the approve payload to match.

**Tech Stack:** Next.js 14, React, TypeScript, Tailwind CSS, React Testing Library, Jest

---

## Files

| Action | Path |
|--------|------|
| Modify | `frontend/src/components/queue/QueueReviewModal.tsx` |
| Create | `frontend/src/components/queue/__tests__/QueueReviewModal.test.tsx` |

---

## Task 1: Write failing tests for Feature 2 — type-filtered line sections

**Files:**
- Create: `frontend/src/components/queue/__tests__/QueueReviewModal.test.tsx`

- [ ] **Step 1: Create the test file with mocks and shared fixture**

```tsx
// frontend/src/components/queue/__tests__/QueueReviewModal.test.tsx
import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { QueueReviewModal } from '../QueueReviewModal'

jest.mock('@tanstack/react-query', () => ({ useQuery: jest.fn() }))
jest.mock('@/lib/api/queue', () => ({
  getQueueItem: jest.fn(),
  approveItem:  jest.fn().mockResolvedValue(undefined),
  rejectItem:   jest.fn().mockResolvedValue(undefined),
  returnItem:   jest.fn().mockResolvedValue(undefined),
}))
jest.mock('@/lib/api/documents', () => ({
  getSignedUrl: jest.fn().mockResolvedValue({ url: 'https://example.com/receipt.jpg' }),
}))
jest.mock('@/lib/api/accounts', () => ({ getAccounts: jest.fn() }))
jest.mock('@/components/queue/SubtypeCombobox', () => ({
  SubtypeCombobox: () => <div data-testid="subtype-combobox" />,
}))
jest.mock('@/components/ui/dialog', () => ({
  Dialog:        ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}))

const expenseLine = {
  id: 'l1', type: 'expense' as const, accountId: 'a1', accountCode: '5008',
  subtypeId: null, subtypeName: 'Meals', amount: 945, description: 'Purchase', date: '2026-06-27',
}
const incomeLine = {
  id: 'l2', type: 'income' as const, accountId: 'a2', accountCode: '4001',
  subtypeId: null, subtypeName: null, amount: 100, description: 'Revenue', date: '2026-06-26',
}

function makeItem(overrides: object = {}) {
  return {
    refNumber: 'EFS001', clientId: 'c1', clientName: 'ABC Trading',
    flag: 'GREEN', isNoReceipt: false,
    merchantName: 'Maya Tapa King', date: '2026-06-27',
    declaredType: 'expense', paymentMethod: 'bank',
    anomalyReasons: [], transactionLines: [expenseLine, incomeLine],
    ...overrides,
  }
}

function mockQueries(item = makeItem()) {
  const { useQuery } = require('@tanstack/react-query')
  ;(useQuery as jest.Mock)
    .mockReturnValueOnce({ data: item, isLoading: false })
    .mockReturnValueOnce({ data: [],   isLoading: false })
}

function wrap(documentId = 'doc-1') {
  return render(<QueueReviewModal documentId={documentId} onClose={jest.fn()} />)
}
```

- [ ] **Step 2: Add Feature 2 failing tests — section visibility**

Append these tests to the file created in Step 1:

```tsx
describe('QueueReviewModal — transaction line section visibility', () => {
  afterEach(() => jest.clearAllMocks())

  it('shows only expense section when declaredType is expense', () => {
    mockQueries(makeItem({ declaredType: 'expense' }))
    wrap()
    expect(screen.getByTestId('expense-lines-section')).toBeInTheDocument()
    expect(screen.queryByTestId('income-lines-section')).not.toBeInTheDocument()
  })

  it('shows only income section when declaredType is income', () => {
    mockQueries(makeItem({ declaredType: 'income' }))
    wrap()
    expect(screen.getByTestId('income-lines-section')).toBeInTheDocument()
    expect(screen.queryByTestId('expense-lines-section')).not.toBeInTheDocument()
  })
})
```

- [ ] **Step 3: Add Feature 2 failing test — approve payload only includes matching type**

Append to the same describe block:

```tsx
  it('approve payload excludes lines of the hidden type', async () => {
    const { approveItem } = require('@/lib/api/queue')
    mockQueries(makeItem({ declaredType: 'expense' }))
    wrap()

    fireEvent.click(screen.getByText('Approve'))

    await waitFor(() => expect(approveItem).toHaveBeenCalledTimes(1))

    const payload = (approveItem as jest.Mock).mock.calls[0][1]
    const submittedTypes = (payload.lines as { type: string }[]).map((l) => l.type)
    expect(submittedTypes.every((t) => t === 'expense')).toBe(true)
    expect(submittedTypes).not.toContain('income')
  })
```

- [ ] **Step 4: Run tests — verify they all fail**

```bash
cd frontend && npx jest --testPathPattern="QueueReviewModal" --no-coverage 2>&1 | tail -20
```

Expected: 3 tests FAIL. Likely errors: `getByTestId('expense-lines-section')` — element not found, and `expect(approveItem)` issues because the data-testid attributes don't exist yet.

---

## Task 2: Implement Feature 2 — conditional line sections + payload filter

**Files:**
- Modify: `frontend/src/components/queue/QueueReviewModal.tsx`

- [ ] **Step 1: Add `data-testid` attributes to the two line section containers**

In `QueueReviewModal.tsx`, find the Income section div (currently `{/* Income */}`):

```tsx
// BEFORE
<div>
  <div className="text-xs font-semibold text-green-700 mb-1">Income</div>
  ...
</div>

// AFTER
<div data-testid="income-lines-section">
  <div className="text-xs font-semibold text-green-700 mb-1">Income</div>
  ...
</div>
```

Find the Expense section div (currently `{/* Expense */}`):

```tsx
// BEFORE
<div>
  <div className="text-xs font-semibold text-red-700 mb-1">Expense</div>
  ...
</div>

// AFTER
<div data-testid="expense-lines-section">
  <div className="text-xs font-semibold text-red-700 mb-1">Expense</div>
  ...
</div>
```

- [ ] **Step 2: Wrap each section in a conditional render on `declaredType`**

```tsx
// BEFORE — both sections always rendered
<div data-testid="income-lines-section">
  ...income section JSX...
</div>

<div data-testid="expense-lines-section">
  ...expense section JSX...
</div>

// AFTER — only render the active type
{declaredType === 'income' && (
  <div data-testid="income-lines-section">
    ...income section JSX...
  </div>
)}

{declaredType === 'expense' && (
  <div data-testid="expense-lines-section">
    ...expense section JSX...
  </div>
)}
```

- [ ] **Step 3: Filter lines by `declaredType` in `handleApprove`**

Find the `handleApprove` function. The line that builds `linePayloads` currently is:

```tsx
const linePayloads: LinePayload[] = lines.map((l) => ({
```

Change it to:

```tsx
const linePayloads: LinePayload[] = lines
  .filter((l) => l.type === declaredType)
  .map((l) => ({
```

Leave the rest of the map callback unchanged.

- [ ] **Step 4: Run tests — verify Feature 2 tests now pass**

```bash
cd frontend && npx jest --testPathPattern="QueueReviewModal" --no-coverage 2>&1 | tail -20
```

Expected: all 3 Feature 2 tests PASS.

- [ ] **Step 5: Commit**

```bash
cd frontend && git add src/components/queue/QueueReviewModal.tsx src/components/queue/__tests__/QueueReviewModal.test.tsx
cd .. && git commit -m "feat: filter transaction lines by declared type in QueueReviewModal"
```

---

## Task 3: Write failing tests for Feature 1 — receipt lightbox

**Files:**
- Modify: `frontend/src/components/queue/__tests__/QueueReviewModal.test.tsx`

- [ ] **Step 1: Add lightbox failing tests**

Append a new describe block to the test file:

```tsx
describe('QueueReviewModal — receipt lightbox', () => {
  afterEach(() => jest.clearAllMocks())

  it('does not show lightbox on initial render', () => {
    mockQueries()
    wrap()
    expect(screen.queryByTestId('receipt-lightbox')).not.toBeInTheDocument()
  })

  it('opens lightbox when receipt is clicked', async () => {
    mockQueries()
    wrap()

    await waitFor(() =>
      expect(screen.getByTestId('receipt-viewer')).toBeInTheDocument()
    )

    fireEvent.click(screen.getByTestId('receipt-viewer'))
    expect(screen.getByTestId('receipt-lightbox')).toBeInTheDocument()
  })

  it('closes lightbox when close button is clicked', async () => {
    mockQueries()
    wrap()

    await waitFor(() => screen.getByTestId('receipt-viewer'))
    fireEvent.click(screen.getByTestId('receipt-viewer'))
    expect(screen.getByTestId('receipt-lightbox')).toBeInTheDocument()

    fireEvent.click(screen.getByLabelText('Close lightbox'))
    expect(screen.queryByTestId('receipt-lightbox')).not.toBeInTheDocument()
  })

  it('closes lightbox on Escape key', async () => {
    mockQueries()
    wrap()

    await waitFor(() => screen.getByTestId('receipt-viewer'))
    fireEvent.click(screen.getByTestId('receipt-viewer'))
    expect(screen.getByTestId('receipt-lightbox')).toBeInTheDocument()

    fireEvent.keyDown(window, { key: 'Escape' })
    expect(screen.queryByTestId('receipt-lightbox')).not.toBeInTheDocument()
  })

  it('closes lightbox when backdrop is clicked', async () => {
    mockQueries()
    wrap()

    await waitFor(() => screen.getByTestId('receipt-viewer'))
    fireEvent.click(screen.getByTestId('receipt-viewer'))
    const lightbox = screen.getByTestId('receipt-lightbox')
    expect(lightbox).toBeInTheDocument()

    fireEvent.click(lightbox)
    expect(screen.queryByTestId('receipt-lightbox')).not.toBeInTheDocument()
  })

  it('does not render receipt-viewer when isNoReceipt is true', () => {
    mockQueries(makeItem({ isNoReceipt: true }))
    wrap()
    expect(screen.queryByTestId('receipt-viewer')).not.toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run tests — verify they all fail**

```bash
cd frontend && npx jest --testPathPattern="QueueReviewModal" --no-coverage 2>&1 | tail -20
```

Expected: 6 new tests FAIL (data-testids `receipt-viewer` and `receipt-lightbox` don't exist yet). Previously passing tests must still pass.

---

## Task 4: Implement Feature 1 — receipt hover overlay + lightbox

**Files:**
- Modify: `frontend/src/components/queue/QueueReviewModal.tsx`

- [ ] **Step 1: Add `lightboxOpen` state**

In `QueueReviewModal`, find the existing state declarations (near `const [imageUrl, setImageUrl] = useState`). Add directly after it:

```tsx
const [lightboxOpen, setLightboxOpen] = useState(false)
```

- [ ] **Step 2: Add Escape key listener useEffect**

Add this useEffect after the existing `useEffect` blocks (after the one that calls `getSignedUrl`):

```tsx
useEffect(() => {
  if (!lightboxOpen) return
  const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') setLightboxOpen(false) }
  window.addEventListener('keydown', handler)
  return () => window.removeEventListener('keydown', handler)
}, [lightboxOpen])
```

- [ ] **Step 3: Replace the bare `<img>` with the hover-overlay container**

Find this block in the left panel:

```tsx
) : imageUrl ? (
  <img src={imageUrl} alt="Receipt" className="w-full rounded-lg border border-t-line object-contain" />
) : (
```

Replace with:

```tsx
) : imageUrl ? (
  <div
    data-testid="receipt-viewer"
    className="relative group w-full rounded-lg border border-t-line overflow-hidden cursor-pointer"
    onClick={() => setLightboxOpen(true)}
  >
    <img src={imageUrl} alt="Receipt" className="w-full object-contain block" />
    <div className="absolute inset-0 flex items-center justify-center bg-[rgba(26,15,46,0.42)] backdrop-blur-[3px] opacity-0 group-hover:opacity-100 transition-opacity duration-[180ms]">
      <button
        className="w-11 h-11 rounded-xl bg-white/[0.18] border border-white/[0.32] text-white flex items-center justify-center pointer-events-none"
        tabIndex={-1}
        aria-hidden="true"
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
          <circle cx="12" cy="12" r="3" />
        </svg>
      </button>
    </div>
  </div>
) : (
```

Note: the inner button is `pointer-events-none` — the click is handled by the wrapping div, not the button, so the test's `fireEvent.click` on `data-testid="receipt-viewer"` fires correctly.

- [ ] **Step 4: Add the lightbox below the closing `</Dialog>` tag (still inside the fragment)**

Find the end of the component return — it looks like:

```tsx
    <>
      {toast && ( ... )}

      <Dialog open onOpenChange={...}>
        <DialogContent ...>
          ...
        </DialogContent>
      </Dialog>
    </>
```

Add the lightbox between the Dialog and the closing `</>`:

```tsx
      {lightboxOpen && imageUrl && (
        <div
          data-testid="receipt-lightbox"
          className="fixed inset-0 z-[400] flex items-center justify-center bg-[rgba(10,8,18,0.82)] backdrop-blur-[8px]"
          onClick={(e) => { if (e.target === e.currentTarget) setLightboxOpen(false) }}
        >
          <button
            className="absolute top-5 right-6 w-10 h-10 rounded-[11px] bg-white/[0.12] border border-white/[0.2] text-white flex items-center justify-center text-lg"
            onClick={() => setLightboxOpen(false)}
            aria-label="Close lightbox"
          >
            ✕
          </button>
          <img
            src={imageUrl}
            alt="Receipt full view"
            className="max-w-[min(800px,92vw)] max-h-[90vh] object-contain rounded-2xl shadow-[0_24px_64px_rgba(0,0,0,0.5)]"
          />
        </div>
      )}
```

- [ ] **Step 5: Run all tests — verify everything passes**

```bash
cd frontend && npx jest --testPathPattern="QueueReviewModal" --no-coverage 2>&1 | tail -25
```

Expected: all tests PASS (3 Feature 2 tests + 6 Feature 1 tests).

- [ ] **Step 6: Commit**

```bash
cd frontend && git add src/components/queue/QueueReviewModal.tsx src/components/queue/__tests__/QueueReviewModal.test.tsx
cd .. && git commit -m "feat: add receipt hover overlay and lightbox to QueueReviewModal"
```

---

## Self-Review

**Spec coverage:**
- ✅ Receipt hover overlay (CSS group-hover, eye icon) — Task 4 Step 3
- ✅ Lightbox on click (fixed overlay, backdrop blur) — Task 4 Step 4
- ✅ Lightbox close: close button, backdrop click, Escape — Task 4 Steps 1–4
- ✅ Lightbox only when `!isNoReceipt && imageUrl` — conditional render in Task 4 Step 4
- ✅ Only active-type line section rendered — Task 2 Steps 1–2
- ✅ Approve payload filtered by `declaredType` — Task 2 Step 3
- ✅ Hidden lines preserved in state (filter is at payload time, not state mutation) — Task 2 Step 3

**Placeholders:** None.

**Type consistency:** `lightboxOpen: boolean`, `setLightboxOpen(false/true)` — consistent across all tasks. `declaredType` type is `'income' | 'expense'` — used in conditional render and `.filter()` consistently.
