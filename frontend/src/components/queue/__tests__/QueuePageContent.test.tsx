import { render, screen } from '@testing-library/react'
import { QueuePageContent } from '../QueuePageContent'
import { setTourContinueFlag, getTourContinueFlag } from '@/components/tour/tourSession'

jest.mock('@tanstack/react-query', () => ({ useQuery: jest.fn(() => ({ data: undefined, isLoading: false })) }))
jest.mock('@/lib/hooks/useApprovalQueue', () => ({
  useApprovalQueue: () => ({ items: [], isLoading: false, batchApprove: jest.fn(), removeItem: jest.fn() }),
}))
jest.mock('@/lib/api/admin/clients', () => ({ getClients: jest.fn() }))
jest.mock('@/lib/api/accountant/clients', () => ({ getAccountantClients: jest.fn() }))
jest.mock('@/lib/api/admin/accountants', () => ({ getAccountants: jest.fn() }))
jest.mock('@/hooks/use-toast', () => ({ useToast: () => ({ toast: jest.fn() }) }))

let mockUser: any = { hasSeenTutorial: true }
const mockMarkTutorialSeen = jest.fn()
jest.mock('@/lib/hooks/useAuth', () => ({
  useAuth: () => ({ user: mockUser, markTutorialSeen: mockMarkTutorialSeen }),
}))
jest.mock('@/components/tour/TourOverlay', () => ({
  TourOverlay: ({ step }: any) => <div data-testid="tour-overlay">{step.title}</div>,
}))

describe('QueuePageContent tour', () => {
  beforeEach(() => {
    sessionStorage.clear()
    mockUser = { hasSeenTutorial: true }
  })

  it('does not start the queue tour when no continue flag is set', () => {
    render(<QueuePageContent reviewBasePath="/accountant/queue" />)
    expect(screen.queryByTestId('tour-overlay')).not.toBeInTheDocument()
  })

  it('auto-starts the queue tour when the dashboard tour set the continue flag', () => {
    setTourContinueFlag('queue')
    render(<QueuePageContent reviewBasePath="/accountant/queue" />)
    expect(screen.getByTestId('tour-overlay')).toBeInTheDocument()
  })

  it('consumes the continue flag so it does not retrigger on remount', () => {
    setTourContinueFlag('queue')
    render(<QueuePageContent reviewBasePath="/accountant/queue" />)
    expect(getTourContinueFlag()).toBeNull()
  })
})
