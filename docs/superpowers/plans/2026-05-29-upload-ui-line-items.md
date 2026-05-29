# Upload UI — Multi-Line Transaction Support Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign the client upload page and documents page to display multi-line transaction data produced by the new `transaction_lines` backend (see `handoff.md` Steps 1–5).

**Architecture:** A new shared `DocumentsTable` component replaces the card list on the Documents page and the progress-card section on the Upload page. A new `DocumentDetailModal` (centered Dialog) opens on row click, replacing the old route-based detail page and `UploadDocumentModal`. `ManualEntryForm` is fully rewritten to collect multiple description+amount lines under one document instead of one-line-per-submit.

**Tech Stack:** Next.js 14 App Router, TypeScript, shadcn/ui (`Dialog`, `Badge`, `Button`, `Input`), TanStack Query, existing `useDocumentStatus` hook, existing `getSignedUrl` and `getDocumentStatus` API calls.

**Pre-requisite:** Backend `handoff.md` Steps 1–5 must be deployed before these frontend tasks are tested end-to-end. The `POST /api/documents/manual` endpoint must also be updated to accept `{ declared_type, date, payment_method, lines: [{ description, amount }] }` and return `{ documentId }` (single document).

---

## File Map

| File | Action |
|---|---|
| `frontend/src/types/document.ts` | Modify — add `TransactionLine`, extend `Document` |
| `frontend/src/lib/api/documents.ts` | Modify — add `createManualEntry`, keep `createManualEntries` for now |
| `frontend/src/components/upload/ManualEntryForm.tsx` | Rewrite |
| `frontend/src/components/documents/DocumentsTable.tsx` | Create |
| `frontend/src/components/documents/DocumentDetailModal.tsx` | Create |
| `frontend/src/app/client/upload/page.tsx` | Modify — swap modal, update columns |
| `frontend/src/app/client/documents/page.tsx` | Modify — swap card list for table + modal |
| `frontend/src/components/upload/UploadDocumentModal.tsx` | Delete |
| `frontend/src/app/client/documents/[id]/page.tsx` | Delete |

---

## Task 1 — Extend the Document type

**Files:**
- Modify: `frontend/src/types/document.ts`

- [ ] **Step 1: Add `TransactionLine` interface and extend `Document`**

Replace the contents of `frontend/src/types/document.ts` with:

```typescript
export type DocumentStatus = 'PROCESSING' | 'PARKED' | 'APPROVED' | 'RETURNED' | 'REJECTED'
export type FlagColor = 'RED' | 'YELLOW' | 'GREEN'
export type DeclaredType = 'income' | 'expense'

export interface TransactionLine {
  id: string
  accountCode: string | null
  accountName: string | null
  type: 'income' | 'expense'
  category: string | null
  amount: number
  description: string | null
}

export interface Document {
  id: string
  companyId: string
  declaredType: DeclaredType
  status: DocumentStatus
  flag: FlagColor | null
  anomalyReasons: string[]
  merchantName: string | null
  date: string | null
  amount: number | null
  vatAmount: number | null
  category: string | null
  paymentMethod: string | null
  imageUrl: string
  isNoReceipt: boolean
  isOcrFailed: boolean
  returnNote: string | null
  rejectionReason: string | null
  expiresAt: string | null
  refNumber: string | null
  note: string | null
  inflow: number
  outflow: number
  transactionLines: TransactionLine[]
  createdAt: string
  updatedAt: string
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd frontend && npx tsc --noEmit
```

Expected: no errors related to `document.ts`. Other pre-existing errors are okay.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/types/document.ts
git commit -m "feat: extend Document type with transactionLines, inflow, outflow"
```

---

## Task 2 — Add `createManualEntry` API function

**Files:**
- Modify: `frontend/src/lib/api/documents.ts`

- [ ] **Step 1: Add the new function below the existing `createManualEntries`**

Add this to the bottom of `frontend/src/lib/api/documents.ts`:

```typescript
export interface ManualEntryLine {
  description: string
  amount: number
}

export async function createManualEntry(payload: {
  declaredType: DeclaredType
  date: string
  paymentMethod: string
  lines: ManualEntryLine[]
}): Promise<{ documentId: string }> {
  const { data } = await api.post<{ documentId: string }>('/documents/manual', {
    declared_type:  payload.declaredType,
    date:           payload.date,
    payment_method: payload.paymentMethod,
    lines:          payload.lines.map((l) => ({
      description: l.description,
      amount:      l.amount,
    })),
  })
  return data
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd frontend && npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/lib/api/documents.ts
git commit -m "feat: add createManualEntry API (single doc, multi-line)"
```

---

## Task 3 — Rewrite ManualEntryForm

**Files:**
- Rewrite: `frontend/src/components/upload/ManualEntryForm.tsx`

The new form collects all lines under a single document. Key behaviors:
- Type toggle (EXPENSE / INCOME) applies to the whole document.
- Date and Payment method are shared.
- Lines: description input + amount input per row. Always one trailing dashed empty row at the bottom — typing in it promotes it to filled and creates a new empty one. No separate "+ Add" button.
- Delete (×) appears on filled rows only.
- Submit disabled until at least one line has a non-empty description and amount > 0.
- On submit: calls `createManualEntry`, then `onSuccess(documentId)`.

- [ ] **Step 1: Replace the full file**

```typescript
'use client'

import { useState, useCallback } from 'react'
import { createManualEntry } from '@/lib/api/documents'
import { cn } from '@/lib/utils'
import type { DeclaredType } from '@/types/document'

interface Line {
  id: number
  description: string
  amount: string
}

interface Props {
  open: boolean
  onClose: () => void
  onSuccess: (documentId: string) => void
}

const today = () => new Date().toISOString().split('T')[0]

const emptyLine = (id: number): Line => ({ id, description: '', amount: '' })

export function ManualEntryForm({ open, onClose, onSuccess }: Props) {
  const [type, setType]               = useState<DeclaredType>('expense')
  const [date, setDate]               = useState(today())
  const [paymentMethod, setPaymentMethod] = useState('Cash')
  const [lines, setLines]             = useState<Line[]>([emptyLine(1)])
  const [nextId, setNextId]           = useState(2)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const filledLines = lines.filter((l) => l.description.trim() !== '' && parseFloat(l.amount) > 0)
  const total = filledLines.reduce((sum, l) => sum + parseFloat(l.amount), 0)
  const canSubmit = filledLines.length > 0 && !isSubmitting

  const fmt = (n: number) =>
    '₱' + n.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

  const isTrailing = (line: Line) =>
    line.description.trim() === '' && (line.amount === '' || parseFloat(line.amount) === 0)

  const updateLine = useCallback((id: number, field: keyof Omit<Line, 'id'>, value: string) => {
    setLines((prev) => {
      const updated = prev.map((l) => (l.id === id ? { ...l, [field]: value } : l))
      const last = updated[updated.length - 1]
      if (!isTrailing(last)) {
        const newId = nextId
        setNextId((n) => n + 1)
        return [...updated, emptyLine(newId)]
      }
      return updated
    })
  }, [nextId])

  const deleteLine = useCallback((id: number) => {
    setLines((prev) => {
      const filtered = prev.filter((l) => l.id !== id)
      if (filtered.length === 0) return [emptyLine(nextId)]
      const last = filtered[filtered.length - 1]
      if (!isTrailing(last)) {
        const newId = nextId
        setNextId((n) => n + 1)
        return [...filtered, emptyLine(newId)]
      }
      return filtered
    })
  }, [nextId])

  function handleClose() {
    setType('expense')
    setDate(today())
    setPaymentMethod('Cash')
    setLines([emptyLine(1)])
    setNextId(2)
    setIsSubmitting(false)
    onClose()
  }

  async function handleSubmit() {
    if (!canSubmit) return
    setIsSubmitting(true)
    try {
      const { documentId } = await createManualEntry({
        declaredType:  type,
        date,
        paymentMethod,
        lines: filledLines.map((l) => ({
          description: l.description.trim(),
          amount:      parseFloat(l.amount),
        })),
      })
      handleClose()
      onSuccess(documentId)
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!open) return null

  const isExpense = type === 'expense'
  const accentCls = isExpense ? 'bg-red-600 hover:bg-red-700' : 'bg-green-600 hover:bg-green-700'
  const totalCls  = isExpense ? 'text-red-600' : 'text-green-600'
  const totalBg   = isExpense ? 'bg-red-50 border-red-200' : 'bg-green-50 border-green-200'

  return (
    <div
      className="fixed inset-0 bg-black/40 z-50 flex items-end sm:items-center justify-center"
      onClick={(e) => { if (e.target === e.currentTarget) handleClose() }}
    >
      <div className="bg-white rounded-t-2xl sm:rounded-2xl w-full sm:max-w-[480px] max-h-[92vh] overflow-y-auto shadow-2xl">

        {/* Sheet handle (mobile) */}
        <div className="flex justify-center pt-3 pb-1 sm:hidden">
          <div className="w-9 h-1 bg-gray-300 rounded-full" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-4 pb-3">
          <div className="text-[15px] font-bold text-gray-900">Manual Entry</div>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 text-xl leading-none"
          >
            ×
          </button>
        </div>

        <div className="px-5 pb-6 space-y-4">

          {/* Type toggle */}
          <div className="grid grid-cols-2 gap-2">
            {(['expense', 'income'] as DeclaredType[]).map((t) => {
              const active = type === t
              const cls = t === 'expense'
                ? active ? 'bg-red-50 border-red-500 text-red-700 font-bold' : 'border-gray-200 text-gray-400'
                : active ? 'bg-green-50 border-green-500 text-green-700 font-bold' : 'border-gray-200 text-gray-400'
              return (
                <button
                  key={t}
                  type="button"
                  onClick={() => setType(t)}
                  className={cn('py-2 text-sm border-[1.5px] rounded-lg transition-colors', cls)}
                >
                  {t === 'expense' ? 'EXPENSE' : 'INCOME'}
                </button>
              )
            })}
          </div>

          {/* Date + Payment */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide mb-1">Date</div>
              <input
                type="date"
                value={date}
                max={today()}
                onChange={(e) => setDate(e.target.value)}
                className="w-full border-[1.5px] border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 outline-none focus:border-indigo-300 transition-colors"
              />
            </div>
            <div>
              <div className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide mb-1">Payment</div>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                className="w-full border-[1.5px] border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 bg-white outline-none focus:border-indigo-300 transition-colors"
              >
                {['Cash', 'GCash', 'Maya', 'Bank'].map((m) => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Lines label */}
          <div className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide">
            {isExpense ? 'What did you spend on?' : 'What did you earn from?'}
          </div>

          {/* Line rows */}
          <div className="space-y-2">
            {lines.map((line) => {
              const trailing = isTrailing(line)
              return (
                <div key={line.id} className="flex items-center gap-2">
                  <input
                    type="text"
                    value={line.description}
                    onChange={(e) => updateLine(line.id, 'description', e.target.value)}
                    placeholder={trailing ? 'Add another…' : 'Describe the item…'}
                    className={cn(
                      'flex-1 border-[1.5px] rounded-lg px-3 py-2 text-sm text-gray-900 placeholder-gray-300 outline-none focus:border-indigo-300 transition-colors',
                      trailing ? 'border-dashed border-gray-200' : 'border-gray-200'
                    )}
                  />
                  <input
                    type="number"
                    inputMode="decimal"
                    min="0"
                    step="0.01"
                    value={line.amount}
                    onChange={(e) => updateLine(line.id, 'amount', e.target.value)}
                    placeholder="0.00"
                    className={cn(
                      'w-24 border-[1.5px] rounded-lg px-3 py-2 text-sm text-right text-gray-900 placeholder-gray-300 outline-none focus:border-indigo-300 transition-colors',
                      trailing ? 'border-dashed border-gray-200' : 'border-gray-200'
                    )}
                  />
                  {!trailing ? (
                    <button
                      type="button"
                      onClick={() => deleteLine(line.id)}
                      className="text-gray-300 hover:text-red-500 transition-colors text-base w-5 shrink-0"
                    >
                      ×
                    </button>
                  ) : (
                    <div className="w-5 shrink-0" />
                  )}
                </div>
              )
            })}
          </div>

          {/* Total */}
          {filledLines.length > 0 && (
            <div className={cn('flex justify-between items-center px-3 py-2.5 rounded-lg border', totalBg)}>
              <span className="text-xs font-semibold text-gray-700">Total</span>
              <span className={cn('text-base font-bold', totalCls)}>{fmt(total)}</span>
            </div>
          )}

          <p className="text-[11px] text-gray-400 italic">AI will assign account codes automatically.</p>

          {/* Submit */}
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!canSubmit}
            className={cn(
              'w-full py-2.5 text-sm font-bold rounded-lg text-white transition-colors',
              canSubmit ? accentCls : 'bg-gray-200 text-gray-400 cursor-not-allowed'
            )}
          >
            {isSubmitting ? 'Submitting…' : 'Submit Entry'}
          </button>

        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd frontend && npx tsc --noEmit
```

- [ ] **Step 3: Test manually**

Start the dev server (`npm run dev` in `frontend/`). Open the upload page. Click "No Receipt / Manual Entry". Verify:
- Type toggle switches between EXPENSE (red) and INCOME (green)
- Typing in any row + amount automatically creates a new empty trailing row
- Deleting a filled row preserves the trailing empty row
- Submit button stays disabled until at least one row has description + amount
- On submit, a single `POST /api/documents/manual` fires with `{ declared_type, date, payment_method, lines: [...] }`

- [ ] **Step 4: Commit**

```bash
git add frontend/src/components/upload/ManualEntryForm.tsx
git commit -m "feat: rewrite ManualEntryForm — multi-line description-first UX"
```

---

## Task 4 — Create DocumentsTable component

**Files:**
- Create: `frontend/src/components/documents/DocumentsTable.tsx`

This shared table is used on both the Upload page and the Documents page. It renders Reference · Source · Uploaded · Inflow · Outflow · Status · Note and calls `onRowClick(doc)` on click.

- [ ] **Step 1: Create the file**

```typescript
'use client'

import { cn } from '@/lib/utils'
import { formatCurrency } from '@/lib/utils/formatCurrency'
import { formatDate } from '@/lib/utils/formatDate'
import type { Document, DocumentStatus } from '@/types/document'

const STATUS_BADGE: Record<DocumentStatus, { label: string; cls: string }> = {
  PROCESSING: { label: 'Processing', cls: 'bg-gray-100 text-gray-600' },
  PARKED:     { label: 'In Review',  cls: 'bg-yellow-100 text-yellow-700' },
  RETURNED:   { label: 'Returned',   cls: 'bg-red-100 text-red-700' },
  APPROVED:   { label: 'Approved',   cls: 'bg-green-100 text-green-700' },
  REJECTED:   { label: 'Rejected',   cls: 'bg-gray-100 text-gray-500' },
}

function noteText(doc: Document): { text: string; cls: string } {
  if (doc.status === 'RETURNED' && doc.returnNote) {
    const truncated = doc.returnNote.length > 50
      ? doc.returnNote.slice(0, 50) + '…'
      : doc.returnNote
    return { text: truncated, cls: 'text-red-600' }
  }
  if (doc.status === 'REJECTED' && doc.rejectionReason) {
    const truncated = doc.rejectionReason.length > 50
      ? doc.rejectionReason.slice(0, 50) + '…'
      : doc.rejectionReason
    return { text: truncated, cls: 'text-gray-500' }
  }
  if (doc.status === 'PARKED') return { text: 'Awaiting accountant review', cls: 'text-gray-400' }
  if (doc.status === 'PROCESSING') return { text: 'Processing…', cls: 'text-gray-400 italic' }
  return { text: '', cls: '' }
}

interface Props {
  docs: Document[]
  onRowClick: (doc: Document) => void
  title?: string
  subtitle?: string
}

export function DocumentsTable({ docs, onRowClick, title = 'Documents', subtitle }: Props) {
  if (docs.length === 0) return null

  return (
    <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
        <div className="text-sm font-semibold text-gray-900">{title}</div>
        {subtitle && <div className="text-xs text-gray-400">{subtitle}</div>}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-xs">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              {['Reference', 'Source', 'Uploaded', 'Inflow', 'Outflow', 'Status', 'Note'].map((h) => (
                <th
                  key={h}
                  className={cn(
                    'px-3.5 py-2 text-[10px] font-bold text-gray-500 uppercase tracking-wide whitespace-nowrap',
                    h === 'Inflow' || h === 'Outflow' ? 'text-right' : 'text-left'
                  )}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {docs.map((doc, i) => {
              const { label, cls } = STATUS_BADGE[doc.status]
              const { text: note, cls: noteCls } = noteText(doc)
              const ref = doc.refNumber ?? `#${doc.id.slice(0, 8)}`
              const isProcessing = doc.status === 'PROCESSING'

              return (
                <tr
                  key={doc.id}
                  onClick={() => onRowClick(doc)}
                  className={cn(
                    'cursor-pointer transition-colors hover:bg-gray-50',
                    i < docs.length - 1 ? 'border-b border-gray-100' : ''
                  )}
                >
                  {/* Reference */}
                  <td className="px-3.5 py-2.5 font-medium text-gray-900 whitespace-nowrap">
                    {ref}
                  </td>

                  {/* Source */}
                  <td className="px-3.5 py-2.5">
                    <span className={cn(
                      'inline-flex items-center text-[10px] font-semibold px-1.5 py-0.5 rounded',
                      doc.isNoReceipt
                        ? 'bg-blue-100 text-blue-700'
                        : 'bg-gray-100 text-gray-600'
                    )}>
                      {doc.isNoReceipt ? 'Manual' : 'Upload'}
                    </span>
                  </td>

                  {/* Uploaded */}
                  <td className="px-3.5 py-2.5 text-gray-500 whitespace-nowrap">
                    {formatDate(doc.createdAt)}
                  </td>

                  {/* Inflow */}
                  <td className="px-3.5 py-2.5 text-right font-semibold whitespace-nowrap">
                    {!isProcessing && doc.inflow > 0
                      ? <span className="text-green-600">{formatCurrency(doc.inflow)}</span>
                      : <span className="text-gray-300">—</span>
                    }
                  </td>

                  {/* Outflow */}
                  <td className="px-3.5 py-2.5 text-right font-semibold whitespace-nowrap">
                    {!isProcessing && doc.outflow > 0
                      ? <span className="text-red-500">{formatCurrency(doc.outflow)}</span>
                      : <span className="text-gray-300">—</span>
                    }
                  </td>

                  {/* Status */}
                  <td className="px-3.5 py-2.5">
                    <span className={`inline-flex items-center text-[10px] font-semibold px-1.5 py-0.5 rounded ${cls}`}>
                      {label}
                    </span>
                  </td>

                  {/* Note */}
                  <td className={cn('px-3.5 py-2.5 max-w-[200px] truncate', noteCls)}>
                    {note}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Check `formatCurrency` and `formatDate` signatures**

Open `frontend/src/lib/utils/formatCurrency.ts` and `frontend/src/lib/utils/formatDate.ts`. Confirm they accept a `number` and `string` respectively and return a `string`. If `formatDate` formats to something other than `DD MMM`, adjust the call above or pass the date through `new Date(doc.createdAt).toLocaleDateString('en-PH', { month: 'short', day: 'numeric' })` directly.

- [ ] **Step 3: Verify TypeScript compiles**

```bash
cd frontend && npx tsc --noEmit
```

- [ ] **Step 4: Commit**

```bash
git add frontend/src/components/documents/DocumentsTable.tsx
git commit -m "feat: add shared DocumentsTable component"
```

---

## Task 5 — Create DocumentDetailModal

**Files:**
- Create: `frontend/src/components/documents/DocumentDetailModal.tsx`

This centered Dialog covers all 5 status states. It uses the existing `useDocumentStatus` hook for live pipeline updates (Processing state) and `getSignedUrl` for the receipt image.

- [ ] **Step 1: Create the file**

```typescript
'use client'

import { useEffect, useState } from 'react'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { useDocumentStatus } from '@/lib/hooks/useDocumentStatus'
import { getSignedUrl, getDocumentStatus } from '@/lib/api/documents'
import { formatCurrency } from '@/lib/utils/formatCurrency'
import { cn } from '@/lib/utils'
import type { Document } from '@/types/document'

// Pipeline steps in order — used to render the Processing step list
const PIPELINE_STEPS = [
  { key: 'uploading',     label: 'Uploaded' },
  { key: 'preprocessing', label: 'Preparing image' },
  { key: 'ocr',           label: 'Reading receipt' },
  { key: 'ai',            label: 'Categorizing' },
  { key: 'anomaly_check', label: 'Checking for issues' },
]
const STEP_ORDER = PIPELINE_STEPS.map((s) => s.key)

function stepStatus(stepKey: string, currentStage: string): 'done' | 'active' | 'pending' {
  const si = STEP_ORDER.indexOf(stepKey)
  const ci = STEP_ORDER.indexOf(currentStage)
  if (ci === -1) return si < STEP_ORDER.length - 1 ? 'done' : 'pending' // stage=parked → all done
  if (si < ci) return 'done'
  if (si === ci) return 'active'
  return 'pending'
}

function MetaLine({ doc }: { doc: Document }) {
  const parts = [
    doc.date ?? doc.createdAt.slice(0, 10),
    doc.paymentMethod,
    doc.isNoReceipt ? 'Manual Entry' : 'Upload',
    doc.declaredType === 'income' ? 'Income' : 'Expense',
  ].filter(Boolean)
  return <div className="text-[11px] text-gray-500 mt-0.5">{parts.join(' · ')}</div>
}

function StatusBadge({ status }: { status: Document['status'] }) {
  const map: Record<Document['status'], { label: string; cls: string }> = {
    PROCESSING: { label: 'Processing', cls: 'bg-gray-100 text-gray-600' },
    PARKED:     { label: 'In Review',  cls: 'bg-yellow-100 text-yellow-700' },
    RETURNED:   { label: 'Returned',   cls: 'bg-red-100 text-red-700' },
    APPROVED:   { label: 'Approved',   cls: 'bg-green-100 text-green-700' },
    REJECTED:   { label: 'Rejected',   cls: 'bg-gray-100 text-gray-500' },
  }
  const { label, cls } = map[status]
  return (
    <span className={`inline-flex items-center text-[10px] font-semibold px-2 py-0.5 rounded-full ${cls}`}>
      {label}
    </span>
  )
}

function ReceiptImage({ doc }: { doc: Document }) {
  const [url, setUrl] = useState<string | null>(null)

  useEffect(() => {
    if (doc.isNoReceipt) return
    getSignedUrl(doc.id).then(({ url }) => setUrl(url))
  }, [doc.id, doc.isNoReceipt])

  if (doc.isNoReceipt) {
    return (
      <div className="bg-gray-50 border border-dashed border-gray-200 rounded-lg py-5 text-center">
        <div className="text-2xl mb-1">📋</div>
        <div className="text-[11px] text-gray-400">Manual Entry — no receipt</div>
      </div>
    )
  }

  if (url) {
    return (
      <img
        src={url}
        alt="Receipt"
        className="w-full rounded-lg border border-gray-200 object-contain max-h-48"
      />
    )
  }

  return (
    <div className="bg-gray-100 rounded-lg h-28 flex items-center justify-center border border-gray-200">
      <div className="text-2xl">🧾</div>
    </div>
  )
}

function TransactionLinesTable({ doc }: { doc: Document }) {
  const isExpense = doc.declaredType === 'expense'
  const descHeader = doc.isNoReceipt ? 'Your Description' : 'Description'
  const totalLabel = isExpense ? 'Total Expense' : 'Total Income'
  const totalCls   = isExpense ? 'text-red-600' : 'text-green-600'
  const total      = isExpense ? doc.outflow : doc.inflow

  if (!doc.transactionLines || doc.transactionLines.length === 0) return null

  return (
    <div>
      <div className="text-[10px] font-bold text-gray-500 uppercase tracking-wide mb-1.5">
        Transaction Lines
      </div>
      <div className="border border-gray-200 rounded-lg overflow-hidden">
        <table className="w-full border-collapse text-xs">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="px-3 py-1.5 text-left text-[9px] font-bold text-gray-400 uppercase">{descHeader}</th>
              <th className="px-3 py-1.5 text-left text-[9px] font-bold text-gray-400 uppercase">AI Category</th>
              <th className="px-3 py-1.5 text-right text-[9px] font-bold text-gray-400 uppercase">Amount</th>
            </tr>
          </thead>
          <tbody>
            {doc.transactionLines.map((line) => (
              <tr key={line.id} className="border-t border-gray-100">
                <td className="px-3 py-2 text-gray-700">{line.description ?? '—'}</td>
                <td className="px-3 py-2">
                  <span className="bg-gray-100 text-gray-500 text-[10px] px-1.5 py-0.5 rounded">
                    {line.category ?? line.accountName ?? '—'}
                  </span>
                </td>
                <td className="px-3 py-2 text-right font-semibold text-gray-800">
                  {formatCurrency(line.amount)}
                </td>
              </tr>
            ))}
            <tr className="border-t-2 border-gray-200 bg-gray-50">
              <td colSpan={2} className="px-3 py-2 text-xs font-bold text-gray-700">{totalLabel}</td>
              <td className={cn('px-3 py-2 text-right text-sm font-bold', totalCls)}>
                {formatCurrency(total)}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  )
}

function ProcessingBody({ doc }: { doc: Document }) {
  const { stage } = useDocumentStatus(doc.id)
  return (
    <div className="space-y-3">
      <ReceiptImage doc={doc} />
      <div className="border border-gray-200 rounded-lg overflow-hidden">
        {PIPELINE_STEPS.map((step) => {
          const s = stepStatus(step.key, stage)
          return (
            <div
              key={step.key}
              className="flex items-center gap-3 px-4 py-2.5 border-b border-gray-100 last:border-b-0"
            >
              {s === 'done'   && <span className="text-green-500 text-sm">✓</span>}
              {s === 'active' && (
                <div className="w-3.5 h-3.5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
              )}
              {s === 'pending' && <div className="w-3.5 h-3.5 border-2 border-gray-200 rounded-full" />}
              <span className={cn(
                'text-xs',
                s === 'done'    ? 'text-gray-500' :
                s === 'active'  ? 'text-indigo-600 font-semibold' :
                                  'text-gray-300'
              )}>
                {step.label}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function ExpiryCountdown({ expiresAt }: { expiresAt: string }) {
  const days = Math.ceil((new Date(expiresAt).getTime() - Date.now()) / 86_400_000)
  return (
    <span className={cn('text-xs', days < 3 ? 'text-red-600 font-semibold' : 'text-gray-500')}>
      Expires in {days} day{days !== 1 ? 's' : ''}
    </span>
  )
}

interface Props {
  doc: Document | null
  onClose: () => void
  onReupload: (file: File) => void
}

export function DocumentDetailModal({ doc, onClose, onReupload }: Props) {
  if (!doc) return null

  function handleReuploadClick() {
    const input = Object.assign(document.createElement('input'), { type: 'file', accept: 'image/*,.pdf' })
    input.onchange = () => {
      const file = input.files?.[0]
      if (file) onReupload(file)
    }
    input.click()
  }

  const ref = doc.refNumber ?? `#${doc.id.slice(0, 8)}`

  return (
    <Dialog open={!!doc} onOpenChange={(open) => { if (!open) onClose() }}>
      <DialogContent className="sm:max-w-md p-0 gap-0 overflow-hidden">

        {/* Modal header */}
        <div className="flex items-start justify-between px-5 pt-5 pb-4 border-b border-gray-100">
          <div>
            <div className="text-[15px] font-bold text-gray-900">{ref}</div>
            <MetaLine doc={doc} />
          </div>
          <StatusBadge status={doc.status} />
        </div>

        {/* Modal body */}
        <div className="px-5 py-4 space-y-4 overflow-y-auto max-h-[65vh]">

          {doc.status === 'PROCESSING' && <ProcessingBody doc={doc} />}

          {doc.status === 'PARKED' && (
            <>
              <ReceiptImage doc={doc} />
              <TransactionLinesTable doc={doc} />
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg px-4 py-3 text-xs text-yellow-800">
                ⏳ Your accountant is reviewing this entry.
              </div>
            </>
          )}

          {doc.status === 'RETURNED' && (
            <>
              {doc.returnNote && (
                <div className="bg-red-50 border-[1.5px] border-red-300 rounded-lg px-4 py-3">
                  <div className="text-[10px] font-bold text-red-600 uppercase mb-1">Accountant Note</div>
                  <div className="text-xs text-gray-700 leading-relaxed">{doc.returnNote}</div>
                </div>
              )}
              <ReceiptImage doc={doc} />
              <div className="opacity-50 pointer-events-none">
                <TransactionLinesTable doc={doc} />
              </div>
              <div className="flex items-center justify-between gap-3">
                <button
                  onClick={handleReuploadClick}
                  className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold py-2.5 rounded-lg transition-colors"
                >
                  Re-upload Document
                </button>
                {doc.expiresAt && <ExpiryCountdown expiresAt={doc.expiresAt} />}
              </div>
            </>
          )}

          {doc.status === 'REJECTED' && (
            <>
              {doc.rejectionReason && (
                <div className="bg-gray-50 border border-gray-200 rounded-lg px-4 py-3">
                  <div className="text-[10px] font-bold text-gray-500 uppercase mb-1">Rejection Reason</div>
                  <div className="text-xs text-gray-700 leading-relaxed">{doc.rejectionReason}</div>
                </div>
              )}
              <ReceiptImage doc={doc} />
              <div className="opacity-50 pointer-events-none">
                <TransactionLinesTable doc={doc} />
              </div>
              <div className="bg-gray-50 border border-gray-200 rounded-lg px-4 py-2.5 text-xs text-gray-500 text-center">
                This document has been permanently excluded from your books.
              </div>
            </>
          )}

          {doc.status === 'APPROVED' && (
            <>
              <ReceiptImage doc={doc} />
              <TransactionLinesTable doc={doc} />
              <div className="bg-green-50 border border-green-200 rounded-lg px-4 py-3 text-xs text-green-800">
                ✅ Approved and posted to your books.
              </div>
            </>
          )}

        </div>
      </DialogContent>
    </Dialog>
  )
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd frontend && npx tsc --noEmit
```

Fix any import errors (e.g. `Dialog` and `DialogContent` path).

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/documents/DocumentDetailModal.tsx
git commit -m "feat: add DocumentDetailModal — all 5 status states"
```

---

## Task 6 — Update the Upload page

**Files:**
- Modify: `frontend/src/app/client/upload/page.tsx`

Replace the existing in-progress table and `UploadDocumentModal` with `DocumentsTable` + `DocumentDetailModal`.

- [ ] **Step 1: Replace the file**

```typescript
'use client'

import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { TwoAreaUpload } from '@/components/upload/TwoAreaUpload'
import { DocumentsTable } from '@/components/documents/DocumentsTable'
import { DocumentDetailModal } from '@/components/documents/DocumentDetailModal'
import { uploadDocument, getDocuments, reuploadDocument } from '@/lib/api/documents'
import { useToast } from '@/hooks/use-toast'
import type { DeclaredType, Document } from '@/types/document'

export default function UploadPage() {
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const [selectedDoc, setSelectedDoc] = useState<Document | null>(null)

  const { data: allDocs = [] } = useQuery({
    queryKey: ['client-documents-upload'],
    queryFn: () => getDocuments(),
    refetchInterval: 8000,
  })

  const now = new Date()
  const thisMonth = allDocs.filter((d) => {
    const c = new Date(d.createdAt)
    return c.getMonth() === now.getMonth() && c.getFullYear() === now.getFullYear()
  })
  const incomeCount  = thisMonth.filter((d) => d.declaredType === 'income').length
  const expenseCount = thisMonth.filter((d) => d.declaredType === 'expense').length

  // Upload page shows only actionable items — not Approved
  const inProgress = allDocs.filter((d) =>
    ['PROCESSING', 'PARKED', 'RETURNED'].includes(d.status)
  )

  async function handleUpload(file: File, declaredType: DeclaredType) {
    try {
      await uploadDocument(file, declaredType)
      queryClient.invalidateQueries({ queryKey: ['client-documents-upload'] })
    } catch {
      toast({ title: 'Upload failed', description: 'Please try again.', variant: 'destructive' })
    }
  }

  function handleManualSuccess(_documentId: string) {
    queryClient.invalidateQueries({ queryKey: ['client-documents-upload'] })
    toast({ title: 'Entry submitted — processing…' })
  }

  async function handleReupload(file: File) {
    if (!selectedDoc) return
    const docId = selectedDoc.id
    setSelectedDoc(null)
    try {
      await reuploadDocument(docId, file)
      queryClient.invalidateQueries({ queryKey: ['client-documents-upload'] })
      toast({ title: 'Re-uploaded — processing your document…' })
    } catch {
      toast({ title: 'Re-upload failed', description: 'Please try again.', variant: 'destructive' })
    }
  }

  return (
    <div className="space-y-5">
      <div>
        <div className="text-lg font-bold text-gray-900 tracking-tight mb-0.5">Upload Documents</div>
        <div className="text-xs text-gray-400">Drop files into the correct zone below</div>
      </div>

      <TwoAreaUpload
        onUpload={handleUpload}
        onManualSuccess={handleManualSuccess}
        incomeCount={incomeCount}
        expenseCount={expenseCount}
      />

      <DocumentsTable
        docs={inProgress}
        onRowClick={setSelectedDoc}
        title="In Progress"
        subtitle="Posted items removed automatically · Click a row for details"
      />

      <DocumentDetailModal
        doc={selectedDoc}
        onClose={() => setSelectedDoc(null)}
        onReupload={handleReupload}
      />
    </div>
  )
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd frontend && npx tsc --noEmit
```

- [ ] **Step 3: Smoke-test manually**

Open the upload page. Verify the In Progress section renders the table with the correct columns (Reference, Source, Uploaded, Inflow, Outflow, Status, Note). Click a row — the centered modal opens. The upload zones and Manual Entry link still work.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/app/client/upload/page.tsx
git commit -m "feat: upload page — use DocumentsTable + DocumentDetailModal"
```

---

## Task 7 — Update the Documents page

**Files:**
- Modify: `frontend/src/app/client/documents/page.tsx`

Replace the `DocumentCard` list and `router.push` navigation with `DocumentsTable` + `DocumentDetailModal`.

- [ ] **Step 1: Replace the file**

```typescript
'use client'

import { useState, Suspense } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useSearchParams, useRouter } from 'next/navigation'
import { getDocuments, reuploadDocument } from '@/lib/api/documents'
import { DocumentsTable } from '@/components/documents/DocumentsTable'
import { DocumentDetailModal } from '@/components/documents/DocumentDetailModal'
import { EmptyState } from '@/components/shared/EmptyState'
import { Skeleton } from '@/components/ui/skeleton'
import { useToast } from '@/hooks/use-toast'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { useQueryClient } from '@tanstack/react-query'
import type { Document } from '@/types/document'

function DocumentsContent() {
  const router        = useRouter()
  const searchParams  = useSearchParams()
  const queryClient   = useQueryClient()
  const { toast }     = useToast()
  const [selectedDoc, setSelectedDoc] = useState<Document | null>(null)

  const status = searchParams.get('status') ?? ''
  const type   = searchParams.get('type')   ?? ''
  const start  = searchParams.get('start')  ?? ''
  const end    = searchParams.get('end')    ?? ''

  const { data: docs, isLoading } = useQuery({
    queryKey: ['client-docs', status, type, start, end],
    queryFn:  () => getDocuments({ status: status || undefined, type: type || undefined, start: start || undefined, end: end || undefined }),
  })

  function setParam(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString())
    if (value) params.set(key, value)
    else params.delete(key)
    router.push(`/client/documents?${params.toString()}`)
  }

  async function handleReupload(file: File) {
    if (!selectedDoc) return
    const docId = selectedDoc.id
    setSelectedDoc(null)
    try {
      await reuploadDocument(docId, file)
      queryClient.invalidateQueries({ queryKey: ['client-docs', status, type, start, end] })
      toast({ title: 'Re-uploaded — processing your document…' })
    } catch {
      toast({ title: 'Re-upload failed', description: 'Please try again.', variant: 'destructive' })
    }
  }

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Documents</h1>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <Select value={status} onValueChange={(v) => setParam('status', v === 'all' ? '' : v)}>
          <SelectTrigger className="w-36"><SelectValue placeholder="All Statuses" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="PROCESSING">Processing</SelectItem>
            <SelectItem value="PARKED">In Review</SelectItem>
            <SelectItem value="APPROVED">Approved</SelectItem>
            <SelectItem value="RETURNED">Returned</SelectItem>
            <SelectItem value="REJECTED">Rejected</SelectItem>
          </SelectContent>
        </Select>

        <Select value={type} onValueChange={(v) => setParam('type', v === 'all' ? '' : v)}>
          <SelectTrigger className="w-32"><SelectValue placeholder="All Types" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="income">Income</SelectItem>
            <SelectItem value="expense">Expenses</SelectItem>
          </SelectContent>
        </Select>

        <Input type="date" value={start} onChange={(e) => setParam('start', e.target.value)} className="w-36" />
        <Input type="date" value={end}   onChange={(e) => setParam('end',   e.target.value)} className="w-36" />
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
        </div>
      ) : !docs || docs.length === 0 ? (
        <EmptyState message="No documents found." />
      ) : (
        <DocumentsTable docs={docs} onRowClick={setSelectedDoc} />
      )}

      <DocumentDetailModal
        doc={selectedDoc}
        onClose={() => setSelectedDoc(null)}
        onReupload={handleReupload}
      />
    </div>
  )
}

export default function DocumentsPage() {
  return (
    <Suspense>
      <DocumentsContent />
    </Suspense>
  )
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd frontend && npx tsc --noEmit
```

- [ ] **Step 3: Smoke-test manually**

Open `/client/documents`. Verify the table renders with all 7 columns. Click a row — modal opens with the correct content for that document's status. Filters still work.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/app/client/documents/page.tsx
git commit -m "feat: documents page — use DocumentsTable + DocumentDetailModal"
```

---

## Task 8 — Delete removed files

**Files to delete:**
- `frontend/src/components/upload/UploadDocumentModal.tsx`
- `frontend/src/app/client/documents/[id]/page.tsx`

- [ ] **Step 1: Verify nothing imports these files**

```bash
cd frontend && grep -r "UploadDocumentModal" src/
cd frontend && grep -r "documents/\[id\]" src/
```

Both commands should return no results after Tasks 6 and 7 are complete.

- [ ] **Step 2: Delete the files**

```bash
rm frontend/src/components/upload/UploadDocumentModal.tsx
rm frontend/src/app/client/documents/[id]/page.tsx
```

- [ ] **Step 3: Verify TypeScript compiles cleanly**

```bash
cd frontend && npx tsc --noEmit
```

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "chore: remove UploadDocumentModal and documents/[id] page (replaced by DocumentDetailModal)"
```

---

## Self-Review Checklist

| Spec requirement | Covered by |
|---|---|
| ManualEntryForm — description-first multi-line | Task 3 |
| ManualEntryForm — trailing empty row, no Add button | Task 3 |
| ManualEntryForm — type toggle colors, total bar | Task 3 |
| ManualEntryForm — submit disabled until 1 valid line | Task 3 |
| DocumentsTable — 7 columns incl. Inflow/Outflow | Task 4 |
| DocumentsTable — Source badge Upload/Manual | Task 4 |
| DocumentsTable — Note column dynamic per status | Task 4 |
| DocumentsTable — Processing rows show — for amounts | Task 4 |
| DocumentDetailModal — Processing pipeline step list | Task 5 |
| DocumentDetailModal — In Review lines table | Task 5 |
| DocumentDetailModal — Returned: note prominent, lines dimmed, re-upload | Task 5 |
| DocumentDetailModal — Rejected: reason, lines dimmed, no action | Task 5 |
| DocumentDetailModal — Approved: lines table, green banner | Task 5 |
| Upload page uses DocumentsTable (inProgress only) | Task 6 |
| Documents page uses DocumentsTable + modal | Task 7 |
| UploadDocumentModal and [id] page removed | Task 8 |
| `Document` type extended with `inflow`, `outflow`, `transactionLines` | Task 1 |
| `createManualEntry` API matches new backend contract | Task 2 |
