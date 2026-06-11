import { render, screen } from '@testing-library/react'
import { ClientsTable, ClientRow } from '../ClientsTable'

const rows: ClientRow[] = [
  { id: '1', name: 'ABC Trading Corp.', type: 'VAT',     plan: 'Growth',  review: 0, check: 1, ready: 0, pending: 0 },
  { id: '2', name: 'Northwind Logistics', type: 'VAT',   plan: 'Growth',  review: 1, check: 2, ready: 3, pending: 1, lastActive: '1h ago' },
  { id: '3', name: 'Mariposa Café',     type: 'Non-VAT', plan: 'Starter', review: 1, check: 0, ready: 4, pending: 0, lastActive: '3h ago' },
]

function wrap() {
  return render(
    <div data-theme="sofia">
      <ClientsTable rows={rows} />
    </div>
  )
}

describe('ClientsTable', () => {
  it('renders all client names', () => {
    wrap()
    expect(screen.getAllByText('ABC Trading Corp.').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Northwind Logistics').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Mariposa Café').length).toBeGreaterThan(0)
  })

  it('renders type and plan for each row', () => {
    wrap()
    expect(screen.getAllByText('VAT').length).toBeGreaterThan(0)
    expect(screen.getByText('Non-VAT')).toBeInTheDocument()
    expect(screen.getAllByText('Growth').length).toBeGreaterThan(0)
  })

  it('renders an em-dash for zero tier counts', () => {
    wrap()
    const dashes = screen.getAllByText('—')
    expect(dashes.length).toBeGreaterThan(0)
  })

  it('renders lastActive when present', () => {
    wrap()
    expect(screen.getByText('1h ago')).toBeInTheDocument()
    expect(screen.getByText('3h ago')).toBeInTheDocument()
  })

})
