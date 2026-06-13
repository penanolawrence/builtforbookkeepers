'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
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

  useEffect(() => {
    if (!open) setNote('')
  }, [open])

  function handleConfirm() {
    onConfirm(note.trim())
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

          <DialogTitle className="text-[15px] font-bold text-gray-900">{title}</DialogTitle>

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
              className="flex-1 border border-gray-200 text-gray-700 hover:bg-gray-50 text-sm font-semibold py-2.5 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-white"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              disabled={uploading}
              className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold py-2.5 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-indigo-600"
            >
              {uploading ? 'Uploading…' : `Upload ${count} ${count === 1 ? 'file' : 'files'}`}
            </button>
          </div>

        </div>
      </DialogContent>
    </Dialog>
  )
}
