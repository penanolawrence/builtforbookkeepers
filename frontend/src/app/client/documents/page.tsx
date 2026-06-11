'use client'

import { useState, useEffect, useRef, Suspense } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useSearchParams, useRouter } from 'next/navigation'
import { getDocuments, reuploadDocument, cancelDocument } from '@/lib/api/documents'
import { DocumentsTable } from '@/components/documents/DocumentsTable'
import { DocumentDetailModal } from '@/components/documents/DocumentDetailModal'
import { EmptyState } from '@/components/shared/EmptyState'
import { useToast } from '@/hooks/use-toast'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { Breadcrumb } from '@/components/shared/Breadcrumb'
import { SummaryCard } from '@/components/shared/SummaryCard'
import { Download, X } from 'lucide-react'
import type { Document } from '@/types/document'
import { lastSevenDayRange } from './utils'

function DocumentsContent() {
  const router        = useRouter()
  const searchParams  = useSearchParams()
  const queryClient   = useQueryClient()
  const { toast }     = useToast()
  const [selectedDoc, setSelectedDoc] = useState<Document | null>(null)

  const status = searchParams.get('status') ?? ''
  const type   = searchParams.get('type')   ?? ''
  const start  = searchParams.get('start')  ?? ''
  const end    = searchParams.get('end')    ?? ''
  const page   = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10))

  const dateDefaultApplied = useRef(false)
  // Apply last-7-days defaults once on mount if no date params exist.
  useEffect(() => {
    if (dateDefaultApplied.current) return
    dateDefaultApplied.current = true
    const currentStart = searchParams.get('start')
    const currentEnd   = searchParams.get('end')
    if (currentStart || currentEnd) return
    const { start: s, end: e } = lastSevenDayRange()
    const params = new URLSearchParams(searchParams.toString())
    params.set('start', s)
    params.set('end', e)
    router.replace(`/client/documents?${params.toString()}`)
  }, [searchParams, router])

  const { data: pagedDocs, isLoading } = useQuery({
    queryKey: ['client-docs', status, type, start, end, page],
    queryFn:  () => getDocuments({
      status:   status || undefined,
      type:     type   || undefined,
      start:    start  || undefined,
      end:      end    || undefined,
      page,
      per_page: 10,
    }),
  })

  function setParam(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString())
    if (value) params.set(key, value)
    else params.delete(key)
    if (key !== 'page') params.set('page', '1')
    router.push(`/client/documents?${params.toString()}`)
  }

  function setPage(p: number) {
    const params = new URLSearchParams(searchParams.toString())
    params.set('page', String(p))
    router.push(`/client/documents?${params.toString()}`)
  }

  async function handleReupload(file: File) {
    if (!selectedDoc) return
    const docId = selectedDoc.id
    setSelectedDoc(null)
    try {
      await reuploadDocument(docId, file)
      queryClient.invalidateQueries({ queryKey: ['client-docs', status, type, start, end, page] })
      toast({ title: 'Re-uploaded — processing your document…' })
    } catch {
      toast({ title: 'Re-upload failed', description: 'Please try again.', variant: 'destructive' })
    }
  }

  async function handleCancel() {
    if (!selectedDoc) return
    const docId = selectedDoc.id
    setSelectedDoc(null)
    try {
      await cancelDocument(docId)
      queryClient.invalidateQueries({ queryKey: ['client-docs', status, type, start, end, page] })
      toast({ title: 'Document withdrawn.' })
    } catch {
      toast({ title: 'Could not withdraw document', description: 'Please try again.', variant: 'destructive' })
    }
  }

  const totalInflow  = pagedDocs?.totalInflow  ?? 0
  const totalOutflow = pagedDocs?.totalOutflow ?? 0
  const netFlow      = totalInflow - totalOutflow
  const inReview     = pagedDocs?.inReview ?? 0
  const totalEntries = pagedDocs?.total ?? 0

  function fmtCurrency(n: number) {
    return '₱' + n.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  }

  return (
    <div className="max-w-[1280px] mx-auto px-4 py-5 md:px-9 md:py-7">
      <Breadcrumb crumbs={[{ label: 'My Business', href: '/client' }, { label: 'Documents' }]} />

      {/* Page header */}
      <div className="flex items-start justify-between mb-[22px]">
        <div>
          <h1
            className="text-[34px] font-bold tracking-[-0.025em] text-t-ink m-0"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            Documents
          </h1>
          <p className="text-[14.5px] text-t-muted mt-[5px]">Your submitted documents</p>
        </div>
        <div className="flex gap-2.5 items-center mt-1">
          <button className="hidden md:flex items-center gap-2 border border-t-line rounded-[12px] px-4 py-2.5 text-[13.5px] font-semibold text-t-ink bg-t-card cursor-pointer">
            <Download className="h-4 w-4" /> Export
          </button>
          <button
            onClick={() => router.push('/client/upload')}
            className="flex items-center gap-2 rounded-[12px] px-5 py-3 text-[14px] font-bold text-white cursor-pointer"
            style={{
              background: 'linear-gradient(150deg, var(--t-primary), var(--t-primary-deep))',
              boxShadow: '0 12px 22px -12px var(--t-primary)',
            }}
          >
            + Add Entry
          </button>
        </div>
      </div>

      {/* Summary cards */}
      {!isLoading && (
        <div className="grid grid-cols-2 gap-3 md:flex md:gap-[14px] mb-[22px]">
          <SummaryCard
            label="Total Entries"
            value={String(totalEntries)}
            subnote={inReview > 0 ? `${inReview} in review` : 'all entries'}
          />
          <SummaryCard
            label="Total Inflow"
            value={fmtCurrency(totalInflow)}
            subnote="received"
            valueStyle={{ color: 'var(--t-tier-ready-fg)' }}
          />
          <SummaryCard
            label="Total Outflow"
            value={fmtCurrency(totalOutflow)}
            subnote="disbursed"
            valueStyle={{ color: 'var(--t-tier-review-fg)' }}
          />
          <SummaryCard
            label="Net Flow"
            value={fmtCurrency(Math.abs(netFlow))}
            subnote={netFlow >= 0 ? 'net positive' : 'net negative'}
            valueStyle={{ color: netFlow >= 0 ? 'var(--t-tier-ready-fg)' : 'var(--t-tier-review-fg)' }}
          />
        </div>
      )}

      {/* Filter bar */}
      <div className="mb-5 flex flex-col gap-2.5">
        {/* Row 1: Status + Type */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
          {/* Status */}
          <div className="relative">
            <Select value={status || 'all'} onValueChange={(v) => setParam('status', v === 'all' ? '' : v)}>
              <SelectTrigger className="h-10 w-full rounded-[11px] border-[1.5px] border-t-line bg-t-card text-[13.5px] font-semibold">
                <SelectValue placeholder="All Statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="PARKED">In Review</SelectItem>
                <SelectItem value="APPROVED">Approved</SelectItem>
                <SelectItem value="PROCESSING">Processing</SelectItem>
                <SelectItem value="RETURNED">Returned</SelectItem>
              </SelectContent>
            </Select>
            {status && (
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); setParam('status', '') }}
                className="absolute right-3 top-1/2 -translate-y-1/2 z-10 flex items-center justify-center bg-t-card text-t-faint hover:text-t-ink"
                aria-label="Clear status filter"
              >
                <X className="h-4 w-4 opacity-50" />
              </button>
            )}
          </div>
          {/* Type */}
          <div className="relative">
            <Select value={type || 'all'} onValueChange={(v) => setParam('type', v === 'all' ? '' : v)}>
              <SelectTrigger className="h-10 w-full rounded-[11px] border-[1.5px] border-t-line bg-t-card text-[13.5px] font-semibold">
                <SelectValue placeholder="All Types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="income">Income</SelectItem>
                <SelectItem value="expense">Expense</SelectItem>
              </SelectContent>
            </Select>
            {type && (
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); setParam('type', '') }}
                className="absolute right-3 top-1/2 -translate-y-1/2 z-10 flex items-center justify-center bg-t-card text-t-faint hover:text-t-ink"
                aria-label="Clear type filter"
              >
                <X className="h-4 w-4 opacity-50" />
              </button>
            )}
          </div>
        </div>
        {/* Row 2: Date range */}
        <div className="grid grid-cols-2 gap-2.5">
          <input
            type="date"
            value={start}
            onChange={(e) => setParam('start', e.target.value)}
            className="h-10 px-3 border-[1.5px] border-t-line rounded-[11px] text-[13.5px] font-semibold text-t-muted bg-t-card w-full"
          />
          <input
            type="date"
            value={end}
            onChange={(e) => setParam('end', e.target.value)}
            className="h-10 px-3 border-[1.5px] border-t-line rounded-[11px] text-[13.5px] font-semibold text-t-muted bg-t-card w-full"
          />
        </div>
      </div>

      {isLoading ? (
        <div className="p-12 text-center text-t-faint text-sm">Loading…</div>
      ) : totalEntries === 0 ? (
        <EmptyState message="No documents found." />
      ) : (
        <DocumentsTable
          docs={pagedDocs?.data ?? []}
          totalDocs={totalEntries}
          lastPage={pagedDocs?.lastPage ?? 1}
          perPage={pagedDocs?.perPage ?? 10}
          page={page}
          onPageChange={setPage}
          inReview={inReview}
          onRowClick={setSelectedDoc}
        />
      )}

      <DocumentDetailModal
        doc={selectedDoc}
        onClose={() => setSelectedDoc(null)}
        onReupload={handleReupload}
        onCancel={handleCancel}
      />
    </div>
  )
}

export default function DocumentsPage() {
  return (
    <Suspense>
      <DocumentsContent />
    </Suspense>
  )
}
