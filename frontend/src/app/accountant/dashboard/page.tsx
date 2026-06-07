'use client'

import { useQuery } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { ArrowRight, Sparkles } from 'lucide-react'
import { getQueue } from '@/lib/api/queue'
import { getEntries } from '@/lib/api/adjusting-entries'
import { getAccountantClients } from '@/lib/api/accountant/clients'
import { useAuth } from '@/lib/hooks/useAuth'
import { useTheme } from '@/components/layout/ThemeProvider'
import { TierCard, Tier } from '@/components/dashboard/TierCard'
import { MascotCompanion } from '@/components/dashboard/MascotCompanion'
import { ClientsTable, ClientRow } from '@/components/dashboard/ClientsTable'
import { WeekStat } from '@/components/dashboard/WeekStat'
import type { QueueItem } from '@/types/queue'
import type { AdjustingEntry } from '@/types/adjusting-entry'

const TIERS: Omit<Tier, 'count'>[] = [
  { key: 'review',  label: 'Needs review',     note: 'Anomalies flagged by AI'       },
  { key: 'check',   label: 'Check needed',      note: 'Missing receipt'               },
  { key: 'ready',   label: 'Ready to approve',  note: 'Pre-sorted for batch sign-off' },
  { key: 'pending', label: 'Pending entries',   note: 'Awaiting admin approval'       },
]

export default function AccountantDashboard() {
  const router = useRouter()
  const { user } = useAuth()
  const { theme } = useTheme()

  const { data: queue   = [] } = useQuery({ queryKey: ['accountant-queue'],           queryFn: () => getQueue() })
  const { data: pending = [] } = useQuery({ queryKey: ['accountant-pending-entries'], queryFn: () => getEntries({ status: 'PENDING' }) })
  const { data: clients = [], isLoading: cLoading } = useQuery({ queryKey: ['accountant-clients'], queryFn: getAccountantClients })

  const firstName = user?.name?.split(' ')[0] ?? 'there'
  const today     = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })

  const tiers: Tier[] = [
    { ...TIERS[0], count: (queue as QueueItem[]).filter((i) => i.flag === 'RED').length    },
    { ...TIERS[1], count: (queue as QueueItem[]).filter((i) => i.flag === 'YELLOW').length },
    { ...TIERS[2], count: (queue as QueueItem[]).filter((i) => i.flag === 'GREEN').length  },
    { ...TIERS[3], count: (pending as AdjustingEntry[]).length                             },
  ]

  const rows: ClientRow[] = clients.map((c) => ({
    id:         c.id,
    name:       c.name,
    type:       c.birType === 'vat' ? 'VAT' : 'Non-VAT',
    plan:       c.plan ? c.plan.charAt(0).toUpperCase() + c.plan.slice(1) : '',
    review:     (queue as QueueItem[]).filter((i) => i.clientId === c.id && i.flag === 'RED').length,
    check:      (queue as QueueItem[]).filter((i) => i.clientId === c.id && i.flag === 'YELLOW').length,
    ready:      (queue as QueueItem[]).filter((i) => i.clientId === c.id && i.flag === 'GREEN').length,
    pending:    (pending as AdjustingEntry[]).filter((e) => e.companyId === c.id).length,
  }))

  return (
    <div
      style={{
        maxWidth: 1280,
        marginLeft: 'auto',
        marginRight: 'auto',
        width: '100%',
        padding: '30px 36px',
        display: 'flex',
        flexDirection: 'column',
        gap: 22,
        flex: 1,
        minHeight: 0,
      }}
    >
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
            Good morning, {firstName}
          </h1>
          <p style={{ margin: 0, color: 'var(--t-muted)', fontSize: 14.5 }}>
            {today} · {clients.length} active clients · {(queue as QueueItem[]).length} items in your queue
          </p>
        </div>
        <div style={{ width: 430, flexShrink: 0 }}>
          <MascotCompanion theme={theme} />
        </div>
      </div>

      {/* Row 2 — Tier Cards */}
      <div
        className="dash-tier-grid"
        style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 16 }}
      >
        {tiers.map((tier) => <TierCard key={tier.key} tier={tier} />)}
      </div>

      {/* Row 3 — Clients + Week Rail */}
      <div
        className="dash-bottom-grid"
        style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 16, flex: 1, minHeight: 0 }}
      >
        {/* My Clients panel */}
        <section
          style={{
            background: 'var(--t-card)',
            border: '1px solid var(--t-line)',
            borderRadius: 20,
            padding: '20px 14px 8px',
            boxShadow: 'var(--t-shadow)',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '0 8px 16px',
            }}
          >
            <h2
              style={{
                fontFamily: 'var(--font-display)',
                fontWeight: 700,
                fontSize: 18,
                margin: 0,
                color: 'var(--t-ink)',
              }}
            >
              My Clients
            </h2>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <button
                onClick={() => router.push('/accountant/clients')}
                style={{
                  background: 'none',
                  border: 0,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                  color: 'var(--t-primary)',
                  fontWeight: 700,
                  fontSize: 13.5,
                  padding: 0,
                }}
              >
                View all <ArrowRight size={15} />
              </button>
            </div>
          </div>

          {cLoading ? (
            <div style={{ padding: '24px', textAlign: 'center', color: 'var(--t-faint)', fontSize: 14 }}>
              Loading…
            </div>
          ) : rows.length === 0 ? (
            <div style={{ padding: '24px', textAlign: 'center', color: 'var(--t-faint)', fontSize: 14 }}>
              No clients assigned yet.
            </div>
          ) : (
            <ClientsTable rows={rows} />
          )}
        </section>

        {/* Week Rail */}
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
              <Sparkles size={17} style={{ color: 'var(--t-primary)' }} />
              <span
                style={{
                  fontFamily: 'var(--font-display)',
                  fontWeight: 700,
                  fontSize: 16,
                  color: 'var(--t-ink)',
                }}
              >
                This week
              </span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
              {/* TODO: wire to real weekly stats API */}
              <WeekStat value="312" label="Entries processed" sub="across 5 clients" accent />
              <WeekStat value="96%"  label="Auto-categorized"  sub="accepted as suggested" />
              <WeekStat value="4.2h" label="Time saved"        sub="vs. manual entry" />
            </div>
          </div>

          <button
            onClick={() => router.push('/accountant/queue')}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              width: '100%',
              padding: '12px 20px',
              borderRadius: 12,
              border: 0,
              cursor: 'pointer',
              fontFamily: 'inherit',
              fontWeight: 700,
              fontSize: 14,
              color: '#fff',
              background: 'linear-gradient(150deg, var(--t-primary), var(--t-primary-deep))',
              boxShadow: '0 12px 22px -12px var(--t-primary-deep)',
            }}
          >
            Go to Queue <ArrowRight size={17} />
          </button>
        </aside>
      </div>
    </div>
  )
}
