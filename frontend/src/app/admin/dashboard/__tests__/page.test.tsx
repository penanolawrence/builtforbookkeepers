import { render, screen } from '@testing-library/react'
import AdminDashboardPage from '../page'

jest.mock('@/components/layout/ThemeProvider', () => ({
  useTheme: () => ({ theme: 'sofia', setTheme: jest.fn() }),
}))
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn() }),
}))
jest.mock('@/lib/hooks/useAuth', () => ({
  useAuth: () => ({ user: { name: 'Admin User', role: 'admin' } }),
}))
jest.mock('@/components/dashboard/MascotCompanion', () => ({
  MascotCompanion: () => <div data-testid="mascot" />,
}))
jest.mock('@tanstack/react-query', () => ({
  useQuery: ({ queryKey }: { queryKey: string[] }) => {
    if (queryKey[0] === 'admin-dashboard') {
      return {
        data: {
          accountants: [
            { id: '1', name: 'Maria Santos', clientCount: 3, redCount: 2, yellowCount: 1, greenCount: 0, pendingEntries: 4 },
          ],
          openRedItems: 2,
        },
        isLoading: false,
      }
    }
    if (queryKey[0] === 'admin-billing') {
      return { data: [], isLoading: false }
    }
    if (queryKey[0] === 'admin-clients-all') {
      return { data: { data: [] }, isLoading: false }
    }
    return { data: undefined, isLoading: false }
  },
}))

function wrap() {
  return render(
    <div data-theme="sofia">
      <AdminDashboardPage />
    </div>
  )
}

describe('AdminDashboardPage', () => {
  it('renders greeting with first name', () => {
    wrap()
    expect(screen.getByText(/Good (morning|afternoon|evening), Admin/)).toBeInTheDocument()
  })

  it('renders mascot companion', () => {
    wrap()
    expect(screen.getByTestId('mascot')).toBeInTheDocument()
  })

  it('renders all four stat card labels', () => {
    wrap()
    expect(screen.getByText(/total clients/i)).toBeInTheDocument()
    expect(screen.getByText(/open red items/i)).toBeInTheDocument()
    expect(screen.getByText(/active accountants/i)).toBeInTheDocument()
    expect(screen.getByText(/revenue/i)).toBeInTheDocument()
  })

  it('renders accountant workload section with accountant name', () => {
    wrap()
    expect(screen.getByText('Accountant Workload')).toBeInTheDocument()
    expect(screen.getByText('Maria Santos')).toBeInTheDocument()
  })

  it('renders system overview section', () => {
    wrap()
    expect(screen.getByText('System Overview')).toBeInTheDocument()
    expect(screen.getByText('Open RED items')).toBeInTheDocument()
    expect(screen.getByText('Pending entries')).toBeInTheDocument()
  })

  it('renders Go to Queue CTA button', () => {
    wrap()
    expect(screen.getByRole('button', { name: /Go to Queue/ })).toBeInTheDocument()
  })

  it('renders recent payments section', () => {
    wrap()
    expect(screen.getByText('Recent Payments')).toBeInTheDocument()
    expect(screen.getByText('No payments recorded yet.')).toBeInTheDocument()
  })
})
