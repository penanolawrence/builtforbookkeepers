import { render, screen } from '@testing-library/react'
import { MascotBanner } from '../MascotBanner'

let mockTheme = 'sofia'
jest.mock('@/components/layout/ThemeProvider', () => ({
  useTheme: () => ({ theme: mockTheme, setTheme: jest.fn() }),
}))

describe('MascotBanner', () => {
  it('shows Sofia name in light theme', () => {
    mockTheme = 'sofia'
    render(<MascotBanner />)
    expect(screen.getByText(/meet sofia/i)).toBeInTheDocument()
  })

  it('shows Yoda name in dark theme', () => {
    mockTheme = 'yoda'
    render(<MascotBanner />)
    expect(screen.getByText(/meet yoda/i)).toBeInTheDocument()
  })

  it('renders the mascot description', () => {
    mockTheme = 'sofia'
    render(<MascotBanner />)
    expect(screen.getByText(/sort your queue/i)).toBeInTheDocument()
  })
})
