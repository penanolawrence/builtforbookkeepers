# Submit & Review Tab Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extend `SubmitTab` with a filtered queue list below the upload section so accountants can review, approve, return, and reject a client's pending documents without leaving the modal.

**Architecture:** `SubmitTab` gains a `role` prop and a `useQuery` call for `getQueue({ clientId })`. The queue list is rendered below the existing upload UI; clicking a row opens the existing `QueueReviewModal`. Batch approve is handled by checkboxes on GREEN rows and a bottom bar. `ClientDetailModal` renames the tab label to "Submit & Review" and passes `role` down.

**Tech Stack:** React, TanStack Query v5, Jest + React Testing Library, existing `QueueReviewModal` and `batchApprove` API.

---

## File Map

| File | Change |
|------|--------|
| `frontend/src/components/upload/SubmitTab.tsx` | Add `role` prop; add queue fetch, queue list, `QueueReviewModal` trigger, batch approve bar |
| `frontend/src/components/upload/__tests__/SubmitTab.test.tsx` | New — covers queue list rendering, empty/loading states, row click, batch approve |
| `frontend/src/components/clients/ClientDetailModal.tsx` | Rename tab label; pass `role` to `SubmitTab` |

---

### Task 1: Add `role` prop to `SubmitTab` and rename tab label in `ClientDetailModal`

**Files:**
- Modify: `frontend/src/components/upload/SubmitTab.tsx`
- Modify: `frontend/src/components/clients/ClientDetailModal.tsx:914-916,1003-1007`
- Create: `frontend/src/components/upload/__tests__/SubmitTab.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `frontend/src/components/upload/__tests__/SubmitTab.test.tsx`:

```tsx
import { render, screen, fireEvent } from '@testing-library/react'
import { SubmitTab } from '../SubmitTab'

jest.mock('@tanstack/react-query', () => ({
  useQueryClient: () => ({ invalidateQueries: jest.fn() }),
  useQuery: jest.fn(() => ({ data: [], isLoading: false })),
}))
jest.mock('@/lib/api/queue', () => ({
  getQueue:     jest.fn(),
  batchApprove: jest.fn(),
}))
jest.mock('@/lib/api/documents', () => ({ uploadDocument: jest.fn() }))
jest.mock('@/hooks/use-toast', () => ({ useToast: () => ({ toast: jest.fn() }) }))
jest.mock('../TwoAreaUpload', () => ({
  TwoAreaUpload: ({ clientId }: { clientId: string }) => (
    <div data-testid="two-area-upload" data-client-id={clientId} />
  ),
}))
jest.mock('../ConfirmUploadDialog', () => ({
  ConfirmUploadDialog: () => <div data-testid="confirm-dialog" />,
}))
jest.mock('@/components/queue/QueueReviewModal', () => ({
  QueueReviewModal: ({ documentId, onRemoved, onClose }: { documentId: string; onRemoved?: (id: string) => void; onClose: () => void }) => (
    <div data-testid="queue-review-modal" data-doc-id={documentId}>
      <button data-testid="mock-remove" onClick={() => onRemoved?.(documentId)}>Remove</button>
      <button data-testid="mock-close" onClick={onClose}>Close</button>
    </div>
  ),
}))

function wrap(role: 'admin' | 'accountant' = 'accountant') {
  return render(
    <div data-theme="sofia">
      <SubmitTab
        clientId="c1"
        docsQueryKey={['docs', 'c1']}
        role={role}
      />
    </div>
  )
}

describe('SubmitTab', () => {
  it('renders the upload area', () => {
    wrap()
    expect(screen.getByTestId('two-area-upload')).toBeInTheDocument()
  })

  it('accepts role prop without error', () => {
    expect(() => wrap('admin')).not.toThrow()
    expect(() => wrap('accountant')).not.toThrow()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd frontend && npx jest SubmitTab.test --no-coverage
```

Expected: FAIL — `role` prop does not exist on `SubmitTab`'s Props interface.

- [ ] **Step 3: Add `role` to `SubmitTab` Props**

In `frontend/src/components/upload/SubmitTab.tsx`, update the Props interface:

```ts
interface Props {
  clientId: string
  docsQueryKey: unknown[]
  role: 'admin' | 'accountant'
}
```

Update the function signature:

```ts
export function SubmitTab({ clientId, docsQueryKey, role }: Props) {
```

- [ ] **Step 4: Pass `role` from `ClientDetailModal` and rename tab label**

In `frontend/src/components/clients/ClientDetailModal.tsx`:

Change line 916 — tab label:
```ts
// Before
{ id: 'submit', label: 'Submit' },
// After
{ id: 'submit', label: 'Submit & Review' },
```

Change lines 1003–1007 — add `role` prop:
```tsx
// Before
{tab === 'submit' && (
  <SubmitTab
    clientId={clientId}
    docsQueryKey={[role === 'admin' ? 'admin-client-docs' : 'client-modal-docs', clientId]}
  />
)}

// After
{tab === 'submit' && (
  <SubmitTab
    clientId={clientId}
    docsQueryKey={[role === 'admin' ? 'admin-client-docs' : 'client-modal-docs', clientId]}
    role={role}
  />
)}
```

- [ ] **Step 5: Run test to verify it passes**

```bash
cd frontend && npx jest SubmitTab.test --no-coverage
```

Expected: PASS — 2 tests pass.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/components/upload/SubmitTab.tsx \
        frontend/src/components/clients/ClientDetailModal.tsx \
        frontend/src/components/upload/__tests__/SubmitTab.test.tsx
git commit -m "feat: add role prop to SubmitTab and rename tab to Submit & Review"
```

---

### Task 2: Queue list — fetch, render, and row click

**Files:**
- Modify: `frontend/src/components/upload/SubmitTab.tsx`
- Modify: `frontend/src/components/upload/__tests__/SubmitTab.test.tsx`

- [ ] **Step 1: Write the failing tests**

Append to the `describe('SubmitTab')` block in `SubmitTab.test.tsx`:

```tsx
import { render, screen, fireEvent } from '@testing-library/react'

// (add this import at the top of the file alongside existing imports)
// import { useQuery } from '@tanstack/react-query'

// --- helper items ---
const redItem = {
  documentId: 'doc-red',
  clientId: 'c1',
  clientName: 'ABC',
  accountantName: null,
  flag: 'RED' as const,
  anomalyReasons: ['Amount mismatch'],
  merchantName: 'Meralco',
  amount: 4200,
  vatAmount: null,
  date: '2026-06-10',
  category: null,
  isNoReceipt: false,
  isOcrFailed: false,
  refNumber: '#1042',
  paymentMethod: null,
  declaredType: 'expense' as const,
}
const greenItem = {
  ...redItem,
  documentId: 'doc-green',
  flag: 'GREEN' as const,
  anomalyReasons: [],
  merchantName: 'SM Supermarket',
  amount: 650,
  refNumber: '#1040',
}

// Replace the mock at the top of the file — update useQuery to be controllable:
// jest.mock('@tanstack/react-query', () => ({
//   useQueryClient: () => ({ invalidateQueries: jest.fn() }),
//   useQuery: jest.fn(() => ({ data: [], isLoading: false })),
// }))
// (already mocked above — add these tests to the describe block)

it('shows loading skeleton when queue is loading', () => {
  const { useQuery } = require('@tanstack/react-query')
  ;(useQuery as jest.Mock).mockReturnValue({ data: undefined, isLoading: true })
  wrap()
  expect(screen.getByTestId('queue-skeleton')).toBeInTheDocument()
})

it('shows empty state when no queue items', () => {
  const { useQuery } = require('@tanstack/react-query')
  ;(useQuery as jest.Mock).mockReturnValue({ data: [], isLoading: false })
  wrap()
  expect(screen.getByText('No documents pending review.')).toBeInTheDocument()
})

it('renders queue items sorted RED before GREEN', () => {
  const { useQuery } = require('@tanstack/react-query')
  ;(useQuery as jest.Mock).mockReturnValue({ data: [greenItem, redItem], isLoading: false })
  wrap()
  const rows = screen.getAllByTestId('queue-row')
  expect(rows[0]).toHaveAttribute('data-flag', 'RED')
  expect(rows[1]).toHaveAttribute('data-flag', 'GREEN')
})

it('opens QueueReviewModal when a row is clicked', () => {
  const { useQuery } = require('@tanstack/react-query')
  ;(useQuery as jest.Mock).mockReturnValue({ data: [redItem], isLoading: false })
  wrap()
  fireEvent.click(screen.getByTestId('queue-row'))
  expect(screen.getByTestId('queue-review-modal')).toBeInTheDocument()
  expect(screen.getByTestId('queue-review-modal')).toHaveAttribute('data-doc-id', 'doc-red')
})

it('invalidates client-queue when item is removed from the modal', () => {
  const invalidateQueries = jest.fn()
  const { useQuery, useQueryClient } = require('@tanstack/react-query')
  ;(useQueryClient as jest.Mock).mockReturnValue({ invalidateQueries })
  ;(useQuery as jest.Mock).mockReturnValue({ data: [redItem], isLoading: false })

  wrap()
  fireEvent.click(screen.getByTestId('queue-row'))
  fireEvent.click(screen.getByTestId('mock-remove'))
  expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: ['client-queue', 'c1'] })
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd frontend && npx jest SubmitTab.test --no-coverage
```

Expected: FAIL — `queue-skeleton`, `queue-row`, and related elements don't exist yet.

- [ ] **Step 3: Implement queue fetch and list in `SubmitTab.tsx`**

Replace the full file with:

```tsx
'use client'

import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useToast } from '@/hooks/use-toast'
import { TwoAreaUpload } from './TwoAreaUpload'
import { ConfirmUploadDialog } from './ConfirmUploadDialog'
import { QueueReviewModal } from '@/components/queue/QueueReviewModal'
import { uploadDocument } from '@/lib/api/documents'
import { getQueue } from '@/lib/api/queue'
import type { DeclaredType } from '@/types/document'
import type { QueueItem } from '@/types/queue'

interface PendingFile {
  file: File
  declaredType: DeclaredType
}

interface Props {
  clientId: string
  docsQueryKey: unknown[]
  role: 'admin' | 'accountant'
}

const FLAG_ORDER: Record<string, number> = { RED: 0, YELLOW: 1, GREEN: 2 }

function fmtPeso(n: number | null) {
  if (n == null) return '—'
  return '₱' + Number(n).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function fmtShort(s: string | null) {
  if (!s) return '—'
  return new Date(s).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

const FLAG_DOT: Record<string, string> = {
  RED:    '#ef4444',
  YELLOW: '#f59e0b',
  GREEN:  '#22c55e',
}

export function SubmitTab({ clientId, docsQueryKey, role: _role }: Props) {
  const qc                              = useQueryClient()
  const { toast }                       = useToast()
  const [pendingFiles, setPendingFiles] = useState<PendingFile[]>([])
  const [uploading,    setUploading]    = useState(false)
  const [reviewingId,  setReviewingId]  = useState<string | null>(null)

  const { data: queueItems = [], isLoading: queueLoading } = useQuery({
    queryKey: ['client-queue', clientId],
    queryFn:  () => getQueue({ clientId }),
  })

  const sorted = [...queueItems].sort(
    (a, b) => (FLAG_ORDER[a.flag] ?? 99) - (FLAG_ORDER[b.flag] ?? 99)
  )

  function handleFilePicked(files: File[], declaredType: DeclaredType) {
    if (uploading) return
    setPendingFiles(files.map((file) => ({ file, declaredType })))
  }

  async function handleConfirmUpload(note: string) {
    const batch = pendingFiles
    setUploading(true)
    const failed: string[] = []
    for (const { file, declaredType } of batch) {
      try {
        await uploadDocument(file, declaredType, note || undefined, clientId)
      } catch {
        failed.push(file.name)
      }
    }
    setUploading(false)
    setPendingFiles([])
    const total = batch.length
    if (failed.length < total) {
      qc.invalidateQueries({ queryKey: docsQueryKey })
    }
    if (failed.length === 0) {
      toast({ title: `${total} ${total === 1 ? 'file' : 'files'} submitted — processing…` })
    } else if (failed.length === total) {
      toast({ title: 'Upload failed — please try again.', variant: 'destructive' })
    } else {
      toast({ title: `${failed.length} of ${total} uploads failed — please try again.`, variant: 'destructive' })
    }
  }

  function handleManualSuccess() {
    qc.invalidateQueries({ queryKey: docsQueryKey })
    toast({ title: 'Entry submitted — processing…' })
  }

  function handleRemoved(id: string) {
    setReviewingId(null)
    qc.invalidateQueries({ queryKey: ['client-queue', clientId] })
  }

  return (
    <div style={{ padding: '20px 28px' }}>
      <TwoAreaUpload
        clientId={clientId}
        onFilePicked={handleFilePicked}
        onManualSuccess={handleManualSuccess}
      />
      <ConfirmUploadDialog
        open={pendingFiles.length > 0}
        files={pendingFiles}
        uploading={uploading}
        onConfirm={handleConfirmUpload}
        onCancel={() => { if (!uploading) setPendingFiles([]) }}
      />

      {/* Queue list */}
      <hr style={{ border: 0, borderTop: '1px solid var(--t-line)', margin: '24px 0' }} />

      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
        <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--t-faint)', textTransform: 'uppercase', letterSpacing: '.06em' }}>
          Pending Review
        </span>
        <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--t-faint)', background: 'var(--t-card-alt)', border: '1px solid var(--t-line)', borderRadius: 999, padding: '1px 7px' }}>
          {queueItems.length}
        </span>
      </div>

      {queueLoading ? (
        <div data-testid="queue-skeleton" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {[0, 1, 2].map((i) => (
            <div key={i} style={{ height: 44, background: 'var(--t-card-alt)', borderRadius: 10, animation: 'pulse 1.5s infinite' }} />
          ))}
        </div>
      ) : sorted.length === 0 ? (
        <p style={{ textAlign: 'center', color: 'var(--t-faint)', fontSize: 13.5, padding: '24px 0' }}>
          No documents pending review.
        </p>
      ) : (
        <div style={{ border: '1px solid var(--t-line)', borderRadius: 12, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: 'var(--t-card-alt)' }}>
                <th style={thStyle}>Flag</th>
                <th style={thStyle}>Ref / Type</th>
                <th style={thStyle}>Merchant</th>
                <th style={{ ...thStyle, textAlign: 'right' }}>Amount</th>
                <th style={thStyle}>Date</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((item: QueueItem) => (
                <tr
                  key={item.documentId}
                  data-testid="queue-row"
                  data-flag={item.flag}
                  onClick={() => setReviewingId(item.documentId)}
                  style={{ borderTop: '1px solid var(--t-line-soft)', cursor: 'pointer', transition: 'background .12s' }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'var(--t-card-alt)' }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = '' }}
                >
                  <td style={tdStyle}>
                    <span style={{ display: 'inline-block', width: 9, height: 9, borderRadius: 999, background: FLAG_DOT[item.flag] ?? '#888' }} />
                  </td>
                  <td style={tdStyle}>
                    <span style={{ fontWeight: 600, color: 'var(--t-ink)' }}>{item.refNumber || '—'}</span>
                    <span style={{ marginLeft: 6, fontSize: 11.5, fontWeight: 700, color: 'var(--t-faint)', textTransform: 'capitalize' }}>{item.declaredType ?? ''}</span>
                  </td>
                  <td style={tdStyle}>{item.merchantName || '—'}</td>
                  <td style={{ ...tdStyle, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{fmtPeso(item.amount)}</td>
                  <td style={tdStyle}>{fmtShort(item.date)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {reviewingId && (
        <QueueReviewModal
          documentId={reviewingId}
          onClose={() => setReviewingId(null)}
          onRemoved={handleRemoved}
        />
      )}
    </div>
  )
}

const thStyle: React.CSSProperties = {
  padding: '9px 14px',
  textAlign: 'left',
  fontSize: 11,
  fontWeight: 700,
  color: 'var(--t-faint)',
  textTransform: 'uppercase',
  letterSpacing: '.05em',
}

const tdStyle: React.CSSProperties = {
  padding: '11px 14px',
  color: 'var(--t-muted)',
  verticalAlign: 'middle',
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
cd frontend && npx jest SubmitTab.test --no-coverage
```

Expected: PASS — all tests pass.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/upload/SubmitTab.tsx \
        frontend/src/components/upload/__tests__/SubmitTab.test.tsx
git commit -m "feat: add client queue list to SubmitTab below upload section"
```

---

### Task 3: Batch approve — checkboxes and bottom bar

**Files:**
- Modify: `frontend/src/components/upload/SubmitTab.tsx`
- Modify: `frontend/src/components/upload/__tests__/SubmitTab.test.tsx`

- [ ] **Step 1: Write the failing tests**

Append to the `describe('SubmitTab')` block in `SubmitTab.test.tsx`:

```tsx
it('renders checkbox only on GREEN rows', () => {
  const { useQuery } = require('@tanstack/react-query')
  ;(useQuery as jest.Mock).mockReturnValue({ data: [redItem, greenItem], isLoading: false })
  wrap()
  const checkboxes = screen.getAllByRole('checkbox')
  expect(checkboxes).toHaveLength(1)
})

it('does not show batch approve bar when nothing selected', () => {
  const { useQuery } = require('@tanstack/react-query')
  ;(useQuery as jest.Mock).mockReturnValue({ data: [greenItem], isLoading: false })
  wrap()
  expect(screen.queryByTestId('batch-approve-bar')).not.toBeInTheDocument()
})

it('shows batch approve bar when a GREEN row is checked', () => {
  const { useQuery } = require('@tanstack/react-query')
  ;(useQuery as jest.Mock).mockReturnValue({ data: [greenItem], isLoading: false })
  wrap()
  fireEvent.click(screen.getByRole('checkbox'))
  expect(screen.getByTestId('batch-approve-bar')).toBeInTheDocument()
  expect(screen.getByText(/1 green item selected/i)).toBeInTheDocument()
})

it('calls batchApprove with selected ids and shows success toast', async () => {
  const { useQuery } = require('@tanstack/react-query')
  const { batchApprove } = require('@/lib/api/queue')
  const toast = jest.fn()
  const { useToast } = require('@/hooks/use-toast')
  ;(useToast as jest.Mock).mockReturnValue({ toast })
  ;(useQuery as jest.Mock).mockReturnValue({ data: [greenItem], isLoading: false })
  ;(batchApprove as jest.Mock).mockResolvedValue({ approved: ['doc-green'], failed: [] })

  wrap()
  fireEvent.click(screen.getByRole('checkbox'))
  fireEvent.click(screen.getByRole('button', { name: /approve selected/i }))

  await screen.findByTestId('batch-approve-bar') // wait for async
  expect(batchApprove).toHaveBeenCalledWith(['doc-green'])
  expect(toast).toHaveBeenCalledWith({ title: 'Approved 1 item(s).' })
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd frontend && npx jest SubmitTab.test --no-coverage
```

Expected: FAIL — no checkboxes, no batch approve bar yet.

- [ ] **Step 3: Add checkbox + batch approve bar to `SubmitTab.tsx`**

Add to imports at the top of `SubmitTab.tsx`:
```ts
import { batchApprove } from '@/lib/api/queue'
```

Add `selected` and `approving` state below the existing state declarations:
```ts
const [selected,  setSelected]  = useState<Set<string>>(new Set())
const [approving, setApproving] = useState(false)
```

Add the `handleBatchApprove` function after `handleRemoved`:
```ts
async function handleBatchApprove() {
  if (selected.size === 0) return
  setApproving(true)
  try {
    const result = await batchApprove(Array.from(selected))
    setSelected(new Set())
    qc.invalidateQueries({ queryKey: ['client-queue', clientId] })
    toast({ title: `Approved ${result.approved.length} item(s).` })
  } catch {
    toast({ title: 'Batch approval failed. Please try again.', variant: 'destructive' })
  } finally {
    setApproving(false)
  }
}
```

In the table, add a 6th `<th>` after the Date column header:
```tsx
<th style={{ ...thStyle, width: 36 }} />
```

In each `<tr>`, add a 6th `<td>` after the Date cell:
```tsx
<td style={{ ...tdStyle, textAlign: 'center' }} onClick={(e) => e.stopPropagation()}>
  {item.flag === 'GREEN' && (
    <input
      type="checkbox"
      checked={selected.has(item.documentId)}
      onChange={() => {
        setSelected((prev) => {
          const next = new Set(prev)
          if (next.has(item.documentId)) next.delete(item.documentId)
          else next.add(item.documentId)
          return next
        })
      }}
      style={{ width: 15, height: 15, cursor: 'pointer', accentColor: 'var(--t-primary)' }}
    />
  )}
</td>
```

Add the batch approve bar just before the closing `</div>` at the end of the return (after the `{reviewingId && ...}` block):
```tsx
{selected.size > 0 && (
  <div
    data-testid="batch-approve-bar"
    style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 16, padding: '12px 16px', background: 'var(--t-card-alt)', borderRadius: 12, border: '1px solid var(--t-line)' }}
  >
    <span style={{ fontSize: 13, color: 'var(--t-faint)', fontWeight: 600 }}>
      {selected.size} green item{selected.size !== 1 ? 's' : ''} selected
    </span>
    <button
      onClick={handleBatchApprove}
      disabled={approving}
      style={{ background: 'var(--t-primary)', color: '#fff', border: 0, borderRadius: 9, padding: '8px 18px', fontSize: 13, fontWeight: 700, cursor: approving ? 'not-allowed' : 'pointer', opacity: approving ? 0.7 : 1, fontFamily: 'inherit' }}
    >
      {approving ? 'Approving…' : `Approve Selected (${selected.size})`}
    </button>
  </div>
)}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
cd frontend && npx jest SubmitTab.test --no-coverage
```

Expected: PASS — all tests pass.

- [ ] **Step 5: Run full test suite to check for regressions**

```bash
cd frontend && npx jest --no-coverage
```

Expected: all tests pass.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/components/upload/SubmitTab.tsx \
        frontend/src/components/upload/__tests__/SubmitTab.test.tsx
git commit -m "feat: add batch approve checkboxes and bottom bar to SubmitTab"
```
