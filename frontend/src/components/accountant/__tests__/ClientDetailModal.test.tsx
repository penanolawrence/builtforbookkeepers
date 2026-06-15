import { render, screen, fireEvent } from '@testing-library/react'
import { ClientDetailModal } from '../ClientDetailModal'

// Mock the shared ClientDetailModal
jest.mock('@/components/clients/ClientDetailModal', () => ({
  ClientDetailModal: ({ clientId, role, onClose }: any) => (
    <div data-testid="shared-modal">
      <div data-testid="client-id">{clientId}</div>
      <div data-testid="role">{role}</div>
      <button onClick={onClose}>Close</button>
    </div>
  ),
}))

// Wrap in a data-theme div so CSS vars resolve (won't affect logic tests)
function wrap(ui: React.ReactElement) {
  return render(<div data-theme="sofia">{ui}</div>)
}

describe('ClientDetailModal (accountant wrapper)', () => {
  it('renders the shared modal with correct props', () => {
    const onClose = jest.fn()
    render(<ClientDetailModal clientId="c1" onClose={onClose} />)
    expect(screen.getByTestId('shared-modal')).toBeInTheDocument()
  })

  it('passes clientId to the shared modal', () => {
    render(<ClientDetailModal clientId="c1" onClose={jest.fn()} />)
    expect(screen.getByTestId('client-id')).toHaveTextContent('c1')
  })

  it('passes role="accountant" to the shared modal', () => {
    render(<ClientDetailModal clientId="c1" onClose={jest.fn()} />)
    expect(screen.getByTestId('role')).toHaveTextContent('accountant')
  })

  it('calls onClose when the shared modal closes', () => {
    const onClose = jest.fn()
    render(<ClientDetailModal clientId="c1" onClose={onClose} />)
    fireEvent.click(screen.getByText('Close'))
    expect(onClose).toHaveBeenCalledTimes(1)
  })
})
