import { render, screen } from '@testing-library/react'
import ClientDashboard from '../page'

jest.mock('@/components/layout/ThemeProvider', () => ({
  useTheme: () => ({ theme: 'sofia', setTheme: jest.fn() }),
}))
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn() }),
}))
jest.mock('@/lib/hooks/useAuth', () => ({
  useAuth: () => ({ user: { name: 'Maria Santos' } }),
}))
jest.mock('@/components/dashboard/MascotCompanion', () => ({
  MascotCompanion: ({ brief }: { brief?: string }) => (
    <div data-testid="mascot">{brief}</div>
  ),
}))
jest.mock('next/link', () => {
  const Link = ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...rest}>{children}</a>
  )
  Link.displayName = 'Link'
  return Link
})
jest.mock('@tanstack/react-query', () => ({
  useQuery: () => ({
    data: [
      {
        id: 'doc-1',
        refNumber: 'MNL-0012',
        status: 'PARKED',
        declaredType: 'expense',
        amount: 500,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        date: new Date().toISOString().slice(0, 7) + '-01',
        merchantName: null,
        returnNote: null,
      },
      {
        id: 'doc-2',
        refNumber: 'MNL-0011',
        status: 'APPROVED',
        declaredType: 'income',
        amount: 10300,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        date: new Date().toISOString().slice(0, 7) + '-01',
        merchantName: null,
        returnNote: null,
      },
    ],
    isLoading: false,
  }),
}))

function wrap() {
  return render(
    <div data-theme="sofia">
      <ClientDashboard />
    </div>
  )
}

describe('ClientDashboard', () => {
  it('renders greeting with first name', () => {
    wrap()
    expect(screen.getByText(/Good .+, Maria!/)).toBeInTheDocument()
  })

  it('renders all four stat card labels', () => {
    wrap()
    expect(screen.getByText('Total Documents')).toBeInTheDocument()
    expect(screen.getByText('Returned')).toBeInTheDocument()
    // Income and Expenses labels include the month name
    expect(screen.getByText(/Income \(/)).toBeInTheDocument()
    expect(screen.getByText(/Expenses \(/)).toBeInTheDocument()
  })

  it('renders Recent Documents section', () => {
    wrap()
    expect(screen.getByText('Recent Documents')).toBeInTheDocument()
  })

  it('renders View all link pointing to /client/documents', () => {
    wrap()
    const link = screen.getByText('View all →')
    expect(link.closest('a')).toHaveAttribute('href', '/client/documents')
  })

  it('renders Recent Activity section', () => {
    wrap()
    expect(screen.getByText('Recent Activity')).toBeInTheDocument()
  })

  it('renders Upload a Document link pointing to /client/upload', () => {
    wrap()
    const link = screen.getByText('Upload a Document')
    expect(link.closest('a')).toHaveAttribute('href', '/client/upload')
  })

  it('renders mascot companion with brief mentioning parked count', () => {
    wrap()
    const mascot = screen.getByTestId('mascot')
    // 1 PARKED doc → brief mentions "1 document"
    expect(mascot.textContent).toMatch(/\b1 document/)
  })

  it('renders status chip for PARKED document', () => {
    wrap()
    expect(screen.getByText('Parked')).toBeInTheDocument()
  })

  it('renders status chip for APPROVED document as Posted', () => {
    wrap()
    expect(screen.getByText('Posted')).toBeInTheDocument()
  })
})
