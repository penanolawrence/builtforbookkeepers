'use client'

import { useEffect, useState } from 'react'
import { getSignedUrl } from '@/lib/api/documents'
import { StatusBadge } from './StatusBadge'
import { formatCurrency } from '@/lib/utils/formatCurrency'
import { formatDate } from '@/lib/utils/formatDate'
import { FileText } from 'lucide-react'
import type { Document } from '@/types/document'

interface Props {
  document: Document
  onClick?: () => void
}

export function DocumentCard({ document, onClick }: Props) {
  const [imgUrl, setImgUrl] = useState<string | null>(null)

  useEffect(() => {
    if (!document.isNoReceipt) {
      getSignedUrl(document.id)
        .then((r) => setImgUrl(r.url))
        .catch(() => {})
    }
  }, [document.id, document.isNoReceipt])

  return (
    <div
      className="border rounded-lg p-3 bg-white flex gap-3 cursor-pointer hover:shadow-sm transition-shadow"
      onClick={onClick}
    >
      <div className="h-14 w-14 rounded-md bg-muted flex items-center justify-center flex-shrink-0 overflow-hidden">
        {imgUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={imgUrl} alt="receipt" className="h-full w-full object-cover" />
        ) : (
          <FileText className="h-6 w-6 text-muted-foreground" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <p className="text-sm font-medium truncate">
            {document.merchantName ?? 'No merchant'}
          </p>
          {document.amount != null && (
            <p className="text-sm font-semibold whitespace-nowrap">
              {formatCurrency(document.amount)}
            </p>
          )}
        </div>
        {document.date && (
          <p className="text-xs text-muted-foreground">{formatDate(document.date)}</p>
        )}
        <div className="mt-1">
          <StatusBadge status={document.status} flag={document.flag} />
        </div>
      </div>
    </div>
  )
}
