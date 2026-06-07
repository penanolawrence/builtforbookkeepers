import { render, screen } from '@testing-library/react'
import { AccountantTopbar } from '../AccountantTopbar'

jest.mock('next/navigation', () => ({
  usePathname: () => '/accountant/dashboard',
  useRouter:   () => ({ push: jest.fn() }),
}))
jest.mock('@/lib/hooks/useAuth', () => ({
  useAuth: () => ({
    user: { name: 'Maria Santos', email: 'maria@firm.ph', role: 'accountant' },
    logout: jest.fn(),
  }),
}))
jest.mock('@/lib/api/queue', () => ({
  getQueue: () => Promise.resolve([]),
}))
jest.mock('@/components/layout/NotificationBell', () => ({
  NotificationBell: () => <div data-testid="notification-bell" />,
}))
jest.mock('@/components/layout/ThemeToggle', () => ({
  ThemeToggle: () => <div data-testid="theme-toggle" />,
}))

describe('AccountantTopbar', () => {
  it('renders Built for Bookkeepers brand', () => {
    render(<AccountantTopbar />)
    expect(screen.getByText('Built for Bookkeepers')).toBeInTheDocument()
  })

  it('renders all 5 nav links', () => {
    render(<AccountantTopbar />)
    expect(screen.getByRole('link', { name: /Dashboard/    })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Queue/        })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Adj\. Entries/})).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /My Clients/   })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Reports/      })).toBeInTheDocument()
  })

  it('renders user initials in avatar', () => {
    render(<AccountantTopbar />)
    expect(screen.getByText('MS')).toBeInTheDocument()
  })

  it('renders ThemeToggle and NotificationBell', () => {
    render(<AccountantTopbar />)
    expect(screen.getByTestId('theme-toggle')).toBeInTheDocument()
    expect(screen.getByTestId('notification-bell')).toBeInTheDocument()
  })
})
