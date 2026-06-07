import { render, screen } from '@testing-library/react'
import AccountantDashboard from '../page'

jest.mock('@/components/layout/ThemeProvider', () => ({
  useTheme: () => ({ theme: 'sofia', setTheme: jest.fn() }),
}))

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn() }),
}))
jest.mock('@/lib/hooks/useAuth', () => ({
  useAuth: () => ({ user: { name: 'Maria Santos' } }),
}))
jest.mock('@tanstack/react-query', () => ({
  useQuery: ({ queryKey }: { queryKey: string[] }) => {
    if (queryKey[0] === 'accountant-queue') {
      return {
        data: [
          { id: '1', clientId: 'c1', flag: 'RED'    },
          { id: '2', clientId: 'c1', flag: 'YELLOW' },
          { id: '3', clientId: 'c2', flag: 'GREEN'  },
        ],
        isLoading: false,
      }
    }
    if (queryKey[0] === 'accountant-pending-entries') {
      return { data: [{ id: 'e1', companyId: 'c1' }], isLoading: false }
    }
    if (queryKey[0] === 'accountant-clients') {
      return {
        data: [
          { id: 'c1', name: 'ABC Trading Corp.', birType: 'vat',   plan: 'Growth' },
          { id: 'c2', name: 'Northwind Logistics', birType: 'vat', plan: 'Growth' },
        ],
        isLoading: false,
      }
    }
    return { data: undefined, isLoading: false }
  },
}))
jest.mock('@/components/dashboard/MascotCompanion', () => ({
  MascotCompanion: () => <div data-testid="mascot" />,
}))
jest.mock('@/components/dashboard/ClientsTable', () => ({
  ClientsTable: ({ rows }: { rows: { name: string }[] }) => (
    <div data-testid="clients-table">{rows.map((r) => r.name).join(',')}</div>
  ),
}))

function wrap() {
  return render(
    <div data-theme="sofia">
      <AccountantDashboard />
    </div>
  )
}

describe('AccountantDashboard', () => {
  it('renders greeting with first name', () => {
    wrap()
    expect(screen.getByText(/Good morning, Maria/)).toBeInTheDocument()
  })

  it('renders all four tier card labels', () => {
    wrap()
    expect(screen.getByText('Needs review')).toBeInTheDocument()
    expect(screen.getByText('Check needed')).toBeInTheDocument()
    expect(screen.getByText('Ready to approve')).toBeInTheDocument()
    expect(screen.getByText('Pending entries')).toBeInTheDocument()
  })

  it('derives tier counts from queue flags', () => {
    wrap()
    // RED=1, YELLOW=1, GREEN=1
    const counts = screen.getAllByText('1')
    expect(counts.length).toBeGreaterThanOrEqual(3)
  })

  it('renders clients table with both clients', () => {
    wrap()
    const table = screen.getByTestId('clients-table')
    expect(table.textContent).toContain('ABC Trading Corp.')
    expect(table.textContent).toContain('Northwind Logistics')
  })

  it('renders This week section', () => {
    wrap()
    expect(screen.getByText('This week')).toBeInTheDocument()
  })

  it('renders Go to Queue button', () => {
    wrap()
    expect(screen.getByRole('button', { name: /Go to Queue/ })).toBeInTheDocument()
  })
})
