'use client'

import { useQuery } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { BarChart2, ArrowRight } from 'lucide-react'
import Link from 'next/link'
import { getDashboard } from '@/lib/api/admin/dashboard'
import { getPayments } from '@/lib/api/admin/billing'
import { getClients } from '@/lib/api/admin/clients'
import { useAuth } from '@/lib/hooks/useAuth'
import { useTheme } from '@/components/layout/ThemeProvider'
import { MascotCompanion } from '@/components/dashboard/MascotCompanion'
import { WeekStat } from '@/components/dashboard/WeekStat'

function greet() {
  const h = new Date().getHours()
  return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening'
}

function formatAmount(n: number) {
  if (n >= 1_000_000) return `₱${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000)     return `₱${(n / 1_000).toFixed(0)}k`
  return `₱${n.toLocaleString('en-PH', { maximumFractionDigits: 0 })}`
}

function formatPeso(n: number) {
  return `₱${n.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function fmtDate(s: string) {
  return new Date(s).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export default function AdminDashboardPage() {
  const router    = useRouter()
  const { user }  = useAuth()
  const { theme } = useTheme()

  const { data, isLoading }   = useQuery({ queryKey: ['admin-dashboard'],    queryFn: getDashboard })
  const { data: payments, isLoading: paymentsLoading } = useQuery({ queryKey: ['admin-billing'], queryFn: () => getPayments() })
  const { data: clientsResp } = useQuery({ queryKey: ['admin-clients-all'], queryFn: () => getClients() })

  const firstName  = user?.name?.split(' ')[0] ?? 'there'
  const today      = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })
  const now        = new Date()
  const thisMonth  = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  const monthLabel = now.toLocaleDateString('en-US', { month: 'short' })

  const accountants  = data?.accountants ?? []
  const totalClients = accountants.reduce((s, a) => s + a.clientCount, 0)
  const openRedItems = data?.openRedItems ?? 0
  const totalYellow  = accountants.reduce((s, a) => s + (a.yellowCount ?? 0), 0)
  const totalPending = accountants.reduce((s, a) => s + a.pendingEntries, 0)

  const allPayments      = payments ?? []
  const revenueThisMonth = allPayments
    .filter((p) => p.dateReceived.startsWith(thisMonth))
    .reduce((s, p) => s + p.amount, 0)
  const clientMap    = new Map((clientsResp?.data ?? []).map((c) => [c.id, c.name]))
  const recentPayments = [...allPayments]
    .sort((a, b) => b.dateReceived.localeCompare(a.dateReceived))
    .slice(0, 5)

  const mascotBrief = openRedItems > 0
    ? (theme === 'sofia'
        ? `${openRedItems} RED ${openRedItems === 1 ? 'item needs' : 'items need'} attention — I've flagged them for review.`
        : `${openRedItems} ${openRedItems === 1 ? 'item' : 'items'} flagged. Yoda is watching.`)
    : (theme === 'sofia'
        ? 'All RED items cleared — the team is on track!'
        : 'No RED items. The force is balanced.')

  const STAT_CARDS = [
    { label: 'Total Clients',        value: isLoading ? '—' : String(totalClients),      sub: 'across all accountants',   color: 'var(--t-ink)'            },
    { label: 'RED Items (Open)',       value: isLoading ? '—' : String(openRedItems),       sub: 'need immediate review',    color: 'var(--t-tier-review-fg)' },
    { label: 'Active Accountants',   value: isLoading ? '—' : String(accountants.length), sub: 'on the team',              color: 'var(--t-primary)'        },
    { label: `Revenue (${monthLabel})`, value: isLoading || paymentsLoading ? '—' : formatAmount(revenueThisMonth), sub: 'from payments this month', color: '#16a34a' },
  ]

  return (
    <div style={{ maxWidth: 1280, marginLeft: 'auto', marginRight: 'auto', width: '100%', padding: '30px 36px', display: 'flex', flexDirection: 'column', gap: 22, flex: 1, minHeight: 0 }}>

      {/* Row 1 — Greeting + Mascot */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
        <div style={{ flex: 1 }}>
          <h1
            style={{
              fontFamily: 'var(--font-display)',
              fontWeight: 800,
              fontSize: 34,
              letterSpacing: '-.025em',
              color: 'var(--t-ink)',
              margin: '0 0 6px',
            }}
          >
            {greet()}, {firstName}
          </h1>
          <p style={{ margin: 0, color: 'var(--t-muted)', fontSize: 14.5 }}>
            {today} · {totalClients} clients · {openRedItems} RED flagged
          </p>
        </div>
        <div style={{ width: 430, flexShrink: 0 }}>
          <MascotCompanion theme={theme} brief={mascotBrief} />
        </div>
      </div>

      {/* Row 2 — Stat cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
        {STAT_CARDS.map((card) => (
          <div
            key={card.label}
            style={{
              background: 'var(--t-card)',
              border: '1px solid var(--t-line)',
              borderRadius: 18,
              padding: '20px 22px',
              boxShadow: 'var(--t-shadow)',
            }}
          >
            <div
              style={{
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: '.05em',
                textTransform: 'uppercase',
                color: 'var(--t-faint)',
                marginBottom: 10,
              }}
            >
              {card.label}
            </div>
            <div
              style={{
                fontFamily: 'var(--font-display)',
                fontWeight: 800,
                fontSize: 42,
                letterSpacing: '-.03em',
                lineHeight: 0.9,
                color: card.color,
              }}
            >
              {card.value}
            </div>
            <div style={{ fontSize: 11.5, color: 'var(--t-faint)', marginTop: 6 }}>
              {card.sub}
            </div>
          </div>
        ))}
      </div>

      {/* Row 3 — Two-column bottom */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 16 }}>

        {/* Accountant Workload */}
        <section
          style={{
            background: 'var(--t-card)',
            border: '1px solid var(--t-line)',
            borderRadius: 20,
            padding: '20px 14px 8px',
            boxShadow: 'var(--t-shadow)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 8px 16px' }}>
            <h2
              style={{
                fontFamily: 'var(--font-display)',
                fontWeight: 700,
                fontSize: 18,
                margin: 0,
                color: 'var(--t-ink)',
              }}
            >
              Accountant Workload
            </h2>
            <Link
              href="/admin/accountants"
              style={{
                display: 'flex', alignItems: 'center', gap: 4,
                color: 'var(--t-primary)', fontWeight: 700, fontSize: 13.5, textDecoration: 'none',
              }}
            >
              View all <ArrowRight size={15} />
            </Link>
          </div>

          {isLoading ? (
            <div style={{ padding: 24, textAlign: 'center', color: 'var(--t-faint)', fontSize: 14 }}>Loading…</div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, padding: '0 8px 12px' }}>
              {accountants.map((a) => (
                <Link
                  key={a.id}
                  href={`/admin/accountants/${a.id}`}
                  style={{
                    display: 'block',
                    background: 'var(--t-surface)',
                    border: '1px solid var(--t-line)',
                    borderLeft: a.redCount > 0 ? '3px solid var(--t-tier-review-fg)' : '1px solid var(--t-line)',
                    borderRadius: 14,
                    padding: 16,
                    textDecoration: 'none',
                  }}
                >
                  <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--t-ink)', marginBottom: 4 }}>
                    {a.name}
                  </div>
                  <div style={{ fontSize: 11.5, color: 'var(--t-faint)', marginBottom: 10 }}>
                    {a.clientCount} clients · {a.pendingEntries} pending {a.pendingEntries === 1 ? 'entry' : 'entries'}
                  </div>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {[
                      { key: 'review', count: a.redCount,         label: 'RED' },
                      { key: 'check',  count: a.yellowCount ?? 0, label: 'YEL' },
                      { key: 'ready',  count: a.greenCount  ?? 0, label: 'GRN' },
                    ].map(({ key, count, label }) => (
                      <span
                        key={key}
                        style={{
                          fontSize: 10, fontWeight: 700,
                          color: `var(--t-tier-${key}-fg)`,
                          background: `var(--t-tier-${key}-bg)`,
                          borderRadius: 999, padding: '2px 8px',
                        }}
                      >
                        {count} {label}
                      </span>
                    ))}
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>

        {/* System Overview */}
        <aside style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div
            style={{
              background: 'var(--t-card)',
              border: '1px solid var(--t-line)',
              borderRadius: 20,
              padding: '20px 22px',
              boxShadow: 'var(--t-shadow)',
              flex: 1,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 18 }}>
              <BarChart2 size={17} style={{ color: 'var(--t-primary)' }} />
              <span
                style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 16, color: 'var(--t-ink)' }}
              >
                System Overview
              </span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
              <WeekStat value={String(openRedItems)} label="Open RED items"  sub="need review"             accent />
              <WeekStat value={String(totalYellow)}  label="Yellow items"    sub="awaiting check" />
              <WeekStat value={String(totalPending)} label="Pending entries" sub="awaiting admin approval" />
            </div>
          </div>

          <button
            onClick={() => router.push('/admin/queue')}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              width: '100%', padding: '12px 20px', borderRadius: 12, border: 0,
              cursor: 'pointer', fontFamily: 'inherit', fontWeight: 700, fontSize: 14, color: '#fff',
              background: 'linear-gradient(150deg, var(--t-primary), var(--t-primary-deep))',
              boxShadow: '0 12px 22px -12px var(--t-primary-deep)',
            }}
          >
            Go to Queue <ArrowRight size={17} />
          </button>
        </aside>
      </div>

      {/* Row 4 — Recent Payments */}
      <div
        style={{
          background: 'var(--t-card)',
          border: '1px solid var(--t-line)',
          borderRadius: 20,
          boxShadow: 'var(--t-shadow)',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '16px 20px', borderBottom: '1px solid var(--t-line)',
          }}
        >
          <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 16, color: 'var(--t-ink)' }}>
            Recent Payments
          </span>
          <Link
            href="/admin/billing"
            style={{
              display: 'flex', alignItems: 'center', gap: 4,
              color: 'var(--t-primary)', fontWeight: 700, fontSize: 13.5, textDecoration: 'none',
            }}
          >
            View all <ArrowRight size={15} />
          </Link>
        </div>

        {recentPayments.length === 0 ? (
          <div style={{ padding: 24, textAlign: 'center', color: 'var(--t-faint)', fontSize: 14 }}>
            No payments recorded yet.
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                {['Client', 'Amount', 'Ref No.', 'Date', 'Recorded By'].map((h) => (
                  <th
                    key={h}
                    style={{
                      padding: '10px 16px', textAlign: 'left',
                      fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.05em',
                      color: 'var(--t-faint)', background: 'var(--t-surface)',
                      borderBottom: '1px solid var(--t-line)',
                    }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {recentPayments.map((p, i) => (
                <tr
                  key={p.id}
                  onClick={() => router.push(`/admin/billing/${p.companyId}`)}
                  style={{
                    cursor: 'pointer',
                    borderBottom: i < recentPayments.length - 1 ? '1px solid var(--t-line)' : 'none',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--t-surface)')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                >
                  <td style={{ padding: '10px 16px', fontSize: 13, fontWeight: 600, color: 'var(--t-ink)' }}>
                    {clientMap.get(p.companyId) ?? '—'}
                  </td>
                  <td style={{ padding: '10px 16px', fontSize: 13, color: 'var(--t-ink)' }}>
                    {formatPeso(p.amount)}
                  </td>
                  <td style={{ padding: '10px 16px', fontSize: 13, color: 'var(--t-faint)' }}>
                    {p.referenceNumber}
                  </td>
                  <td style={{ padding: '10px 16px', fontSize: 13, color: 'var(--t-faint)' }}>
                    {fmtDate(p.dateReceived)}
                  </td>
                  <td style={{ padding: '10px 16px', fontSize: 13, color: 'var(--t-faint)' }}>
                    {p.recordedBy}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

    </div>
  )
}
