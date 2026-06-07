import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ThemeToggle } from '@/components/layout/ThemeToggle'

jest.mock('@/components/layout/ThemeProvider', () => ({
  useTheme: jest.fn(),
}))

import { useTheme } from '@/components/layout/ThemeProvider'
const mockUseTheme = useTheme as jest.Mock

function wrap(theme: 'sofia' | 'yoda', setTheme = jest.fn()) {
  mockUseTheme.mockReturnValue({ theme, setTheme })
  return render(<ThemeToggle />)
}

describe('ThemeToggle', () => {
  it('renders Sofia and Yoda tabs', () => {
    wrap('sofia')
    expect(screen.getByRole('tab', { name: 'Sofia' })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'Yoda' })).toBeInTheDocument()
  })

  it('marks the active theme as aria-selected=true', () => {
    wrap('yoda')
    expect(screen.getByRole('tab', { name: 'Yoda' })).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByRole('tab', { name: 'Sofia' })).toHaveAttribute('aria-selected', 'false')
  })

  it('calls setTheme when the inactive tab is clicked', async () => {
    const setTheme = jest.fn()
    wrap('sofia', setTheme)
    await userEvent.click(screen.getByRole('tab', { name: 'Yoda' }))
    expect(setTheme).toHaveBeenCalledWith('yoda')
  })

  it('does not call setTheme when the active tab is clicked', async () => {
    const setTheme = jest.fn()
    wrap('sofia', setTheme)
    await userEvent.click(screen.getByRole('tab', { name: 'Sofia' }))
    expect(setTheme).not.toHaveBeenCalled()
  })
})
