'use client'

import { useEffect, useState } from 'react'

const NAV_ITEMS = [
  { id: 'overview',    label: 'Who Does What',    num: '1' },
  { id: 'transaction', label: 'Transaction Flow',  num: '2' },
  { id: 'flags',       label: 'Flag Colors',       num: '3' },
  { id: 'approval',    label: 'Approval Queue',    num: '4' },
  { id: 'corrections', label: 'Corrections',       num: '5' },
  { id: 'reports',     label: 'BIR Books',         num: '6' },
  { id: 'tax-reports', label: 'BIR Tax Reports',   num: '7' },
  { id: 'clients',     label: 'Client Setup',      num: '8' },
  { id: 'status',      label: 'Quick Reference',   num: '—' },
]

export function HelpSidebarNav() {
  const [active, setActive] = useState('overview')

  useEffect(() => {
    const sections = document.querySelectorAll('.section[id]')
    if (!sections.length) return

    const obs = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => { if (e.isIntersecting) setActive(e.target.id) })
      },
      { rootMargin: '-15% 0px -75% 0px', threshold: 0 }
    )

    sections.forEach((s) => obs.observe(s))
    return () => obs.disconnect()
  }, [])

  function handleNavClick(e: React.MouseEvent<HTMLAnchorElement>, id: string) {
    e.preventDefault()
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  return (
    <aside className="hiw-nav">
      <div className="hiw-nav-inner">
        <div className="hiw-nav-label">On this page</div>
        <nav>
          {NAV_ITEMS.map((item) => (
            <a
              key={item.id}
              href={`#${item.id}`}
              className={active === item.id ? 'active' : ''}
              onClick={(e) => handleNavClick(e, item.id)}
            >
              <span className="n">{item.num}</span>
              {item.label}
            </a>
          ))}
        </nav>
      </div>
    </aside>
  )
}
