'use client'

import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { getAccounts } from '@/lib/api/accounts'
import { BIRBookTable } from '@/components/reports/BIRBookTable'
import { BIREmptyState } from '@/components/reports/BIREmptyState'
import { ExportPDFButton } from '@/components/reports/ExportPDFButton'
import { Breadcrumb } from '@/components/shared/Breadcrumb'
import type { ClientProfile } from '@/types/admin'

interface Props {
  fetchClients?: () => Promise<ClientProfile[]>
}

const BOOKS = [
  { value: 'crb', label: 'CRB' },
  { value: 'cdb', label: 'CDB' },
  { value: 'gj',  label: 'GJ'  },
  { value: 'gl',  label: 'GL'  },
]

export function BIRBooksView({ fetchClients }: Props) {
  const searchParams = useSearchParams()

  const initStart     = searchParams.get('start')     ?? ''
  const initEnd       = searchParams.get('end')       ?? ''
  const initBook      = searchParams.get('book')      ?? 'crb'
  const initAccountId = searchParams.get('accountId') ?? undefined

  const [clientId,    setClientId]    = useState<string | undefined>()
  const [book,        setBook]        = useState(initBook)
  const [start,       setStart]       = useState(initStart)
  const [end,         setEnd]         = useState(initEnd)
  const [accountId,   setAccountId]   = useState<string | undefined>(initAccountId)
  const [loadedBooks, setLoadedBooks] = useState<Set<string>>(() => {
    if (!initStart || !initEnd) return new Set()
    if (initBook === 'gl' && !initAccountId) return new Set()
    return new Set([initBook])
  })

  // Reset account and loaded state whenever the selected client changes
  useEffect(() => {
    setAccountId(undefined)
    setLoadedBooks(new Set())
  }, [clientId])

  const { data: clients } = useQuery({
    queryKey: ['bir-books-clients'],
    queryFn:  () => fetchClients?.() ?? Promise.resolve([]),
    enabled:  !!fetchClients,
  })

  const { data: accounts } = useQuery({
    queryKey: ['accounts', clientId],
    queryFn:  () => getAccounts(clientId),
    enabled:  book === 'gl' && (!fetchClients || !!clientId),
  })

  function handleTabChange(newBook: string) {
    setBook(newBook)
    if (newBook !== 'gl') setAccountId(undefined)
    // Remove GL from loaded set when leaving it — requires re-click on return
    setLoadedBooks(prev => { const s = new Set(prev); s.delete('gl'); return s })
  }

  function handleDateChange(field: 'start' | 'end', value: string) {
    if (field === 'start') setStart(value)
    else setEnd(value)
    setLoadedBooks(new Set())
  }

  const viewDisabled =
    (!!fetchClients && !clientId) ||
    (book === 'gl' && !accountId)

  return (
    <div className="max-w-[1280px] mx-auto px-9 py-7">
      <Breadcrumb crumbs={[{ label: 'Reports', href: '/client/reports' }, { label: 'BIR Books' }]} />
      <div className="flex items-start justify-between mb-[22px]">
        <div>
          <h1
            className="text-[34px] font-bold tracking-[-0.025em] text-t-ink m-0"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            BIR Books
          </h1>
          {!fetchClients && (
            <p className="text-[14.5px] text-t-muted mt-[5px]">
              For reference only — your accountant handles official submission
            </p>
          )}
        </div>
      </div>

      {/* Toolbar */}
      <div
        className="flex items-center gap-2.5 mb-[22px] flex-wrap bg-t-card border border-t-line rounded-[14px] px-[18px] py-3.5"
        style={{ boxShadow: 'var(--t-shadow)' }}
      >
        {/* Book tab switcher */}
        <div className="flex gap-0.5 bg-t-surface border border-t-line rounded-[10px] p-[3px]">
          {BOOKS.map((b) => (
            <button
              key={b.value}
              onClick={() => handleTabChange(b.value)}
              className="rounded-[8px] px-4 py-[7px] text-[13px] font-bold transition-all border-0 cursor-pointer"
              style={
                book === b.value
                  ? { color: '#fff', background: 'linear-gradient(150deg, var(--t-primary), var(--t-primary-deep))' }
                  : { color: 'var(--t-muted)', background: 'transparent' }
              }
            >
              {b.label}
            </button>
          ))}
        </div>

        <div className="w-px h-7 bg-t-line mx-1" />

        {/* Client selector — only for accountant view */}
        {fetchClients && clients && clients.length > 0 && (
          <select
            value={clientId ?? ''}
            onChange={(e) => setClientId(e.target.value || undefined)}
            className="h-10 pl-3.5 pr-9 rounded-[10px] border-[1.5px] border-t-line bg-t-surface text-[13.5px] font-semibold text-t-ink appearance-none"
          >
            <option value="">Select client…</option>
            {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        )}

        {/* Date range */}
        <input
          type="date"
          value={start}
          onChange={(e) => handleDateChange('start', e.target.value)}
          className="h-10 px-3 border-[1.5px] border-t-line rounded-[10px] text-[13.5px] font-semibold text-t-muted bg-t-surface"
        />
        <span className="text-t-faint text-sm">–</span>
        <input
          type="date"
          value={end}
          onChange={(e) => handleDateChange('end', e.target.value)}
          className="h-10 px-3 border-[1.5px] border-t-line rounded-[10px] text-[13.5px] font-semibold text-t-muted bg-t-surface"
        />

        {/* GL account picker — only when book === 'gl' */}
        {book === 'gl' && accounts && (
          <select
            value={accountId ?? ''}
            onChange={(e) => setAccountId(e.target.value || undefined)}
            className="h-10 pl-3.5 pr-9 rounded-[10px] border-[1.5px] border-t-line bg-t-surface text-[13.5px] font-semibold text-t-ink appearance-none"
          >
            <option value="">Select account…</option>
            {accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
          </select>
        )}

        {/* View button */}
        <button
          onClick={() => { if (!viewDisabled) setLoadedBooks(prev => new Set(prev).add(book)) }}
          disabled={viewDisabled}
          className="h-10 px-[18px] rounded-[10px] text-[13.5px] font-bold text-white disabled:opacity-40 border-0 cursor-pointer"
          style={{
            background: 'linear-gradient(150deg, var(--t-primary), var(--t-primary-deep))',
            boxShadow: '0 12px 22px -12px var(--t-primary)',
          }}
        >
          View
        </button>

        <div className="flex-1" />

        {/* Export PDF — keep the existing ExportPDFButton component */}
        <ExportPDFButton type={book} start={start} end={end} clientId={clientId} disabled={!loadedBooks.has(book)} accountId={accountId} />
      </div>

      {/* BIR book table */}
      {loadedBooks.has(book) ? (
        <div style={{ background: 'var(--t-card)', border: '1px solid var(--t-line)', borderRadius: 20, overflow: 'hidden', boxShadow: 'var(--t-shadow)' }}>
          <BIRBookTable
            book={book}
            clientId={clientId}
            start={start}
            end={end}
            accountId={accountId}
          />
        </div>
      ) : (
        <BIREmptyState
          book={book}
          onGenerate={() => setLoadedBooks(prev => new Set(prev).add(book))}
          disabled={viewDisabled}
        />
      )}
    </div>
  )
}
