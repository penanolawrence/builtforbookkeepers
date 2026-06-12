'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useAuth } from '@/lib/hooks/useAuth'
import { useEffect, useRef, useState } from 'react'
import { getQueue } from '@/lib/api/queue'
import { NotificationBell } from './NotificationBell'
import { ThemeToggle } from './ThemeToggle'
import { BFBLogo } from '@/components/shared/BFBLogo'

const ADMIN_LINKS = [
  { href: '/admin/dashboard',         label: 'Dashboard'    },
  { href: '/admin/clients',           label: 'Clients'      },
  { href: '/admin/accountants',       label: 'Accountants'  },
  { href: '/admin/billing',           label: 'Billing'      },
  { href: '/admin/queue',             label: 'Queue'        },
  { href: '/admin/adjusting-entries', label: 'Adj. Entries' },
  { href: '/admin/month-end',         label: 'Month-End'    },
  { href: '/admin/reports',           label: 'Reports'      },
]

const ACCOUNTANT_LINKS = [
  { href: '/accountant/dashboard',         label: 'Dashboard'    },
  { href: '/accountant/queue',             label: 'Queue',        badge: true },
  { href: '/accountant/adjusting-entries', label: 'Adj. Entries' },
  { href: '/accountant/month-end',         label: 'Month-End'    },
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
    window.addEventListener('b4b:queue-count-changed', handle)
    return () => window.removeEventListener('b4b:queue-count-changed', handle)
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
        style={{ textDecoration: 'none' }}
      >
        <BFBLogo layout="horizontal" size={38} showTagline={true} className="bfb-logo--sm bfb-logo--nav" />
      </Link>

      {/* Nav */}
      <nav className="hidden md:flex" style={{ gap: 4, marginLeft: 8 }}>
        {links.map((link) => {
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
          aria-label="Account menu"
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
              href={user ? `/${user.role}/settings` : '#'}
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
