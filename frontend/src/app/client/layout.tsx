import { Topbar } from '@/components/layout/Topbar'

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col bg-t-surface">
      <Topbar />
      <main className="flex-1 overflow-auto">
        <div className="max-w-[1280px] mx-auto p-6">{children}</div>
      </main>
    </div>
  )
}
