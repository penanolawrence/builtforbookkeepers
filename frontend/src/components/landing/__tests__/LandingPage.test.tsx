import { render, screen } from '@testing-library/react'
import LandingPage from '@/app/page'

// Mock client components
jest.mock('@/components/landing/NavThemeIcon', () => ({
  NavThemeIcon: () => <button aria-label="Switch to dark mode">🌙</button>,
}))
jest.mock('@/components/landing/MobileDrawer', () => ({
  MobileDrawer: () => <div data-testid="mobile-drawer" />,
}))
jest.mock('@/components/landing/MascotBanner', () => ({
  MascotBanner: () => <section aria-label="Meet Sofia">Meet Sofia — your AI co-pilot</section>,
}))
jest.mock('@/components/login/PugMascot', () => () => <div data-testid="pug-mascot" />)

describe('LandingPage', () => {
  it('renders the main h1 headline', () => {
    render(<LandingPage />)
    expect(screen.getByRole('heading', { level: 1, name: /take on more clients/i })).toBeInTheDocument()
  })

  it('renders all section headings', () => {
    render(<LandingPage />)
    expect(screen.getByRole('heading', { name: /built for how philippine bookkeeping/i })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /from receipt to bir book/i })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /everything a bookkeeper needs/i })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /bir-ready books/i })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /one plan/i })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /common questions/i })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /ready to take on more clients/i })).toBeInTheDocument()
  })

  it('shows the ₱999 price', () => {
    render(<LandingPage />)
    expect(screen.getByLabelText(/price: 999 pesos/i)).toBeInTheDocument()
  })

  it('renders the Log in link pointing to /login', () => {
    render(<LandingPage />)
    expect(screen.getByRole('link', { name: /log in/i })).toHaveAttribute('href', '/login')
  })

  it('renders Email us as a mailto link', () => {
    render(<LandingPage />)
    expect(screen.getByRole('link', { name: /email us/i })).toHaveAttribute('href', expect.stringContaining('mailto:'))
  })

  it('renders all 4 BIR book badges', () => {
    render(<LandingPage />)
    expect(screen.getByText('Cash Receipts Book')).toBeInTheDocument()
    expect(screen.getByText('Cash Disbursements Book')).toBeInTheDocument()
    expect(screen.getByText('General Journal')).toBeInTheDocument()
    expect(screen.getByText('General Ledger')).toBeInTheDocument()
  })
})
