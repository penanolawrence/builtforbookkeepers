'use client'

import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/hooks/useAuth'
import { setTourContinueFlag } from '@/components/tour/tourSession'

export function ReplayTutorialButton() {
  const router = useRouter()
  const { user } = useAuth()

  if (user?.role !== 'accountant') return null

  const replayTutorial = () => {
    setTourContinueFlag('dashboard')
    router.push('/accountant/dashboard')
  }

  return (
    <button
      type="button"
      onClick={replayTutorial}
      style={{
        marginTop: 16,
        background: 'none',
        border: '1px solid var(--t-line)',
        borderRadius: 10,
        padding: '8px 16px',
        cursor: 'pointer',
        fontSize: 13,
        fontWeight: 700,
        color: 'var(--t-primary)',
      }}
    >
      Replay tutorial
    </button>
  )
}
