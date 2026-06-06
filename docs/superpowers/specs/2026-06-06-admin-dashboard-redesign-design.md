# Admin Dashboard Redesign

**Date:** 2026-06-06
**Scope:** Unify the shared Topbar, update the admin layout, and redesign the Admin Dashboard page to match the accountant and client dashboard design language.

---

## 1. Topbar Unification

### Goal
Merge `AccountantTopbar.tsx`'s visual style into `Topbar.tsx`, making one shared component used by all three roles. Delete `AccountantTopbar.tsx`.

### Changes to `Topbar.tsx`

**Visual style** — adopt AccountantTopbar's inline-CSS-variable approach:
- Header height: `70px` (up from `48px`)
- Background: `var(--t-nav-bg)` with `backdropFilter: blur(10px)`
- Horizontal padding: `36px`
- Gap between brand and nav: achieved via flex

**Brand mark** — replace the small indigo square + plain text with the pug-icon badge:
- `34×34` rounded square (`borderRadius: 10`) with gradient `linear-gradient(150deg, var(--t-primary), var(--t-primary-deep))`
- Pug SVG (same four-circle mark, white, 19×19) inside
- "Sofia Books" in display font, `17px`, `fontWeight: 700`, `var(--t-ink)`
- `href` resolves dynamically to `/${user.role}/dashboard`

**Nav links** — replace the underline-tab style with AccountantTopbar's pill style:
- Each link: `padding: 8px 14px`, `borderRadius: 10`, `fontSize: 14`
- Active: `background: var(--t-primary-soft)`, `color: var(--t-primary)`, `fontWeight: 700`
- Inactive: `color: var(--t-muted)`, `fontWeight: 600`, transparent background
- Queue badge (accountant role only): red pill `var(--t-tier-review-fg)`

**Role-based links** — keep existing `ADMIN_LINKS`, `ACCOUNTANT_LINKS`, `CLIENT_LINKS` arrays; selection logic unchanged.

**Avatar button** — adopt AccountantTopbar's square style:
- `38×38`, `borderRadius: 11`, `var(--t-primary-soft)` background, `1px solid var(--t-line)` border

**Dropdown menu** — adopt AccountantTopbar's inline-style dropdown (`borderRadius: 12`, `var(--t-shadow)`). Settings link resolves to `/${user.role}/settings`.

### Accountant Layout
Update `accountant/layout.tsx` to use `<Topbar />` instead of `<AccountantTopbar />`. Remove the `AccountantTopbar` import. `ThemeProvider` and inline styles stay as-is.

### Delete
Remove `frontend/src/components/layout/AccountantTopbar.tsx`.

---

## 2. Admin Layout

**File:** `frontend/src/app/admin/layout.tsx`

Two changes:
1. Wrap with `ThemeProvider` so `useTheme()` works in admin pages.
2. Bump the inner container max-width from `1100px` to `1280px`.

Switch from Tailwind class-based layout to inline CSS variables to match accountant layout:

```tsx
<ThemeProvider>
  <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--t-surface)', color: 'var(--t-ink)' }}>
    <Topbar />
    <main style={{ flex: 1, overflow: 'auto' }}>
      <div style={{ maxWidth: 1280, margin: '0 auto' }}>
        {children}
      </div>
    </main>
  </div>
</ThemeProvider>
```

The dashboard page itself controls its own `padding: 30px 36px` and column `gap: 22` — same pattern as the accountant layout.

---

## 3. Admin Dashboard Page

**File:** `frontend/src/app/admin/dashboard/page.tsx`

Full rewrite using inline CSS variables. Imports: `useAuth`, `useTheme`, `MascotCompanion`, `WeekStat`, existing query hooks (`getDashboard`, `getPayments`, `getClients`).

### Layout structure

```
Row 1: [Greeting + subtitle]              [MascotCompanion ~430px]
Row 2: [Stat card] [Stat card] [Stat card] [Stat card]   (4-col grid, gap 16)
Row 3: [Accountant Workload — flex:1]     [System Overview — 320px]
Row 4: [Recent Payments — full width]
```

### Row 1 — Greeting + MascotCompanion

- Greeting: `Good {morning|afternoon|evening}, {firstName}` — display font, 34px, weight 800
- Subtitle: `{today} · {totalClients} clients · {openRedItems} open RED items`
- MascotCompanion: `width: 430px, flexShrink: 0`, uses `theme` from `useTheme()`

Time-of-day greeting helper:
```ts
function greet() {
  const h = new Date().getHours()
  return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening'
}
```

### Row 2 — Stat Cards

Four cards in `gridTemplateColumns: 'repeat(4, 1fr)'`, each styled:
- `background: var(--t-card)`, `border: 1px solid var(--t-line)`, `borderRadius: 18`, `padding: 20px 22px`, `boxShadow: var(--t-shadow)`

| Card | Value | Sub-label | Accent color |
|---|---|---|---|
| Total Clients | `totalClients` | `across all accountants` | `var(--t-ink)` |
| Open RED Items | `openRedItems` | `need immediate review` | `var(--t-tier-review-fg)` |
| Active Accountants | `accountants.length` | `on the team` | `var(--t-primary)` |
| Revenue (Jun) | `formatAmount(revenueThisMonth)` | `from payments this month` | green (`#16a34a`) |

Each card structure:
- Label: `fontSize: 11, fontWeight: 700, letterSpacing: '.05em', textTransform: 'uppercase', color: var(--t-faint)`
- Value: display font, `fontSize: 42, fontWeight: 800, letterSpacing: '-.03em', lineHeight: 0.9`
- Sub-label: `fontSize: 11.5, color: var(--t-faint), marginTop: 6`

### Row 3 — Two-column bottom grid

`gridTemplateColumns: '1fr 320px'`, `gap: 16`.

#### Left — Accountant Workload panel

Card wrapper: `background: var(--t-card)`, `border: 1px solid var(--t-line)`, `borderRadius: 20`, `padding: 20px 14px 8px`, `boxShadow: var(--t-shadow)`.

Header row: "Accountant Workload" (display font, 18px, weight 700) + "View all →" link to `/admin/accountants` (`color: var(--t-primary)`).

Accountant cards grid: `gridTemplateColumns: 'repeat(3, 1fr)'` inside the panel, each accountant card:
- `background: var(--t-surface)`, `border: 1px solid var(--t-line)`, `borderRadius: 14`, `padding: 16px`
- Name: `fontSize: 13, fontWeight: 700, color: var(--t-ink)`
- Sub-line: `{clientCount} clients · {pendingEntries} pending entries`, `fontSize: 11.5, color: var(--t-faint)`
- Tier dots row: three inline chips (RED / YELLOW / GREEN) using `var(--t-tier-{key}-fg)` and `var(--t-tier-{key}-bg)` — same pattern as TierCard dot
- Link to `/admin/accountants/{id}` — whole card is clickable

Urgent accountants (redCount > 0) get a left border accent: `borderLeft: '3px solid var(--t-tier-review-fg)'`.

#### Right — System Overview panel

Same aside structure as accountant's "This Week" rail.

Card: `background: var(--t-card)`, `border: 1px solid var(--t-line)`, `borderRadius: 20`, `padding: 20px 22px`, `boxShadow: var(--t-shadow)`, `flex: 1`.

Header: `BarChart2` icon (lucide, 17px, `var(--t-primary)`) + "System Overview" in display font, 16px, weight 700.

Stats (using `WeekStat` component):
- Total RED items across all accountants (sum of `a.redCount`) — label "Open RED items", sub "need review", `accent`
- Total YELLOW items (sum of `a.yellowCount`) — label "Yellow items", sub "awaiting check"
- Total pending entries (sum of `a.pendingEntries`) — label "Pending entries", sub "awaiting admin approval"

Below the stats: "Go to Queue →" CTA button — identical gradient, shadow, and style as accountant's CTA, routes to `/admin/queue`.

### Row 4 — Recent Payments

Full-width card. Same table content as current implementation. Restyled to CSS variables:
- Card wrapper: `background: var(--t-card)`, `border: 1px solid var(--t-line)`, `borderRadius: 20`, `boxShadow: var(--t-shadow)`
- Header: "Recent Payments" + "View all →" link to `/admin/billing`
- Table headers: `fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.05em', color: var(--t-faint)`
- Row hover: `background: var(--t-surface)`
- Cell text: `fontSize: 13, color: var(--t-ink)` for name/amount, `color: var(--t-faint)` for ref/date/recorded-by

---

## 4. Data Sources

All data comes from existing queries — no new backend endpoints required.

| Data | Source |
|---|---|
| `accountants`, `openRedItems` | `getDashboard()` — `/admin/dashboard` |
| `revenueThisMonth`, `recentPayments` | `getPayments()` — `/admin/billing/payments` |
| `clientMap` | `getClients()` — `/admin/clients` |

System Overview stats are derived client-side from the `accountants` array returned by `getDashboard()`.

---

## 5. Files Changed

| File | Action |
|---|---|
| `src/components/layout/Topbar.tsx` | Update — adopt AccountantTopbar visual style |
| `src/components/layout/AccountantTopbar.tsx` | Delete |
| `src/app/accountant/layout.tsx` | Update — swap AccountantTopbar → Topbar |
| `src/app/admin/layout.tsx` | Update — add ThemeProvider, bump max-width, inline styles |
| `src/app/admin/dashboard/page.tsx` | Rewrite — full redesign |

No new components. No backend changes.
