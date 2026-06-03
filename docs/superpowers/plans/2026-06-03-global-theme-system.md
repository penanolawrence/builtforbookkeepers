# Global Theme System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Lift the Sofia/Yoda theme toggle to root level so all roles (accountant, admin, client) and all shared components respond to theme changes.

**Architecture:** A root-level `ThemeProvider` client component wraps the entire app in `<div data-theme={theme}>`. CSS custom properties (prefixed `--t-`) are defined per theme in `theme.css` and imported globally. Tailwind receives matching semantic aliases (`t-card`, `t-ink`, `t-primary`, etc.) so all pages migrate by replacing Tailwind color classes, not by switching to inline styles. The existing `accountant.css` vars are renamed with `--t-` prefix to avoid collision with shadcn's HSL-format vars in `globals.css`.

**Tech Stack:** Next.js 14 App Router, TypeScript, Tailwind CSS, CSS custom properties, localStorage

---

## File Map

| Action | File |
|---|---|
| Create | `frontend/src/styles/theme.css` |
| Modify | `frontend/src/app/globals.css` |
| Delete | `frontend/src/app/accountant/accountant.css` |
| Create | `frontend/src/components/layout/ThemeProvider.tsx` |
| Move + edit | `frontend/src/components/dashboard/ThemeToggle.tsx` → `frontend/src/components/layout/ThemeToggle.tsx` |
| Delete | `frontend/src/components/dashboard/ThemeContext.tsx` |
| Modify | `frontend/src/app/layout.tsx` |
| Modify | `frontend/src/app/accountant/layout.tsx` |
| Modify | `frontend/src/components/layout/AccountantTopbar.tsx` |
| Modify | `frontend/src/components/layout/Topbar.tsx` |
| Modify | `frontend/tailwind.config.ts` |
| Modify (var rename) | `frontend/src/app/accountant/dashboard/page.tsx` |
| Modify (var rename) | `frontend/src/components/dashboard/TierCard.tsx` |
| Modify (var rename) | `frontend/src/components/dashboard/ClientsTable.tsx` |
| Modify (var rename) | `frontend/src/components/dashboard/WeekStat.tsx` |
| Modify (var rename) | `frontend/src/components/dashboard/MascotCompanion.tsx` |
| Modify (var rename) | `frontend/src/components/layout/AccountantTopbar.tsx` |
| Migrate (Tailwind) | All accountant, admin, client pages + shared components listed in spec |

---

### Task 1: Create `src/styles/theme.css`

**Files:**
- Create: `frontend/src/styles/theme.css`

- [ ] **Step 1: Create the file**

Create `frontend/src/styles/theme.css` with the full contents below. This renames all vars from `--foo` to `--t-foo` and adds a `:root` fallback to prevent a flash of unstyled content before JS hydrates.

```css
/* ─── Default (sofia values — loaded before JS hydrates) ──────────────── */
:root {
  --t-surface:           #F6F1E9;
  --t-card:              #FFFFFF;
  --t-card-alt:          #FBF7F1;
  --t-ink:               #2A2433;
  --t-muted:             #8A8295;
  --t-faint:             #B4AEC0;
  --t-line:              #ECE4D8;
  --t-line-soft:         #F2EBE0;
  --t-primary:           #E2568C;
  --t-primary-deep:      #C53C76;
  --t-primary-soft:      #FBE6EF;
  --t-chip-bg:           #F6F1E9;
  --t-nav-bg:            rgba(255, 255, 255, 0.86);
  --t-field-bg:          #F6F1E9;
  --t-accent-glow:       #FFADD2;
  --t-shadow:            0 1px 2px rgba(42,28,60,.04), 0 14px 34px -18px rgba(42,28,60,.18);
  --t-tier-review-fg:    #C2553D;
  --t-tier-review-bg:    #F7E5DD;
  --t-tier-review-ring:  #EBCBBE;
  --t-tier-check-fg:     #A9791A;
  --t-tier-check-bg:     #F6ECD4;
  --t-tier-check-ring:   #E8D5A6;
  --t-tier-ready-fg:     #3C8E6C;
  --t-tier-ready-bg:     #DEEEE5;
  --t-tier-ready-ring:   #BCDFCD;
  --t-tier-pending-fg:   #6A5ECF;
  --t-tier-pending-bg:   #E9E3F8;
  --t-tier-pending-ring: #D3C9EF;
}

/* ─── Sofia ───────────────────────────────────────────────────────────── */
[data-theme="sofia"] {
  --t-surface:           #F6F1E9;
  --t-card:              #FFFFFF;
  --t-card-alt:          #FBF7F1;
  --t-ink:               #2A2433;
  --t-muted:             #8A8295;
  --t-faint:             #B4AEC0;
  --t-line:              #ECE4D8;
  --t-line-soft:         #F2EBE0;
  --t-primary:           #E2568C;
  --t-primary-deep:      #C53C76;
  --t-primary-soft:      #FBE6EF;
  --t-chip-bg:           #F6F1E9;
  --t-nav-bg:            rgba(255, 255, 255, 0.86);
  --t-field-bg:          #F6F1E9;
  --t-accent-glow:       #FFADD2;
  --t-shadow:            0 1px 2px rgba(42,28,60,.04), 0 14px 34px -18px rgba(42,28,60,.18);
  --t-tier-review-fg:    #C2553D;
  --t-tier-review-bg:    #F7E5DD;
  --t-tier-review-ring:  #EBCBBE;
  --t-tier-check-fg:     #A9791A;
  --t-tier-check-bg:     #F6ECD4;
  --t-tier-check-ring:   #E8D5A6;
  --t-tier-ready-fg:     #3C8E6C;
  --t-tier-ready-bg:     #DEEEE5;
  --t-tier-ready-ring:   #BCDFCD;
  --t-tier-pending-fg:   #6A5ECF;
  --t-tier-pending-bg:   #E9E3F8;
  --t-tier-pending-ring: #D3C9EF;
}

/* ─── Yoda ────────────────────────────────────────────────────────────── */
[data-theme="yoda"] {
  --t-surface:           #13111C;
  --t-card:              #1C1928;
  --t-card-alt:          #211D2E;
  --t-ink:               #ECEAF2;
  --t-muted:             #9A93AE;
  --t-faint:             #6E6880;
  --t-line:              #2C2838;
  --t-line-soft:         #252132;
  --t-primary:           #7C9CFF;
  --t-primary-deep:      #5B7CF0;
  --t-primary-soft:      rgba(124,156,255,0.14);
  --t-chip-bg:           #211D2E;
  --t-nav-bg:            rgba(22,20,32,0.82);
  --t-field-bg:          #211D2E;
  --t-accent-glow:       #AFC4FF;
  --t-shadow:            0 1px 2px rgba(0,0,0,.3), 0 18px 40px -20px rgba(0,0,0,.6);
  --t-tier-review-fg:    #F0987B;
  --t-tier-review-bg:    rgba(225,120,90,0.15);
  --t-tier-review-ring:  rgba(225,120,90,0.32);
  --t-tier-check-fg:     #E8C06B;
  --t-tier-check-bg:     rgba(220,175,80,0.14);
  --t-tier-check-ring:   rgba(220,175,80,0.30);
  --t-tier-ready-fg:     #6FD6A6;
  --t-tier-ready-bg:     rgba(80,200,150,0.14);
  --t-tier-ready-ring:   rgba(80,200,150,0.30);
  --t-tier-pending-fg:   #A6B7FF;
  --t-tier-pending-bg:   rgba(124,156,255,0.16);
  --t-tier-pending-ring: rgba(124,156,255,0.34);
}

/* ─── Transitions ─────────────────────────────────────────────────────── */
[data-theme="sofia"],
[data-theme="yoda"] {
  transition: background-color 0.5s, color 0.5s, border-color 0.5s;
}

/* ─── Dashboard responsive breakpoints ───────────────────────────────── */
@media (max-width: 1100px) {
  .dash-bottom-grid { grid-template-columns: 1fr !important; }
}
@media (max-width: 768px) {
  .dash-tier-grid { grid-template-columns: repeat(2, 1fr) !important; }
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/styles/theme.css
git commit -m "feat: add global theme.css with --t-* prefixed vars and :root fallback"
```

---

### Task 2: Wire `theme.css` into `globals.css`, delete `accountant.css`

**Files:**
- Modify: `frontend/src/app/globals.css`
- Delete: `frontend/src/app/accountant/accountant.css`

- [ ] **Step 1: Add import to globals.css**

Open `frontend/src/app/globals.css`. After the three `@tailwind` directives and before `@layer base`, add:

```css
@import '../styles/theme.css';
```

The top of `globals.css` should look like:

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@import '../styles/theme.css';

@layer base {
  :root {
    /* shadcn vars — untouched */
```

- [ ] **Step 2: Delete accountant.css**

```bash
rm frontend/src/app/accountant/accountant.css
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/app/globals.css
git rm frontend/src/app/accountant/accountant.css
git commit -m "feat: import theme.css globally, remove accountant-scoped css file"
```

---

### Task 3: Create root `ThemeProvider` component

**Files:**
- Create: `frontend/src/components/layout/ThemeProvider.tsx`

- [ ] **Step 1: Create the file**

```tsx
'use client'

import { createContext, useContext, useState, useEffect } from 'react'

type Theme = 'sofia' | 'yoda'

interface ThemeCtx {
  theme: Theme
  setTheme: (t: Theme) => void
}

const ThemeContext = createContext<ThemeCtx>({ theme: 'sofia', setTheme: () => {} })

export function useTheme() {
  return useContext(ThemeContext)
}

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
      <div data-theme={theme} style={{ display: 'contents' }}>
        {children}
      </div>
    </ThemeContext.Provider>
  )
}
```

`display: contents` makes the wrapper div invisible to layout — it contributes `data-theme` to the CSS cascade without adding a flex or block box.

- [ ] **Step 2: Commit**

```bash
git add frontend/src/components/layout/ThemeProvider.tsx
git commit -m "feat: add root ThemeProvider with localStorage persistence"
```

---

### Task 4: Move `ThemeToggle` to `layout/`, delete old `ThemeContext`

**Files:**
- Create: `frontend/src/components/layout/ThemeToggle.tsx` (moved from `dashboard/`)
- Delete: `frontend/src/components/dashboard/ThemeToggle.tsx`
- Delete: `frontend/src/components/dashboard/ThemeContext.tsx`

- [ ] **Step 1: Copy ThemeToggle to new location with updated import**

Read the current `frontend/src/components/dashboard/ThemeToggle.tsx`. Change only the import line at the top — replace the `ThemeContext` import path with the new provider:

```tsx
import { useTheme } from '@/components/layout/ThemeProvider'
```

Everything else in the file stays the same. Save the result as `frontend/src/components/layout/ThemeToggle.tsx`.

- [ ] **Step 2: Delete old files**

```bash
git rm frontend/src/components/dashboard/ThemeToggle.tsx
git rm frontend/src/components/dashboard/ThemeContext.tsx
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/layout/ThemeToggle.tsx
git commit -m "feat: move ThemeToggle to layout/, delete per-layout ThemeContext"
```

---

### Task 5: Wire ThemeProvider into root layout, strip AccountantLayout

**Files:**
- Modify: `frontend/src/app/layout.tsx`
- Modify: `frontend/src/app/accountant/layout.tsx`

- [ ] **Step 1: Update root layout.tsx**

Add the `ThemeProvider` import and wrap children with it. The file should look like:

```tsx
import type { Metadata } from 'next'
import { Bricolage_Grotesque, Plus_Jakarta_Sans } from 'next/font/google'
import './globals.css'
import { QueryProvider } from '@/lib/providers/QueryProvider'
import { SocketProvider } from '@/lib/socket/SocketProvider'
import { Toaster } from '@/components/ui/toaster'
import { ThemeProvider } from '@/components/layout/ThemeProvider'

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
            <ThemeProvider>
              {children}
              <Toaster />
            </ThemeProvider>
          </SocketProvider>
        </QueryProvider>
      </body>
    </html>
  )
}
```

- [ ] **Step 2: Simplify accountant/layout.tsx**

The layout no longer manages theme state — it becomes a plain server component. Replace the entire file with:

```tsx
import { AccountantTopbar } from '@/components/layout/AccountantTopbar'

export default function AccountantLayout({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        background: 'var(--t-surface)',
        color: 'var(--t-ink)',
      }}
    >
      <AccountantTopbar />
      <main style={{ flex: 1, overflow: 'auto' }}>
        {children}
      </main>
    </div>
  )
}
```

Note: no `'use client'`, no useState, no ThemeProvider, no ThemeContext import, no accountant.css import.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/app/layout.tsx frontend/src/app/accountant/layout.tsx
git commit -m "feat: wire ThemeProvider into root layout, strip theme state from AccountantLayout"
```

---

### Task 6: Add ThemeToggle to shared Topbar, remove from AccountantTopbar

**Files:**
- Modify: `frontend/src/components/layout/Topbar.tsx`
- Modify: `frontend/src/components/layout/AccountantTopbar.tsx`

- [ ] **Step 1: Update Topbar.tsx**

Add the `ThemeToggle` import at the top of `Topbar.tsx`:

```tsx
import { ThemeToggle } from './ThemeToggle'
```

In the JSX, add `<ThemeToggle />` between `<NotificationBell />` and the avatar `<div className="relative ml-1.5">` block:

```tsx
{/* Notification bell */}
<NotificationBell />

{/* Theme toggle */}
<ThemeToggle />

{/* Avatar + dropdown */}
<div className="relative ml-1.5" ref={menuRef}>
```

- [ ] **Step 2: Remove ThemeToggle from AccountantTopbar.tsx**

Open `frontend/src/components/layout/AccountantTopbar.tsx`. Remove the `ThemeToggle` import line:

```tsx
// Remove this line:
import { ThemeToggle } from '@/components/dashboard/ThemeToggle'
```

And remove the `<ThemeToggle />` JSX element wherever it appears in the return block. The toggle now comes from the shared `Topbar` — `AccountantTopbar` must not render a second one.

- [ ] **Step 3: Update AccountantTopbar's useTheme import**

`AccountantTopbar` uses `useTheme` to apply `var(--t-nav-bg)` etc. Update its import:

```tsx
import { useTheme } from '@/components/layout/ThemeProvider'
```

- [ ] **Step 4: Commit**

```bash
git add frontend/src/components/layout/Topbar.tsx frontend/src/components/layout/AccountantTopbar.tsx
git commit -m "feat: add ThemeToggle to shared Topbar, remove from AccountantTopbar"
```

---

### Task 7: Add `t-*` color aliases to `tailwind.config.ts`

**Files:**
- Modify: `frontend/tailwind.config.ts`

- [ ] **Step 1: Add color aliases**

In `tailwind.config.ts`, inside `theme.extend.colors`, add the following entries alongside the existing shadcn entries:

```ts
// Theme tokens — map to CSS custom properties set by [data-theme]
't-surface':      'var(--t-surface)',
't-card':         'var(--t-card)',
't-card-alt':     'var(--t-card-alt)',
't-ink':          'var(--t-ink)',
't-muted':        'var(--t-muted)',
't-faint':        'var(--t-faint)',
't-line':         'var(--t-line)',
't-line-soft':    'var(--t-line-soft)',
't-primary':      'var(--t-primary)',
't-primary-deep': 'var(--t-primary-deep)',
't-primary-soft': 'var(--t-primary-soft)',
't-field-bg':     'var(--t-field-bg)',
't-chip-bg':      'var(--t-chip-bg)',
```

The `extend.colors` block ends up as:

```ts
extend: {
  colors: {
    border: "hsl(var(--border))",
    // ...existing shadcn entries...
    't-surface':      'var(--t-surface)',
    't-card':         'var(--t-card)',
    't-card-alt':     'var(--t-card-alt)',
    't-ink':          'var(--t-ink)',
    't-muted':        'var(--t-muted)',
    't-faint':        'var(--t-faint)',
    't-line':         'var(--t-line)',
    't-line-soft':    'var(--t-line-soft)',
    't-primary':      'var(--t-primary)',
    't-primary-deep': 'var(--t-primary-deep)',
    't-primary-soft': 'var(--t-primary-soft)',
    't-field-bg':     'var(--t-field-bg)',
    't-chip-bg':      'var(--t-chip-bg)',
  },
```

- [ ] **Step 2: Commit**

```bash
git add frontend/tailwind.config.ts
git commit -m "feat: add t-* Tailwind color aliases for theme CSS vars"
```

---

### Task 8: Rename inline CSS vars in dashboard components (`--ink` → `--t-ink`)

**Files:**
- Modify: `frontend/src/app/accountant/dashboard/page.tsx`
- Modify: `frontend/src/components/dashboard/TierCard.tsx`
- Modify: `frontend/src/components/dashboard/ClientsTable.tsx`
- Modify: `frontend/src/components/dashboard/WeekStat.tsx`
- Modify: `frontend/src/components/dashboard/MascotCompanion.tsx`
- Modify: `frontend/src/components/layout/AccountantTopbar.tsx`

These files use inline `style={{ color: 'var(--ink)' }}` etc. The var names must be updated to match the renamed CSS vars.

- [ ] **Step 1: Run find-and-replace in each file**

For each file listed above, do a global find-and-replace of the following pairs (order matters — do all at once or in this order):

| Find | Replace |
|---|---|
| `var(--surface)` | `var(--t-surface)` |
| `var(--card-alt)` | `var(--t-card-alt)` |
| `var(--card)` | `var(--t-card)` |
| `var(--ink)` | `var(--t-ink)` |
| `var(--muted)` | `var(--t-muted)` |
| `var(--faint)` | `var(--t-faint)` |
| `var(--line-soft)` | `var(--t-line-soft)` |
| `var(--line)` | `var(--t-line)` |
| `var(--primary-deep)` | `var(--t-primary-deep)` |
| `var(--primary-soft)` | `var(--t-primary-soft)` |
| `var(--primary)` | `var(--t-primary)` |
| `var(--chip-bg)` | `var(--t-chip-bg)` |
| `var(--nav-bg)` | `var(--t-nav-bg)` |
| `var(--field-bg)` | `var(--t-field-bg)` |
| `var(--accent-glow)` | `var(--t-accent-glow)` |
| `var(--shadow)` | `var(--t-shadow)` |
| `var(--tier-review-fg)` | `var(--t-tier-review-fg)` |
| `var(--tier-review-bg)` | `var(--t-tier-review-bg)` |
| `var(--tier-review-ring)` | `var(--t-tier-review-ring)` |
| `var(--tier-check-fg)` | `var(--t-tier-check-fg)` |
| `var(--tier-check-bg)` | `var(--t-tier-check-bg)` |
| `var(--tier-check-ring)` | `var(--t-tier-check-ring)` |
| `var(--tier-ready-fg)` | `var(--t-tier-ready-fg)` |
| `var(--tier-ready-bg)` | `var(--t-tier-ready-bg)` |
| `var(--tier-ready-ring)` | `var(--t-tier-ready-ring)` |
| `var(--tier-pending-fg)` | `var(--t-tier-pending-fg)` |
| `var(--tier-pending-bg)` | `var(--t-tier-pending-bg)` |
| `var(--tier-pending-ring)` | `var(--t-tier-pending-ring)` |

Also update `useTheme` imports in `accountant/dashboard/page.tsx` from `@/components/dashboard/ThemeContext` to `@/components/layout/ThemeProvider`.

- [ ] **Step 2: Verify no old var names remain**

```bash
grep -r "var(--[^t]" frontend/src/app/accountant/dashboard/ frontend/src/components/dashboard/ frontend/src/components/layout/AccountantTopbar.tsx
```

Expected output: empty (no matches).

- [ ] **Step 3: Commit**

```bash
git add frontend/src/app/accountant/dashboard/page.tsx \
        frontend/src/components/dashboard/ \
        frontend/src/components/layout/AccountantTopbar.tsx
git commit -m "feat: rename inline CSS vars to --t-* prefix in dashboard components"
```

---

### Task 9: Migrate accountant pages to `t-*` Tailwind classes

**Files:**
- Modify: `frontend/src/app/accountant/clients/page.tsx`
- Modify: `frontend/src/app/accountant/adjusting-entries/page.tsx`
- Modify: `frontend/src/app/accountant/reports/page.tsx`
- Modify: `frontend/src/app/accountant/settings/page.tsx`
- Modify: `frontend/src/app/accountant/queue/page.tsx`
- Modify: `frontend/src/app/accountant/queue/[id]/page.tsx`
- Modify: `frontend/src/app/accountant/reports/bir/page.tsx`
- Modify: `frontend/src/app/accountant/reports/[clientId]/income-statement/page.tsx`
- Modify: `frontend/src/app/accountant/reports/[clientId]/expense-breakdown/page.tsx`

Apply this substitution table throughout each file. Do NOT replace colors that are semantic (e.g., `bg-red-100 text-red-800` status badges) — only replace surface/text/border colors.

| Find (exact class) | Replace with |
|---|---|
| `bg-white` | `bg-t-card` |
| `bg-gray-50` | `bg-t-surface` |
| `bg-gray-100` | `bg-t-surface` |
| `hover:bg-gray-50` | `hover:bg-t-surface` |
| `text-gray-900` | `text-t-ink` |
| `text-gray-800` | `text-t-ink` |
| `text-gray-700` | `text-t-ink` |
| `text-gray-600` | `text-t-muted` |
| `text-gray-500` | `text-t-muted` |
| `text-gray-400` | `text-t-faint` |
| `text-gray-300` | `text-t-faint` |
| `border-gray-200` | `border-t-line` |
| `border-gray-100` | `border-t-line` |
| `bg-indigo-600` | `bg-t-primary` |
| `hover:bg-indigo-700` | `hover:bg-t-primary-deep` |
| `text-indigo-600` | `text-t-primary` |
| `border-indigo-200` | `border-t-primary` |
| `border-indigo-300` | `border-t-primary` |
| `focus:border-indigo-300` | `focus:border-t-primary` |
| `bg-indigo-50` | `bg-t-primary-soft` |

- [ ] **Step 1: Apply substitutions to all 9 files above**

Go through each file and apply the table. When you see a class that isn't in the table (e.g., `bg-red-100 text-red-800` for a PENDING badge), leave it alone — those are intentional semantic colors.

- [ ] **Step 2: Commit**

```bash
git add frontend/src/app/accountant/
git commit -m "feat: migrate accountant pages to t-* Tailwind theme classes"
```

---

### Task 10: Migrate `QueuePageContent.tsx`

**Files:**
- Modify: `frontend/src/components/queue/QueuePageContent.tsx`

This is the largest single component migration. It has many hardcoded `bg-white`, `text-gray-*`, `border-gray-*` classes in table headers, toolbar, and row cells.

- [ ] **Step 1: Apply substitution table**

Apply the same substitution table from Task 9 throughout `QueuePageContent.tsx`.

Key spots to find:
- Toolbar `div`: `bg-gray-50 border-b border-gray-100` → `bg-t-surface border-b border-t-line`
- Table wrapper `div`: `bg-white border border-gray-200` → `bg-t-card border border-t-line`
- `<th>` elements: `bg-gray-50 ... text-gray-500 ... border-gray-200` → `bg-t-surface ... text-t-muted ... border-t-line`
- `<td>` text: `text-gray-900`, `text-gray-500`, `text-gray-400` → `text-t-ink`, `text-t-muted`, `text-t-faint`
- Review button: `border-gray-200 text-gray-700 hover:bg-gray-50` → `border-t-line text-t-ink hover:bg-t-surface`
- Toast: `bg-gray-900 text-white` — leave as is (intentional dark toast overlay, not a surface)
- `select` inputs: `border-gray-200 text-gray-700 bg-white` → `border-t-line text-t-ink bg-t-card`
- Section headers (RED/YELLOW/GREEN group rows): `bg-red-50`, `bg-yellow-50`, etc. — leave as is (semantic flag colors)
- Batch approve button: `bg-indigo-600 hover:bg-indigo-700` → `bg-t-primary hover:bg-t-primary-deep`
- Loading/empty states: `text-gray-400` → `text-t-faint`

- [ ] **Step 2: Commit**

```bash
git add frontend/src/components/queue/QueuePageContent.tsx
git commit -m "feat: migrate QueuePageContent to t-* theme classes"
```

---

### Task 11: Migrate admin pages to `t-*` Tailwind classes

**Files:**
- Modify: `frontend/src/app/admin/layout.tsx`
- Modify: `frontend/src/app/admin/dashboard/page.tsx`
- Modify: `frontend/src/app/admin/clients/page.tsx`
- Modify: `frontend/src/app/admin/clients/[id]/page.tsx`
- Modify: `frontend/src/app/admin/clients/[id]/edit/page.tsx`
- Modify: `frontend/src/app/admin/clients/create/page.tsx`
- Modify: `frontend/src/app/admin/accountants/page.tsx`
- Modify: `frontend/src/app/admin/accountants/[id]/page.tsx`
- Modify: `frontend/src/app/admin/accountants/create/page.tsx`
- Modify: `frontend/src/app/admin/billing/page.tsx`
- Modify: `frontend/src/app/admin/billing/[clientId]/page.tsx`
- Modify: `frontend/src/app/admin/queue/page.tsx`
- Modify: `frontend/src/app/admin/queue/[id]/page.tsx`
- Modify: `frontend/src/app/admin/reports/page.tsx`
- Modify: `frontend/src/app/admin/reports/bir/page.tsx`
- Modify: `frontend/src/app/admin/reports/[clientId]/income-statement/page.tsx`
- Modify: `frontend/src/app/admin/reports/[clientId]/expense-breakdown/page.tsx`
- Modify: `frontend/src/app/admin/adjusting-entries/page.tsx`
- Modify: `frontend/src/app/admin/adjusting-entries/[id]/page.tsx`
- Modify: `frontend/src/app/admin/settings/page.tsx`

- [ ] **Step 1: Apply substitution table from Task 9 to all admin pages**

For `admin/layout.tsx` specifically, replace `bg-gray-50` with `bg-t-surface`:

```tsx
// Before
<div className="min-h-screen flex flex-col bg-gray-50">

// After
<div className="min-h-screen flex flex-col bg-t-surface">
```

For all other admin pages, apply the full substitution table from Task 9. Do NOT replace semantic badge colors (`bg-red-100`, `bg-green-100`, `bg-yellow-100`, etc.).

- [ ] **Step 2: Commit**

```bash
git add frontend/src/app/admin/
git commit -m "feat: migrate admin pages to t-* theme classes"
```

---

### Task 12: Migrate client pages to `t-*` Tailwind classes

**Files:**
- Modify: `frontend/src/app/client/layout.tsx`
- Modify: `frontend/src/app/client/dashboard/page.tsx`
- Modify: `frontend/src/app/client/documents/page.tsx`
- Modify: `frontend/src/app/client/upload/page.tsx`
- Modify: `frontend/src/app/client/reports/page.tsx`
- Modify: `frontend/src/app/client/reports/bir/page.tsx`
- Modify: `frontend/src/app/client/reports/income-statement/page.tsx`
- Modify: `frontend/src/app/client/reports/expense-breakdown/page.tsx`
- Modify: `frontend/src/app/client/settings/page.tsx`
- Modify: `frontend/src/app/client/returned/page.tsx`

- [ ] **Step 1: Apply substitution table from Task 9 to all client pages**

For `client/layout.tsx`, replace `bg-gray-50` → `bg-t-surface` on the outer div (same as admin layout).

- [ ] **Step 2: Commit**

```bash
git add frontend/src/app/client/
git commit -m "feat: migrate client pages to t-* theme classes"
```

---

### Task 13: Migrate shared Topbar and report components

**Files:**
- Modify: `frontend/src/components/layout/Topbar.tsx`
- Modify: `frontend/src/components/reports/BIRBooksView.tsx`
- Modify: `frontend/src/components/reports/ReportToolbar.tsx`
- Modify: `frontend/src/components/reports/IncomeStatementTable.tsx`
- Modify: `frontend/src/components/reports/ExportPDFButton.tsx`
- Modify: `frontend/src/components/reports/ReportBreadcrumb.tsx` (if it exists)

- [ ] **Step 1: Migrate Topbar.tsx**

Apply the substitution table from Task 9. Key spots:
- Header element: `bg-white border-b border-gray-200` → `bg-t-card border-b border-t-line`
- Brand text: `text-gray-900` → `text-t-ink`
- Nav links active state: `text-indigo-600 border-indigo-600` → `text-t-primary border-t-primary`
- Nav links inactive: `text-gray-500 hover:text-gray-800` → `text-t-muted hover:text-t-ink`
- Client upload button: `bg-indigo-600 hover:bg-indigo-700` → `bg-t-primary hover:bg-t-primary-deep`
- Avatar button: `bg-indigo-50 text-indigo-600 hover:bg-indigo-100` → `bg-t-primary-soft text-t-primary hover:bg-t-primary-soft`
- Dropdown: `bg-white border border-gray-200` → `bg-t-card border border-t-line`
- Dropdown items: `text-gray-900`, `text-gray-400`, `text-gray-700 hover:bg-gray-50` → `text-t-ink`, `text-t-faint`, `text-t-ink hover:bg-t-surface`
- Separator: `bg-gray-100` → `bg-t-line`

- [ ] **Step 2: Migrate BIRBooksView.tsx**

Apply the substitution table. Key spots:
- Book tabs: `bg-white text-gray-400 hover:text-gray-600` → `bg-t-card text-t-faint hover:text-t-muted`
- Active tab: `bg-indigo-600 text-white` → `bg-t-primary text-white`
- Tab border: `border border-gray-200` → `border border-t-line`
- `inputCls`: `border-gray-200 text-gray-700 bg-white` → `border-t-line text-t-ink bg-t-card`
- Heading: `text-gray-900` → `text-t-ink`
- Subtext: `text-gray-400` → `text-t-faint`
- View button: `bg-indigo-600 hover:bg-indigo-700` → `bg-t-primary hover:bg-t-primary-deep`

- [ ] **Step 3: Migrate ReportToolbar.tsx and other report components**

Apply the substitution table to `ReportToolbar.tsx`, `IncomeStatementTable.tsx`, and `ExportPDFButton.tsx`. Focus on container backgrounds, text colors, and border colors. Leave any shadcn component classes untouched.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/components/layout/Topbar.tsx frontend/src/components/reports/
git commit -m "feat: migrate Topbar and report components to t-* theme classes"
```

---

### Task 14: Migrate remaining shared components

**Files:**
- Modify: `frontend/src/components/adjusting-entries/NewEntryModal.tsx` (and any sibling files)
- Modify: `frontend/src/components/queue/ReviewPanel.tsx` (container classes only — shadcn form components inside are untouched)

- [ ] **Step 1: Audit and migrate NewEntryModal and siblings**

Open `frontend/src/components/adjusting-entries/` and apply the substitution table to any file that has hardcoded `bg-white`, `text-gray-*`, `border-gray-*`, or `bg-indigo-*` classes on container/layout elements.

- [ ] **Step 2: Migrate ReviewPanel.tsx container classes**

Open `frontend/src/components/queue/ReviewPanel.tsx`. The form inputs use shadcn `<Input>`, `<Select>`, `<Button>` — those are fine. Look for any hardcoded classes on wrapper `<div>` elements (panel backgrounds, section headers, borders) and apply the substitution table to those only.

- [ ] **Step 3: Run a final grep to catch any remaining hardcoded colors**

```bash
grep -rn "bg-white\|bg-gray-50\|bg-gray-100\|text-gray-900\|text-gray-700\|text-gray-500\|text-gray-400\|bg-indigo-600\|text-indigo-600\|border-gray-200\|border-gray-100" \
  frontend/src/app/accountant/ \
  frontend/src/app/admin/ \
  frontend/src/app/client/ \
  frontend/src/components/queue/ \
  frontend/src/components/reports/ \
  frontend/src/components/adjusting-entries/ \
  frontend/src/components/layout/Topbar.tsx
```

For each match, decide: is it a surface/text/border color (migrate it) or a semantic color (leave it)?

- [ ] **Step 4: Commit**

```bash
git add frontend/src/components/adjusting-entries/ frontend/src/components/queue/ReviewPanel.tsx
git commit -m "feat: migrate remaining shared components to t-* theme classes"
```

---

### Task 15: Smoke test the theme toggle across all roles

No new tests to write — this is a CSS cascade change. Run existing tests to confirm nothing broke, then manually verify the toggle works.

- [ ] **Step 1: Run existing frontend tests**

```bash
cd frontend && npm test -- --passWithNoTests
```

Expected: all tests pass.

- [ ] **Step 2: Start the dev server and verify manually**

```bash
cd frontend && npm run dev
```

Open `http://localhost:3000` and log in as each role:
- **Accountant** (`/accountant/dashboard`): toggle Sofia/Yoda in topbar → background, cards, topbar, table rows all change
- **Admin** (`/admin/dashboard`): same toggle available → all pages respond
- **Client** (`/client/dashboard`): same toggle → all pages respond
- Navigate between pages within each role — theme persists (localStorage)
- Hard refresh on any page — theme loads without flash (`:root` fallback + localStorage hydration)
- Open a shadcn dialog (e.g., a report modal) — dialog background and text are not broken by the toggle

- [ ] **Step 3: Final commit if any fixups were needed**

```bash
git add -p
git commit -m "fix: theme toggle smoke test fixups"
```
