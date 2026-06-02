# Login Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Recreate the Sofia Books login page to match the design handoff — two-pane split layout with animated PugMascot, Sofia/Yoda theme toggle, and real auth wiring.

**Architecture:** Four files change: `layout.tsx` gains Google Font imports, `auth.css` gains a `LOGIN V2` block with CSS custom-property theme tokens and all component/animation styles, a new `PugMascot.tsx` component is ported from `design_handoff_login/src/pug.jsx`, and `login/page.tsx` is fully rewritten with the correct state machine and auth integration. No other auth pages are touched.

**Tech Stack:** Next.js 14 App Router, TypeScript, lucide-react, next/font/google, CSS custom properties, Jest + @testing-library/react

**Design references:**
- `design_handoff_login/README.md` — token values, layout spec, interaction model
- `design_handoff_login/src/app.jsx` — visual/interaction reference
- `design_handoff_login/src/pug.jsx` — mascot source
- `docs/superpowers/specs/2026-06-03-login-redesign-design.md` — approved spec

---

## File Map

| File | Action | Responsibility |
|---|---|---|
| `frontend/jest.config.ts` | Create | Jest config for Next.js + jsdom |
| `frontend/jest.setup.ts` | Create | jest-dom custom matchers |
| `frontend/src/app/layout.tsx` | Modify | Load Bricolage Grotesque + Plus Jakarta Sans via next/font/google |
| `frontend/src/app/(auth)/auth.css` | Modify (append) | Theme tokens, shell layout, form pane, art pane, animations, responsive |
| `frontend/src/components/login/PugMascot.tsx` | Create | Animated pug SVG — blink, cursor-follow, peeking, happy, tongue |
| `frontend/src/components/login/__tests__/PugMascot.test.tsx` | Create | Render + prop behaviour tests |
| `frontend/src/app/(auth)/login/page.tsx` | Modify (full rewrite) | State, theme effect, form, art pane, real auth |
| `frontend/src/app/(auth)/login/__tests__/LoginPage.test.tsx` | Create | Theme toggle, show/hide, submit states, error, unmount cleanup |

---

### Task 1: Set up Jest + React Testing Library

No existing test infrastructure. This installs it once; all subsequent tasks use it.

**Files:**
- Create: `frontend/jest.config.ts`
- Create: `frontend/jest.setup.ts`
- Modify: `frontend/package.json` (scripts)

- [ ] **Step 1: Install test dependencies**

```bash
cd frontend && npm install -D jest @testing-library/react @testing-library/jest-dom jest-environment-jsdom @types/jest ts-jest
```

Expected: packages added to `devDependencies`, no peer-dep errors.

- [ ] **Step 2: Create jest.config.ts**

Create `frontend/jest.config.ts`:

```ts
import type { Config } from 'jest'
import nextJest from 'next/jest.js'

const createJestConfig = nextJest({ dir: './' })

const config: Config = {
  testEnvironment: 'jsdom',
  setupFilesAfterFramework: ['<rootDir>/jest.setup.ts'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
}

export default createJestConfig(config)
```

Note: if TypeScript reports `setupFilesAfterFramework` as unknown, the correct Jest property name is `setupFilesAfterEachTest` — check the installed `@types/jest` version. The Next.js `createJestConfig` wrapper re-exports all standard Jest config keys; the `Config` type in `@types/jest` lists the valid property names.

- [ ] **Step 3: Create jest.setup.ts**

Create `frontend/jest.setup.ts`:

```ts
import '@testing-library/jest-dom'
```

- [ ] **Step 4: Add test script to package.json**

In `frontend/package.json`, add to `"scripts"`:

```json
"test": "jest",
"test:watch": "jest --watch"
```

- [ ] **Step 5: Verify Jest runs**

```bash
cd frontend && npx jest --listTests
```

Expected: no errors, empty list (no test files yet).

- [ ] **Step 6: Commit**

```bash
git add frontend/jest.config.ts frontend/jest.setup.ts frontend/package.json
git commit -m "chore: add Jest + React Testing Library setup"
```

---

### Task 2: Add fonts to layout.tsx

**Files:**
- Modify: `frontend/src/app/layout.tsx`

- [ ] **Step 1: Replace layout.tsx**

Replace the full contents of `frontend/src/app/layout.tsx`:

```tsx
import type { Metadata } from 'next'
import { Bricolage_Grotesque, Plus_Jakarta_Sans } from 'next/font/google'
import './globals.css'
import { QueryProvider } from '@/lib/providers/QueryProvider'
import { SocketProvider } from '@/lib/socket/SocketProvider'
import { Toaster } from '@/components/ui/toaster'

const bricolage = Bricolage_Grotesque({
  subsets: ['latin'],
  weight: ['500', '600', '700', '800'],
  variable: '--font-display',
  display: 'swap',
})

const jakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-body',
  display: 'swap',
})

export const metadata: Metadata = {
  title: process.env.NEXT_PUBLIC_APP_NAME ?? 'Sofia Books',
  description: 'Philippine SME bookkeeping SaaS',
}

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${bricolage.variable} ${jakarta.variable}`}>
      <body>
        <QueryProvider>
          <SocketProvider>
            {children}
            <Toaster />
          </SocketProvider>
        </QueryProvider>
      </body>
    </html>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/app/layout.tsx
git commit -m "feat: load Bricolage Grotesque and Plus Jakarta Sans via next/font"
```

---

### Task 3: Add LOGIN V2 CSS to auth.css

Append the entire block below to the end of `frontend/src/app/(auth)/auth.css`. Do not remove any existing styles.

**Files:**
- Modify: `frontend/src/app/(auth)/auth.css`

- [ ] **Step 1: Append LOGIN V2 styles**

```css
/* ─── LOGIN V2 ─────────────────────────────────────────────────────────────── */

/* Theme tokens ─ Sofia (warm cream light) */
body.theme-sofia {
  --primary:      #E2568C;
  --primary-deep: #C53C76;
  --surface:      #FBF8F3;
  --text:         #2A2433;
  --muted-fg:     #8A8295;
  --field-bg:     #F6F4FA;
  --field-bd:     #E5E0EE;
  --field-focus:  #FFFFFF;
  --label:        #5C5568;
  --placeholder:  #B4AEC0;
  --hint:         #ADA6B8;
  --legal:        #BDB7C7;
  --panel-a:      #F178AE;
  --panel-b:      #C73C7C;
  --panel-glow:   #FF9CC6;
  --d1:           #FFD27D;
  --d2:           #FF9CC4;
  --d3:           #FFFFFF;
}

/* Theme tokens ─ Yoda (periwinkle midnight dark) */
body.theme-yoda {
  --primary:      #7C9CFF;
  --primary-deep: #5B7CF0;
  --surface:      #14121C;
  --text:         #ECEAF2;
  --muted-fg:     #9A93AE;
  --field-bg:     #211D2C;
  --field-bd:     #332E44;
  --field-focus:  #211D2C;
  --label:        #C4BDD6;
  --placeholder:  #6E6880;
  --hint:         #6E6880;
  --legal:        #4F4960;
  --panel-a:      #3A3E78;
  --panel-b:      #16142A;
  --panel-glow:   #6E7BE0;
  --d1:           #AFC4FF;
  --d2:           #7DE0C2;
  --d3:           #FFFFFF;
}

/* Shell */
.lv2-shell {
  display: flex;
  min-height: 100vh;
  font-family: var(--font-body, 'Plus Jakarta Sans', sans-serif);
}

.lv2-pane { flex: 1; }

/* ── Form pane ── */
.lv2-form-pane {
  background: var(--surface);
  padding: 44px 56px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  transition: background-color 0.5s;
  overflow-y: auto;
}

/* Brand */
.lv2-brand {
  display: flex;
  align-items: center;
  gap: 10px;
}
.lv2-brand-mark {
  width: 38px;
  height: 38px;
  border-radius: 11px;
  background: linear-gradient(150deg, var(--primary), var(--primary-deep));
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  transition: background 0.5s;
}
.lv2-brand-name {
  font-family: var(--font-display, 'Bricolage Grotesque', sans-serif);
  font-size: 18px;
  font-weight: 700;
  color: var(--text);
  transition: color 0.5s;
}

/* Form wrap */
.lv2-form-wrap {
  max-width: 404px;
  width: 100%;
  align-self: center;
}
.lv2-headline {
  font-family: var(--font-display, 'Bricolage Grotesque', sans-serif);
  font-size: 42px;
  font-weight: 800;
  line-height: 1.02;
  letter-spacing: -0.025em;
  color: var(--text);
  margin: 0 0 10px;
  transition: color 0.5s;
}
.lv2-subhead {
  font-size: 15.5px;
  color: var(--muted-fg);
  margin: 0 0 28px;
  transition: color 0.5s;
}

/* Field */
.lv2-field {
  margin-bottom: 18px;
}
.lv2-label {
  display: block;
  font-size: 13px;
  font-weight: 600;
  color: var(--label);
  margin-bottom: 7px;
  transition: color 0.5s;
}
.lv2-label-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 7px;
}
.lv2-label-row .lv2-label { margin-bottom: 0; }
.lv2-forgot {
  font-size: 12px;
  color: var(--primary);
  text-decoration: none;
  transition: color 0.5s;
}
.lv2-forgot:hover { text-decoration: underline; }

/* Input row */
.lv2-input {
  display: flex;
  align-items: center;
  gap: 10px;
  height: 52px;
  padding: 0 14px;
  border: 1.5px solid var(--field-bd);
  border-radius: 13px;
  background: var(--field-bg);
  transition: border-color 0.15s, background-color 0.15s, box-shadow 0.15s;
}
.lv2-input.is-focus {
  border-color: var(--primary);
  background: var(--field-focus);
  box-shadow: 0 0 0 4px color-mix(in srgb, var(--primary) 14%, transparent);
}
.lv2-input-ic {
  color: var(--muted-fg);
  flex-shrink: 0;
  transition: color 0.15s;
}
.lv2-input.is-focus .lv2-input-ic { color: var(--primary); }
.lv2-input input {
  flex: 1;
  min-width: 0;
  border: none;
  background: transparent;
  outline: none;
  font-size: 14.5px;
  color: var(--text);
  font-family: var(--font-body, 'Plus Jakarta Sans', sans-serif);
  transition: color 0.5s;
}
.lv2-input input::placeholder { color: var(--placeholder); }
.lv2-reveal {
  background: none;
  border: none;
  cursor: pointer;
  font-size: 12px;
  font-weight: 600;
  color: var(--primary);
  padding: 0;
  flex-shrink: 0;
  transition: color 0.5s;
}
.lv2-hint {
  font-size: 12px;
  color: var(--hint);
  margin-top: 6px;
  transition: color 0.5s;
}

/* Submit */
.lv2-submit {
  width: 100%;
  height: 54px;
  border: none;
  border-radius: 13px;
  background: linear-gradient(150deg, var(--primary), var(--primary-deep));
  color: #fff;
  font-size: 15.5px;
  font-weight: 700;
  font-family: var(--font-body, 'Plus Jakarta Sans', sans-serif);
  cursor: pointer;
  margin-top: 22px;
  transition: transform 0.15s, box-shadow 0.15s, background 0.3s;
}
.lv2-submit:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 6px 20px color-mix(in srgb, var(--primary) 35%, transparent);
}
.lv2-submit:active:not(:disabled) { transform: translateY(0); }
.lv2-submit:disabled { cursor: not-allowed; opacity: 0.7; }
.lv2-submit.loading { opacity: 0.7; cursor: wait; }
.lv2-submit.success {
  background: linear-gradient(150deg, #34C99B, #1FA67C) !important;
}

/* Error banner */
.lv2-error {
  display: flex;
  align-items: flex-start;
  gap: 9px;
  padding: 11px 14px;
  background: #fff5f5;
  border: 1px solid #fecaca;
  border-radius: 10px;
  font-size: 13px;
  color: #dc2626;
  margin-bottom: 20px;
}
body.theme-yoda .lv2-error {
  background: #2A1A1C;
  border-color: #5c2a2a;
  color: #fca5a5;
}
.lv2-error-icon { flex-shrink: 0; margin-top: 1px; color: inherit; }

/* Reset + legal */
.lv2-reset {
  margin-top: 20px;
  font-size: 13px;
  color: var(--muted-fg);
  text-align: center;
  transition: color 0.5s;
}
.lv2-reset a {
  color: var(--primary);
  text-decoration: none;
  font-weight: 600;
  transition: color 0.5s;
}
.lv2-reset a:hover { text-decoration: underline; }
.lv2-legal {
  font-size: 12px;
  color: var(--legal);
  transition: color 0.5s;
}

/* ── Art pane ── */
.lv2-art-pane {
  position: relative;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 28px;
  padding: 48px 40px;
  background:
    radial-gradient(120% 90% at 78% 12%, var(--panel-glow) 0%, transparent 52%),
    radial-gradient(130% 110% at 18% 92%, var(--panel-b) 0%, transparent 60%),
    linear-gradient(155deg, var(--panel-a) 0%, var(--panel-b) 100%);
  transition: background 0.5s;
}

/* Blobs */
.lv2-blob {
  position: absolute;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.08);
  filter: blur(60px);
  pointer-events: none;
}
.lv2-b1 { width: 380px; height: 380px; top: -100px; right: -80px; }
.lv2-b2 { width: 260px; height: 260px; bottom: -60px; left: -60px; }

/* Dot grid */
.lv2-grid-dots {
  position: absolute;
  inset: 0;
  background-image: radial-gradient(circle, rgba(255,255,255,0.18) 1px, transparent 1px);
  background-size: 24px 24px;
  opacity: 0.08;
  pointer-events: none;
}

/* Mascot toggle */
.lv2-mascot-toggle {
  position: relative;
  display: flex;
  align-items: center;
  background: rgba(255, 255, 255, 0.16);
  backdrop-filter: blur(8px);
  border-radius: 999px;
  padding: 4px;
  z-index: 2;
}
.lv2-toggle-thumb {
  position: absolute;
  top: 4px;
  left: 4px;
  height: calc(100% - 8px);
  width: calc(50% - 4px);
  background: #fff;
  border-radius: 999px;
  transition: transform 0.32s cubic-bezier(0.34, 1.3, 0.5, 1);
  pointer-events: none;
}
.lv2-toggle-thumb.yoda { transform: translateX(100%); }
.lv2-mascot-toggle button {
  position: relative;
  z-index: 1;
  background: none;
  border: none;
  border-radius: 999px;
  padding: 7px 20px;
  font-size: 13px;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.7);
  cursor: pointer;
  transition: color 0.2s;
  font-family: var(--font-body, 'Plus Jakarta Sans', sans-serif);
}
.lv2-mascot-toggle button.on { color: var(--primary); }

/* Pug float wrapper */
.lv2-pug-float {
  position: relative;
  z-index: 2;
  filter: drop-shadow(0 16px 40px rgba(0, 0, 0, 0.28));
}

/* Art copy */
.lv2-art-inner {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 20px;
  z-index: 2;
  position: relative;
  text-align: center;
}
.lv2-art-copy {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
}
.lv2-art-title {
  font-family: var(--font-display, 'Bricolage Grotesque', sans-serif);
  font-size: 34px;
  font-weight: 700;
  color: #fff;
  margin: 0;
  line-height: 1.15;
}
.lv2-art-sub {
  font-size: 14px;
  color: rgba(255, 255, 255, 0.72);
  max-width: 340px;
  line-height: 1.6;
  margin: 0;
}

/* Chips */
.lv2-chips {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
  align-items: center;
}
.lv2-chip {
  display: flex;
  align-items: center;
  gap: 8px;
  background: rgba(255, 255, 255, 0.12);
  backdrop-filter: blur(6px);
  border: 1px solid rgba(255, 255, 255, 0.18);
  border-radius: 999px;
  padding: 7px 16px;
  font-size: 13px;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.9);
}
.lv2-chip-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
}
.lv2-chip-dot.d1 { background: var(--d1); }
.lv2-chip-dot.d2 { background: var(--d2); }
.lv2-chip-dot.d3 { background: var(--d3); }

/* ── Animations ── */
@media (prefers-reduced-motion: no-preference) {
  .lv2-pug-float            { animation: login-float 13s ease-in-out infinite; }
  .lv2-pug-float.is-happy   { animation: login-bounce 0.5s ease-in-out 2, login-float 13s ease-in-out 1s infinite; }
  .pug-breathe              { animation: login-breathe 4s ease-in-out infinite; }
  .earL                     { transform-origin: 58px 104px; animation: login-ear-l 6s ease-in-out infinite; }
  .earR                     { transform-origin: 202px 104px; animation: login-ear-r 7s ease-in-out infinite; }
  .antenna                  { animation: login-antenna 2.4s ease-in-out infinite; }
  .spark.s1                 { animation: login-sparkle 3s   ease-in-out infinite; }
  .spark.s2                 { animation: login-sparkle 4s   ease-in-out infinite 0.8s; }
  .spark.s3                 { animation: login-sparkle 3.5s ease-in-out infinite 1.4s; }
  .spark.s4                 { animation: login-sparkle 4.5s ease-in-out infinite 0.4s; }

  @keyframes login-float {
    0%, 100% { transform: translateY(0);    }
    50%       { transform: translateY(-12px); }
  }
  @keyframes login-bounce {
    0%, 100% { transform: translateY(0);    }
    40%       { transform: translateY(-18px); }
  }
  @keyframes login-breathe {
    0%, 100% { transform: scaleY(1);     }
    50%       { transform: scaleY(1.015); }
  }
  @keyframes login-ear-l {
    0%, 100% { transform: rotate(-12deg); }
    50%       { transform: rotate(-15deg); }
  }
  @keyframes login-ear-r {
    0%, 100% { transform: rotate(12deg); }
    50%       { transform: rotate(15deg); }
  }
  @keyframes login-antenna {
    0%, 100% { transform: scale(1);    }
    50%       { transform: scale(1.25); }
  }
  @keyframes login-sparkle {
    0%, 100% { opacity: 0; transform: scale(0.5); }
    50%       { opacity: 1; transform: scale(1);   }
  }
}

/* ── Responsive ── */
@media (max-width: 920px) {
  .lv2-shell      { flex-direction: column; }
  .lv2-art-pane   { order: -1; min-height: 420px; flex: none; }
  .pug-svg        { width: 240px; height: auto; }
  .lv2-form-pane  { padding: 32px 24px; }
  .lv2-art-title  { font-size: 27px; }
  .lv2-chips      { flex-direction: row; flex-wrap: wrap; justify-content: center; }
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/app/(auth)/auth.css
git commit -m "feat: add login v2 CSS — tokens, layout, form, art pane, animations"
```

---

### Task 4: Create PugMascot component (TDD)

**Files:**
- Create: `frontend/src/components/login/PugMascot.tsx`
- Create: `frontend/src/components/login/__tests__/PugMascot.test.tsx`

- [ ] **Step 1: Write the failing tests**

Create `frontend/src/components/login/__tests__/PugMascot.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react'
import PugMascot from '../PugMascot'

const base = {
  variant: 'sofia' as const,
  accent: '#E2568C',
  accentGlow: '#FFADD2',
  peeking: false,
  happy: false,
}

describe('PugMascot', () => {
  it('renders with aria-label for sofia', () => {
    render(<PugMascot {...base} />)
    expect(screen.getByLabelText('Sofia, the AI pug')).toBeInTheDocument()
  })

  it('renders with aria-label for yoda', () => {
    render(<PugMascot {...base} variant="yoda" accent="#7C9CFF" accentGlow="#AFC4FF" />)
    expect(screen.getByLabelText('Yoda, the AI pug')).toBeInTheDocument()
  })

  it('paws are visible when peeking=true', () => {
    const { container } = render(<PugMascot {...base} peeking={true} />)
    const paws = container.querySelector('.paws') as HTMLElement
    expect(paws.style.opacity).toBe('1')
  })

  it('paws are hidden when peeking=false', () => {
    const { container } = render(<PugMascot {...base} peeking={false} />)
    const paws = container.querySelector('.paws') as HTMLElement
    expect(paws.style.opacity).toBe('0')
  })
})
```

- [ ] **Step 2: Run tests — expect failure**

```bash
cd frontend && npx jest PugMascot.test --no-coverage
```

Expected: `FAIL — Cannot find module '../PugMascot'`

- [ ] **Step 3: Create the component**

Create `frontend/src/components/login/PugMascot.tsx`:

```tsx
'use client'

import { useState, useEffect, useRef } from 'react'

interface PugMascotProps {
  variant: 'sofia' | 'yoda'
  accent: string
  accentGlow: string
  peeking: boolean
  happy: boolean
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
}: PugMascotProps) {
  const svgRef = useRef<SVGSVGElement>(null)
  const pupilsRef = useRef<SVGGElement>(null)
  const [blinking, setBlinking] = useState(false)

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
      width="320"
      height="369"
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
        <path d="M74 196 Q130 220 186 196" fill="none" stroke={accent} strokeWidth="12" strokeLinecap="round" />
        <circle cx="130" cy="214" r="7" fill={accentGlow} stroke={WHITE} strokeWidth="1.5" />

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
        <path d="M64 96 Q130 34 196 96" fill="none" stroke={accent} strokeWidth="8" strokeLinecap="round" />
        <circle cx="130" cy="40" r="9" fill="url(#glowG)" />
        <circle cx="130" cy="40" r="4.5" fill={accent} className="antenna" />
        <circle cx="62" cy="104" r="13" fill={accent} />
        <circle cx="62" cy="104" r="6" fill={accentGlow} />
        <path d="M60 116 Q50 156 96 158" fill="none" stroke={accent} strokeWidth="5" strokeLinecap="round" />
        <circle cx="98" cy="158" r="5" fill={accent} />

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
```

- [ ] **Step 4: Run tests — expect pass**

```bash
cd frontend && npx jest PugMascot.test --no-coverage
```

Expected: `PASS — 4 tests pass`

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/login/PugMascot.tsx frontend/src/components/login/__tests__/PugMascot.test.tsx
git commit -m "feat: add PugMascot component"
```

---

### Task 5: Rewrite login/page.tsx (TDD)

**Files:**
- Modify: `frontend/src/app/(auth)/login/page.tsx`
- Create: `frontend/src/app/(auth)/login/__tests__/LoginPage.test.tsx`

- [ ] **Step 1: Write the failing tests**

Create `frontend/src/app/(auth)/login/__tests__/LoginPage.test.tsx`:

```tsx
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import { useRouter } from 'next/navigation'
import LoginPage from '../page'

const mockLogin = jest.fn()
const mockPush = jest.fn()

jest.mock('@/lib/hooks/useAuth', () => ({
  useAuth: () => ({ login: mockLogin }),
}))

jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
}))

// axios.isAxiosError reads the isAxiosError property — no full mock needed
// (the real implementation is: payload.isAxiosError === true)

beforeEach(() => {
  jest.clearAllMocks()
  ;(useRouter as jest.Mock).mockReturnValue({ push: mockPush })
  document.body.className = ''
  localStorage.clear()
})

describe('LoginPage', () => {
  it('renders the headline and brand name', () => {
    render(<LoginPage />)
    expect(screen.getByText('Welcome back')).toBeInTheDocument()
    expect(screen.getByText('Built for Bookkeepers')).toBeInTheDocument()
  })

  it('adds theme-sofia to body on mount', () => {
    render(<LoginPage />)
    expect(document.body.classList.contains('theme-sofia')).toBe(true)
  })

  it('switches to theme-yoda when Yoda tab clicked', () => {
    render(<LoginPage />)
    fireEvent.click(screen.getByRole('tab', { name: 'Yoda' }))
    expect(document.body.classList.contains('theme-yoda')).toBe(true)
    expect(document.body.classList.contains('theme-sofia')).toBe(false)
  })

  it('removes theme classes from body on unmount', () => {
    const { unmount } = render(<LoginPage />)
    unmount()
    expect(document.body.classList.contains('theme-sofia')).toBe(false)
    expect(document.body.classList.contains('theme-yoda')).toBe(false)
  })

  it('toggles password visibility', () => {
    render(<LoginPage />)
    const pwInput = screen.getByPlaceholderText('Enter your password')
    expect(pwInput).toHaveAttribute('type', 'password')
    fireEvent.click(screen.getByRole('button', { name: 'Toggle password' }))
    expect(pwInput).toHaveAttribute('type', 'text')
    fireEvent.click(screen.getByRole('button', { name: 'Toggle password' }))
    expect(pwInput).toHaveAttribute('type', 'password')
  })

  it('shows error banner on failed login', async () => {
    mockLogin.mockRejectedValueOnce({ isAxiosError: true, response: { status: 422 } })
    render(<LoginPage />)
    fireEvent.change(screen.getByPlaceholderText('you@firm.ph'), { target: { value: 'user@test.com' } })
    fireEvent.change(screen.getByPlaceholderText('Enter your password'), { target: { value: 'wrong' } })
    fireEvent.click(screen.getByRole('button', { name: /sign in/i }))
    await waitFor(() => {
      expect(screen.getByText(/invalid credentials/i)).toBeInTheDocument()
    })
  })

  it('navigates to role dashboard after successful login', async () => {
    jest.useFakeTimers()
    mockLogin.mockResolvedValueOnce({ role: 'accountant' })
    render(<LoginPage />)
    fireEvent.change(screen.getByPlaceholderText('you@firm.ph'), { target: { value: 'user@test.com' } })
    fireEvent.change(screen.getByPlaceholderText('Enter your password'), { target: { value: 'secret' } })
    fireEvent.click(screen.getByRole('button', { name: /sign in/i }))

    // Flush the resolved promise
    await act(async () => { await Promise.resolve() })

    // Advance past the 1500ms navigation delay
    act(() => { jest.advanceTimersByTime(1500) })

    expect(mockPush).toHaveBeenCalledWith('/accountant/dashboard')
    jest.useRealTimers()
  })

  it('redirects to /blocked on 403', async () => {
    mockLogin.mockRejectedValueOnce({ isAxiosError: true, response: { status: 403 } })
    render(<LoginPage />)
    fireEvent.click(screen.getByRole('button', { name: /sign in/i }))
    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/blocked')
    })
  })
})
```

- [ ] **Step 2: Run tests — expect failure**

```bash
cd frontend && npx jest LoginPage.test --no-coverage
```

Expected: `FAIL` — multiple failures (page not yet rewritten)

- [ ] **Step 3: Rewrite login/page.tsx**

Replace the entire contents of `frontend/src/app/(auth)/login/page.tsx`:

```tsx
'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { User, Lock, AlertCircle } from 'lucide-react'
import { useAuth } from '@/lib/hooks/useAuth'
import PugMascot from '@/components/login/PugMascot'
import axios from 'axios'

type Mascot = 'sofia' | 'yoda'
type Focus  = 'email' | 'password' | null
type Status = 'idle' | 'loading' | 'success'

const THEME = {
  sofia: { accent: '#E2568C', accentGlow: '#FFADD2' },
  yoda:  { accent: '#7C9CFF', accentGlow: '#AFC4FF' },
}

export default function LoginPage() {
  const router = useRouter()
  const { login } = useAuth()

  const [mascot, setMascot] = useState<Mascot>('sofia')
  const [focus,  setFocus]  = useState<Focus>(null)
  const [showPw, setShowPw] = useState(false)
  const [email,  setEmail]  = useState('')
  const [pw,     setPw]     = useState('')
  const [status, setStatus] = useState<Status>('idle')
  const [error,  setError]  = useState<string | null>(null)

  // Restore saved mascot choice (client-side only — avoids SSR hydration mismatch)
  useEffect(() => {
    const stored = localStorage.getItem('sofia_login_theme')
    if (stored === 'sofia' || stored === 'yoda') setMascot(stored)
  }, [])

  // Apply theme class to body so the night mode covers the full viewport
  useEffect(() => {
    document.body.classList.remove('theme-sofia', 'theme-yoda')
    document.body.classList.add('theme-' + mascot)
    localStorage.setItem('sofia_login_theme', mascot)
    return () => { document.body.classList.remove('theme-sofia', 'theme-yoda') }
  }, [mascot])

  const peeking = focus === 'password' && !showPw
  const happy   = status === 'success'
  const t       = THEME[mascot]
  const name    = mascot === 'sofia' ? 'Sofia' : 'Yoda'

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (status !== 'idle') return
    setError(null)
    setStatus('loading')
    try {
      const user = await login(email, pw)
      setStatus('success')
      setTimeout(() => router.push(`/${user.role}/dashboard`), 1500)
    } catch (err) {
      setStatus('idle')
      if (axios.isAxiosError(err) && err.response?.status === 403) {
        router.push('/blocked')
      } else {
        setError('Invalid credentials. Please check your details and try again.')
      }
    }
  }

  return (
    <div className="lv2-shell">

      {/* ── Left: form pane ── */}
      <section className="lv2-pane lv2-form-pane">
        <header className="lv2-brand">
          <span className="lv2-brand-mark" aria-hidden="true">
            <svg viewBox="0 0 24 24" width="21" height="21">
              <circle cx="12" cy="14.6" r="5.1" fill="#fff" />
              <circle cx="6.4" cy="8.6"  r="2.25" fill="#fff" />
              <circle cx="12" cy="6.1"   r="2.25" fill="#fff" />
              <circle cx="17.6" cy="8.6" r="2.25" fill="#fff" />
            </svg>
          </span>
          <span className="lv2-brand-name">Built for Bookkeepers</span>
        </header>

        <div className="lv2-form-wrap">
          <h1 className="lv2-headline">Welcome back</h1>
          <p className="lv2-subhead">Sign in to your workspace to continue.</p>

          {error && (
            <div className="lv2-error" role="alert">
              <AlertCircle size={16} className="lv2-error-icon" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={onSubmit} noValidate>
            {/* Email */}
            <div className="lv2-field">
              <label className="lv2-label" htmlFor="lv2-id">
                Email, mobile, or username
              </label>
              <div className={`lv2-input${focus === 'email' ? ' is-focus' : ''}`}>
                <User size={18} className="lv2-input-ic" aria-hidden="true" />
                <input
                  id="lv2-id"
                  type="text"
                  autoComplete="username"
                  placeholder="you@firm.ph"
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); setError(null) }}
                  onFocus={() => setFocus('email')}
                  onBlur={() => setFocus(null)}
                />
              </div>
              <p className="lv2-hint">Any of your registered identifiers.</p>
            </div>

            {/* Password */}
            <div className="lv2-field">
              <div className="lv2-label-row">
                <label className="lv2-label" htmlFor="lv2-pw">Password</label>
                <a className="lv2-forgot" href="#">Forgot?</a>
              </div>
              <div className={`lv2-input${focus === 'password' ? ' is-focus' : ''}`}>
                <Lock size={18} className="lv2-input-ic" aria-hidden="true" />
                <input
                  id="lv2-pw"
                  type={showPw ? 'text' : 'password'}
                  autoComplete="current-password"
                  placeholder="Enter your password"
                  value={pw}
                  onChange={(e) => { setPw(e.target.value); setError(null) }}
                  onFocus={() => setFocus('password')}
                  onBlur={() => setFocus(null)}
                />
                <button
                  type="button"
                  className="lv2-reveal"
                  onClick={() => setShowPw((s) => !s)}
                  aria-label="Toggle password"
                >
                  {showPw ? 'Hide' : 'Show'}
                </button>
              </div>
            </div>

            <button
              type="submit"
              className={`lv2-submit ${status}`}
              disabled={status !== 'idle'}
            >
              {status === 'idle'    && 'Sign in'}
              {status === 'loading' && 'Signing in…'}
              {status === 'success' && 'Welcome back!'}
            </button>
          </form>

          <p className="lv2-reset">
            Need access?{' '}
            <a href="#">Ask your firm admin to invite you.</a>
          </p>
        </div>

        <footer className="lv2-legal">
          Built for Bookkeepers &middot; AI bookkeeping for Philippine firms
        </footer>
      </section>

      {/* ── Right: art pane ── */}
      <section className="lv2-pane lv2-art-pane">
        <div className="lv2-blob lv2-b1" />
        <div className="lv2-blob lv2-b2" />
        <div className="lv2-grid-dots" />

        <div
          className="lv2-mascot-toggle"
          role="tablist"
          aria-label="Choose your AI assistant"
        >
          <span className={`lv2-toggle-thumb ${mascot}`} />
          <button
            role="tab"
            aria-selected={mascot === 'sofia'}
            className={mascot === 'sofia' ? 'on' : ''}
            onClick={() => setMascot('sofia')}
          >
            Sofia
          </button>
          <button
            role="tab"
            aria-selected={mascot === 'yoda'}
            className={mascot === 'yoda' ? 'on' : ''}
            onClick={() => setMascot('yoda')}
          >
            Yoda
          </button>
        </div>

        <div className="lv2-art-inner">
          <div className={`lv2-pug-float${happy ? ' is-happy' : ''}`}>
            <PugMascot
              variant={mascot}
              accent={t.accent}
              accentGlow={t.accentGlow}
              peeking={peeking}
              happy={happy}
            />
          </div>

          <div className="lv2-art-copy">
            <h2 className="lv2-art-title">
              An AI co-pilot for<br />your clients&rsquo; books.
            </h2>
            <p className="lv2-art-sub">
              Upload your clients&rsquo; receipts yourself, or invite clients to upload
              their own &mdash; {name} categorizes everything with AI, and you stay
              the approver.
            </p>
            <ul className="lv2-chips">
              <li className="lv2-chip">
                <span className="lv2-chip-dot d1" />
                Upload yourself or invite clients
              </li>
              <li className="lv2-chip">
                <span className="lv2-chip-dot d2" />
                AI-categorized entries
              </li>
              <li className="lv2-chip">
                <span className="lv2-chip-dot d3" />
                You approve every account
              </li>
            </ul>
          </div>
        </div>
      </section>

    </div>
  )
}
```

- [ ] **Step 4: Run tests — expect pass**

```bash
cd frontend && npx jest LoginPage.test --no-coverage
```

Expected: `PASS — 7 tests pass`

- [ ] **Step 5: Commit**

```bash
git add frontend/src/app/(auth)/login/page.tsx frontend/src/app/(auth)/login/__tests__/LoginPage.test.tsx
git commit -m "feat: rewrite login page — pug mascot, sofia/yoda themes, real auth"
```

---

### Task 6: Browser smoke test

- [ ] **Step 1: Start the dev server**

```bash
cd frontend && npm run dev
```

Open `http://localhost:3000/login`.

- [ ] **Step 2: Sofia theme**

- Left pane: warm cream background, "Built for Bookkeepers" brand mark, "Welcome back" in Bricolage Grotesque
- Right pane: pink gradient, Sofia pug floating, mascot toggle shows "Sofia" active

- [ ] **Step 3: Yoda toggle**

- Click "Yoda" — entire page transitions to dark periwinkle, pug shows tongue, thumb slides right
- Reload — Yoda theme persists (stored in localStorage)

- [ ] **Step 4: Password peek**

- Click into Password field — pug raises paws over its eyes
- Click "Show" — paws lower, input becomes plain text
- Click "Hide" — paws raise again

- [ ] **Step 5: Responsive**

- Resize to 900px wide — art pane stacks on top, form below, pug shrinks, chips wrap
