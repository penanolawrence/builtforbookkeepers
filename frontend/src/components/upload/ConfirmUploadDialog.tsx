'use client'

import { useState } from 'react'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import type { DeclaredType } from '@/types/document'

interface Props {
  open: boolean
  file: File | null
  declaredType: DeclaredType
  onConfirm: (note: string) => void
  onCancel: () => void
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024 * 1024) return `~${Math.round(bytes / 1024)} KB`
  return `~${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function ConfirmUploadDialog({ open, file, declaredType, onConfirm, onCancel }: Props) {
  const [note, setNote] = useState('')

  function handleConfirm() {
    onConfirm(note.trim())
    setNote('')
  }

  function handleCancel() {
    setNote('')
    onCancel()
  }

  const title = declaredType === 'income' ? 'Upload Income Document' : 'Upload Expense Document'
  const typeBadgeCls = declaredType === 'income'
    ? 'bg-green-100 text-green-700'
    : 'bg-red-100 text-red-700'
  const typeLabel = declaredType === 'income' ? 'Income' : 'Expense'

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) handleCancel() }}>
      <DialogContent className="sm:max-w-lg">
        <div className="space-y-5 p-1">

          {/* Title */}
          <div className="text-[15px] font-bold text-gray-900">{title}</div>

          {/* File card */}
          {file && (
            <div className="flex items-center gap-3 rounded-lg border border-gray-200 bg-gray-50 px-4 py-3">
              <div className="text-2xl">📄</div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold text-gray-800 truncate">{file.name}</div>
                <div className="text-[11px] text-gray-400 mt-0.5">
                  {typeLabel} · {formatFileSize(file.size)} · dropped
                </div>
              </div>
              <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-full shrink-0 ${typeBadgeCls}`}>
                {typeLabel}
              </span>
            </div>
          )}

          {/* Context section */}
          <div className="space-y-2">
            <div>
              <span className="text-sm font-semibold text-gray-800">Add context for our AI </span>
              <span className="text-sm text-gray-400">(optional but helpful)</span>
            </div>
            <p className="text-xs text-gray-500">
              Describe what this document is — the more you tell us, the more accurately we can classify it.
            </p>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="e.g. Monthly electricity bill from Meralco for May 2026, includes VAT"
              rows={4}
              className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm text-gray-800 placeholder:text-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
            />
            <p className="text-xs text-gray-400">
              <span className="font-semibold text-gray-500">Tips:</span>{' '}
              Mention the supplier or customer name, what the payment is for, or any special
              classification (e.g. &quot;this is a VAT-exempt sale&quot; or &quot;petty cash reimbursement&quot;).
            </p>
          </div>

          {/* Footer buttons */}
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
              Confirm &amp; Upload
            </button>
          </div>

        </div>
      </DialogContent>
    </Dialog>
  )
}
