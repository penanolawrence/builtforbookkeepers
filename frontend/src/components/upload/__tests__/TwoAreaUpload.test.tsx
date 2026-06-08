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
    expect(screen.getByText('Expense')).toBeInTheDocument()
  })

  it('renders the manual entry button', () => {
    wrap()
    expect(screen.getByRole('button', { name: /Enter manually/i })).toBeInTheDocument()
  })

  it('passes income and expense counts to each zone', () => {
    wrap({ incomeCount: 3, expenseCount: 7 })
    expect(screen.getByText('3 files')).toBeInTheDocument()
    expect(screen.getByText('7 files')).toBeInTheDocument()
  })

  it('calls onFilePicked with files array and income declaredType', () => {
    const onFilePicked = jest.fn()
    wrap({ onFilePicked })
    const inputs = screen.getAllByTestId('file-browse-input')
    const file1 = new File(['a'], 'receipt1.jpg', { type: 'image/jpeg' })
    const file2 = new File(['b'], 'receipt2.jpg', { type: 'image/jpeg' })
    fireEvent.change(inputs[0], { target: { files: [file1, file2] } })
    expect(onFilePicked).toHaveBeenCalledWith([file1, file2], 'income')
  })

  it('calls onFilePicked with files array and expense declaredType', () => {
    const onFilePicked = jest.fn()
    wrap({ onFilePicked })
    const inputs = screen.getAllByTestId('file-browse-input')
    const file = new File(['a'], 'bill.pdf', { type: 'application/pdf' })
    fireEvent.change(inputs[1], { target: { files: [file] } })
    expect(onFilePicked).toHaveBeenCalledWith([file], 'expense')
  })
})
