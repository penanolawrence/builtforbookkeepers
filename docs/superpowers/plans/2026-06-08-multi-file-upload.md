# Multi-File Receipt Upload Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Allow clients to select and upload multiple receipts at once from either upload zone, confirmed via a single shared-note dialog that uploads files sequentially.

**Architecture:** Four frontend files change, three test files change or are created. `UploadZone` gains `multiple` on its file inputs and fires `onFilesSelect(File[])`. `TwoAreaUpload` passes the array up with the declared type. `upload/page.tsx` accumulates a `pendingFiles` array instead of a single pending file. `ConfirmUploadDialog` is redesigned to show a scrollable file list with a shared note, and uploads all files sequentially on confirm. Backend is untouched — `POST /documents` is called N times.

**Tech Stack:** Next.js 14 App Router, TypeScript, React Testing Library, Jest

---

## File Map

| File | Action |
|---|---|
| `frontend/src/components/upload/UploadZone.tsx` | Modify — multi-select, `onFilesSelect(File[])`, per-file validation |
| `frontend/src/components/upload/__tests__/UploadZone.test.tsx` | Modify — update tests for new prop + multi-select behaviour |
| `frontend/src/components/upload/TwoAreaUpload.tsx` | Modify — update `onFilePicked` prop type |
| `frontend/src/components/upload/__tests__/TwoAreaUpload.test.tsx` | Modify — update tests for new prop signature |
| `frontend/src/components/upload/ConfirmUploadDialog.tsx` | Modify — accept `files[]`, show list, shared note, sequential upload |
| `frontend/src/components/upload/__tests__/ConfirmUploadDialog.test.tsx` | Create — new tests |
| `frontend/src/app/client/upload/page.tsx` | Modify — `pendingFiles` array state, updated handlers and dialog props |

---

## Phase 1 — UploadZone

### Task 1: Update UploadZone tests

**Files:**
- Modify: `frontend/src/components/upload/__tests__/UploadZone.test.tsx`

- [ ] **Step 1: Replace entire test file**

The existing tests reference the old `onFileSelect` (singular) prop and some text strings that don't match the current implementation. Replace with tests that cover the new `onFilesSelect` multi-select behaviour:

```tsx
import { render, screen, fireEvent } from '@testing-library/react'
import { UploadZone } from '../UploadZone'

function wrap(props: Partial<Parameters<typeof UploadZone>[0]> = {}) {
  return render(
    <div data-theme="sofia">
      <UploadZone
        declaredType={props.declaredType ?? 'income'}
        onFilesSelect={props.onFilesSelect ?? jest.fn()}
        count={props.count}
      />
    </div>
  )
}

describe('UploadZone — income', () => {
  it('renders the zone name', () => {
    wrap({ declaredType: 'income' })
    expect(screen.getByText('Income')).toBeInTheDocument()
  })

  it('renders the count badge when count is provided', () => {
    wrap({ declaredType: 'income', count: 5 })
    expect(screen.getByText('5 files')).toBeInTheDocument()
  })

  it('does not render the count badge when count is undefined', () => {
    wrap({ declaredType: 'income' })
    expect(screen.queryByText(/files/)).toBeNull()
  })

  it('renders Browse files and Take photo buttons', () => {
    wrap({ declaredType: 'income' })
    expect(screen.getByText('Browse files')).toBeInTheDocument()
    expect(screen.getByText('Take photo')).toBeInTheDocument()
  })
})

describe('UploadZone — expense', () => {
  it('renders the zone name', () => {
    wrap({ declaredType: 'expense' })
    expect(screen.getByText('Expense')).toBeInTheDocument()
  })

  it('renders the count badge when count is provided', () => {
    wrap({ declaredType: 'expense', count: 10 })
    expect(screen.getByText('10 files')).toBeInTheDocument()
  })
})

describe('UploadZone — multi-file selection', () => {
  it('calls onFilesSelect with array of valid files', () => {
    const onFilesSelect = jest.fn()
    wrap({ declaredType: 'income', onFilesSelect })
    const input = document.querySelector('input[type="file"]:not([capture])') as HTMLInputElement
    const file1 = new File(['a'], 'receipt1.jpg', { type: 'image/jpeg' })
    const file2 = new File(['b'], 'receipt2.png', { type: 'image/png' })
    fireEvent.change(input, { target: { files: [file1, file2] } })
    expect(onFilesSelect).toHaveBeenCalledWith([file1, file2])
  })

  it('calls onFilesSelect with only valid files when some fail validation', () => {
    const onFilesSelect = jest.fn()
    wrap({ declaredType: 'income', onFilesSelect })
    const input = document.querySelector('input[type="file"]:not([capture])') as HTMLInputElement
    const goodFile = new File(['a'], 'receipt.jpg', { type: 'image/jpeg' })
    const badFile = new File(['b'], 'receipt.bmp', { type: 'image/bmp' })
    fireEvent.change(input, { target: { files: [goodFile, badFile] } })
    expect(onFilesSelect).toHaveBeenCalledWith([goodFile])
  })

  it('does not call onFilesSelect when all files fail validation', () => {
    const onFilesSelect = jest.fn()
    wrap({ declaredType: 'income', onFilesSelect })
    const input = document.querySelector('input[type="file"]:not([capture])') as HTMLInputElement
    const badFile = new File(['b'], 'receipt.bmp', { type: 'image/bmp' })
    fireEvent.change(input, { target: { files: [badFile] } })
    expect(onFilesSelect).not.toHaveBeenCalled()
  })

  it('shows a rejection summary when some files are invalid', () => {
    wrap({ declaredType: 'income', onFilesSelect: jest.fn() })
    const input = document.querySelector('input[type="file"]:not([capture])') as HTMLInputElement
    const goodFile = new File(['a'], 'receipt.jpg', { type: 'image/jpeg' })
    const badFile = new File(['b'], 'receipt.bmp', { type: 'image/bmp' })
    fireEvent.change(input, { target: { files: [goodFile, badFile] } })
    expect(screen.getByText(/1 rejected/i)).toBeInTheDocument()
  })

  it('shows a size error when a file exceeds 10MB', () => {
    wrap({ declaredType: 'income', onFilesSelect: jest.fn() })
    const input = document.querySelector('input[type="file"]:not([capture])') as HTMLInputElement
    const bigFile = new File(['x'], 'big.jpg', { type: 'image/jpeg' })
    Object.defineProperty(bigFile, 'size', { value: 11 * 1024 * 1024 })
    fireEvent.change(input, { target: { files: [bigFile] } })
    expect(screen.getByText(/File too large/i)).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
cd frontend && npx jest src/components/upload/__tests__/UploadZone.test.tsx --no-coverage
```

Expected: FAIL — `onFilesSelect` prop does not exist yet; `onFileSelect` mismatch.

---

### Task 2: Update UploadZone implementation

**Files:**
- Modify: `frontend/src/components/upload/UploadZone.tsx`

- [ ] **Step 1: Replace entire file**

```tsx
'use client'

import { useState, useRef } from 'react'
import type { DragEvent } from 'react'
import { Upload } from 'lucide-react'
import type { DeclaredType } from '@/types/document'

const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'application/pdf']
const MAX_SIZE = 10 * 1024 * 1024

const ZONE_CONFIG = {
  income: {
    label: 'Income',
    sub: 'Sales receipts, invoices received',
    arrow: '↑',
    chipBg: '#DCFCE7',
    chipFg: '#15803D',
    dropHint: 'Upload your income document',
  },
  expense: {
    label: 'Expense',
    sub: 'Purchase receipts, utility bills',
    arrow: '↓',
    chipBg: '#FEE2E2',
    chipFg: '#B91C1C',
    dropHint: 'Upload your expense document',
  },
}

interface UploadZoneProps {
  declaredType: DeclaredType
  onFilesSelect: (files: File[]) => void
  count?: number
}

function validateFiles(files: File[]): { valid: File[]; errors: string[] } {
  const valid: File[] = []
  const errors: string[] = []
  for (const file of files) {
    if (file.size > MAX_SIZE) {
      errors.push(`${file.name} — File too large (max 10MB)`)
    } else if (!ACCEPTED_TYPES.includes(file.type)) {
      errors.push(`${file.name} — only JPG, PNG, PDF accepted`)
    } else {
      valid.push(file)
    }
  }
  return { valid, errors }
}

export function UploadZone({ declaredType, onFilesSelect, count }: UploadZoneProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [errors, setErrors] = useState<string[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)
  const cameraInputRef = useRef<HTMLInputElement>(null)
  const config = ZONE_CONFIG[declaredType]

  function handleFiles(fileList: FileList | null) {
    if (!fileList || fileList.length === 0) return
    const { valid, errors: errs } = validateFiles(Array.from(fileList))
    setErrors(errs)
    if (valid.length > 0) onFilesSelect(valid)
  }

  const onDragOver = (e: DragEvent) => { e.preventDefault(); setIsDragging(true) }
  const onDragLeave = () => setIsDragging(false)
  const onDrop = (e: DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    handleFiles(e.dataTransfer.files)
  }

  return (
    <div
      className="rounded-[18px] overflow-hidden border border-t-line bg-t-card"
      style={{ boxShadow: 'var(--t-shadow)' }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3.5 border-b border-t-line">
        <div className="flex items-center gap-2.5">
          <span
            className="w-8 h-8 rounded-[9px] flex items-center justify-center text-[16px] font-bold flex-none"
            style={{ background: config.chipBg, color: config.chipFg }}
          >
            {config.arrow}
          </span>
          <div>
            <div
              className="text-[14px] font-bold text-t-ink"
              style={{ fontFamily: 'var(--font-display)' }}
            >
              {config.label}
            </div>
            <div className="text-[11px] text-t-muted mt-0.5">{config.sub}</div>
          </div>
        </div>
        {count != null && (
          <span
            className="text-[10.5px] font-bold px-2.5 py-0.5 rounded-full"
            style={{ background: config.chipBg, color: config.chipFg }}
          >
            {count} files
          </span>
        )}
      </div>

      {/* Drop area */}
      <div
        className={`m-3 border-[1.5px] border-dashed border-t-line rounded-[11px] p-5 text-center bg-t-surface cursor-pointer transition-opacity ${isDragging ? 'opacity-60' : ''}`}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        onClick={() => fileInputRef.current?.click()}
      >
        <div className="w-10 h-10 rounded-[10px] bg-t-card border border-t-line flex items-center justify-center mx-auto mb-3 text-t-muted">
          <Upload className="h-5 w-5" />
        </div>
        <div className="text-[12.5px] font-bold text-t-ink mb-1">
          Drop files here or click to browse
        </div>
        <div className="text-[11px] text-t-muted mb-3.5">{config.dropHint}</div>
        <div className="flex gap-2 justify-center" onClick={(e) => e.stopPropagation()}>
          <button
            type="button"
            className="text-[11px] font-semibold px-3 py-1.5 rounded-[8px] bg-t-card border border-t-line text-t-ink hover:bg-t-surface transition-colors"
            onClick={() => fileInputRef.current?.click()}
          >
            Browse files
          </button>
          <button
            type="button"
            className="text-[11px] font-semibold px-3 py-1.5 rounded-[8px] bg-t-card border border-t-line text-t-ink hover:bg-t-surface transition-colors"
            onClick={() => cameraInputRef.current?.click()}
          >
            Take photo
          </button>
        </div>
      </div>

      {/* Formats hint */}
      <div className="text-[10px] text-t-faint text-center mx-3 mb-3">
        Accepts JPG, PNG, PDF · max 10 MB · multiple files supported
      </div>

      {errors.length > 0 && (
        <div className="mx-3 mb-3 text-[11px] text-red-600">
          {errors.length} rejected: {errors.map((e) => e.split(' — ')[1]).join(', ')}
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept=".jpg,.jpeg,.png,.pdf"
        className="hidden"
        onChange={(e) => { handleFiles(e.target.files); e.target.value = '' }}
      />
      <input
        ref={cameraInputRef}
        type="file"
        multiple
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => { handleFiles(e.target.files); e.target.value = '' }}
      />
    </div>
  )
}
```

- [ ] **Step 2: Run UploadZone tests**

```bash
cd frontend && npx jest src/components/upload/__tests__/UploadZone.test.tsx --no-coverage
```

Expected: all PASS.

- [ ] **Step 3: TypeScript check**

```bash
cd frontend && npx tsc --noEmit
```

Expected: errors on `TwoAreaUpload.tsx` and `upload/page.tsx` because `onFileSelect` prop is gone — expected, fixed in next tasks.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/components/upload/UploadZone.tsx \
        frontend/src/components/upload/__tests__/UploadZone.test.tsx
git commit -m "feat(upload): multi-select in UploadZone — onFilesSelect, multiple attribute, per-file validation"
```

---

## Phase 2 — TwoAreaUpload

### Task 3: Update TwoAreaUpload tests

**Files:**
- Modify: `frontend/src/components/upload/__tests__/TwoAreaUpload.test.tsx`

- [ ] **Step 1: Replace entire test file**

```tsx
import { render, screen, fireEvent } from '@testing-library/react'
import { TwoAreaUpload } from '../TwoAreaUpload'

function wrap(props: Partial<Parameters<typeof TwoAreaUpload>[0]> = {}) {
  return render(
    <div data-theme="sofia">
      <TwoAreaUpload
        onFilePicked={props.onFilePicked ?? jest.fn()}
        onManualSuccess={props.onManualSuccess ?? jest.fn()}
        incomeCount={props.incomeCount}
        expenseCount={props.expenseCount}
      />
    </div>
  )
}

describe('TwoAreaUpload', () => {
  it('renders both upload zones', () => {
    wrap()
    expect(screen.getByText('Income')).toBeInTheDocument()
    expect(screen.getByText('Expense')).toBeInTheDocument()
  })

  it('renders the manual entry button', () => {
    wrap()
    expect(screen.getByRole('button', { name: /Enter manually/i })).toBeInTheDocument()
  })

  it('passes income and expense counts to each zone', () => {
    wrap({ incomeCount: 3, expenseCount: 7 })
    expect(screen.getByText('3 files')).toBeInTheDocument()
    expect(screen.getByText('7 files')).toBeInTheDocument()
  })

  it('calls onFilePicked with files array and income declaredType', () => {
    const onFilePicked = jest.fn()
    wrap({ onFilePicked })
    const inputs = document.querySelectorAll('input[type="file"]:not([capture])')
    const file1 = new File(['a'], 'receipt1.jpg', { type: 'image/jpeg' })
    const file2 = new File(['b'], 'receipt2.jpg', { type: 'image/jpeg' })
    fireEvent.change(inputs[0], { target: { files: [file1, file2] } })
    expect(onFilePicked).toHaveBeenCalledWith([file1, file2], 'income')
  })

  it('calls onFilePicked with files array and expense declaredType', () => {
    const onFilePicked = jest.fn()
    wrap({ onFilePicked })
    const inputs = document.querySelectorAll('input[type="file"]:not([capture])')
    const file = new File(['a'], 'bill.pdf', { type: 'application/pdf' })
    fireEvent.change(inputs[1], { target: { files: [file] } })
    expect(onFilePicked).toHaveBeenCalledWith([file], 'expense')
  })
})
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
cd frontend && npx jest src/components/upload/__tests__/TwoAreaUpload.test.tsx --no-coverage
```

Expected: FAIL — `onFilePicked` type mismatch with current `TwoAreaUpload` implementation.

---

### Task 4: Update TwoAreaUpload implementation

**Files:**
- Modify: `frontend/src/components/upload/TwoAreaUpload.tsx`

- [ ] **Step 1: Replace entire file**

```tsx
'use client'

import { useState } from 'react'
import { UploadZone } from './UploadZone'
import { ManualEntryForm } from './ManualEntryForm'
import type { DeclaredType } from '@/types/document'

interface Props {
  onFilePicked: (files: File[], declaredType: DeclaredType) => void
  onManualSuccess: (documentId: string) => void
  incomeCount?: number
  expenseCount?: number
}

export function TwoAreaUpload({ onFilePicked, onManualSuccess, incomeCount, expenseCount }: Props) {
  const [manualOpen, setManualOpen] = useState(false)

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <UploadZone
          declaredType="income"
          onFilesSelect={(files) => onFilePicked(files, 'income')}
          count={incomeCount}
        />
        <UploadZone
          declaredType="expense"
          onFilesSelect={(files) => onFilePicked(files, 'expense')}
          count={expenseCount}
        />
      </div>

      <button
        type="button"
        onClick={() => setManualOpen(true)}
        className="w-full py-3.5 rounded-[13px] text-[13.5px] font-bold text-white flex items-center justify-center gap-2 my-4"
        style={{
          background: 'linear-gradient(150deg, var(--t-primary), var(--t-primary-deep))',
          boxShadow: '0 10px 22px -12px var(--t-primary-deep)',
        }}
      >
        No physical receipt? Enter manually →
      </button>

      <ManualEntryForm
        open={manualOpen}
        onClose={() => setManualOpen(false)}
        onSuccess={(id) => {
          setManualOpen(false)
          onManualSuccess(id)
        }}
      />
    </div>
  )
}
```

- [ ] **Step 2: Run TwoAreaUpload tests**

```bash
cd frontend && npx jest src/components/upload/__tests__/TwoAreaUpload.test.tsx --no-coverage
```

Expected: all PASS.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/upload/TwoAreaUpload.tsx \
        frontend/src/components/upload/__tests__/TwoAreaUpload.test.tsx
git commit -m "feat(upload): update TwoAreaUpload to pass File[] array to onFilePicked"
```

---

## Phase 3 — ConfirmUploadDialog

### Task 5: Write ConfirmUploadDialog tests

**Files:**
- Create: `frontend/src/components/upload/__tests__/ConfirmUploadDialog.test.tsx`

- [ ] **Step 1: Create the test file**

```tsx
import { render, screen, fireEvent } from '@testing-library/react'
import { ConfirmUploadDialog } from '../ConfirmUploadDialog'

function makeFile(name: string, type = 'image/jpeg', sizeKB = 100) {
  const file = new File(['x'], name, { type })
  Object.defineProperty(file, 'size', { value: sizeKB * 1024 })
  return file
}

const incomeItem = { file: makeFile('receipt1.jpg'), declaredType: 'income' as const }
const expenseItem = { file: makeFile('bill.pdf', 'application/pdf'), declaredType: 'expense' as const }

function wrap(props: Partial<Parameters<typeof ConfirmUploadDialog>[0]> = {}) {
  return render(
    <ConfirmUploadDialog
      open={props.open ?? true}
      files={props.files ?? [incomeItem]}
      onConfirm={props.onConfirm ?? jest.fn()}
      onCancel={props.onCancel ?? jest.fn()}
    />
  )
}

describe('ConfirmUploadDialog', () => {
  it('renders singular title for 1 file', () => {
    wrap({ files: [incomeItem] })
    expect(screen.getByText('Upload 1 Income Document')).toBeInTheDocument()
  })

  it('renders plural title for multiple files', () => {
    const extra = { file: makeFile('receipt2.jpg'), declaredType: 'income' as const }
    wrap({ files: [incomeItem, extra] })
    expect(screen.getByText('Upload 2 Income Documents')).toBeInTheDocument()
  })

  it('renders expense title when files are expense type', () => {
    wrap({ files: [expenseItem] })
    expect(screen.getByText('Upload 1 Expense Document')).toBeInTheDocument()
  })

  it('lists all file names', () => {
    wrap({ files: [incomeItem, expenseItem] })
    expect(screen.getByText('receipt1.jpg')).toBeInTheDocument()
    expect(screen.getByText('bill.pdf')).toBeInTheDocument()
  })

  it('renders confirm button with file count', () => {
    wrap({ files: [incomeItem, expenseItem] })
    expect(screen.getByRole('button', { name: /Upload 2 files/i })).toBeInTheDocument()
  })

  it('renders confirm button with singular label for 1 file', () => {
    wrap({ files: [incomeItem] })
    expect(screen.getByRole('button', { name: /Upload 1 file$/i })).toBeInTheDocument()
  })

  it('calls onConfirm with trimmed note text when confirmed', () => {
    const onConfirm = jest.fn()
    wrap({ onConfirm, files: [incomeItem] })
    fireEvent.change(screen.getByRole('textbox'), { target: { value: '  Meralco May bill  ' } })
    fireEvent.click(screen.getByRole('button', { name: /Upload/i }))
    expect(onConfirm).toHaveBeenCalledWith('Meralco May bill')
  })

  it('calls onConfirm with empty string when no note entered', () => {
    const onConfirm = jest.fn()
    wrap({ onConfirm, files: [incomeItem] })
    fireEvent.click(screen.getByRole('button', { name: /Upload/i }))
    expect(onConfirm).toHaveBeenCalledWith('')
  })

  it('calls onCancel when cancel button is clicked', () => {
    const onCancel = jest.fn()
    wrap({ onCancel })
    fireEvent.click(screen.getByRole('button', { name: /Cancel/i }))
    expect(onCancel).toHaveBeenCalled()
  })

  it('does not render when open is false', () => {
    wrap({ open: false })
    expect(screen.queryByText(/Upload \d/)).toBeNull()
  })
})
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
cd frontend && npx jest src/components/upload/__tests__/ConfirmUploadDialog.test.tsx --no-coverage
```

Expected: FAIL — `ConfirmUploadDialog` still expects the old `file` (singular) prop shape.

---

### Task 6: Rewrite ConfirmUploadDialog

**Files:**
- Modify: `frontend/src/components/upload/ConfirmUploadDialog.tsx`

- [ ] **Step 1: Replace entire file**

```tsx
'use client'

import { useState } from 'react'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import type { DeclaredType } from '@/types/document'

interface PendingFile {
  file: File
  declaredType: DeclaredType
}

interface Props {
  open: boolean
  files: PendingFile[]
  onConfirm: (note: string) => void
  onCancel: () => void
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024 * 1024) return `~${Math.round(bytes / 1024)} KB`
  return `~${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function ConfirmUploadDialog({ open, files, onConfirm, onCancel }: Props) {
  const [note, setNote] = useState('')

  function handleConfirm() {
    onConfirm(note.trim())
    setNote('')
  }

  function handleCancel() {
    setNote('')
    onCancel()
  }

  const count = files.length
  const typeLabel = files[0]?.declaredType === 'income' ? 'Income' : 'Expense'
  const typeBadgeCls = files[0]?.declaredType === 'income'
    ? 'bg-green-100 text-green-700'
    : 'bg-red-100 text-red-700'
  const title = `Upload ${count} ${typeLabel} ${count === 1 ? 'Document' : 'Documents'}`

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) handleCancel() }}>
      <DialogContent className="sm:max-w-lg">
        <div className="space-y-5 p-1">

          <div className="text-[15px] font-bold text-gray-900">{title}</div>

          {/* File list */}
          <div className="space-y-2 overflow-y-auto" style={{ maxHeight: 220 }}>
            {files.map(({ file, declaredType }, i) => (
              <div
                key={i}
                className="flex items-center gap-3 rounded-lg border border-gray-200 bg-gray-50 px-4 py-3"
              >
                <div className="text-xl">📄</div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold text-gray-800 truncate">{file.name}</div>
                  <div className="text-[11px] text-gray-400 mt-0.5">{formatFileSize(file.size)}</div>
                </div>
                <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-full shrink-0 ${typeBadgeCls}`}>
                  {declaredType === 'income' ? 'Income' : 'Expense'}
                </span>
              </div>
            ))}
          </div>

          {/* Shared context note */}
          <div className="space-y-2">
            <div>
              <span className="text-sm font-semibold text-gray-800">Add context for our AI </span>
              <span className="text-sm text-gray-400">(optional but helpful)</span>
            </div>
            <p className="text-xs text-gray-500">
              Describe what these documents are — the more you tell us, the more accurately we can classify them.
            </p>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="e.g. Monthly electricity bills from Meralco for May 2026, includes VAT"
              rows={4}
              className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm text-gray-800 placeholder:text-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
            />
            <p className="text-xs text-gray-400">
              <span className="font-semibold text-gray-500">Tips:</span>{' '}
              Mention the supplier or customer name, what the payment is for, or any special
              classification (e.g. &quot;VAT-exempt sales&quot; or &quot;petty cash reimbursements&quot;).
            </p>
          </div>

          {/* Footer */}
          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={handleCancel}
              className="flex-1 border border-gray-200 text-gray-700 hover:bg-gray-50 text-sm font-semibold py-2.5 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold py-2.5 rounded-lg transition-colors"
            >
              Upload {count} {count === 1 ? 'file' : 'files'}
            </button>
          </div>

        </div>
      </DialogContent>
    </Dialog>
  )
}
```

- [ ] **Step 2: Run ConfirmUploadDialog tests**

```bash
cd frontend && npx jest src/components/upload/__tests__/ConfirmUploadDialog.test.tsx --no-coverage
```

Expected: all PASS.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/upload/ConfirmUploadDialog.tsx \
        frontend/src/components/upload/__tests__/ConfirmUploadDialog.test.tsx
git commit -m "feat(upload): redesign ConfirmUploadDialog for multi-file list and shared note"
```

---

## Phase 4 — upload/page.tsx

### Task 7: Update page state and upload logic

**Files:**
- Modify: `frontend/src/app/client/upload/page.tsx`

No unit tests for the page. Verification is by TypeScript check and manual browser test.

- [ ] **Step 1: Replace `pendingUpload` state with `pendingFiles` array**

Find (around line 18):
```tsx
const [pendingUpload, setPendingUpload] = useState<{
  file: File
  declaredType: DeclaredType
} | null>(null)
```
Replace with:
```tsx
const [pendingFiles, setPendingFiles] = useState<Array<{
  file: File
  declaredType: DeclaredType
}>>([])
```

- [ ] **Step 2: Replace `handleFilePicked`**

Find (around line 42):
```tsx
function handleFilePicked(file: File, declaredType: DeclaredType) {
  setPendingUpload({ file, declaredType })
}
```
Replace with:
```tsx
function handleFilePicked(files: File[], declaredType: DeclaredType) {
  setPendingFiles(files.map((file) => ({ file, declaredType })))
}
```

- [ ] **Step 3: Replace `handleConfirmUpload`**

Find (around line 46):
```tsx
async function handleConfirmUpload(note: string) {
  if (!pendingUpload) return
  const { file, declaredType } = pendingUpload
  setPendingUpload(null)
  try {
    await uploadDocument(file, declaredType, note || undefined)
    queryClient.invalidateQueries({ queryKey: ['client-documents-upload'] })
  } catch {
    toast({ title: 'Upload failed', description: 'Please try again.', variant: 'destructive' })
  }
}
```
Replace with:
```tsx
async function handleConfirmUpload(note: string) {
  const batch = pendingFiles
  setPendingFiles([])
  const failed: string[] = []
  for (const { file, declaredType } of batch) {
    try {
      await uploadDocument(file, declaredType, note || undefined)
    } catch {
      failed.push(file.name)
    }
  }
  queryClient.invalidateQueries({ queryKey: ['client-documents-upload'] })
  if (failed.length > 0) {
    const total = batch.length
    toast({
      title: failed.length === total
        ? 'Upload failed — please try again.'
        : `${total - failed.length} of ${total} uploaded. ${failed.length} failed — please try again.`,
      variant: 'destructive',
    })
  }
}
```

- [ ] **Step 4: Replace `ConfirmUploadDialog` JSX props**

Find (around line 134):
```tsx
<ConfirmUploadDialog
  open={pendingUpload !== null}
  file={pendingUpload?.file ?? null}
  declaredType={pendingUpload?.declaredType ?? 'income'}
  onConfirm={handleConfirmUpload}
  onCancel={() => setPendingUpload(null)}
/>
```
Replace with:
```tsx
<ConfirmUploadDialog
  open={pendingFiles.length > 0}
  files={pendingFiles}
  onConfirm={handleConfirmUpload}
  onCancel={() => setPendingFiles([])}
/>
```

- [ ] **Step 5: TypeScript check**

```bash
cd frontend && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 6: Run all upload tests**

```bash
cd frontend && npx jest src/components/upload --no-coverage
```

Expected: all PASS.

- [ ] **Step 7: Commit**

```bash
git add frontend/src/app/client/upload/page.tsx
git commit -m "feat(upload): wire multi-file state and sequential upload in upload page"
```

---

## Final Test Checkpoint

- [ ] Start dev server: `cd frontend && npm run dev`
- [ ] Open `http://localhost:3000/client/upload` (log in as a client user)
- [ ] Open DevTools → Network tab
- [ ] **Single file:** Drop one income receipt — dialog shows "Upload 1 Income Document", button says "Upload 1 file", one `POST /documents` request fires on confirm
- [ ] **Multi-file (3 files):** Drop 3 expense receipts at once — dialog shows "Upload 3 Expense Documents" with a scrollable file list, button says "Upload 3 files", confirming fires 3 sequential `POST /documents` requests
- [ ] **Shared note:** Enter a note — all 3 requests include the `note` field in the Network payload
- [ ] **Mixed validation:** Drop a `.bmp` alongside a `.jpg` — `.bmp` is rejected with a `1 rejected` error shown in the zone; the `.jpg` proceeds to the confirm dialog alone
- [ ] **Cancel:** Drop files, open dialog, click Cancel — dialog closes, no requests fire
- [ ] **Mobile (375px):** Multi-file flow works the same; dialog is scrollable
- [ ] **Desktop regression:** Single-file drop still works; manual entry still works; all 6 client pages unaffected
