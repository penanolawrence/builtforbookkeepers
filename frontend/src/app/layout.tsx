import type { Metadata } from 'next'
import { Bricolage_Grotesque, Plus_Jakarta_Sans } from 'next/font/google'
import './globals.css'
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

// TODO: update SITE_URL when domain is confirmed
const SITE_URL = 'https://builtforbookkeepers.ph'

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: 'Built for Bookkeepers',
    template: '%s — Built for Bookkeepers',
  },
  description:
    'AI-assisted bookkeeping software for Philippine accounting firms. Automates receipt classification, BIR book generation, and VAT auto-computation.',
  icons: {
    icon: '/favicon.ico',
  },
}

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en-PH" className={`${bricolage.variable} ${jakarta.variable}`}>
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
