import { render, screen } from '@testing-library/react'
import HelpPage from '../page'

jest.mock('@/components/help/HelpSidebarNav', () => ({
  HelpSidebarNav: () => <aside data-testid="sidebar-nav" />,
}))

describe('HelpPage', () => {
  it('renders the page heading', () => {
    render(<HelpPage />)
    expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument()
    expect(screen.getByText(/Sofia Books/)).toBeInTheDocument()
  })

  it('renders all 7 section headings', () => {
    render(<HelpPage />)
    expect(screen.getByText('Who Does What')).toBeInTheDocument()
    expect(screen.getByText(/How a Transaction Enters/)).toBeInTheDocument()
    expect(screen.getByText(/Flag Colors/)).toBeInTheDocument()
    expect(screen.getByText('The Approval Queue')).toBeInTheDocument()
    expect(screen.getByText(/Correcting a Posted/)).toBeInTheDocument()
    expect(screen.getByText(/BIR Books/)).toBeInTheDocument()
    expect(screen.getByText(/Setting Up a New Client/)).toBeInTheDocument()
  })

  it('renders the Quick Reference section', () => {
    render(<HelpPage />)
    expect(screen.getByText('Transaction Status Lifecycle')).toBeInTheDocument()
  })

  it('renders the sidebar nav', () => {
    render(<HelpPage />)
    expect(screen.getByTestId('sidebar-nav')).toBeInTheDocument()
  })
})
