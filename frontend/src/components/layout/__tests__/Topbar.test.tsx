import { render, screen } from '@testing-library/react'
import { Topbar } from '../Topbar'

jest.mock('next/navigation', () => ({
  usePathname: () => '/admin/dashboard',
  useRouter: () => ({ push: jest.fn() }),
}))
jest.mock('@/lib/hooks/useAuth', () => ({
  useAuth: () => ({
    user: { name: 'Admin User', role: 'admin', email: 'admin@builtforbookkeepers.ph' },
    logout: jest.fn(),
  }),
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
