'use client'

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import PugMascot from '@/components/login/PugMascot'
import type { TourStep } from './types'

interface TourOverlayProps {
  step: TourStep
  stepNumber: number
  totalSteps: number
  theme: 'sofia' | 'yoda'
  onNext: () => void
  onBack: () => void
  onSkip: () => void
  nextLabel?: string
}

const ACCENT: Record<'sofia' | 'yoda', { accent: string; accentGlow: string }> = {
  sofia: { accent: '#E2568C', accentGlow: '#FFADD2' },
  yoda:  { accent: '#7C9CFF', accentGlow: '#AFC4FF' },
}

function getTargetRect(targetId: string): DOMRect | null {
  const el = document.querySelector(`[data-tour="${targetId}"]`)
  return el ? el.getBoundingClientRect() : null
}

export function TourOverlay({ step, stepNumber, totalSteps, theme, onNext, onBack, onSkip, nextLabel }: TourOverlayProps) {
  const [rect, setRect] = useState<DOMRect | null>(null)
  const [mounted, setMounted] = useState(false)

  useEffect(() => setMounted(true), [])

  useEffect(() => {
    const update = () => setRect(getTargetRect(step.targetId))
    update()
    window.addEventListener('resize', update)
    window.addEventListener('scroll', update, true)
    return () => {
      window.removeEventListener('resize', update)
      window.removeEventListener('scroll', update, true)
    }
  }, [step.targetId])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onSkip()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onSkip])

  if (!mounted) return null

  const { accent, accentGlow } = ACCENT[theme]
  const name = theme === 'sofia' ? 'Sofia' : 'Yoda'
  const pad = 8
  const label = nextLabel ?? (stepNumber === totalSteps ? 'Finish' : 'Next')

  const spotlightStyle = rect
    ? {
        position: 'fixed' as const,
        top: rect.top - pad,
        left: rect.left - pad,
        width: rect.width + pad * 2,
        height: rect.height + pad * 2,
        borderRadius: 14,
        border: `2px solid ${accent}`,
        boxShadow: '0 0 0 9999px rgba(0,0,0,.55)',
        pointerEvents: 'none' as const,
        zIndex: 1001,
        transition: 'top .2s ease, left .2s ease, width .2s ease, height .2s ease',
      }
    : {
        position: 'fixed' as const,
        inset: 0,
        background: 'rgba(0,0,0,.55)',
        zIndex: 1001,
      }

  const tooltipMaxWidth = 340
  const estimatedTooltipHeight = 180
  const spaceBelow = rect ? window.innerHeight - rect.bottom : 0
  const shouldFlipAbove = rect
    ? spaceBelow < estimatedTooltipHeight + pad + 12 && rect.top > estimatedTooltipHeight + pad + 12
    : false
  const tooltipTop = rect
    ? shouldFlipAbove
      ? Math.max(16, rect.top - pad - 12 - estimatedTooltipHeight)
      : rect.bottom + pad + 12
    : '50%'
  const tooltipLeft = rect
    ? Math.min(Math.max(16, rect.left), window.innerWidth - tooltipMaxWidth - 16)
    : '50%'

  return createPortal(
    <>
      <div style={{ position: 'fixed', inset: 0, zIndex: 1000, pointerEvents: 'auto' }} />
      <div style={spotlightStyle} />
      <div
        role="dialog"
        aria-modal="true"
        style={{
          position: 'fixed',
          top: tooltipTop,
          left: tooltipLeft,
          maxWidth: tooltipMaxWidth,
          zIndex: 1002,
          background: 'var(--t-card)',
          border: '1px solid var(--t-line)',
          borderRadius: 16,
          padding: '16px 18px',
          boxShadow: 'var(--t-shadow)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
          <PugMascot variant={theme} accent={accent} accentGlow={accentGlow} size={36} />
          <span style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--t-primary)' }}>
            {name} · step {stepNumber} of {totalSteps}
          </span>
        </div>
        <h3 style={{ margin: '0 0 6px', fontFamily: 'var(--font-display)', fontSize: 16, color: 'var(--t-ink)' }}>
          {step.title}
        </h3>
        <p style={{ margin: '0 0 16px', fontSize: 13.5, color: 'var(--t-muted)', lineHeight: 1.5 }}>
          {step.body}
        </p>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <button
            onClick={onSkip}
            style={{ background: 'none', border: 0, cursor: 'pointer', color: 'var(--t-faint)', fontSize: 12.5, fontWeight: 600 }}
          >
            Skip tour
          </button>
          <div style={{ display: 'flex', gap: 8 }}>
            {stepNumber > 1 && (
              <button
                onClick={onBack}
                style={{ background: 'none', border: '1px solid var(--t-line)', borderRadius: 10, padding: '7px 14px', cursor: 'pointer', fontSize: 13, fontWeight: 600, color: 'var(--t-ink)' }}
              >
                Back
              </button>
            )}
            <button
              onClick={onNext}
              style={{ background: 'var(--t-primary)', border: 0, borderRadius: 10, padding: '7px 16px', cursor: 'pointer', fontSize: 13, fontWeight: 700, color: '#fff' }}
            >
              {label}
            </button>
          </div>
        </div>
      </div>
    </>,
    document.body
  )
}
