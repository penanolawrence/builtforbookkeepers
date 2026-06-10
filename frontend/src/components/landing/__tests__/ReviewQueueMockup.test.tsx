import { render, screen } from '@testing-library/react'
import { ReviewQueueMockup } from '../ReviewQueueMockup'

describe('ReviewQueueMockup', () => {
  it('renders the Review Queue page title', () => {
    render(<ReviewQueueMockup />)
    expect(screen.getByText('Review Queue')).toBeInTheDocument()
  })

  it('renders all four stat card labels', () => {
    render(<ReviewQueueMockup />)
    expect(screen.getByText('Total Items')).toBeInTheDocument()
    expect(screen.getByText('Red Flags')).toBeInTheDocument()
    expect(screen.getByText('Yellow Flags')).toBeInTheDocument()
    expect(screen.getByText('Green / Ready')).toBeInTheDocument()
  })

  it('renders the Approve Selected button', () => {
    render(<ReviewQueueMockup />)
    expect(screen.getByText(/approve selected/i)).toBeInTheDocument()
  })

  it('renders RED, YEL, and GRN flag labels in transaction rows', () => {
    render(<ReviewQueueMockup />)
    expect(screen.getAllByText(/red/i).length).toBeGreaterThan(0)
    expect(screen.getAllByText(/yel/i).length).toBeGreaterThan(0)
    expect(screen.getAllByText(/grn/i).length).toBeGreaterThan(0)
  })

  it('renders the BIR books floating chip', () => {
    render(<ReviewQueueMockup />)
    expect(screen.getByText(/bir books/i)).toBeInTheDocument()
  })

  it('is wrapped in aria-hidden since it is decorative', () => {
    const { container } = render(<ReviewQueueMockup />)
    expect(container.firstChild).toHaveAttribute('aria-hidden', 'true')
  })
})
