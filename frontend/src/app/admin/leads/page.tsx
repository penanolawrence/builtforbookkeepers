'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getLeads, toggleLeadRead, type Lead } from '@/lib/api/admin/leads'
import { SummaryCard } from '@/components/shared/SummaryCard'
import { Breadcrumb } from '@/components/shared/Breadcrumb'

type Filter = 'all' | 'unread' | 'read'

export default function AdminLeadsPage() {
  const [filter, setFilter] = useState<Filter>('all')
  const [page, setPage]     = useState(1)
  const queryClient         = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ['admin-leads', { filter, page }],
    queryFn: () => getLeads({ filter, page }),
  })

  const { mutate: toggle } = useMutation({
    mutationFn: toggleLeadRead,
    onMutate: async (id: string) => {
      await queryClient.cancelQueries({ queryKey: ['admin-leads', { filter, page }] })
      const previous = queryClient.getQueryData(['admin-leads', { filter, page }])
      queryClient.setQueryData(['admin-leads', { filter, page }], (old: typeof data) => {
        if (!old) return old
        return {
          ...old,
          data: old.data.map((l: Lead) =>
            l.id === id ? { ...l, is_read: !l.is_read } : l
          ),
        }
      })
      return { previous }
    },
    onError: (_err, _id, ctx) => {
      if (ctx?.previous) {
        queryClient.setQueryData(['admin-leads', { filter, page }], ctx.previous)
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-leads'] })
    },
  })

  const leads      = data?.data ?? []
  const pagination = data?.pagination
  const total      = pagination?.total ?? 0
  const perPage    = pagination?.perPage ?? 10
  const currentPage = pagination?.currentPage ?? 1
  const totalPages = Math.max(1, Math.ceil(total / perPage))
  const from = total === 0 ? 0 : (currentPage - 1) * perPage + 1
  const to   = Math.min(currentPage * perPage, total)
  const unreadCount = leads.filter((l) => !l.is_read).length

  const pageNums = (() => {
    if (totalPages <= 5) return Array.from({ length: totalPages }, (_, i) => i + 1)
    if (currentPage <= 3) return [1, 2, 3, 4, 5]
    if (currentPage >= totalPages - 2) return [totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages]
    return [currentPage - 2, currentPage - 1, currentPage, currentPage + 1, currentPage + 2]
  })()

  const COLS = 'minmax(140px, 1.5fr) minmax(200px, 3fr) 120px 140px'
  const TABS: { label: string; value: Filter }[] = [
    { label: 'All',    value: 'all'    },
    { label: 'Unread', value: 'unread' },
    { label: 'Read',   value: 'read'   },
  ]

  return (
    <div className="max-w-[1280px] mx-auto px-9 py-7">
      <Breadcrumb crumbs={[{ label: 'Admin' }, { label: 'Leads' }]} />
      <div className="flex items-start justify-between mb-[22px]">
        <div>
          <h1
            className="text-[34px] font-bold tracking-[-0.025em] text-t-ink m-0"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            Leads
          </h1>
          <p className="text-[14.5px] text-t-muted mt-[5px]">
            {isLoading ? '…' : `${total} total leads`}
          </p>
        </div>
      </div>

      {!isLoading && (
        <div className="flex gap-[14px] mb-[22px]">
          <SummaryCard label="Total" value={String(total)}       subnote="all leads"    />
          <SummaryCard label="Unread" value={String(unreadCount)} subnote="not yet read" />
        </div>
      )}

      {/* Filter tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 20 }}>
        {TABS.map((tab) => (
          <button
            key={tab.value}
            onClick={() => { setFilter(tab.value); setPage(1) }}
            style={{
              padding: '6px 16px',
              borderRadius: 9999,
              fontSize: 13,
              fontWeight: 700,
              border: '1.5px solid',
              cursor: 'pointer',
              transition: 'all 0.12s',
              background:   filter === tab.value ? 'var(--t-primary)'      : 'var(--t-card)',
              color:        filter === tab.value ? '#fff'                   : 'var(--t-muted)',
              borderColor:  filter === tab.value ? 'var(--t-primary)'      : 'var(--t-line)',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Table card */}
      <div style={{ background: 'var(--t-card)', border: '1px solid var(--t-line)', borderRadius: 20, overflow: 'hidden', boxShadow: 'var(--t-shadow)' }}>
        {/* Card header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '18px 24px', borderBottom: '1px solid var(--t-line)' }}>
          <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} style={{ color: 'var(--t-primary)', flexShrink: 0 }}>
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
          <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 16, color: 'var(--t-ink)' }}>Lead Inquiries</span>
          <span style={{ background: 'var(--t-primary-soft)', color: 'var(--t-primary)', border: '1px solid var(--t-line)', borderRadius: 999, padding: '2px 9px', fontSize: 11.5, fontWeight: 800 }}>
            {total}
          </span>
        </div>

        {isLoading ? (
          <div style={{ padding: 32, textAlign: 'center', fontSize: 14, color: 'var(--t-faint)' }}>Loading…</div>
        ) : leads.length === 0 ? (
          <div style={{ padding: 32, textAlign: 'center', fontSize: 14, color: 'var(--t-faint)' }}>No leads found.</div>
        ) : (
          <>
            {/* Column headers */}
            <div style={{ display: 'grid', gridTemplateColumns: COLS, columnGap: 16, padding: '12px 24px', borderBottom: '1px solid var(--t-line)' }}>
              {(['Contact', 'Message', 'Received', ''] as const).map((label) => (
                <span key={label} style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.06em', color: 'var(--t-faint)' }}>
                  {label}
                </span>
              ))}
            </div>

            {/* Data rows */}
            {leads.map((lead, i) => {
              const isUnread = !lead.is_read
              const rowBg    = i % 2 === 1 ? 'var(--t-card-alt)' : 'transparent'

              return (
                <div
                  key={lead.id}
                  style={{
                    display: 'grid', gridTemplateColumns: COLS, columnGap: 16,
                    padding: '13px 24px', alignItems: 'center',
                    borderBottom: '1px solid var(--t-line-soft)',
                    background: rowBg,
                    boxShadow: isUnread ? 'inset 3px 0 0 var(--t-primary)' : 'inset 3px 0 0 transparent',
                  }}
                >
                  <span style={{ fontWeight: isUnread ? 700 : 500, fontSize: 13.5, color: 'var(--t-ink)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {lead.contact}
                  </span>
                  <span
                    title={lead.message ?? ''}
                    style={{ fontSize: 13.5, color: 'var(--t-muted)', fontWeight: 400, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                  >
                    {lead.message ?? <span style={{ color: 'var(--t-faint)', fontStyle: 'italic' }}>No message</span>}
                  </span>
                  <span style={{ fontSize: 12.5, color: 'var(--t-faint)', fontWeight: 500 }}>
                    {new Date(lead.created_at).toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: 'numeric' })}
                  </span>
                  <button
                    onClick={() => toggle(lead.id)}
                    style={{
                      padding: '5px 12px', borderRadius: 8, fontSize: 12.5, fontWeight: 700, cursor: 'pointer',
                      background: isUnread ? 'var(--t-primary-soft)' : 'var(--t-card-alt)',
                      color:      isUnread ? 'var(--t-primary)'      : 'var(--t-muted)',
                      border:     isUnread ? '1px solid var(--t-primary)' : '1px solid var(--t-line)',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {isUnread ? 'Mark as read' : 'Mark as unread'}
                  </button>
                </div>
              )
            })}

            {/* Footer — entry count + pagination */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 24px', borderTop: '2px solid var(--t-line)', background: 'var(--t-card-alt)' }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--t-muted)' }}>
                {from}–{to} of {total} leads
              </span>
              {totalPages > 1 && (
                <div style={{ display: 'flex', gap: 4 }}>
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    style={{ width: 28, height: 28, border: '1px solid var(--t-line)', borderRadius: 8, fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--t-card)', color: 'var(--t-muted)', cursor: 'pointer', opacity: currentPage === 1 ? 0.4 : 1 }}
                  >‹</button>
                  {pageNums.map((pg) => (
                    <button
                      key={pg}
                      onClick={() => setPage(pg)}
                      style={{
                        width: 28, height: 28, borderRadius: 8, fontSize: 13,
                        fontWeight: pg === currentPage ? 700 : 500,
                        display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
                        background:   pg === currentPage ? 'var(--t-primary)' : 'var(--t-card)',
                        color:        pg === currentPage ? '#fff'              : 'var(--t-muted)',
                        border:       pg === currentPage ? '1px solid var(--t-primary)' : '1px solid var(--t-line)',
                      }}
                    >{pg}</button>
                  ))}
                  {pageNums[pageNums.length - 1] < totalPages && (
                    <>
                      <span style={{ width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, color: 'var(--t-faint)' }}>…</span>
                      <button onClick={() => setPage(totalPages)} style={{ width: 28, height: 28, border: '1px solid var(--t-line)', borderRadius: 8, fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--t-card)', color: 'var(--t-muted)', cursor: 'pointer' }}>{totalPages}</button>
                    </>
                  )}
                  <button
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    style={{ width: 28, height: 28, border: '1px solid var(--t-line)', borderRadius: 8, fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--t-card)', color: 'var(--t-muted)', cursor: 'pointer', opacity: currentPage === totalPages ? 0.4 : 1 }}
                  >›</button>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
