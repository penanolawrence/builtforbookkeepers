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
