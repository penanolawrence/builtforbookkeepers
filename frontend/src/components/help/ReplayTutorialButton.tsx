'use client'

import type { Role } from '@/types/auth'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/hooks/useAuth'
import { setTourContinueFlag } from '@/components/tour/tourSession'

const REPLAY_TARGET: Partial<Record<Role, string>> = {
  accountant: '/accountant/dashboard',
  client: '/client/dashboard',
}

export function ReplayTutorialButton() {
  const router = useRouter()
  const { user } = useAuth()

  const target = user?.role ? REPLAY_TARGET[user.role] : undefined
  if (!target) return null

  const replayTutorial = () => {
    setTourContinueFlag('dashboard')
    router.push(target)
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
