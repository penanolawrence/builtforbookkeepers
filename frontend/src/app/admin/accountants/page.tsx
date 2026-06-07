'use client'

import { useState, type CSSProperties } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getAccountants, deactivateAccountant, resetAccountantPassword } from '@/lib/api/admin/accountants'
import type { Accountant } from '@/types/admin'
import { Breadcrumb } from '@/components/shared/Breadcrumb'
import { SummaryCard } from '@/components/shared/SummaryCard'
import { AccountantModal } from '@/components/admin/AccountantModal'

const STATUS_TIER: Record<string, string> = {
  ACTIVE:         'ready',
  INACTIVE:       'pending',
  PENDING_INVITE: 'check',
  SUSPENDED:      'review',
}
const STATUS_LABEL: Record<string, string> = {
  ACTIVE:         'Active',
  INACTIVE:       'Inactive',
  PENDING_INVITE: 'Pending Invite',
  SUSPENDED:      'Suspended',
}

function getInitials(name: string) {
  return name.split(' ').slice(0, 2).map((w) => w[0] ?? '').join('').toUpperCase()
}

function fmtDate(iso: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

interface DeactivateState {
  accountant: Accountant
  replacementId: string
}

type ModalState =
  | { mode: 'detail'; accountantId: string }
  | { mode: 'invite' }
  | null

export default function AdminAccountantsPage() {
  const qc = useQueryClient()

  const [modal, setModal]             = useState<ModalState>(null)
  const [deactivateModal, setDeactivateModal] = useState<Accountant | null>(null)
  const [replacementId, setReplacementId]     = useState('')
  const [toast, setToast]                     = useState<string | null>(null)
  const [hoveredId, setHoveredId]             = useState<string | null>(null)

  const { data, isLoading } = useQuery({ queryKey: ['accountants'], queryFn: getAccountants })

  const showToast = (msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(null), 3000)
  }

  const deactivateMut = useMutation({
    mutationFn: ({ accountant, replacementId }: DeactivateState) =>
      deactivateAccountant(accountant.id, replacementId || undefined),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['accountants'] })
      setDeactivateModal(null)
      setReplacementId('')
      showToast('Accountant deactivated.')
    },
  })

  const resendMut = useMutation({
    mutationFn: (id: string) => resetAccountantPassword(id),
    onSuccess: () => showToast('Invite resent.'),
  })

  const active    = (data ?? []).filter((a) => a.status === 'ACTIVE').length
  const pending   = (data ?? []).filter((a) => a.status === 'PENDING_INVITE').length
  const suspended = (data ?? []).filter((a) => a.status === 'SUSPENDED').length
  const replacementOptions = (data ?? []).filter(
    (a) => a.status === 'ACTIVE' && a.id !== deactivateModal?.id
  )

  return (
    <div className="max-w-[1280px] mx-auto px-9 py-7">
      {toast && <div className="fixed top-4 right-4 z-50 px-4 py-2.5 bg-gray-900 text-white text-xs font-medium rounded-lg shadow-lg">{toast}</div>}

      <Breadcrumb crumbs={[{ label: 'Admin' }, { label: 'Accountants' }]} />

      <div className="flex items-start justify-between mb-[22px]">
        <div>
          <h1 className="text-[34px] font-bold tracking-[-0.025em] text-t-ink m-0" style={{ fontFamily: 'var(--font-display)' }}>
            Accountants
          </h1>
          <p className="text-[14.5px] text-t-muted mt-[5px]">
            {isLoading ? '…' : `${active} active${pending > 0 ? ` · ${pending} pending invite` : ''}`}
          </p>
        </div>
        <button
          onClick={() => setModal({ mode: 'invite' })}
          className="flex items-center gap-2 rounded-[12px] px-5 py-3 text-[14px] font-bold text-white mt-1 cursor-pointer border-0"
          style={{
            background: 'linear-gradient(150deg, var(--t-primary), var(--t-primary-deep))',
            boxShadow: '0 12px 22px -12px var(--t-primary)',
          }}
        >
          + Invite Accountant
        </button>
      </div>

      {!isLoading && (
        <div className="flex gap-[14px] mb-[22px]">
          <SummaryCard label="Total" value={String((data ?? []).length)} subnote="all accountants" />
          <SummaryCard label="Active" value={String(active)} subnote="currently working" valueStyle={{ color: 'var(--t-tier-ready-fg)' }} />
          <SummaryCard label="Pending Invite" value={String(pending)} subnote="invite not accepted" valueStyle={{ color: 'var(--t-tier-check-fg)' }} />
          <SummaryCard label="Suspended" value={String(suspended)} subnote="access revoked" valueStyle={{ color: 'var(--t-tier-review-fg)' }} />
        </div>
      )}

      {/* Table card */}
      {(() => {
        const COLS = 'minmax(160px, 1.5fr) minmax(160px, 2fr) 120px 70px 110px 130px'

        const COL_HEADERS: { label: string; align: CSSProperties['textAlign']; color: string }[] = [
          { label: 'Name',    align: 'left',   color: 'var(--t-faint)' },
          { label: 'Email',   align: 'left',   color: 'var(--t-faint)' },
          { label: 'Status',  align: 'center', color: 'var(--t-faint)' },
          { label: 'Clients', align: 'right',  color: 'var(--t-faint)' },
          { label: 'Joined',  align: 'left',   color: 'var(--t-faint)' },
          { label: 'Actions', align: 'left',   color: 'var(--t-faint)' },
        ]

        const accountantList = (data ?? []) as Accountant[]

        return (
          <div style={{ background: 'var(--t-card)', border: '1px solid var(--t-line)', borderRadius: 20, overflow: 'hidden', boxShadow: 'var(--t-shadow)' }}>
            {/* Card header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '18px 24px', borderBottom: '1px solid var(--t-line)' }}>
              <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} style={{ color: 'var(--t-primary)', flexShrink: 0 }}>
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
                <path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
              </svg>
              <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 16, color: 'var(--t-ink)' }}>Accountants</span>
              <span style={{ background: 'var(--t-primary-soft)', color: 'var(--t-primary)', border: '1px solid var(--t-line)', borderRadius: 999, padding: '2px 9px', fontSize: 11.5, fontWeight: 800 }}>
                {accountantList.length}
              </span>
              {pending > 0 && (
                <span style={{ background: 'var(--t-tier-check-bg)', color: 'var(--t-tier-check-fg)', border: '1px solid var(--t-tier-check-ring)', borderRadius: 999, padding: '2px 9px', fontSize: 11.5, fontWeight: 800 }}>
                  {pending} pending invite
                </span>
              )}
            </div>

            {isLoading ? (
              <div style={{ padding: 32, textAlign: 'center', fontSize: 14, color: 'var(--t-faint)' }}>Loading…</div>
            ) : !accountantList.length ? (
              <div style={{ padding: 32, textAlign: 'center', fontSize: 14, color: 'var(--t-faint)' }}>No accountants yet.</div>
            ) : (
              <>
                {/* Column headers */}
                <div style={{ display: 'grid', gridTemplateColumns: COLS, columnGap: 16, padding: '12px 24px', borderBottom: '1px solid var(--t-line)' }}>
                  {COL_HEADERS.map(({ label, align, color }) => (
                    <span key={label} style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.06em', color, textAlign: align, overflow: 'hidden', whiteSpace: 'nowrap' }}>
                      {label}
                    </span>
                  ))}
                </div>

                {/* Data rows */}
                {accountantList.map((a, i) => {
                  const tier      = STATUS_TIER[a.status] ?? 'pending'
                  const label     = STATUS_LABEL[a.status] ?? a.status
                  const isPending = a.status === 'PENDING_INVITE'
                  const flagTier  = a.status === 'SUSPENDED' ? 'review' : isPending ? 'check' : null
                  const isHovered = hoveredId === a.id
                  const rowBg     = isHovered ? 'var(--t-primary-soft)' : i % 2 === 1 ? 'var(--t-card-alt)' : 'transparent'

                  return (
                    <div
                      key={a.id}
                      onClick={() => { if (!isPending) setModal({ mode: 'detail', accountantId: a.id }) }}
                      onMouseEnter={() => setHoveredId(a.id)}
                      onMouseLeave={() => setHoveredId(null)}
                      style={{
                        display: 'grid', gridTemplateColumns: COLS, columnGap: 16,
                        padding: '13px 24px', alignItems: 'center',
                        borderBottom: '1px solid var(--t-line-soft)',
                        cursor: !isPending ? 'pointer' : 'default',
                        transition: 'background 0.14s',
                        background: rowBg,
                        boxShadow: flagTier ? `inset 3px 0 0 var(--t-tier-${flagTier}-fg)` : 'inset 3px 0 0 transparent',
                      }}
                    >
                      {/* Name with avatar */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, overflow: 'hidden' }}>
                        <span style={{
                          width: 32, height: 32, borderRadius: 10, flexShrink: 0,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 11,
                          background: 'var(--t-primary-soft)', color: 'var(--t-primary)',
                          border: '1px solid var(--t-line)',
                        }}>
                          {getInitials(a.name)}
                        </span>
                        <span style={{ fontWeight: 700, fontSize: 13.5, color: 'var(--t-ink)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {a.name}
                        </span>
                      </div>

                      {/* Email */}
                      <span style={{ fontSize: 13.5, color: 'var(--t-muted)', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {a.email}
                      </span>

                      {/* Status chip */}
                      <div style={{ display: 'flex', justifyContent: 'center' }}>
                        <span style={{
                          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                          padding: '4px 12px', borderRadius: 999, fontSize: 12.5, fontWeight: 700, whiteSpace: 'nowrap',
                          background: `var(--t-tier-${tier}-bg)`,
                          color:      `var(--t-tier-${tier}-fg)`,
                          border:     `1px solid var(--t-tier-${tier}-ring)`,
                        }}>
                          {label}
                        </span>
                      </div>

                      {/* Clients count */}
                      <span style={{ textAlign: 'right', fontSize: 13.5, color: isPending ? 'var(--t-faint)' : 'var(--t-muted)', fontWeight: 500, fontVariantNumeric: 'tabular-nums' }}>
                        {isPending ? '—' : a.clientCount}
                      </span>

                      {/* Joined */}
                      <span style={{ fontSize: 13.5, color: 'var(--t-muted)', fontWeight: 500 }}>
                        {fmtDate(a.createdAt)}
                      </span>

                      {/* Actions */}
                      <div style={{ display: 'flex' }} onClick={(e) => e.stopPropagation()}>
                        {isPending ? (
                          <button
                            onClick={() => resendMut.mutate(a.id)}
                            disabled={resendMut.isPending}
                            style={{
                              fontSize: 12, fontWeight: 600, padding: '5px 12px', borderRadius: 8,
                              border: '1px solid var(--t-line)', background: 'var(--t-card)',
                              color: 'var(--t-muted)', cursor: 'pointer', opacity: resendMut.isPending ? 0.5 : 1,
                            }}
                          >
                            Resend Invite
                          </button>
                        ) : a.status === 'ACTIVE' ? (
                          <button
                            onClick={() => { setDeactivateModal(a); setReplacementId('') }}
                            style={{
                              fontSize: 12, fontWeight: 600, padding: '5px 12px', borderRadius: 8,
                              background: 'var(--t-tier-review-bg)', color: 'var(--t-tier-review-fg)',
                              border: '1px solid var(--t-tier-review-ring)', cursor: 'pointer',
                            }}
                          >
                            Deactivate
                          </button>
                        ) : null}
                      </div>
                    </div>
                  )
                })}

                {/* Footer */}
                <div style={{ padding: '14px 24px', borderTop: '2px solid var(--t-line)', background: 'var(--t-card-alt)' }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--t-muted)' }}>
                    {accountantList.length} {accountantList.length === 1 ? 'accountant' : 'accountants'}
                  </span>
                </div>
              </>
            )}
          </div>
        )
      })()}

      {/* Inline deactivate modal (Actions column quick-deactivate) */}
      {deactivateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/35">
          <div className="bg-t-card rounded-xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-t-line">
              <span className="text-[15px] font-bold text-t-ink">Deactivate Accountant</span>
              <button onClick={() => setDeactivateModal(null)} className="text-t-faint hover:text-t-muted text-lg leading-none">×</button>
            </div>
            <div className="p-5">
              <p className="text-sm text-t-muted mb-4">
                You are about to deactivate <strong>{deactivateModal.name}</strong>.
                {deactivateModal.clientCount > 0 && (
                  <> They currently have <strong>{deactivateModal.clientCount} client{deactivateModal.clientCount !== 1 ? 's' : ''}</strong>. Please select a replacement accountant.</>
                )}
              </p>
              {deactivateModal.clientCount > 0 && (
                <div className="mb-4">
                  <label className="block text-xs font-semibold text-t-muted mb-1.5">Replacement Accountant <span className="text-red-500">*</span></label>
                  <select
                    value={replacementId}
                    onChange={(e) => setReplacementId(e.target.value)}
                    className="w-full border border-t-line rounded-md px-2.5 py-2 text-sm text-t-ink bg-t-card"
                  >
                    <option value="">Select replacement…</option>
                    {replacementOptions.map((r) => (
                      <option key={r.id} value={r.id}>{r.name}</option>
                    ))}
                  </select>
                </div>
              )}
              {deactivateMut.isError && (
                <p className="text-xs text-red-600 mb-3">Failed to deactivate. Please try again.</p>
              )}
            </div>
            <div className="flex gap-2 justify-end px-5 py-3.5 border-t border-t-line">
              <button
                onClick={() => setDeactivateModal(null)}
                className="text-xs font-semibold px-3.5 py-2 border border-t-line rounded-md text-t-muted hover:bg-t-surface"
              >
                Cancel
              </button>
              <button
                onClick={() => deactivateMut.mutate({ accountant: deactivateModal, replacementId })}
                disabled={deactivateMut.isPending || (deactivateModal.clientCount > 0 && !replacementId)}
                className="text-xs font-semibold px-3.5 py-2 bg-red-600 hover:bg-red-700 text-white rounded-md disabled:opacity-50 transition-colors"
              >
                {deactivateMut.isPending ? 'Deactivating…' : 'Deactivate'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* AccountantModal — detail and invite */}
      {modal && (
        <AccountantModal
          {...modal}
          onClose={() => setModal(null)}
        />
      )}
    </div>
  )
}
