import { render, screen, fireEvent } from '@testing-library/react'
import { UploadZone } from '../UploadZone'

function wrap(props: Partial<Parameters<typeof UploadZone>[0]> = {}) {
  return render(
    <div data-theme="sofia">
      <UploadZone
        declaredType={props.declaredType ?? 'income'}
        onFileSelect={props.onFileSelect ?? jest.fn()}
        count={props.count}
      />
    </div>
  )
}

describe('UploadZone — income', () => {
  it('renders the zone name', () => {
    wrap({ declaredType: 'income' })
    expect(screen.getByText('Income')).toBeInTheDocument()
  })

  it('renders the sub description', () => {
    wrap({ declaredType: 'income' })
    expect(screen.getByText('Official receipts, invoices received')).toBeInTheDocument()
  })

  it('renders the count badge when count is provided', () => {
    wrap({ declaredType: 'income', count: 5 })
    expect(screen.getByText('5 this month')).toBeInTheDocument()
  })

  it('does not render the count badge when count is undefined', () => {
    wrap({ declaredType: 'income' })
    expect(screen.queryByText(/this month/)).toBeNull()
  })

  it('renders Take Photo and Choose File buttons', () => {
    wrap({ declaredType: 'income' })
    expect(screen.getByText(/Take Photo/)).toBeInTheDocument()
    expect(screen.getByText(/Choose File/)).toBeInTheDocument()
  })
})

describe('UploadZone — expense', () => {
  it('renders the zone name', () => {
    wrap({ declaredType: 'expense' })
    expect(screen.getByText('Expenses')).toBeInTheDocument()
  })

  it('renders the sub description', () => {
    wrap({ declaredType: 'expense' })
    expect(screen.getByText('Receipts paid, disbursements')).toBeInTheDocument()
  })

  it('renders the count badge when count is provided', () => {
    wrap({ declaredType: 'expense', count: 10 })
    expect(screen.getByText('10 this month')).toBeInTheDocument()
  })

  it('does not render the count badge when count is undefined', () => {
    wrap({ declaredType: 'expense' })
    expect(screen.queryByText(/this month/)).toBeNull()
  })
})

describe('UploadZone — error display', () => {
  it('shows an error if a file exceeds 10MB', () => {
    wrap({ declaredType: 'income', onFileSelect: jest.fn() })
    const input = document.querySelector('input[type="file"]:not([capture])') as HTMLInputElement
    const bigFile = new File(['x'.repeat(11 * 1024 * 1024)], 'big.jpg', { type: 'image/jpeg' })
    Object.defineProperty(bigFile, 'size', { value: 11 * 1024 * 1024 })
    fireEvent.change(input, { target: { files: [bigFile] } })
    expect(screen.getByText('File too large (max 10MB)')).toBeInTheDocument()
  })
})
