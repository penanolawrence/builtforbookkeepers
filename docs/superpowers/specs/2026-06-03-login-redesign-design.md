# Login Redesign — Design Spec

**Date:** 2026-06-03
**Status:** Approved
**Reference:** `design_handoff_login/README.md`, `design_handoff_login/src/app.jsx`, `design_handoff_login/src/pug.jsx`

---

## Problem

The current login page is a placeholder split layout with a static SVG illustration, emoji icons, no theme system, and no brand identity. The design handoff defines a high-fidelity, fully interactive login with an animated pug mascot, a Sofia/Yoda theme toggle, and a warm-to-dark theme system.

---

## Solution

Full rewrite of `login/page.tsx` and its supporting CSS. The design handoff is the visual and interaction spec; this doc records all decisions needed to implement it in the Next.js codebase.

---

## Files Changed

| File | Change |
|---|---|
| `frontend/src/app/layout.tsx` | Add `next/font/google` for Bricolage Grotesque + Plus Jakarta Sans; expose as CSS variables |
| `frontend/src/app/(auth)/auth.css` | Add `/* LOGIN V2 */` section with theme tokens, layout, component, and animation styles |
| `frontend/src/app/(auth)/login/page.tsx` | Full rewrite — state, theme effect, form, art pane, real auth |
| `frontend/src/components/login/PugMascot.tsx` | New file — pug mascot component ported from `pug.jsx` |

---

## Section 1 — Layout & Theme System

### Fonts

Add to `layout.tsx` via `next/font/google`:

```ts
import { Bricolage_Grotesque, Plus_Jakarta_Sans } from 'next/font/google'

const bricolage = Bricolage_Grotesque({
  subsets: ['latin'],
  weight: ['500', '600', '700', '800'],
  variable: '--font-display',
})

const jakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-body',
})
```

Apply both `className` values to `<html>`.

### Theme classes

A `useEffect` in `LoginPage` adds `theme-sofia` or `theme-yoda` to `document.body` whenever `mascot` changes, removing the other first. On unmount, both classes are removed so other pages are unaffected.

Theme choice is persisted to `localStorage` under the key `sofia_login_theme` and restored on mount.

### CSS custom properties

Defined on `body.theme-sofia` and `body.theme-yoda` in `auth.css`:

**Sofia (light — default)**
```
--primary: #E2568C        --primary-deep: #C53C76
--surface: #FBF8F3        --text: #2A2433        --muted-fg: #8A8295
--field-bg: #F6F4FA       --field-bd: #E5E0EE    --field-focus: #FFFFFF
--label: #5C5568          --placeholder: #B4AEC0  --hint: #ADA6B8   --legal: #BDB7C7
--panel-a: #F178AE        --panel-b: #C73C7C     --panel-glow: #FF9CC6
--d1: #FFD27D             --d2: #FF9CC4          --d3: #FFFFFF
```

**Yoda (dark)**
```
--primary: #7C9CFF        --primary-deep: #5B7CF0
--surface: #14121C        --text: #ECEAF2        --muted-fg: #9A93AE
--field-bg: #211D2C       --field-bd: #332E44    --field-focus: #211D2C
--label: #C4BDD6          --placeholder: #6E6880  --hint: #6E6880   --legal: #4F4960
--panel-a: #3A3E78        --panel-b: #16142A     --panel-glow: #6E7BE0
--d1: #AFC4FF             --d2: #7DE0C2          --d3: #FFFFFF
```

All color-bearing properties on `.shell`, `.form-pane`, and inputs carry `transition: color .5s, background-color .5s, border-color .5s` so the theme swap animates smoothly.

---

## Section 2 — Form Pane (Left)

### Layout

`.shell`: `display:flex; min-height:100vh`
`.form-pane`: `flex:1; background:var(--surface); padding:44px 56px; display:flex; flex-direction:column; justify-content:space-between`

### Brand (top)

- Mark: 38×38 `border-radius:11px` square, `background:linear-gradient(150deg, var(--primary), var(--primary-deep))`. Contains the paw-print SVG (4 white circles: body circle cx=12 cy=14.6 r=5.1; paws cx=6.4/12/17.6 cy=8.6/6.1/8.6 r=2.25).
- Wordmark: "Built for Bookkeepers", `font-family:var(--font-display)`, 700/18px, `color:var(--text)`.

### Form wrap

`max-width:404px`, centered in the pane.

- `<h1>`: "Welcome back" — Bricolage 800/42px, `line-height:1.02`, `letter-spacing:-.025em`, `color:var(--text)`.
- `<p class="subhead">`: "Sign in to your workspace to continue." — 15.5px, `color:var(--muted-fg)`.

### Email field

- Label: "Email, mobile, or username", 13px, `color:var(--label)`, 600.
- `.input` wrapper: `height:52px; border:1.5px solid var(--field-bd); border-radius:13px; background:var(--field-bg); display:flex; align-items:center; gap:10px; padding:0 14px`.
- Leading icon: lucide `User` (18px). Tints to `var(--primary)` when `.is-focus`.
- Input: `placeholder="you@firm.ph"`, `autoComplete="username"`.
- Hint below: "Any of your registered identifiers." — 12px, `color:var(--hint)`.

### Password field

- Label row: "Password" label (left) + "Forgot?" link (right, 12px, `color:var(--primary)`).
- `.input` wrapper: same as email.
- Leading icon: lucide `Lock` (18px).
- Input: `type={showPw ? 'text' : 'password'}`, `autoComplete="current-password"`, `placeholder="Enter your password"`.
- Trailing "Show"/"Hide" text button (12px, `color:var(--primary)`, no border/bg).

### Focus state

`.is-focus` on the wrapper: `border-color:var(--primary); background:var(--field-focus); box-shadow:0 0 0 4px color-mix(in srgb, var(--primary) 14%, transparent)`.

### Submit button

`width:100%; height:54px; border-radius:13px; background:linear-gradient(150deg, var(--primary), var(--primary-deep)); color:#fff; font-size:15.5px; font-weight:700`.

States:
- `idle`: "Sign in", fully interactive.
- `loading`: "Signing in…", `opacity:.7; cursor:wait`, disabled.
- `success`: "Welcome back!", `background:linear-gradient(150deg, #34C99B, #1FA67C)`.

Hover (idle only): `transform:translateY(-1px)`. Active: `transform:translateY(0)`.

### Error state

On auth failure (non-403): an error banner above the form with `background:#fff5f5` (Sofia) / `#2A1A1C` (Yoda), a lucide `AlertCircle` icon, and the error message text. Clears when the user starts typing. Does not use the loading/success flow — the button returns to "Sign in" immediately on error.

### Reset line & Legal

- Reset: `<p>` "Need access? **Ask your firm admin to invite you.**" — link unstyled for now.
- Legal (bottom-pinned): "Built for Bookkeepers · AI bookkeeping for Philippine firms" — 12px, `color:var(--legal)`.

---

## Section 3 — Art Pane (Right) & PugMascot

### Background

```css
background:
  radial-gradient(120% 90% at 78% 12%, var(--panel-glow) 0%, transparent 52%),
  radial-gradient(130% 110% at 18% 92%, var(--panel-b) 0%, transparent 60%),
  linear-gradient(155deg, var(--panel-a) 0%, var(--panel-b) 100%);
```

Two blurred white blobs (`.b1`, `.b2`) — absolutely positioned, `border-radius:50%`, `background:rgba(255,255,255,.08)`, `filter:blur(60px)`. Masked dot-grid overlay (`.grid-dots`) — `radial-gradient` repeating pattern at 24px, `opacity:.08`.

### Mascot toggle

Frosted pill: `background:rgba(255,255,255,.16); backdrop-filter:blur(8px); border-radius:999px`. Two `<button role="tab">` tabs "Sofia"/"Yoda". White sliding thumb (`.toggle-thumb`) absolutely positioned, `border-radius:999px`, `transition:transform .32s cubic-bezier(.34,1.3,.5,1)` — translates between the two tab positions. Active tab text: `color:var(--primary)`.

### PugMascot component

New file: `frontend/src/components/login/PugMascot.tsx`

Props:
```ts
interface PugMascotProps {
  variant: 'sofia' | 'yoda'
  accent: string
  accentGlow: string
  peeking: boolean
  happy: boolean
}
```

Ported verbatim from `design_handoff_login/src/pug.jsx` with these TypeScript adaptations:
- `const { useState, useEffect, useRef } = React` → standard React imports.
- `window.PugMascot = PugMascot` export removed; use `export default PugMascot`.
- `useRef<SVGSVGElement>` and `useRef<SVGGElement>` typed refs.
- `sparkle` becomes a local helper function above the component.

Behaviors preserved exactly:
- **Idle blink**: random interval 2.2–5.8s, occasional double-blink.
- **Cursor-follow pupils**: `mousemove` listener, ±7px horizontal, ±5px vertical, `transition:transform .25s ease-out`. Disabled when `peeking`.
- **Peeking**: paws `opacity` and `translateY` animated on `peeking` prop change.
- **Happy**: tongue scaleY + pug bounce (driven by `happy` prop on the outer `.pug-float` wrapper receiving a CSS class).
- **Yoda tongue**: `tongueOut = !isSofia || happy` — Yoda always shows tongue.

### Accent colors per theme

```ts
const THEME = {
  sofia: { accent: '#E2568C', accentGlow: '#FFADD2' },
  yoda:  { accent: '#7C9CFF', accentGlow: '#AFC4FF' },
}
```

### Art copy

- `<h2>`: "An AI co-pilot for your clients' books." — Bricolage 700/34px, white.
- `<p>`: value prop with mascot name inline ("Sofia"/"Yoda").
- Three frosted chips (`background:rgba(255,255,255,.12); backdrop-filter:blur(6px); border-radius:999px`):
  - `<span class="chip-dot d1" />` "Upload yourself or invite clients"
  - `<span class="chip-dot d2" />` "AI-categorized entries"
  - `<span class="chip-dot d3" />` "You approve every account"

Chip dots: 8px circles using `background:var(--d1/d2/d3)`.

### Animations (CSS keyframes in auth.css)

| Keyframe | Applied to | Duration | Notes |
|---|---|---|---|
| `login-float` | `.pug-float` | 13s infinite ease-in-out | translateY ±12px |
| `login-breathe` | `.pug-breathe` | 4s infinite ease-in-out | scaleY 1→1.015→1 |
| `login-ear-sway` | `.earL` / `.earR` | 6s/7s infinite ease-in-out | rotate ±3deg |
| `login-antenna` | `.antenna` | 2.4s infinite ease-in-out | scale 1→1.25→1 |
| `login-sparkle` | `.spark` | 3s/4s/3.5s/4.5s infinite | opacity + scale, staggered |
| `login-bounce` | `.pug-float.is-happy` | 0.5s 2 ease-in-out | translateY -18px bounce |

All keyframe blocks wrapped in `@media (prefers-reduced-motion: no-preference)`.

---

## Section 4 — Interactions & Responsive

### Theme toggle

`mascot` state drives both the mascot variant and the body class. On change:
```ts
useEffect(() => {
  document.body.classList.remove('theme-sofia', 'theme-yoda')
  document.body.classList.add('theme-' + mascot)
  localStorage.setItem('sofia_login_theme', mascot)
  return () => document.body.classList.remove('theme-sofia', 'theme-yoda')
}, [mascot])
```

On mount, read `localStorage.getItem('sofia_login_theme')` to initialize `mascot` state.

### Password peek

```ts
const peeking = focus === 'password' && !showPw
```

Passed as prop to `PugMascot`. Clicking "Show" sets `showPw(true)`, which immediately clears `peeking` before the blur event fires.

### Submit flow

```ts
const onSubmit = async (values) => {
  setStatus('loading')
  try {
    const user = await login(values.identifier, values.password)
    setStatus('success')
    setTimeout(() => router.push(`/${user.role}/dashboard`), 1500)
  } catch (err) {
    setStatus('idle')
    if (isAxiosError(err) && err.response?.status === 403) {
      router.push('/blocked')
    } else {
      setError('Invalid credentials. Please check your details and try again.')
    }
  }
}
```

### Responsive ≤920px

```css
@media (max-width: 920px) {
  .shell      { flex-direction: column }
  .art-pane   { order: -1; min-height: 420px; flex: none }
  .pug-svg    { width: 240px; height: auto }
  .form-pane  { padding: 32px 24px }
  .art-title  { font-size: 27px }
  .chips      { flex-wrap: wrap }
}
```

---

## Out of Scope

- "Forgot?" and "Ask your firm admin" links — wired to `#` for now, no reset flow yet.
- The setup and blocked pages — they keep their existing layout and are unaffected by the theme classes (the `useEffect` cleanup removes body classes on unmount).
- Any changes to `globals.css` or the Tailwind token system.
