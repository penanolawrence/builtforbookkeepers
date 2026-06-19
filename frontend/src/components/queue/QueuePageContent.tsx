'use client'

import { useState, useMemo, useEffect, useRef } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useApprovalQueue } from '@/lib/hooks/useApprovalQueue'
import { getClients } from '@/lib/api/admin/clients'
import { getAccountantClients } from '@/lib/api/accountant/clients'
import { getAccountants } from '@/lib/api/admin/accountants'
import { QueueReviewModal } from './QueueReviewModal'
import { Breadcrumb } from '@/components/shared/Breadcrumb'
import { SummaryCard } from '@/components/shared/SummaryCard'
import { useToast } from '@/hooks/use-toast'
import { useAuth } from '@/lib/hooks/useAuth'
import { localCache } from '@/lib/localCache'
import { TourOverlay } from '@/components/tour/TourOverlay'
import { useTour } from '@/components/tour/useTour'
import { QUEUE_TOUR_STEPS } from '@/components/tour/steps'
import { getTourContinueFlag, clearTourContinueFlag } from '@/components/tour/tourSession'
import type { QueueItem } from '@/types/queue'
import type { ClientProfile } from '@/types/admin'

interface Props {
  showAccountant?: boolean
  reviewBasePath: string
}

function fmtAmount(n: number | null) {
  if (n == null) return '—'
  return '₱' + Number(n).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function fmtDate(iso: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}


export function QueuePageContent({ showAccountant = false, reviewBasePath }: Props) {
  const { items, isLoading, batchApprove, removeItem } = useApprovalQueue()
  const { toast } = useToast()
  const { user, markTutorialSeen } = useAuth()

  const tour = useTour(QUEUE_TOUR_STEPS, {
    onFinish: () => {
      clearTourContinueFlag()
      if (!user?.hasSeenTutorial) markTutorialSeen()
    },
    onSkip: () => {
      clearTourContinueFlag()
      if (!user?.hasSeenTutorial) markTutorialSeen()
    },
  })

  useEffect(() => {
    if (showAccountant) return
    if (getTourContinueFlag() === 'queue') {
      clearTourContinueFlag()
      tour.start()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const [clientFilter, setClientFilter]         = useState('')
  const [flagFilter, setFlagFilter]             = useState('')
  const [accountantFilter, setAccountantFilter] = useState('')
  const [selected, setSelected]                 = useState<Set<string>>(new Set())
  const [approving, setApproving]               = useState(false)
  const [reviewingId, setReviewingId]           = useState<string | null>(null)
  const [hoveredId, setHoveredId]               = useState<string | null>(null)
  const initialized                             = useRef(false)

  const { data: adminClientsData } = useQuery({
    queryKey: ['admin-clients', {}],
    queryFn: () => getClients(),
    enabled: showAccountant,
    initialData: () => {
      if (!user) return undefined
      const cached = localCache.get<ClientProfile[]>(`clients_${user.id}`)
      return cached ? { data: cached, pagination: { total: cached.length, perPage: 100, currentPage: 1 } } : undefined
    },
    staleTime: 30 * 60 * 1000,
  })
  const { data: accountantClientsData } = useQuery({
    queryKey: ['accountant-clients'],
    queryFn: () => getAccountantClients({ per_page: 100 }),
    enabled: !showAccountant,
    initialData: () => {
      if (!user) return undefined
      const cached = localCache.get<ClientProfile[]>(`clients_${user.id}`)
      return cached ? { data: cached, total: cached.length, perPage: 100, currentPage: 1, lastPage: 1, summary: { needAttention: 0, pendingReview: 0, allClear: 0 } } : undefined
    },
    staleTime: 30 * 60 * 1000,
  })
  const clients: ClientProfile[] = showAccountant
    ? (adminClientsData?.data ?? [])
    : (accountantClientsData?.data ?? [])

  const { data: accountantsData } = useQuery({
    queryKey: ['admin-accountants'],
    queryFn: () => getAccountants(),
    enabled: showAccountant,
    initialData: () => localCache.get('accountants') ?? undefined,
    staleTime: 60 * 60 * 1000,
  })
  const accountants = accountantsData ?? []

  useEffect(() => {
    if (items.length === 0) return
    if (initialized.current) return
    initialized.current = true
    const greenIds = items.filter((i) => i.flag === 'GREEN').map((i) => i.documentId)
    setSelected(new Set(greenIds))
  }, [items])


  const filtered = useMemo(() => {
    return items.filter((item) => {
      if (clientFilter && item.clientId !== clientFilter) return false
      if (flagFilter && item.flag !== flagFilter) return false
      if (accountantFilter && item.accountantName !== accountantFilter) return false
      return true
    })
  }, [items, clientFilter, flagFilter, accountantFilter])

  const redItems    = filtered.filter((i) => i.flag === 'RED')
  const yellowItems = filtered.filter((i) => i.flag === 'YELLOW')
  const greenItems  = filtered.filter((i) => i.flag === 'GREEN')

  const redCount    = items.filter((i) => i.flag === 'RED').length
  const yellowCount = items.filter((i) => i.flag === 'YELLOW').length
  const greenCount  = items.filter((i) => i.flag === 'GREEN').length

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const selectAllGreen = () => setSelected(new Set(greenItems.map((i) => i.documentId)))
  const deselectAll    = () => setSelected(new Set())

  const handleBatchApprove = async () => {
    if (selected.size === 0) return
    setApproving(true)
    try {
      const result = await batchApprove(Array.from(selected))
      setSelected((prev) => {
        const next = new Set(prev)
        result.approved.forEach((id) => next.delete(id))
        return next
      })
      toast({ title: `Approved ${result.approved.length} item(s).` })
    } catch {
      toast({ title: 'Batch approval failed. Please try again.', variant: 'destructive' })
    } finally {
      setApproving(false)
    }
  }

  return (
    <div className={`max-w-[1280px] mx-auto px-4 py-5 md:px-9 md:py-7${selected.size > 0 ? ' pb-24' : ''}`}>
      <Breadcrumb crumbs={[{ label: 'Dashboard', href: showAccountant ? '/admin' : '/accountant' }, { label: 'Review Queue' }]} />

      <div className="flex items-start justify-between mb-[22px]">
        <div>
          <h1
            className="text-[34px] font-bold tracking-[-0.025em] text-t-ink m-0"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            Review Queue
          </h1>
          <p className="text-[14.5px] text-t-muted mt-[5px]">
            {isLoading ? '…' : `${items.length} documents awaiting your approval`}
          </p>
        </div>
      </div>

      {!isLoading && (
        <div className="grid grid-cols-2 gap-3 md:flex md:gap-[14px] mb-[22px]">
          <SummaryCard label="Total Items" value={String(items.length)} subnote="in queue" />
          <SummaryCard
            label="RED Flags"
            value={String(redCount)}
            subnote="anomalies flagged"
            valueStyle={{ color: 'var(--t-tier-review-fg)' }}
          />
          <SummaryCard
            label="Yellow Flags"
            value={String(yellowCount)}
            subnote="needs checking"
            valueStyle={{ color: 'var(--t-tier-check-fg)' }}
          />
          <SummaryCard
            label="Green / Ready"
            value={String(greenCount)}
            subnote="pre-sorted for approval"
            valueStyle={{ color: 'var(--t-tier-ready-fg)' }}
          />
        </div>
      )}

      {/* Filter bar */}
      <div data-tour="queue-filters" className="flex flex-col gap-2 md:flex-row md:flex-wrap md:items-center md:gap-2.5 mb-5">
        <select
          value={clientFilter}
          onChange={(e) => setClientFilter(e.target.value)}
          className="h-10 w-full md:w-auto pl-3.5 pr-9 rounded-[11px] border-[1.5px] border-t-line bg-t-card text-[13.5px] font-semibold text-t-ink appearance-none"
        >
          <option value="">All Clients</option>
          {clients.map((c: ClientProfile) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
        <select
          value={flagFilter}
          onChange={(e) => setFlagFilter(e.target.value)}
          className="h-10 w-full md:w-auto pl-3.5 pr-9 rounded-[11px] border-[1.5px] border-t-line bg-t-card text-[13.5px] font-semibold text-t-ink appearance-none"
        >
          <option value="">All Flags</option>
          <option value="RED">RED</option>
          <option value="YELLOW">Yellow</option>
          <option value="GREEN">Green</option>
        </select>
        {showAccountant && (
          <select
            value={accountantFilter}
            onChange={(e) => setAccountantFilter(e.target.value)}
            className="h-10 w-full md:w-auto pl-3.5 pr-9 rounded-[11px] border-[1.5px] border-t-line bg-t-card text-[13.5px] font-semibold text-t-ink appearance-none"
          >
            <option value="">All Accountants</option>
            {accountants.map((a) => (
              <option key={a.id} value={a.name}>{a.name}</option>
            ))}
          </select>
        )}
        <div className="hidden md:block flex-1" />
        <button
          data-tour="queue-batch-approve"
          onClick={handleBatchApprove}
          disabled={selected.size === 0 || approving}
          className="flex items-center justify-center gap-2 w-full md:w-auto rounded-[12px] px-5 py-3 text-[14px] font-bold text-white disabled:opacity-40"
          style={{
            background: 'linear-gradient(150deg, var(--t-primary), var(--t-primary-deep))',
            boxShadow: '0 12px 22px -12px var(--t-primary)',
          }}
        >
          {approving ? 'Approving…' : `Approve Selected (${selected.size})`}
        </button>
      </div>

      {/* ── Table card ── */}
      {(() => {
        const COLS = [
          '40px',
          '90px',
          'minmax(120px, 2fr)',
          '120px',
          '80px',
          '110px',
          '110px',
          '100px',
          ...(showAccountant ? ['120px'] : []),
        ].join(' ')

        const COL_HEADERS = [
          { label: '',            align: 'center' as const, color: 'var(--t-faint)' },
          { label: 'Flag',        align: 'left'   as const, color: 'var(--t-faint)' },
          { label: 'Client',      align: 'left'   as const, color: 'var(--t-faint)' },
          { label: 'Reference',   align: 'left'   as const, color: 'var(--t-faint)' },
          { label: 'Type',        align: 'left'   as const, color: 'var(--t-faint)' },
          { label: 'Inflow',      align: 'right'  as const, color: 'var(--t-tier-ready-fg)' },
          { label: 'Outflow',     align: 'right'  as const, color: 'var(--t-tier-review-fg)' },
          { label: 'Uploaded',    align: 'left'   as const, color: 'var(--t-faint)' },
          ...(showAccountant ? [{ label: 'Accountant', align: 'left' as const, color: 'var(--t-faint)' }] : []),
        ]

        // Render rows sorted RED → YELLOW → GREEN; row bg driven by flag
        const allRows = [...redItems, ...yellowItems, ...greenItems]
        let greenIndex = 0

        return (
          <div data-tour="queue-list" style={{
            background: 'var(--t-card)', border: '1px solid var(--t-line)',
            borderRadius: 20, overflow: 'hidden', boxShadow: 'var(--t-shadow)',
          }}>
            {/* Card header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '18px 24px', borderBottom: '1px solid var(--t-line)' }}>
              <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} style={{ color: 'var(--t-primary)', flexShrink: 0 }}>
                <line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/>
                <line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/>
              </svg>
              <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 16, color: 'var(--t-ink)' }}>
                Review Queue
              </span>
              <span style={{ background: 'var(--t-primary-soft)', color: 'var(--t-primary)', border: '1px solid var(--t-line)', borderRadius: 999, padding: '2px 9px', fontSize: 11.5, fontWeight: 800 }}>
                {filtered.length}
              </span>
              {redItems.length > 0 && (
                <span style={{ background: 'var(--t-tier-review-bg)', color: 'var(--t-tier-review-fg)', border: '1px solid var(--t-tier-review-ring)', borderRadius: 999, padding: '2px 9px', fontSize: 11.5, fontWeight: 800 }}>
                  {redItems.length} flagged
                </span>
              )}
              {greenItems.length > 0 && (
                <div style={{ marginLeft: 'auto', display: 'flex', gap: 12 }}>
                  <button onClick={selectAllGreen} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--t-primary)', fontWeight: 600, fontSize: 12 }}>Select all green</button>
                  <span style={{ color: 'var(--t-faint)', fontSize: 12 }}>|</span>
                  <button onClick={deselectAll}    style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--t-primary)', fontWeight: 600, fontSize: 12 }}>Deselect all</button>
                </div>
              )}
            </div>

            {isLoading ? (
              <div style={{ padding: 32, textAlign: 'center', fontSize: 14, color: 'var(--t-faint)' }}>Loading…</div>
            ) : filtered.length === 0 ? (
              <div style={{ padding: 32, textAlign: 'center', fontSize: 14, color: 'var(--t-faint)' }}>No items in the queue.</div>
            ) : (
              <>
                {/* ── Desktop table — hidden on mobile ── */}
                <div className="hidden md:block">
                  {/* Column headers */}
                  <div style={{ display: 'grid', gridTemplateColumns: COLS, columnGap: 16, padding: '12px 24px', borderBottom: '1px solid var(--t-line)' }}>
                    {COL_HEADERS.map(({ label, align, color }, idx) => (
                      <span key={idx} style={{
                        fontSize: 11, fontWeight: 700, textTransform: 'uppercase',
                        letterSpacing: '.06em', color, textAlign: align,
                        overflow: 'hidden', whiteSpace: 'nowrap',
                      }}>
                        {label}
                      </span>
                    ))}
                  </div>

                  {/* Data rows — RED then YELLOW then GREEN, no section banners */}
                  {allRows.map((item) => {
                    const flagTier = item.flag === 'RED' ? 'review' : item.flag === 'YELLOW' ? 'check' : null
                    const isGreen  = item.flag === 'GREEN'
                    const gIdx     = isGreen ? greenIndex++ : 0
                    const isHovered = hoveredId === item.documentId

                    const rowBg = flagTier
                      ? `var(--t-tier-${flagTier}-bg)`
                      : isHovered
                      ? 'var(--t-primary-soft)'
                      : gIdx % 2 === 1 ? 'var(--t-card-alt)' : 'transparent'

                    const inflow  = item.declaredType === 'income'  ? item.amount : null
                    const outflow = item.declaredType === 'expense' ? item.amount : null

                    return (
                      <div
                        key={item.documentId}
                        onMouseEnter={() => setHoveredId(item.documentId)}
                        onMouseLeave={() => setHoveredId(null)}
                        onClick={() => setReviewingId(item.documentId)}
                        style={{
                          display: 'grid', gridTemplateColumns: COLS,
                          columnGap: 16,
                          padding: '13px 24px', alignItems: 'center',
                          borderBottom: '1px solid var(--t-line-soft)',
                          transition: 'background 0.14s',
                          background: rowBg,
                          cursor: 'pointer',
                          boxShadow: flagTier
                            ? `inset 3px 0 0 var(--t-tier-${flagTier}-fg)`
                            : 'inset 3px 0 0 transparent',
                        }}
                      >
                        {/* Checkbox — only GREEN rows */}
                        <div style={{ display: 'flex', justifyContent: 'center' }}>
                          {isGreen ? (
                            <input
                              type="checkbox"
                              checked={selected.has(item.documentId)}
                              onChange={() => toggleSelect(item.documentId)}
                              onClick={(e) => e.stopPropagation()}
                              style={{ width: 14, height: 14, cursor: 'pointer', accentColor: 'var(--t-primary)' }}
                            />
                          ) : <span />}
                        </div>

                        {/* Flag chip */}
                        <div style={{ display: 'flex' }}>
                          {(() => {
                            const chipMap = { RED: { label: '⚠ RED', tier: 'review' }, YELLOW: { label: '● YEL', tier: 'check' }, GREEN: { label: '✓ GRN', tier: 'ready' } }
                            const { label, tier } = chipMap[item.flag]
                            return (
                              <span style={{
                                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                                padding: '3px 10px', borderRadius: 8, fontSize: 12, fontWeight: 700,
                                background: `var(--t-tier-${tier}-bg)`, color: `var(--t-tier-${tier}-fg)`,
                                border: `1px solid var(--t-tier-${tier}-ring)`, whiteSpace: 'nowrap',
                              }}>{label}</span>
                            )
                          })()}
                        </div>

                        {/* Client */}
                        <span style={{ fontWeight: 700, fontSize: 13.5, color: 'var(--t-ink)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', paddingRight: 12 }}>
                          {item.clientName}
                        </span>

                        {/* Reference */}
                        <span style={{ fontSize: 13.5, color: 'var(--t-muted)', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {item.refNumber ?? '—'}
                        </span>

                        {/* Type chip */}
                        <div style={{ display: 'flex' }}>
                          {item.declaredType ? (() => {
                            const tier = item.declaredType === 'income' ? 'ready' : 'review'
                            return (
                              <span style={{
                                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                                padding: '3px 10px', borderRadius: 8, fontSize: 12.5, fontWeight: 600,
                                background: `var(--t-tier-${tier}-bg)`, color: `var(--t-tier-${tier}-fg)`,
                                border: `1px solid var(--t-tier-${tier}-ring)`,
                              }}>
                                {item.declaredType === 'income' ? 'Income' : 'Expense'}
                              </span>
                            )
                          })() : <span style={{ color: 'var(--t-faint)' }}>—</span>}
                        </div>

                        {/* Inflow */}
                        {inflow != null && inflow > 0 ? (
                          <span style={{ textAlign: 'right', fontWeight: 700, fontSize: 14, color: 'var(--t-tier-ready-fg)', fontVariantNumeric: 'tabular-nums' }}>
                            {fmtAmount(inflow)}
                          </span>
                        ) : (
                          <span style={{ textAlign: 'right', color: 'var(--t-faint)' }}>—</span>
                        )}

                        {/* Outflow */}
                        {outflow != null && outflow > 0 ? (
                          <span style={{ textAlign: 'right', fontWeight: 700, fontSize: 14, color: 'var(--t-tier-review-fg)', fontVariantNumeric: 'tabular-nums' }}>
                            {fmtAmount(outflow)}
                          </span>
                        ) : (
                          <span style={{ textAlign: 'right', color: 'var(--t-faint)' }}>—</span>
                        )}

                        {/* Uploaded */}
                        <span style={{ fontSize: 13.5, color: 'var(--t-muted)', fontWeight: 500 }}>
                          {fmtDate(item.date)}
                        </span>

                        {/* Accountant (admin only) */}
                        {showAccountant && (
                          <span style={{ fontSize: 13, color: 'var(--t-muted)', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {item.accountantName ?? '—'}
                          </span>
                        )}

                      </div>
                    )
                  })}
                </div>

                {/* ── Mobile cards — visible on mobile only ── */}
                <div className="block md:hidden">
                  {allRows.map((item) => {
                    const flagTier  = item.flag === 'RED' ? 'review' : item.flag === 'YELLOW' ? 'check' : 'ready'
                    const chipMap   = { RED: { label: '⚠ RED', tier: 'review' }, YELLOW: { label: '● YEL', tier: 'check' }, GREEN: { label: '✓ GRN', tier: 'ready' } }
                    const { label: flagLabel, tier: chipTier } = chipMap[item.flag]
                    const amount    = item.amount != null && item.amount > 0 ? fmtAmount(item.amount) : null
                    const amtColor  = item.declaredType === 'income' ? 'var(--t-tier-ready-fg)' : 'var(--t-tier-review-fg)'
                    const isGreen   = item.flag === 'GREEN'

                    return (
                      <div
                        key={item.documentId}
                        onClick={() => setReviewingId(item.documentId)}
                        className="flex items-center gap-3 px-4 py-3 cursor-pointer"
                        style={{
                          borderBottom: '1px solid var(--t-line-soft)',
                          background: item.flag !== 'GREEN' ? `var(--t-tier-${flagTier}-bg)` : 'transparent',
                          boxShadow: item.flag !== 'GREEN' ? `inset 3px 0 0 var(--t-tier-${flagTier}-fg)` : 'inset 3px 0 0 transparent',
                        }}
                      >
                        {/* Checkbox for GREEN */}
                        {isGreen && (
                          <input
                            type="checkbox"
                            checked={selected.has(item.documentId)}
                            onChange={() => toggleSelect(item.documentId)}
                            onClick={(e) => e.stopPropagation()}
                            style={{ width: 14, height: 14, cursor: 'pointer', accentColor: 'var(--t-primary)', flexShrink: 0 }}
                          />
                        )}
                        {/* Flag chip */}
                        <span style={{
                          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                          padding: '3px 8px', borderRadius: 8, fontSize: 11, fontWeight: 700, whiteSpace: 'nowrap', flexShrink: 0,
                          background: `var(--t-tier-${chipTier}-bg)`, color: `var(--t-tier-${chipTier}-fg)`,
                          border: `1px solid var(--t-tier-${chipTier}-ring)`,
                        }}>{flagLabel}</span>
                        {/* Main content */}
                        <div className="flex-1 min-w-0 flex flex-col gap-[3px]">
                          <span className="font-bold text-[13px] text-t-ink truncate">{item.clientName}</span>
                          <span className="text-[11.5px] text-t-muted">
                            {item.refNumber ?? '—'} · {item.declaredType ?? '—'} · {fmtDate(item.date)}
                          </span>
                        </div>
                        {/* Amount */}
                        {amount && (
                          <span className="text-[13px] font-bold flex-shrink-0" style={{ color: amtColor }}>
                            {amount}
                          </span>
                        )}
                      </div>
                    )
                  })}
                </div>
              </>
            )}
          </div>
        )
      })()}

      {selected.size > 0 && (
        <div className="fixed bottom-14 md:bottom-0 left-0 right-0 z-40 bg-t-card border-t border-t-line shadow-lg">
          <div className="max-w-[1100px] mx-auto px-6 py-3 flex items-center justify-between">
            <span className="text-sm text-t-muted">
              <span className="font-semibold text-t-ink">{selected.size}</span> GREEN {selected.size === 1 ? 'item' : 'items'} selected
            </span>
            <button
              onClick={handleBatchApprove}
              disabled={approving}
              className="bg-t-primary hover:bg-t-primary-deep text-white text-xs font-semibold px-4 py-2 rounded-md transition-colors disabled:opacity-50"
            >
              {approving ? 'Approving…' : `Approve Selected (${selected.size})`}
            </button>
          </div>
        </div>
      )}

      {reviewingId && (
        <QueueReviewModal
          documentId={reviewingId}
          onClose={() => setReviewingId(null)}
          onRemoved={(id) => { removeItem(id); setReviewingId(null) }}
        />
      )}

      {!showAccountant && tour.isActive && tour.currentStep && (
        <TourOverlay
          step={tour.currentStep}
          stepNumber={tour.currentIndex + 1}
          totalSteps={tour.total}
          theme="sofia"
          onNext={tour.next}
          onBack={tour.back}
          onSkip={tour.skip}
        />
      )}
    </div>
  )
}
