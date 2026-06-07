'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/hooks/useAuth'

function getCookieValue(name: string): string | null {
  if (typeof document === 'undefined') return null
  const match = document.cookie.split('; ').find((row) => row.startsWith(`${name}=`))
  return match ? match.split('=')[1] : null
}

export default function BlockedPage() {
  const router = useRouter()
  const { logout } = useAuth()
  const [status, setStatus] = useState<string | null>(null)

  useEffect(() => {
    setStatus(getCookieValue('sofia_status'))
  }, [])

  const handleLogout = async () => {
    await logout()
    router.push('/login')
  }

  const isInactive = status === 'INACTIVE'

  return (
    <div className="auth-bg">
      <div className="auth-logo">
        <div className="auth-logo-dot" />
        <span className="auth-logo-name">Sofia Books</span>
      </div>

      <div className="blocked-card">
        <div className="blocked-card-top">
          <div className="blocked-icon">{isInactive ? '🗄️' : '🔒'}</div>
          <div className="blocked-title">
            {isInactive ? 'Account Closed' : 'Account Suspended'}
          </div>
          <div className="blocked-body">
            {isInactive
              ? 'This account has been closed and can no longer be accessed.'
              : 'Your account has been suspended. Please contact Sofia Books to resolve your account.'}
          </div>
          <div className={`blocked-contact${isInactive ? ' inactive' : ''}`}>
            <strong>{isInactive ? 'This is permanent.' : 'Need help?'}</strong>
            {isInactive
              ? 'Inactive accounts cannot be reactivated. If you believe this is an error, contact the Sofia Books team.'
              : 'Reach out to your accountant or the Sofia Books team to get your account reinstated.'}
          </div>
        </div>

        <div className="blocked-card-bottom">
          <button onClick={handleLogout} className="btn-full btn-outline-full">
            Log out
          </button>
        </div>
      </div>
    </div>
  )
}
