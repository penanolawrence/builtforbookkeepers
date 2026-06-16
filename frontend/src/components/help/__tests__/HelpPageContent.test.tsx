import { render, screen, fireEvent } from '@testing-library/react'
import { HelpPageContent } from '../HelpPageContent'
import { getTourContinueFlag } from '@/components/tour/tourSession'

const mockPush = jest.fn()
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
}))
jest.mock('../HelpSidebarNav', () => ({
  HelpSidebarNav: () => <div data-testid="sidebar" />,
}))

describe('HelpPageContent replay tutorial', () => {
  beforeEach(() => {
    sessionStorage.clear()
    mockPush.mockClear()
  })

  it('renders a Replay tutorial button', () => {
    render(<HelpPageContent />)
    expect(screen.getByRole('button', { name: 'Replay tutorial' })).toBeInTheDocument()
  })

  it('sets the dashboard continue flag and navigates on click', () => {
    render(<HelpPageContent />)
    fireEvent.click(screen.getByRole('button', { name: 'Replay tutorial' }))
    expect(getTourContinueFlag()).toBe('dashboard')
    expect(mockPush).toHaveBeenCalledWith('/accountant/dashboard')
  })
})
