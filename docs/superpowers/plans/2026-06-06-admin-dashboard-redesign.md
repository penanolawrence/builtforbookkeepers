# Admin Dashboard Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Unify the Topbar into a single role-aware component, then redesign the Admin Dashboard to match the accountant and client dashboard design language (greeting, mascot, CSS-variable cards, two-column layout).

**Architecture:** Merge `AccountantTopbar`'s visual style (pug icon, pill nav, CSS variables) into the existing `Topbar.tsx`, which already carries role-based link arrays. Delete `AccountantTopbar.tsx`. Wrap the admin layout in `ThemeProvider`. Fully rewrite the admin dashboard page using the same inline-CSS-variable patterns as `AccountantDashboard` — no new components needed.

**Tech Stack:** Next.js 14 App Router, TypeScript, React Query, CSS variables (`var(--t-*)`), React Testing Library + Jest

---

## File Map

| File | Action |
|---|---|
| `frontend/src/components/layout/Topbar.tsx` | Modify — adopt AccountantTopbar visual style |
| `frontend/src/components/layout/__tests__/Topbar.test.tsx` | Create — Topbar render tests |
| `frontend/src/components/layout/AccountantTopbar.tsx` | Delete |
| `frontend/src/app/accountant/layout.tsx` | Modify — swap AccountantTopbar → Topbar |
| `frontend/src/app/admin/layout.tsx` | Modify — add ThemeProvider, inline styles, max-width 1280 |
| `frontend/src/app/admin/dashboard/page.tsx` | Rewrite — full redesign |
| `frontend/src/app/admin/dashboard/__tests__/page.test.tsx` | Create — admin dashboard render tests |

---

## Task 1: Update Topbar.tsx with AccountantTopbar visual style

**Files:**
- Modify: `frontend/src/components/layout/Topbar.tsx`
- Create: `frontend/src/components/layout/__tests__/Topbar.test.tsx`

- [ ] **Step 1: Create the failing test file**

Create `frontend/src/components/layout/__tests__/Topbar.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react'
import { Topbar } from '../Topbar'

jest.mock('next/navigation', () => ({
  usePathname: () => '/admin/dashboard',
  useRouter: () => ({ push: jest.fn() }),
}))
jest.mock('@/lib/hooks/useAuth', () => ({
  useAuth: () => ({
    user: { name: 'Admin User', role: 'admin', email: 'admin@sofiabooks.ph' },
    logout: jest.fn(),
  }),
}))
jest.mock('@/lib/api/queue', () => ({ getQueue: jest.fn().mockResolvedValue([]) }))
jest.mock('../NotificationBell', () => ({ NotificationBell: () => null }))
jest.mock('../ThemeToggle', () => ({ ThemeToggle: () => null }))

describe('Topbar', () => {
  it('renders the pug icon brand mark SVG', () => {
    render(<Topbar />)
    const svg = document.querySelector('header svg[aria-hidden]')
    expect(svg).not.toBeNull()
  })

  it('renders Sofia Books brand name', () => {
    render(<Topbar />)
    expect(screen.getByText('Sofia Books')).toBeInTheDocument()
  })

  it('renders admin nav links for admin role', () => {
    render(<Topbar />)
    expect(screen.getByRole('link', { name: 'Dashboard' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Clients' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Accountants' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Billing' })).toBeInTheDocument()
  })

  it('renders user initials in avatar button', () => {
    render(<Topbar />)
    expect(screen.getByRole('button', { name: 'AU' })).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd frontend && npx jest --testPathPattern="components/layout/__tests__/Topbar" --no-coverage
```

Expected: FAIL — tests will either error (file not found) or fail on the SVG/style assertions with the current flat-style Topbar.

- [ ] **Step 3: Rewrite Topbar.tsx**

Replace the entire content of `frontend/src/components/layout/Topbar.tsx`:

```tsx
'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useAuth } from '@/lib/hooks/useAuth'
import { useEffect, useRef, useState } from 'react'
import { getQueue } from '@/lib/api/queue'
import { NotificationBell } from './NotificationBell'
import { ThemeToggle } from './ThemeToggle'

const ADMIN_LINKS = [
  { href: '/admin/dashboard',         label: 'Dashboard'    },
  { href: '/admin/clients',           label: 'Clients'      },
  { href: '/admin/accountants',       label: 'Accountants'  },
  { href: '/admin/billing',           label: 'Billing'      },
  { href: '/admin/queue',             label: 'Queue'        },
  { href: '/admin/adjusting-entries', label: 'Adj. Entries' },
  { href: '/admin/reports',           label: 'Reports'      },
]

const ACCOUNTANT_LINKS = [
  { href: '/accountant/dashboard',         label: 'Dashboard'    },
  { href: '/accountant/queue',             label: 'Queue',        badge: true },
  { href: '/accountant/adjusting-entries', label: 'Adj. Entries' },
  { href: '/accountant/clients',           label: 'My Clients'   },
  { href: '/accountant/reports',           label: 'Reports'      },
]

const CLIENT_LINKS = [
  { href: '/client/dashboard', label: 'Dashboard' },
  { href: '/client/upload',    label: 'Upload'     },
  { href: '/client/documents', label: 'Documents'  },
  { href: '/client/reports',   label: 'Reports'    },
]

const ROLE_LINKS: Record<string, { href: string; label: string; badge?: boolean }[]> = {
  admin:      ADMIN_LINKS,
  accountant: ACCOUNTANT_LINKS,
  client:     CLIENT_LINKS,
}

export function Topbar() {
  const pathname  = usePathname()
  const router    = useRouter()
  const { user, logout } = useAuth()
  const [queueCount, setQueueCount] = useState(0)
  const [menuOpen,   setMenuOpen]   = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (user?.role === 'accountant') {
      getQueue().then((items) => setQueueCount(items.length)).catch(() => {})
    }
  }, [user?.role])

  useEffect(() => {
    if (user?.role !== 'accountant') return
    function handle(e: Event) {
      setQueueCount((e as CustomEvent<{ count: number }>).detail.count)
    }
    window.addEventListener('sofia:queue-count-changed', handle)
    return () => window.removeEventListener('sofia:queue-count-changed', handle)
  }, [user?.role])

  useEffect(() => {
    if (!menuOpen) return
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [menuOpen])

  const handleLogout = async () => {
    setMenuOpen(false)
    await logout()
    router.push('/login')
  }

  const links    = ROLE_LINKS[user?.role ?? ''] ?? []
  const initials = user?.name?.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase() ?? '?'

  return (
    <header
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 28,
        padding: '0 36px',
        height: 70,
        borderBottom: '1px solid var(--t-line)',
        background: 'var(--t-nav-bg)',
        backdropFilter: 'blur(10px)',
        position: 'sticky',
        top: 0,
        zIndex: 10,
        flexShrink: 0,
      }}
    >
      {/* Brand */}
      <Link
        href={user?.role ? `/${user.role}/dashboard` : '/login'}
        style={{ display: 'flex', alignItems: 'center', gap: 11, textDecoration: 'none' }}
      >
        <span
          style={{
            width: 34, height: 34, borderRadius: 10,
            display: 'grid', placeItems: 'center', flexShrink: 0,
            background: 'linear-gradient(150deg, var(--t-primary), var(--t-primary-deep))',
          }}
        >
          <svg viewBox="0 0 24 24" width={19} height={19} aria-hidden>
            <circle cx="12"   cy="14.6" r="5.1"  fill="#fff" />
            <circle cx="6.4"  cy="8.6"  r="2.25" fill="#fff" />
            <circle cx="12"   cy="6.1"  r="2.25" fill="#fff" />
            <circle cx="17.6" cy="8.6"  r="2.25" fill="#fff" />
          </svg>
        </span>
        <span
          style={{
            fontFamily: 'var(--font-display)',
            fontWeight: 700,
            fontSize: 17,
            letterSpacing: '-.01em',
            color: 'var(--t-ink)',
          }}
        >
          Sofia Books
        </span>
      </Link>

      {/* Nav */}
      <nav style={{ display: 'flex', gap: 4, marginLeft: 8 }}>
        {links.map((link) => {
          const active = pathname.startsWith(link.href)
          const count  = (link.badge && user?.role === 'accountant') ? queueCount : 0
          return (
            <Link
              key={link.href}
              href={link.href}
              style={{
                display: 'flex', alignItems: 'center', gap: 7,
                padding: '8px 14px', borderRadius: 10,
                fontSize: 14, fontWeight: active ? 700 : 600,
                color: active ? 'var(--t-primary)' : 'var(--t-muted)',
                background: active ? 'var(--t-primary-soft)' : 'transparent',
                textDecoration: 'none',
              }}
            >
              {link.label}
              {count > 0 && (
                <span
                  style={{
                    fontSize: 11, fontWeight: 800, color: '#fff',
                    background: 'var(--t-tier-review-fg)',
                    borderRadius: 999, padding: '1px 7px',
                  }}
                >
                  {count}
                </span>
              )}
            </Link>
          )
        })}
      </nav>

      <div style={{ flex: 1 }} />

      <ThemeToggle />
      <NotificationBell />

      {/* Avatar + dropdown */}
      <div style={{ position: 'relative' }} ref={menuRef}>
        <button
          onClick={() => setMenuOpen((v) => !v)}
          aria-label={initials}
          style={{
            width: 38, height: 38, borderRadius: 11,
            display: 'grid', placeItems: 'center',
            fontSize: 13, fontWeight: 800,
            color: 'var(--t-primary)', background: 'var(--t-primary-soft)',
            border: '1px solid var(--t-line)', cursor: 'pointer',
          }}
        >
          {initials}
        </button>

        {menuOpen && (
          <div
            style={{
              position: 'absolute', right: 0, top: 46,
              background: 'var(--t-card)', border: '1px solid var(--t-line)',
              borderRadius: 12, boxShadow: 'var(--t-shadow)',
              minWidth: 170, zIndex: 50, overflow: 'hidden',
            }}
          >
            <div style={{ padding: '12px 14px', borderBottom: '1px solid var(--t-line)' }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--t-ink)' }}>{user?.name}</div>
              {user?.email && (
                <div style={{ fontSize: 11, color: 'var(--t-faint)', marginTop: 2 }}>{user.email}</div>
              )}
            </div>
            <Link
              href={`/${user?.role}/settings`}
              onClick={() => setMenuOpen(false)}
              style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '10px 14px', fontSize: 13,
                color: 'var(--t-ink)', textDecoration: 'none',
              }}
            >
              ⚙ Settings
            </Link>
            <div style={{ height: 1, background: 'var(--t-line)' }} />
            <button
              onClick={handleLogout}
              style={{
                width: '100%', display: 'flex', alignItems: 'center', gap: 8,
                padding: '10px 14px', fontSize: 13, color: '#ef4444',
                background: 'transparent', border: 0, cursor: 'pointer',
              }}
            >
              ↩ Log out
            </button>
          </div>
        )}
      </div>
    </header>
  )
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
cd frontend && npx jest --testPathPattern="components/layout/__tests__/Topbar" --no-coverage
```

Expected: PASS — all 5 tests green.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/layout/Topbar.tsx frontend/src/components/layout/__tests__/Topbar.test.tsx
git commit -m "feat: unify Topbar with AccountantTopbar visual style (pug icon, pill nav, CSS vars)"
```

---

## Task 2: Migrate accountant layout + delete AccountantTopbar

**Files:**
- Modify: `frontend/src/app/accountant/layout.tsx`
- Delete: `frontend/src/components/layout/AccountantTopbar.tsx`

- [ ] **Step 1: Update accountant/layout.tsx**

Replace the entire content of `frontend/src/app/accountant/layout.tsx`:

```tsx
'use client'

import { ThemeProvider } from '@/components/layout/ThemeProvider'
import { Topbar } from '@/components/layout/Topbar'

export default function AccountantLayout({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          background: 'var(--t-surface)',
          color: 'var(--t-ink)',
        }}
      >
        <Topbar />
        <main style={{ flex: 1, overflow: 'auto' }}>
          {children}
        </main>
      </div>
    </ThemeProvider>
  )
}
```

- [ ] **Step 2: Delete AccountantTopbar.tsx**

```bash
rm frontend/src/components/layout/AccountantTopbar.tsx
```

- [ ] **Step 3: Run accountant dashboard tests to verify nothing broke**

```bash
cd frontend && npx jest --testPathPattern="accountant/dashboard/__tests__" --no-coverage
```

Expected: PASS — all 6 accountant dashboard tests still green (they mock `AccountantTopbar` is not imported in the dashboard page, so deletion has no effect there).

- [ ] **Step 4: Commit**

```bash
git add frontend/src/app/accountant/layout.tsx
git rm frontend/src/components/layout/AccountantTopbar.tsx
git commit -m "refactor: replace AccountantTopbar with shared Topbar in accountant layout"
```

---

## Task 3: Update admin layout

**Files:**
- Modify: `frontend/src/app/admin/layout.tsx`

- [ ] **Step 1: Rewrite admin/layout.tsx**

Replace the entire content of `frontend/src/app/admin/layout.tsx`:

```tsx
'use client'

import { ThemeProvider } from '@/components/layout/ThemeProvider'
import { Topbar } from '@/components/layout/Topbar'

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          background: 'var(--t-surface)',
          color: 'var(--t-ink)',
        }}
      >
        <Topbar />
        <main style={{ flex: 1, overflow: 'auto' }}>
          <div style={{ maxWidth: 1280, margin: '0 auto' }}>
            {children}
          </div>
        </main>
      </div>
    </ThemeProvider>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/app/admin/layout.tsx
git commit -m "feat: add ThemeProvider and bump max-width to 1280px in admin layout"
```

---

## Task 4: Rewrite admin dashboard page

**Files:**
- Create: `frontend/src/app/admin/dashboard/__tests__/page.test.tsx`
- Modify: `frontend/src/app/admin/dashboard/page.tsx`

- [ ] **Step 1: Create the failing test file**

Create `frontend/src/app/admin/dashboard/__tests__/page.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react'
import AdminDashboardPage from '../page'

jest.mock('@/components/layout/ThemeProvider', () => ({
  useTheme: () => ({ theme: 'sofia', setTheme: jest.fn() }),
}))
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn() }),
}))
jest.mock('@/lib/hooks/useAuth', () => ({
  useAuth: () => ({ user: { name: 'Admin User', role: 'admin' } }),
}))
jest.mock('@/components/dashboard/MascotCompanion', () => ({
  MascotCompanion: () => <div data-testid="mascot" />,
}))
jest.mock('@tanstack/react-query', () => ({
  useQuery: ({ queryKey }: { queryKey: string[] }) => {
    if (queryKey[0] === 'admin-dashboard') {
      return {
        data: {
          accountants: [
            { id: '1', name: 'Maria Santos', clientCount: 3, redCount: 2, yellowCount: 1, greenCount: 0, pendingEntries: 4 },
          ],
          openRedItems: 2,
        },
        isLoading: false,
      }
    }
    if (queryKey[0] === 'admin-billing') {
      return { data: [], isLoading: false }
    }
    if (queryKey[0] === 'admin-clients-all') {
      return { data: { data: [] }, isLoading: false }
    }
    return { data: undefined, isLoading: false }
  },
}))

function wrap() {
  return render(
    <div data-theme="sofia">
      <AdminDashboardPage />
    </div>
  )
}

describe('AdminDashboardPage', () => {
  it('renders greeting with first name', () => {
    wrap()
    expect(screen.getByText(/Good (morning|afternoon|evening), Admin/)).toBeInTheDocument()
  })

  it('renders mascot companion', () => {
    wrap()
    expect(screen.getByTestId('mascot')).toBeInTheDocument()
  })

  it('renders all four stat card labels', () => {
    wrap()
    expect(screen.getByText(/total clients/i)).toBeInTheDocument()
    expect(screen.getByText(/open red items/i)).toBeInTheDocument()
    expect(screen.getByText(/active accountants/i)).toBeInTheDocument()
    expect(screen.getByText(/revenue/i)).toBeInTheDocument()
  })

  it('renders accountant workload section with accountant name', () => {
    wrap()
    expect(screen.getByText('Accountant Workload')).toBeInTheDocument()
    expect(screen.getByText('Maria Santos')).toBeInTheDocument()
  })

  it('renders system overview section', () => {
    wrap()
    expect(screen.getByText('System Overview')).toBeInTheDocument()
    expect(screen.getByText('Open RED items')).toBeInTheDocument()
    expect(screen.getByText('Pending entries')).toBeInTheDocument()
  })

  it('renders Go to Queue CTA button', () => {
    wrap()
    expect(screen.getByRole('button', { name: /Go to Queue/ })).toBeInTheDocument()
  })

  it('renders recent payments section', () => {
    wrap()
    expect(screen.getByText('Recent Payments')).toBeInTheDocument()
    expect(screen.getByText('No payments recorded yet.')).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd frontend && npx jest --testPathPattern="admin/dashboard/__tests__" --no-coverage
```

Expected: FAIL — the current page doesn't have greeting, mascot, or System Overview.

- [ ] **Step 3: Rewrite admin dashboard page**

Replace the entire content of `frontend/src/app/admin/dashboard/page.tsx`:

```tsx
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
  const router     = useRouter()
  const { user }   = useAuth()
  const { theme }  = useTheme()

  const { data, isLoading } = useQuery({ queryKey: ['admin-dashboard'],   queryFn: getDashboard })
  const { data: payments }  = useQuery({ queryKey: ['admin-billing'],     queryFn: () => getPayments() })
  const { data: clientsResp } = useQuery({ queryKey: ['admin-clients-all'], queryFn: () => getClients() })

  const firstName   = user?.name?.split(' ')[0] ?? 'there'
  const today       = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })
  const now         = new Date()
  const thisMonth   = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  const monthLabel  = now.toLocaleDateString('en-US', { month: 'short' })

  const accountants    = data?.accountants ?? []
  const totalClients   = accountants.reduce((s, a) => s + a.clientCount, 0)
  const openRedItems   = data?.openRedItems ?? 0
  const totalRed       = accountants.reduce((s, a) => s + a.redCount, 0)
  const totalYellow    = accountants.reduce((s, a) => s + (a.yellowCount ?? 0), 0)
  const totalPending   = accountants.reduce((s, a) => s + a.pendingEntries, 0)

  const allPayments        = payments ?? []
  const revenueThisMonth   = allPayments
    .filter((p) => p.dateReceived.startsWith(thisMonth))
    .reduce((s, p) => s + p.amount, 0)
  const clientMap          = new Map((clientsResp?.data ?? []).map((c) => [c.clientId, c.name]))
  const recentPayments     = [...allPayments]
    .sort((a, b) => b.dateReceived.localeCompare(a.dateReceived))
    .slice(0, 5)

  const STAT_CARDS = [
    { label: 'Total Clients',      value: isLoading ? '—' : String(totalClients),       sub: 'across all accountants',   color: 'var(--t-ink)'             },
    { label: 'Open RED Items',     value: isLoading ? '—' : String(openRedItems),        sub: 'need immediate review',    color: 'var(--t-tier-review-fg)'  },
    { label: 'Active Accountants', value: isLoading ? '—' : String(accountants.length),  sub: 'on the team',              color: 'var(--t-primary)'         },
    { label: `Revenue (${monthLabel})`, value: formatAmount(revenueThisMonth),           sub: 'from payments this month', color: '#16a34a'                   },
  ]

  return (
    <div style={{ width: '100%', padding: '30px 36px', display: 'flex', flexDirection: 'column', gap: 22 }}>

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
            {today} · {totalClients} clients · {openRedItems} open RED items
          </p>
        </div>
        <div style={{ width: 430, flexShrink: 0 }}>
          <MascotCompanion theme={theme} />
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
                      { key: 'review', count: a.redCount,           label: 'RED' },
                      { key: 'check',  count: a.yellowCount ?? 0,   label: 'YEL' },
                      { key: 'ready',  count: a.greenCount  ?? 0,   label: 'GRN' },
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
              <WeekStat value={String(totalRed)}     label="Open RED items"   sub="need review"              accent />
              <WeekStat value={String(totalYellow)}  label="Yellow items"     sub="awaiting check" />
              <WeekStat value={String(totalPending)} label="Pending entries"  sub="awaiting admin approval" />
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
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
cd frontend && npx jest --testPathPattern="admin/dashboard/__tests__" --no-coverage
```

Expected: PASS — all 7 tests green.

- [ ] **Step 5: Take a screenshot to verify visually**

```bash
node screenshot-dashboards.mjs
```

Open `screenshot-admin.png` and verify:
- Pug icon in topbar, pill-style nav
- Greeting ("Good morning/afternoon/evening, [name]") + mascot in top-right
- 4 rounded stat cards in a row
- Accountant Workload (left) + System Overview panel with "Go to Queue" button (right)
- Recent Payments table at bottom with rounded card

- [ ] **Step 6: Commit**

```bash
git add frontend/src/app/admin/dashboard/page.tsx frontend/src/app/admin/dashboard/__tests__/page.test.tsx
git commit -m "feat: redesign admin dashboard — greeting, mascot, stat cards, two-column layout"
```

---

## Run all changed tests together

After all tasks complete, run the full set of affected tests:

```bash
cd frontend && npx jest --testPathPattern="(components/layout/__tests__/Topbar|accountant/dashboard/__tests__|admin/dashboard/__tests__)" --no-coverage
```

Expected: All tests pass.
