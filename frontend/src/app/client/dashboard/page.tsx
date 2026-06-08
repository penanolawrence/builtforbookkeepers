'use client'

import { useQuery } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { getDocuments } from '@/lib/api/documents'
import { useAuth } from '@/lib/hooks/useAuth'
import { useTheme } from '@/components/layout/ThemeProvider'
import { MascotCompanion } from '@/components/dashboard/MascotCompanion'
import type { Document, DocumentStatus } from '@/types/document'

// ── helpers ──────────────────────────────────────────────────────────────────

function formatAmount(n: number) {
  if (n >= 100000) return `₱${(n / 1000).toFixed(0)}k`
  return `₱${n.toLocaleString('en-PH', { maximumFractionDigits: 0 })}`
}

function fmtShortDate(s: string) {
  return new Date(s).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function fmtDate(s: string) {
  const d = new Date(s)
  const now = new Date()
  const diff = (now.getTime() - d.getTime()) / 1000
  if (diff < 3600)  return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

const STATUS_TIER: Record<DocumentStatus, string> = {
  PARKED:     'check',
  APPROVED:   'ready',
  RETURNED:   'review',
  PROCESSING: 'pending',
  REJECTED:   'review',
  CANCELLED:  'pending',
}

const STATUS_LABEL: Record<DocumentStatus, string> = {
  PARKED:     'Parked',
  APPROVED:   'Posted',
  RETURNED:   'Returned',
  PROCESSING: 'Processing',
  REJECTED:   'Rejected',
  CANCELLED:  'Withdrawn',
}

function StatusChip({ status }: { status: DocumentStatus }) {
  const tier = STATUS_TIER[status]
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      padding: '4px 13px', borderRadius: 999, fontSize: 12.5, fontWeight: 700,
      whiteSpace: 'nowrap',
      color:       `var(--t-tier-${tier}-fg)`,
      background:  `var(--t-tier-${tier}-bg)`,
      border:      `1px solid var(--t-tier-${tier}-ring)`,
    }}>
      {STATUS_LABEL[status]}
    </span>
  )
}

function activityFromDoc(doc: Document): {
  dotType: 'posted' | 'returned'
  text: React.ReactNode
  time: string
} | null {
  const time = fmtDate(doc.updatedAt)
  const name = doc.refNumber ?? `Doc #${doc.id.slice(0, 8)}`
  if (doc.status === 'APPROVED') {
    return {
      dotType: 'posted',
      text: <><strong>{name}</strong> was approved and posted to your books.</>,
      time,
    }
  }
  if (doc.status === 'RETURNED') {
    return {
      dotType: 'returned',
      text: (
        <>
          <strong>{name}</strong> was returned.
          {doc.returnNote ? <em> Reason: {doc.returnNote}</em> : ''}
        </>
      ),
      time,
    }
  }
  if (doc.status === 'PROCESSING') {
    return {
      dotType: 'posted',
      text: <><strong>{name}</strong> is being reviewed by your accountant.</>,
      time,
    }
  }
  return null
}

// ── component ─────────────────────────────────────────────────────────────────

export default function ClientDashboard() {
  const { user }    = useAuth()
  const { theme }   = useTheme()
  const { data: docs, isLoading } = useQuery({
    queryKey: ['client-docs-all'],
    queryFn:  () => getDocuments(),
  })

  const [greeting,   setGreeting]   = useState('')
  const [thisMonth,  setThisMonth]  = useState('')
  const [today,      setToday]      = useState('')
  const [monthLabel, setMonthLabel] = useState('')

  useEffect(() => {
    const now  = new Date()
    const hour = now.getHours()
    setGreeting(hour < 12 ? 'morning' : hour < 18 ? 'afternoon' : 'evening')
    setThisMonth(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`)
    setToday(now.toLocaleDateString('en-US', {
      weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
    }))
    setMonthLabel(now.toLocaleDateString('en-US', { month: 'long' }))
  }, [])

  const allDocs        = docs ?? []
  const returnedDocs   = allDocs.filter((d) => d.status === 'RETURNED')
  const parkedDocs     = allDocs.filter((d) => d.status === 'PARKED')
  const thisMonthDocs  = allDocs.filter((d) => d.createdAt.startsWith(thisMonth))
  const approvedIncome = allDocs
    .filter((d) => d.status === 'APPROVED' && d.declaredType === 'income' && d.date?.startsWith(thisMonth))
    .reduce((s, d) => s + (d.amount ?? 0), 0)
  const approvedExpenses = allDocs
    .filter((d) => d.status === 'APPROVED' && d.declaredType === 'expense' && d.date?.startsWith(thisMonth))
    .reduce((s, d) => s + (d.amount ?? 0), 0)

  const recentDocs = [...allDocs]
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, 7)

  const activityItems = [...allDocs]
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    .slice(0, 10)
    .map(activityFromDoc)
    .filter(Boolean)
    .slice(0, 5) as NonNullable<ReturnType<typeof activityFromDoc>>[]

  const firstName   = user?.name?.split(' ')[0] ?? 'there'
  const isSofia     = theme === 'sofia'
  const parkedCount = parkedDocs.length
  const mascotBrief = parkedCount > 0
    ? (isSofia
        ? `${parkedCount} document${parkedCount !== 1 ? 's' : ''} are parked — your bookkeeper is on it!`
        : `${parkedCount} doc${parkedCount !== 1 ? 's' : ''} queued up. Yoda's watching over them.`)
    : (isSofia
        ? 'All caught up — your bookkeeper has everything in hand!'
        : 'All clear. Yoda approves.')

  const statCards = [
    {
      label: 'Total Documents',
      value: isLoading ? '—' : String(thisMonthDocs.length),
      sub:   'this month',
      tier:  null,
    },
    {
      label: 'Returned',
      value: isLoading ? '—' : String(returnedDocs.length),
      sub:   'need re-upload',
      tier:  'review',
    },
    {
      label: `Income (${monthLabel})`,
      value: isLoading ? '—' : formatAmount(approvedIncome),
      sub:   'from posted docs',
      tier:  'ready',
    },
    {
      label: `Expenses (${monthLabel})`,
      value: isLoading ? '—' : formatAmount(approvedExpenses),
      sub:   'from posted docs',
      tier:  'check',
    },
  ]

  return (
    <div className="dashboard-root" style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>

      {/* Greeting row */}
      <div className="dashboard-greeting" style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
        <div style={{ flex: 1 }}>
          <h1 style={{
            fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 34,
            letterSpacing: '-.025em', margin: '0 0 6px', color: 'var(--t-ink)',
          }}>
            Good {greeting}, {firstName}!
          </h1>
          <p style={{ margin: 0, fontSize: 14.5, color: 'var(--t-muted)' }}>
            {today}
            <span style={{ opacity: 0.4 }}> · </span>
            {thisMonthDocs.length} documents this month
            <span style={{ opacity: 0.4 }}> · </span>
            {parkedCount} parked
          </p>
        </div>
        <div className="dashboard-mascot" style={{ width: 430, flexShrink: 0 }}>
          <MascotCompanion theme={theme} brief={mascotBrief} />
        </div>
      </div>

      {/* Stat cards */}
      <div className="dashboard-stats" style={{ display: 'flex', gap: 16 }}>
        {statCards.map((card) => (
          <div key={card.label} style={{
            flex: 1, background: 'var(--t-card)', border: '1px solid var(--t-line)',
            borderRadius: 18, padding: '20px 22px', boxShadow: 'var(--t-shadow)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 14 }}>
              {card.tier && (
                <span style={{
                  width: 9, height: 9, borderRadius: 999, flexShrink: 0,
                  background:  `var(--t-tier-${card.tier}-fg)`,
                  boxShadow:   `0 0 0 4px var(--t-tier-${card.tier}-bg)`,
                }} />
              )}
              <span style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--t-muted)' }}>
                {card.label}
              </span>
            </div>
            <div style={{
              fontFamily:    'var(--font-display)',
              fontWeight:    800,
              fontSize:      38,
              lineHeight:    0.9,
              letterSpacing: '-.03em',
              color: card.tier ? `var(--t-tier-${card.tier}-fg)` : 'var(--t-ink)',
            }}>
              {card.value}
            </div>
            <p style={{ margin: '10px 0 0', fontSize: 12.5, color: 'var(--t-faint)' }}>
              {card.sub}
            </p>
          </div>
        ))}
      </div>

      {/* Bottom grid */}
      <div className="dashboard-grid" style={{
        display: 'grid', gridTemplateColumns: '1fr 320px',
        gap: 16, alignItems: 'stretch',
      }}>

        {/* Recent Documents */}
        <div style={{
          background: 'var(--t-card)', border: '1px solid var(--t-line)',
          borderRadius: 20, overflow: 'hidden', boxShadow: 'var(--t-shadow)',
        }}>
          <div style={{
            padding: '18px 24px', borderBottom: '1px solid var(--t-line)',
            display: 'flex', alignItems: 'center', gap: 10,
          }}>
            <span style={{
              fontFamily: 'var(--font-display)', fontWeight: 700,
              fontSize: 16, color: 'var(--t-ink)', flex: 1,
            }}>
              Recent Documents
            </span>
            <Link href="/client/documents" style={{
              fontSize: 13.5, fontWeight: 700, color: 'var(--t-primary)',
              textDecoration: 'none',
            }}>
              View all →
            </Link>
          </div>

          {/* Column headers */}
          <div className="dashboard-recent-headers" style={{
            display: 'grid', gridTemplateColumns: '1fr 100px 120px',
            padding: '10px 24px', borderBottom: '1px solid var(--t-line)',
            fontSize: 11, fontWeight: 700, textTransform: 'uppercase',
            letterSpacing: '.06em', color: 'var(--t-faint)',
          }}>
            <span>File</span>
            <span className="dashboard-recent-date">Date</span>
            <span style={{ textAlign: 'center' }}>Status</span>
          </div>

          {isLoading ? (
            <div style={{ padding: 24, textAlign: 'center', color: 'var(--t-faint)', fontSize: 14 }}>
              Loading…
            </div>
          ) : recentDocs.length === 0 ? (
            <div style={{ padding: 24, textAlign: 'center', color: 'var(--t-faint)', fontSize: 14 }}>
              No documents yet.
            </div>
          ) : (
            <div>
              {recentDocs.map((doc, i) => (
                <div key={doc.id} className="dashboard-recent-row" style={{
                  display: 'grid', gridTemplateColumns: '1fr 100px 120px',
                  padding: '13px 24px', alignItems: 'center',
                  borderBottom: i < recentDocs.length - 1 ? '1px solid var(--t-line-soft)' : 'none',
                  background:   i % 2 === 1 ? 'var(--t-card-alt)' : 'transparent',
                  boxShadow:    doc.status === 'PARKED' ? 'inset 3px 0 0 var(--t-tier-check-fg)' : 'none',
                  transition:   'background .14s',
                }}>
                  <span style={{ fontWeight: 700, fontSize: 13.5, color: 'var(--t-ink)' }}>
                    {doc.refNumber ?? doc.merchantName ?? `${doc.declaredType} #${doc.id.slice(0, 6)}`}
                  </span>
                  <span className="dashboard-recent-date" style={{ fontSize: 13.5, color: 'var(--t-muted)', fontWeight: 500 }}>
                    {fmtShortDate(doc.createdAt)}
                  </span>
                  <span style={{ textAlign: 'center' }}>
                    <StatusChip status={doc.status} />
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="dashboard-sidebar" style={{ display: 'flex', flexDirection: 'column', gap: 16, height: '100%' }}>

          {/* Recent Activity */}
          <div style={{
            background: 'var(--t-card)', border: '1px solid var(--t-line)',
            borderRadius: 20, overflow: 'hidden', boxShadow: 'var(--t-shadow)', flex: 1,
          }}>
            <div style={{
              padding: '18px 24px', borderBottom: '1px solid var(--t-line)',
              display: 'flex', alignItems: 'center', gap: 10,
            }}>
              <span style={{
                fontFamily: 'var(--font-display)', fontWeight: 700,
                fontSize: 16, color: 'var(--t-ink)',
              }}>
                Recent Activity
              </span>
            </div>

            {isLoading ? (
              <div style={{ padding: 24, textAlign: 'center', color: 'var(--t-faint)', fontSize: 14 }}>
                Loading…
              </div>
            ) : activityItems.length === 0 ? (
              <div style={{ padding: 24, textAlign: 'center', color: 'var(--t-faint)', fontSize: 14 }}>
                No activity yet.
              </div>
            ) : (
              <div>
                {activityItems.map((item, i) => (
                  <div key={i} style={{
                    display: 'flex', alignItems: 'flex-start', gap: 14,
                    padding: '14px 24px',
                    borderBottom: i < activityItems.length - 1 ? '1px solid var(--t-line-soft)' : 'none',
                    background:   i % 2 === 1 ? 'var(--t-card-alt)' : 'transparent',
                  }}>
                    <span style={{
                      width: 8, height: 8, borderRadius: 999,
                      flexShrink: 0, marginTop: 5,
                      background: item.dotType === 'posted'
                        ? 'var(--t-tier-ready-fg)'
                        : 'var(--t-tier-review-fg)',
                      boxShadow: item.dotType === 'posted'
                        ? '0 0 0 3px var(--t-tier-ready-bg)'
                        : '0 0 0 3px var(--t-tier-review-bg)',
                    }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{
                        margin: 0, fontSize: 13.5,
                        lineHeight: 1.45, color: 'var(--t-muted)',
                      }}>
                        {item.text}
                      </p>
                      <span style={{ fontSize: 12.5, color: 'var(--t-faint)' }}>
                        {item.time}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Upload button */}
          <Link href="/client/upload" style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            width: '100%', padding: '12px 20px', borderRadius: 12,
            fontFamily: 'inherit', fontWeight: 700, fontSize: 14,
            color: '#fff', textDecoration: 'none',
            background:  'linear-gradient(150deg, var(--t-primary), var(--t-primary-deep))',
            boxShadow:   '0 12px 22px -12px var(--t-primary-deep)',
          }}>
            Upload a Document
          </Link>
        </div>
      </div>
    </div>
  )
}
