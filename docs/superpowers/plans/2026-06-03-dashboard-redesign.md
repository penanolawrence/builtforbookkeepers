# Dashboard Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the accountant dashboard with the high-fidelity Option A design — Sofia/Yoda theme system, redesigned 70px nav for all accountant pages, and full dashboard content (greeting + mascot, tier cards, clients table, week rail).

**Architecture:** CSS custom properties on a `data-theme` attribute drive all Sofia/Yoda tokens. A thin `ThemeContext` shares theme state from `accountant/layout.tsx` to page components (Next.js App Router can't pass props through `children`). `AccountantTopbar` replaces `Topbar` for all accountant pages; the dashboard page assembles the redesigned content using new `dashboard/` components.

**Tech Stack:** Next.js 14 App Router, React 18, TypeScript, Tailwind CSS (structural only — themed colors via CSS vars), Lucide React, `@testing-library/react`

**Spec:** `docs/superpowers/specs/2026-06-03-dashboard-redesign-design.md`

---

## File Map

| File | Action | Responsibility |
|---|---|---|
| `frontend/src/app/accountant/accountant.css` | Create | All Sofia/Yoda CSS custom property token sets + responsive breakpoint rules |
| `frontend/src/components/dashboard/ThemeContext.tsx` | Create | `ThemeProvider` + `useTheme()` — shares `{ theme, setTheme }` from layout to page |
| `frontend/src/app/accountant/layout.tsx` | Modify | Add theme state (localStorage), `data-theme` wrapper, `ThemeProvider`, swap `Topbar` → `AccountantTopbar` |
| `frontend/src/components/dashboard/ThemeToggle.tsx` | Create | Segmented Sofia/Yoda pill with animated sliding thumb; reads from `useTheme()` |
| `frontend/src/components/layout/AccountantTopbar.tsx` | Create | 70px sticky nav — brand, links, queue badge, `ThemeToggle`, `NotificationBell`, avatar+menu |
| `frontend/src/components/login/PugMascot.tsx` | Modify | Add optional `size` prop (default 320); login page unaffected |
| `frontend/src/components/dashboard/TierCard.tsx` | Create | `TierCard` (priority card) + `TierChip` (table badge) — both keyed on tier CSS vars |
| `frontend/src/components/dashboard/MascotCompanion.tsx` | Create | Card-layout wrapper: gradient panel + `PugMascot` + online dot + brief line |
| `frontend/src/components/dashboard/WeekStat.tsx` | Create | Stacked value / label / sub stat |
| `frontend/src/components/dashboard/ClientsTable.tsx` | Create | 8-column client grid with `TierChip` cells; receives pre-computed rows |
| `frontend/src/app/accountant/dashboard/page.tsx` | Modify | Full rewrite: fetches data, assembles greeting + tiers + clients/rail sections |

---

## Task 1: CSS Tokens + ThemeContext

**Files:**
- Create: `frontend/src/app/accountant/accountant.css`
- Create: `frontend/src/components/dashboard/ThemeContext.tsx`
- Create: `frontend/src/components/dashboard/__tests__/ThemeContext.test.tsx`

- [ ] **Step 1: Verify display fonts are loaded**

Open `frontend/src/app/layout.tsx`. Confirm it imports `Bricolage_Grotesque` and `Plus_Jakarta_Sans` and exposes them as CSS variables `--font-display` and `--font-body` on `<html>`. This was done in the login redesign — if present, skip. If missing:

```ts
import { Bricolage_Grotesque, Plus_Jakarta_Sans } from 'next/font/google'

const bricolage = Bricolage_Grotesque({
  subsets: ['latin'],
  weight: ['500', '600', '700', '800'],
  variable: '--font-display',
})
const jakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  variable: '--font-body',
})
```

Apply both `variable` values to `<html className={`${bricolage.variable} ${jakarta.variable} ...`}>`.

- [ ] **Step 2: Write the failing ThemeContext test**

Create `frontend/src/components/dashboard/__tests__/ThemeContext.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ThemeProvider, useTheme } from '../ThemeContext'

function Consumer() {
  const { theme, setTheme } = useTheme()
  return (
    <>
      <span data-testid="theme">{theme}</span>
      <button onClick={() => setTheme('yoda')}>to-yoda</button>
    </>
  )
}

describe('ThemeContext', () => {
  it('provides the value supplied by ThemeProvider', () => {
    render(
      <ThemeProvider value={{ theme: 'sofia', setTheme: jest.fn() }}>
        <Consumer />
      </ThemeProvider>
    )
    expect(screen.getByTestId('theme').textContent).toBe('sofia')
  })

  it('calls setTheme when consumer requests a change', async () => {
    const setTheme = jest.fn()
    render(
      <ThemeProvider value={{ theme: 'sofia', setTheme }}>
        <Consumer />
      </ThemeProvider>
    )
    await userEvent.click(screen.getByText('to-yoda'))
    expect(setTheme).toHaveBeenCalledWith('yoda')
  })
})
```

- [ ] **Step 3: Run test — expect FAIL**

```bash
cd frontend && npx jest --watchAll=false --testPathPattern="ThemeContext.test"
```

Expected: FAIL — `Cannot find module '../ThemeContext'`

- [ ] **Step 4: Create ThemeContext**

Create `frontend/src/components/dashboard/ThemeContext.tsx`:

```tsx
'use client'

import { createContext, useContext } from 'react'

export type Theme = 'sofia' | 'yoda'

interface ThemeContextValue {
  theme: Theme
  setTheme: (t: Theme) => void
}

const ThemeContext = createContext<ThemeContextValue>({ theme: 'sofia', setTheme: () => {} })

export function ThemeProvider({
  value,
  children,
}: {
  value: ThemeContextValue
  children: React.ReactNode
}) {
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export function useTheme(): ThemeContextValue {
  return useContext(ThemeContext)
}
```

- [ ] **Step 5: Run test — expect PASS**

```bash
cd frontend && npx jest --watchAll=false --testPathPattern="ThemeContext.test"
```

Expected: PASS

- [ ] **Step 6: Create accountant.css**

Create `frontend/src/app/accountant/accountant.css`:

```css
[data-theme="sofia"] {
  --surface:         #F6F1E9;
  --card:            #FFFFFF;
  --card-alt:        #FBF7F1;
  --ink:             #2A2433;
  --muted:           #8A8295;
  --faint:           #B4AEC0;
  --line:            #ECE4D8;
  --line-soft:       #F2EBE0;
  --primary:         #E2568C;
  --primary-deep:    #C53C76;
  --primary-soft:    #FBE6EF;
  --chip-bg:         #F6F1E9;
  --nav-bg:          rgba(255, 255, 255, 0.86);
  --field-bg:        #F6F1E9;
  --accent-glow:     #FFADD2;
  --shadow:          0 1px 2px rgba(42, 28, 60, 0.04), 0 14px 34px -18px rgba(42, 28, 60, 0.18);
  --tier-review-fg:  #C2553D;
  --tier-review-bg:  #F7E5DD;
  --tier-review-ring: #EBCBBE;
  --tier-check-fg:   #A9791A;
  --tier-check-bg:   #F6ECD4;
  --tier-check-ring: #E8D5A6;
  --tier-ready-fg:   #3C8E6C;
  --tier-ready-bg:   #DEEEE5;
  --tier-ready-ring: #BCDFCD;
  --tier-pending-fg: #6A5ECF;
  --tier-pending-bg: #E9E3F8;
  --tier-pending-ring: #D3C9EF;
}

[data-theme="yoda"] {
  --surface:         #13111C;
  --card:            #1C1928;
  --card-alt:        #211D2E;
  --ink:             #ECEAF2;
  --muted:           #9A93AE;
  --faint:           #6E6880;
  --line:            #2C2838;
  --line-soft:       #252132;
  --primary:         #7C9CFF;
  --primary-deep:    #5B7CF0;
  --primary-soft:    rgba(124, 156, 255, 0.14);
  --chip-bg:         #211D2E;
  --nav-bg:          rgba(22, 20, 32, 0.82);
  --field-bg:        #211D2E;
  --accent-glow:     #AFC4FF;
  --shadow:          0 1px 2px rgba(0, 0, 0, 0.3), 0 18px 40px -20px rgba(0, 0, 0, 0.6);
  --tier-review-fg:  #F0987B;
  --tier-review-bg:  rgba(225, 120, 90, 0.15);
  --tier-review-ring: rgba(225, 120, 90, 0.32);
  --tier-check-fg:   #E8C06B;
  --tier-check-bg:   rgba(220, 175, 80, 0.14);
  --tier-check-ring: rgba(220, 175, 80, 0.30);
  --tier-ready-fg:   #6FD6A6;
  --tier-ready-bg:   rgba(80, 200, 150, 0.14);
  --tier-ready-ring: rgba(80, 200, 150, 0.30);
  --tier-pending-fg: #A6B7FF;
  --tier-pending-bg: rgba(124, 156, 255, 0.16);
  --tier-pending-ring: rgba(124, 156, 255, 0.34);
}

[data-theme="sofia"],
[data-theme="yoda"] {
  transition: background-color 0.5s, color 0.5s, border-color 0.5s;
}

/* Responsive breakpoints used by dashboard page */
@media (max-width: 1100px) {
  .dash-bottom-grid {
    grid-template-columns: 1fr !important;
  }
}

@media (max-width: 768px) {
  .dash-tier-grid {
    grid-template-columns: repeat(2, 1fr) !important;
  }
}
```

- [ ] **Step 7: Update accountant/layout.tsx**

Replace the entire file with:

```tsx
'use client'

import './accountant.css'
import { useState, useEffect } from 'react'
import { AccountantTopbar } from '@/components/layout/AccountantTopbar'
import { ThemeProvider } from '@/components/dashboard/ThemeContext'

export default function AccountantLayout({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<'sofia' | 'yoda'>('sofia')

  useEffect(() => {
    const saved = localStorage.getItem('sofia_theme')
    if (saved === 'sofia' || saved === 'yoda') setTheme(saved)
  }, [])

  const handleSetTheme = (t: 'sofia' | 'yoda') => {
    setTheme(t)
    localStorage.setItem('sofia_theme', t)
  }

  return (
    <ThemeProvider value={{ theme, setTheme: handleSetTheme }}>
      <div
        data-theme={theme}
        style={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          background: 'var(--surface)',
          color: 'var(--ink)',
        }}
      >
        <AccountantTopbar />
        <main style={{ flex: 1, overflow: 'auto' }}>
          {children}
        </main>
      </div>
    </ThemeProvider>
  )
}
```

> **Note:** The old layout wrapped `children` in `max-w-[1100px] mx-auto p-6`. That wrapper is gone — the dashboard page controls its own padding. After Task 9 is done, open `/accountant/queue`, `/accountant/adjusting-entries`, `/accountant/clients`, and `/accountant/reports` in the browser. If any look too wide, add `<div className="max-w-[1100px] mx-auto p-6">` around the page's root `<div>` in each affected page file.

- [ ] **Step 8: Commit**

```bash
git add frontend/src/app/accountant/accountant.css \
        frontend/src/components/dashboard/ThemeContext.tsx \
        frontend/src/components/dashboard/__tests__/ThemeContext.test.tsx \
        frontend/src/app/accountant/layout.tsx
git commit -m "feat: add Sofia/Yoda theme tokens, ThemeContext, accountant layout"
```

---

## Task 2: ThemeToggle

**Files:**
- Create: `frontend/src/components/dashboard/ThemeToggle.tsx`
- Create: `frontend/src/components/dashboard/__tests__/ThemeToggle.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `frontend/src/components/dashboard/__tests__/ThemeToggle.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ThemeToggle } from '../ThemeToggle'
import { ThemeProvider } from '../ThemeContext'

function wrap(theme: 'sofia' | 'yoda', setTheme = jest.fn()) {
  return render(
    <ThemeProvider value={{ theme, setTheme }}>
      <ThemeToggle />
    </ThemeProvider>
  )
}

describe('ThemeToggle', () => {
  it('renders Sofia and Yoda tabs', () => {
    wrap('sofia')
    expect(screen.getByRole('tab', { name: 'Sofia' })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'Yoda' })).toBeInTheDocument()
  })

  it('marks the active theme as aria-selected=true', () => {
    wrap('yoda')
    expect(screen.getByRole('tab', { name: 'Yoda' })).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByRole('tab', { name: 'Sofia' })).toHaveAttribute('aria-selected', 'false')
  })

  it('calls setTheme when the inactive tab is clicked', async () => {
    const setTheme = jest.fn()
    wrap('sofia', setTheme)
    await userEvent.click(screen.getByRole('tab', { name: 'Yoda' }))
    expect(setTheme).toHaveBeenCalledWith('yoda')
  })
})
```

- [ ] **Step 2: Run test — expect FAIL**

```bash
cd frontend && npx jest --watchAll=false --testPathPattern="ThemeToggle.test"
```

Expected: FAIL — `Cannot find module '../ThemeToggle'`

- [ ] **Step 3: Implement ThemeToggle**

Create `frontend/src/components/dashboard/ThemeToggle.tsx`:

```tsx
'use client'

import { useTheme } from './ThemeContext'

export function ThemeToggle() {
  const { theme, setTheme } = useTheme()

  return (
    <div
      role="tablist"
      aria-label="Theme"
      style={{
        position: 'relative',
        display: 'flex',
        padding: 4,
        borderRadius: 999,
        background: theme === 'sofia' ? '#EFE7DA' : '#211D2E',
        border: '1px solid var(--line)',
      }}
    >
      {/* Sliding thumb */}
      <span
        aria-hidden
        style={{
          position: 'absolute',
          top: 4,
          bottom: 4,
          width: 'calc(50% - 4px)',
          borderRadius: 999,
          background: 'linear-gradient(150deg, var(--primary), var(--primary-deep))',
          left: 4,
          transform: theme === 'sofia' ? 'translateX(0)' : 'translateX(100%)',
          transition: 'transform .32s cubic-bezier(.34,1.3,.5,1)',
        }}
      />
      {(['sofia', 'yoda'] as const).map((k) => (
        <button
          key={k}
          role="tab"
          aria-selected={theme === k}
          onClick={() => setTheme(k)}
          style={{
            position: 'relative',
            zIndex: 2,
            border: 0,
            background: 'transparent',
            cursor: 'pointer',
            fontFamily: 'inherit',
            fontWeight: 700,
            fontSize: 12.5,
            padding: '6px 16px',
            borderRadius: 999,
            color: theme === k ? '#fff' : 'var(--muted)',
            transition: 'color .25s',
          }}
        >
          {k === 'sofia' ? 'Sofia' : 'Yoda'}
        </button>
      ))}
    </div>
  )
}
```

- [ ] **Step 4: Run test — expect PASS**

```bash
cd frontend && npx jest --watchAll=false --testPathPattern="ThemeToggle.test"
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/dashboard/ThemeToggle.tsx \
        frontend/src/components/dashboard/__tests__/ThemeToggle.test.tsx
git commit -m "feat: add ThemeToggle component"
```

---

## Task 3: AccountantTopbar

**Files:**
- Create: `frontend/src/components/layout/AccountantTopbar.tsx`
- Create: `frontend/src/components/layout/__tests__/AccountantTopbar.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `frontend/src/components/layout/__tests__/AccountantTopbar.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react'
import { AccountantTopbar } from '../AccountantTopbar'
import { ThemeProvider } from '@/components/dashboard/ThemeContext'

jest.mock('next/navigation', () => ({
  usePathname: () => '/accountant/dashboard',
  useRouter:   () => ({ push: jest.fn() }),
}))
jest.mock('@/lib/hooks/useAuth', () => ({
  useAuth: () => ({
    user: { name: 'Maria Santos', email: 'maria@firm.ph', role: 'accountant' },
    logout: jest.fn(),
  }),
}))
jest.mock('@/lib/api/queue', () => ({
  getQueue: () => Promise.resolve([]),
}))
jest.mock('@/components/layout/NotificationBell', () => ({
  NotificationBell: () => <div data-testid="notification-bell" />,
}))
jest.mock('@/components/dashboard/ThemeToggle', () => ({
  ThemeToggle: () => <div data-testid="theme-toggle" />,
}))

function wrap() {
  return render(
    <ThemeProvider value={{ theme: 'sofia', setTheme: jest.fn() }}>
      <AccountantTopbar />
    </ThemeProvider>
  )
}

describe('AccountantTopbar', () => {
  it('renders Sofia Books brand', () => {
    wrap()
    expect(screen.getByText('Sofia Books')).toBeInTheDocument()
  })

  it('renders all 5 nav links', () => {
    wrap()
    expect(screen.getByRole('link', { name: /Dashboard/  })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Queue/      })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Adj\. Entries/ })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /My Clients/ })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Reports/    })).toBeInTheDocument()
  })

  it('renders user initials in avatar', () => {
    wrap()
    expect(screen.getByText('MS')).toBeInTheDocument()
  })

  it('renders ThemeToggle and NotificationBell', () => {
    wrap()
    expect(screen.getByTestId('theme-toggle')).toBeInTheDocument()
    expect(screen.getByTestId('notification-bell')).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run test — expect FAIL**

```bash
cd frontend && npx jest --watchAll=false --testPathPattern="AccountantTopbar.test"
```

Expected: FAIL — `Cannot find module '../AccountantTopbar'`

- [ ] **Step 3: Implement AccountantTopbar**

Create `frontend/src/components/layout/AccountantTopbar.tsx`:

```tsx
'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useAuth } from '@/lib/hooks/useAuth'
import { useEffect, useRef, useState } from 'react'
import { getQueue } from '@/lib/api/queue'
import { NotificationBell } from './NotificationBell'
import { ThemeToggle } from '@/components/dashboard/ThemeToggle'

const LINKS = [
  { href: '/accountant/dashboard',         label: 'Dashboard'   },
  { href: '/accountant/queue',             label: 'Queue',       badge: true },
  { href: '/accountant/adjusting-entries', label: 'Adj. Entries' },
  { href: '/accountant/clients',           label: 'My Clients'  },
  { href: '/accountant/reports',           label: 'Reports'     },
] as const

export function AccountantTopbar() {
  const pathname = usePathname()
  const router   = useRouter()
  const { user, logout } = useAuth()
  const [queueCount, setQueueCount] = useState(0)
  const [menuOpen, setMenuOpen]     = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    getQueue().then((items) => setQueueCount(items.length)).catch(() => {})
  }, [])

  useEffect(() => {
    function handle(e: Event) {
      setQueueCount((e as CustomEvent<{ count: number }>).detail.count)
    }
    window.addEventListener('sofia:queue-count-changed', handle)
    return () => window.removeEventListener('sofia:queue-count-changed', handle)
  }, [])

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

  const initials = user?.name
    ?.split(' ').map((n: string) => n[0]).slice(0, 2).join('').toUpperCase() ?? '?'

  return (
    <header
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 28,
        padding: '0 36px',
        height: 70,
        borderBottom: '1px solid var(--line)',
        background: 'var(--nav-bg)',
        backdropFilter: 'blur(10px)',
        position: 'sticky',
        top: 0,
        zIndex: 10,
        flexShrink: 0,
      }}
    >
      {/* Brand */}
      <Link
        href="/accountant/dashboard"
        style={{ display: 'flex', alignItems: 'center', gap: 11, textDecoration: 'none' }}
      >
        <span
          style={{
            width: 34, height: 34, borderRadius: 10,
            display: 'grid', placeItems: 'center', flexShrink: 0,
            background: 'linear-gradient(150deg, var(--primary), var(--primary-deep))',
          }}
        >
          <svg viewBox="0 0 24 24" width={19} height={19} aria-hidden>
            <circle cx="12" cy="14.6" r="5.1"  fill="#fff" />
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
            color: 'var(--ink)',
          }}
        >
          Sofia Books
        </span>
      </Link>

      {/* Nav links */}
      <nav style={{ display: 'flex', gap: 4, marginLeft: 8 }}>
        {LINKS.map((link) => {
          const active = pathname.startsWith(link.href)
          const count  = link.badge ? queueCount : 0
          return (
            <Link
              key={link.href}
              href={link.href}
              style={{
                display: 'flex', alignItems: 'center', gap: 7,
                padding: '8px 14px', borderRadius: 10,
                fontSize: 14, fontWeight: active ? 700 : 600,
                color: active ? 'var(--primary)' : 'var(--muted)',
                background: active ? 'var(--primary-soft)' : 'transparent',
                textDecoration: 'none',
              }}
            >
              {link.label}
              {count > 0 && (
                <span
                  style={{
                    fontSize: 11, fontWeight: 800, color: '#fff',
                    background: 'var(--tier-review-fg)',
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
          style={{
            width: 38, height: 38, borderRadius: 11,
            display: 'grid', placeItems: 'center',
            fontSize: 13, fontWeight: 800,
            color: 'var(--primary)', background: 'var(--primary-soft)',
            border: '1px solid var(--line)', cursor: 'pointer',
          }}
        >
          {initials}
        </button>

        {menuOpen && (
          <div
            style={{
              position: 'absolute', right: 0, top: 46,
              background: 'var(--card)', border: '1px solid var(--line)',
              borderRadius: 12, boxShadow: 'var(--shadow)',
              minWidth: 170, zIndex: 50, overflow: 'hidden',
            }}
          >
            <div style={{ padding: '12px 14px', borderBottom: '1px solid var(--line)' }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)' }}>{user?.name}</div>
              {user?.email && (
                <div style={{ fontSize: 11, color: 'var(--faint)', marginTop: 2 }}>{user.email}</div>
              )}
            </div>
            <Link
              href="/accountant/settings"
              onClick={() => setMenuOpen(false)}
              style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '10px 14px', fontSize: 13,
                color: 'var(--ink)', textDecoration: 'none',
              }}
            >
              ⚙ Settings
            </Link>
            <div style={{ height: 1, background: 'var(--line)' }} />
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

- [ ] **Step 4: Run test — expect PASS**

```bash
cd frontend && npx jest --watchAll=false --testPathPattern="AccountantTopbar.test"
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/layout/AccountantTopbar.tsx \
        frontend/src/components/layout/__tests__/AccountantTopbar.test.tsx
git commit -m "feat: add AccountantTopbar — 70px themed nav for accountant role"
```

---

## Task 4: PugMascot size prop

**Files:**
- Modify: `frontend/src/components/login/PugMascot.tsx`

- [ ] **Step 1: Open the existing test to understand the baseline**

Read `frontend/src/components/login/__tests__/PugMascot.test.tsx`. The test should pass before and after this change.

- [ ] **Step 2: Add `size` prop to PugMascot**

In `frontend/src/components/login/PugMascot.tsx`, make two edits:

**Edit 1** — add `size` to the interface:
```ts
interface PugMascotProps {
  variant: 'sofia' | 'yoda'
  accent: string
  accentGlow: string
  peeking: boolean
  happy: boolean
  size?: number   // SVG width in px; height is proportional (viewBox 260×300 → default 320×369)
}
```

**Edit 2** — update the function signature and SVG element:
```tsx
export default function PugMascot({
  variant = 'sofia',
  accent = '#8E7DF2',
  accentGlow = '#BAAEFB',
  peeking = false,
  happy = false,
  size = 320,
}: PugMascotProps) {
  // ... (all existing code unchanged) ...

  const h = Math.round(size * (369 / 320))

  return (
    <svg
      ref={svgRef}
      className="pug-svg"
      viewBox="0 0 260 300"
      width={size}
      height={h}
      aria-label={`${isSofia ? 'Sofia' : 'Yoda'}, the AI pug`}
    >
```

- [ ] **Step 3: Run existing PugMascot tests — expect PASS**

```bash
cd frontend && npx jest --watchAll=false --testPathPattern="PugMascot.test"
```

Expected: PASS (no regressions)

- [ ] **Step 4: Commit**

```bash
git add frontend/src/components/login/PugMascot.tsx
git commit -m "feat: add optional size prop to PugMascot"
```

---

## Task 5: TierCard + TierChip

**Files:**
- Create: `frontend/src/components/dashboard/TierCard.tsx`
- Create: `frontend/src/components/dashboard/__tests__/TierCard.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `frontend/src/components/dashboard/__tests__/TierCard.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react'
import { TierCard, TierChip } from '../TierCard'

// Wrap in a data-theme div so CSS vars resolve (won't affect logic tests)
function withTheme(ui: React.ReactElement) {
  return render(<div data-theme="sofia">{ui}</div>)
}

const reviewTier = { key: 'review' as const, label: 'Needs review', count: 2, note: 'Anomalies flagged by AI' }
const clearTier  = { key: 'ready'  as const, label: 'Ready to approve', count: 0, note: 'Pre-sorted' }

describe('TierCard', () => {
  it('renders the label and note', () => {
    withTheme(<TierCard tier={reviewTier} />)
    expect(screen.getByText('Needs review')).toBeInTheDocument()
    expect(screen.getByText('Anomalies flagged by AI')).toBeInTheDocument()
  })

  it('renders the count number', () => {
    withTheme(<TierCard tier={reviewTier} />)
    expect(screen.getByText('2')).toBeInTheDocument()
  })

  it('shows "open" pill when count > 0', () => {
    withTheme(<TierCard tier={reviewTier} />)
    expect(screen.getByText('open')).toBeInTheDocument()
  })

  it('shows "all clear" pill when count is 0', () => {
    withTheme(<TierCard tier={clearTier} />)
    expect(screen.getByText('all clear')).toBeInTheDocument()
  })
})

describe('TierChip', () => {
  it('renders the count when > 0', () => {
    withTheme(<TierChip tierKey="check" count={3} />)
    expect(screen.getByText('3')).toBeInTheDocument()
  })

  it('renders an em-dash when count is 0', () => {
    withTheme(<TierChip tierKey="check" count={0} />)
    expect(screen.getByText('—')).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run test — expect FAIL**

```bash
cd frontend && npx jest --watchAll=false --testPathPattern="TierCard.test"
```

Expected: FAIL — `Cannot find module '../TierCard'`

- [ ] **Step 3: Implement TierCard and TierChip**

Create `frontend/src/components/dashboard/TierCard.tsx`:

```tsx
export type TierKey = 'review' | 'check' | 'ready' | 'pending'

export interface Tier {
  key: TierKey
  label: string
  count: number
  note: string
}

export function TierCard({ tier }: { tier: Tier }) {
  const k = tier.key
  return (
    <div
      style={{
        background: 'var(--card)',
        border: '1px solid var(--line)',
        borderRadius: 18,
        padding: '20px 22px',
        boxShadow: 'var(--shadow)',
      }}
    >
      {/* Header row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 14 }}>
        <span
          style={{
            width: 9, height: 9, borderRadius: 999,
            background: `var(--tier-${k}-fg)`,
            boxShadow: `0 0 0 4px var(--tier-${k}-bg)`,
          }}
        />
        <span style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--muted)', letterSpacing: '.01em' }}>
          {tier.label}
        </span>
      </div>

      {/* Count + status pill */}
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 12 }}>
        <span
          style={{
            fontFamily: 'var(--font-display)',
            fontWeight: 800,
            fontSize: 42,
            lineHeight: 0.9,
            color: `var(--tier-${k}-fg)`,
            letterSpacing: '-.03em',
          }}
        >
          {tier.count}
        </span>
        <span
          style={{
            marginBottom: 4,
            fontSize: 11,
            fontWeight: 700,
            padding: '3px 9px',
            borderRadius: 999,
            color: `var(--tier-${k}-fg)`,
            background: `var(--tier-${k}-bg)`,
            border: `1px solid var(--tier-${k}-ring)`,
          }}
        >
          {tier.count === 0 ? 'all clear' : 'open'}
        </span>
      </div>

      {/* Note */}
      <p style={{ margin: '12px 0 0', fontSize: 12.5, color: 'var(--faint)', lineHeight: 1.4 }}>
        {tier.note}
      </p>
    </div>
  )
}

export function TierChip({ tierKey, count }: { tierKey: TierKey; count: number }) {
  if (count === 0) {
    return <span style={{ color: 'var(--faint)', fontSize: 14 }}>—</span>
  }
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        minWidth: 24,
        height: 24,
        padding: '0 7px',
        borderRadius: 8,
        fontSize: 12.5,
        fontWeight: 700,
        color: `var(--tier-${tierKey}-fg)`,
        background: `var(--tier-${tierKey}-bg)`,
        border: `1px solid var(--tier-${tierKey}-ring)`,
      }}
    >
      {count}
    </span>
  )
}
```

- [ ] **Step 4: Run test — expect PASS**

```bash
cd frontend && npx jest --watchAll=false --testPathPattern="TierCard.test"
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/dashboard/TierCard.tsx \
        frontend/src/components/dashboard/__tests__/TierCard.test.tsx
git commit -m "feat: add TierCard and TierChip dashboard components"
```

---

## Task 6: MascotCompanion

**Files:**
- Create: `frontend/src/components/dashboard/MascotCompanion.tsx`
- Create: `frontend/src/components/dashboard/__tests__/MascotCompanion.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `frontend/src/components/dashboard/__tests__/MascotCompanion.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react'
import { MascotCompanion } from '../MascotCompanion'

// PugMascot does complex SVG + effects — mock it
jest.mock('@/components/login/PugMascot', () => ({
  __esModule: true,
  default: ({ variant }: { variant: string }) => <div data-testid="pug" data-variant={variant} />,
}))

describe('MascotCompanion', () => {
  it('shows "Sofia · your AI co-pilot" in sofia theme', () => {
    render(<div data-theme="sofia"><MascotCompanion theme="sofia" /></div>)
    expect(screen.getByText('Sofia · your AI co-pilot')).toBeInTheDocument()
  })

  it('shows "Yoda · your AI co-pilot" in yoda theme', () => {
    render(<div data-theme="yoda"><MascotCompanion theme="yoda" /></div>)
    expect(screen.getByText('Yoda · your AI co-pilot')).toBeInTheDocument()
  })

  it('passes variant to PugMascot', () => {
    render(<div data-theme="sofia"><MascotCompanion theme="sofia" /></div>)
    expect(screen.getByTestId('pug')).toHaveAttribute('data-variant', 'sofia')
  })

  it('renders the brief line', () => {
    render(<div data-theme="sofia"><MascotCompanion theme="sofia" /></div>)
    expect(screen.getByText(/2 entries need your eyes/)).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run test — expect FAIL**

```bash
cd frontend && npx jest --watchAll=false --testPathPattern="MascotCompanion.test"
```

Expected: FAIL — `Cannot find module '../MascotCompanion'`

- [ ] **Step 3: Implement MascotCompanion**

Create `frontend/src/components/dashboard/MascotCompanion.tsx`:

```tsx
import PugMascot from '@/components/login/PugMascot'

interface MascotCompanionProps {
  theme: 'sofia' | 'yoda'
  brief?: string
}

const ACCENT: Record<'sofia' | 'yoda', { accent: string; accentGlow: string }> = {
  sofia: { accent: '#E2568C', accentGlow: '#FFADD2' },
  yoda:  { accent: '#7C9CFF', accentGlow: '#AFC4FF' },
}

export function MascotCompanion({ theme, brief }: MascotCompanionProps) {
  const { accent, accentGlow } = ACCENT[theme]
  const name = theme === 'sofia' ? 'Sofia' : 'Yoda'
  const line = brief ?? "2 entries need your eyes — I've sorted the rest into batches."

  return (
    <div
      style={{
        background:
          theme === 'sofia'
            ? 'linear-gradient(150deg, var(--primary-soft), var(--card))'
            : 'linear-gradient(150deg, var(--card-alt), var(--card))',
        border: '1px solid var(--line)',
        borderRadius: 20,
        padding: '18px 20px',
        display: 'flex',
        alignItems: 'center',
        gap: 16,
        boxShadow: 'var(--shadow)',
        overflow: 'hidden',
      }}
    >
      {/* Mascot */}
      <div style={{ flexShrink: 0 }}>
        <PugMascot
          variant={theme}
          accent={accent}
          accentGlow={accentGlow}
          peeking={false}
          happy={false}
          size={108}
        />
      </div>

      {/* Copy */}
      <div style={{ minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 5 }}>
          <span
            style={{
              width: 7, height: 7, borderRadius: 999,
              background: '#3C8E6C',
              boxShadow: '0 0 0 3px rgba(60,142,108,.18)',
            }}
          />
          <span style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--primary)' }}>
            {name} · your AI co-pilot
          </span>
        </div>
        <p style={{ margin: 0, fontSize: 14.5, color: 'var(--ink)', lineHeight: 1.5, fontWeight: 500 }}>
          {line}
        </p>
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Run test — expect PASS**

```bash
cd frontend && npx jest --watchAll=false --testPathPattern="MascotCompanion.test"
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/dashboard/MascotCompanion.tsx \
        frontend/src/components/dashboard/__tests__/MascotCompanion.test.tsx
git commit -m "feat: add MascotCompanion dashboard component"
```

---

## Task 7: WeekStat

**Files:**
- Create: `frontend/src/components/dashboard/WeekStat.tsx`
- Create: `frontend/src/components/dashboard/__tests__/WeekStat.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `frontend/src/components/dashboard/__tests__/WeekStat.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react'
import { WeekStat } from '../WeekStat'

describe('WeekStat', () => {
  it('renders value, label, and sub', () => {
    render(<WeekStat value="312" label="Entries processed" sub="across 5 clients" />)
    expect(screen.getByText('312')).toBeInTheDocument()
    expect(screen.getByText('Entries processed')).toBeInTheDocument()
    expect(screen.getByText('across 5 clients')).toBeInTheDocument()
  })

  it('renders without sub when omitted', () => {
    render(<WeekStat value="96%" label="Auto-categorized" />)
    expect(screen.getByText('96%')).toBeInTheDocument()
    expect(screen.getByText('Auto-categorized')).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run test — expect FAIL**

```bash
cd frontend && npx jest --watchAll=false --testPathPattern="WeekStat.test"
```

Expected: FAIL — `Cannot find module '../WeekStat'`

- [ ] **Step 3: Implement WeekStat**

Create `frontend/src/components/dashboard/WeekStat.tsx`:

```tsx
interface WeekStatProps {
  value: string
  label: string
  sub?: string
  accent?: boolean  // if true, value renders in var(--primary)
}

export function WeekStat({ value, label, sub, accent }: WeekStatProps) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <span
        style={{
          fontFamily: 'var(--font-display)',
          fontWeight: 800,
          fontSize: 26,
          color: accent ? 'var(--primary)' : 'var(--ink)',
          letterSpacing: '-.02em',
          lineHeight: 1,
        }}
      >
        {value}
      </span>
      <span style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--ink)' }}>{label}</span>
      {sub && <span style={{ fontSize: 11.5, color: 'var(--faint)' }}>{sub}</span>}
    </div>
  )
}
```

- [ ] **Step 4: Run test — expect PASS**

```bash
cd frontend && npx jest --watchAll=false --testPathPattern="WeekStat.test"
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/dashboard/WeekStat.tsx \
        frontend/src/components/dashboard/__tests__/WeekStat.test.tsx
git commit -m "feat: add WeekStat dashboard component"
```

---

## Task 8: ClientsTable

**Files:**
- Create: `frontend/src/components/dashboard/ClientsTable.tsx`
- Create: `frontend/src/components/dashboard/__tests__/ClientsTable.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `frontend/src/components/dashboard/__tests__/ClientsTable.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react'
import { ClientsTable, ClientRow } from '../ClientsTable'

const rows: ClientRow[] = [
  { id: '1', name: 'ABC Trading Corp.', type: 'VAT',     plan: 'Growth',  review: 0, check: 1, ready: 0, pending: 0 },
  { id: '2', name: 'Northwind Logistics', type: 'VAT',   plan: 'Growth',  review: 1, check: 2, ready: 3, pending: 1, lastActive: '1h ago' },
  { id: '3', name: 'Mariposa Café',     type: 'Non-VAT', plan: 'Starter', review: 1, check: 0, ready: 4, pending: 0, lastActive: '3h ago' },
]

function wrap(onRowClick = jest.fn()) {
  return render(
    <div data-theme="sofia">
      <ClientsTable rows={rows} onRowClick={onRowClick} />
    </div>
  )
}

describe('ClientsTable', () => {
  it('renders all client names', () => {
    wrap()
    expect(screen.getByText('ABC Trading Corp.')).toBeInTheDocument()
    expect(screen.getByText('Northwind Logistics')).toBeInTheDocument()
    expect(screen.getByText('Mariposa Café')).toBeInTheDocument()
  })

  it('renders type and plan for each row', () => {
    wrap()
    expect(screen.getAllByText('VAT').length).toBeGreaterThan(0)
    expect(screen.getByText('Non-VAT')).toBeInTheDocument()
    expect(screen.getAllByText('Growth').length).toBeGreaterThan(0)
  })

  it('renders an em-dash for zero tier counts', () => {
    wrap()
    const dashes = screen.getAllByText('—')
    expect(dashes.length).toBeGreaterThan(0)
  })

  it('renders lastActive when present', () => {
    wrap()
    expect(screen.getByText('1h ago')).toBeInTheDocument()
    expect(screen.getByText('3h ago')).toBeInTheDocument()
  })

  it('calls onRowClick with client id when a row is clicked', async () => {
    const onRowClick = jest.fn()
    wrap(onRowClick)
    screen.getByText('ABC Trading Corp.').closest('[role="row"]')?.click()
    expect(onRowClick).toHaveBeenCalledWith('1')
  })
})
```

- [ ] **Step 2: Run test — expect FAIL**

```bash
cd frontend && npx jest --watchAll=false --testPathPattern="ClientsTable.test"
```

Expected: FAIL — `Cannot find module '../ClientsTable'`

- [ ] **Step 3: Implement ClientsTable**

Create `frontend/src/components/dashboard/ClientsTable.tsx`:

```tsx
import { TierChip, TierKey } from './TierCard'

export interface ClientRow {
  id: string
  name: string
  type: 'VAT' | 'Non-VAT'
  plan: string
  review: number
  check: number
  ready: number
  pending: number
  lastActive?: string
}

const TIER_COLS: { key: TierKey; short: string }[] = [
  { key: 'review',  short: 'Review'  },
  { key: 'check',   short: 'Check'   },
  { key: 'ready',   short: 'Ready'   },
  { key: 'pending', short: 'Pending' },
]

const GRID = '1.7fr .8fr .8fr 64px 64px 64px 64px .9fr'

interface ClientsTableProps {
  rows: ClientRow[]
  onRowClick: (id: string) => void
}

export function ClientsTable({ rows, onRowClick }: ClientsTableProps) {
  return (
    <div style={{ width: '100%' }}>
      {/* Header */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: GRID,
          padding: '0 18px 12px',
          fontSize: 11,
          fontWeight: 700,
          letterSpacing: '.05em',
          textTransform: 'uppercase',
          alignItems: 'center',
        }}
      >
        <span style={{ color: 'var(--faint)' }}>Business</span>
        <span style={{ color: 'var(--faint)' }}>Type</span>
        <span style={{ color: 'var(--faint)' }}>Plan</span>
        {TIER_COLS.map(({ key, short }) => (
          <span
            key={key}
            style={{ textAlign: 'center', color: `var(--tier-${key}-fg)` }}
          >
            {short}
          </span>
        ))}
        <span style={{ textAlign: 'right', color: 'var(--faint)' }}>Active</span>
      </div>

      {/* Rows */}
      {rows.map((row, i) => (
        <div
          key={row.id}
          role="row"
          onClick={() => onRowClick(row.id)}
          style={{
            display: 'grid',
            gridTemplateColumns: GRID,
            padding: '14px 18px',
            alignItems: 'center',
            borderTop: '1px solid var(--line-soft)',
            background: i % 2 === 0 ? 'var(--card-alt)' : 'transparent',
            borderRadius: 12,
            cursor: 'pointer',
          }}
        >
          <span style={{ fontWeight: 700, fontSize: 14.5, color: 'var(--ink)' }}>{row.name}</span>
          <span style={{ fontSize: 13, color: 'var(--muted)' }}>{row.type}</span>
          <span>
            <span
              style={{
                fontSize: 12,
                fontWeight: 600,
                color: 'var(--muted)',
                padding: '3px 10px',
                borderRadius: 999,
                background: 'var(--chip-bg)',
                border: '1px solid var(--line)',
              }}
            >
              {row.plan}
            </span>
          </span>
          {TIER_COLS.map(({ key }) => (
            <span key={key} style={{ textAlign: 'center' }}>
              <TierChip tierKey={key} count={row[key]} />
            </span>
          ))}
          <span style={{ textAlign: 'right', fontSize: 12.5, color: 'var(--faint)' }}>
            {row.lastActive ?? '—'}
          </span>
        </div>
      ))}
    </div>
  )
}
```

- [ ] **Step 4: Run test — expect PASS**

```bash
cd frontend && npx jest --watchAll=false --testPathPattern="ClientsTable.test"
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/dashboard/ClientsTable.tsx \
        frontend/src/components/dashboard/__tests__/ClientsTable.test.tsx
git commit -m "feat: add ClientsTable dashboard component"
```

---

## Task 9: Dashboard Page Rewrite

**Files:**
- Modify: `frontend/src/app/accountant/dashboard/page.tsx`

- [ ] **Step 1: Write the failing test**

Create `frontend/src/app/accountant/dashboard/__tests__/page.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react'
import AccountantDashboard from '../page'
import { ThemeProvider } from '@/components/dashboard/ThemeContext'

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn() }),
}))
jest.mock('@/lib/hooks/useAuth', () => ({
  useAuth: () => ({ user: { name: 'Maria Santos' } }),
}))
jest.mock('@tanstack/react-query', () => ({
  useQuery: ({ queryKey }: { queryKey: string[] }) => {
    if (queryKey[0] === 'accountant-queue') {
      return {
        data: [
          { id: '1', clientId: 'c1', flag: 'RED'    },
          { id: '2', clientId: 'c1', flag: 'YELLOW' },
          { id: '3', clientId: 'c2', flag: 'GREEN'  },
        ],
        isLoading: false,
      }
    }
    if (queryKey[0] === 'accountant-pending-entries') {
      return { data: [{ id: 'e1', companyId: 'c1' }], isLoading: false }
    }
    if (queryKey[0] === 'accountant-clients') {
      return {
        data: [
          { id: 'c1', name: 'ABC Trading Corp.', birType: 'vat',     plan: 'Growth'  },
          { id: 'c2', name: 'Northwind Logistics', birType: 'vat',   plan: 'Growth'  },
        ],
        isLoading: false,
      }
    }
    return { data: undefined, isLoading: false }
  },
}))
jest.mock('@/components/dashboard/MascotCompanion', () => ({
  MascotCompanion: () => <div data-testid="mascot" />,
}))
jest.mock('@/components/dashboard/ClientsTable', () => ({
  ClientsTable: ({ rows }: { rows: { name: string }[] }) => (
    <div data-testid="clients-table">{rows.map((r) => r.name).join(',')}</div>
  ),
}))

function wrap() {
  return render(
    <div data-theme="sofia">
      <ThemeProvider value={{ theme: 'sofia', setTheme: jest.fn() }}>
        <AccountantDashboard />
      </ThemeProvider>
    </div>
  )
}

describe('AccountantDashboard', () => {
  it('renders greeting with first name', () => {
    wrap()
    expect(screen.getByText(/Good morning, Maria/)).toBeInTheDocument()
  })

  it('renders all four tier card labels', () => {
    wrap()
    expect(screen.getByText('Needs review')).toBeInTheDocument()
    expect(screen.getByText('Check needed')).toBeInTheDocument()
    expect(screen.getByText('Ready to approve')).toBeInTheDocument()
    expect(screen.getByText('Pending entries')).toBeInTheDocument()
  })

  it('derives tier counts from queue flags', () => {
    wrap()
    // RED=1, YELLOW=1, GREEN=1
    const counts = screen.getAllByText('1')
    expect(counts.length).toBeGreaterThanOrEqual(3)
  })

  it('renders clients table with both clients', () => {
    wrap()
    const table = screen.getByTestId('clients-table')
    expect(table.textContent).toContain('ABC Trading Corp.')
    expect(table.textContent).toContain('Northwind Logistics')
  })

  it('renders This week section', () => {
    wrap()
    expect(screen.getByText('This week')).toBeInTheDocument()
  })

  it('renders Go to Queue button', () => {
    wrap()
    expect(screen.getByRole('button', { name: /Go to Queue/ })).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run test — expect FAIL**

```bash
cd frontend && npx jest --watchAll=false --testPathPattern="accountant/dashboard/__tests__/page.test"
```

Expected: FAIL — import errors and assertion failures from the current page

- [ ] **Step 3: Rewrite the dashboard page**

Replace the entire content of `frontend/src/app/accountant/dashboard/page.tsx`:

```tsx
'use client'

import { useQuery } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { ArrowRight, Sparkles } from 'lucide-react'
import { getQueue } from '@/lib/api/queue'
import { getEntries } from '@/lib/api/adjusting-entries'
import { getAccountantClients } from '@/lib/api/accountant/clients'
import { useAuth } from '@/lib/hooks/useAuth'
import { useTheme } from '@/components/dashboard/ThemeContext'
import { TierCard, Tier } from '@/components/dashboard/TierCard'
import { MascotCompanion } from '@/components/dashboard/MascotCompanion'
import { ClientsTable, ClientRow } from '@/components/dashboard/ClientsTable'
import { WeekStat } from '@/components/dashboard/WeekStat'
import type { QueueItem } from '@/types/queue'
import type { AdjustingEntry } from '@/types/adjusting-entry'

const TIERS: Omit<Tier, 'count'>[] = [
  { key: 'review',  label: 'Needs review',     note: 'Anomalies flagged by AI'       },
  { key: 'check',   label: 'Check needed',      note: 'Missing receipt · OCR retry'   },
  { key: 'ready',   label: 'Ready to approve',  note: 'Pre-sorted for batch sign-off' },
  { key: 'pending', label: 'Pending entries',   note: 'Awaiting admin approval'       },
]

export default function AccountantDashboard() {
  const router = useRouter()
  const { user } = useAuth()
  const { theme } = useTheme()

  const { data: queue   = [] } = useQuery({ queryKey: ['accountant-queue'],           queryFn: getQueue })
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
    id:       c.id,
    name:     c.name,
    type:     c.birType === 'vat' ? 'VAT' : 'Non-VAT',
    plan:     c.plan,
    review:   (queue as QueueItem[]).filter((i) => i.clientId === c.id && i.flag === 'RED').length,
    check:    (queue as QueueItem[]).filter((i) => i.clientId === c.id && i.flag === 'YELLOW').length,
    ready:    (queue as QueueItem[]).filter((i) => i.clientId === c.id && i.flag === 'GREEN').length,
    pending:  (pending as AdjustingEntry[]).filter((e) => e.companyId === c.id).length,
    lastActive: c.lastActive,
  }))

  return (
    <div
      style={{
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
              color: 'var(--ink)',
              margin: '0 0 6px',
            }}
          >
            Good morning, {firstName}
          </h1>
          <p style={{ margin: 0, color: 'var(--muted)', fontSize: 14.5 }}>
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
            background: 'var(--card)',
            border: '1px solid var(--line)',
            borderRadius: 20,
            padding: '20px 14px 8px',
            boxShadow: 'var(--shadow)',
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
                color: 'var(--ink)',
              }}
            >
              My Clients
            </h2>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 7,
                  color: 'var(--faint)',
                  fontSize: 13,
                  padding: '7px 12px',
                  borderRadius: 10,
                  background: 'var(--field-bg)',
                  border: '1px solid var(--line)',
                }}
              >
                🔍 Search clients
              </span>
              <button
                onClick={() => router.push('/accountant/clients')}
                style={{
                  background: 'none',
                  border: 0,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                  color: 'var(--primary)',
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
            <div style={{ padding: '24px', textAlign: 'center', color: 'var(--faint)', fontSize: 14 }}>
              Loading…
            </div>
          ) : rows.length === 0 ? (
            <div style={{ padding: '24px', textAlign: 'center', color: 'var(--faint)', fontSize: 14 }}>
              No clients assigned yet.
            </div>
          ) : (
            <ClientsTable rows={rows} onRowClick={(id) => router.push(`/accountant/clients/${id}`)} />
          )}
        </section>

        {/* Week Rail */}
        <aside style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div
            style={{
              background: 'var(--card)',
              border: '1px solid var(--line)',
              borderRadius: 20,
              padding: '20px 22px',
              boxShadow: 'var(--shadow)',
              flex: 1,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 18 }}>
              <Sparkles size={17} style={{ color: 'var(--primary)' }} />
              <span
                style={{
                  fontFamily: 'var(--font-display)',
                  fontWeight: 700,
                  fontSize: 16,
                  color: 'var(--ink)',
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
              background: 'linear-gradient(150deg, var(--primary), var(--primary-deep))',
              boxShadow: '0 12px 22px -12px var(--primary-deep)',
            }}
          >
            Go to Queue <ArrowRight size={17} />
          </button>
        </aside>
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Run test — expect PASS**

```bash
cd frontend && npx jest --watchAll=false --testPathPattern="accountant/dashboard/__tests__/page.test"
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add frontend/src/app/accountant/dashboard/page.tsx \
        frontend/src/app/accountant/dashboard/__tests__/page.test.tsx
git commit -m "feat: rewrite accountant dashboard page with new design"
```

---

## Task 10: Verify Other Accountant Pages

No new files. Spot-check in a running browser that the nav layout change didn't break other pages.

- [ ] **Step 1: Start the dev server**

```bash
cd frontend && npm run dev
```

Navigate to each accountant page in a browser and check for layout issues:
- `/accountant/queue` — verify content isn't too wide / has appropriate container
- `/accountant/adjusting-entries` — same check
- `/accountant/clients` — same check
- `/accountant/reports` — same check

- [ ] **Step 2: Fix any pages that are too wide**

If a page looks too wide without the old `max-w-[1100px] mx-auto p-6` wrapper, open that page's `.tsx` file and wrap its root `<div>` content with:

```tsx
<div className="max-w-[1100px] mx-auto p-6">
  {/* existing content */}
</div>
```

Repeat for each affected page. Commit each fix:

```bash
git add frontend/src/app/accountant/<pagename>/page.tsx
git commit -m "fix: restore container width on accountant/<pagename> page"
```

- [ ] **Step 3: Run the full test suite**

```bash
cd frontend && npx jest --watchAll=false
```

Expected: All tests pass. Fix any failures before proceeding.

- [ ] **Step 4: Final commit if any fixes were made**

If Step 2 produced fixes not yet committed, commit them now.

---

## Spec Coverage Checklist

| Spec requirement | Task |
|---|---|
| Sofia/Yoda CSS token sets | Task 1 |
| `background .5s, color .5s` theme transition | Task 1 (accountant.css) |
| localStorage theme persistence | Task 1 (layout) |
| ThemeContext shared to pages | Task 1 |
| ThemeToggle sliding pill | Task 2 |
| AccountantTopbar 70px sticky nav | Task 3 |
| Brand mark paw SVG | Task 3 |
| Queue badge on nav | Task 3 |
| NotificationBell wired | Task 3 |
| Avatar + logout/settings dropdown | Task 3 |
| `size` prop on PugMascot | Task 4 |
| TierCard — dot, count, open/all clear pill, note | Task 5 |
| TierChip — em-dash when 0 | Task 5 |
| MascotCompanion card layout | Task 6 |
| Sofia/Yoda mascot variant + accent colors | Task 6 |
| WeekStat value/label/sub | Task 7 |
| ClientsTable 8-column grid | Task 8 |
| Per-client tier chip cells | Task 8 |
| Dashboard greeting + subline | Task 9 |
| Tier counts from RED/YELLOW/GREEN/PENDING | Task 9 |
| Clients panel with search field + View all | Task 9 |
| Week rail with Go to Queue button | Task 9 |
| Responsive breakpoints (1100px, 768px) | Task 1 (accountant.css) |
| Other accountant pages unbroken | Task 10 |
