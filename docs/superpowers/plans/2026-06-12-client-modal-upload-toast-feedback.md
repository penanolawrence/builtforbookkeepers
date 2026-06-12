# Client Modal Upload Toast Feedback — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Show a disabled "Uploading…" confirm button during file upload and fire success/error toasts after; add a missing error toast to ManualEntryForm.

**Architecture:** All changes are contained in the frontend upload components. `SubmitTab` owns the `uploading` state and passes it down to `ConfirmUploadDialog` as a new prop. Success/error toasts fire in `SubmitTab` after the upload loop completes. `ManualEntryForm` gets `useToast` and a catch-path error toast.

**Tech Stack:** Next.js 14, React, `useToast` (shadcn/ui Radix wrapper at `@/hooks/use-toast`)

---

## File Map

| File | Change |
|---|---|
| `frontend/src/components/upload/ConfirmUploadDialog.tsx` | Add `uploading` prop; disable + relabel confirm button; block dismissal while uploading |
| `frontend/src/components/upload/SubmitTab.tsx` | Pass `uploading` to dialog; add success toast |
| `frontend/src/components/upload/ManualEntryForm.tsx` | Add `useToast`; show destructive toast in catch |

---

### Task 1: Add `uploading` prop to `ConfirmUploadDialog`

**Files:**
- Modify: `frontend/src/components/upload/ConfirmUploadDialog.tsx`

- [ ] **Step 1: Add `uploading` to the Props interface and thread it into button + dialog**

Replace the entire file content with:

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
  uploading?: boolean
  onConfirm: (note: string) => void
  onCancel: () => void
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024 * 1024) return `~${Math.round(bytes / 1024)} KB`
  return `~${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function ConfirmUploadDialog({ open, files, uploading = false, onConfirm, onCancel }: Props) {
  const [note, setNote] = useState('')

  function handleConfirm() {
    onConfirm(note.trim())
    setNote('')
  }

  function handleCancel() {
    setNote('')
    onCancel()
  }

  if (!open || files.length === 0) return null

  const count = files.length
  const typeLabel = files[0].declaredType === 'income' ? 'Income' : 'Expense'
  const title = `Upload ${count} ${typeLabel} ${count === 1 ? 'Document' : 'Documents'}`

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o && !uploading) handleCancel() }}>
      <DialogContent className="sm:max-w-lg">
        <div className="space-y-5 p-1">

          <div className="text-[15px] font-bold text-gray-900">{title}</div>

          {/* File list */}
          <div className="space-y-2 overflow-y-auto" style={{ maxHeight: 220 }}>
            {files.map(({ file, declaredType }, i) => {
              const badgeCls = declaredType === 'income'
                ? 'bg-green-100 text-green-700'
                : 'bg-red-100 text-red-700'
              return (
                <div
                  key={`${file.name}-${file.size}-${i}`}
                  className="flex items-center gap-3 rounded-lg border border-gray-200 bg-gray-50 px-4 py-3"
                >
                  <div className="text-xl">📄</div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold text-gray-800 truncate">{file.name}</div>
                    <div className="text-[11px] text-gray-400 mt-0.5">{formatFileSize(file.size)}</div>
                  </div>
                  <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-full shrink-0 ${badgeCls}`}>
                    {declaredType === 'income' ? 'Income' : 'Expense'}
                  </span>
                </div>
              )
            })}
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
              disabled={uploading}
              placeholder="e.g. Monthly electricity bills from Meralco for May 2026, includes VAT"
              rows={4}
              className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm text-gray-800 placeholder:text-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none disabled:opacity-50"
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
              disabled={uploading}
              className="flex-1 border border-gray-200 text-gray-700 hover:bg-gray-50 text-sm font-semibold py-2.5 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              disabled={uploading}
              className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold py-2.5 rounded-lg transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {uploading ? 'Uploading…' : `Upload ${count} ${count === 1 ? 'file' : 'files'}`}
            </button>
          </div>

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

Expected: no errors related to `ConfirmUploadDialog`.

---

### Task 2: Pass `uploading` from `SubmitTab` and add success toast

**Files:**
- Modify: `frontend/src/components/upload/SubmitTab.tsx`

- [ ] **Step 3: Pass `uploading` to the dialog and add success toast**

Replace the `handleConfirmUpload` function and the `ConfirmUploadDialog` JSX. Full file:

```tsx
'use client'

import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useToast } from '@/hooks/use-toast'
import { TwoAreaUpload } from './TwoAreaUpload'
import { ConfirmUploadDialog } from './ConfirmUploadDialog'
import { uploadDocument } from '@/lib/api/documents'
import type { DeclaredType } from '@/types/document'

interface PendingFile {
  file: File
  declaredType: DeclaredType
}

interface Props {
  clientId: string
  docsQueryKey: unknown[]
}

export function SubmitTab({ clientId, docsQueryKey }: Props) {
  const qc                              = useQueryClient()
  const { toast }                       = useToast()
  const [pendingFiles, setPendingFiles] = useState<PendingFile[]>([])
  const [uploading,    setUploading]    = useState(false)

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
    qc.invalidateQueries({ queryKey: docsQueryKey })

    const total = batch.length
    if (failed.length === 0) {
      toast({
        title: `${total} ${total === 1 ? 'file' : 'files'} submitted — processing…`,
      })
    } else if (failed.length === total) {
      toast({
        title: 'Upload failed — please try again.',
        variant: 'destructive',
      })
    } else {
      toast({
        title: `${failed.length} of ${total} uploads failed — please try again.`,
        variant: 'destructive',
      })
    }
  }

  function handleManualSuccess() {
    qc.invalidateQueries({ queryKey: docsQueryKey })
    toast({ title: 'Entry submitted — processing…' })
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
        onCancel={() => setPendingFiles([])}
      />
    </div>
  )
}
```

> **Note on ordering:** `setPendingFiles([])` runs *after* the upload loop completes, so `files` is still populated while `uploading` is true and the dialog stays visible. Clearing early would cause the `files.length === 0` guard in `ConfirmUploadDialog` to close the dialog immediately.

- [ ] **Step 4: Verify TypeScript compiles**

```bash
cd frontend && npx tsc --noEmit
```

Expected: no errors.

---

### Task 3: Add error toast to `ManualEntryForm`

**Files:**
- Modify: `frontend/src/components/upload/ManualEntryForm.tsx`

- [ ] **Step 5: Import `useToast` and add error toast in `handleSubmit`**

Add the import and hook call near the top, then update `handleSubmit`. Only these two sections change — the rest of the file is untouched.

**Add to imports** (after the existing imports at line 1–6):
```tsx
import { useToast } from '@/hooks/use-toast'
```

**Add hook call** inside `ManualEntryForm` function body (after the existing `useState` calls):
```tsx
const { toast } = useToast()
```

**Replace `handleSubmit`** (currently lines 75–94):
```tsx
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
      clientId,
    })
    handleClose()
    onSuccess(documentId)
  } catch {
    toast({
      title: 'Submission failed — please try again.',
      variant: 'destructive',
    })
  } finally {
    setIsSubmitting(false)
  }
}
```

- [ ] **Step 6: Verify TypeScript compiles**

```bash
cd frontend && npx tsc --noEmit
```

Expected: no errors.

---

### Task 4: Manual verification and commit

- [ ] **Step 7: Start the dev server and verify the file upload flow**

```bash
cd frontend && npm run dev
```

Open the admin or accountant view, open a client modal, go to the Submit tab, and drop a file:
- Confirm dialog opens → click "Upload N files"
- Button label changes to "Uploading…" and both buttons are disabled
- After upload: success toast appears ("N file(s) submitted — processing…")
- Dialog closes automatically (because `pendingFiles` is empty and `uploading` is false)

To test the error path: temporarily break the network (DevTools → Network → Offline), upload a file → expect destructive toast.

- [ ] **Step 8: Verify the ManualEntryForm error toast**

In the Submit tab → open Manual Entry → fill a line → submit while offline (DevTools → Network → Offline):
- Submit button shows "Submitting…" and is disabled
- After failure: destructive toast "Submission failed — please try again."

- [ ] **Step 9: Commit**

```bash
git add frontend/src/components/upload/ConfirmUploadDialog.tsx \
        frontend/src/components/upload/SubmitTab.tsx \
        frontend/src/components/upload/ManualEntryForm.tsx \
        docs/superpowers/specs/2026-06-12-client-modal-upload-toast-feedback.md \
        docs/superpowers/plans/2026-06-12-client-modal-upload-toast-feedback.md
git commit -m "feat(upload): disable confirm button during upload and add success/error toasts"
```
