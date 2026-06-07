import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import { useRouter } from 'next/navigation'
import LoginPage from '../page'

const mockLogin = jest.fn()
const mockPush = jest.fn()

jest.mock('@/lib/hooks/useAuth', () => ({
  useAuth: () => ({ login: mockLogin }),
}))

jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
}))

// axios.isAxiosError reads the isAxiosError property — no full mock needed
// (the real implementation is: payload.isAxiosError === true)

beforeEach(() => {
  jest.clearAllMocks()
  ;(useRouter as jest.Mock).mockReturnValue({ push: mockPush })
  document.body.className = ''
  localStorage.clear()
})

describe('LoginPage', () => {
  it('renders the headline and brand name', () => {
    render(<LoginPage />)
    expect(screen.getByText('Welcome back')).toBeInTheDocument()
    expect(screen.getByText('Built for Bookkeepers')).toBeInTheDocument()
  })

  it('adds theme-sofia to body on mount', () => {
    render(<LoginPage />)
    expect(document.body.classList.contains('theme-sofia')).toBe(true)
  })

  it('switches to theme-yoda when Yoda tab clicked', () => {
    render(<LoginPage />)
    fireEvent.click(screen.getByRole('tab', { name: 'Yoda' }))
    expect(document.body.classList.contains('theme-yoda')).toBe(true)
    expect(document.body.classList.contains('theme-sofia')).toBe(false)
  })

  it('removes theme classes from body on unmount', () => {
    const { unmount } = render(<LoginPage />)
    unmount()
    expect(document.body.classList.contains('theme-sofia')).toBe(false)
    expect(document.body.classList.contains('theme-yoda')).toBe(false)
  })

  it('toggles password visibility', () => {
    render(<LoginPage />)
    const pwInput = screen.getByPlaceholderText('Enter your password')
    expect(pwInput).toHaveAttribute('type', 'password')
    fireEvent.click(screen.getByRole('button', { name: 'Toggle password' }))
    expect(pwInput).toHaveAttribute('type', 'text')
    fireEvent.click(screen.getByRole('button', { name: 'Toggle password' }))
    expect(pwInput).toHaveAttribute('type', 'password')
  })

  it('shows error banner on failed login', async () => {
    mockLogin.mockRejectedValueOnce({ isAxiosError: true, response: { status: 422 } })
    render(<LoginPage />)
    fireEvent.change(screen.getByPlaceholderText('you@firm.ph'), { target: { value: 'user@test.com' } })
    fireEvent.change(screen.getByPlaceholderText('Enter your password'), { target: { value: 'wrong' } })
    fireEvent.click(screen.getByRole('button', { name: /sign in/i }))
    await waitFor(() => {
      expect(screen.getByText(/invalid credentials/i)).toBeInTheDocument()
    })
  })

  it('navigates to role dashboard after successful login', async () => {
    jest.useFakeTimers()
    mockLogin.mockResolvedValueOnce({ role: 'accountant' })
    render(<LoginPage />)
    fireEvent.change(screen.getByPlaceholderText('you@firm.ph'), { target: { value: 'user@test.com' } })
    fireEvent.change(screen.getByPlaceholderText('Enter your password'), { target: { value: 'secret' } })
    fireEvent.click(screen.getByRole('button', { name: /sign in/i }))

    // Flush the resolved promise
    await act(async () => { await Promise.resolve() })

    // Advance past the 1500ms navigation delay
    act(() => { jest.advanceTimersByTime(1500) })

    expect(mockPush).toHaveBeenCalledWith('/accountant/dashboard')
    jest.useRealTimers()
  })

  it('redirects to /blocked on 403', async () => {
    mockLogin.mockRejectedValueOnce({ isAxiosError: true, response: { status: 403 } })
    render(<LoginPage />)
    fireEvent.click(screen.getByRole('button', { name: /sign in/i }))
    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/blocked')
    })
  })
})
