import { render, screen } from '@testing-library/react'
import AccountantClientsPage from '../page'

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn() }),
}))
jest.mock('@/components/accountant/ClientDetailModal', () => ({
  ClientDetailModal: () => <div data-testid="client-modal" />,
}))
jest.mock('@/components/shared/Breadcrumb', () => ({
  Breadcrumb: () => null,
}))
jest.mock('@/components/shared/SummaryCard', () => ({
  SummaryCard: ({ label, value }: { label: string; value: string }) => (
    <div data-testid={`summary-${label}`}>{value}</div>
  ),
}))

const mockPagedClients = (overrides = {}) => ({
  data: [
    { id: 'c1', name: 'ABC Trading Corp.',   birType: 'vat',     plan: 'starter', accountantName: 'Ana',
      clientId: 'u1', clientStatus: 'ACTIVE', username: 'abc', lastPayment: null,
      queueCounts: { red: 1, yellow: 0, green: 2 } },
    { id: 'c2', name: 'Northwind Logistics', birType: 'non_vat', plan: 'growth',  accountantName: 'Ana',
      clientId: 'u2', clientStatus: 'ACTIVE', username: 'nw',  lastPayment: null,
      queueCounts: { red: 0, yellow: 1, green: 0 } },
  ],
  total: 2,
  perPage: 15,
  currentPage: 1,
  lastPage: 1,
  summary: { needAttention: 1, pendingReview: 2, allClear: 0 },
  ...overrides,
})

jest.mock('@tanstack/react-query', () => ({
  useQuery: ({ queryKey }: { queryKey: unknown[] }) => {
    if ((queryKey as string[])[0] === 'accountant-clients') {
      return { data: mockPagedClients(), isLoading: false }
    }
    return { data: undefined, isLoading: false }
  },
}))

describe('AccountantClientsPage', () => {
  it('renders the client names', () => {
    render(<AccountantClientsPage />)
    expect(screen.getAllByText('ABC Trading Corp.')).toHaveLength(2)
    expect(screen.getAllByText('Northwind Logistics')).toHaveLength(2)
  })

  it('shows correct total from summary', () => {
    render(<AccountantClientsPage />)
    expect(screen.getByTestId('summary-Total Clients').textContent).toBe('2')
  })

  it('shows need attention count from summary', () => {
    render(<AccountantClientsPage />)
    expect(screen.getByTestId('summary-Need Attention').textContent).toBe('1')
  })

  it('hides pagination bar when only one page', () => {
    render(<AccountantClientsPage />)
    expect(screen.queryByRole('button', { name: '‹' })).not.toBeInTheDocument()
  })
})
