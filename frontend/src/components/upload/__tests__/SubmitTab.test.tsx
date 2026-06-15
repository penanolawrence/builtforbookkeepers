import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { SubmitTab } from '../SubmitTab'

const redItem = {
  documentId: 'doc-red',
  clientId: 'c1',
  clientName: 'ABC',
  accountantName: null,
  flag: 'RED' as const,
  anomalyReasons: ['Amount mismatch'],
  merchantName: 'Meralco',
  amount: 4200,
  vatAmount: null,
  date: '2026-06-10',
  category: null,
  isNoReceipt: false,
  isOcrFailed: false,
  refNumber: '#1042',
  paymentMethod: null,
  declaredType: 'expense' as const,
}
const greenItem = {
  ...redItem,
  documentId: 'doc-green',
  flag: 'GREEN' as const,
  anomalyReasons: [],
  merchantName: 'SM Supermarket',
  amount: 650,
  refNumber: '#1040',
}

jest.mock('@tanstack/react-query', () => ({
  useQueryClient: jest.fn(() => ({ invalidateQueries: jest.fn() })),
  useQuery: jest.fn(() => ({ data: [], isLoading: false })),
}))
jest.mock('@/lib/api/queue', () => ({
  getQueue:     jest.fn(),
  batchApprove: jest.fn(),
}))
jest.mock('@/lib/api/documents', () => ({ uploadDocument: jest.fn() }))
jest.mock('@/hooks/use-toast', () => ({ useToast: jest.fn(() => ({ toast: jest.fn() })) }))
jest.mock('../TwoAreaUpload', () => ({
  TwoAreaUpload: ({ clientId }: { clientId: string }) => (
    <div data-testid="two-area-upload" data-client-id={clientId} />
  ),
}))
jest.mock('../ConfirmUploadDialog', () => ({
  ConfirmUploadDialog: () => <div data-testid="confirm-dialog" />,
}))
jest.mock('@/components/queue/QueueReviewModal', () => ({
  QueueReviewModal: ({ documentId, onRemoved, onClose }: { documentId: string; onRemoved?: (id: string) => void; onClose: () => void }) => (
    <div data-testid="queue-review-modal" data-doc-id={documentId}>
      <button data-testid="mock-remove" onClick={() => onRemoved?.(documentId)}>Remove</button>
      <button data-testid="mock-close" onClick={onClose}>Close</button>
    </div>
  ),
}))

function wrap(role: 'admin' | 'accountant' = 'accountant') {
  return render(
    <div data-theme="sofia">
      <SubmitTab
        clientId="c1"
        docsQueryKey={['docs', 'c1']}
        role={role}
      />
    </div>
  )
}

describe('SubmitTab', () => {
  it('renders the upload area', () => {
    wrap()
    expect(screen.getByTestId('two-area-upload')).toBeInTheDocument()
  })

  it('accepts role prop without error', () => {
    expect(() => wrap('admin')).not.toThrow()
    expect(() => wrap('accountant')).not.toThrow()
  })

  it('shows loading skeleton when queue is loading', () => {
    const { useQuery } = require('@tanstack/react-query')
    ;(useQuery as jest.Mock).mockReturnValue({ data: undefined, isLoading: true })
    wrap()
    expect(screen.getByTestId('queue-skeleton')).toBeInTheDocument()
  })

  it('shows empty state when no queue items', () => {
    const { useQuery } = require('@tanstack/react-query')
    ;(useQuery as jest.Mock).mockReturnValue({ data: [], isLoading: false })
    wrap()
    expect(screen.getByText('No documents pending review.')).toBeInTheDocument()
  })

  it('renders queue items sorted RED before GREEN', () => {
    const { useQuery } = require('@tanstack/react-query')
    ;(useQuery as jest.Mock).mockReturnValue({ data: [greenItem, redItem], isLoading: false })
    wrap()
    const rows = screen.getAllByTestId('queue-row')
    expect(rows[0]).toHaveAttribute('data-flag', 'RED')
    expect(rows[1]).toHaveAttribute('data-flag', 'GREEN')
  })

  it('opens QueueReviewModal when a row is clicked', () => {
    const { useQuery } = require('@tanstack/react-query')
    ;(useQuery as jest.Mock).mockReturnValue({ data: [redItem], isLoading: false })
    wrap()
    fireEvent.click(screen.getByTestId('queue-row'))
    expect(screen.getByTestId('queue-review-modal')).toBeInTheDocument()
    expect(screen.getByTestId('queue-review-modal')).toHaveAttribute('data-doc-id', 'doc-red')
  })

  it('invalidates client-queue when item is removed from the modal', () => {
    const invalidateQueries = jest.fn()
    const { useQuery, useQueryClient } = require('@tanstack/react-query')
    ;(useQueryClient as jest.Mock).mockReturnValue({ invalidateQueries })
    ;(useQuery as jest.Mock).mockReturnValue({ data: [redItem], isLoading: false })
    wrap()
    fireEvent.click(screen.getByTestId('queue-row'))
    fireEvent.click(screen.getByTestId('mock-remove'))
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: ['client-queue', 'c1'] })
    expect(screen.queryByTestId('queue-review-modal')).not.toBeInTheDocument()
  })

  it('renders checkbox only on GREEN rows', () => {
    const { useQuery } = require('@tanstack/react-query')
    ;(useQuery as jest.Mock).mockReturnValue({ data: [redItem, greenItem], isLoading: false })
    wrap()
    const checkboxes = screen.getAllByRole('checkbox')
    expect(checkboxes).toHaveLength(1)
  })

  it('does not show batch approve bar when nothing selected', () => {
    const { useQuery } = require('@tanstack/react-query')
    ;(useQuery as jest.Mock).mockReturnValue({ data: [greenItem], isLoading: false })
    wrap()
    expect(screen.queryByTestId('batch-approve-bar')).not.toBeInTheDocument()
  })

  it('shows batch approve bar when a GREEN row is checked', () => {
    const { useQuery } = require('@tanstack/react-query')
    ;(useQuery as jest.Mock).mockReturnValue({ data: [greenItem], isLoading: false })
    wrap()
    fireEvent.click(screen.getByRole('checkbox'))
    expect(screen.getByTestId('batch-approve-bar')).toBeInTheDocument()
    expect(screen.getByText(/1 green item selected/i)).toBeInTheDocument()
  })

  it('calls batchApprove with selected ids and shows success toast', async () => {
    const { useQuery, useQueryClient } = require('@tanstack/react-query')
    const { batchApprove } = require('@/lib/api/queue')
    const toast = jest.fn()
    const { useToast } = require('@/hooks/use-toast')
    ;(useToast as jest.Mock).mockReturnValue({ toast })
    ;(useQueryClient as jest.Mock).mockReturnValue({ invalidateQueries: jest.fn() })
    ;(useQuery as jest.Mock).mockReturnValue({ data: [greenItem], isLoading: false })
    ;(batchApprove as jest.Mock).mockResolvedValue({ approved: ['doc-green'], failed: [] })

    wrap()
    fireEvent.click(screen.getByRole('checkbox'))
    fireEvent.click(screen.getByRole('button', { name: /approve selected/i }))

    await waitFor(() => expect(batchApprove).toHaveBeenCalledWith(['doc-green']))
    expect(toast).toHaveBeenCalledWith({ title: 'Approved 1 item(s).' })
  })

  it('shows error toast when batchApprove throws', async () => {
    const { useQuery } = require('@tanstack/react-query')
    const { batchApprove } = require('@/lib/api/queue')
    const toast = jest.fn()
    const { useToast } = require('@/hooks/use-toast')
    ;(useToast as jest.Mock).mockReturnValue({ toast })
    ;(useQuery as jest.Mock).mockReturnValue({ data: [greenItem], isLoading: false })
    ;(batchApprove as jest.Mock).mockRejectedValue(new Error('network'))

    wrap()
    fireEvent.click(screen.getByRole('checkbox'))
    fireEvent.click(screen.getByRole('button', { name: /approve selected/i }))

    await screen.findByRole('button', { name: /approve selected/i })
    expect(toast).toHaveBeenCalledWith({
      title: 'Batch approval failed. Please try again.',
      variant: 'destructive',
    })
  })
})
