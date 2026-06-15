'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Breadcrumb } from '@/components/shared/Breadcrumb'
import { NonVat2551qTable } from '@/components/reports/NonVat2551qTable'
import { NonVatEmptyState } from '@/components/reports/NonVatEmptyState'
import { downloadNonVatPdf } from '@/lib/api/reports'

interface Props {
  fetchClients?: () => Promise<{ id: string; name: string }[]>
  breadcrumbBase: { label: string; href: string }
}

function currentQuarter() {
  return Math.ceil((new Date().getMonth() + 1) / 3)
}

export function NonVatReportView({ fetchClients, breadcrumbBase }: Props) {
  const now = new Date()

  const [clientId,   setClientId]   = useState<string | undefined>()
  const [quarter,    setQuarter]    = useState(currentQuarter())
  const [year,       setYear]       = useState(now.getFullYear())
  const [loaded,     setLoaded]     = useState(false)
  const [pdfLoading, setPdfLoading] = useState(false)
  const [pdfError,   setPdfError]   = useState<string | null>(null)

  const yearOptions = Array.from({ length: 5 }, (_, i) => now.getFullYear() - i)

  const { data: clients } = useQuery({
    queryKey: ['non-vat-report-clients'],
    queryFn:  () => fetchClients?.() ?? Promise.resolve([]),
    enabled:  !!fetchClients,
  })

  function handleFilterChange() {
    setLoaded(false)
    setPdfError(null)
  }

  function handleView() {
    setLoaded(true)
    setPdfError(null)
  }

  async function handleDownload() {
    setPdfLoading(true)
    setPdfError(null)
    try {
      await downloadNonVatPdf({ clientId, quarter, year })
    } catch (e: any) {
      setPdfError(e?.response?.data?.message ?? 'Failed to generate PDF. Please try again.')
    } finally {
      setPdfLoading(false)
    }
  }

  const viewDisabled = !!fetchClients && !clientId
  const pdfDisabled  = !loaded || pdfLoading

  const selectCls = 'h-10 pl-3.5 pr-9 rounded-[10px] border-[1.5px] border-t-line bg-t-surface text-[13.5px] font-semibold text-t-ink appearance-none'

  return (
    <div className="max-w-[1280px] mx-auto px-9 py-7">
      <Breadcrumb crumbs={[breadcrumbBase, { label: 'Non-VAT Report' }]} />

      <div className="flex items-start justify-between mb-[22px]">
        <div>
          <h1
            className="text-[34px] font-bold tracking-[-0.025em] text-t-ink m-0"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            Non-VAT Report
          </h1>
          <p className="text-[14.5px] text-t-muted mt-[5px]">
            BIR Quarterly Percentage Tax (2551Q)
          </p>
        </div>
      </div>

      {/* Toolbar */}
      <div
        className="flex items-center gap-2.5 mb-[22px] flex-wrap bg-t-card border border-t-line rounded-[14px] px-[18px] py-3.5"
        style={{ boxShadow: 'var(--t-shadow)' }}
      >
        {/* Static single tab indicator */}
        <div className="flex gap-0.5 bg-t-surface border border-t-line rounded-[10px] p-[3px]">
          <button
            className="rounded-[8px] px-4 py-[7px] text-[13px] font-bold border-0 cursor-default"
            style={{ color: '#fff', background: 'linear-gradient(150deg, var(--t-primary), var(--t-primary-deep))' }}
          >
            2551Q
          </button>
        </div>

        <div className="w-px h-7 bg-t-line mx-1" />

        {/* Client selector — admin/accountant only */}
        {fetchClients && (
          <select
            value={clientId ?? ''}
            onChange={(e) => { setClientId(e.target.value || undefined); handleFilterChange() }}
            className={selectCls}
            disabled={!clients || clients.length === 0}
          >
            {!clients ? (
              <option value="">Loading clients…</option>
            ) : clients.length === 0 ? (
              <option value="">No non-VAT clients found</option>
            ) : (
              <>
                <option value="">Select client…</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </>
            )}
          </select>
        )}

        {/* Quarter selector */}
        <select
          value={quarter}
          onChange={(e) => { setQuarter(Number(e.target.value)); handleFilterChange() }}
          className={selectCls}
        >
          <option value={1}>Q1 (Jan–Mar)</option>
          <option value={2}>Q2 (Apr–Jun)</option>
          <option value={3}>Q3 (Jul–Sep)</option>
          <option value={4}>Q4 (Oct–Dec)</option>
        </select>

        {/* Year selector */}
        <select
          value={year}
          onChange={(e) => { setYear(Number(e.target.value)); handleFilterChange() }}
          className={selectCls}
        >
          {yearOptions.map((y) => (
            <option key={y} value={y}>{y}</option>
          ))}
        </select>

        {/* View button */}
        <button
          onClick={handleView}
          disabled={viewDisabled}
          className="h-10 px-[18px] rounded-[10px] text-[13.5px] font-bold text-white disabled:opacity-40 border-0 cursor-pointer"
          style={{
            background: 'linear-gradient(150deg, var(--t-primary), var(--t-primary-deep))',
            boxShadow:  '0 12px 22px -12px var(--t-primary)',
          }}
        >
          View
        </button>

        <div className="flex-1" />

        {/* Download PDF */}
        <button
          onClick={handleDownload}
          disabled={pdfDisabled}
          className="h-10 px-[18px] rounded-[10px] text-[13.5px] font-bold border-[1.5px] border-t-line bg-t-surface text-t-ink disabled:opacity-40 cursor-pointer hover:bg-t-card transition-colors"
        >
          {pdfLoading ? 'Generating…' : 'Download PDF'}
        </button>
      </div>

      {pdfError && (
        <p className="text-xs text-red-500 mb-4">{pdfError}</p>
      )}

      {/* Report content */}
      {loaded ? (
        <div
          style={{
            background:   'var(--t-card)',
            border:       '1px solid var(--t-line)',
            borderRadius: 20,
            overflow:     'hidden',
            boxShadow:    'var(--t-shadow)',
          }}
        >
          <NonVat2551qTable clientId={clientId} quarter={quarter} year={year} />
        </div>
      ) : (
        <NonVatEmptyState onGenerate={handleView} disabled={viewDisabled} />
      )}
    </div>
  )
}
