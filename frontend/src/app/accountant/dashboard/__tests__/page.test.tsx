import { render, screen } from '@testing-library/react'
import AccountantDashboard from '../page'

jest.mock('@/components/layout/ThemeProvider', () => ({
  useTheme: () => ({ theme: 'sofia', setTheme: jest.fn() }),
}))

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn() }),
}))
let mockUser: any = { name: 'Maria Santos', hasSeenTutorial: true }
const mockMarkTutorialSeen = jest.fn()
jest.mock('@/lib/hooks/useAuth', () => ({
  useAuth: () => ({ user: mockUser, markTutorialSeen: mockMarkTutorialSeen }),
}))
jest.mock('@/components/tour/TourOverlay', () => ({
  TourOverlay: ({ step }: any) => <div data-testid="tour-overlay">{step.title}</div>,
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
        data: {
          data: [
            { id: 'c1', name: 'ABC Trading Corp.',  birType: 'vat', plan: 'Growth', queueCounts: { red: 0, yellow: 0, green: 0 } },
            { id: 'c2', name: 'Northwind Logistics', birType: 'vat', plan: 'Growth', queueCounts: { red: 0, yellow: 0, green: 0 } },
          ],
          total: 2,
          perPage: 15,
          currentPage: 1,
          lastPage: 1,
          summary: { needAttention: 0, pendingReview: 0, allClear: 0 },
        },
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

afterEach(() => {
  mockUser = { name: 'Maria Santos', hasSeenTutorial: true }
  sessionStorage.clear()
})

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
})
