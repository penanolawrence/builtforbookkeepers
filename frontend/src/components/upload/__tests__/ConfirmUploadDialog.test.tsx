import { render, screen, fireEvent } from '@testing-library/react'
import { ConfirmUploadDialog } from '../ConfirmUploadDialog'

function makeFile(name: string, type = 'image/jpeg', sizeKB = 100) {
  const file = new File(['x'], name, { type })
  Object.defineProperty(file, 'size', { value: sizeKB * 1024 })
  return file
}

const incomeItem = { file: makeFile('receipt1.jpg'), declaredType: 'income' as const }
const expenseItem = { file: makeFile('bill.pdf', 'application/pdf'), declaredType: 'expense' as const }

function wrap(props: Partial<Parameters<typeof ConfirmUploadDialog>[0]> = {}) {
  return render(
    <ConfirmUploadDialog
      open={props.open ?? true}
      files={props.files ?? [incomeItem]}
      onConfirm={props.onConfirm ?? jest.fn()}
      onCancel={props.onCancel ?? jest.fn()}
    />
  )
}

describe('ConfirmUploadDialog', () => {
  it('renders singular title for 1 file', () => {
    wrap({ files: [incomeItem] })
    expect(screen.getByText('Upload 1 Income Document')).toBeInTheDocument()
  })

  it('renders plural title for multiple files', () => {
    const extra = { file: makeFile('receipt2.jpg'), declaredType: 'income' as const }
    wrap({ files: [incomeItem, extra] })
    expect(screen.getByText('Upload 2 Income Documents')).toBeInTheDocument()
  })

  it('renders expense title when files are expense type', () => {
    wrap({ files: [expenseItem] })
    expect(screen.getByText('Upload 1 Expense Document')).toBeInTheDocument()
  })

  it('lists all file names', () => {
    wrap({ files: [incomeItem, expenseItem] })
    expect(screen.getByText('receipt1.jpg')).toBeInTheDocument()
    expect(screen.getByText('bill.pdf')).toBeInTheDocument()
  })

  it('renders confirm button with file count', () => {
    wrap({ files: [incomeItem, expenseItem] })
    expect(screen.getByRole('button', { name: /Upload 2 files/i })).toBeInTheDocument()
  })

  it('renders confirm button with singular label for 1 file', () => {
    wrap({ files: [incomeItem] })
    expect(screen.getByRole('button', { name: /Upload 1 file$/i })).toBeInTheDocument()
  })

  it('calls onConfirm with trimmed note text when confirmed', () => {
    const onConfirm = jest.fn()
    wrap({ onConfirm, files: [incomeItem] })
    fireEvent.change(screen.getByRole('textbox'), { target: { value: '  Meralco May bill  ' } })
    fireEvent.click(screen.getByRole('button', { name: /Upload/i }))
    expect(onConfirm).toHaveBeenCalledWith('Meralco May bill')
  })

  it('calls onConfirm with empty string when no note entered', () => {
    const onConfirm = jest.fn()
    wrap({ onConfirm, files: [incomeItem] })
    fireEvent.click(screen.getByRole('button', { name: /Upload/i }))
    expect(onConfirm).toHaveBeenCalledWith('')
  })

  it('calls onCancel when cancel button is clicked', () => {
    const onCancel = jest.fn()
    wrap({ onCancel })
    fireEvent.click(screen.getByRole('button', { name: /Cancel/i }))
    expect(onCancel).toHaveBeenCalled()
  })

  it('does not render when open is false', () => {
    wrap({ open: false })
    expect(screen.queryByText(/Upload \d+ (Income|Expense) Document/)).toBeNull()
  })
})
