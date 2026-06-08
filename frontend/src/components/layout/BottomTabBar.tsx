'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useAuth } from '@/lib/hooks/useAuth'
import { LayoutDashboard, Upload, FileText, BarChart2 } from 'lucide-react'

const TABS = [
  { href: '/client/dashboard', label: 'Home',      Icon: LayoutDashboard },
  { href: '/client/upload',    label: 'Upload',    Icon: Upload          },
  { href: '/client/documents', label: 'Documents', Icon: FileText        },
  { href: '/client/reports',   label: 'Reports',   Icon: BarChart2       },
]

export function BottomTabBar() {
  const pathname = usePathname()
  const { user }  = useAuth()

  if (user?.role !== 'client') return null

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
      {TABS.map(({ href, label, Icon }) => {
        const active = pathname.startsWith(href)
        return (
          <Link
            key={href}
            href={href}
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
