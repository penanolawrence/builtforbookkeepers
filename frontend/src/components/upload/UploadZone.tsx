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
        data-testid="file-browse-input"
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
