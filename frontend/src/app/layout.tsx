import type { Metadata } from 'next'
import { Bricolage_Grotesque, Plus_Jakarta_Sans } from 'next/font/google'
import './globals.css'
import './landing.css'
import { QueryProvider } from '@/lib/providers/QueryProvider'
import { SocketProvider } from '@/lib/socket/SocketProvider'
import { Toaster } from '@/components/ui/toaster'
import { ThemeProvider } from '@/components/layout/ThemeProvider'

const bricolage = Bricolage_Grotesque({
  subsets: ['latin'],
  weight: ['500', '600', '700', '800'],
  variable: '--font-display',
  display: 'swap',
})

const jakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-body',
  display: 'swap',
})

export const metadata: Metadata = {
  title: process.env.NEXT_PUBLIC_APP_NAME ?? 'Built for Bookkeepers',
  description: 'Philippine SME bookkeeping SaaS',
}

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${bricolage.variable} ${jakarta.variable}`}>
      <body>
        <QueryProvider>
          <SocketProvider>
            <ThemeProvider>
              {children}
              <Toaster />
            </ThemeProvider>
          </SocketProvider>
        </QueryProvider>
      </body>
    </html>
  )
}
