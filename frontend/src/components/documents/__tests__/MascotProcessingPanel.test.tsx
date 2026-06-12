import { render, screen } from '@testing-library/react'
import { MascotProcessingPanel } from '../MascotProcessingPanel'

jest.mock('@/components/login/PugMascot', () => ({
  __esModule: true,
  default: ({ happy }: { happy?: boolean }) => (
    <div data-testid="pug" data-happy={happy ? 'true' : 'false'} />
  ),
}))

jest.mock('@/lib/hooks/useDocumentStatus', () => ({
  useDocumentStatus: jest.fn(),
}))

import { useDocumentStatus } from '@/lib/hooks/useDocumentStatus'
const mockStatus = useDocumentStatus as jest.Mock

function renderPanel(stage: string) {
  mockStatus.mockReturnValue({ stage, status: 'processing', flag: null, label: stage })
  return render(<MascotProcessingPanel docId="doc-abc" />)
}

describe('MascotProcessingPanel — working state', () => {
  it('shows stage-0 message for uploading', () => {
    renderPanel('uploading')
    expect(screen.getByText('Scanning your document…')).toBeInTheDocument()
  })

  it('shows stage-0 message for preprocessing', () => {
    renderPanel('preprocessing')
    expect(screen.getByText('Scanning your document…')).toBeInTheDocument()
  })

  it('shows stage-1 message for ai', () => {
    renderPanel('ai')
    expect(screen.getByText('Reading through entries…')).toBeInTheDocument()
  })

  it('shows stage-2 message for anomaly_check', () => {
    renderPanel('anomaly_check')
    expect(screen.getByText('Running a quality check…')).toBeInTheDocument()
  })

  it('renders the pug mascot', () => {
    renderPanel('uploading')
    expect(screen.getByTestId('pug')).toBeInTheDocument()
  })
})

describe('MascotProcessingPanel — done state', () => {
  it('shows "All done!" when stage is parked', () => {
    renderPanel('parked')
    expect(screen.getByText('All done!')).toBeInTheDocument()
  })

  it('shows "All done!" when stage is read_failed', () => {
    renderPanel('read_failed')
    expect(screen.getByText('All done!')).toBeInTheDocument()
  })

  it('shows "All done!" for any unknown stage', () => {
    renderPanel('something_unexpected')
    expect(screen.getByText('All done!')).toBeInTheDocument()
  })

  it('shows the done subtitle', () => {
    renderPanel('parked')
    expect(screen.getByText('Your document is ready for review.')).toBeInTheDocument()
  })

  it('passes happy=true to PugMascot in done state', () => {
    renderPanel('parked')
    expect(screen.getByTestId('pug')).toHaveAttribute('data-happy', 'true')
  })
})
