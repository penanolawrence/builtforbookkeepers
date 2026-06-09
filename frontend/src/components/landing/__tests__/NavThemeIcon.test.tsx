import { render, screen, fireEvent } from '@testing-library/react'
import { NavThemeIcon } from '../NavThemeIcon'

// Mock useTheme
let mockTheme = 'sofia'
const mockSetTheme = jest.fn()
jest.mock('@/components/layout/ThemeProvider', () => ({
  useTheme: () => ({ theme: mockTheme, setTheme: mockSetTheme }),
}))

describe('NavThemeIcon', () => {
  beforeEach(() => { mockTheme = 'sofia'; mockSetTheme.mockClear() })

  it('shows moon icon when sofia theme is active', () => {
    render(<NavThemeIcon />)
    expect(screen.getByRole('button', { name: /switch to dark mode/i })).toBeInTheDocument()
  })

  it('calls setTheme with yoda when clicked in sofia mode', () => {
    render(<NavThemeIcon />)
    fireEvent.click(screen.getByRole('button', { name: /switch to dark mode/i }))
    expect(mockSetTheme).toHaveBeenCalledWith('yoda')
  })

  it('shows sun icon when yoda theme is active', () => {
    mockTheme = 'yoda'
    render(<NavThemeIcon />)
    expect(screen.getByRole('button', { name: /switch to light mode/i })).toBeInTheDocument()
  })
})
