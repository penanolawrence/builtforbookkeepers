'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useAuth } from '@/lib/hooks/useAuth'
import { LayoutDashboard, Upload, FileText, BarChart2, Inbox, Users } from 'lucide-react'

const CLIENT_TABS = [
  { href: '/client/dashboard', label: 'Home',      Icon: LayoutDashboard },
  { href: '/client/upload',    label: 'Upload',    Icon: Upload,    tourTarget: 'client-dash-upload-btn-mobile' },
  { href: '/client/documents', label: 'Documents', Icon: FileText        },
  { href: '/client/reports',   label: 'Reports',   Icon: BarChart2       },
]

const ACCOUNTANT_TABS = [
  { href: '/accountant/dashboard', label: 'Home',    Icon: LayoutDashboard },
  { href: '/accountant/queue',     label: 'Queue',   Icon: Inbox,    tourTarget: 'dashboard-go-queue-mobile' },
  { href: '/accountant/clients',   label: 'Clients', Icon: Users           },
  { href: '/accountant/reports',   label: 'Reports', Icon: BarChart2       },
]

export function BottomTabBar() {
  const pathname = usePathname()
  const { user }  = useAuth()

  const tabs = user?.role === 'client'     ? CLIENT_TABS
             : user?.role === 'accountant' ? ACCOUNTANT_TABS
             : null

  if (!tabs) return null

  return (
    <nav
      className="flex md:hidden"
      style={{
        position:       'fixed',
        bottom:         0,
        left:           0,
        right:          0,
        zIndex:         20,
        height:         56,
        background:     'var(--t-nav-bg)',
        backdropFilter: 'blur(10px)',
        borderTop:      '1px solid var(--t-line)',
      }}
    >
      {tabs.map(({ href, label, Icon, tourTarget }) => {
        const active = pathname.startsWith(href)
        return (
          <Link
            key={href}
            href={href}
            data-tour={tourTarget}
            className="flex flex-col items-center justify-center flex-1 no-underline gap-[3px]"
            style={{ color: active ? 'var(--t-primary)' : 'var(--t-muted)' }}
          >
            <Icon size={20} strokeWidth={active ? 2.5 : 2} />
            <span style={{ fontSize: 10.5, fontWeight: active ? 700 : 500 }}>{label}</span>
          </Link>
        )
      })}
    </nav>
  )
}
