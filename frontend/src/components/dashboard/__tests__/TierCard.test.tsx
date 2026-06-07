import { render, screen } from '@testing-library/react'
import { TierCard, TierChip } from '../TierCard'

// Wrap in a data-theme div so CSS vars resolve (won't affect logic tests)
function withTheme(ui: React.ReactElement) {
  return render(<div data-theme="sofia">{ui}</div>)
}

const reviewTier = { key: 'review' as const, label: 'Needs review', count: 2, note: 'Anomalies flagged by AI' }
const clearTier  = { key: 'ready'  as const, label: 'Ready to approve', count: 0, note: 'Pre-sorted' }

describe('TierCard', () => {
  it('renders the label and note', () => {
    withTheme(<TierCard tier={reviewTier} />)
    expect(screen.getByText('Needs review')).toBeInTheDocument()
    expect(screen.getByText('Anomalies flagged by AI')).toBeInTheDocument()
  })

  it('renders the count number', () => {
    withTheme(<TierCard tier={reviewTier} />)
    expect(screen.getByText('2')).toBeInTheDocument()
  })

  it('shows "open" pill when count > 0', () => {
    withTheme(<TierCard tier={reviewTier} />)
    expect(screen.getByText('open')).toBeInTheDocument()
  })

  it('shows "all clear" pill when count is 0', () => {
    withTheme(<TierCard tier={clearTier} />)
    expect(screen.getByText('all clear')).toBeInTheDocument()
  })
})

describe('TierChip', () => {
  it('renders the count when > 0', () => {
    withTheme(<TierChip tierKey="check" count={3} />)
    expect(screen.getByText('3')).toBeInTheDocument()
  })

  it('renders an em-dash when count is 0', () => {
    withTheme(<TierChip tierKey="check" count={0} />)
    expect(screen.getByText('—')).toBeInTheDocument()
  })
})
