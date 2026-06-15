'use client'

import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useToast } from '@/hooks/use-toast'
import { TwoAreaUpload } from './TwoAreaUpload'
import { ConfirmUploadDialog } from './ConfirmUploadDialog'
import { QueueReviewModal } from '@/components/queue/QueueReviewModal'
import { uploadDocument } from '@/lib/api/documents'
import { getQueue } from '@/lib/api/queue'
import type { DeclaredType } from '@/types/document'
import type { Role } from '@/types/auth'
import type { QueueItem } from '@/types/queue'

interface PendingFile {
  file: File
  declaredType: DeclaredType
}

interface Props {
  clientId: string
  docsQueryKey: unknown[]
  role: Exclude<Role, 'client'>
}

const FLAG_ORDER: Record<string, number> = { RED: 0, YELLOW: 1, GREEN: 2 }

const FLAG_DOT: Record<string, string> = {
  RED:    '#ef4444',
  YELLOW: '#f59e0b',
  GREEN:  '#22c55e',
}

function fmtPeso(n: number | null) {
  if (n == null) return '—'
  return '₱' + Number(n).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function fmtShort(s: string | null) {
  if (!s) return '—'
  return new Date(s).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

const thStyle: React.CSSProperties = {
  padding: '9px 14px',
  textAlign: 'left',
  fontSize: 11,
  fontWeight: 700,
  color: 'var(--t-faint)',
  textTransform: 'uppercase',
  letterSpacing: '.05em',
}

const tdStyle: React.CSSProperties = {
  padding: '11px 14px',
  color: 'var(--t-muted)',
  verticalAlign: 'middle',
}

export function SubmitTab({ clientId, docsQueryKey, role: _role }: Props) {
  const qc                              = useQueryClient()
  const { toast }                       = useToast()
  const [pendingFiles, setPendingFiles] = useState<PendingFile[]>([])
  const [uploading,    setUploading]    = useState(false)
  const [reviewingId,  setReviewingId]  = useState<string | null>(null)

  const { data: queueItems = [], isLoading: queueLoading } = useQuery({
    queryKey: ['client-queue', clientId],
    queryFn:  () => getQueue({ clientId }),
  })

  const sorted = [...queueItems].sort(
    (a, b) => (FLAG_ORDER[a.flag] ?? 99) - (FLAG_ORDER[b.flag] ?? 99)
  )

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
    const total = batch.length
    if (failed.length < total) {
      qc.invalidateQueries({ queryKey: docsQueryKey })
    }
    if (failed.length === 0) {
      toast({ title: `${total} ${total === 1 ? 'file' : 'files'} submitted — processing…` })
    } else if (failed.length === total) {
      toast({ title: 'Upload failed — please try again.', variant: 'destructive' })
    } else {
      toast({ title: `${failed.length} of ${total} uploads failed — please try again.`, variant: 'destructive' })
    }
  }

  function handleManualSuccess() {
    qc.invalidateQueries({ queryKey: docsQueryKey })
    toast({ title: 'Entry submitted — processing…' })
  }

  function handleRemoved(_id: string) {
    setReviewingId(null)
    qc.invalidateQueries({ queryKey: ['client-queue', clientId] })
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
        onCancel={() => { if (!uploading) setPendingFiles([]) }}
      />

      <hr style={{ border: 0, borderTop: '1px solid var(--t-line)', margin: '24px 0' }} />

      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
        <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--t-faint)', textTransform: 'uppercase', letterSpacing: '.06em' }}>
          Pending Review
        </span>
        <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--t-faint)', background: 'var(--t-card-alt)', border: '1px solid var(--t-line)', borderRadius: 999, padding: '1px 7px' }}>
          {queueItems.length}
        </span>
      </div>

      {queueLoading ? (
        <div data-testid="queue-skeleton" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {[0, 1, 2].map((i) => (
            <div key={i} style={{ height: 44, background: 'var(--t-card-alt)', borderRadius: 10 }} />
          ))}
        </div>
      ) : sorted.length === 0 ? (
        <p style={{ textAlign: 'center', color: 'var(--t-faint)', fontSize: 13.5, padding: '24px 0' }}>
          No documents pending review.
        </p>
      ) : (
        <div style={{ border: '1px solid var(--t-line)', borderRadius: 12, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: 'var(--t-card-alt)' }}>
                <th style={thStyle}>Flag</th>
                <th style={thStyle}>Ref / Type</th>
                <th style={thStyle}>Merchant</th>
                <th style={{ ...thStyle, textAlign: 'right' }}>Amount</th>
                <th style={thStyle}>Date</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((item: QueueItem) => (
                <tr
                  key={item.documentId}
                  data-testid="queue-row"
                  data-flag={item.flag}
                  onClick={() => setReviewingId(item.documentId)}
                  style={{ borderTop: '1px solid var(--t-line-soft)', cursor: 'pointer' }}
                >
                  <td style={tdStyle}>
                    <span style={{ display: 'inline-block', width: 9, height: 9, borderRadius: 999, background: FLAG_DOT[item.flag] ?? '#888' }} />
                  </td>
                  <td style={tdStyle}>
                    <span style={{ fontWeight: 600, color: 'var(--t-ink)' }}>{item.refNumber || '—'}</span>
                    <span style={{ marginLeft: 6, fontSize: 11.5, fontWeight: 700, color: 'var(--t-faint)', textTransform: 'capitalize' }}>{item.declaredType ?? ''}</span>
                  </td>
                  <td style={tdStyle}>{item.merchantName || '—'}</td>
                  <td style={{ ...tdStyle, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{fmtPeso(item.amount)}</td>
                  <td style={tdStyle}>{fmtShort(item.date)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {reviewingId && (
        <QueueReviewModal
          documentId={reviewingId}
          onClose={() => setReviewingId(null)}
          onRemoved={handleRemoved}
        />
      )}
    </div>
  )
}
