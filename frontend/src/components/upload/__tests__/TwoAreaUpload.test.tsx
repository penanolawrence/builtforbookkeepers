import { render, screen, fireEvent } from '@testing-library/react'
import { TwoAreaUpload } from '../TwoAreaUpload'

function wrap(props: Partial<Parameters<typeof TwoAreaUpload>[0]> = {}) {
  return render(
    <div data-theme="sofia">
      <TwoAreaUpload
        onFilePicked={props.onFilePicked ?? jest.fn()}
        onManualSuccess={props.onManualSuccess ?? jest.fn()}
        incomeCount={props.incomeCount}
        expenseCount={props.expenseCount}
      />
    </div>
  )
}

describe('TwoAreaUpload', () => {
  it('renders both upload zones', () => {
    wrap()
    expect(screen.getByText('Income')).toBeInTheDocument()
    expect(screen.getByText('Expenses')).toBeInTheDocument()
  })

  it('renders the manual entry button', () => {
    wrap()
    expect(screen.getByRole('button', { name: /Enter manually/i })).toBeInTheDocument()
  })

  it('passes income and expense counts to each zone', () => {
    wrap({ incomeCount: 3, expenseCount: 7 })
    expect(screen.getByText('3 this month')).toBeInTheDocument()
    expect(screen.getByText('7 this month')).toBeInTheDocument()
  })
})
