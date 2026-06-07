import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { AccountantModal } from '../AccountantModal'

jest.mock('@tanstack/react-query', () => ({
  useQuery:       jest.fn(() => ({ data: undefined, isLoading: false })),
  useMutation:    jest.fn(() => ({ mutate: jest.fn(), isPending: false, isError: false })),
  useQueryClient: jest.fn(() => ({ invalidateQueries: jest.fn() })),
}))

jest.mock('@/lib/api/admin/accountants', () => ({
  getAccountant:           jest.fn(),
  getAccountants:          jest.fn(),
  createAccountant:        jest.fn().mockResolvedValue({ userId: 'u1' }),
  updateAccountant:        jest.fn().mockResolvedValue({ id: 'a1', name: 'Maria Santos', email: 'maria@example.ph', mobile: null }),
  resetAccountantPassword: jest.fn(),
  deactivateAccountant:    jest.fn(),
}))

function wrap(ui: React.ReactElement) {
  return render(<div data-theme="sofia">{ui}</div>)
}

// ─── Invite mode ──────────────────────────────────────────────────────────────

describe('AccountantModal — invite mode', () => {
  it('renders name, email, and phone inputs', () => {
    wrap(<AccountantModal mode="invite" onClose={jest.fn()} />)
    expect(screen.getByText('Invite Accountant')).toBeInTheDocument()
    expect(screen.getByText('Full Name *')).toBeInTheDocument()
    expect(screen.getByText('Email *')).toBeInTheDocument()
    expect(screen.getByText('Phone / Mobile')).toBeInTheDocument()
  })

  it('calls onClose when × is clicked', () => {
    const onClose = jest.fn()
    wrap(<AccountantModal mode="invite" onClose={onClose} />)
    fireEvent.click(screen.getByLabelText('Close modal'))
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('shows validation errors when submitted empty', async () => {
    wrap(<AccountantModal mode="invite" onClose={jest.fn()} />)
    fireEvent.click(screen.getByText('Send Invite'))
    await waitFor(() => {
      expect(screen.getAllByText('Required').length).toBeGreaterThan(0)
    })
  })
})

// ─── Detail mode ──────────────────────────────────────────────────────────────

describe('AccountantModal — detail mode', () => {
  afterEach(() => jest.resetAllMocks())

  beforeEach(() => {
    const { useQuery, useMutation } = require('@tanstack/react-query')
    ;(useQuery as jest.Mock).mockReturnValue({ data: undefined, isLoading: false })
    ;(useMutation as jest.Mock).mockReturnValue({ mutate: jest.fn(), isPending: false, isError: false })
  })

  it('renders loading state when isLoading is true', () => {
    const { useQuery } = require('@tanstack/react-query')
    ;(useQuery as jest.Mock).mockReturnValue({ data: undefined, isLoading: true })
    wrap(<AccountantModal mode="detail" accountantId="a1" onClose={jest.fn()} />)
    expect(screen.getByText('Loading…')).toBeInTheDocument()
  })

  it('renders "not found" when data is null', () => {
    const { useQuery } = require('@tanstack/react-query')
    ;(useQuery as jest.Mock).mockReturnValue({ data: null, isLoading: false })
    wrap(<AccountantModal mode="detail" accountantId="a1" onClose={jest.fn()} />)
    expect(screen.getByText('Accountant not found.')).toBeInTheDocument()
  })

  it('renders accountant name and Save Changes button when data loads', () => {
    const { useQuery, useMutation } = require('@tanstack/react-query')
    const accountantData = {
      id: 'a1', name: 'Maria Santos', email: 'maria@example.ph', mobile: null,
      status: 'ACTIVE', clientCount: 3, redCount: 1, pendingEntries: 0,
      createdAt: '2024-01-15T00:00:00Z', assignedClients: [],
    }
    ;(useQuery as jest.Mock).mockImplementation(({ queryKey }: { queryKey: unknown[] }) => {
      if (Array.isArray(queryKey) && queryKey[0] === 'admin-accountant') {
        return { data: accountantData, isLoading: false }
      }
      return { data: [], isLoading: false }
    })
    ;(useMutation as jest.Mock).mockReturnValue({ mutate: jest.fn(), isPending: false, isError: false })
    wrap(<AccountantModal mode="detail" accountantId="a1" onClose={jest.fn()} />)
    expect(screen.getAllByText('Maria Santos').length).toBeGreaterThan(0)
    expect(screen.getByText('Save Changes')).toBeInTheDocument()
  })

  it('calls onClose when × is clicked', () => {
    const { useQuery } = require('@tanstack/react-query')
    ;(useQuery as jest.Mock).mockReturnValue({ data: undefined, isLoading: false })
    const onClose = jest.fn()
    wrap(<AccountantModal mode="detail" accountantId="a1" onClose={onClose} />)
    fireEvent.click(screen.getByLabelText('Close modal'))
    expect(onClose).toHaveBeenCalledTimes(1)
  })
})
