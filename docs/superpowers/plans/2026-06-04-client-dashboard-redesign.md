# Client Dashboard Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the minimal client dashboard with the richer design-handoff layout — mascot companion, tier-colored stat cards, detailed documents table with status chips, activity feed, and an Upload button flush with the table bottom.

**Architecture:** Two file changes only. `client/layout.tsx` gets a wider max-width. `client/dashboard/page.tsx` gets a full JSX rewrite that preserves all existing data-fetching logic while replacing the output with the new layout. All visual styling uses the existing CSS variable system (`--t-*` tokens from `src/styles/theme.css`).

**Tech Stack:** Next.js 14 App Router, TypeScript, React Query, CSS variables, Jest + React Testing Library

---

## File Map

| File | Change |
|---|---|
| `src/app/client/layout.tsx` | `max-w-[1100px]` → `max-w-[1280px]` |
| `src/app/client/dashboard/__tests__/page.test.tsx` | New — test suite for redesigned dashboard |
| `src/app/client/dashboard/page.tsx` | Full JSX rewrite (logic preserved) |

---

## Task 1: Widen the client layout

**Files:**
- Modify: `src/app/client/layout.tsx`

- [ ] **Step 1: Update max-width**

Open `src/app/client/layout.tsx`. Change line 9:

```tsx
// Before
<div className="max-w-[1100px] mx-auto p-6">{children}</div>

// After
<div className="max-w-[1280px] mx-auto p-6">{children}</div>
```

- [ ] **Step 2: Commit**

```bash
git add src/app/client/layout.tsx
git commit -m "feat(client): widen layout to 1280px for dashboard redesign"
```

---

## Task 2: Write failing tests for the redesigned dashboard

**Files:**
- Create: `src/app/client/dashboard/__tests__/page.test.tsx`

- [ ] **Step 1: Create the test file**

Create `src/app/client/dashboard/__tests__/page.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react'
import ClientDashboard from '../page'

jest.mock('@/components/layout/ThemeProvider', () => ({
  useTheme: () => ({ theme: 'sofia', setTheme: jest.fn() }),
}))
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn() }),
}))
jest.mock('@/lib/hooks/useAuth', () => ({
  useAuth: () => ({ user: { name: 'Maria Santos' } }),
}))
jest.mock('@/components/dashboard/MascotCompanion', () => ({
  MascotCompanion: ({ brief }: { brief?: string }) => (
    <div data-testid="mascot">{brief}</div>
  ),
}))
jest.mock('next/link', () => {
  const Link = ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...rest}>{children}</a>
  )
  Link.displayName = 'Link'
  return Link
})
jest.mock('@tanstack/react-query', () => ({
  useQuery: () => ({
    data: [
      {
        id: 'doc-1',
        refNumber: 'MNL-0012',
        status: 'PARKED',
        declaredType: 'expense',
        amount: 500,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        date: new Date().toISOString().slice(0, 7) + '-01',
        merchantName: null,
        returnNote: null,
      },
      {
        id: 'doc-2',
        refNumber: 'MNL-0011',
        status: 'APPROVED',
        declaredType: 'income',
        amount: 10300,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        date: new Date().toISOString().slice(0, 7) + '-01',
        merchantName: null,
        returnNote: null,
      },
    ],
    isLoading: false,
  }),
}))

function wrap() {
  return render(
    <div data-theme="sofia">
      <ClientDashboard />
    </div>
  )
}

describe('ClientDashboard', () => {
  it('renders greeting with first name', () => {
    wrap()
    expect(screen.getByText(/Good .+, Maria!/)).toBeInTheDocument()
  })

  it('renders all four stat card labels', () => {
    wrap()
    expect(screen.getByText('Total Documents')).toBeInTheDocument()
    expect(screen.getByText('Returned')).toBeInTheDocument()
    // Income and Expenses labels include the month name
    expect(screen.getByText(/Income \(/)).toBeInTheDocument()
    expect(screen.getByText(/Expenses \(/)).toBeInTheDocument()
  })

  it('renders Recent Documents section', () => {
    wrap()
    expect(screen.getByText('Recent Documents')).toBeInTheDocument()
  })

  it('renders View all link pointing to /client/documents', () => {
    wrap()
    const link = screen.getByText('View all →')
    expect(link.closest('a')).toHaveAttribute('href', '/client/documents')
  })

  it('renders Recent Activity section', () => {
    wrap()
    expect(screen.getByText('Recent Activity')).toBeInTheDocument()
  })

  it('renders Upload a Document link pointing to /client/upload', () => {
    wrap()
    const link = screen.getByText('Upload a Document')
    expect(link.closest('a')).toHaveAttribute('href', '/client/upload')
  })

  it('renders mascot companion with brief mentioning parked count', () => {
    wrap()
    const mascot = screen.getByTestId('mascot')
    // 1 PARKED doc → brief mentions "1 document"
    expect(mascot.textContent).toMatch(/1 document/)
  })

  it('renders status chip for PARKED document', () => {
    wrap()
    expect(screen.getByText('Parked')).toBeInTheDocument()
  })

  it('renders status chip for APPROVED document as Posted', () => {
    wrap()
    expect(screen.getByText('Posted')).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run tests — verify they fail**

```bash
cd frontend && npx jest src/app/client/dashboard/__tests__/page.test.tsx --no-coverage
```

Expected: FAIL — the existing page doesn't have the new structure (`Recent Documents` heading, `Upload a Document` link, mascot with brief, etc.)

---

## Task 3: Rewrite the dashboard page

**Files:**
- Modify: `src/app/client/dashboard/page.tsx`

- [ ] **Step 1: Replace the file contents**

Overwrite `src/app/client/dashboard/page.tsx` with:

```tsx
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
    <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>

      {/* Greeting row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
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
        <div style={{ width: 430, flexShrink: 0 }}>
          <MascotCompanion theme={theme} brief={mascotBrief} />
        </div>
      </div>

      {/* Stat cards */}
      <div style={{ display: 'flex', gap: 16 }}>
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
      <div style={{
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
          <div style={{
            display: 'grid', gridTemplateColumns: '1fr 100px 120px',
            padding: '10px 24px', borderBottom: '1px solid var(--t-line)',
            fontSize: 11, fontWeight: 700, textTransform: 'uppercase',
            letterSpacing: '.06em', color: 'var(--t-faint)',
          }}>
            <span>File</span>
            <span>Date</span>
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
                <div key={doc.id} style={{
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
                  <span style={{ fontSize: 13.5, color: 'var(--t-muted)', fontWeight: 500 }}>
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
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, height: '100%' }}>

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
```

- [ ] **Step 2: Run the tests — verify they pass**

```bash
npx jest src/app/client/dashboard/__tests__/page.test.tsx --no-coverage
```

Expected output:
```
PASS src/app/client/dashboard/__tests__/page.test.tsx
  ClientDashboard
    ✓ renders greeting with first name
    ✓ renders all four stat card labels
    ✓ renders Recent Documents section
    ✓ renders View all link pointing to /client/documents
    ✓ renders Recent Activity section
    ✓ renders Upload a Document link pointing to /client/upload
    ✓ renders mascot companion with brief mentioning parked count
    ✓ renders status chip for PARKED document
    ✓ renders status chip for APPROVED document as Posted

Test Suites: 1 passed, 1 total
Tests:       9 passed, 9 total
```

- [ ] **Step 3: Run the full frontend test suite to confirm no regressions**

```bash
npx jest --no-coverage
```

Expected: all previously passing tests still pass.

- [ ] **Step 4: Commit**

```bash
git add src/app/client/dashboard/__tests__/page.test.tsx src/app/client/dashboard/page.tsx
git commit -m "feat(client-dashboard): apply design-handoff layout

- Mascot companion card with parked-count-aware brief
- Tier-colored stat cards (Total Docs, Returned, Income, Expenses)
- Recent Documents table: StatusChip pills, parked row left-accent, alternating rows
- Activity feed: dot indicators by event type
- Upload button flush with doc table via stretch grid"
```

---

## Self-Review Checklist

- [x] **Spec coverage:** Layout max-width ✓, greeting row + mascot ✓, 4 stat cards with tier dots ✓, Recent Docs table (7 rows, StatusChip, parked accent, alternating) ✓, Activity feed (5 items, colored dots) ✓, Upload button flush alignment ✓, month label derivation ✓, doc/activity slice sizes (7/5) ✓, mascotBrief variants (theme × zero/non-zero) ✓
- [x] **Placeholder scan:** No TBDs. All code complete.
- [x] **Type consistency:** `activityFromDoc` returns `dotType: 'posted' | 'returned'` — used correctly in JSX. `STATUS_TIER` and `STATUS_LABEL` both cover all 6 `DocumentStatus` values. `statCards[n].tier` is `string | null` — null branch renders no dot and uses `var(--t-ink)`.
