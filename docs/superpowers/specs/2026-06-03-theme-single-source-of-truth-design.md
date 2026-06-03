# Theme Single Source of Truth — Design Spec

**Date:** 2026-06-03
**Status:** Approved

---

## Problem

The project has two parallel CSS variable systems that don't communicate:

1. **`t-*` tokens** in `theme.css` — switch on `[data-theme="sofia"]` / `[data-theme="yoda"]`
2. **shadcn CSS vars** in `globals.css` — designed for Tailwind's `.dark` class

Because shadcn components (`Select`, `Input`, `Dialog`, `Skeleton`, etc.) only read `--background`, `--foreground`, `--border`, etc., they never respond to the `data-theme` toggle. This causes:

- `DocumentsTable` remaining white in Yoda mode (all structural classes hardcoded as `bg-white`, `text-gray-*`)
- `DocumentsTable` STATUS_BADGE colors broken — badge shape was updated to use `style` objects but usage code still destructures `cls` (a property that no longer exists), so badge colors render as nothing
- Documents page `h1` appearing dark on Yoda's dark background (inherits `--foreground` which never updates)
- Filter controls (`Select`, `Input`) staying white in Yoda mode
- `IncomeStatementTable` Total Income/Expenses rows using hardcoded `text-green-700` / `text-red-700` that look wrong on Yoda's dark surface; Net Income row uses `bg-green-50` / `bg-red-50` which are visually jarring in dark mode

---

## Solution

Make **`theme.css` the single source of truth**. Rewrite `globals.css` so shadcn CSS vars are thin aliases of `t-*` tokens. When `data-theme` switches, `t-*` values update, and every shadcn component inherits the correct values automatically. The `.dark {}` block in `globals.css` is deleted — it becomes dead code.

Fix `DocumentsTable` structural classes and the STATUS_BADGE destructuring bug. Fix `IncomeStatementTable` hardcoded colors using `t-tier-*` tokens which already have Yoda-aware values.

---

## Files Changed

| File | Change |
|---|---|
| `frontend/src/app/globals.css` | Rewrite shadcn vars as `t-*` aliases; delete `.dark` block |
| `frontend/tailwind.config.ts` | Remove `hsl()` wrappers from shadcn color vars |
| `frontend/src/components/documents/DocumentsTable.tsx` | Full structural restyle to `t-*` tokens; fix STATUS_BADGE bug |
| `frontend/src/components/reports/IncomeStatementTable.tsx` | Replace hardcoded green/red/gray colors with `t-tier-*` tokens |
| `frontend/src/app/client/documents/page.tsx` | Add `text-t-ink` to `h1` |

---

## Section 1 — `globals.css` + `tailwind.config.ts`

**Why two files:** Tailwind wraps shadcn CSS vars in `hsl()` (e.g. `background: "hsl(var(--background))"`). But `t-*` tokens are hex values — `hsl(#FFFFFF)` is invalid CSS. The `hsl()` wrappers must be removed from `tailwind.config.ts` so the vars resolve directly.

### `tailwind.config.ts` changes

Remove `hsl()` from every shadcn color entry that will be bridged:

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
  // t-* entries unchanged
}
```

### `globals.css` changes

Delete the entire `.dark {}` block. Rewrite the `:root` shadcn vars as aliases of `t-*` tokens. Vars without a `t-*` equivalent keep hardcoded hex values:

```css
:root {
  --background:              var(--t-card);
  --foreground:              var(--t-ink);
  --card:                    var(--t-card);
  --card-foreground:         var(--t-ink);
  --popover:                 var(--t-card-alt);
  --popover-foreground:      var(--t-ink);
  --primary:                 var(--t-primary);
  --primary-foreground:      #ffffff;
  --secondary:               var(--t-surface);
  --secondary-foreground:    var(--t-ink);
  --muted:                   var(--t-surface);
  --muted-foreground:        var(--t-muted);
  --accent:                  var(--t-surface);
  --accent-foreground:       var(--t-ink);
  --destructive:             #ef4444;
  --destructive-foreground:  #ffffff;
  --border:                  var(--t-line);
  --input:                   var(--t-field-bg);
  --ring:                    var(--t-primary);
  --radius:                  0.5rem;
  /* chart vars unchanged */
}
```

No `[data-theme]` block needed in `globals.css`. Theme switching is handled entirely by `theme.css`.

---

## Section 2 — `DocumentsTable.tsx`

### Structural restyle

| Old class | New class |
|---|---|
| `bg-white border border-gray-200 rounded-lg overflow-hidden` | `bg-t-card border border-t-line rounded-[20px] overflow-hidden` + `style={{ boxShadow: 'var(--t-shadow)' }}` |
| `border-b border-gray-100` (header bar) | `border-b border-t-line` |
| `text-sm font-semibold text-gray-900` (title) | `text-sm font-semibold text-t-ink` |
| `text-xs text-gray-400` (subtitle) | `text-xs text-t-faint` |
| `bg-gray-50 border-b border-gray-200` (thead row) | `bg-t-surface border-b border-t-line` |
| `text-gray-500 uppercase` (th cells) | `text-t-muted uppercase` |
| `hover:bg-gray-50` (tbody rows) | `hover:bg-t-surface` |
| `border-b border-gray-100` (row dividers) | `border-b border-t-line-soft` |
| `text-gray-900` (reference cell) | `text-t-ink` |
| `text-gray-500` (uploaded date) | `text-t-muted` |
| `text-gray-300` (dash placeholder) | `text-t-faint` |

### Source chip

| Source | Old | New |
|---|---|---|
| Manual | `bg-blue-100 text-blue-700` | inline style `{ background: 'var(--t-tier-pending-bg)', color: 'var(--t-tier-pending-fg)' }` |
| Upload | `bg-gray-100 text-gray-600` | `bg-t-surface text-t-muted` |

### STATUS_BADGE bug fix

The `STATUS_BADGE` map was already updated to use `style: React.CSSProperties` objects, but the usage code still destructures `cls` (which no longer exists on the map) and uses it as a `className`. Fix by destructuring `style` and applying it as an inline style:

```tsx
// Before (broken)
const { label, cls } = STATUS_BADGE[doc.status]
<span className={`... ${cls}`}>{label}</span>

// After (correct)
const { label, style } = STATUS_BADGE[doc.status]
<span className="inline-flex items-center text-[10px] font-semibold px-1.5 py-0.5 rounded" style={style}>{label}</span>
```

---

## Section 3 — `IncomeStatementTable.tsx`

### Row borders

`border-gray-50` → `border-t-line-soft` on all data rows and subtype rows.

### Total Income row

```tsx
// Before
<td className="... text-green-700">Total Income</td>
<td className="... text-green-700">{formatCurrency(...)}</td>

// After
<td className="... font-bold" style={{ color: 'var(--t-tier-ready-fg)' }}>Total Income</td>
<td className="... font-bold tabular-nums" style={{ color: 'var(--t-tier-ready-fg)' }}>{formatCurrency(...)}</td>
```

### Total Expenses row

```tsx
// Before
<td className="... text-red-700">Total Expenses</td>

// After
<td className="... font-bold" style={{ color: 'var(--t-tier-review-fg)' }}>Total Expenses</td>
```

### Net Income row

```tsx
// Before
<tr className={`border-t-2 border-indigo-500 ${isProfit ? 'bg-green-50' : 'bg-red-50'}`}>
  <td className={`... ${isProfit ? 'text-green-800' : 'text-red-800'}`}>Net Income</td>

// After
<tr
  className="border-t-2 border-t-primary"
  style={{ background: isProfit ? 'var(--t-tier-ready-bg)' : 'var(--t-tier-review-bg)' }}
>
  <td
    className="px-3.5 py-3 text-[14px] font-extrabold"
    style={{ color: isProfit ? 'var(--t-tier-ready-fg)' : 'var(--t-tier-review-fg)' }}
  >Net Income</td>
```

---

## Section 4 — `DocumentsPage` h1

```tsx
// Before
<h1 className="text-xl font-semibold">Documents</h1>

// After
<h1 className="text-xl font-semibold text-t-ink">Documents</h1>
```

---

## Out of Scope

- `ManualEntryForm`, `ConfirmUploadDialog`, `DocumentDetailModal` — not part of this fix
- Admin-side pages — shadcn components there will automatically benefit from the `globals.css` fix without code changes
- `UploadZone`, `TwoAreaUpload` — already using `t-*` tokens correctly
- Adding new themes — `theme.css` is now the only file to touch
