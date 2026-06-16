import { render, screen } from '@testing-library/react'
import type { User } from '@/types/auth'
import type { TourStep } from '@/components/tour/types'
import ClientDashboard from '../page'
import { setTourContinueFlag } from '@/components/tour/tourSession'

jest.mock('@/components/layout/ThemeProvider', () => ({
  useTheme: () => ({ theme: 'sofia', setTheme: jest.fn() }),
}))
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn() }),
}))
let mockUser: Partial<User> = { name: 'Maria Santos', hasSeenTutorial: true }
const mockMarkTutorialSeen = jest.fn()
jest.mock('@/lib/hooks/useAuth', () => ({
  useAuth: () => ({ user: mockUser, markTutorialSeen: mockMarkTutorialSeen }),
}))
jest.mock('@/components/tour/TourOverlay', () => ({
  TourOverlay: ({ step }: { step: TourStep }) => <div data-testid="tour-overlay">{step.title}</div>,
}))
jest.mock('@/components/dashboard/MascotCompanion', () => ({
  MascotCompanion: ({ brief }: { brief?: string }) => (
    <div data-testid="mascot">{brief}</div>
  ),
}))
jest.mock('next/link', () => {
  const Link = ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...rest}>{children}</a>
  )
  Link.displayName = 'Link'
  return Link
})
jest.mock('@tanstack/react-query', () => ({
  useQuery: () => ({
    data: [
      {
        id: 'doc-1',
        refNumber: 'MNL-0012',
        status: 'PARKED',
        declaredType: 'expense',
        amount: 500,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        date: new Date().toISOString().slice(0, 7) + '-01',
        merchantName: null,
        returnNote: null,
      },
      {
        id: 'doc-2',
        refNumber: 'MNL-0011',
        status: 'APPROVED',
        declaredType: 'income',
        amount: 10300,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        date: new Date().toISOString().slice(0, 7) + '-01',
        merchantName: null,
        returnNote: null,
      },
    ],
    isLoading: false,
  }),
}))

afterEach(() => {
  mockUser = { name: 'Maria Santos', hasSeenTutorial: true }
  sessionStorage.clear()
})

function wrap() {
  return render(
    <div data-theme="sofia">
      <ClientDashboard />
    </div>
  )
}

describe('ClientDashboard', () => {
  it('renders greeting with first name', () => {
    wrap()
    expect(screen.getByText(/Good .+, Maria!/)).toBeInTheDocument()
  })

  it('renders all four stat card labels', () => {
    wrap()
    expect(screen.getByText('Total Documents')).toBeInTheDocument()
    expect(screen.getByText('Returned')).toBeInTheDocument()
    expect(screen.getByText(/Income \(/)).toBeInTheDocument()
    expect(screen.getByText(/Expenses \(/)).toBeInTheDocument()
  })

  it('renders Recent Documents section', () => {
    wrap()
    expect(screen.getByText('Recent Documents')).toBeInTheDocument()
  })

  it('renders View all link pointing to /client/documents', () => {
    wrap()
    const link = screen.getByText('View all →')
    expect(link.closest('a')).toHaveAttribute('href', '/client/documents')
  })

  it('renders Recent Activity section', () => {
    wrap()
    expect(screen.getByText('Recent Activity')).toBeInTheDocument()
  })

  it('renders Upload a Document link pointing to /client/upload', () => {
    wrap()
    const link = screen.getByText('Upload a Document')
    expect(link.closest('a')).toHaveAttribute('href', '/client/upload')
  })

  it('renders mascot companion with brief mentioning parked count', () => {
    wrap()
    const mascot = screen.getByTestId('mascot')
    expect(mascot.textContent).toMatch(/\b1 document/)
  })

  it('renders status chip for PARKED document', () => {
    wrap()
    expect(screen.getByText('Parked')).toBeInTheDocument()
  })

  it('renders status chip for APPROVED document as Posted', () => {
    wrap()
    expect(screen.getByText('Posted')).toBeInTheDocument()
  })

  it('auto-starts the tour when the user has not seen it', () => {
    mockUser = { name: 'Maria Santos', hasSeenTutorial: false }
    wrap()
    expect(screen.getByTestId('tour-overlay')).toBeInTheDocument()
  })

  it('does not start the tour when the user has already seen it', () => {
    mockUser = { name: 'Maria Santos', hasSeenTutorial: true }
    wrap()
    expect(screen.queryByTestId('tour-overlay')).not.toBeInTheDocument()
  })

  it('starts the tour when the sessionStorage continue flag is set to dashboard, even if already seen', () => {
    mockUser = { name: 'Maria Santos', hasSeenTutorial: true }
    setTourContinueFlag('dashboard')
    wrap()
    expect(screen.getByTestId('tour-overlay')).toBeInTheDocument()
  })
})
