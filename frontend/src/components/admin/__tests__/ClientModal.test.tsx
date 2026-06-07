import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { ClientModal } from '../ClientModal'

jest.mock('next/navigation', () => ({
  useRouter: jest.fn(() => ({ push: jest.fn(), replace: jest.fn(), back: jest.fn() })),
}))

jest.mock('@tanstack/react-query', () => ({
  useQuery:       jest.fn(() => ({ data: undefined, isLoading: false })),
  useQueryClient: jest.fn(() => ({ invalidateQueries: jest.fn() })),
}))

jest.mock('@/lib/api/admin/clients', () => ({
  createClient:            jest.fn(),
  getClient:               jest.fn(),
  updateClient:            jest.fn().mockResolvedValue(undefined),
  updatePlan:              jest.fn().mockResolvedValue({ success: true }),
  suspendClient:           jest.fn(),
  reactivateClient:        jest.fn(),
  markClientOverdue:       jest.fn(),
  deactivateClient:        jest.fn(),
  resetClientAccess:       jest.fn(),
  reassignAccountant:      jest.fn(),
  getClientDocumentsAdmin: jest.fn(),
  getChartOfAccounts:      jest.fn(),
  saveChartOfAccounts:     jest.fn(),
}))

jest.mock('@/lib/api/admin/accountants', () => ({
  getAccountants: jest.fn(),
}))

jest.mock('@/components/admin/AssignAccountantModal', () => ({
  AssignAccountantModal: () => null,
}))

jest.mock('@/components/admin/ReceivePaymentModal', () => ({
  ReceivePaymentModal: () => null,
}))

function wrap(ui: React.ReactElement) {
  return render(<div data-theme="sofia">{ui}</div>)
}

// ─── Create mode ─────────────────────────────────────────────────────────────

describe('ClientModal — create mode', () => {
  afterEach(() => jest.clearAllMocks())

  it('renders title and required field labels', () => {
    wrap(<ClientModal mode="create" onClose={jest.fn()} />)
    expect(screen.getByText('New Client')).toBeInTheDocument()       // header
    expect(screen.getByText('Business Name *')).toBeInTheDocument()
    expect(screen.getByText('Mobile *')).toBeInTheDocument()
    expect(screen.getByText('Accountant *')).toBeInTheDocument()
  })

  it('calls onClose when × is clicked', () => {
    const onClose = jest.fn()
    wrap(<ClientModal mode="create" onClose={onClose} />)
    fireEvent.click(screen.getByLabelText('Close modal'))
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('shows validation errors on empty submit', async () => {
    wrap(<ClientModal mode="create" onClose={jest.fn()} />)
    fireEvent.click(screen.getByText('Create Client'))
    await waitFor(() => {
      expect(screen.getAllByText('Required').length).toBeGreaterThan(0)
    })
  })

  it('shows success state after creation', async () => {
    const { createClient } = require('@/lib/api/admin/clients')
    ;(createClient as jest.Mock).mockResolvedValue({
      companyId: 'c1',
      inviteLink: 'https://app.example.com/invite/abc123',
      username: 'reyes_001',
    })
    const { useQuery } = require('@tanstack/react-query')
    ;(useQuery as jest.Mock).mockReturnValue({
      data: [{ id: 'a1', name: 'Maria Santos' }],
      isLoading: false,
    })

    wrap(<ClientModal mode="create" onClose={jest.fn()} />)

    fireEvent.change(screen.getAllByRole('textbox')[0], { target: { value: 'Reyes Trading' } })
    fireEvent.change(screen.getAllByRole('textbox')[1], { target: { value: '09171234567' } })

    const accountantSelect = screen.getAllByRole('combobox').find(
      (s) => (s as HTMLSelectElement).value === ''
    )
    if (accountantSelect) {
      fireEvent.change(accountantSelect, { target: { value: 'a1' } })
    }

    fireEvent.click(screen.getByText('Create Client'))

    await waitFor(() => {
      expect(screen.getByText('Client created!')).toBeInTheDocument()
    })
    expect(screen.getByText('reyes_001')).toBeInTheDocument()
    expect(screen.getByText('Copy Link')).toBeInTheDocument()
  })

  it('calls onCreated with companyId when "View Client Profile" is clicked', async () => {
    const { createClient } = require('@/lib/api/admin/clients')
    ;(createClient as jest.Mock).mockResolvedValue({
      companyId: 'c1',
      inviteLink: 'https://app.example.com/invite/abc123',
      username: 'reyes_001',
    })
    const { useQuery } = require('@tanstack/react-query')
    ;(useQuery as jest.Mock).mockReturnValue({
      data: [{ id: 'a1', name: 'Maria Santos' }],
      isLoading: false,
    })

    const onCreated = jest.fn()
    wrap(<ClientModal mode="create" onClose={jest.fn()} onCreated={onCreated} />)

    fireEvent.change(screen.getAllByRole('textbox')[0], { target: { value: 'Reyes Trading' } })
    fireEvent.change(screen.getAllByRole('textbox')[1], { target: { value: '09171234567' } })

    const accountantSelect = screen.getAllByRole('combobox').find(
      (s) => (s as HTMLSelectElement).value === ''
    )
    if (accountantSelect) {
      fireEvent.change(accountantSelect, { target: { value: 'a1' } })
    }

    fireEvent.click(screen.getByText('Create Client'))

    await waitFor(() => screen.getByText('View Client Profile'))
    fireEvent.click(screen.getByText('View Client Profile'))
    expect(onCreated).toHaveBeenCalledWith('c1')
  })

  it('shows inline error when creation fails', async () => {
    const { createClient } = require('@/lib/api/admin/clients')
    ;(createClient as jest.Mock).mockRejectedValue(new Error('Server error'))
    const { useQuery } = require('@tanstack/react-query')
    ;(useQuery as jest.Mock).mockReturnValue({
      data: [{ id: 'a1', name: 'Maria Santos' }],
      isLoading: false,
    })

    wrap(<ClientModal mode="create" onClose={jest.fn()} />)

    fireEvent.change(screen.getAllByRole('textbox')[0], { target: { value: 'Reyes Trading' } })
    fireEvent.change(screen.getAllByRole('textbox')[1], { target: { value: '09171234567' } })
    const accountantSelect = screen.getAllByRole('combobox').find(
      (s) => (s as HTMLSelectElement).value === ''
    )
    if (accountantSelect) fireEvent.change(accountantSelect, { target: { value: 'a1' } })

    fireEvent.click(screen.getByText('Create Client'))

    await waitFor(() => {
      expect(screen.getByText('Failed to create client. Please try again.')).toBeInTheDocument()
    })
  })

  it('resets to form when "Create Another Client" is clicked', async () => {
    const { createClient } = require('@/lib/api/admin/clients')
    ;(createClient as jest.Mock).mockResolvedValue({
      companyId: 'c1',
      inviteLink: 'https://app.example.com/invite/abc123',
      username: 'reyes_001',
    })
    const { useQuery } = require('@tanstack/react-query')
    ;(useQuery as jest.Mock).mockReturnValue({
      data: [{ id: 'a1', name: 'Maria Santos' }],
      isLoading: false,
    })

    wrap(<ClientModal mode="create" onClose={jest.fn()} />)

    fireEvent.change(screen.getAllByRole('textbox')[0], { target: { value: 'Reyes Trading' } })
    fireEvent.change(screen.getAllByRole('textbox')[1], { target: { value: '09171234567' } })
    const accountantSelect = screen.getAllByRole('combobox').find(
      (s) => (s as HTMLSelectElement).value === ''
    )
    if (accountantSelect) fireEvent.change(accountantSelect, { target: { value: 'a1' } })
    fireEvent.click(screen.getByText('Create Client'))

    await waitFor(() => screen.getByText('Create Another Client'))
    fireEvent.click(screen.getByText('Create Another Client'))

    await waitFor(() => {
      expect(screen.getByText('Business Name *')).toBeInTheDocument()
    })
    expect(screen.queryByText('Client created!')).not.toBeInTheDocument()
  })
})

// ─── Detail mode (stubs for later tasks) ─────────────────────────────────────

describe('ClientModal — detail mode', () => {
  afterEach(() => jest.resetAllMocks())

  it('renders loading state', () => {
    const { useQuery } = require('@tanstack/react-query')
    ;(useQuery as jest.Mock).mockReturnValue({ data: undefined, isLoading: true })
    wrap(<ClientModal mode="detail" clientId="c1" onClose={jest.fn()} />)
    expect(screen.getByText('Loading…')).toBeInTheDocument()
  })

  it('renders not-found when data is null', () => {
    const { useQuery } = require('@tanstack/react-query')
    ;(useQuery as jest.Mock).mockReturnValue({ data: null, isLoading: false })
    wrap(<ClientModal mode="detail" clientId="c1" onClose={jest.fn()} />)
    expect(screen.getByText('Client not found.')).toBeInTheDocument()
  })

  it('renders client name, status chip, and 3 tabs when data loads', () => {
    const { useQuery } = require('@tanstack/react-query')
    ;(useQuery as jest.Mock).mockImplementation(({ queryKey }: { queryKey: unknown[] }) => {
      if (Array.isArray(queryKey) && queryKey[0] === 'admin-client') {
        return {
          data: {
            id: 'c1', clientId: 'cl1', name: 'Reyes Trading',
            clientStatus: 'ACTIVE', plan: 'starter', birType: 'non_vat',
            username: 'reyes_001', mobile: '09171234567',
            email: null, contactPerson: null, tin: null,
            accountantId: 'a1', accountantName: 'Maria Santos',
            lastPayment: null,
          },
          isLoading: false,
        }
      }
      return { data: undefined, isLoading: false }
    })

    wrap(<ClientModal mode="detail" clientId="c1" onClose={jest.fn()} />)
    expect(screen.getAllByText('Reyes Trading').length).toBeGreaterThan(0)
    expect(screen.getByText('Overview')).toBeInTheDocument()
    expect(screen.getByText('Documents')).toBeInTheDocument()
    expect(screen.getByText('Chart of Accounts')).toBeInTheDocument()
  })

  it('calls onClose when × is clicked', () => {
    const { useQuery } = require('@tanstack/react-query')
    ;(useQuery as jest.Mock).mockReturnValue({ data: undefined, isLoading: false })
    const onClose = jest.fn()
    wrap(<ClientModal mode="detail" clientId="c1" onClose={onClose} />)
    fireEvent.click(screen.getByLabelText('Close modal'))
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('switches to Documents tab on click', () => {
    const { useQuery } = require('@tanstack/react-query')
    ;(useQuery as jest.Mock).mockImplementation(({ queryKey }: { queryKey: unknown[] }) => {
      if (Array.isArray(queryKey) && queryKey[0] === 'admin-client') {
        return {
          data: {
            id: 'c1', clientId: 'cl1', name: 'Reyes Trading',
            clientStatus: 'ACTIVE', plan: 'starter', birType: 'non_vat',
            username: 'reyes_001', mobile: '09171234567',
            email: null, contactPerson: null, tin: null,
            accountantId: 'a1', accountantName: 'Maria Santos',
            lastPayment: null,
          },
          isLoading: false,
        }
      }
      return { data: undefined, isLoading: false }
    })

    wrap(<ClientModal mode="detail" clientId="c1" onClose={jest.fn()} />)
    fireEvent.click(screen.getByText('Documents'))
    expect(screen.getByText('All statuses')).toBeInTheDocument()
  })
})
