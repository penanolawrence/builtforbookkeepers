'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { getClosingPreview, executeClose } from '@/lib/api/period-closings'
import { useToast } from '@/hooks/use-toast'
import type { MonthEntry, ClientClosingSummary } from '@/types/period-closing'

interface PeriodClosePanelProps {
  client:  ClientClosingSummary
  month:   MonthEntry
  onClose: () => void
}

function fmtAmount(n: number) {
  return '₱ ' + n.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

export function PeriodClosePanel({ client, month, onClose }: PeriodClosePanelProps) {
  const { toast }   = useToast()
  const queryClient = useQueryClient()
  const allReady    = month.status === 'ready'

  const { data: preview, isLoading: previewLoading } = useQuery({
    queryKey: ['period-closing-preview', client.companyId, month.year, month.month],
    queryFn:  () => getClosingPreview(client.companyId, month.year, month.month),
  })

  const mutation = useMutation({
    mutationFn: () => executeClose(client.companyId, month.year, month.month),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['period-closings'] })
      queryClient.invalidateQueries({ queryKey: ['period-closing-timeline', client.companyId] })
      toast({ title: `${month.label} closed for ${client.companyName}.` })
      onClose()
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
        ?? (err instanceof Error ? err.message : 'Something went wrong. Please try again.')
      toast({ title: msg, variant: 'destructive' })
    },
  })

  const checklistItems = [
    {
      pass: month.status !== 'future',
      text: 'Prior months closed',
      sub:  client.lastClosed ? `up to ${client.lastClosed}` : 'first period',
    },
    {
      pass: month.pendingDocs === 0,
      text: 'All documents reviewed',
      sub:  month.pendingDocs > 0 ? `${month.pendingDocs} still pending` : 'all approved',
    },
    {
      pass: month.pendingAJEs === 0,
      text: 'All adjusting entries posted',
      sub:  month.pendingAJEs > 0 ? `${month.pendingAJEs} not yet posted` : 'all posted',
    },
  ]

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-[rgba(42,28,60,0.18)]"
        onClick={onClose}
      />

      {/* Panel */}
      <div
        className="fixed right-0 top-0 bottom-0 z-50 flex flex-col"
        style={{ width: 420, background: 'var(--t-card)', boxShadow: '-4px 0 40px rgba(42,28,60,.15)' }}
      >
        {/* Header */}
        <div style={{ padding: '22px 24px 18px', borderBottom: '1px solid var(--t-line)', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 18, color: 'var(--t-ink)', lineHeight: 1.2 }}>
                Close {month.label}
              </div>
              <div style={{ fontSize: 12, color: 'var(--t-muted)', marginTop: 3 }}>
                {client.companyName}
              </div>
            </div>
            <button
              onClick={onClose}
              style={{ width: 28, height: 28, borderRadius: 6, border: 'none', background: 'var(--t-surface)', cursor: 'pointer', color: 'var(--t-muted)', fontSize: 16, display: 'grid', placeItems: 'center', flexShrink: 0, marginTop: 2 }}
            >
              ✕
            </button>
          </div>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 20 }}>

          {/* Checklist */}
          <div>
            <div style={{ fontSize: 10.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--t-muted)', marginBottom: 10 }}>
              Pre-Close Checklist
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {checklistItems.map(({ pass, text, sub }) => (
                <div key={text} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 13px', borderRadius: 8, background: 'var(--t-surface)' }}>
                  <div style={{
                    width: 20, height: 20, borderRadius: '50%', display: 'grid', placeItems: 'center', flexShrink: 0,
                    fontSize: 11, fontWeight: 700,
                    background: pass ? 'var(--t-tier-ready-bg)' : 'var(--t-tier-check-bg)',
                    color:      pass ? 'var(--t-tier-ready-fg)' : 'var(--t-tier-check-fg)',
                    border:     `1.5px solid ${pass ? 'var(--t-tier-ready-ring)' : 'var(--t-tier-check-ring)'}`,
                  }}>
                    {pass ? '✓' : '!'}
                  </div>
                  <div style={{ fontSize: 13, color: 'var(--t-ink)', fontWeight: 500 }}>
                    {text}{' '}
                    <span style={{ fontWeight: 400, color: 'var(--t-muted)', fontSize: 12 }}>({sub})</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Preview */}
          <div>
            <div style={{ fontSize: 10.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--t-muted)', marginBottom: 10 }}>
              Closing Entries Preview
            </div>
            {previewLoading ? (
              <div style={{ fontSize: 13, color: 'var(--t-faint)', padding: '12px 0' }}>Loading…</div>
            ) : preview ? (
              <div style={{ background: 'var(--t-surface)', border: '1px solid var(--t-line)', borderRadius: 10, overflow: 'hidden' }}>
                {/* Income group */}
                <div style={{ padding: '12px 14px' }}>
                  {preview.incomeGroup.map((line) => (
                    <div key={line.accountId} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '3px 0', fontSize: 12.5 }}>
                      <span style={{ width: 20, fontSize: 10, fontWeight: 700, color: 'var(--t-primary)', flexShrink: 0, textTransform: 'uppercase' }}>{line.side === 'debit' ? 'Dr' : 'Cr'}</span>
                      <span style={{ flex: 1 }}>{line.accountName}</span>
                      <span style={{ fontVariantNumeric: 'tabular-nums', fontWeight: 600, fontSize: 12 }}>{fmtAmount(line.amount)}</span>
                    </div>
                  ))}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '3px 0 3px 20px', fontSize: 12.5, color: 'var(--t-muted)' }}>
                    <span style={{ width: 20, fontSize: 10, fontWeight: 700, color: 'var(--t-tier-pending-fg)', flexShrink: 0, textTransform: 'uppercase' }}>Cr</span>
                    <span style={{ flex: 1 }}>Income Summary</span>
                    <span style={{ fontVariantNumeric: 'tabular-nums', fontWeight: 600, fontSize: 12 }}>{fmtAmount(preview.totalIncome)}</span>
                  </div>
                </div>
                {/* Expense group */}
                <div style={{ padding: '12px 14px', borderTop: '1px dashed var(--t-line)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '3px 0', fontSize: 12.5 }}>
                    <span style={{ width: 20, fontSize: 10, fontWeight: 700, color: 'var(--t-primary)', flexShrink: 0, textTransform: 'uppercase' }}>Dr</span>
                    <span style={{ flex: 1 }}>Income Summary</span>
                    <span style={{ fontVariantNumeric: 'tabular-nums', fontWeight: 600, fontSize: 12 }}>{fmtAmount(preview.totalExpense)}</span>
                  </div>
                  {preview.expenseGroup.map((line) => (
                    <div key={line.accountId} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '3px 0 3px 20px', fontSize: 12.5, color: 'var(--t-muted)' }}>
                      <span style={{ width: 20, fontSize: 10, fontWeight: 700, color: 'var(--t-tier-pending-fg)', flexShrink: 0, textTransform: 'uppercase' }}>{line.side === 'credit' ? 'Cr' : 'Dr'}</span>
                      <span style={{ flex: 1 }}>{line.accountName}</span>
                      <span style={{ fontVariantNumeric: 'tabular-nums', fontWeight: 600, fontSize: 12 }}>{fmtAmount(line.amount)}</span>
                    </div>
                  ))}
                </div>
                {/* Net */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', background: 'var(--t-tier-ready-bg)', fontSize: 12.5, fontWeight: 700, color: 'var(--t-tier-ready-fg)', borderTop: '1px solid var(--t-tier-ready-ring)' }}>
                  <span>Net to Income Summary</span>
                  <span>{fmtAmount(preview.totalIncome - preview.totalExpense)}</span>
                </div>
              </div>
            ) : null}
          </div>

          {/* Warning */}
          <div style={{ fontSize: 11.5, color: 'var(--t-muted)', background: 'var(--t-surface)', border: '1px solid var(--t-line)', borderRadius: 8, padding: '10px 12px', lineHeight: 1.5 }}>
            This action is{' '}
            <strong style={{ color: 'var(--t-ink)' }}>permanent and cannot be undone.</strong>
            {' '}All income and expense accounts for {month.label} will be zeroed and the period will be locked. Corrections must go through adjusting entries in the next open period.
          </div>
        </div>

        {/* Footer */}
        <div style={{ padding: '16px 24px', borderTop: '1px solid var(--t-line)', display: 'flex', gap: 10, flexShrink: 0 }}>
          <button
            onClick={onClose}
            style={{ flex: 1, padding: '10px 16px', borderRadius: 8, border: '1px solid var(--t-line)', background: 'var(--t-surface)', color: 'var(--t-muted)', fontFamily: 'inherit', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
          >
            Cancel
          </button>
          <button
            onClick={() => mutation.mutate()}
            disabled={!allReady || mutation.isPending}
            style={{
              flex: 2, padding: '10px 16px', borderRadius: 8, border: 'none',
              background: allReady ? 'var(--t-primary)' : 'var(--t-faint)',
              color: '#fff', fontFamily: 'inherit', fontSize: 13, fontWeight: 600,
              cursor: allReady ? 'pointer' : 'not-allowed',
              opacity: mutation.isPending ? 0.7 : 1,
            }}
          >
            {mutation.isPending ? 'Closing…' : 'Confirm & Close Period →'}
          </button>
        </div>
      </div>
    </>
  )
}
