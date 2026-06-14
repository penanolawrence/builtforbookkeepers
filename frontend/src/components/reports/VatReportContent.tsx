'use client'

import { useState } from 'react'
import { Breadcrumb } from '@/components/shared/Breadcrumb'
import { downloadVatPdf } from '@/lib/api/reports'
import type { VatReportType } from '@/types/report'

interface Props {
  clientId?: string
  breadcrumbBase: { label: string; href: string }
}

const REPORT_TYPES: { value: VatReportType; label: string }[] = [
  { value: '2550m', label: '2550M — Monthly Return' },
  { value: '2550q', label: '2550Q — Quarterly Return' },
  { value: 'sls',   label: 'Summary List of Sales' },
  { value: 'slp',   label: 'Summary List of Purchases' },
]

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

function currentQuarter() {
  return Math.ceil((new Date().getMonth() + 1) / 3)
}

export function VatReportContent({ clientId, breadcrumbBase }: Props) {
  const now  = new Date()
  const [type,    setType]    = useState<VatReportType>('2550m')
  const [month,   setMonth]   = useState(now.getMonth() + 1)
  const [quarter, setQuarter] = useState(currentQuarter())
  const [year,    setYear]    = useState(now.getFullYear())
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState<string | null>(null)

  const isMonthly = type === '2550m'

  const yearOptions = Array.from({ length: 5 }, (_, i) => now.getFullYear() - i)

  async function handleDownload() {
    setLoading(true)
    setError(null)
    try {
      await downloadVatPdf(type, {
        clientId,
        year,
        month:   isMonthly ? month   : undefined,
        quarter: isMonthly ? undefined : quarter,
      })
    } catch (e: any) {
      const msg = e?.response?.data?.message ?? 'Failed to generate PDF. Please try again.'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  const inputCls = 'border border-t-line rounded-md px-2.5 py-1.5 text-xs text-t-ink bg-t-card'
  const labelCls = 'text-[10px] font-bold uppercase tracking-wide text-t-muted mb-1 block'

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
          <p className="text-[14.5px] text-t-muted mt-[5px]">BIR-compliant VAT returns and summary lists</p>
        </div>
      </div>

      <div className="bg-t-card border border-t-line rounded-2xl p-6 max-w-md">
        <div className="space-y-4">
          <div>
            <label className={labelCls}>Report Type</label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as VatReportType)}
              className={`${inputCls} w-full`}
            >
              {REPORT_TYPES.map((r) => (
                <option key={r.value} value={r.value}>{r.label}</option>
              ))}
            </select>
          </div>

          <div className="flex gap-3">
            {isMonthly ? (
              <div className="flex-1">
                <label className={labelCls}>Month</label>
                <select
                  value={month}
                  onChange={(e) => setMonth(Number(e.target.value))}
                  className={`${inputCls} w-full`}
                >
                  {MONTHS.map((m, i) => (
                    <option key={i + 1} value={i + 1}>{m}</option>
                  ))}
                </select>
              </div>
            ) : (
              <div className="flex-1">
                <label className={labelCls}>Quarter</label>
                <select
                  value={quarter}
                  onChange={(e) => setQuarter(Number(e.target.value))}
                  className={`${inputCls} w-full`}
                >
                  <option value={1}>Q1 (Jan–Mar)</option>
                  <option value={2}>Q2 (Apr–Jun)</option>
                  <option value={3}>Q3 (Jul–Sep)</option>
                  <option value={4}>Q4 (Oct–Dec)</option>
                </select>
              </div>
            )}

            <div className="flex-1">
              <label className={labelCls}>Year</label>
              <select
                value={year}
                onChange={(e) => setYear(Number(e.target.value))}
                className={`${inputCls} w-full`}
              >
                {yearOptions.map((y) => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>
          </div>

          {error && (
            <p className="text-xs text-red-500">{error}</p>
          )}

          <button
            onClick={handleDownload}
            disabled={loading}
            className="w-full bg-t-primary text-white text-xs font-semibold px-4 py-2.5 rounded-md hover:bg-t-primary-deep transition-colors disabled:opacity-50"
          >
            {loading ? 'Generating PDF…' : 'Download PDF'}
          </button>
        </div>
      </div>
    </div>
  )
}
