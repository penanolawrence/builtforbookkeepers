'use client'

import { useEffect, useState } from 'react'
import * as DialogPrimitive from '@radix-ui/react-dialog'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { getSignedUrl, getDocument } from '@/lib/api/documents'
import { MascotProcessingPanel } from '@/components/documents/MascotProcessingPanel'
import { formatCurrency } from '@/lib/utils/formatCurrency'
import { cn } from '@/lib/utils'
import type { Document } from '@/types/document'


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
    CANCELLED:  { label: 'Withdrawn',  cls: 'bg-gray-100 text-gray-400' },
  }
  const { label, cls } = map[status]
  return (
    <span className={`inline-flex items-center text-[10px] font-semibold px-2 py-0.5 rounded-full ${cls}`}>
      {label}
    </span>
  )
}

function TypeBadge({ type }: { type: Document['declaredType'] }) {
  const map: Record<Document['declaredType'], { label: string; cls: string }> = {
    income:  { label: 'Income',  cls: 'bg-green-100 text-green-700' },
    expense: { label: 'Expense', cls: 'bg-red-100 text-red-700' },
  }
  const { label, cls } = map[type]
  return (
    <span className={`inline-flex items-center text-[10px] font-semibold px-2 py-0.5 rounded-full ${cls}`}>
      {label}
    </span>
  )
}

function DocMetaCard({ doc }: { doc: Document }) {
  const date = doc.date ?? doc.createdAt.slice(0, 10)
  return (
    <div className="mt-3 rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 space-y-2 text-xs">
      {doc.merchantName && (
        <div className="flex items-center justify-between">
          <span className="text-gray-500">Merchant</span>
          <span className="font-semibold text-gray-800">{doc.merchantName}</span>
        </div>
      )}
      <div className="flex items-center justify-between">
        <span className="text-gray-500">Date</span>
        <span className="font-semibold text-gray-800">{date}</span>
      </div>
      <div className="flex items-center justify-between">
        <span className="text-gray-500">Declared type</span>
        <TypeBadge type={doc.declaredType} />
      </div>
      <div className="flex items-center justify-between">
        <span className="text-gray-500">Status</span>
        <StatusBadge status={doc.status} />
      </div>
      {doc.note && (
        <div className="pt-1 border-t border-gray-200">
          <div className="text-gray-500 mb-1">Note</div>
          <div className="text-gray-700 leading-relaxed">{doc.note}</div>
        </div>
      )}
    </div>
  )
}

function ReceiptImage({ doc, onViewFull }: { doc: Document; onViewFull: (url: string) => void }) {
  const [url, setUrl] = useState<string | null>(null)

  useEffect(() => {
    if (doc.isNoReceipt) return
    let cancelled = false
    getSignedUrl(doc.id).then(({ url }) => {
      if (!cancelled) setUrl(url)
    })
    return () => { cancelled = true }
  }, [doc.id, doc.isNoReceipt])

  if (doc.isNoReceipt) {
    return (
      <div className="bg-gray-50 border border-dashed border-gray-200 rounded-lg py-10 text-center">
        <div className="text-3xl mb-2">📋</div>
        <div className="text-[11px] text-gray-400">Manual Entry — no receipt</div>
      </div>
    )
  }

  if (url) {
    return (
      <div
        className="relative group cursor-pointer rounded-lg overflow-hidden border border-gray-200"
        onClick={() => onViewFull(url)}
      >
        <img
          src={url}
          alt="Receipt"
          className="w-full object-contain"
        />
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center">
          <svg
            className="w-9 h-9 text-white opacity-0 group-hover:opacity-100 transition-opacity drop-shadow"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
          </svg>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-gray-100 rounded-lg h-48 flex items-center justify-center border border-gray-200">
      <div className="text-3xl">🧾</div>
    </div>
  )
}

function LineTable({
  title, lines, total, totalLabel, totalCls, descHeader,
}: {
  title: string
  lines: Document['transactionLines']
  total: number
  totalLabel: string
  totalCls: string
  descHeader: string
}) {
  return (
    <div>
      <div className="text-[10px] font-bold text-gray-500 uppercase tracking-wide mb-1.5">
        {title}
      </div>
      <div className="border border-gray-200 rounded-lg overflow-hidden">
        <div className="max-h-64 overflow-y-auto">
          <table className="w-full border-collapse text-xs">
            <thead className="sticky top-0 z-10">
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="px-3 py-1.5 text-left text-[9px] font-bold text-gray-400 uppercase">{descHeader}</th>
                <th className="px-3 py-1.5 text-left text-[9px] font-bold text-gray-400 uppercase">Subtype</th>
                <th className="px-3 py-1.5 text-right text-[9px] font-bold text-gray-400 uppercase">Amount</th>
              </tr>
            </thead>
            <tbody>
              {lines.map((line) => (
                <tr key={line.id} className="border-t border-gray-100">
                  <td className="px-3 py-2 text-gray-700">{line.description ?? '—'}</td>
                  <td className="px-3 py-2">
                    <span className="bg-gray-100 text-gray-500 text-[10px] px-1.5 py-0.5 rounded">
                      {line.subtypeName ?? line.accountName ?? '—'}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-right font-semibold text-gray-800">
                    {formatCurrency(line.amount)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {/* Total row always visible, outside the scroll area */}
        <div className="border-t-2 border-gray-200 bg-gray-50 flex items-center justify-between px-3 py-2">
          <span className="text-xs font-bold text-gray-700">{totalLabel}</span>
          <span className={cn('text-sm font-bold', totalCls)}>{formatCurrency(total)}</span>
        </div>
      </div>
    </div>
  )
}

function TransactionLinesTable({ doc, dimmed }: { doc: Document; dimmed?: boolean }) {
  const lines        = doc.transactionLines ?? []
  const incomeLines  = lines.filter((l) => l.type === 'income')
  const expenseLines = lines.filter((l) => l.type === 'expense')
  const descHeader   = doc.isNoReceipt ? 'Your Description' : 'Description'

  if (lines.length === 0) return null

  return (
    <div className={cn('space-y-3', dimmed && 'opacity-50 pointer-events-none')}>
      {incomeLines.length > 0 && (
        <LineTable
          title="Income"
          lines={incomeLines}
          total={doc.inflow}
          totalLabel="Total Income"
          totalCls="text-green-600"
          descHeader={descHeader}
        />
      )}
      {expenseLines.length > 0 && (
        <LineTable
          title="Expenses"
          lines={expenseLines}
          total={doc.outflow}
          totalLabel="Total Expenses"
          totalCls="text-red-600"
          descHeader={descHeader}
        />
      )}
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

const FIELD_LABELS: Record<string, string> = {
  merchantName:  'Merchant',
  date:          'Date',
  declaredType:  'Type',
  paymentMethod: 'Payment Method',
  accountCode:   'Account Code',
  category:      'Category',
  subtypeId:     'Subtype',
}

function ReviewedEditsCard({ doc }: { doc: Document }) {
  const overrides = doc.fieldOverrides
  if (!overrides) return null

  const hasFields = overrides.fields.length > 0
  const hasLines  = overrides.lines.length > 0
  if (!hasFields && !hasLines) return null

  return (
    <div className="border border-amber-200 bg-amber-50 rounded-lg px-4 py-3">
      <div className="text-[10px] font-bold text-amber-700 uppercase tracking-wide mb-2">
        Reviewed Edits
      </div>
      <div className="space-y-1">
        {overrides.fields.map((f, i) => (
          <div key={i} className="flex items-baseline gap-1 text-xs">
            <span className="text-gray-500 w-28 shrink-0">{FIELD_LABELS[f.field] ?? f.field}</span>
            <span className="text-gray-400 line-through">{f.original}</span>
            <span className="text-gray-400 mx-0.5">→</span>
            <span className="text-gray-800 font-medium">{f.override}</span>
          </div>
        ))}
        {overrides.lines.map((l, i) => (
          <div key={i} className="flex items-baseline gap-1 text-xs">
            <span className="text-gray-500 w-28 shrink-0">
              Line {doc.transactionLines.findIndex((tl) => tl.id === l.lineId) + 1} {FIELD_LABELS[l.field] ?? l.field}
            </span>
            <span className="text-gray-400 line-through">{l.original}</span>
            <span className="text-gray-400 mx-0.5">→</span>
            <span className="text-gray-800 font-medium">{l.override}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

interface Props {
  doc: Document | null
  onClose: () => void
  onReupload: (file: File) => void
  onCancel: () => void
}

export function DocumentDetailModal({ doc, onClose, onReupload, onCancel }: Props) {
  const [detail, setDetail]             = useState<Document | null>(null)
  const [isCancelOpen, setIsCancelOpen] = useState(false)
  const [lightboxUrl, setLightboxUrl]   = useState<string | null>(null)

  useEffect(() => {
    if (!doc) { setDetail(null); setIsCancelOpen(false); return }
    let cancelled = false
    getDocument(doc.id).then((d) => {
      if (!cancelled) setDetail(d)
    }).catch(() => {})
    return () => { cancelled = true }
  }, [doc?.id])

  if (!doc) return null

  const fullDoc = detail ?? doc

  function handleReuploadClick() {
    const input = Object.assign(document.createElement('input'), {
      type: 'file',
      accept: 'image/*,.pdf',
    })
    input.onchange = () => {
      const file = input.files?.[0]
      if (file) onReupload(file)
    }
    input.click()
  }

  const ref = doc.refNumber ?? `#${doc.id.slice(0, 8)}`

  const canCancel = ['PROCESSING', 'PARKED', 'RETURNED'].includes(doc.status)

  return (
    <>
      <Dialog open={!!doc} onOpenChange={(open) => { if (!open) onClose() }}>
        <DialogContent className="sm:max-w-4xl p-0 gap-0 overflow-hidden flex flex-col max-h-[90vh]">

          {/* Header */}
          <div className="px-6 pt-5 pb-4 pr-10 border-b border-gray-100 shrink-0">
            <div className="text-[15px] font-bold text-gray-900">{ref}</div>
            <MetaLine doc={doc} />
          </div>

          {/* Two-column body */}
          <div className="flex divide-x divide-gray-100 overflow-hidden flex-1 min-h-0">

            {/* Left: receipt image + meta */}
            <div className="w-2/5 p-5 overflow-y-auto">
              <ReceiptImage doc={fullDoc} onViewFull={setLightboxUrl} />
              <DocMetaCard doc={fullDoc} />
            </div>

            {/* Right: document details */}
            <div className="flex-1 p-5 overflow-y-auto space-y-4">

              {doc.status === 'PROCESSING' && (
                <MascotProcessingPanel docId={doc.id} />
              )}

              {doc.status === 'PARKED' && (
                <>
                  <TransactionLinesTable doc={fullDoc} />
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg px-4 py-3 text-xs text-yellow-800">
                    ⏳ Your accountant is reviewing this entry.
                  </div>
                </>
              )}

              {doc.status === 'RETURNED' && (
                <>
                  {fullDoc.returnNote && (
                    <div className="bg-red-50 border-[1.5px] border-red-300 rounded-lg px-4 py-3">
                      <div className="text-[10px] font-bold text-red-600 uppercase mb-1">Accountant Note</div>
                      <div className="text-xs text-gray-700 leading-relaxed">{fullDoc.returnNote}</div>
                    </div>
                  )}
                  <TransactionLinesTable doc={fullDoc} dimmed />
                </>
              )}

              {doc.status === 'REJECTED' && (
                <>
                  {fullDoc.rejectionReason && (
                    <div className="bg-gray-50 border border-gray-200 rounded-lg px-4 py-3">
                      <div className="text-[10px] font-bold text-gray-500 uppercase mb-1">Rejection Reason</div>
                      <div className="text-xs text-gray-700 leading-relaxed">{fullDoc.rejectionReason}</div>
                    </div>
                  )}
                  <TransactionLinesTable doc={fullDoc} dimmed />
                  <div className="bg-gray-50 border border-gray-200 rounded-lg px-4 py-2.5 text-xs text-gray-500 text-center">
                    This document has been permanently excluded from your books.
                  </div>
                </>
              )}

              {doc.status === 'APPROVED' && (
                <>
                  <TransactionLinesTable doc={fullDoc} />
                  <ReviewedEditsCard doc={fullDoc} />
                  <div className="bg-green-50 border border-green-200 rounded-lg px-4 py-3 text-xs text-green-800">
                    ✅ Approved and posted to your books.
                  </div>
                </>
              )}

              {doc.status === 'CANCELLED' && (
                <div className="bg-gray-50 border border-gray-200 rounded-lg px-4 py-2.5 text-xs text-gray-500 text-center">
                  You withdrew this document.
                </div>
              )}

            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between px-6 py-3 border-t border-gray-100 shrink-0">
            <div>
              {canCancel && (
                <button
                  onClick={() => setIsCancelOpen(true)}
                  className="border border-red-300 text-red-600 hover:bg-red-50 text-sm font-semibold px-4 py-2 rounded-lg transition-colors"
                >
                  Cancel Document
                </button>
              )}
            </div>
            <div className="flex items-center gap-3">
              {doc.status === 'RETURNED' && doc.expiresAt && (
                <ExpiryCountdown expiresAt={doc.expiresAt} />
              )}
              {doc.status === 'RETURNED' && (
                <button
                  onClick={handleReuploadClick}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors"
                >
                  Re-upload Document
                </button>
              )}
              <button
                onClick={onClose}
                className="border border-gray-200 text-gray-700 hover:bg-gray-50 text-sm font-semibold px-4 py-2 rounded-lg transition-colors"
              >
                Close
              </button>
            </div>
          </div>

        </DialogContent>

        {lightboxUrl && (
          <DialogPrimitive.Root open onOpenChange={(open) => { if (!open) setLightboxUrl(null) }}>
            <DialogPrimitive.Portal>
              <DialogPrimitive.Overlay className="fixed inset-0 z-[400] bg-[rgba(10,8,18,0.82)] backdrop-blur-[8px]" />
              <DialogPrimitive.Content className="fixed inset-0 z-[401] flex items-center justify-center outline-none">
                <DialogPrimitive.Title className="sr-only">Receipt image</DialogPrimitive.Title>
                <button
                  className="absolute top-5 right-6 w-10 h-10 rounded-[11px] bg-white/[0.12] border border-white/[0.2] text-white flex items-center justify-center text-lg hover:bg-white/20 transition-colors cursor-pointer"
                  onClick={() => setLightboxUrl(null)}
                  aria-label="Close image viewer"
                >
                  ✕
                </button>
                <img
                  src={lightboxUrl}
                  alt="Receipt full view"
                  className="max-w-[min(800px,92vw)] max-h-[90vh] object-contain rounded-2xl shadow-[0_24px_64px_rgba(0,0,0,0.5)]"
                />
              </DialogPrimitive.Content>
            </DialogPrimitive.Portal>
          </DialogPrimitive.Root>
        )}
      </Dialog>

      {/* Cancel confirmation dialog */}
      {canCancel && isCancelOpen && (
        <Dialog open={isCancelOpen} onOpenChange={setIsCancelOpen}>
          <DialogContent className="sm:max-w-sm">
            <div className="space-y-4 p-2">
              <div className="text-[15px] font-bold text-gray-900">Withdraw this document?</div>
              <div className="text-sm text-gray-500">This cannot be undone.</div>
              <div className="flex gap-3 pt-1">
                <button
                  onClick={() => setIsCancelOpen(false)}
                  className="flex-1 border border-gray-200 text-gray-700 hover:bg-gray-50 text-sm font-semibold py-2 rounded-lg transition-colors"
                >
                  Go back
                </button>
                <button
                  onClick={() => { setIsCancelOpen(false); onCancel() }}
                  className="flex-1 bg-red-600 hover:bg-red-700 text-white text-sm font-semibold py-2 rounded-lg transition-colors"
                >
                  Withdraw
                </button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  )
}
