# Dashboard Redesign — Design Spec

**Date:** 2026-06-03
**Status:** Approved
**Reference:** `design_handoff_dashboard/README.md`, `design_handoff_dashboard/src/variants.jsx` (VariantA), `design_handoff_dashboard/src/atoms.jsx`, `design_handoff_dashboard/src/pug.jsx`

---

## Problem

The current accountant dashboard (`/accountant/dashboard`) is a minimal, unstyled Tailwind page with no brand identity, no theme system, no mascot, and a plain 48px topbar shared across all roles. The design handoff defines a high-fidelity "command center" dashboard with a redesigned nav, Sofia/Yoda theme system, priority tier cards, a mascot companion, and a clients table with per-tier counts.

---

## Solution

Implement Option A ("Top-bar focus") from the design handoff. Replace the accountant layout's `<Topbar />` with a new `AccountantTopbar`, implement Sofia/Yoda design tokens via CSS custom properties, and rewrite the dashboard page content. All accountant pages (`/accountant/*`) gain the new nav; the dashboard page gets the full new layout.

---

## Files Changed

| File | Change |
|---|---|
| `frontend/src/app/accountant/layout.tsx` | Add `accountant.css` import; add `data-theme` wrapper with localStorage-persisted theme state; replace `<Topbar />` with `<AccountantTopbar />` |
| `frontend/src/app/accountant/dashboard/page.tsx` | Full rewrite — greeting row, tier cards grid, clients+week rail |
| `frontend/src/app/accountant/accountant.css` | New — Sofia/Yoda CSS custom property token sets |
| `frontend/src/components/layout/AccountantTopbar.tsx` | New — 70px themed nav for accountant role |
| `frontend/src/components/dashboard/ThemeContext.tsx` | New — thin React context for sharing theme state from layout to pages |
| `frontend/src/components/dashboard/ThemeToggle.tsx` | New — segmented Sofia/Yoda pill with animated sliding thumb |
| `frontend/src/components/dashboard/TierCard.tsx` | New — priority tier card (dot + label + big number + pill + note) |
| `frontend/src/components/dashboard/MascotCompanion.tsx` | New — card-layout wrapper around PugMascot |
| `frontend/src/components/dashboard/ClientsTable.tsx` | New — 8-column dashboard client grid with TierChip cells |
| `frontend/src/components/dashboard/WeekStat.tsx` | New — stacked value/label/sub stat |

**Minimally changed:**
- `frontend/src/components/login/PugMascot.tsx` — add optional `size` prop only; login page unaffected
- `frontend/src/components/layout/Topbar.tsx` — still used for admin and client roles
- All other accountant pages — pick up the new nav automatically

---

## Section 1 — Theme System

### CSS custom properties (`accountant.css`)

Imported in `accountant/layout.tsx`. Defines all design tokens on attribute selectors:

```css
[data-theme="sofia"] {
  --surface:        #F6F1E9;
  --card:           #FFFFFF;
  --card-alt:       #FBF7F1;
  --ink:            #2A2433;
  --muted:          #8A8295;
  --faint:          #B4AEC0;
  --line:           #ECE4D8;
  --line-soft:      #F2EBE0;
  --primary:        #E2568C;
  --primary-deep:   #C53C76;
  --primary-soft:   #FBE6EF;
  --chip-bg:        #F6F1E9;
  --nav-bg:         rgba(255,255,255,0.86);
  --field-bg:       #F6F1E9;
  --accent-glow:    #FFADD2;
  --shadow:         0 1px 2px rgba(42,28,60,.04), 0 14px 34px -18px rgba(42,28,60,.18);
  /* Tier tokens */
  --tier-review-fg:  #C2553D; --tier-review-bg:  #F7E5DD; --tier-review-ring:  #EBCBBE;
  --tier-check-fg:   #A9791A; --tier-check-bg:   #F6ECD4; --tier-check-ring:   #E8D5A6;
  --tier-ready-fg:   #3C8E6C; --tier-ready-bg:   #DEEEE5; --tier-ready-ring:   #BCDFCD;
  --tier-pending-fg: #6A5ECF; --tier-pending-bg: #E9E3F8; --tier-pending-ring: #D3C9EF;
}

[data-theme="yoda"] {
  --surface:        #13111C;
  --card:           #1C1928;
  --card-alt:       #211D2E;
  --ink:            #ECEAF2;
  --muted:          #9A93AE;
  --faint:          #6E6880;
  --line:           #2C2838;
  --line-soft:      #252132;
  --primary:        #7C9CFF;
  --primary-deep:   #5B7CF0;
  --primary-soft:   rgba(124,156,255,.14);
  --chip-bg:        #211D2E;
  --nav-bg:         rgba(22,20,32,0.82);
  --field-bg:       #211D2E;
  --accent-glow:    #AFC4FF;
  --shadow:         0 1px 2px rgba(0,0,0,.3), 0 18px 40px -20px rgba(0,0,0,.6);
  /* Tier tokens */
  --tier-review-fg:  #F0987B; --tier-review-bg:  rgba(225,120,90,.15);  --tier-review-ring:  rgba(225,120,90,.32);
  --tier-check-fg:   #E8C06B; --tier-check-bg:   rgba(220,175,80,.14);  --tier-check-ring:   rgba(220,175,80,.30);
  --tier-ready-fg:   #6FD6A6; --tier-ready-bg:   rgba(80,200,150,.14);  --tier-ready-ring:   rgba(80,200,150,.30);
  --tier-pending-fg: #A6B7FF; --tier-pending-bg: rgba(124,156,255,.16); --tier-pending-ring: rgba(124,156,255,.34);
}

[data-theme="sofia"],
[data-theme="yoda"] {
  transition: background-color .5s, color .5s, border-color .5s;
}
```

### Theme state

`accountant/layout.tsx` owns `theme: 'sofia' | 'yoda'` state. On mount: read from `localStorage.getItem('sofia_theme')`. On change: write `localStorage.setItem('sofia_theme', theme)`. The layout's root `<div>` carries `data-theme={theme}` and `style={{ background: 'var(--surface)', minHeight: '100vh' }}`.

Theme is passed as `theme` + `setTheme` props to `AccountantTopbar`. A thin `ThemeContext` (created in a new `frontend/src/components/dashboard/ThemeContext.tsx`) is also provided at the layout level so the dashboard page can read `theme` without prop-drilling through `children`. The context value is `{ theme: 'sofia' | 'yoda', setTheme }`. Only the topbar and dashboard page consume it.

### Typography

Fonts are already loaded via `next/font/google` in `app/layout.tsx` (added for the login redesign): `--font-display` (Bricolage Grotesque) and `--font-body` (Plus Jakarta Sans). No changes needed.

---

## Section 2 — AccountantTopbar

`frontend/src/components/layout/AccountantTopbar.tsx`

**Props:**
```ts
interface AccountantTopbarProps {
  theme: 'sofia' | 'yoda'
  setTheme: (t: 'sofia' | 'yoda') => void
}
```

**Structure:** `<header>` — `height: 70px`, `padding: 0 36px`, `border-bottom: 1px solid var(--line)`, `background: var(--nav-bg)`, `backdrop-filter: blur(10px)`, `position: sticky`, `top: 0`, `z-index: 10`. Flex row, `gap: 28px`, `align-items: center`.

**Brand mark** (left): Gradient rounded square (34×34, `border-radius: 10px`, `background: linear-gradient(150deg, var(--primary), var(--primary-deep))`) containing the paw-print SVG (4 white circles: body `cx=12 cy=14.6 r=5.1`; toes `cx=6.4/12/17.6 cy=8.6/6.1/8.6 r=2.25`). "Sofia Books" wordmark in `font-family: var(--font-display)`, 700/17px, `color: var(--ink)`. Wraps in `<Link href="/accountant/dashboard">`.

**Nav links** — same 5 routes as the current Topbar's `ACCOUNTANT_LINKS`. Each link:
- Active: `fontWeight: 700`, `color: var(--primary)`, `background: var(--primary-soft)`, `padding: 8px 14px`, `borderRadius: 10px`
- Inactive: `fontWeight: 600`, `color: var(--muted)`, transparent background
- Queue badge: pill, `background: var(--tier-review-fg)`, white text, 11px/800. Queue count uses the same `sofia:queue-count-changed` custom event listener from the existing Topbar.

**Spacer** (`flex: 1`).

**Right side (left→right):**
1. `ThemeToggle` — receives `theme` + `setTheme` props
2. Bell `IconBtn` — 40×40, `borderRadius: 11px`, `border: 1px solid var(--line)`, `background: var(--card)`. Lucide `Bell` icon at 19px in `var(--muted)`. Notification dot: 7px circle, `background: var(--primary)`, `border: 2px solid var(--card)`, top-right. Wraps the existing `NotificationBell` logic.
3. `Avatar` — 38×38, `borderRadius: 11px`, initials from `user?.name` (first two words, uppercased), `color: var(--primary)`, `background: var(--primary-soft)`, `border: 1px solid var(--line)`, 13px/800. Clicking opens the same logout/settings dropdown as the existing Topbar (same `menuRef` + `handleLogout` pattern).

**ThemeToggle component:**
`role="tablist"`. Outer track: `background: theme === 'sofia' ? '#EFE7DA' : '#211D2E'`, `border: 1px solid var(--line)`, `borderRadius: 999px`, `padding: 4px`. Absolutely-positioned sliding thumb: `width: calc(50% - 4px)`, `background: linear-gradient(150deg, var(--primary), var(--primary-deep))`, `transform: translateX(0)` (Sofia) / `translateX(100%)` (Yoda), `transition: transform .32s cubic-bezier(.34,1.3,.5,1)`. Two `<button role="tab">` — "Sofia" / "Yoda", 12.5px/700, active tab white, inactive `var(--muted)`.

---

## Section 3 — Dashboard Page

`frontend/src/app/accountant/dashboard/page.tsx` — `'use client'`

### Data fetching

Same three queries as the current dashboard:
```ts
useQuery({ queryKey: ['accountant-queue'],           queryFn: getQueue })
useQuery({ queryKey: ['accountant-pending-entries'], queryFn: () => getEntries({ status: 'PENDING' }) })
useQuery({ queryKey: ['accountant-clients'],         queryFn: getAccountantClients })
```

### Tier data mapping

| Design label | Count | Note |
|---|---|---|
| Needs review | `queue.filter(i => i.flag === 'RED').length` | "Anomalies flagged by AI" |
| Check needed | `queue.filter(i => i.flag === 'YELLOW').length` | "Missing receipt · OCR retry" |
| Ready to approve | `queue.filter(i => i.flag === 'GREEN').length` | "Pre-sorted for batch sign-off" |
| Pending entries | `pending.length` | "Awaiting admin approval" |

### Layout

Root: `<div style={{ padding: '30px 36px', display: 'flex', flexDirection: 'column', gap: 22, flex: 1, minHeight: 0 }}>`. Three child rows:

**Row 1 — Greeting + Mascot**

Flex row, `gap: 24px`, `align-items: center`.

- Left (`flex: 1`): `<h1>` "Good morning, {firstName}" — `fontFamily: 'var(--font-display)'`, 800/34px, `letterSpacing: '-.025em'`, `color: var(--ink)`. `firstName` is `user?.name?.split(' ')[0] ?? 'there'`. Sub-line `<p>` in `var(--muted)`, 14.5px: `{today} · {clients.length} active clients · {totalQueueCount} items in your queue`. `today` formatted as "Tuesday, June 3, 2026" via `toLocaleDateString('en-US', { weekday:'long', month:'long', day:'numeric', year:'numeric' })`. `totalQueueCount` = `queue?.length ?? 0`.
- Right (`width: 430px`, `flex: 'none'`): `MascotCompanion` card — gradient panel `linear-gradient(150deg, var(--primary-soft), var(--card))`, `border: 1px solid var(--line)`, `borderRadius: 20px`, `padding: 18px 20px`, `boxShadow: var(--shadow)`. Contains `PugMascot` at `width={108}` (controlled via `viewBox` scale), `variant={theme}`, `accent` and `accentGlow` as literal strings: Sofia → `accent='#E2568C' accentGlow='#FFADD2'`; Yoda → `accent='#7C9CFF' accentGlow='#AFC4FF'`. Green online dot (7px, `#3C8E6C`) + "{Sofia|Yoda} · your AI co-pilot" label in `var(--primary)` 12.5px/700. Brief line: `"2 entries need your eyes — I've sorted the rest into batches."` (static for now).

**Row 2 — Tier Cards**

`display: 'grid'`, `gridTemplateColumns: 'repeat(4,1fr)'`, `gap: 16px`.

Four `TierCard` components. Each card:
- Container: `background: var(--card)`, `border: 1px solid var(--line)`, `borderRadius: 18px`, `padding: 20px 22px`, `boxShadow: var(--shadow)`
- Header row: 9px dot (`background: var(--tier-{key}-fg)`, `boxShadow: 0 0 0 4px var(--tier-{key}-bg)`) + label in `var(--muted)` 12.5px/600
- Count: Bricolage Grotesque 800/42px, `color: var(--tier-{key}-fg)`, `letterSpacing: '-.03em'`
- Status pill: "open" or "all clear" (when count === 0). `color: var(--tier-{key}-fg)`, `background: var(--tier-{key}-bg)`, `border: 1px solid var(--tier-{key}-ring)`, `borderRadius: 999px`, 11px/700, `padding: 3px 9px`
- Footer note: `<p>` in `var(--faint)` 12.5px

**Row 3 — Clients + Week Rail**

`display: 'grid'`, `gridTemplateColumns: '1fr 320px'`, `gap: 16px`, `flex: 1`, `minHeight: 0`.

**Left — My Clients panel:**
- Card: `background: var(--card)`, `border: 1px solid var(--line)`, `borderRadius: 20px`, `padding: 20px 14px 8px`, `boxShadow: var(--shadow)`
- Header row: "My Clients" h2 (Bricolage 700/18px) + faux search field (Lucide `Search` 15px + "Search clients" text, `background: var(--field-bg)`, `border: 1px solid var(--line)`, `borderRadius: 10px`, `padding: 7px 12px`, `color: var(--faint)`) + "View all →" link (`color: var(--primary)`, 13.5px/700, Lucide `ArrowRight` 15px) → `/accountant/clients`
- `ClientsTable` component below

**ClientsTable** — 8-column CSS grid: `gridTemplateColumns: '1.7fr .8fr .8fr 64px 64px 64px 64px .9fr'` (Business, Type, Plan, Review, Check, Ready, Pending, Active).

Header: 11px/700, `letterSpacing: '.05em'`, `textTransform: 'uppercase'`. Business/Type/Plan headers in `var(--faint)`. Tier column headers colored by tier: `var(--tier-{key}-fg)`.

Rows: `padding: 14px 18px`, `borderTop: 1px solid var(--line-soft)`, alternating `background: var(--card-alt)` on even rows, `borderRadius: 12px`. Clicking a row navigates to `/accountant/clients/{id}`.

Per-client tier counts computed inline from the already-fetched `queue` and `pending` arrays (same logic as current dashboard). "Active" column: `lastActive` field from the client API response; if absent, show "—".

**TierChip** (used in table cells): `minWidth: 24px`, `height: 24px`, `borderRadius: 8px`, 12.5px/700, `color: var(--tier-{key}-fg)`, `background: var(--tier-{key}-bg)`, `border: 1px solid var(--tier-{key}-ring)`. Renders "—" in `var(--faint)` when count is 0.

**Right — aside** (flex column, `gap: 16px`):

"This week" card (`flex: 1`): `background: var(--card)`, `border: 1px solid var(--line)`, `borderRadius: 20px`, `padding: 20px 22px`, `boxShadow: var(--shadow)`. Header: Lucide `Sparkles` icon in `var(--primary)` + "This week" in Bricolage 700/16px. Three `WeekStat` components (flex column, `gap: 18px`):
- **312** / "Entries processed" / "across 5 clients" — value in `var(--primary)`
- **96%** / "Auto-categorized" / "accepted as suggested"
- **4.2h** / "Time saved" / "vs. manual entry"

All three are **hardcoded placeholders** — no backend endpoint exists for weekly aggregates. `// TODO: wire to real weekly stats API` marks the spot.

`WeekStat` structure: value in Bricolage 800/26px, label in 12.5px/600 `var(--ink)`, sub in 11.5px `var(--faint)`.

"Go to Queue →" button (full width): `background: linear-gradient(150deg, var(--primary), var(--primary-deep))`, white text, `borderRadius: 12px`, `padding: 12px 20px`, `boxShadow: 0 12px 22px -12px var(--primary-deep)`. Lucide `ArrowRight` 17px. Routes to `/accountant/queue`.

---

## Section 4 — Responsive

```css
@media (max-width: 1100px) {
  .dash-bottom-grid { grid-template-columns: 1fr; }
}
@media (max-width: 768px) {
  .dash-tier-grid { grid-template-columns: repeat(2, 1fr); }
}
```

Applied via `className` on the grid divs; the CSS rules live in `accountant.css`.

---

## Section 5 — PugMascot Sizing

The existing `PugMascot` renders at `width="320" height="369"` (from the login page). In the dashboard `MascotCompanion` card it needs to render at ~108px. Scale via a wrapping div with `width: 108px`, `overflow: 'hidden'` and the SVG's natural aspect ratio, or pass explicit `width`/`height` props. Since `PugMascot` hardcodes `width="320"` in the SVG element, add an optional `size` prop (defaults to 320) that overrides the SVG `width`/`height` while keeping `viewBox="0 0 260 300"` — this maintains proportional scaling. This is the only change to `frontend/src/components/login/PugMascot.tsx`; the login page is unaffected (it omits `size` and gets the default).

---

## Out of Scope

- Weekly stats API endpoint — placeholders used
- The "Search clients" field — faux/non-interactive (no filter logic)
- Hover/focus/active states beyond Tailwind defaults
- The client and admin roles — `Topbar` unchanged for them
- Any changes to `globals.css` or the Tailwind token system
