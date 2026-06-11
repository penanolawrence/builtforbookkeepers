import { render, screen, fireEvent } from '@testing-library/react'
import { DocumentsTable } from '../DocumentsTable'
import type { Document } from '@/types/document'

function makeDoc(overrides: Partial<Document> = {}): Document {
  return {
    id: 'doc-1',
    companyId: 'company-1',
    refNumber: 'MNL-0010',
    status: 'PARKED',
    declaredType: 'expense',
    isNoReceipt: false,
    inflow: 0,
    outflow: 600,
    createdAt: '2026-06-02T00:00:00Z',
    updatedAt: '2026-06-02T00:00:00Z',
    flag: null,
    anomalyReasons: [],
    merchantName: null,
    date: null,
    amount: null,
    vatAmount: null,
    category: null,
    paymentMethod: null,
    imageUrl: '',
    isOcrFailed: false,
    returnNote: null,
    rejectionReason: null,
    expiresAt: null,
    note: null,
    transactionLines: [],
    fieldOverrides: null,
    ...overrides,
  } as Document
}

function wrap(docs: Document[], onRowClick = jest.fn(), title?: string) {
  return render(
    <div data-theme="sofia">
      <DocumentsTable
        docs={docs}
        totalDocs={docs.length}
        lastPage={1}
        perPage={10}
        page={1}
        onPageChange={jest.fn()}
        onRowClick={onRowClick}
        title={title}
      />
    </div>
  )
}

describe('DocumentsTable', () => {
  it('renders nothing when docs is empty', () => {
    const { container } = wrap([])
    expect(container.firstChild).toBeEmptyDOMElement()
  })

  it('renders the title', () => {
    wrap([makeDoc()], jest.fn(), 'In Progress')
    expect(screen.getByText('In Progress')).toBeInTheDocument()
  })

  it('renders the reference number', () => {
    wrap([makeDoc()])
    expect(screen.getAllByText('MNL-0010').length).toBeGreaterThan(0)
  })

  it('renders the Manual source chip for isNoReceipt docs', () => {
    wrap([makeDoc({ isNoReceipt: true })])
    expect(screen.getByText('Manual')).toBeInTheDocument()
  })

  it('renders the Upload source chip for uploaded docs', () => {
    wrap([makeDoc({ isNoReceipt: false })])
    expect(screen.getByText('Upload')).toBeInTheDocument()
  })

  it('renders the status badge label', () => {
    wrap([makeDoc({ status: 'PARKED' })])
    expect(screen.getAllByText('In Review').length).toBeGreaterThan(0)
  })

  it('renders em-dash for zero inflow on PARKED doc', () => {
    wrap([makeDoc({ status: 'PARKED', inflow: 0 })])
    const dashes = screen.getAllByText('—')
    expect(dashes.length).toBeGreaterThan(0)
  })

  it('calls onRowClick when a row is clicked', () => {
    const onRowClick = jest.fn()
    const doc = makeDoc()
    wrap([doc], onRowClick)
    fireEvent.click(screen.getAllByText('MNL-0010')[0])
    expect(onRowClick).toHaveBeenCalledWith(doc)
  })

  it('renders return note text for RETURNED docs', () => {
    wrap([makeDoc({ status: 'RETURNED', returnNote: 'Wrong receipt attached' })])
    expect(screen.getByText('Wrong receipt attached')).toBeInTheDocument()
  })
})
