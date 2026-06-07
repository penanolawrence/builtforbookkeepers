'use client'

import { useState, useRef } from 'react'
import type { DragEvent } from 'react'
import { Upload } from 'lucide-react'
import type { DeclaredType } from '@/types/document'

const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'application/pdf']
const MAX_SIZE = 10 * 1024 * 1024

const ZONE_CONFIG = {
  income: {
    name: 'Income',
    label: 'Income',
    sub: 'Sales receipts, invoices received',
    hint: 'Drop income documents here',
    description: 'Official receipts, invoices received, sales records',
    arrow: '↑',
    chipBg: '#DCFCE7',
    chipFg: '#15803D',
    dropHint: 'Upload your income document',
  },
  expense: {
    name: 'Expense',
    label: 'Expense',
    sub: 'Purchase receipts, utility bills',
    hint: 'Drop expense documents here',
    description: 'Receipts paid, supplier invoices, disbursements',
    arrow: '↓',
    chipBg: '#FEE2E2',
    chipFg: '#B91C1C',
    dropHint: 'Upload your expense document',
  },
}

interface UploadZoneProps {
  declaredType: DeclaredType
  onFileSelect: (file: File) => void
  count?: number
}

export function UploadZone({ declaredType, onFileSelect, count }: UploadZoneProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const cameraInputRef = useRef<HTMLInputElement>(null)
  const config = ZONE_CONFIG[declaredType]

  function validate(file: File): string | null {
    if (file.size > MAX_SIZE) return 'File too large (max 10MB)'
    if (!ACCEPTED_TYPES.includes(file.type)) return 'Only JPG, PNG, PDF accepted'
    return null
  }

  function handleFile(file: File) {
    const err = validate(file)
    if (err) { setError(err); return }
    setError(null)
    onFileSelect(file)
  }

  const onDragOver = (e: DragEvent) => { e.preventDefault(); setIsDragging(true) }
  const onDragLeave = () => setIsDragging(false)
  const onDrop = (e: DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
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
          Drop file here or click to browse
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
        Accepts JPG, PNG, PDF · max 10 MB
      </div>

      {error && (
        <div className="mx-3 mb-3 text-[11px] text-red-600">{error}</div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept=".jpg,.jpeg,.png,.pdf"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (file) handleFile(file)
          e.target.value = ''
        }}
      />
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (file) handleFile(file)
          e.target.value = ''
        }}
      />
    </div>
  )
}
