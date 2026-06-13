// frontend/src/app/(auth)/setup/__tests__/SetupPage.test.tsx
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import { useRouter, useSearchParams } from 'next/navigation'
import SetupPage from '../page'

const mockValidateSetupToken = jest.fn()
const mockSetupPassword = jest.fn()
const mockPush = jest.fn()
const mockReplace = jest.fn()

jest.mock('@/lib/api/auth', () => ({
  validateSetupToken: (...args: unknown[]) => mockValidateSetupToken(...args),
  setupPassword: (...args: unknown[]) => mockSetupPassword(...args),
}))

jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
  useSearchParams: jest.fn(),
}))

jest.mock('@/components/login/PugMascot', () => ({
  __esModule: true,
  default: ({ peeking, happy }: { peeking: boolean; happy: boolean }) => (
    <div data-testid="pug-mascot" data-peeking={peeking} data-happy={happy} />
  ),
}))

function mockValidToken(role: 'client' | 'accountant' = 'client') {
  mockValidateSetupToken.mockResolvedValueOnce({ valid: true, expired: false, role })
}

beforeEach(() => {
  jest.clearAllMocks()
  ;(useRouter as jest.Mock).mockReturnValue({ push: mockPush, replace: mockReplace })
  ;(useSearchParams as jest.Mock).mockReturnValue({ get: (k: string) => k === 'token' ? 'test-token' : null })
  document.body.className = ''
  localStorage.clear()
})

describe('SetupPage', () => {
  it('shows loading spinner while validating token', () => {
    mockValidateSetupToken.mockReturnValueOnce(new Promise(() => {})) // never resolves
    render(<SetupPage />)
    expect(screen.getByText(/validating your invite link/i)).toBeInTheDocument()
  })

  it('shows invalid state for an invalid token', async () => {
    mockValidateSetupToken.mockResolvedValueOnce({ valid: false, expired: false, role: null })
    render(<SetupPage />)
    await waitFor(() => {
      expect(screen.getByText(/this link is invalid/i)).toBeInTheDocument()
    })
  })

  it('shows expired state for an expired token', async () => {
    mockValidateSetupToken.mockResolvedValueOnce({ valid: true, expired: true, role: null })
    render(<SetupPage />)
    await waitFor(() => {
      expect(screen.getByText(/this link has expired/i)).toBeInTheDocument()
    })
  })

  it('renders form fields for a valid client token', async () => {
    mockValidToken('client')
    render(<SetupPage />)
    await waitFor(() => {
      expect(screen.getByText('Set up your account')).toBeInTheDocument()
    })
    expect(screen.getByPlaceholderText('Your full name')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Min. 8 characters')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Re-enter your password')).toBeInTheDocument()
  })

  it('shows Client role chip for client role', async () => {
    mockValidToken('client')
    render(<SetupPage />)
    await waitFor(() => {
      expect(screen.getByText(/client/i, { selector: '.role-chip-client' })).toBeInTheDocument()
    })
  })

  it('shows Accountant role chip for accountant role', async () => {
    mockValidToken('accountant')
    render(<SetupPage />)
    await waitFor(() => {
      expect(screen.getByText(/accountant/i, { selector: '.role-chip-accountant' })).toBeInTheDocument()
    })
  })

  it('adds theme-sofia to body on mount', async () => {
    mockValidToken()
    render(<SetupPage />)
    await waitFor(() => expect(document.body.classList.contains('theme-sofia')).toBe(true))
  })

  it('switches to theme-yoda when Yoda tab is clicked', async () => {
    mockValidToken()
    render(<SetupPage />)
    await waitFor(() => expect(screen.getByText('Set up your account')).toBeInTheDocument())
    fireEvent.click(screen.getByRole('tab', { name: 'Yoda' }))
    expect(document.body.classList.contains('theme-yoda')).toBe(true)
    expect(document.body.classList.contains('theme-sofia')).toBe(false)
  })

  it('removes theme class from body on unmount', async () => {
    mockValidToken()
    const { unmount } = render(<SetupPage />)
    await waitFor(() => expect(document.body.classList.contains('theme-sofia')).toBe(true))
    unmount()
    expect(document.body.classList.contains('theme-sofia')).toBe(false)
  })

  it('toggles New Password field visibility', async () => {
    mockValidToken()
    render(<SetupPage />)
    await waitFor(() => expect(screen.getByPlaceholderText('Min. 8 characters')).toBeInTheDocument())
    const pwInput = screen.getByPlaceholderText('Min. 8 characters')
    expect(pwInput).toHaveAttribute('type', 'password')
    fireEvent.click(screen.getByRole('button', { name: 'Toggle password visibility' }))
    expect(pwInput).toHaveAttribute('type', 'text')
  })

  it('shows API error when setup fails', async () => {
    mockValidToken()
    mockSetupPassword.mockRejectedValueOnce({
      isAxiosError: true,
      response: { status: 422, data: { message: 'Token already used.' } },
    })
    render(<SetupPage />)
    await waitFor(() => expect(screen.getByPlaceholderText('Your full name')).toBeInTheDocument())

    fireEvent.change(screen.getByPlaceholderText('Your full name'), { target: { value: 'Juan dela Cruz' } })
    fireEvent.change(screen.getByPlaceholderText('Min. 8 characters'), { target: { value: 'Password1!' } })
    fireEvent.change(screen.getByPlaceholderText('Re-enter your password'), { target: { value: 'Password1!' } })
    fireEvent.click(screen.getByRole('button', { name: /create account/i }))

    await waitFor(() => {
      expect(screen.getByText('Token already used.')).toBeInTheDocument()
    })
  })

  it('navigates to role dashboard after successful setup', async () => {
    jest.useFakeTimers()
    mockValidToken('client')
    mockSetupPassword.mockResolvedValueOnce({ user: { role: 'client' } })
    render(<SetupPage />)
    await waitFor(() => expect(screen.getByPlaceholderText('Your full name')).toBeInTheDocument())

    fireEvent.change(screen.getByPlaceholderText('Your full name'), { target: { value: 'Juan dela Cruz' } })
    fireEvent.change(screen.getByPlaceholderText('Min. 8 characters'), { target: { value: 'Password1!' } })
    fireEvent.change(screen.getByPlaceholderText('Re-enter your password'), { target: { value: 'Password1!' } })
    fireEvent.click(screen.getByRole('button', { name: /create account/i }))

    await act(async () => { await Promise.resolve() })
    act(() => { jest.advanceTimersByTime(1500) })

    expect(mockPush).toHaveBeenCalledWith('/client/dashboard')
    jest.useRealTimers()
  })

  it('redirects to /login when no token in URL', () => {
    ;(useSearchParams as jest.Mock).mockReturnValue({ get: () => null })
    render(<SetupPage />)
    expect(mockReplace).toHaveBeenCalledWith('/login')
  })
})
