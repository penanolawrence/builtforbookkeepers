# Theme Single Source of Truth Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make `theme.css` the single source of truth for all colors so every component — including shadcn UI dropdowns and inputs — responds to the Sofia/Yoda theme toggle.

**Architecture:** ThemeProvider moves `data-theme` from a nested `<div>` to `document.documentElement` so Radix UI portals (which render at `<body>` level) inherit theme CSS vars. Tailwind's `hsl()` wrappers are removed from shadcn color entries so they accept hex values directly. `globals.css` shadcn vars become thin aliases of `t-*` tokens; the dead `.dark {}` block is deleted. Component hardcoded colors are then replaced with `t-*` token classes.

**Tech Stack:** Next.js 14 App Router, TypeScript, Tailwind CSS v3, shadcn/ui (Radix UI), CSS custom properties

---

## Files Modified

| File | Change |
|---|---|
| `frontend/src/components/layout/ThemeProvider.tsx` | Set `data-theme` on `document.documentElement`; remove wrapper div |
| `frontend/tailwind.config.ts` | Remove `hsl()` wrappers from all shadcn color entries |
| `frontend/src/app/globals.css` | Rewrite shadcn vars as `t-*` aliases; delete `.dark {}` block |
| `frontend/src/components/documents/DocumentsTable.tsx` | Full structural restyle to `t-*` tokens; fix STATUS_BADGE bug |
| `frontend/src/components/reports/IncomeStatementTable.tsx` | Replace hardcoded green/red/gray/indigo colors |
| `frontend/src/app/client/documents/page.tsx` | Add `text-t-ink` to `h1` |

---

### Task 1: Fix ThemeProvider — set `data-theme` on `<html>`

**Why:** The current ThemeProvider wraps children in `<div data-theme={theme}>`. Radix UI portals (SelectContent, DropdownMenuContent, Dialog, etc.) render at `<body>` level — outside that div — so they never inherit `--t-*` CSS custom properties and remain unstyled. Setting `data-theme` on `document.documentElement` (the `<html>` element) fixes this for all portal content.

**Files:**
- Modify: `frontend/src/components/layout/ThemeProvider.tsx`

- [ ] **Step 1: Replace ThemeProvider.tsx with the corrected version**

Replace the entire file with:

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

  useEffect(() => {
    document.documentElement.dataset.theme = theme
  }, [theme])

  const setTheme = (t: Theme) => {
    setThemeState(t)
    localStorage.setItem('sofia_theme', t)
  }

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}
```

Key changes from original:
- Added `useEffect` that syncs `document.documentElement.dataset.theme` whenever `theme` changes
- Removed the `<div data-theme={theme} style={{ display: 'contents' }}>` wrapper — children are returned directly

- [ ] **Step 2: Run TypeScript check**

```bash
cd frontend && npx tsc --noEmit
```

Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/layout/ThemeProvider.tsx
git commit -m "fix: set data-theme on html element so Radix portals inherit theme vars"
```

---

### Task 2: Bridge shadcn CSS vars to `t-*` tokens

**Why:** Tailwind's color utilities like `bg-background` use `hsl(var(--background))`. The `hsl()` wrapper requires HSL space-separated values (e.g. `0 0% 100%`), but `t-*` tokens are hex (e.g. `#FFFFFF`). Both files must change together: remove `hsl()` from `tailwind.config.ts` so vars resolve directly, then rewrite `globals.css` vars as `t-*` aliases.

**Files:**
- Modify: `frontend/tailwind.config.ts`
- Modify: `frontend/src/app/globals.css`

- [ ] **Step 1: Update `tailwind.config.ts` — remove `hsl()` wrappers**

In the `colors` section of `tailwind.config.ts`, replace the shadcn entries (keep all `t-*` entries unchanged):

```ts
colors: {
  border:      "var(--border)",
  input:       "var(--input)",
  ring:        "var(--ring)",
  background:  "var(--background)",
  foreground:  "var(--foreground)",
  primary: {
    DEFAULT:    "var(--primary)",
    foreground: "var(--primary-foreground)",
  },
  secondary: {
    DEFAULT:    "var(--secondary)",
    foreground: "var(--secondary-foreground)",
  },
  destructive: {
    DEFAULT:    "var(--destructive)",
    foreground: "var(--destructive-foreground)",
  },
  muted: {
    DEFAULT:    "var(--muted)",
    foreground: "var(--muted-foreground)",
  },
  accent: {
    DEFAULT:    "var(--accent)",
    foreground: "var(--accent-foreground)",
  },
  popover: {
    DEFAULT:    "var(--popover)",
    foreground: "var(--popover-foreground)",
  },
  card: {
    DEFAULT:    "var(--card)",
    foreground: "var(--card-foreground)",
  },
  // t-* entries below — leave exactly as they are
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

- [ ] **Step 2: Rewrite `globals.css`**

Replace the entire contents of `frontend/src/app/globals.css` with:

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@import '../styles/theme.css';

@layer base {
  :root {
    --background:             var(--t-card);
    --foreground:             var(--t-ink);
    --card:                   var(--t-card);
    --card-foreground:        var(--t-ink);
    --popover:                var(--t-card-alt);
    --popover-foreground:     var(--t-ink);
    --primary:                var(--t-primary);
    --primary-foreground:     #ffffff;
    --secondary:              var(--t-surface);
    --secondary-foreground:   var(--t-ink);
    --muted:                  var(--t-surface);
    --muted-foreground:       var(--t-muted);
    --accent:                 var(--t-surface);
    --accent-foreground:      var(--t-ink);
    --destructive:            #ef4444;
    --destructive-foreground: #ffffff;
    --border:                 var(--t-line);
    --input:                  var(--t-field-bg);
    --ring:                   var(--t-primary);
    --radius:                 0.5rem;
    --chart-1: 12 76% 61%;
    --chart-2: 173 58% 39%;
    --chart-3: 197 37% 24%;
    --chart-4: 43 74% 66%;
    --chart-5: 27 87% 67%;
  }
}

@layer base {
  * {
    @apply border-border;
  }
  body {
    @apply bg-background text-foreground;
  }
}
```

Note: the `.dark {}` block is intentionally deleted — theme switching is now handled entirely by `theme.css` via `[data-theme]`.

- [ ] **Step 3: Run TypeScript check**

```bash
cd frontend && npx tsc --noEmit
```

Expected: no errors

- [ ] **Step 4: Start dev server and visually verify**

```bash
cd frontend && npm run dev
```

Open `http://localhost:3000`. Navigate to any page with a Select or Input (e.g. `/client/documents`). Toggle between Sofia and Yoda using the theme toggle in the top bar. The Select trigger, dropdown overlay, and Input fields should change background color when Yoda is active.

- [ ] **Step 5: Commit**

```bash
git add frontend/tailwind.config.ts frontend/src/app/globals.css
git commit -m "fix: bridge shadcn CSS vars to t-* tokens as single source of truth"
```

---

### Task 3: Fix DocumentsTable

**Why:** Every structural class in `DocumentsTable` is hardcoded (`bg-white`, `text-gray-*`, `bg-gray-*`). The STATUS_BADGE was updated to use `style` objects in a previous session but the usage code still destructures `cls` (a property that no longer exists on the map), so badge colors are currently always `undefined`.

**Files:**
- Modify: `frontend/src/components/documents/DocumentsTable.tsx`

- [ ] **Step 1: Replace DocumentsTable.tsx**

Replace the entire file with:

```tsx
'use client'

import { cn } from '@/lib/utils'
import { formatCurrency } from '@/lib/utils/formatCurrency'
import type { Document, DocumentStatus } from '@/types/document'

const STATUS_BADGE: Record<DocumentStatus, { label: string; style: React.CSSProperties }> = {
  PROCESSING: { label: 'Processing', style: { background: 'var(--t-tier-pending-bg)', color: 'var(--t-tier-pending-fg)', border: '1px solid var(--t-tier-pending-ring)' } },
  PARKED:     { label: 'In Review',  style: { background: 'var(--t-tier-check-bg)',   color: 'var(--t-tier-check-fg)',   border: '1px solid var(--t-tier-check-ring)'   } },
  RETURNED:   { label: 'Returned',   style: { background: 'var(--t-tier-review-bg)',  color: 'var(--t-tier-review-fg)',  border: '1px solid var(--t-tier-review-ring)'  } },
  APPROVED:   { label: 'Approved',   style: { background: 'var(--t-tier-ready-bg)',   color: 'var(--t-tier-ready-fg)',   border: '1px solid var(--t-tier-ready-ring)'   } },
  REJECTED:   { label: 'Rejected',   style: { background: 'var(--t-tier-review-bg)',  color: 'var(--t-tier-review-fg)',  border: '1px solid var(--t-tier-review-ring)'  } },
  CANCELLED:  { label: 'Withdrawn',  style: { background: 'var(--t-tier-pending-bg)', color: 'var(--t-tier-pending-fg)', border: '1px solid var(--t-tier-pending-ring)' } },
}

function noteText(doc: Document): { text: string; cls: string } {
  if (doc.status === 'RETURNED' && doc.returnNote) {
    const truncated = doc.returnNote.length > 50
      ? doc.returnNote.slice(0, 50) + '…'
      : doc.returnNote
    return { text: truncated, cls: 'text-red-600' }
  }
  if (doc.status === 'REJECTED' && doc.rejectionReason) {
    const truncated = doc.rejectionReason.length > 50
      ? doc.rejectionReason.slice(0, 50) + '…'
      : doc.rejectionReason
    return { text: truncated, cls: 'text-t-muted' }
  }
  if (doc.status === 'PARKED')     return { text: 'Awaiting accountant review', cls: 'text-t-faint' }
  if (doc.status === 'PROCESSING') return { text: 'Processing…', cls: 'text-t-faint italic' }
  if (doc.status === 'CANCELLED')  return { text: 'Withdrawn by client', cls: 'text-t-faint' }
  return { text: '', cls: '' }
}

interface Props {
  docs: Document[]
  onRowClick: (doc: Document) => void
  title?: string
  subtitle?: string
}

export function DocumentsTable({ docs, onRowClick, title = 'Documents', subtitle }: Props) {
  if (docs.length === 0) return null

  return (
    <div
      className="bg-t-card border border-t-line rounded-[20px] overflow-hidden"
      style={{ boxShadow: 'var(--t-shadow)' }}
    >
      <div className="flex items-center justify-between px-4 py-3 border-b border-t-line">
        <div className="text-sm font-semibold text-t-ink">{title}</div>
        {subtitle && <div className="text-xs text-t-faint">{subtitle}</div>}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-xs">
          <thead>
            <tr className="bg-t-surface border-b border-t-line">
              {['Reference', 'Source', 'Uploaded', 'Inflow', 'Outflow', 'Status', 'Note'].map((h) => (
                <th
                  key={h}
                  className={cn(
                    'px-3.5 py-2 text-[10px] font-bold text-t-muted uppercase tracking-wide whitespace-nowrap',
                    h === 'Inflow' || h === 'Outflow' ? 'text-right' : 'text-left'
                  )}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {docs.map((doc, i) => {
              const { label, style: badgeStyle } = STATUS_BADGE[doc.status]
              const { text: note, cls: noteCls } = noteText(doc)
              const ref = doc.refNumber ?? `#${doc.id.slice(0, 8)}`
              const isProcessing = doc.status === 'PROCESSING'

              return (
                <tr
                  key={doc.id}
                  onClick={() => onRowClick(doc)}
                  className={cn(
                    'cursor-pointer transition-colors hover:bg-t-surface',
                    i < docs.length - 1 ? 'border-b border-t-line-soft' : ''
                  )}
                >
                  {/* Reference */}
                  <td className="px-3.5 py-2.5 font-medium text-t-ink whitespace-nowrap">
                    {ref}
                  </td>

                  {/* Source */}
                  <td className="px-3.5 py-2.5">
                    {doc.isNoReceipt ? (
                      <span
                        className="inline-flex items-center text-[10px] font-semibold px-1.5 py-0.5 rounded"
                        style={{ background: 'var(--t-tier-pending-bg)', color: 'var(--t-tier-pending-fg)' }}
                      >
                        Manual
                      </span>
                    ) : (
                      <span className="inline-flex items-center text-[10px] font-semibold px-1.5 py-0.5 rounded bg-t-surface text-t-muted">
                        Upload
                      </span>
                    )}
                  </td>

                  {/* Uploaded */}
                  <td className="px-3.5 py-2.5 text-t-muted whitespace-nowrap">
                    {new Date(doc.createdAt).toLocaleDateString('en-PH', {
                      month: 'short',
                      day: 'numeric',
                    })}
                  </td>

                  {/* Inflow */}
                  <td className="px-3.5 py-2.5 text-right font-semibold whitespace-nowrap">
                    {!isProcessing && doc.inflow > 0
                      ? <span className="text-green-600">{formatCurrency(doc.inflow)}</span>
                      : <span className="text-t-faint">—</span>
                    }
                  </td>

                  {/* Outflow */}
                  <td className="px-3.5 py-2.5 text-right font-semibold whitespace-nowrap">
                    {!isProcessing && doc.outflow > 0
                      ? <span className="text-red-600">{formatCurrency(doc.outflow)}</span>
                      : <span className="text-t-faint">—</span>
                    }
                  </td>

                  {/* Status */}
                  <td className="px-3.5 py-2.5">
                    <span
                      className="inline-flex items-center text-[10px] font-semibold px-1.5 py-0.5 rounded"
                      style={badgeStyle}
                    >
                      {label}
                    </span>
                  </td>

                  {/* Note */}
                  <td className={cn('px-3.5 py-2.5 max-w-[200px] truncate', noteCls)}>
                    {note}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Run TypeScript check**

```bash
cd frontend && npx tsc --noEmit
```

Expected: no errors

- [ ] **Step 3: Visually verify in browser**

With dev server running, navigate to `/client/upload`. The "In Progress" table should:
- Have a `bg-t-card` background (dark in Yoda, warm white in Sofia)
- Status badges should show correct tier colors in both themes
- "Manual" source chip should be purple-toned in both themes
- Toggle theme — all colors should switch

- [ ] **Step 4: Commit**

```bash
git add frontend/src/components/documents/DocumentsTable.tsx
git commit -m "fix: restyle DocumentsTable with t-* tokens and fix STATUS_BADGE style destructuring"
```

---

### Task 4: Fix IncomeStatementTable semantic colors

**Why:** `text-green-700`, `text-red-700`, `bg-green-50`, `bg-red-50`, `text-green-800`, `text-red-800`, and `border-indigo-500` are hardcoded Tailwind colors. On Yoda's dark surface, `bg-green-50` and `bg-red-50` appear as jarring light patches. The `t-tier-ready-*` and `t-tier-review-*` tokens already have Yoda-aware dark variants that preserve the green=income / red=expense semantic meaning.

**Files:**
- Modify: `frontend/src/components/reports/IncomeStatementTable.tsx`

- [ ] **Step 1: Replace hardcoded colors on data row borders**

Find all `border-b border-gray-50` occurrences (there are 4 — two in income rows, two in expense rows) and change to `border-b border-t-line-soft`.

- [ ] **Step 2: Replace Total Income row colors**

Find:
```tsx
<tr className="bg-t-surface border-b border-t-line">
  <td className="px-3.5 py-2 font-bold text-green-700">Total Income</td>
  <td className="px-3.5 py-2 text-right font-bold text-green-700 tabular-nums">
```

Replace with:
```tsx
<tr className="bg-t-surface border-b border-t-line">
  <td className="px-3.5 py-2 font-bold" style={{ color: 'var(--t-tier-ready-fg)' }}>Total Income</td>
  <td className="px-3.5 py-2 text-right font-bold tabular-nums" style={{ color: 'var(--t-tier-ready-fg)' }}>
```

- [ ] **Step 3: Replace Total Expenses row colors**

Find:
```tsx
<tr className="bg-t-surface border-b border-t-line">
  <td className="px-3.5 py-2 font-bold text-red-700">Total Expenses</td>
  <td className="px-3.5 py-2 text-right font-bold text-red-700 tabular-nums">
```

Replace with:
```tsx
<tr className="bg-t-surface border-b border-t-line">
  <td className="px-3.5 py-2 font-bold" style={{ color: 'var(--t-tier-review-fg)' }}>Total Expenses</td>
  <td className="px-3.5 py-2 text-right font-bold tabular-nums" style={{ color: 'var(--t-tier-review-fg)' }}>
```

- [ ] **Step 4: Replace Net Income row**

Find:
```tsx
<tr className={`border-t-2 border-indigo-500 ${isProfit ? 'bg-green-50' : 'bg-red-50'}`}>
  <td
    className={`px-3.5 py-3 text-[14px] font-extrabold ${
      isProfit ? 'text-green-800' : 'text-red-800'
    }`}
  >
    Net Income
  </td>
  <td
    className={`px-3.5 py-3 text-right text-[14px] font-extrabold tabular-nums ${
      isProfit ? 'text-green-800' : 'text-red-800'
    }`}
  >
```

Replace with:
```tsx
<tr
  className="border-t-2 border-t-primary"
  style={{ background: isProfit ? 'var(--t-tier-ready-bg)' : 'var(--t-tier-review-bg)' }}
>
  <td
    className="px-3.5 py-3 text-[14px] font-extrabold"
    style={{ color: isProfit ? 'var(--t-tier-ready-fg)' : 'var(--t-tier-review-fg)' }}
  >
    Net Income
  </td>
  <td
    className="px-3.5 py-3 text-right text-[14px] font-extrabold tabular-nums"
    style={{ color: isProfit ? 'var(--t-tier-ready-fg)' : 'var(--t-tier-review-fg)' }}
  >
```

- [ ] **Step 5: Run TypeScript check**

```bash
cd frontend && npx tsc --noEmit
```

Expected: no errors

- [ ] **Step 6: Visually verify in browser**

Navigate to any income statement page (e.g. `/accountant/reports/[clientId]/income-statement`). Toggle theme. The Total Income row should be green-toned, Total Expenses red-toned, and Net Income background should use the appropriate tier color — all in both Sofia and Yoda without jarring light patches.

- [ ] **Step 7: Commit**

```bash
git add frontend/src/components/reports/IncomeStatementTable.tsx
git commit -m "fix: replace hardcoded green/red colors in IncomeStatementTable with t-tier-* tokens"
```

---

### Task 5: Fix Documents page h1

**Files:**
- Modify: `frontend/src/app/client/documents/page.tsx`

- [ ] **Step 1: Add `text-t-ink` to the h1**

Find:
```tsx
<h1 className="text-xl font-semibold">Documents</h1>
```

Replace with:
```tsx
<h1 className="text-xl font-semibold text-t-ink">Documents</h1>
```

- [ ] **Step 2: Visually verify**

Navigate to `/client/documents`. Toggle to Yoda — the "Documents" heading should be light (`#ECEAF2`) not dark.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/app/client/documents/page.tsx
git commit -m "fix: add text-t-ink to documents page h1"
```
