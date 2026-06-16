import { render, screen } from '@testing-library/react'
import HelpPage from '../page'

jest.mock('@/components/help/HelpSidebarNav', () => ({
  HelpSidebarNav: () => <aside data-testid="sidebar-nav" />,
}))

jest.mock('@/components/help/ReplayTutorialButton', () => ({
  ReplayTutorialButton: () => null,
}))

describe('HelpPage', () => {
  it('renders the page heading', () => {
    render(<HelpPage />)
    expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument()
    expect(screen.getByText(/Sofia Books/)).toBeInTheDocument()
  })

  it('renders all 8 section headings', () => {
    render(<HelpPage />)
    expect(screen.getByText('Who Does What')).toBeInTheDocument()
    expect(screen.getByText(/How a Transaction Enters/)).toBeInTheDocument()
    expect(screen.getByText(/Flag Colors/)).toBeInTheDocument()
    expect(screen.getByText('The Approval Queue')).toBeInTheDocument()
    expect(screen.getByText(/Correcting a Posted/)).toBeInTheDocument()
    expect(screen.getByText('BIR Books')).toBeInTheDocument()
    expect(screen.getByText('BIR Tax Reports')).toBeInTheDocument()
    expect(screen.getByText(/Setting Up a New Client/)).toBeInTheDocument()
  })

  it('renders the Merchant TIN callout in the Approval Queue section', () => {
    render(<HelpPage />)
    expect(screen.getByText(/Merchant TIN/)).toBeInTheDocument()
    expect(screen.getAllByText(/Summary List of Purchases/).length).toBeGreaterThan(0)
  })

  it('renders the VAT report tab descriptions', () => {
    render(<HelpPage />)
    expect(screen.getByText('2550M')).toBeInTheDocument()
    expect(screen.getByText('2550Q')).toBeInTheDocument()
    expect(screen.getByText('SLS')).toBeInTheDocument()
    expect(screen.getByText('SLP')).toBeInTheDocument()
  })

  it('renders the Non-VAT 2551Q description', () => {
    render(<HelpPage />)
    expect(screen.getAllByText(/2551Q/).length).toBeGreaterThan(0)
    expect(screen.getByText(/3% of gross receipts/)).toBeInTheDocument()
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
