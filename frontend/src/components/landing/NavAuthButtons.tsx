'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import type { Role } from '@/types/auth'

export function NavAuthButtons() {
  const [mounted, setMounted] = useState(false)
  const [dashboardPath, setDashboardPath] = useState<string | null>(null)

  useEffect(() => {
    // Read the same cookie the middleware uses — if it's gone, middleware
    // will redirect to /login anyway, so never show Dashboard without it.
    const match = document.cookie.match(/(?:^|; )b4b_role=([^;]+)/)
    const role  = match ? (decodeURIComponent(match[1]) as Role) : null
    if (role) setDashboardPath(`/${role}/dashboard`)
    setMounted(true)
  }, [])

  // Render nothing until mounted to avoid SSR/hydration flash
  if (!mounted) return null

  if (dashboardPath) {
    return (
      <Link href={dashboardPath} className="ld-nav__cta">
        Dashboard
      </Link>
    )
  }

  return (
    <>
      <Link href="/login" className="ld-nav__login">Log in</Link>
      <a href="#cta" className="ld-nav__cta">Get Started</a>
    </>
  )
}
