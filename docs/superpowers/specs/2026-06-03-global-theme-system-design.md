# Global Theme System — Design Spec

**Date:** 2026-06-03
**Status:** Approved

---

## Problem

The Sofia/Yoda theme toggle exists only in the accountant layout. The admin and client roles, and all shared components (`QueuePageContent`, `ReviewPanel`, `BIRBooksView`, etc.), use hardcoded Tailwind classes (`bg-white`, `text-gray-900`, `bg-indigo-600`) that don't respond to the theme. All roles should share the same toggle and all pages/components should respond to it.

A secondary issue: `accountant.css` defines `--card`, `--muted`, `--primary` etc. which collide with shadcn's HSL-format variables in `globals.css`. These must be renamed to avoid breaking shadcn components.

---

## Solution

Lift the theme system to root level. Rename all theme CSS variables with a `--t-` prefix. Add matching Tailwind color aliases so all pages stay in the Tailwind class paradigm. Add the ThemeToggle to the shared `Topbar` so all roles can switch themes.

---

## Files Changed

| File | Change |
|---|---|
| `src/styles/theme.css` | New — renamed from `accountant.css`; all vars prefixed `--t-`; `:root` fallback added |
| `src/app/globals.css` | Add `@import '../styles/theme.css'` |
| `src/app/accountant/accountant.css` | Deleted |
| `src/app/accountant/layout.tsx` | Remove theme state, data-theme div, ThemeContext, accountant.css import — just render AccountantTopbar |
| `src/components/layout/ThemeProvider.tsx` | New — client component; owns theme state + localStorage; wraps children in `<div data-theme={theme}>`; exports ThemeContext |
| `src/components/layout/ThemeToggle.tsx` | Moved from `src/components/dashboard/ThemeToggle.tsx` |
| `src/components/dashboard/ThemeContext.tsx` | Deleted — replaced by ThemeProvider |
| `src/app/layout.tsx` | Wrap children with `<ThemeProvider>` |
| `src/components/layout/Topbar.tsx` | Add `<ThemeToggle />` before the avatar button |
| `src/components/layout/AccountantTopbar.tsx` | Remove `<ThemeToggle />` (now in shared Topbar) |
| `tailwind.config.ts` | Add `t-*` colors under `extend.colors` |
| All accountant, admin, client pages | Migrate hardcoded Tailwind colors → `t-*` aliases |
| All shared components | Migrate hardcoded Tailwind colors → `t-*` aliases |
| Dashboard page + dashboard components | Rename inline `var(--ink)` etc. → `var(--t-ink)` etc. |

---

## Section 1 — CSS Token System

`accountant.css` becomes `src/styles/theme.css`. All variable names get a `--t-` prefix to avoid collision with shadcn's `globals.css` variables (which use the same names in HSL format).

A `:root` fallback is added mirroring Sofia values so no flash occurs before JS hydrates:

```css
:root {
  --t-surface:      #F6F1E9;
  --t-card:         #FFFFFF;
  --t-ink:          #2A2433;
  --t-muted:        #8A8295;
  --t-faint:        #B4AEC0;
  --t-line:         #ECE4D8;
  --t-primary:      #E2568C;
  --t-primary-deep: #C53C76;
  /* ...all other tokens defaulting to Sofia values */
}

[data-theme="sofia"] {
  --t-surface:      #F6F1E9;
  --t-card:         #FFFFFF;
  --t-card-alt:     #FBF7F1;
  --t-ink:          #2A2433;
  --t-muted:        #8A8295;
  --t-faint:        #B4AEC0;
  --t-line:         #ECE4D8;
  --t-line-soft:    #F2EBE0;
  --t-primary:      #E2568C;
  --t-primary-deep: #C53C76;
  --t-primary-soft: #FBE6EF;
  --t-chip-bg:      #F6F1E9;
  --t-nav-bg:       rgba(255, 255, 255, 0.86);
  --t-field-bg:     #F6F1E9;
  --t-accent-glow:  #FFADD2;
  --t-shadow:       0 1px 2px rgba(42,28,60,.04), 0 14px 34px -18px rgba(42,28,60,.18);
  --t-tier-review-fg:   #C2553D;
  --t-tier-review-bg:   #F7E5DD;
  --t-tier-review-ring: #EBCBBE;
  --t-tier-check-fg:    #A9791A;
  --t-tier-check-bg:    #F6ECD4;
  --t-tier-check-ring:  #E8D5A6;
  --t-tier-ready-fg:    #3C8E6C;
  --t-tier-ready-bg:    #DEEEE5;
  --t-tier-ready-ring:  #BCDFCD;
  --t-tier-pending-fg:  #6A5ECF;
  --t-tier-pending-bg:  #E9E3F8;
  --t-tier-pending-ring:#D3C9EF;
}

[data-theme="yoda"] {
  --t-surface:      #13111C;
  --t-card:         #1C1928;
  --t-card-alt:     #211D2E;
  --t-ink:          #ECEAF2;
  --t-muted:        #9A93AE;
  --t-faint:        #6E6880;
  --t-line:         #2C2838;
  --t-line-soft:    #252132;
  --t-primary:      #7C9CFF;
  --t-primary-deep: #5B7CF0;
  --t-primary-soft: rgba(124,156,255,0.14);
  --t-chip-bg:      #211D2E;
  --t-nav-bg:       rgba(22,20,32,0.82);
  --t-field-bg:     #211D2E;
  --t-accent-glow:  #AFC4FF;
  --t-shadow:       0 1px 2px rgba(0,0,0,.3), 0 18px 40px -20px rgba(0,0,0,.6);
  --t-tier-review-fg:   #F0987B;
  --t-tier-review-bg:   rgba(225,120,90,0.15);
  --t-tier-review-ring: rgba(225,120,90,0.32);
  --t-tier-check-fg:    #E8C06B;
  --t-tier-check-bg:    rgba(220,175,80,0.14);
  --t-tier-check-ring:  rgba(220,175,80,0.30);
  --t-tier-ready-fg:    #6FD6A6;
  --t-tier-ready-bg:    rgba(80,200,150,0.14);
  --t-tier-ready-ring:  rgba(80,200,150,0.30);
  --t-tier-pending-fg:  #A6B7FF;
  --t-tier-pending-bg:  rgba(124,156,255,0.16);
  --t-tier-pending-ring:rgba(124,156,255,0.34);
}

[data-theme="sofia"],
[data-theme="yoda"] {
  transition: background-color 0.5s, color 0.5s, border-color 0.5s;
}

/* Dashboard responsive breakpoints */
@media (max-width: 1100px) {
  .dash-bottom-grid { grid-template-columns: 1fr !important; }
}
@media (max-width: 768px) {
  .dash-tier-grid { grid-template-columns: repeat(2, 1fr) !important; }
}
```

`globals.css` adds at the top (after Tailwind directives):

```css
@import '../styles/theme.css';
```

---

## Section 2 — Root ThemeProvider

New file `src/components/layout/ThemeProvider.tsx`:

```tsx
'use client'

import { createContext, useContext, useState, useEffect } from 'react'

type Theme = 'sofia' | 'yoda'
interface ThemeCtx { theme: Theme; setTheme: (t: Theme) => void }

const ThemeContext = createContext<ThemeCtx>({ theme: 'sofia', setTheme: () => {} })
export const useTheme = () => useContext(ThemeContext)

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>('sofia')

  useEffect(() => {
    const saved = localStorage.getItem('sofia_theme')
    if (saved === 'sofia' || saved === 'yoda') setThemeState(saved)
  }, [])

  const setTheme = (t: Theme) => {
    setThemeState(t)
    localStorage.setItem('sofia_theme', t)
  }

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      <div data-theme={theme} style={{ minHeight: '100vh', display: 'contents' }}>
        {children}
      </div>
    </ThemeContext.Provider>
  )
}
```

Note: `display: contents` on the wrapper div means it adds no layout box — the `data-theme` attribute is present for CSS cascade without affecting flex/grid layout.

`src/app/layout.tsx` imports and wraps:

```tsx
import { ThemeProvider } from '@/components/layout/ThemeProvider'
// ...
<ThemeProvider>
  {children}
  <Toaster />
</ThemeProvider>
```

`src/app/accountant/layout.tsx` becomes a server component — it removes all theme state, the `data-theme` div, and the `accountant.css` import. It renders only `<AccountantTopbar />` and `<main>{children}</main>`.

`src/components/dashboard/ThemeContext.tsx` is deleted. All imports of `useTheme` point to `@/components/layout/ThemeProvider`.

---

## Section 3 — Tailwind Semantic Aliases

`tailwind.config.ts` adds under `theme.extend.colors`:

```ts
't-surface':       'var(--t-surface)',
't-card':          'var(--t-card)',
't-card-alt':      'var(--t-card-alt)',
't-ink':           'var(--t-ink)',
't-muted':         'var(--t-muted)',
't-faint':         'var(--t-faint)',
't-line':          'var(--t-line)',
't-line-soft':     'var(--t-line-soft)',
't-primary':       'var(--t-primary)',
't-primary-deep':  'var(--t-primary-deep)',
't-primary-soft':  'var(--t-primary-soft)',
't-field-bg':      'var(--t-field-bg)',
't-chip-bg':       'var(--t-chip-bg)',
```

These do not touch any existing shadcn color names. Shadcn components continue using `hsl(var(--primary))` etc. from `:root` in `globals.css`.

Migration mapping for all pages and components:

| Tailwind class | Replace with |
|---|---|
| `bg-white` | `bg-t-card` |
| `bg-gray-50` | `bg-t-surface` |
| `bg-gray-100` | `bg-t-surface` |
| `hover:bg-gray-50` | `hover:bg-t-surface` |
| `text-gray-900` | `text-t-ink` |
| `text-gray-700` | `text-t-ink` |
| `text-gray-500` | `text-t-muted` |
| `text-gray-400` | `text-t-faint` |
| `text-gray-300` | `text-t-faint` |
| `border-gray-200` | `border-t-line` |
| `border-gray-100` | `border-t-line` |
| `bg-indigo-600` / `bg-indigo-700` | `bg-t-primary` |
| `text-indigo-600` | `text-t-primary` |
| `border-indigo-*` | `border-t-primary` |
| `hover:bg-indigo-700` | `hover:bg-t-primary-deep` |
| `focus:border-indigo-300` | `focus:border-t-primary` |

Gray classes used for semantic roles other than surface/ink/line (e.g., `bg-red-100 text-red-800` status badges) are **not** migrated — they are intentional semantic colors, not theme-surface colors.

---

## Section 4 — ThemeToggle in Shared Topbar

`src/components/dashboard/ThemeToggle.tsx` moves to `src/components/layout/ThemeToggle.tsx`. Its `useTheme` import updates to `@/components/layout/ThemeProvider`.

`src/components/layout/AccountantTopbar.tsx` removes its `<ThemeToggle />` import and usage.

`src/components/layout/Topbar.tsx` adds `<ThemeToggle />` between the notification bell and avatar button. It imports `useTheme` from `@/components/layout/ThemeProvider`.

---

## Section 5 — Migration Scope

### Inline style var renames (dashboard components — find/replace only)
- `src/app/accountant/dashboard/page.tsx` — `var(--ink)` → `var(--t-ink)`, `var(--card)` → `var(--t-card)`, etc.
- `src/components/dashboard/TierCard.tsx`
- `src/components/dashboard/ClientsTable.tsx`
- `src/components/dashboard/WeekStat.tsx`
- `src/components/dashboard/MascotCompanion.tsx`
- `src/components/layout/AccountantTopbar.tsx`

### Tailwind class migration (all other pages and shared components)

**Accountant pages:**
- `src/app/accountant/clients/page.tsx`
- `src/app/accountant/adjusting-entries/page.tsx`
- `src/app/accountant/reports/page.tsx`
- `src/app/accountant/settings/page.tsx`
- `src/app/accountant/queue/page.tsx` (wraps `QueuePageContent`)
- `src/app/accountant/queue/[id]/page.tsx`
- `src/app/accountant/reports/bir/page.tsx`
- `src/app/accountant/reports/[clientId]/income-statement/page.tsx`
- `src/app/accountant/reports/[clientId]/expense-breakdown/page.tsx`

**Admin pages:**
- `src/app/admin/layout.tsx`
- `src/app/admin/dashboard/page.tsx`
- `src/app/admin/clients/page.tsx` and sub-pages
- `src/app/admin/accountants/page.tsx` and sub-pages
- `src/app/admin/billing/page.tsx` and sub-pages
- `src/app/admin/queue/page.tsx` and `[id]/page.tsx`
- `src/app/admin/reports/page.tsx` and sub-pages
- `src/app/admin/adjusting-entries/page.tsx` and sub-pages
- `src/app/admin/settings/page.tsx`

**Client pages:**
- `src/app/client/layout.tsx`
- `src/app/client/dashboard/page.tsx`
- `src/app/client/documents/page.tsx`
- `src/app/client/upload/page.tsx`
- `src/app/client/reports/page.tsx` and sub-pages
- `src/app/client/settings/page.tsx`
- `src/app/client/returned/page.tsx`

**Shared components:**
- `src/components/layout/Topbar.tsx`
- `src/components/layout/NotificationBell.tsx`
- `src/components/queue/QueuePageContent.tsx`
- `src/components/queue/ReviewPanel.tsx`
- `src/components/reports/BIRBooksView.tsx`
- `src/components/reports/IncomeStatementTable.tsx`
- `src/components/reports/ReportToolbar.tsx`
- `src/components/reports/ExportPDFButton.tsx`
- `src/components/adjusting-entries/NewEntryModal.tsx` and related

### Not migrated
- shadcn UI primitives (`src/components/ui/`) — internal styles use shadcn vars, untouched
- Status badge colors (`bg-red-100 text-red-800`, `bg-green-100 text-green-800`, etc.) — semantic, intentional, not surface colors

---

## Error Handling

No runtime errors expected. The `:root` fallback in `theme.css` ensures CSS vars resolve even before JS hydrates, so no unstyled flash. If `localStorage` is unavailable (SSR), the `useState` default of `'sofia'` is used.

---

## Testing

- Toggle Sofia/Yoda on each role (accountant, admin, client) and verify background, text, borders, and nav all update.
- Verify shadcn components (dialogs, dropdowns, buttons from `components/ui/`) are unaffected by theme toggle.
- Verify localStorage persists theme across page refreshes.
- Verify no flash of unstyled content on hard reload.
