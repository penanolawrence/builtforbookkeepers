import './BFBLogo.css'

interface BFBLogoProps {
  variant?: 'default' | 'pink'
  layout?: 'horizontal' | 'vertical' | 'icon-only'
  size?: number
  showTagline?: boolean
  className?: string
}

export function BFBLogo({
  variant = 'default',
  layout = 'horizontal',
  size = 60,
  showTagline = true,
  className = '',
}: BFBLogoProps) {
  return (
    <div
      className={[
        'bfb-logo',
        `bfb-logo--${layout}`,
        variant === 'pink' ? 'bfb-logo--pink' : '',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <BFBIcon variant={variant} size={size} />

      {layout !== 'icon-only' && (
        <div className="bfb-logo__wordmark py-2">
          <span className="bfb-logo__sup">Built for</span>
          <span className="bfb-logo__name">Bookkeepers</span>
          {showTagline && (
            <div className="bfb-logo__tagline">
              <span className="bfb-logo__rule" />
              <span className="bfb-logo__tagline-text">Powered by AI</span>
              <span className="bfb-logo__star" aria-hidden="true">✦</span>
              <span className="bfb-logo__rule" />
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export function BFBIcon({
  variant = 'default',
  size = 60,
  className = '',
}: {
  variant?: 'default' | 'pink'
  size?: number
  className?: string
}) {
  const isPink = variant === 'pink'
  const radius = Math.round(size * 0.22)

  const accentFill = isPink ? '#C53C76' : 'var(--t-primary)'

  return (
    <div
      className={className}
      style={{
        width: size,
        height: size,
        borderRadius: radius,
        flexShrink: 0,
        background: isPink
          ? 'rgba(255,255,255,0.22)'
          : 'linear-gradient(135deg, var(--t-primary), var(--t-primary-deep))',
      }}
    >
      <svg
        width={size}
        height={size}
        viewBox="0 0 100 100"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden
        focusable="false"
        style={{ display: 'block' }}
      >
        {/* Document */}
        <path
          d="M20,12 L58,12 L72,26 L72,86 Q72,92 66,92 L20,92 Q14,92 14,86 L14,18 Q14,12 20,12 Z"
          fill={isPink ? 'rgba(255,255,255,0.92)' : 'rgba(255,255,255,0.94)'}
        />
        <path
          d="M58,12 L72,26 L58,26 Z"
          fill="rgba(0,0,0,0.12)"
        />

        {/* ₱ symbol */}
        <text
          x="43"
          y="47"
          fontFamily="'Plus Jakarta Sans', system-ui, sans-serif"
          fontWeight="800"
          fontSize="20"
          style={{ fill: accentFill }}
          opacity="0.75"
          textAnchor="middle"
        >
          ₱
        </text>

        {/* Data rows */}
        <rect x="21" y="55" width="36" height="3"   rx="1.5" style={{ fill: accentFill }} opacity="0.22" />
        <rect x="21" y="61" width="28" height="3"   rx="1.5" style={{ fill: accentFill }} opacity="0.18" />
        <rect x="21" y="69" width="36" height="4.5" rx="2.25" style={{ fill: accentFill }} opacity="0.55" />
        <rect x="21" y="75.5" width="36" height="3" rx="1.5"  style={{ fill: accentFill }} opacity="0.28" />

        {/* Sparkle */}
        <path
          d="M82,16 L83.4,20.6 L88,22 L83.4,23.4 L82,28 L80.6,23.4 L76,22 L80.6,20.6 Z"
          fill="white"
        />
      </svg>
    </div>
  )
}

export default BFBLogo
