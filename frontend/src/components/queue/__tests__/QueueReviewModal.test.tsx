// frontend/src/components/queue/__tests__/QueueReviewModal.test.tsx
import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { QueueReviewModal } from '../QueueReviewModal'

jest.mock('@tanstack/react-query', () => ({ useQuery: jest.fn() }))
jest.mock('@/lib/api/queue', () => ({
  getQueueItem:    jest.fn(),
  approveItem:     jest.fn().mockResolvedValue(undefined),
  rejectItem:      jest.fn().mockResolvedValue(undefined),
  returnItem:      jest.fn().mockResolvedValue(undefined),
  reclassifyItem:  jest.fn().mockResolvedValue(undefined),
}))
jest.mock('@/lib/api/documents', () => ({
  getSignedUrl: jest.fn().mockResolvedValue({ url: 'https://example.com/receipt.jpg' }),
}))
jest.mock('@/lib/api/accounts', () => ({ getAccounts: jest.fn() }))
jest.mock('@/components/queue/SubtypeCombobox', () => ({
  SubtypeCombobox: () => <div data-testid="subtype-combobox" />,
}))
jest.mock('@/components/ui/dialog', () => ({
  Dialog:        ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogTitle:   ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}))

const expenseLine = {
  id: 'l1', type: 'expense' as const, accountId: 'a1', accountCode: '5008',
  accountName: null, subtypeId: null, subtypeName: 'Meals', amount: 945,
  description: 'Purchase', date: '2026-06-27',
}
const incomeLine = {
  id: 'l2', type: 'income' as const, accountId: 'a2', accountCode: '4001',
  accountName: null, subtypeId: null, subtypeName: null, amount: 100,
  description: 'Revenue', date: '2026-06-26',
}

function makeItem(overrides: Record<string, unknown> = {}) {
  return {
    refNumber: 'EFS001', clientId: 'c1', clientName: 'ABC Trading',
    flag: 'GREEN', isNoReceipt: false, documentId: 'doc-1',
    isVat: false, journalPreview: [],
    merchantName: 'Maya Tapa King', date: '2026-06-27',
    declaredType: 'expense', paymentMethod: 'bank',
    anomalyReasons: [], transactionLines: [expenseLine, incomeLine],
    ...overrides,
  }
}

function mockQueries(item = makeItem()) {
  const { useQuery } = require('@tanstack/react-query')
  ;(useQuery as jest.Mock).mockImplementation(({ queryKey }: { queryKey: unknown[] }) => {
    if (queryKey[0] === 'queue-item') return { data: item, isLoading: false }
    if (queryKey[0] === 'accounts')   return { data: [],   isLoading: false }
    return { data: undefined, isLoading: false }
  })
}

function wrap(documentId = 'doc-1') {
  return render(<QueueReviewModal documentId={documentId} onClose={jest.fn()} />)
}

describe('QueueReviewModal — transaction line section visibility', () => {
  afterEach(() => jest.clearAllMocks())

  it('shows only expense section when declaredType is expense', () => {
    mockQueries(makeItem({ declaredType: 'expense' }))
    wrap()
    expect(screen.getByTestId('expense-lines-section')).toBeInTheDocument()
    expect(screen.queryByTestId('income-lines-section')).not.toBeInTheDocument()
  })

  it('shows only income section when declaredType is income', () => {
    mockQueries(makeItem({ declaredType: 'income' }))
    wrap()
    expect(screen.getByTestId('income-lines-section')).toBeInTheDocument()
    expect(screen.queryByTestId('expense-lines-section')).not.toBeInTheDocument()
  })

  it('approve payload excludes lines of the hidden type', async () => {
    const { approveItem } = require('@/lib/api/queue')
    mockQueries(makeItem({ declaredType: 'expense' }))
    wrap()

    fireEvent.click(screen.getByText('Approve'))

    await waitFor(() => expect(approveItem).toHaveBeenCalledTimes(1))

    const payload = (approveItem as jest.Mock).mock.calls[0][1]
    const submittedTypes = (payload.lines as { type: string }[]).map((l) => l.type)
    expect(submittedTypes.every((t) => t === 'expense')).toBe(true)
    expect(submittedTypes).not.toContain('income')
    expect(payload.removedLineIds).toEqual([])
  })
})

describe('QueueReviewModal — receipt lightbox', () => {
  afterEach(() => jest.clearAllMocks())

  it('does not show lightbox on initial render', () => {
    mockQueries()
    wrap()
    expect(screen.queryByTestId('receipt-lightbox')).not.toBeInTheDocument()
  })

  it('opens lightbox when receipt viewer is clicked', async () => {
    mockQueries()
    wrap()

    await waitFor(() =>
      expect(screen.getByTestId('receipt-viewer')).toBeInTheDocument()
    )

    fireEvent.click(screen.getByTestId('receipt-viewer'))
    expect(screen.getByTestId('receipt-lightbox')).toBeInTheDocument()
  })

  it('opens lightbox when Enter is pressed on receipt viewer', async () => {
    mockQueries()
    wrap()

    await waitFor(() => screen.getByTestId('receipt-viewer'))
    fireEvent.keyDown(screen.getByTestId('receipt-viewer'), { key: 'Enter' })
    expect(screen.getByTestId('receipt-lightbox')).toBeInTheDocument()
  })

  it('opens lightbox when Space is pressed on receipt viewer', async () => {
    mockQueries()
    wrap()

    await waitFor(() => screen.getByTestId('receipt-viewer'))
    fireEvent.keyDown(screen.getByTestId('receipt-viewer'), { key: ' ' })
    expect(screen.getByTestId('receipt-lightbox')).toBeInTheDocument()
  })

  it('closes lightbox when close button is clicked', async () => {
    mockQueries()
    wrap()

    await waitFor(() => screen.getByTestId('receipt-viewer'))
    fireEvent.click(screen.getByTestId('receipt-viewer'))
    expect(screen.getByTestId('receipt-lightbox')).toBeInTheDocument()

    fireEvent.click(screen.getByLabelText('Close lightbox'))
    expect(screen.queryByTestId('receipt-lightbox')).not.toBeInTheDocument()
  })

  it('closes lightbox on Escape key', async () => {
    mockQueries()
    wrap()

    await waitFor(() => screen.getByTestId('receipt-viewer'))
    fireEvent.click(screen.getByTestId('receipt-viewer'))
    expect(screen.getByTestId('receipt-lightbox')).toBeInTheDocument()

    fireEvent.keyDown(window, { key: 'Escape' })
    expect(screen.queryByTestId('receipt-lightbox')).not.toBeInTheDocument()
  })

  it('closes lightbox when backdrop is clicked', async () => {
    mockQueries()
    wrap()

    await waitFor(() => screen.getByTestId('receipt-viewer'))
    fireEvent.click(screen.getByTestId('receipt-viewer'))
    const lightbox = screen.getByTestId('receipt-lightbox')
    expect(lightbox).toBeInTheDocument()

    fireEvent.click(lightbox)
    expect(screen.queryByTestId('receipt-lightbox')).not.toBeInTheDocument()
  })

  it('does not render receipt-viewer when isNoReceipt is true', () => {
    mockQueries(makeItem({ isNoReceipt: true }))
    wrap()
    expect(screen.queryByTestId('receipt-viewer')).not.toBeInTheDocument()
  })
})

const expenseAccount  = { id: 'a-exp', code: '6160', name: 'Professional Fees',    type: 'expense',   isSystemManaged: false, isActive: true }
const liabilityAccount = { id: 'a-lib', code: '2210', name: 'EWT Payable',          type: 'liability', isSystemManaged: true,  isActive: true }
const vatAccount       = { id: 'a-vat', code: '1101', name: 'Input VAT',            type: 'vat',       isSystemManaged: true,  isActive: true }

function mockQueriesWithAccounts(item = makeItem(), accts: typeof expenseAccount[] = []) {
  const { useQuery } = require('@tanstack/react-query')
  ;(useQuery as jest.Mock).mockImplementation(({ queryKey }: { queryKey: unknown[] }) => {
    if (queryKey[0] === 'queue-item') return { data: item, isLoading: false }
    if (queryKey[0] === 'accounts')   return { data: accts, isLoading: false }
    return { data: undefined, isLoading: false }
  })
}

describe('QueueReviewModal — counter entries grouping', () => {
  afterEach(() => jest.clearAllMocks())

  it('renders counter-lines-section when a line uses a liability account', () => {
    const ewtLine = {
      id: 'l-ewt', type: 'expense' as const, accountId: 'a-lib', accountCode: '2210',
      accountName: null, subtypeId: null, subtypeName: null,
      amount: 1500, description: 'EWT Payable', date: '2026-06-19',
    }
    mockQueriesWithAccounts(
      makeItem({ declaredType: 'expense', transactionLines: [expenseLine, ewtLine] }),
      [expenseAccount, liabilityAccount],
    )
    wrap()
    expect(screen.getByTestId('counter-lines-section')).toBeInTheDocument()
  })

  it('vat lines go to primary section — counter section hidden when only vat lines present', () => {
    const vatLine = {
      id: 'l-vat', type: 'expense' as const, accountId: 'a-vat', accountCode: '1101',
      accountName: null, subtypeId: null, subtypeName: null,
      amount: 3600, description: 'Input VAT', date: '2026-06-19',
    }
    mockQueriesWithAccounts(
      makeItem({ declaredType: 'expense', transactionLines: [expenseLine, vatLine] }),
      [expenseAccount, vatAccount],
    )
    wrap()
    // vat accounts go to primary — counter section should not render
    expect(screen.queryByTestId('counter-lines-section')).not.toBeInTheDocument()
  })

  it('renders counter-lines-section with content when a line uses a tax_credit account', () => {
    const taxCreditAccount = { id: 'a-tc', code: '1102', name: 'EWT Withheld by Customers', type: 'tax_credit', isSystemManaged: true, isActive: true }
    const ewtRecLine = {
      id: 'l-tc', type: 'income' as const, accountId: 'a-tc', accountCode: '1102',
      accountName: null, subtypeId: null, subtypeName: null,
      amount: 1500, description: 'EWT withheld by buyer', date: '2026-06-19',
    }
    const incomeAccount = { id: 'a-inc', code: '4010', name: 'Service Revenue', type: 'income', isSystemManaged: false, isActive: true }
    const incLine = { id: 'l-inc', type: 'income' as const, accountId: 'a-inc', accountCode: '4010', accountName: null, subtypeId: null, subtypeName: null, amount: 30000, description: 'Revenue', date: '2026-06-19' }
    mockQueriesWithAccounts(
      makeItem({ declaredType: 'income', transactionLines: [incLine, ewtRecLine] }),
      [incomeAccount, taxCreditAccount],
    )
    wrap()
    expect(screen.getByTestId('counter-lines-section')).toBeInTheDocument()
    expect(screen.queryByText('No withholdings or payables.')).not.toBeInTheDocument()
  })

  it('hides counter-lines-section when no counter lines exist', () => {
    mockQueriesWithAccounts(
      makeItem({ declaredType: 'expense', transactionLines: [expenseLine] }),
      [expenseAccount],
    )
    wrap()
    expect(screen.queryByTestId('counter-lines-section')).not.toBeInTheDocument()
  })

  it('hides counter-lines-section when lines have no account selected', () => {
    const emptyLine = {
      id: 'l-empty', type: 'expense' as const, accountId: '', accountCode: '',
      accountName: null, subtypeId: null, subtypeName: null,
      amount: 100, description: 'Pending', date: '2026-06-19',
    }
    mockQueriesWithAccounts(
      makeItem({ declaredType: 'expense', transactionLines: [emptyLine] }),
      [],
    )
    wrap()
    expect(screen.queryByTestId('counter-lines-section')).not.toBeInTheDocument()
  })

  it('shows Withholdings & Payables label for expense docs', () => {
    const ewtLine = { id: 'l-ewt', type: 'expense' as const, accountId: 'a-lib', accountCode: '2210', accountName: null, subtypeId: null, subtypeName: null, amount: 1500, description: 'EWT', date: '2026-06-19' }
    mockQueriesWithAccounts(
      makeItem({ declaredType: 'expense', transactionLines: [expenseLine, ewtLine] }),
      [expenseAccount, liabilityAccount],
    )
    wrap()
    expect(screen.getByText(/Withholdings & Payables/)).toBeInTheDocument()
  })

  it('shows Withholdings & Receivables label for income docs', () => {
    const taxCreditAccount = { id: 'a-tc', code: '1102', name: 'EWT Withheld', type: 'tax_credit', isSystemManaged: true, isActive: true }
    const incomeAccount    = { id: 'a-inc', code: '4010', name: 'Service Revenue', type: 'income', isSystemManaged: false, isActive: true }
    const incLine    = { id: 'l-inc', type: 'income' as const, accountId: 'a-inc', accountCode: '4010', accountName: null, subtypeId: null, subtypeName: null, amount: 10000, description: 'Revenue', date: '2026-06-19' }
    const ewtRecLine = { id: 'l-tc',  type: 'income' as const, accountId: 'a-tc',  accountCode: '1102', accountName: null, subtypeId: null, subtypeName: null, amount: 1000,  description: 'EWT withheld', date: '2026-06-19' }
    mockQueriesWithAccounts(
      makeItem({ declaredType: 'income', transactionLines: [incLine, ewtRecLine] }),
      [incomeAccount, taxCreditAccount],
    )
    wrap()
    expect(screen.getByText(/Withholdings & Receivables/)).toBeInTheDocument()
  })
})

describe('QueueReviewModal — cash summary', () => {
  afterEach(() => jest.clearAllMocks())

  it('shows cash-summary with correct Net Cash Out for expense doc', () => {
    const expLine = {
      id: 'l-exp', type: 'expense' as const, accountId: 'a-exp', accountCode: '6160',
      accountName: null, subtypeId: null, subtypeName: null,
      amount: 30000, description: 'Professional Fees', date: '2026-06-19',
    }
    const vatLine = {
      id: 'l-vat', type: 'expense' as const, accountId: 'a-vat', accountCode: '1101',
      accountName: null, subtypeId: null, subtypeName: null,
      amount: 3600, description: 'Input VAT', date: '2026-06-19',
    }
    const ewtLine = {
      id: 'l-ewt', type: 'expense' as const, accountId: 'a-lib', accountCode: '2210',
      accountName: null, subtypeId: null, subtypeName: null,
      amount: 1500, description: 'EWT Payable', date: '2026-06-19',
    }
    mockQueriesWithAccounts(
      makeItem({ declaredType: 'expense', transactionLines: [expLine, vatLine, ewtLine] }),
      [expenseAccount, vatAccount, liabilityAccount],
    )
    wrap()
    expect(screen.getByTestId('cash-summary')).toBeInTheDocument()
    expect(screen.getByTestId('net-cash-label')).toHaveTextContent('Net Cash Out')
    expect(screen.getByTestId('net-cash-value')).toHaveTextContent('₱32,100.00')
  })

  it('shows Net Cash In for income doc', () => {
    const incLine = {
      id: 'l-inc', type: 'income' as const, accountId: 'a-inc', accountCode: '4010',
      accountName: null, subtypeId: null, subtypeName: null,
      amount: 30000, description: 'Service Revenue', date: '2026-06-19',
    }
    const incomeAccount = { id: 'a-inc', code: '4010', name: 'Service Revenue', type: 'income', isSystemManaged: false, isActive: true }
    mockQueriesWithAccounts(
      makeItem({ declaredType: 'income', transactionLines: [incLine] }),
      [incomeAccount],
    )
    wrap()
    expect(screen.getByTestId('net-cash-label')).toHaveTextContent('Net Cash In')
  })

  it('hides cash-summary when there are no primary lines', () => {
    mockQueriesWithAccounts(
      makeItem({ declaredType: 'expense', transactionLines: [] }),
      [],
    )
    wrap()
    expect(screen.queryByTestId('cash-summary')).not.toBeInTheDocument()
  })

  it('hides the withholdings row when there are no counter lines', () => {
    const expLine = {
      id: 'l-exp', type: 'expense' as const, accountId: 'a-exp', accountCode: '6160',
      accountName: null, subtypeId: null, subtypeName: null,
      amount: 30000, description: 'Expense', date: '2026-06-19',
    }
    mockQueriesWithAccounts(
      makeItem({ declaredType: 'expense', transactionLines: [expLine] }),
      [expenseAccount],
    )
    wrap()
    expect(screen.queryByText(/EWT Payable/)).not.toBeInTheDocument()
    expect(screen.getByTestId('net-cash-value')).toHaveTextContent('₱30,000.00')
  })

  it('shows correct Net Cash In for income doc with EWT withheld by buyer', () => {
    const taxCreditAccount = { id: 'a-tc', code: '1102', name: 'EWT Withheld by Customers', type: 'tax_credit', isSystemManaged: true, isActive: true }
    const incomeAccount    = { id: 'a-inc', code: '4010', name: 'Service Revenue', type: 'income', isSystemManaged: false, isActive: true }
    const incLine    = { id: 'l-inc', type: 'income' as const, accountId: 'a-inc', accountCode: '4010', accountName: null, subtypeId: null, subtypeName: null, amount: 33600, description: 'Revenue incl. VAT', date: '2026-06-19' }
    const ewtRecLine = { id: 'l-tc',  type: 'income' as const, accountId: 'a-tc',  accountCode: '1102', accountName: null, subtypeId: null, subtypeName: null, amount: 1500,  description: 'EWT withheld', date: '2026-06-19' }
    mockQueriesWithAccounts(
      makeItem({ declaredType: 'income', transactionLines: [incLine, ewtRecLine] }),
      [incomeAccount, taxCreditAccount],
    )
    wrap()
    expect(screen.getByTestId('net-cash-label')).toHaveTextContent('Net Cash In')
    expect(screen.getByTestId('net-cash-value')).toHaveTextContent('₱32,100.00')
  })
})

describe('QueueReviewModal — account validation', () => {
  afterEach(() => jest.clearAllMocks())

  it('approve button is disabled when a line has no accountId', () => {
    const { useQuery } = require('@tanstack/react-query')
    const emptyItem = makeItem({
      declaredType: 'expense',
      transactionLines: [{
        id: 'l-empty', type: 'expense', accountId: '', accountCode: '',
        accountName: null, subtypeId: null, subtypeName: null,
        amount: 100, description: 'Test', date: '2026-06-19',
      }],
    })
    ;(useQuery as jest.Mock).mockImplementation(({ queryKey }: { queryKey: unknown[] }) => {
      if (queryKey[0] === 'queue-item') return { data: emptyItem, isLoading: false }
      if (queryKey[0] === 'accounts') return { data: [], isLoading: false }
      return { data: undefined, isLoading: false }
    })
    wrap()
    expect(screen.getByText('Approve').closest('button')).toBeDisabled()
  })

  it('approve button is enabled when all lines have accountId', () => {
    const { useQuery } = require('@tanstack/react-query')
    const filledItem = makeItem({ declaredType: 'expense', transactionLines: [expenseLine] })
    ;(useQuery as jest.Mock).mockImplementation(({ queryKey }: { queryKey: unknown[] }) => {
      if (queryKey[0] === 'queue-item') return { data: filledItem, isLoading: false }
      if (queryKey[0] === 'accounts') return { data: [], isLoading: false }
      return { data: undefined, isLoading: false }
    })
    wrap()
    expect(screen.getByText('Approve').closest('button')).not.toBeDisabled()
  })
})
