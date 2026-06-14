import { render, screen, fireEvent } from '@testing-library/react'
import { Topbar } from '../Topbar'

jest.mock('next/navigation', () => ({
  usePathname: jest.fn(() => '/admin/dashboard'),
  useRouter: jest.fn(() => ({ push: jest.fn() })),
}))
jest.mock('@/lib/hooks/useAuth', () => ({
  useAuth: jest.fn(() => ({
    user: { name: 'Admin User', role: 'admin', email: 'admin@builtforbookkeepers.ph' },
    logout: jest.fn(),
  })),
}))
jest.mock('@/lib/api/queue', () => ({ getQueue: jest.fn().mockResolvedValue([]) }))
jest.mock('../NotificationBell', () => ({ NotificationBell: () => null }))
jest.mock('../ThemeToggle', () => ({ ThemeToggle: () => null }))

describe('Topbar', () => {
  it('renders the pug icon brand mark SVG', () => {
    render(<Topbar />)
    const svg = document.querySelector('header svg[aria-hidden]')
    expect(svg).not.toBeNull()
  })

  it('renders Built for Bookkeepers brand name', () => {
    render(<Topbar />)
    expect(screen.getByText('Built for Bookkeepers')).toBeInTheDocument()
  })

  it('renders admin nav links for admin role', () => {
    render(<Topbar />)
    expect(screen.getByRole('link', { name: 'Dashboard' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Clients' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Accountants' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Billing' })).toBeInTheDocument()
  })

  it('renders user initials in avatar button', () => {
    render(<Topbar />)
    const btn = screen.getByRole('button', { name: 'Account menu' })
    expect(btn).toBeInTheDocument()
    expect(btn).toHaveTextContent('AU')
  })
})

describe('Topbar — Help link (all roles)', () => {
  const mockUseAuth = jest.requireMock('@/lib/hooks/useAuth').useAuth as jest.Mock
  const mockUsePathname = jest.requireMock('next/navigation').usePathname as jest.Mock

  afterEach(() => {
    mockUseAuth.mockReset()
    mockUsePathname.mockReset()
  })

  it('shows Help link in dropdown for accountant, links to /accountant/help', () => {
    mockUseAuth.mockReturnValue({
      user: { name: 'Maria Santos', role: 'accountant', email: 'maria@test.ph' },
      logout: jest.fn(),
    })
    mockUsePathname.mockReturnValue('/accountant/dashboard')

    render(<Topbar />)
    fireEvent.click(screen.getByRole('button', { name: 'Account menu' }))
    expect(screen.getByRole('link', { name: /Help/ })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Help/ })).toHaveAttribute('href', '/accountant/help')
  })

  it('shows Help link in dropdown for admin, links to /admin/help', () => {
    mockUseAuth.mockReturnValue({
      user: { name: 'Admin User', role: 'admin', email: 'admin@test.ph' },
      logout: jest.fn(),
    })
    mockUsePathname.mockReturnValue('/admin/dashboard')

    render(<Topbar />)
    fireEvent.click(screen.getByRole('button', { name: 'Account menu' }))
    expect(screen.getByRole('link', { name: /Help/ })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Help/ })).toHaveAttribute('href', '/admin/help')
  })
})
