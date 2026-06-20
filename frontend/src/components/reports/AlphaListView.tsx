'use client'

import { useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { getAlphaList, downloadAlphaListCsv, downloadAlphaListPdf } from '@/lib/api/reports'
import { AlphaListTable } from '@/components/reports/AlphaListTable'
import { AlphaListEmptyState } from '@/components/reports/AlphaListEmptyState'
import { Breadcrumb } from '@/components/shared/Breadcrumb'
import type { ClientProfile } from '@/types/admin'

interface Props {
  clientId?: string
  fetchClients?: () => Promise<ClientProfile[]>
  breadcrumbBase?: { label: string; href: string }
}

export function AlphaListView({ clientId: initialClientId, fetchClients, breadcrumbBase }: Props) {
  const searchParams = useSearchParams()

  const [selectedClientId, setSelectedClientId] = useState<string | undefined>(initialClientId)
  const [start,     setStart]     = useState(searchParams.get('start') ?? '')
  const [end,       setEnd]       = useState(searchParams.get('end')   ?? '')
  const [generated, setGenerated] = useState(
    () => !!(searchParams.get('start') && searchParams.get('end'))
  )

  const [csvLoading, setCsvLoading] = useState(false)
  const [pdfLoading, setPdfLoading] = useState(false)

  const { data: clients } = useQuery({
    queryKey: ['alpha-list-clients'],
    queryFn:  () => fetchClients?.() ?? Promise.resolve([]),
    enabled:  !!fetchClients,
  })

  const { data, isLoading } = useQuery({
    queryKey: ['alpha-list', selectedClientId, start, end],
    queryFn:  () => getAlphaList({ clientId: selectedClientId, start, end }),
    enabled:  generated && !!start && !!end && (!fetchClients || !!selectedClientId),
  })

  function handleGenerate() {
    if (start && end) setGenerated(true)
  }

  function handleDateChange(field: 'start' | 'end', value: string) {
    if (field === 'start') setStart(value)
    else setEnd(value)
    setGenerated(false)
  }

  function handleClientChange(id: string) {
    setSelectedClientId(id || undefined)
    setGenerated(false)
  }

  async function handleCsv() {
    setCsvLoading(true)
    try { await downloadAlphaListCsv({ clientId: selectedClientId, start, end }) } finally { setCsvLoading(false) }
  }

  async function handlePdf() {
    setPdfLoading(true)
    try { await downloadAlphaListPdf({ clientId: selectedClientId, start, end }) } finally { setPdfLoading(false) }
  }

  const hasRows      = !!data?.rows.length
  const viewDisabled = !start || !end || (!!fetchClients && !selectedClientId)

  const exportBtnCls = 'h-10 px-4 rounded-[10px] text-[13px] font-semibold border border-t-line text-t-ink hover:bg-t-surface transition-colors disabled:opacity-40 disabled:cursor-not-allowed bg-t-card'

  return (
    <div className="max-w-[1280px] mx-auto px-9 py-7">
      <Breadcrumb
        crumbs={[
          breadcrumbBase ?? { label: 'Reports', href: '/client/reports' },
          { label: 'Alpha List (1604-E)' },
        ]}
      />

      <div className="flex items-start justify-between mb-[22px]">
        <h1
          className="text-[34px] font-bold tracking-[-0.025em] text-t-ink m-0"
          style={{ fontFamily: 'var(--font-display)' }}
        >
          Alpha List — 1604-E
        </h1>
      </div>

      {/* Toolbar */}
      <div
        className="flex items-center gap-2.5 mb-[22px] flex-wrap bg-t-card border border-t-line rounded-[14px] px-[18px] py-3.5"
        style={{ boxShadow: 'var(--t-shadow)' }}
      >
        {/* Client selector — accountant / admin only */}
        {fetchClients && clients && clients.length > 0 && (
          <>
            <select
              value={selectedClientId ?? ''}
              onChange={(e) => handleClientChange(e.target.value)}
              className="h-10 pl-3.5 pr-9 rounded-[10px] border-[1.5px] border-t-line bg-t-surface text-[13.5px] font-semibold text-t-ink appearance-none"
            >
              <option value="">Select client…</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
            <div className="w-px h-7 bg-t-line mx-1" />
          </>
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

        <button
          onClick={handleGenerate}
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

        <button
          onClick={handleCsv}
          disabled={csvLoading || isLoading || !hasRows || !generated}
          className={exportBtnCls}
        >
          {csvLoading ? 'Downloading…' : 'Export CSV'}
        </button>
        <button
          onClick={handlePdf}
          disabled={pdfLoading || isLoading || !hasRows || !generated}
          className={exportBtnCls}
        >
          {pdfLoading ? 'Downloading…' : 'Export PDF'}
        </button>
      </div>

      {!generated ? (
        <AlphaListEmptyState onGenerate={handleGenerate} disabled={viewDisabled} />
      ) : isLoading ? (
        <p className="text-sm text-t-muted">Loading…</p>
      ) : !hasRows ? (
        <div className="border-2 border-dashed border-t-line rounded-xl p-10 flex flex-col items-center text-center gap-3">
          <p className="text-base font-semibold text-t-ink">No alpha list entries found</p>
          <p className="text-sm text-t-muted">
            No expanded withholding tax transactions were found for the selected period.
          </p>
        </div>
      ) : (
        <div style={{ background: 'var(--t-card)', border: '1px solid var(--t-line)', borderRadius: 20, overflow: 'hidden', boxShadow: 'var(--t-shadow)' }}>
          <AlphaListTable rows={data!.rows} />
        </div>
      )}
    </div>
  )
}
