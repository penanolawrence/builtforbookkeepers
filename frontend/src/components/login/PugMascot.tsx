'use client'

import { useState, useEffect, useRef } from 'react'

interface PugMascotProps {
  variant: 'sofia' | 'yoda'
  accent: string
  accentGlow: string
  peeking: boolean
  happy: boolean
  size?: number   // SVG width in px; height proportional (default 320 → 369)
}

function sparkle(x: number, y: number, color: string) {
  return (
    <path
      d={`M${x} ${y - 9} Q${x + 1.5} ${y - 1.5} ${x + 9} ${y} Q${x + 1.5} ${y + 1.5} ${x} ${y + 9} Q${x - 1.5} ${y + 1.5} ${x - 9} ${y} Q${x - 1.5} ${y - 1.5} ${x} ${y - 9} Z`}
      fill={color}
    />
  )
}

export default function PugMascot({
  variant = 'sofia',
  accent = '#8E7DF2',
  accentGlow = '#BAAEFB',
  peeking = false,
  happy = false,
  size = 320,
}: PugMascotProps) {
  const svgRef = useRef<SVGSVGElement>(null)
  const pupilsRef = useRef<SVGGElement>(null)
  const [blinking, setBlinking] = useState(false)

  const h = Math.round(size * (369 / 320))

  // Idle blink loop
  useEffect(() => {
    let t: ReturnType<typeof setTimeout>
    const loop = () => {
      const next = 2200 + Math.random() * 3600
      t = setTimeout(() => {
        setBlinking(true)
        setTimeout(() => setBlinking(false), 140)
        if (Math.random() < 0.3) {
          setTimeout(() => setBlinking(true), 260)
          setTimeout(() => setBlinking(false), 400)
        }
        loop()
      }, next)
    }
    loop()
    return () => clearTimeout(t)
  }, [])

  // Cursor-follow pupils (disabled when peeking)
  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      const svg = svgRef.current
      const pupils = pupilsRef.current
      if (!svg || !pupils || peeking) return
      const r = svg.getBoundingClientRect()
      const cx = r.left + r.width / 2
      const cy = r.top + r.height * 0.42
      const dx = (e.clientX - cx) / (window.innerWidth / 2)
      const dy = (e.clientY - cy) / (window.innerHeight / 2)
      const mx = Math.max(-1, Math.min(1, dx)) * 7
      const my = Math.max(-1, Math.min(1, dy)) * 5
      pupils.style.transform = `translate(${mx}px, ${my}px)`
    }
    window.addEventListener('mousemove', onMove)
    return () => window.removeEventListener('mousemove', onMove)
  }, [peeking])

  const isSofia = variant === 'sofia'
  const eyesClosed = blinking
  const tongueOut = !isSofia || happy  // Yoda always shows tongue; Sofia only when happy

  const P = {
    furHi: '#F4DCB8', fur: '#ECCBA1', furSh: '#D9B083',
    mask: '#3B3340', nose: '#2A242F',
  }
  const WHITE = '#fff'

  return (
    <svg
      ref={svgRef}
      className="pug-svg"
      viewBox="0 0 260 300"
      width={size}
      height={h}
      aria-label={`${isSofia ? 'Sofia' : 'Yoda'}, the AI pug`}
    >
      <defs>
        <radialGradient id="bellyG" cx="50%" cy="35%" r="70%">
          <stop offset="0%" stopColor={P.furHi} />
          <stop offset="100%" stopColor={P.fur} />
        </radialGradient>
        <radialGradient id="headG" cx="42%" cy="34%" r="75%">
          <stop offset="0%" stopColor={P.furHi} />
          <stop offset="100%" stopColor={P.fur} />
        </radialGradient>
        <radialGradient id="glowG" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor={accentGlow} stopOpacity="0.9" />
          <stop offset="100%" stopColor={accentGlow} stopOpacity="0" />
        </radialGradient>
      </defs>

      <ellipse cx="130" cy="288" rx="62" ry="11" fill="#000" opacity="0.13" />

      <g className="spark s1">{sparkle(34, 78, accentGlow)}</g>
      <g className="spark s2">{sparkle(222, 60, accentGlow)}</g>

      <g className="pug-breathe">
        {/* Ears */}
        <ellipse cx="58" cy="104" rx="21" ry="46" fill={P.mask} transform="rotate(-12 58 104)" className="ear earL" />
        <ellipse cx="202" cy="104" rx="21" ry="46" fill={P.mask} transform="rotate(12 202 104)" className="ear earR" />

        {/* Body */}
        <ellipse cx="130" cy="234" rx="64" ry="46" fill="url(#bellyG)" />
        <ellipse cx="100" cy="264" rx="19" ry="13" fill={P.fur} />
        <ellipse cx="160" cy="264" rx="19" ry="13" fill={P.fur} />
        <path d="M92 264 v8 M100 265 v9 M108 264 v8" stroke={P.furSh} strokeWidth="2" strokeLinecap="round" />
        <path d="M152 264 v8 M160 265 v9 M168 264 v8" stroke={P.furSh} strokeWidth="2" strokeLinecap="round" />

        {/* Collar — takes theme accent */}
        <path d="M74 196 Q130 220 186 196" fill="none" style={{ stroke: accent }} strokeWidth="12" strokeLinecap="round" />
        <circle cx="130" cy="214" r="7" style={{ fill: accentGlow }} stroke={WHITE} strokeWidth="1.5" />

        {/* Head */}
        <circle cx="130" cy="116" r="78" fill="url(#headG)" />
        <path d="M104 70 Q130 60 156 70" fill="none" stroke={P.furSh} strokeWidth="2.5" strokeLinecap="round" opacity="0.7" />
        <path d="M110 82 Q130 73 150 82" fill="none" stroke={P.furSh} strokeWidth="2.5" strokeLinecap="round" opacity="0.55" />

        {/* Muzzle */}
        <ellipse cx="130" cy="152" rx="50" ry="42" fill={P.mask} />

        {/* Eyes */}
        <ellipse cx="99" cy="112" rx="21" ry="23" fill={WHITE} />
        <ellipse cx="161" cy="112" rx="21" ry="23" fill={WHITE} />
        <g ref={pupilsRef} style={{ transition: 'transform 0.25s ease-out' }}>
          <circle cx="99" cy="114" r="11.5" fill={P.nose} />
          <circle cx="161" cy="114" r="11.5" fill={P.nose} />
          <circle cx="94" cy="108" r="4" fill={WHITE} />
          <circle cx="156" cy="108" r="4" fill={WHITE} />
        </g>
        {/* Blink lids */}
        <ellipse cx="99" cy="112" rx="22" ry="24" fill={P.fur}
          style={{ transformBox: 'fill-box', transformOrigin: 'center', transform: `scaleY(${eyesClosed ? 1 : 0})`, transition: 'transform 0.09s ease' }} />
        <ellipse cx="161" cy="112" rx="22" ry="24" fill={P.fur}
          style={{ transformBox: 'fill-box', transformOrigin: 'center', transform: `scaleY(${eyesClosed ? 1 : 0})`, transition: 'transform 0.09s ease' }} />

        {/* Nose + mouth */}
        <path d="M130 130 q14 4 11 15 q-3 8 -11 9 q-8 -1 -11 -9 q-3 -11 11 -15 Z" fill={P.nose} />
        <path d="M130 155 v9" stroke={P.nose} strokeWidth="2.5" strokeLinecap="round" />
        <path d="M130 164 q-12 9 -22 3 M130 164 q12 9 22 3" fill="none" stroke={P.nose} strokeWidth="2.5" strokeLinecap="round" />
        <ellipse cx="130" cy="178" rx="9" ry="12" fill="#F2748A"
          style={{ transformBox: 'fill-box', transformOrigin: 'top', transform: `scaleY(${tongueOut ? 1 : 0})`, transition: 'transform 0.2s ease' }} />
        {tongueOut && (
          <line x1="130" y1="170" x2="130" y2="184" stroke="#D85A72" strokeWidth="1.6" opacity="0.6" />
        )}

        {/* AI headset */}
        <path d="M64 96 Q130 34 196 96" fill="none" style={{ stroke: accent }} strokeWidth="8" strokeLinecap="round" />
        <circle cx="130" cy="40" r="9" fill="url(#glowG)" />
        <circle cx="130" cy="40" r="4.5" style={{ fill: accent }} className="antenna" />
        <circle cx="62" cy="104" r="13" style={{ fill: accent }} />
        <circle cx="62" cy="104" r="6" style={{ fill: accentGlow }} />
        <path d="M60 116 Q50 156 96 158" fill="none" style={{ stroke: accent }} strokeWidth="5" strokeLinecap="round" />
        <circle cx="98" cy="158" r="5" style={{ fill: accent }} />

        {/* Paws — cover eyes when peeking */}
        <g
          className="paws"
          style={{
            opacity: peeking ? 1 : 0,
            transform: peeking ? 'translateY(0)' : 'translateY(34px)',
            transition: 'transform 0.3s cubic-bezier(.34,1.4,.5,1), opacity 0.2s ease',
          }}
        >
          <ellipse cx="99" cy="116" rx="26" ry="22" fill={P.fur} />
          <ellipse cx="161" cy="116" rx="26" ry="22" fill={P.fur} />
          <path d="M88 116 v9 M99 118 v9 M110 116 v9" stroke={P.furSh} strokeWidth="2.2" strokeLinecap="round" />
          <path d="M150 116 v9 M161 118 v9 M172 116 v9" stroke={P.furSh} strokeWidth="2.2" strokeLinecap="round" />
        </g>
      </g>

      <g className="spark s3">{sparkle(206, 190, accentGlow)}</g>
      <g className="spark s4">{sparkle(40, 204, accentGlow)}</g>
    </svg>
  )
}
