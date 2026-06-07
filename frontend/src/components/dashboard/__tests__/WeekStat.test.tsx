import { render, screen } from '@testing-library/react'
import { WeekStat } from '../WeekStat'

describe('WeekStat', () => {
  it('renders value, label, and sub', () => {
    render(<WeekStat value="312" label="Entries processed" sub="across 5 clients" />)
    expect(screen.getByText('312')).toBeInTheDocument()
    expect(screen.getByText('Entries processed')).toBeInTheDocument()
    expect(screen.getByText('across 5 clients')).toBeInTheDocument()
  })

  it('renders without sub when omitted', () => {
    render(<WeekStat value="96%" label="Auto-categorized" />)
    expect(screen.getByText('96%')).toBeInTheDocument()
    expect(screen.getByText('Auto-categorized')).toBeInTheDocument()
  })
})
