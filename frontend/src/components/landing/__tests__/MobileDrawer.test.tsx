import { render, screen, fireEvent } from '@testing-library/react'
import { MobileDrawer } from '../MobileDrawer'

let mockTheme = 'sofia'
const mockSetTheme = jest.fn()
jest.mock('@/components/layout/ThemeProvider', () => ({
  useTheme: () => ({ theme: mockTheme, setTheme: mockSetTheme }),
}))

describe('MobileDrawer', () => {
  beforeEach(() => { mockTheme = 'sofia'; mockSetTheme.mockClear() })

  it('drawer is closed by default', () => {
    render(<MobileDrawer />)
    const drawer = document.querySelector('.ld-drawer') as HTMLElement
    expect(drawer.classList).not.toContain('ld-drawer--open')
  })

  it('opens when hamburger is clicked', () => {
    render(<MobileDrawer />)
    fireEvent.click(screen.getByRole('button', { name: /open menu/i }))
    const drawer = document.querySelector('.ld-drawer') as HTMLElement
    expect(drawer.classList).toContain('ld-drawer--open')
  })

  it('closes when a nav link is clicked', () => {
    render(<MobileDrawer />)
    fireEvent.click(screen.getByRole('button', { name: /open menu/i }))
    fireEvent.click(screen.getByRole('link', { name: /pricing/i }))
    const drawer = document.querySelector('.ld-drawer') as HTMLElement
    expect(drawer.classList).not.toContain('ld-drawer--open')
  })

  it('renders Get Started link pointing to #cta', () => {
    render(<MobileDrawer />)
    const link = screen.getByRole('link', { name: /get started/i })
    expect(link).toHaveAttribute('href', '#cta')
  })
})
