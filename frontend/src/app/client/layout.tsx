import { Topbar } from '@/components/layout/Topbar'
import { BottomTabBar } from '@/components/layout/BottomTabBar'

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col bg-t-surface">
      <Topbar />
      <main className="flex-1 overflow-auto">
        <div className="max-w-[1280px] mx-auto p-6 pb-20 md:pb-6">{children}</div>
      </main>
      <BottomTabBar />
    </div>
  )
}
