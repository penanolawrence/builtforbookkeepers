import { render, screen, fireEvent } from '@testing-library/react'
import type { User } from '@/types/auth'
import { ReplayTutorialButton } from '../ReplayTutorialButton'
import { getTourContinueFlag } from '@/components/tour/tourSession'

const mockPush = jest.fn()
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
}))

let mockUser: Partial<User> = { role: 'accountant' }
jest.mock('@/lib/hooks/useAuth', () => ({
  useAuth: () => ({ user: mockUser }),
}))

describe('ReplayTutorialButton', () => {
  beforeEach(() => {
    sessionStorage.clear()
    mockPush.mockClear()
    mockUser = { role: 'accountant' }
  })

  it('renders for an accountant', () => {
    render(<ReplayTutorialButton />)
    expect(screen.getByRole('button', { name: 'Replay tutorial' })).toBeInTheDocument()
  })

  it('does not render for an admin', () => {
    mockUser = { role: 'admin' }
    render(<ReplayTutorialButton />)
    expect(screen.queryByRole('button', { name: 'Replay tutorial' })).not.toBeInTheDocument()
  })

  it('does not render for a client', () => {
    mockUser = { role: 'client' }
    render(<ReplayTutorialButton />)
    expect(screen.queryByRole('button', { name: 'Replay tutorial' })).not.toBeInTheDocument()
  })

  it('sets the dashboard continue flag and navigates on click', () => {
    render(<ReplayTutorialButton />)
    fireEvent.click(screen.getByRole('button', { name: 'Replay tutorial' }))
    expect(getTourContinueFlag()).toBe('dashboard')
    expect(mockPush).toHaveBeenCalledWith('/accountant/dashboard')
  })
})
