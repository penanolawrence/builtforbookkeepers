// frontend/src/components/queue/__tests__/SubtypeCombobox.test.tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { SubtypeCombobox } from '../SubtypeCombobox'
import { localCache } from '@/lib/localCache'

jest.mock('@/lib/api/subtypes', () => ({
  searchSubtypes: jest.fn().mockResolvedValue([{ id: 'server-1', name: 'Server Result' }]),
  createSubtype: jest.fn(),
}))

const { searchSubtypes, createSubtype } = jest.requireMock('@/lib/api/subtypes')

describe('SubtypeCombobox', () => {
  beforeEach(() => {
    localStorage.clear()
    jest.clearAllMocks()
  })

  it('shows no options when query is under 3 chars even if cache is populated', () => {
    localCache.set('subtypes', [{ id: '1', name: 'Internet' }], 60_000)
    render(<SubtypeCombobox subtypeId={null} subtypeName={null} onChange={jest.fn()} />)
    fireEvent.focus(screen.getByPlaceholderText('Subtype…'))
    fireEvent.change(screen.getByPlaceholderText('Subtype…'), { target: { value: 'In' } })
    expect(screen.queryByText('Internet')).not.toBeInTheDocument()
  })

  it('filters from cache without calling the API when cache is populated', () => {
    localCache.set('subtypes', [
      { id: '1', name: 'Internet' },
      { id: '2', name: 'Telephone' },
    ], 60_000)
    render(<SubtypeCombobox subtypeId={null} subtypeName={null} onChange={jest.fn()} />)
    fireEvent.focus(screen.getByPlaceholderText('Subtype…'))
    fireEvent.change(screen.getByPlaceholderText('Subtype…'), { target: { value: 'Int' } })
    expect(screen.getByText('Internet')).toBeInTheDocument()
    expect(screen.queryByText('Telephone')).not.toBeInTheDocument()
    expect(searchSubtypes).not.toHaveBeenCalled()
  })

  it('falls back to server search when cache is empty', async () => {
    // no cache set
    render(<SubtypeCombobox subtypeId={null} subtypeName={null} onChange={jest.fn()} />)
    fireEvent.focus(screen.getByPlaceholderText('Subtype…'))
    fireEvent.change(screen.getByPlaceholderText('Subtype…'), { target: { value: 'Ser' } })
    await waitFor(() => expect(screen.getByText('Server Result')).toBeInTheDocument())
    expect(searchSubtypes).toHaveBeenCalledWith('Ser')
  })

  it('writes new subtype to cache on create', async () => {
    createSubtype.mockResolvedValue({ id: '99', name: 'New Tag' })
    localCache.set('subtypes', [{ id: '1', name: 'Internet' }], 60_000)
    const onChange = jest.fn()
    render(<SubtypeCombobox subtypeId={null} subtypeName={null} onChange={onChange} />)
    fireEvent.focus(screen.getByPlaceholderText('Subtype…'))
    fireEvent.change(screen.getByPlaceholderText('Subtype…'), { target: { value: 'New Tag' } })
    fireEvent.mouseDown(screen.getByText(/Create:/))
    await waitFor(() => expect(onChange).toHaveBeenCalledWith('99', 'New Tag'))
    const cached = localCache.get<{ id: string; name: string }[]>('subtypes')
    expect(cached).toContainEqual({ id: '99', name: 'New Tag' })
  })
})
