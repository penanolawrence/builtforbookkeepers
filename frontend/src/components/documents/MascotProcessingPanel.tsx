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

interface SparkPos {
  top?:   string
  left?:  string
  right?: string
  anim:   string
  dur:    number
  delay:  number
}

const SUCCESS_GREEN = '#3C8E6C'

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
        <SparkStar key={`${s.anim}-${s.delay}`} pos={s} color={i % 2 === 0 ? accentColor : accentGlow} />
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
  return (
    <div
      style={{
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        height: '100%', padding: '28px 32px',
        position: 'relative',
        background: `radial-gradient(circle at 50% 38%, ${SUCCESS_GREEN}12 0%, transparent 62%)`,
      }}
    >
      {DONE_SPARKS.map((s, i) => (
        <SparkStar key={`${s.anim}-${s.delay}`} pos={s} color={i % 2 === 0 ? SUCCESS_GREEN : '#6FD6A6'} />
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
            background: SUCCESS_GREEN, border: '3.5px solid #fff',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            animation: 'checkPop .45s cubic-bezier(.34,1.55,.5,1) .28s both',
            boxShadow: `0 5px 16px ${SUCCESS_GREEN}55`,
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
        <p style={{ fontSize: 18, fontWeight: 800, color: SUCCESS_GREEN, margin: '0 0 5px' }}>
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
  // Any non-processing stage (parked, read_failed, etc.) triggers the done panel.
  // The parent unmounts this component when doc.status leaves PROCESSING, so this is transient.
  const isDone     = !(stage in STAGE_TO_INDEX)

  const accentColor = 'var(--t-primary)'
  const accentGlow  = 'var(--t-primary-soft)'

  return isDone
    ? <MascotDonePanel accentColor={accentColor} accentGlow={accentGlow} />
    : <MascotWorkingPanel stageIndex={stageIndex} accentColor={accentColor} accentGlow={accentGlow} />
}
