'use client'

import PugMascot from '@/components/login/PugMascot'
import { useTheme } from '@/components/layout/ThemeProvider'

const ACCENTS = {
  sofia: { accent: '#E2568C', accentGlow: '#FFADD2' },
  yoda:  { accent: '#7C9CFF', accentGlow: '#AFC4FF' },
}

export function MascotBanner() {
  const { theme } = useTheme()
  const { accent, accentGlow } = ACCENTS[theme]
  const name = theme === 'sofia' ? 'Sofia' : 'Yoda'

  return (
    <section className="ld-section" aria-label={`Meet ${name}`}>
      <div className="ld-mascot-banner">
        <div aria-hidden="true">
          <PugMascot
            variant={theme}
            accent={accent}
            accentGlow={accentGlow}
            peeking={false}
            happy={false}
            size={100}
          />
        </div>
        <div>
          <p className="ld-mascot-banner__name">Meet {name} — your AI co-pilot</p>
          <p className="ld-mascot-banner__line">
            I sort your queue into Red / Yellow / Green, flag anomalies, and generate
            your BIR books the moment you&rsquo;re ready. You just review what matters.
          </p>
        </div>
      </div>
    </section>
  )
}
