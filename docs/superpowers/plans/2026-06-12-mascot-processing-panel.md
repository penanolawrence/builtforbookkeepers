# Mascot Processing Panel Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the static `PipelineSteps` step list in `DocumentDetailModal` with an animated pug mascot panel that bobs while processing and bounces to a "done" state when complete.

**Architecture:** A new `PugMascot` SVG component lives at `components/login/PugMascot.tsx` (reused across login, dashboard, and processing contexts). `MascotProcessingPanel` wraps it with processing-state logic by calling `useDocumentStatus` and mapping `stage → stageIndex | isDone`. The modal swaps `PipelineSteps` for `MascotProcessingPanel` with a one-line change.

**Tech Stack:** Next.js 14 App Router, TypeScript, React 18, Jest + @testing-library/react, CSS keyframes in globals.css

---

## File Map

| File | Action |
|---|---|
| `frontend/src/app/globals.css` | Modify — append 9 keyframe animations |
| `frontend/src/components/login/PugMascot.tsx` | **Create** — SVG mascot with blink, cursor-follow, peeking paws |
| `frontend/src/components/login/__tests__/PugMascot.test.tsx` | Already exists — make it pass |
| `frontend/src/components/documents/MascotProcessingPanel.tsx` | **Create** — working + done panel, owns stage→index logic |
| `frontend/src/components/documents/__tests__/MascotProcessingPanel.test.tsx` | **Create** — write tests first |
| `frontend/src/components/documents/DocumentDetailModal.tsx` | Modify — delete `PipelineSteps` + related helpers, add `MascotProcessingPanel` |

---

## Task 1: Add CSS keyframe animations

**Files:**
- Modify: `frontend/src/app/globals.css` (append after line 116)

- [ ] **Step 1: Append the 9 keyframes to the end of globals.css**

```css
/* ── Mascot processing panel animations ─────────────────────────────── */
@keyframes pugBob {
  0%,  100% { transform: translateY(0)    rotate(0deg);    }
  30%        { transform: translateY(-8px) rotate(-1.8deg); }
  65%        { transform: translateY(-4px) rotate(1.2deg);  }
}
@keyframes stageIn {
  from { opacity: 0; transform: translateY(7px); }
  to   { opacity: 1; transform: translateY(0);   }
}
@keyframes dotBounce {
  0%, 80%, 100% { transform: translateY(0);    opacity: .28; }
  40%            { transform: translateY(-8px); opacity: 1;   }
}
@keyframes sparkA {
  0%, 100% { transform: translate(0,    0)    scale(1);   opacity: .7; }
  50%       { transform: translate(4px, -11px) scale(1.3); opacity: 1;  }
}
@keyframes sparkB {
  0%, 100% { transform: translate(0,   0)    scale(.8);  opacity: .5; }
  50%       { transform: translate(-5px,-8px) scale(1.1); opacity: .9; }
}
@keyframes sparkC {
  0%, 100% { transform: translate(0,   0)    scale(1.1); opacity: .6; }
  50%       { transform: translate(3px,-13px) scale(1.4); opacity: 1;  }
}
@keyframes checkPop {
  0%   { transform: scale(0)    rotate(-20deg); }
  65%  { transform: scale(1.22) rotate(4deg);   }
  100% { transform: scale(1)    rotate(0deg);   }
}
@keyframes pugBounceIn {
  0%   { transform: scale(.86) translateY(10px);  }
  60%  { transform: scale(1.05) translateY(-4px); }
  100% { transform: scale(1)    translateY(0);    }
}
@keyframes scanBeam {
  0%   { top: -3px;  opacity: 0; }
  6%   {             opacity: 1; }
  94%  {             opacity: 1; }
  100% { top: 100%;  opacity: 0; }
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/app/globals.css
git commit -m "feat(mascot): add processing panel keyframe animations"
```

---

## Task 2: Create PugMascot component

A pre-written test already exists at `components/login/__tests__/PugMascot.test.tsx`. Run it first to confirm it fails (the file it imports doesn't exist), then implement the component to make it pass.

**Files:**
- Create: `frontend/src/components/login/PugMascot.tsx`
- Test: `frontend/src/components/login/__tests__/PugMascot.test.tsx` (already exists)

- [ ] **Step 1: Run the existing test to confirm it fails**

```bash
cd frontend && npx jest --testPathPattern "components/login/__tests__/PugMascot" --no-coverage
```

Expected: FAIL — `Cannot find module '../PugMascot'`

- [ ] **Step 2: Create the PugMascot component**

Create `frontend/src/components/login/PugMascot.tsx`:

```tsx
'use client'

import { useEffect, useRef, useState } from 'react'

interface PugMascotProps {
  variant?:    'sofia' | 'yoda'
  accent?:     string
  accentGlow?: string
  peeking?:    boolean
  happy?:      boolean
}

export default function PugMascot({
  variant    = 'sofia',
  accent     = 'var(--t-primary)',
  accentGlow = 'var(--t-primary-soft)',
  peeking    = false,
  happy      = false,
}: PugMascotProps) {
  const svgRef    = useRef<SVGSVGElement>(null)
  const pupilsRef = useRef<SVGGElement>(null)
  const [blinking, setBlinking] = useState(false)

  useEffect(() => {
    let t: ReturnType<typeof setTimeout>
    const loop = () => {
      const next = 2200 + Math.random() * 3600
      t = setTimeout(() => {
        setBlinking(true)
        setTimeout(() => setBlinking(false), 140)
        if (Math.random() < 0.3) {
          setTimeout(() => setBlinking(true),  260)
          setTimeout(() => setBlinking(false), 400)
        }
        loop()
      }, next)
    }
    loop()
    return () => clearTimeout(t)
  }, [])

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      const svg    = svgRef.current
      const pupils = pupilsRef.current
      if (!svg || !pupils || peeking) return
      const r  = svg.getBoundingClientRect()
      const cx = r.left + r.width  / 2
      const cy = r.top  + r.height * 0.42
      const dx = (e.clientX - cx) / (window.innerWidth  / 2)
      const dy = (e.clientY - cy) / (window.innerHeight / 2)
      const mx = Math.max(-1, Math.min(1, dx)) * 7
      const my = Math.max(-1, Math.min(1, dy)) * 5
      pupils.style.transform = `translate(${mx}px, ${my}px)`
    }
    window.addEventListener('mousemove', onMove)
    return () => window.removeEventListener('mousemove', onMove)
  }, [peeking])

  const isSofia    = variant === 'sofia'
  const eyesClosed = blinking
  const tongueOut  = !isSofia || happy

  const P     = { furHi: '#F4DCB8', fur: '#ECCBA1', furSh: '#D9B083', mask: '#3B3340', nose: '#2A242F' }
  const WHITE = '#fff'
  const label = variant === 'sofia' ? 'Sofia, the AI pug' : 'Yoda, the AI pug'

  return (
    <div style={{ position: 'relative', width: 190, height: 219, display: 'inline-block' }}>
      <svg
        ref={svgRef}
        viewBox="0 0 260 300"
        width="190"
        height="219"
        aria-label={label}
        xmlns="http://www.w3.org/2000/svg"
        style={{ display: 'block' }}
      >
        <defs>
          <radialGradient id="bellyG" cx="50%" cy="35%" r="70%">
            <stop offset="0%"   style={{ stopColor: P.furHi }} />
            <stop offset="100%" style={{ stopColor: P.fur   }} />
          </radialGradient>
          <radialGradient id="headG" cx="42%" cy="34%" r="75%">
            <stop offset="0%"   style={{ stopColor: P.furHi }} />
            <stop offset="100%" style={{ stopColor: P.fur   }} />
          </radialGradient>
          <radialGradient id="glowG" cx="50%" cy="50%" r="50%">
            <stop offset="0%"   style={{ stopColor: accentGlow, stopOpacity: 0.9 }} />
            <stop offset="100%" style={{ stopColor: accentGlow, stopOpacity: 0   }} />
          </radialGradient>
        </defs>

        {/* Shadow */}
        <ellipse cx="130" cy="288" rx="62" ry="11" fill="#000" opacity="0.13" />

        {/* Ears */}
        <ellipse cx="58"  cy="104" rx="21" ry="46" fill={P.mask} transform="rotate(-12 58 104)"  />
        <ellipse cx="202" cy="104" rx="21" ry="46" fill={P.mask} transform="rotate(12 202 104)"  />

        {/* Body */}
        <ellipse cx="130" cy="234" rx="64" ry="46" fill="url(#bellyG)" />
        <ellipse cx="100" cy="264" rx="19" ry="13" fill={P.fur} />
        <ellipse cx="160" cy="264" rx="19" ry="13" fill={P.fur} />
        <path d="M92 264 v8 M100 265 v9 M108 264 v8"   stroke={P.furSh} strokeWidth="2" strokeLinecap="round" />
        <path d="M152 264 v8 M160 265 v9 M168 264 v8"  stroke={P.furSh} strokeWidth="2" strokeLinecap="round" />

        {/* Collar */}
        <path d="M74 196 Q130 220 186 196" fill="none" style={{ stroke: accent }} strokeWidth="12" strokeLinecap="round" />
        <circle cx="130" cy="214" r="7" style={{ fill: accentGlow }} stroke={WHITE} strokeWidth="1.5" />

        {/* Head */}
        <circle cx="130" cy="116" r="78" fill="url(#headG)" />
        <path d="M104 70 Q130 60 156 70" fill="none" stroke={P.furSh} strokeWidth="2.5" strokeLinecap="round" opacity="0.7"  />
        <path d="M110 82 Q130 73 150 82" fill="none" stroke={P.furSh} strokeWidth="2.5" strokeLinecap="round" opacity="0.55" />

        {/* Face mask */}
        <ellipse cx="130" cy="152" rx="50" ry="42" fill={P.mask} />

        {/* Eyes */}
        <ellipse cx="99"  cy="112" rx="21" ry="23" fill={WHITE} />
        <ellipse cx="161" cy="112" rx="21" ry="23" fill={WHITE} />
        <g ref={pupilsRef} style={{ transition: 'transform 0.25s ease-out' }}>
          <circle cx="99"  cy="114" r="11.5" fill={P.nose} />
          <circle cx="161" cy="114" r="11.5" fill={P.nose} />
          <circle cx="94"  cy="108" r="4"    fill={WHITE}  />
          <circle cx="156" cy="108" r="4"    fill={WHITE}  />
        </g>
        {/* Blink eyelids */}
        <ellipse cx="99"  cy="112" rx="22" ry="24" fill={P.fur} style={{ transformBox: 'fill-box', transformOrigin: 'center', transform: `scaleY(${eyesClosed ? 1 : 0})`, transition: 'transform 0.09s ease' }} />
        <ellipse cx="161" cy="112" rx="22" ry="24" fill={P.fur} style={{ transformBox: 'fill-box', transformOrigin: 'center', transform: `scaleY(${eyesClosed ? 1 : 0})`, transition: 'transform 0.09s ease' }} />

        {/* Nose + mouth */}
        <path d="M130 130 q14 4 11 15 q-3 8 -11 9 q-8 -1 -11 -9 q-3 -11 11 -15 Z" fill={P.nose} />
        <path d="M130 155 v9" stroke={P.nose} strokeWidth="2.5" strokeLinecap="round" />
        <path d="M130 164 q-12 9 -22 3 M130 164 q12 9 22 3" fill="none" stroke={P.nose} strokeWidth="2.5" strokeLinecap="round" />

        {/* Tongue — visible for yoda variant or when happy=true */}
        <ellipse cx="130" cy="178" rx="9" ry="12" fill="#F2748A" style={{ transformBox: 'fill-box', transformOrigin: 'top', transform: `scaleY(${tongueOut ? 1 : 0})`, transition: 'transform 0.2s ease' }} />
        {tongueOut && <line x1="130" y1="170" x2="130" y2="184" stroke="#D85A72" strokeWidth="1.6" opacity="0.6" />}

        {/* Headset */}
        <path d="M64 96 Q130 34 196 96" fill="none" style={{ stroke: accent }} strokeWidth="8" strokeLinecap="round" />
        <circle cx="130" cy="40"  r="9"    fill="url(#glowG)"           />
        <circle cx="130" cy="40"  r="4.5"  style={{ fill: accent      }} />
        <circle cx="62"  cy="104" r="13"   style={{ fill: accent      }} />
        <circle cx="62"  cy="104" r="6"    style={{ fill: accentGlow  }} />
        <path   d="M60 116 Q50 156 96 158" fill="none" style={{ stroke: accent }} strokeWidth="5" strokeLinecap="round" />
        <circle cx="98"  cy="158" r="5"    style={{ fill: accent      }} />
      </svg>

      {/* Peeking paws overlay — covers eyes when peeking=true */}
      <div
        className="paws"
        style={{
          position: 'absolute', inset: 0,
          pointerEvents: 'none',
          opacity: peeking ? 1 : 0,
          transition: 'opacity 0.2s ease',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          paddingTop: 80,
        }}
      >
        <svg viewBox="0 0 100 40" width="100" height="40" aria-hidden>
          <ellipse cx="22" cy="20" rx="18" ry="14" fill={P.fur} />
          <ellipse cx="10" cy="10" rx="7"  ry="9"  fill={P.fur} />
          <ellipse cx="22" cy="8"  rx="7"  ry="9"  fill={P.fur} />
          <ellipse cx="34" cy="10" rx="7"  ry="9"  fill={P.fur} />
          <ellipse cx="78" cy="20" rx="18" ry="14" fill={P.fur} />
          <ellipse cx="66" cy="10" rx="7"  ry="9"  fill={P.fur} />
          <ellipse cx="78" cy="8"  rx="7"  ry="9"  fill={P.fur} />
          <ellipse cx="90" cy="10" rx="7"  ry="9"  fill={P.fur} />
        </svg>
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Run the PugMascot test — expect all 4 to pass**

```bash
cd frontend && npx jest --testPathPattern "components/login/__tests__/PugMascot" --no-coverage
```

Expected output:
```
PASS src/components/login/__tests__/PugMascot.test.tsx
  PugMascot
    ✓ renders with aria-label for sofia
    ✓ renders with aria-label for yoda
    ✓ paws are visible when peeking=true
    ✓ paws are hidden when peeking=false

Tests: 4 passed, 4 total
```

- [ ] **Step 4: Commit**

```bash
git add frontend/src/components/login/PugMascot.tsx
git commit -m "feat(mascot): add PugMascot SVG component with blink and cursor-follow"
```

---

## Task 3: Create MascotProcessingPanel

**Files:**
- Create: `frontend/src/components/documents/__tests__/MascotProcessingPanel.test.tsx`
- Create: `frontend/src/components/documents/MascotProcessingPanel.tsx`

- [ ] **Step 1: Write the failing tests**

Create `frontend/src/components/documents/__tests__/MascotProcessingPanel.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react'
import { MascotProcessingPanel } from '../MascotProcessingPanel'

// Avoid rendering the full SVG mascot in unit tests
jest.mock('@/components/login/PugMascot', () => ({
  __esModule: true,
  default: ({ happy }: { happy?: boolean }) => (
    <div data-testid="pug" data-happy={happy ? 'true' : 'false'} />
  ),
}))

// Mock useDocumentStatus so we control stage without WebSocket/API
jest.mock('@/lib/hooks/useDocumentStatus', () => ({
  useDocumentStatus: jest.fn(),
}))

import { useDocumentStatus } from '@/lib/hooks/useDocumentStatus'
const mockStatus = useDocumentStatus as jest.Mock

function renderPanel(stage: string) {
  mockStatus.mockReturnValue({ stage, status: 'processing', flag: null, label: stage })
  return render(<MascotProcessingPanel docId="doc-abc" />)
}

describe('MascotProcessingPanel — working state', () => {
  it('shows stage-0 message for uploading', () => {
    renderPanel('uploading')
    expect(screen.getByText('Scanning your document…')).toBeInTheDocument()
  })

  it('shows stage-0 message for preprocessing', () => {
    renderPanel('preprocessing')
    expect(screen.getByText('Scanning your document…')).toBeInTheDocument()
  })

  it('shows stage-1 message for ai', () => {
    renderPanel('ai')
    expect(screen.getByText('Reading through entries…')).toBeInTheDocument()
  })

  it('shows stage-2 message for anomaly_check', () => {
    renderPanel('anomaly_check')
    expect(screen.getByText('Running a quality check…')).toBeInTheDocument()
  })

  it('renders the pug mascot', () => {
    renderPanel('uploading')
    expect(screen.getByTestId('pug')).toBeInTheDocument()
  })
})

describe('MascotProcessingPanel — done state', () => {
  it('shows "All done!" when stage is parked', () => {
    renderPanel('parked')
    expect(screen.getByText('All done!')).toBeInTheDocument()
  })

  it('shows "All done!" when stage is read_failed', () => {
    renderPanel('read_failed')
    expect(screen.getByText('All done!')).toBeInTheDocument()
  })

  it('shows "All done!" for any unknown stage', () => {
    renderPanel('something_unexpected')
    expect(screen.getByText('All done!')).toBeInTheDocument()
  })

  it('shows the done subtitle', () => {
    renderPanel('parked')
    expect(screen.getByText('Your document is ready for review.')).toBeInTheDocument()
  })

  it('passes happy=true to PugMascot in done state', () => {
    renderPanel('parked')
    expect(screen.getByTestId('pug')).toHaveAttribute('data-happy', 'true')
  })
})
```

- [ ] **Step 2: Run the test to confirm it fails**

```bash
cd frontend && npx jest --testPathPattern "documents/__tests__/MascotProcessingPanel" --no-coverage
```

Expected: FAIL — `Cannot find module '../MascotProcessingPanel'`

- [ ] **Step 3: Create the MascotProcessingPanel component**

Create `frontend/src/components/documents/MascotProcessingPanel.tsx`:

```tsx
'use client'

import PugMascot from '@/components/login/PugMascot'
import { useDocumentStatus } from '@/lib/hooks/useDocumentStatus'

const STAGE_TO_INDEX: Record<string, number> = {
  uploading:     0,
  preprocessing: 0,
  ai:            1,
  anomaly_check: 2,
}

const STAGES = [
  { key: 'prepare',    msg: 'Scanning your document…',  sub: 'Sharpening the image for AI'  },
  { key: 'categorize', msg: 'Reading through entries…', sub: 'Mapping accounts and amounts' },
  { key: 'check',      msg: 'Running a quality check…', sub: 'Almost there!'                },
]

const WORK_SPARKS: SparkPos[] = [
  { top: '9%',  left:  '9%',  anim: 'sparkA', dur: 2.4, delay: 0   },
  { top: '6%',  right: '11%', anim: 'sparkB', dur: 2.9, delay: 0.7 },
  { top: '54%', right: '7%',  anim: 'sparkC', dur: 2.2, delay: 1.3 },
  { top: '57%', left:  '6%',  anim: 'sparkA', dur: 2.7, delay: 0.4 },
  { top: '30%', left:  '3%',  anim: 'sparkB', dur: 3.1, delay: 1.0 },
]

const DONE_SPARKS: SparkPos[] = [
  { top: '7%',  left:  '11%', anim: 'sparkA', dur: 2.3, delay: 0.1 },
  { top: '4%',  right: '13%', anim: 'sparkC', dur: 2.5, delay: 0.4 },
  { top: '52%', right: '7%',  anim: 'sparkB', dur: 2.1, delay: 0.8 },
  { top: '54%', left:  '7%',  anim: 'sparkA', dur: 2.8, delay: 0.2 },
  { top: '26%', left:  '3%',  anim: 'sparkC', dur: 2.6, delay: 1.1 },
  { top: '18%', right: '5%',  anim: 'sparkB', dur: 2.4, delay: 0.6 },
]

interface SparkPos {
  top?:   string
  left?:  string
  right?: string
  anim:   string
  dur:    number
  delay:  number
}

function SparkStar({ pos, color }: { pos: SparkPos; color: string }) {
  return (
    <div
      style={{
        position: 'absolute',
        top:   pos.top,
        left:  pos.left,
        right: pos.right,
        animation: `${pos.anim} ${pos.dur}s ease-in-out infinite`,
        animationDelay: `${pos.delay}s`,
        pointerEvents: 'none',
      }}
    >
      <svg viewBox="0 0 20 20" width="10" height="10" aria-hidden>
        <path d="M10 1 Q11.5 8.5 19 10 Q11.5 11.5 10 19 Q8.5 11.5 1 10 Q8.5 8.5 10 1 Z" fill={color} />
      </svg>
    </div>
  )
}

function PaperProp({ accentColor }: { accentColor: string }) {
  return (
    <div
      style={{
        width: 44, height: 56, borderRadius: 5,
        background: '#fff', border: '1.5px solid #ECE4D8',
        boxShadow: '0 3px 12px rgba(42,28,60,.10)',
        position: 'relative', overflow: 'hidden',
        flexShrink: 0, alignSelf: 'flex-end', marginBottom: 6,
      }}
    >
      {[0, 1, 2, 3, 4].map((i) => (
        <div
          key={i}
          style={{
            position: 'absolute', left: 7, right: 7,
            top: 10 + i * 8, height: 2, borderRadius: 1, background: '#ECE4D8',
          }}
        />
      ))}
      <div
        style={{
          position: 'absolute', left: 0, right: 0, height: 3, top: 0,
          background: `linear-gradient(90deg, transparent 0%, ${accentColor}99 50%, transparent 100%)`,
          animation: 'scanBeam 1.7s ease-in-out infinite',
        }}
      />
    </div>
  )
}

function MascotWorkingPanel({ stageIndex, accentColor, accentGlow }: {
  stageIndex:  number
  accentColor: string
  accentGlow:  string
}) {
  const stage = STAGES[stageIndex] ?? STAGES[0]
  return (
    <div
      style={{
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        height: '100%', padding: '28px 32px',
        position: 'relative',
        background: `radial-gradient(circle at 50% 38%, ${accentColor}11 0%, transparent 62%)`,
      }}
    >
      {WORK_SPARKS.map((s, i) => (
        <SparkStar key={i} pos={s} color={i % 2 === 0 ? accentColor : accentGlow} />
      ))}

      <div
        style={{
          display: 'flex', alignItems: 'flex-end', gap: 6,
          animation: 'pugBob 3.5s ease-in-out infinite',
          position: 'relative', zIndex: 1,
        }}
      >
        <PugMascot variant="sofia" accent={accentColor} accentGlow={accentGlow} />
        <PaperProp accentColor={accentColor} />
      </div>

      {/* key forces remount so stageIn re-runs on each stage change */}
      <div
        key={stage.key}
        style={{ textAlign: 'center', animation: 'stageIn .35s ease both', marginTop: 10, zIndex: 1 }}
      >
        <p style={{ fontSize: 15, fontWeight: 700, color: '#2A2433', margin: '0 0 3px' }}>
          {stage.msg}
        </p>
        <p style={{ fontSize: 12.5, color: '#8A8295', fontWeight: 500, margin: '0 0 16px' }}>
          {stage.sub}
        </p>
      </div>

      <div style={{ display: 'flex', gap: 7, zIndex: 1 }}>
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            style={{
              width: 7, height: 7, borderRadius: '50%',
              background: accentColor,
              animation: 'dotBounce 1.25s ease-in-out infinite',
              animationDelay: `${i * 0.19}s`,
            }}
          />
        ))}
      </div>
    </div>
  )
}

function MascotDonePanel({ accentColor, accentGlow }: {
  accentColor: string
  accentGlow:  string
}) {
  const green = '#3C8E6C'
  return (
    <div
      style={{
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        height: '100%', padding: '28px 32px',
        position: 'relative',
        background: `radial-gradient(circle at 50% 38%, ${green}12 0%, transparent 62%)`,
      }}
    >
      {DONE_SPARKS.map((s, i) => (
        <SparkStar key={i} pos={s} color={i % 2 === 0 ? green : '#6FD6A6'} />
      ))}

      <div
        style={{
          position: 'relative', display: 'inline-block', zIndex: 1,
          animation: 'pugBounceIn .52s cubic-bezier(.34,1.4,.5,1) both',
        }}
      >
        <PugMascot variant="sofia" accent={accentColor} accentGlow={accentGlow} happy />
        <div
          style={{
            position: 'absolute', top: 16, right: -8,
            width: 42, height: 42, borderRadius: '50%',
            background: green, border: '3.5px solid #fff',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            animation: 'checkPop .45s cubic-bezier(.34,1.55,.5,1) .28s both',
            boxShadow: `0 5px 16px ${green}55`,
            zIndex: 2,
          }}
        >
          <svg viewBox="0 0 20 20" width="20" height="20" fill="none"
            stroke="#fff" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M4 10.5l4 4.5 8.5-9" />
          </svg>
        </div>
      </div>

      <div style={{ textAlign: 'center', animation: 'stageIn .42s ease .38s both', zIndex: 1, marginTop: 8 }}>
        <p style={{ fontSize: 18, fontWeight: 800, color: green, margin: '0 0 5px' }}>
          All done!
        </p>
        <p style={{ fontSize: 13, color: '#8A8295', fontWeight: 500, margin: 0 }}>
          Your document is ready for review.
        </p>
      </div>
    </div>
  )
}

export function MascotProcessingPanel({ docId }: { docId: string }) {
  const { stage }  = useDocumentStatus(docId)
  const stageIndex = STAGE_TO_INDEX[stage] ?? 0
  const isDone     = !(stage in STAGE_TO_INDEX)

  const accentColor = 'var(--t-primary)'
  const accentGlow  = 'var(--t-primary-soft)'

  return isDone
    ? <MascotDonePanel accentColor={accentColor} accentGlow={accentGlow} />
    : <MascotWorkingPanel stageIndex={stageIndex} accentColor={accentColor} accentGlow={accentGlow} />
}
```

- [ ] **Step 4: Run the MascotProcessingPanel tests — expect all 10 to pass**

```bash
cd frontend && npx jest --testPathPattern "documents/__tests__/MascotProcessingPanel" --no-coverage
```

Expected output:
```
PASS src/components/documents/__tests__/MascotProcessingPanel.test.tsx
  MascotProcessingPanel — working state
    ✓ shows stage-0 message for uploading
    ✓ shows stage-0 message for preprocessing
    ✓ shows stage-1 message for ai
    ✓ shows stage-2 message for anomaly_check
    ✓ renders the pug mascot
  MascotProcessingPanel — done state
    ✓ shows "All done!" when stage is parked
    ✓ shows "All done!" when stage is read_failed
    ✓ shows "All done!" for any unknown stage
    ✓ shows the done subtitle
    ✓ passes happy=true to PugMascot in done state

Tests: 10 passed, 10 total
```

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/documents/MascotProcessingPanel.tsx \
        frontend/src/components/documents/__tests__/MascotProcessingPanel.test.tsx
git commit -m "feat(mascot): add MascotProcessingPanel with working and done states"
```

---

## Task 4: Wire MascotProcessingPanel into DocumentDetailModal

**Files:**
- Modify: `frontend/src/components/documents/DocumentDetailModal.tsx`

- [ ] **Step 1: Delete the now-replaced helpers in DocumentDetailModal.tsx**

Remove these from the top of the file (lines 12–27):

```tsx
// DELETE all of this:
const PIPELINE_STEPS = [
  { key: 'uploading',     label: 'Uploaded' },
  { key: 'preprocessing', label: 'Preparing image' },
  { key: 'ai',            label: 'Categorizing' },
  { key: 'anomaly_check', label: 'Checking for issues' },
]
const STEP_ORDER = PIPELINE_STEPS.map((s) => s.key)

function stepStatus(stepKey: string, currentStage: string): 'done' | 'active' | 'pending' {
  const si = STEP_ORDER.indexOf(stepKey)
  const ci = STEP_ORDER.indexOf(currentStage)
  if (ci === -1) return 'done'
  if (si < ci) return 'done'
  if (si === ci) return 'active'
  return 'pending'
}
```

- [ ] **Step 2: Delete the PipelineSteps component from DocumentDetailModal.tsx**

Remove the entire `PipelineSteps` function (lines 241–270):

```tsx
// DELETE all of this:
function PipelineSteps({ doc }: { doc: Document }) {
  const { stage } = useDocumentStatus(doc.id)
  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden">
      {PIPELINE_STEPS.map((step) => {
        const s = stepStatus(step.key, stage)
        return (
          <div key={step.key} className="flex items-center gap-3 px-4 py-3 border-b border-gray-100 last:border-b-0">
            {s === 'done'   && <span className="text-green-500 text-sm">✓</span>}
            {s === 'active' && <div className="w-3.5 h-3.5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />}
            {s === 'pending' && <div className="w-3.5 h-3.5 border-2 border-gray-200 rounded-full" />}
            <span className={cn('text-xs', s === 'done' ? 'text-gray-500' : s === 'active' ? 'text-indigo-600 font-semibold' : 'text-gray-300')}>
              {step.label}
            </span>
          </div>
        )
      })}
    </div>
  )
}
```

- [ ] **Step 3: Add the MascotProcessingPanel import**

At the top of `DocumentDetailModal.tsx`, add alongside the other imports:

```tsx
import { MascotProcessingPanel } from '@/components/documents/MascotProcessingPanel'
```

Also remove the `useDocumentStatus` import if it's now only used via PipelineSteps (check — it was imported at line 6 solely for PipelineSteps):

```tsx
// REMOVE this line:
import { useDocumentStatus } from '@/lib/hooks/useDocumentStatus'
```

- [ ] **Step 4: Replace the PipelineSteps render call**

Find this in the right panel (around line 392):

```tsx
{doc.status === 'PROCESSING' && (
  <PipelineSteps doc={doc} />
)}
```

Replace with:

```tsx
{doc.status === 'PROCESSING' && (
  <MascotProcessingPanel docId={doc.id} />
)}
```

- [ ] **Step 5: Run the full test suite to check for regressions**

```bash
cd frontend && npx jest --no-coverage
```

Expected: all previously-passing tests still pass, new tests pass. If `useDocumentStatus` is imported elsewhere in the file, TypeScript will catch it — remove only if truly unused.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/components/documents/DocumentDetailModal.tsx
git commit -m "feat(mascot): replace PipelineSteps with MascotProcessingPanel in DocumentDetailModal"
```

---

## Self-Review

**Spec coverage check:**
- ✓ Working state: bobbing pug + paper prop + scan beam + cycling messages + bouncing dots + sparkles + radial gradient
- ✓ Done state: bouncing pug (happy) + check badge + "All done!" copy + green sparkles + green radial gradient
- ✓ PugMascot props: variant, accent, accentGlow, happy, peeking
- ✓ Stage mapping: uploading/preprocessing → 0, ai → 1, anomaly_check → 2, parked/read_failed/* → isDone
- ✓ CSS variables via `style={{ fill }}` (not bare `fill` attribute) — BFBLogo pattern
- ✓ accentGlow uses `--t-primary-soft` (not `--t-primary-deep`)
- ✓ PugMascot at `components/login/PugMascot.tsx` (matches existing test imports)
- ✓ Old helpers deleted: PIPELINE_STEPS, STEP_ORDER, stepStatus, PipelineSteps
- ✓ PugMascot blink timer and cursor-follow implemented with cleanup

**Type consistency check:**
- `MascotProcessingPanel` exported as named export — matches import in DocumentDetailModal
- `PugMascot` exported as default — matches mock in MascotProcessingPanel.test.tsx (`__esModule: true, default: ...`)
- `useDocumentStatus` returns `{ stage, status, flag, label }` — only `stage` is destructured in MascotProcessingPanel ✓
