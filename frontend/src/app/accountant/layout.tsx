'use client'

import { ThemeProvider } from '@/components/layout/ThemeProvider'
import { Topbar } from '@/components/layout/Topbar'
import { BottomTabBar } from '@/components/layout/BottomTabBar'
import { useAuth } from '@/lib/hooks/useAuth'
import { useAppPreloader } from '@/lib/hooks/useAppPreloader'

export default function AccountantLayout({ children }: { children: React.ReactNode }) {
  const { user } = useAuth()
  useAppPreloader(user)

  return (
    <ThemeProvider>
      <div
        style={{
          height: '100dvh',
          display: 'flex',
          flexDirection: 'column',
          background: 'var(--t-surface)',
          color: 'var(--t-ink)',
        }}
      >
        <Topbar />
        <main style={{ flex: 1, overflow: 'auto' }}>
          <div className="pb-20 md:pb-0">
            {children}
          </div>
        </main>
        <BottomTabBar />
      </div>
    </ThemeProvider>
  )
}
