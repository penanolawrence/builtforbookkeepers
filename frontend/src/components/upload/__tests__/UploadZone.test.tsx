import { render, screen, fireEvent } from '@testing-library/react'
import { UploadZone } from '../UploadZone'

function wrap(props: Partial<Parameters<typeof UploadZone>[0]> = {}) {
  return render(
    <div data-theme="sofia">
      <UploadZone
        declaredType={props.declaredType ?? 'income'}
        onFilesSelect={props.onFilesSelect ?? jest.fn()}
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

  it('renders the count badge when count is provided', () => {
    wrap({ declaredType: 'income', count: 5 })
    expect(screen.getByText('5 files')).toBeInTheDocument()
  })

  it('does not render the count badge when count is undefined', () => {
    wrap({ declaredType: 'income' })
    expect(screen.queryByText(/^\d+ files$/)).toBeNull()
  })

  it('renders Browse files and Take photo buttons', () => {
    wrap({ declaredType: 'income' })
    expect(screen.getByText('Browse files')).toBeInTheDocument()
    expect(screen.getByText('Take photo')).toBeInTheDocument()
  })
})

describe('UploadZone — expense', () => {
  it('renders the zone name', () => {
    wrap({ declaredType: 'expense' })
    expect(screen.getByText('Expense')).toBeInTheDocument()
  })

  it('renders the count badge when count is provided', () => {
    wrap({ declaredType: 'expense', count: 10 })
    expect(screen.getByText('10 files')).toBeInTheDocument()
  })
})

describe('UploadZone — multi-file selection', () => {
  it('calls onFilesSelect with array of valid files', () => {
    const onFilesSelect = jest.fn()
    wrap({ declaredType: 'income', onFilesSelect })
    const input = document.querySelector('input[type="file"]:not([capture])') as HTMLInputElement
    const file1 = new File(['a'], 'receipt1.jpg', { type: 'image/jpeg' })
    const file2 = new File(['b'], 'receipt2.png', { type: 'image/png' })
    fireEvent.change(input, { target: { files: [file1, file2] } })
    expect(onFilesSelect).toHaveBeenCalledWith([file1, file2])
  })

  it('calls onFilesSelect with only valid files when some fail validation', () => {
    const onFilesSelect = jest.fn()
    wrap({ declaredType: 'income', onFilesSelect })
    const input = document.querySelector('input[type="file"]:not([capture])') as HTMLInputElement
    const goodFile = new File(['a'], 'receipt.jpg', { type: 'image/jpeg' })
    const badFile = new File(['b'], 'receipt.bmp', { type: 'image/bmp' })
    fireEvent.change(input, { target: { files: [goodFile, badFile] } })
    expect(onFilesSelect).toHaveBeenCalledWith([goodFile])
  })

  it('does not call onFilesSelect when all files fail validation', () => {
    const onFilesSelect = jest.fn()
    wrap({ declaredType: 'income', onFilesSelect })
    const input = document.querySelector('input[type="file"]:not([capture])') as HTMLInputElement
    const badFile = new File(['b'], 'receipt.bmp', { type: 'image/bmp' })
    fireEvent.change(input, { target: { files: [badFile] } })
    expect(onFilesSelect).not.toHaveBeenCalled()
  })

  it('shows a rejection summary when some files are invalid', () => {
    wrap({ declaredType: 'income', onFilesSelect: jest.fn() })
    const input = document.querySelector('input[type="file"]:not([capture])') as HTMLInputElement
    const goodFile = new File(['a'], 'receipt.jpg', { type: 'image/jpeg' })
    const badFile = new File(['b'], 'receipt.bmp', { type: 'image/bmp' })
    fireEvent.change(input, { target: { files: [goodFile, badFile] } })
    expect(screen.getByText(/1 rejected/i)).toBeInTheDocument()
  })

  it('shows a size error when a file exceeds 10MB', () => {
    wrap({ declaredType: 'income', onFilesSelect: jest.fn() })
    const input = document.querySelector('input[type="file"]:not([capture])') as HTMLInputElement
    const bigFile = new File(['x'], 'big.jpg', { type: 'image/jpeg' })
    Object.defineProperty(bigFile, 'size', { value: 11 * 1024 * 1024 })
    fireEvent.change(input, { target: { files: [bigFile] } })
    expect(screen.getByText(/File too large/i)).toBeInTheDocument()
  })
})
