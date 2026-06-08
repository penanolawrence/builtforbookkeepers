# Client Portal — Mobile Responsive Design

**Date:** 2026-06-08
**Breakpoint:** `768px` (Tailwind `md:`). Below this = mobile. Above = desktop unchanged.

---

## Overview

Improve the mobile view of all 6 client-facing pages. Desktop layouts are fully preserved — all changes are purely additive at the mobile breakpoint.

**Approach:**
- Pages already using Tailwind classes (Documents, Upload, Returned, Reports, Settings): add `md:` responsive variants.
- Dashboard (inline `style` props throughout): add `@media (max-width: 768px)` overrides in a scoped CSS block.

**Hidden on mobile (by user decision):** mascot companion, Recent Activity sidebar, Export button.

---

## Shared: Topbar + Bottom Tab Bar

### Topbar changes (mobile only)
- Hide all nav link items (`hidden md:flex` on the `<nav>`)
- Hide the brand name text, keep logo icon only (`hidden md:inline` on the name span)
- Keep: logo icon, ThemeToggle, NotificationBell, avatar button + dropdown

### New component: `BottomTabBar`
File: `frontend/src/components/layout/BottomTabBar.tsx`

- Fixed to bottom of screen (`position: fixed; bottom: 0; left: 0; right: 0; z-index: 10`)
- Visible only on mobile (`flex md:hidden`)
- Height: `56px`
- Background: `var(--t-nav-bg)` + `backdrop-filter: blur(10px)`, top border `var(--t-line)`
- 4 tabs: **Home** (`/client/dashboard`), **Upload** (`/client/upload`), **Documents** (`/client/documents`), **Reports** (`/client/reports`)
- Each tab: icon (lucide) + label, active tab highlighted with `var(--t-primary)` color
- Renders null for non-client roles (check `user?.role !== 'client'`)

### Client layout changes
File: `frontend/src/app/client/layout.tsx`

- Add `<BottomTabBar />` inside the layout
- Add `pb-14 md:pb-0` to the `<main>` element so page content isn't hidden behind the tab bar on mobile

---

## Page 1: Dashboard

File: `frontend/src/app/client/dashboard/page.tsx`

The dashboard uses inline `style` props throughout. Mobile overrides go into a `<style>` tag rendered inside the component (scoped via class names added to the JSX elements), or into `globals.css` under a `@media (max-width: 768px)` block.

**Strategy:** Add CSS class hooks to the key container divs, then override in `globals.css`.

### Greeting row
- Add class `dashboard-greeting` to the outer flex div
- Mobile: `flex-direction: column` — mascot div gets `display: none`

### Stat cards
- Add class `dashboard-stats` to the cards flex container
- Mobile: `display: grid; grid-template-columns: 1fr 1fr; gap: 12px`

### Bottom grid
- Add class `dashboard-grid` to the `gridTemplateColumns: '1fr 320px'` container
- Mobile: `grid-template-columns: 1fr`
- Add class `dashboard-sidebar` to the sidebar div
- Mobile: `display: none` (hides Recent Activity + Upload button)

### Padding
- Add class `dashboard-root` to the root div
- Mobile: reduce gap from `22px` to `16px`; reduce horizontal padding in the layout from `p-6` to `p-4`

---

## Page 2: Documents

File: `frontend/src/app/client/documents/page.tsx`

### Page header
- Export button: add `hidden md:flex` — hidden on mobile
- `+ Add Entry` button: stays visible, full text

### Summary cards
- Container: `flex gap-[14px]` → `grid grid-cols-2 gap-3 md:flex md:gap-[14px]`
- All 4 cards stay visible in a 2×2 grid on mobile (Entries, Inflow, Outflow, Net Flow all fit).

### Filter bar
- Status filter: currently in `grid grid-cols-2` with Type. Change to full-width on mobile: `grid-cols-1 md:grid-cols-2` for the first row (Status alone), keep `grid-cols-2` for the date row.
- No other filter changes needed.

### DocumentsTable component
File: `frontend/src/components/documents/DocumentsTable.tsx`

- Below `md`: hide the column-header row, render each row as a card:
  ```
  [ref / merchant name]          [status badge]
  [date · type · ₱amount]
  ```
- Above `md`: existing table layout unchanged.
- Implementation: wrap table rows in a `hidden md:grid` container and add a `grid md:hidden` card list beside it.

### Padding
- Root div: `px-9 py-7` → `px-4 py-5 md:px-9 md:py-7`

---

## Page 3: Upload

File: `frontend/src/app/client/upload/page.tsx`

### Summary cards
- 3 cards in a `flex` row: stays as-is (3 short values fit at mobile width). No change needed.

### TwoAreaUpload component
File: `frontend/src/components/upload/TwoAreaUpload.tsx`

- Drop zone container: add `flex-col md:flex-row` (zones currently side-by-side)
- Each drop zone: `flex-1` on desktop, `w-full` on mobile
- Each drop zone: `min-height: 120px` on mobile for easy tap target

### In Progress table
- Uses `DocumentsTable` — inherits the mobile card layout from the Documents fix above. No additional changes.

### Padding
- Root div: `px-9 py-7` → `px-4 py-5 md:px-9 md:py-7`

---

## Page 4: Returned

File: `frontend/src/app/client/returned/page.tsx`

### Page header
- Current: `<h1 className="text-xl font-semibold">Returned Documents</h1>` — minimal, no subtitle
- Replace with consistent header pattern:
  ```tsx
  <h1 className="text-[28px] md:text-[34px] font-bold tracking-[-0.025em] text-t-ink m-0"
      style={{ fontFamily: 'var(--font-display)' }}>
    Returned
  </h1>
  <p className="text-[14px] text-t-muted mt-1">Documents that need re-uploading</p>
  ```

### ReturnedDocumentCard component
File: `frontend/src/components/documents/ReturnedDocumentCard.tsx`

- Re-upload button: add `w-full md:w-auto` so it stretches full width on mobile
- Add left border accent: `border-l-4 border-l-[var(--t-tier-review-fg)]` on the card wrapper for visual urgency

### Padding
- Root div: currently `space-y-4` with no horizontal padding (inherits from layout's `p-6`). Layout already handles padding — no change needed here.

---

## Page 5: Reports

File: `frontend/src/app/client/reports/page.tsx`

### Report cards grid
- Current: `grid grid-cols-3 gap-4`
- Mobile: `grid-cols-1 md:grid-cols-3`
- Card inner layout on mobile: switch from vertical stack to horizontal row (`flex items-center gap-3 md:block`)
  - Icon: left, `text-[24px]`, `flex-shrink-0`
  - Text block: middle, `flex-1`
  - Arrow (`→`): right, `flex-shrink-0`

### Page header
- Current: `text-lg font-bold` — inconsistent with other pages
- Update to match: `text-[28px] md:text-[34px] font-bold tracking-[-0.025em]` with display font

### Dialog
- Already `sm:max-w-sm` — mobile-friendly. No changes.

---

## Page 6: Settings

File: `frontend/src/app/client/settings/page.tsx`

### Page header
- Current: `<h1 className="text-xl font-semibold">Settings</h1>`
- Update to consistent style matching other pages (display font, larger size)

### Form container
- Wrap the form + username block in a card container:
  ```tsx
  <div className="bg-t-card border border-t-line rounded-2xl p-5 md:p-6 shadow-sm">
  ```
- `max-w-md` stays — already constrains width appropriately

### Save button
- Add `w-full md:w-auto` so it stretches full width on mobile

---

## Files Changed Summary

| File | Change |
|---|---|
| `frontend/src/components/layout/BottomTabBar.tsx` | **New** — bottom tab bar component |
| `frontend/src/app/client/layout.tsx` | Add `<BottomTabBar />`, add `pb-14 md:pb-0` to `<main>` |
| `frontend/src/components/layout/Topbar.tsx` | Hide nav + brand name on mobile |
| `frontend/src/app/globals.css` | Dashboard mobile media query block |
| `frontend/src/app/client/dashboard/page.tsx` | Add CSS class hooks to key divs |
| `frontend/src/app/client/documents/page.tsx` | Responsive header, summary cards, filter, padding |
| `frontend/src/components/documents/DocumentsTable.tsx` | Mobile card row layout |
| `frontend/src/app/client/upload/page.tsx` | Responsive padding |
| `frontend/src/components/upload/TwoAreaUpload.tsx` | Stack drop zones vertically on mobile |
| `frontend/src/app/client/returned/page.tsx` | Consistent page header |
| `frontend/src/components/documents/ReturnedDocumentCard.tsx` | Full-width button + border accent on mobile |
| `frontend/src/app/client/reports/page.tsx` | `grid-cols-1 md:grid-cols-3`, horizontal card layout, consistent header |
| `frontend/src/app/client/settings/page.tsx` | Consistent header, card wrapper, full-width button |
