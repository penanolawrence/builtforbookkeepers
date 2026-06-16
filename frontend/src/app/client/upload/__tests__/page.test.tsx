import { render, screen } from '@testing-library/react'
import type { User } from '@/types/auth'
import type { TourStep } from '@/components/tour/types'
import UploadPage from '../page'
import { setTourContinueFlag, getTourContinueFlag } from '@/components/tour/tourSession'

jest.mock('@tanstack/react-query', () => ({
  useQuery: () => ({ data: { data: [] }, isLoading: false }),
  useQueryClient: () => ({ invalidateQueries: jest.fn() }),
}))
jest.mock('@/lib/api/documents', () => ({
  uploadDocument: jest.fn(),
  getDocuments: jest.fn(),
  reuploadDocument: jest.fn(),
  cancelDocument: jest.fn(),
}))
jest.mock('@/hooks/use-toast', () => ({ useToast: () => ({ toast: jest.fn() }) }))
jest.mock('@/components/upload/TwoAreaUpload', () => ({
  TwoAreaUpload: () => <div data-testid="two-area-upload" />,
}))
jest.mock('@/components/upload/ConfirmUploadDialog', () => ({
  ConfirmUploadDialog: () => null,
}))
jest.mock('@/components/documents/DocumentsTable', () => ({
  DocumentsTable: () => <div data-testid="documents-table" />,
}))
jest.mock('@/components/documents/DocumentDetailModal', () => ({
  DocumentDetailModal: () => null,
}))
let mockUser: Partial<User> = { hasSeenTutorial: true }
const mockMarkTutorialSeen = jest.fn()
jest.mock('@/lib/hooks/useAuth', () => ({
  useAuth: () => ({ user: mockUser, markTutorialSeen: mockMarkTutorialSeen }),
}))
jest.mock('@/components/tour/TourOverlay', () => ({
  TourOverlay: ({ step }: { step: TourStep }) => <div data-testid="tour-overlay">{step.title}</div>,
}))

describe('UploadPage tour', () => {
  beforeEach(() => {
    sessionStorage.clear()
    mockUser = { hasSeenTutorial: true }
    mockMarkTutorialSeen.mockClear()
  })

  it('does not start the upload tour when no continue flag is set', () => {
    render(<UploadPage />)
    expect(screen.queryByTestId('tour-overlay')).not.toBeInTheDocument()
  })

  it('auto-starts the upload tour when the dashboard tour set the continue flag', () => {
    setTourContinueFlag('client-upload')
    render(<UploadPage />)
    expect(screen.getByTestId('tour-overlay')).toBeInTheDocument()
  })

  it('consumes the continue flag so it does not retrigger on remount', () => {
    setTourContinueFlag('client-upload')
    render(<UploadPage />)
    expect(getTourContinueFlag()).toBeNull()
  })
})
