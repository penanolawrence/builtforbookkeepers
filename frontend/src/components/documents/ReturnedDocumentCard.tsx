'use client'

import { useRef, useEffect, useState } from 'react'
import { getSignedUrl } from '@/lib/api/documents'
import { formatDate } from '@/lib/utils/formatDate'
import { formatCurrency } from '@/lib/utils/formatCurrency'
import { Button } from '@/components/ui/button'
import { FileText } from 'lucide-react'
import type { Document } from '@/types/document'

interface Props {
  document: Document
  onReupload: (file: File) => void
}

export function ReturnedDocumentCard({ document, onReupload }: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [imgUrl, setImgUrl] = useState<string | null>(null)
  const [daysLeft, setDaysLeft] = useState<number | null>(null)

  useEffect(() => {
    if (!document.isNoReceipt) {
      getSignedUrl(document.id)
        .then((r) => setImgUrl(r.url))
        .catch(() => {})
    }
    if (document.expiresAt) {
      const diff = Math.ceil(
        (new Date(document.expiresAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
      )
      setDaysLeft(diff)
    }
  }, [document.id, document.isNoReceipt, document.expiresAt])

  return (
    <div className="border border-t-line border-l-4 border-l-[var(--t-tier-review-fg)] rounded-lg p-4 bg-t-card space-y-3">
      <div className="flex gap-3">
        <div className="h-16 w-16 rounded-md bg-muted flex items-center justify-center flex-shrink-0 overflow-hidden">
          {imgUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={imgUrl} alt="receipt" className="h-full w-full object-cover" />
          ) : (
            <FileText className="h-6 w-6 text-muted-foreground" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-medium text-sm truncate">
            {document.merchantName ?? 'No merchant'}
          </p>
          {document.amount != null && (
            <p className="text-sm">{formatCurrency(document.amount)}</p>
          )}
          {document.date && (
            <p className="text-xs text-muted-foreground">{formatDate(document.date)}</p>
          )}
        </div>
      </div>

      {document.returnNote && (
        <div className="bg-amber-50 border border-amber-200 rounded-md px-3 py-2 text-sm text-amber-800">
          <span className="font-medium">Note: </span>{document.returnNote}
        </div>
      )}

      {daysLeft !== null && (
        <p className={`text-xs flex items-center gap-1 ${daysLeft < 3 ? 'text-red-600' : 'text-muted-foreground'}`}>
          ⏱ {daysLeft} day{daysLeft !== 1 ? 's' : ''} left before auto-rejection
        </p>
      )}

      <Button
        variant="outline"
        size="sm"
        className="w-full md:w-auto"
        onClick={() => fileInputRef.current?.click()}
      >
        Re-upload
      </Button>

      <input
        ref={fileInputRef}
        type="file"
        accept=".jpg,.jpeg,.png,.pdf"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (file) onReupload(file)
          e.target.value = ''
        }}
      />
    </div>
  )
}
