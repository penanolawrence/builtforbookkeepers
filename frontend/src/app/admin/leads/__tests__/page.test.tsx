import { render, screen, fireEvent } from '@testing-library/react'
import AdminLeadsPage from '../page'

jest.mock('@/components/layout/ThemeProvider', () => ({
  useTheme: () => ({ theme: 'sofia', setTheme: jest.fn() }),
}))
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn() }),
}))
jest.mock('@/lib/hooks/useAuth', () => ({
  useAuth: () => ({ user: { name: 'Admin User', role: 'admin' } }),
}))

const mockLeads = [
  { id: '1', contact: 'juan@example.com', message: 'Interested in Growth plan', is_read: false, created_at: '2026-06-21T10:00:00Z' },
  { id: '2', contact: '09171234567', message: null, is_read: true, created_at: '2026-06-20T08:00:00Z' },
]

const mockMutate = jest.fn()

jest.mock('@tanstack/react-query', () => ({
  useQuery: ({ queryKey }: { queryKey: unknown[] }) => {
    if ((queryKey as string[])[0] === 'admin-leads') {
      return {
        data: {
          data: mockLeads,
          pagination: { currentPage: 1, perPage: 10, total: 2 },
        },
        isLoading: false,
      }
    }
    return { data: undefined, isLoading: false }
  },
  useMutation: () => ({ mutate: mockMutate }),
  useQueryClient: () => ({ setQueryData: jest.fn() }),
}))

function wrap() {
  return render(
    <div data-theme="sofia">
      <AdminLeadsPage />
    </div>
  )
}

describe('AdminLeadsPage', () => {
  it('renders page title', () => {
    wrap()
    expect(screen.getByText('Leads')).toBeInTheDocument()
  })

  it('renders total and unread summary cards', () => {
    wrap()
    expect(screen.getByText('Total')).toBeInTheDocument()
    expect(screen.getByText('Unread')).toBeInTheDocument()
  })

  it('renders All / Unread / Read filter tabs', () => {
    wrap()
    expect(screen.getByText('All')).toBeInTheDocument()
    expect(screen.getByText('Unread')).toBeInTheDocument()
    expect(screen.getByText('Read')).toBeInTheDocument()
  })

  it('renders lead contact and message', () => {
    wrap()
    expect(screen.getByText('juan@example.com')).toBeInTheDocument()
    expect(screen.getByText('Interested in Growth plan')).toBeInTheDocument()
  })

  it('shows Mark as read button for unread lead', () => {
    wrap()
    const buttons = screen.getAllByRole('button', { name: /mark as read/i })
    expect(buttons.length).toBeGreaterThan(0)
  })

  it('shows Mark as unread button for read lead', () => {
    wrap()
    const buttons = screen.getAllByRole('button', { name: /mark as unread/i })
    expect(buttons.length).toBeGreaterThan(0)
  })

  it('calls mutate when toggle button is clicked', () => {
    wrap()
    const button = screen.getAllByRole('button', { name: /mark as read/i })[0]
    fireEvent.click(button)
    expect(mockMutate).toHaveBeenCalledWith('1')
  })
})
