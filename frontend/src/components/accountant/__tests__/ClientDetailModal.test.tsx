import { render, screen, fireEvent } from '@testing-library/react'
import { ClientDetailModal } from '../ClientDetailModal'
import type { ClientProfile } from '@/types/admin'

// Mock TanStack Query so the modal renders without a provider
jest.mock('@tanstack/react-query', () => ({
  useQuery:        jest.fn(() => ({ data: undefined, isLoading: false })),
  useMutation:     jest.fn(() => ({ mutate: jest.fn(), isPending: false })),
  useQueryClient:  jest.fn(() => ({ invalidateQueries: jest.fn() })),
}))

jest.mock('@/hooks/use-toast', () => ({
  useToast: () => ({ toast: jest.fn() }),
}))

// Wrap in a data-theme div so CSS vars resolve (won't affect logic tests)
function wrap(ui: React.ReactElement) {
  return render(<div data-theme="sofia">{ui}</div>)
}

const CLIENT: ClientProfile = {
  id: 'c1',
  name: 'ABC Trading Corp.',
  mobile: '+63 917 555 1234',
  email: 'abc@trading.ph',
  tin: '123-456-789-000',
  contactPerson: 'Juan dela Cruz',
  birType: 'vat',
  plan: 'growth',
  accountantId: 'a1',
  clientId: 'u1',
  clientStatus: 'ACTIVE',
  username: 'abc_trading_001',
  accountantName: 'Maria Santos',
  lastPayment: null,
}

describe('ClientDetailModal', () => {
  it('renders the client name in the header', () => {
    wrap(<ClientDetailModal client={CLIENT} onClose={jest.fn()} />)
    expect(screen.getAllByText('ABC Trading Corp.').length).toBeGreaterThan(0)
  })

  it('calls onClose when the × button is clicked', () => {
    const onClose = jest.fn()
    wrap(<ClientDetailModal client={CLIENT} onClose={onClose} />)
    fireEvent.click(screen.getByLabelText('Close modal'))
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('shows Overview tab by default', () => {
    wrap(<ClientDetailModal client={CLIENT} onClose={jest.fn()} />)
    expect(screen.getByRole('tab', { name: 'Overview' })).toHaveAttribute('aria-selected', 'true')
  })

  it('switches to Documents tab when clicked', () => {
    wrap(<ClientDetailModal client={CLIENT} onClose={jest.fn()} />)
    fireEvent.click(screen.getByRole('tab', { name: 'Documents' }))
    expect(screen.getByRole('tab', { name: 'Documents' })).toHaveAttribute('aria-selected', 'true')
  })

  it('COA sections start collapsed', async () => {
    const { useQuery } = require('@tanstack/react-query')
    useQuery.mockReturnValue({
      data: [
        { id: '1', code: '4001', name: 'Sales Revenue', type: 'income', isSystemManaged: false, isActive: true },
        { id: '2', code: '1001', name: 'Cash on Hand',  type: 'cash',   isSystemManaged: true,  isActive: true },
      ],
      isLoading: false,
    })
    wrap(<ClientDetailModal client={CLIENT} onClose={jest.fn()} />)
    fireEvent.click(screen.getByRole('tab', { name: 'Chart of Accounts' }))
    expect(screen.queryByDisplayValue('Sales Revenue')).not.toBeInTheDocument()
  })

  it('COA section expands when its header is clicked', async () => {
    const { useQuery } = require('@tanstack/react-query')
    useQuery.mockReturnValue({
      data: [
        { id: '1', code: '4001', name: 'Sales Revenue', type: 'income', isSystemManaged: false, isActive: true },
      ],
      isLoading: false,
    })
    wrap(<ClientDetailModal client={CLIENT} onClose={jest.fn()} />)
    fireEvent.click(screen.getByRole('tab', { name: 'Chart of Accounts' }))
    fireEvent.click(screen.getByText('Income Accounts'))
    expect(screen.getByDisplayValue('Sales Revenue')).toBeInTheDocument()
  })
})
