'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Breadcrumb } from '@/components/shared/Breadcrumb'
import { Vat2550mTable } from '@/components/reports/Vat2550mTable'
import { Vat2550qTable } from '@/components/reports/Vat2550qTable'
import { VatSlsTable } from '@/components/reports/VatSlsTable'
import { VatSlpTable } from '@/components/reports/VatSlpTable'
import { downloadVatPdf } from '@/lib/api/reports'
import type { VatReportType } from '@/types/report'

interface Props {
  fetchClients?: () => Promise<{ id: string; name: string }[]>
  breadcrumbBase: { label: string; href: string }
}

const TABS: { value: VatReportType; label: string }[] = [
  { value: '2550m', label: '2550M' },
  { value: '2550q', label: '2550Q' },
  { value: 'sls',   label: 'SLS'   },
  { value: 'slp',   label: 'SLP'   },
]

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

function currentQuarter() {
  return Math.ceil((new Date().getMonth() + 1) / 3)
}

export function VatReportView({ fetchClients, breadcrumbBase }: Props) {
  const now = new Date()

  const [tab,        setTab]        = useState<VatReportType>('2550m')
  const [clientId,   setClientId]   = useState<string | undefined>()
  const [month,      setMonth]      = useState(now.getMonth() + 1)
  const [quarter,    setQuarter]    = useState(currentQuarter())
  const [year,       setYear]       = useState(now.getFullYear())
  const [loadedTabs, setLoadedTabs] = useState<Set<string>>(new Set())
  const [pdfLoading, setPdfLoading] = useState(false)
  const [pdfError,   setPdfError]   = useState<string | null>(null)

  const yearOptions = Array.from({ length: 5 }, (_, i) => now.getFullYear() - i)

  const { data: clients } = useQuery({
    queryKey: ['vat-report-clients'],
    queryFn:  () => fetchClients?.() ?? Promise.resolve([]),
    enabled:  !!fetchClients,
  })

  function handleTabChange(newTab: VatReportType) {
    setTab(newTab)
    setLoadedTabs(prev => { const s = new Set(prev); s.delete(newTab); return s })
    setPdfError(null)
  }

  function handleFilterChange() {
    setLoadedTabs(new Set())
    setPdfError(null)
  }

  function handleView() {
    setLoadedTabs(prev => new Set(prev).add(tab))
    setPdfError(null)
  }

  async function handleDownload() {
    setPdfLoading(true)
    setPdfError(null)
    try {
      await downloadVatPdf(tab, {
        clientId,
        month:   tab === '2550m' ? month   : undefined,
        quarter: tab !== '2550m' ? quarter : undefined,
        year,
      })
    } catch (e: any) {
      setPdfError(e?.response?.data?.message ?? 'Failed to generate PDF. Please try again.')
    } finally {
      setPdfLoading(false)
    }
  }

  const viewDisabled = !!fetchClients && !clientId
  const pdfDisabled  = !loadedTabs.has(tab) || pdfLoading

  const selectCls = 'h-10 pl-3.5 pr-9 rounded-[10px] border-[1.5px] border-t-line bg-t-surface text-[13.5px] font-semibold text-t-ink appearance-none'

  return (
    <div className="max-w-[1280px] mx-auto px-9 py-7">
      <Breadcrumb crumbs={[breadcrumbBase, { label: 'VAT Report' }]} />

      <div className="flex items-start justify-between mb-[22px]">
        <div>
          <h1
            className="text-[34px] font-bold tracking-[-0.025em] text-t-ink m-0"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            VAT Report
          </h1>
          <p className="text-[14.5px] text-t-muted mt-[5px]">
            BIR-compliant VAT returns and summary lists
          </p>
        </div>
      </div>

      {/* Toolbar */}
      <div
        className="flex items-center gap-2.5 mb-[22px] flex-wrap bg-t-card border border-t-line rounded-[14px] px-[18px] py-3.5"
        style={{ boxShadow: 'var(--t-shadow)' }}
      >
        {/* Tab switcher */}
        <div className="flex gap-0.5 bg-t-surface border border-t-line rounded-[10px] p-[3px]">
          {TABS.map((t) => (
            <button
              key={t.value}
              onClick={() => handleTabChange(t.value)}
              className="rounded-[8px] px-4 py-[7px] text-[13px] font-bold transition-all border-0 cursor-pointer"
              style={
                tab === t.value
                  ? { color: '#fff', background: 'linear-gradient(150deg, var(--t-primary), var(--t-primary-deep))' }
                  : { color: 'var(--t-muted)', background: 'transparent' }
              }
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="w-px h-7 bg-t-line mx-1" />

        {/* Client selector — admin/accountant only */}
        {fetchClients && clients && clients.length > 0 && (
          <select
            value={clientId ?? ''}
            onChange={(e) => { setClientId(e.target.value || undefined); handleFilterChange() }}
            className={selectCls}
          >
            <option value="">Select client…</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        )}

        {/* Month selector — 2550M only */}
        {tab === '2550m' && (
          <select
            value={month}
            onChange={(e) => { setMonth(Number(e.target.value)); handleFilterChange() }}
            className={selectCls}
          >
            {MONTHS.map((m, i) => (
              <option key={i + 1} value={i + 1}>{m}</option>
            ))}
          </select>
        )}

        {/* Quarter selector — 2550Q, SLS, SLP */}
        {tab !== '2550m' && (
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
        )}

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
            background:  'linear-gradient(150deg, var(--t-primary), var(--t-primary-deep))',
            boxShadow:   '0 12px 22px -12px var(--t-primary)',
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
      {loadedTabs.has(tab) ? (
        <div
          style={{
            background:   'var(--t-card)',
            border:       '1px solid var(--t-line)',
            borderRadius: 20,
            overflow:     'hidden',
            boxShadow:    'var(--t-shadow)',
          }}
        >
          {tab === '2550m' && (
            <Vat2550mTable clientId={clientId} month={month} year={year} />
          )}
          {tab === '2550q' && (
            <Vat2550qTable clientId={clientId} quarter={quarter} year={year} />
          )}
          {tab === 'sls' && (
            <VatSlsTable clientId={clientId} quarter={quarter} year={year} />
          )}
          {tab === 'slp' && (
            <VatSlpTable clientId={clientId} quarter={quarter} year={year} />
          )}
        </div>
      ) : (
        <div
          className="flex flex-col items-center justify-center py-20 text-center"
          style={{
            background:   'var(--t-card)',
            border:       '1px solid var(--t-line)',
            borderRadius: 20,
          }}
        >
          <p className="text-[14px] text-t-muted mb-4">
            Select a period and click <strong>View</strong> to generate the report.
          </p>
          <button
            onClick={handleView}
            disabled={viewDisabled}
            className="h-10 px-[18px] rounded-[10px] text-[13.5px] font-bold text-white disabled:opacity-40 border-0 cursor-pointer"
            style={{
              background: 'linear-gradient(150deg, var(--t-primary), var(--t-primary-deep))',
              boxShadow:  '0 12px 22px -12px var(--t-primary)',
            }}
          >
            Generate Report
          </button>
        </div>
      )}
    </div>
  )
}
