import { render, screen, fireEvent } from '@testing-library/react'
import { SubmitTab } from '../SubmitTab'

jest.mock('@tanstack/react-query', () => ({
  useQueryClient: () => ({ invalidateQueries: jest.fn() }),
  useQuery: jest.fn(() => ({ data: [], isLoading: false })),
}))
jest.mock('@/lib/api/queue', () => ({
  getQueue:     jest.fn(),
  batchApprove: jest.fn(),
}))
jest.mock('@/lib/api/documents', () => ({ uploadDocument: jest.fn() }))
jest.mock('@/hooks/use-toast', () => ({ useToast: () => ({ toast: jest.fn() }) }))
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
})
