# Spec — Help Page ("How the System Works")
## Sofia Books · 2026-06-14

---

## Overview

Add a **Help** nav item to the accountant avatar dropdown (below Settings) that links to a new static guide page at `/accountant/help`. The page renders the full "How the System Works" content — a 7-section scrollable guide with a sticky sidebar and scrollspy navigation.

---

## 1. Nav Change

**File:** `frontend/src/components/layout/Topbar.tsx`

Add one `<Link>` to the avatar dropdown, immediately after the existing Settings link and before the Log out button:

```tsx
<Link href="/accountant/help" onClick={() => setMenuOpen(false)} ...>
  ? Help
</Link>
```

Style matches the existing Settings link (same padding, font size, color, display flex). Icon is a simple `?` glyph consistent with the Settings `⚙` emoji style.

---

## 2. Route & Auth

**Route:** `/accountant/help` → `frontend/src/app/accountant/help/page.tsx`

No middleware changes needed. The existing middleware already blocks non-accountant users from all `/accountant/*` paths via the `b4b_role` cookie check.

The page is mounted inside the existing `frontend/src/app/accountant/layout.tsx`, so the Topbar and BottomTabBar are inherited automatically.

---

## 3. Files

| File | Type | Purpose |
|---|---|---|
| `frontend/src/app/accountant/help/page.tsx` | Server Component | Two-column shell + all static content |
| `frontend/src/app/accountant/help/help.module.css` | CSS Module | All `hiw-` scoped styles |
| `frontend/src/components/help/HelpSidebarNav.tsx` | Client Component | Scrollspy sidebar nav |

---

## 4. Component Architecture

### `page.tsx` (Server Component)

Renders the two-column shell and all static content. Imports `HelpSidebarNav` as its only client dependency.

```
page.tsx
└── <div className={s.shell}>              ← two-column flex, max-width 1160px, centered
    ├── <HelpSidebarNav />                 ← sticky sidebar, 232px
    └── <main className={s.main}>
        ├── PageHeader                     ← badge · h1 · subtitle · meta row
        ├── Section #who-does-what
        ├── Section #transaction-flow
        ├── Section #flag-colors
        ├── Section #approval-queue
        ├── Section #corrections
        ├── Section #bir-reports
        ├── Section #client-setup
        └── Section #quick-reference
```

Each section has `className={s.section}` and its `id` attribute for scrollspy targeting. Section dividers use `border-top: 1px solid var(--border-f)` and `padding-top: 56px`.

Content is copied from `logo/How the System Works - Content Component.html` and converted to JSX (HTML attributes → camelCase, `class` → `className`).

### `HelpSidebarNav.tsx` (`'use client'`)

Static nav item list is defined inside the component (no props needed):

```ts
const NAV_ITEMS = [
  { id: 'who-does-what',     label: '1. Who Does What' },
  { id: 'transaction-flow',  label: '2. Transaction Flow' },
  { id: 'flag-colors',       label: '3. Flag Colors' },
  { id: 'approval-queue',    label: '4. Approval Queue' },
  { id: 'corrections',       label: '5. Corrections' },
  { id: 'bir-reports',       label: '6. BIR Reports' },
  { id: 'client-setup',      label: '7. Client Setup' },
  { id: 'quick-reference',   label: 'Quick Reference' },
];
```

**Scrollspy logic:**

```ts
useEffect(() => {
  const sections = document.querySelectorAll('.hiw-section[id]');
  if (!sections.length) return;
  setActive(sections[0].id);

  const obs = new IntersectionObserver(
    entries => entries.forEach(e => { if (e.isIntersecting) setActive(e.target.id); }),
    { rootMargin: '-15% 0px -75% 0px', threshold: 0 }
  );
  sections.forEach(s => obs.observe(s));
  return () => obs.disconnect();
}, []);
```

Active link gets a distinct style (pink text + left border accent). All links use smooth anchor scroll via `href="#id"` — scroll-behavior handled at the CSS level.

---

## 5. CSS Strategy (`help.module.css`)

**Uses existing app CSS variables directly:**
`--pink`, `--ink`, `--ink-2`, `--muted`, `--faint`, `--border`, `--surface`, `--card`

**Defines locally inside `.shell` for tokens not in app globals:**
`--pink-d`, `--pink-soft`, `--pink-line`, `--border-f`, `--green`, `--green-bg`, `--green-bd`, `--yellow`, `--yellow-bg`, `--yellow-bd`, `--red`, `--red-bg`, `--red-bd`, `--blue`, `--blue-bg`, `--blue-bd`, `--sh-xs`, `--sh-md`

No global CSS is modified. All `hiw-` styles are scoped to this module.

**Smooth scroll:** Added to `hiw-main` container only (`scroll-behavior: smooth` on the wrapping element, not on `html`), so it doesn't affect other pages.

**Key layout values:**

| Property | Value |
|---|---|
| Shell max-width | 1160px, `margin: 0 auto` |
| Sidebar width | 232px |
| Sidebar `position` | `sticky`, `top: 70px` |
| Sidebar height | `calc(100vh - 70px)` |
| Main padding | `0 52px 80px` |
| Section gap | `padding-top: 56px` |

---

## 6. Responsive Behavior

At `≤ 860px`:
- Sidebar hidden via `display: none` in CSS (no JS needed)
- Shell switches to single-column (`flex-direction: column`)
- Main padding reduced to `0 20px 80px`
- BottomTabBar remains as-is (existing behavior)

---

## 7. Content Source

All section content is copied verbatim from:
`logo/How the System Works - Content Component.html`

Sections covered:
1. Who Does What — role table
2. Transaction Flow — 6-step timeline
3. Flag Colors — green / yellow / red cards
4. Approval Queue — 4-action grid, special cases table, return flow steps
5. Corrections — adjusting entry steps, reversal entry table
6. BIR Reports — report table + callout box
7. Client Setup — 4-step timeline
8. Quick Reference — status lifecycle pills + full process flow diagram

---

## 8. Checklist

- [ ] Help link added to Topbar avatar dropdown below Settings
- [ ] Route `/accountant/help` created and protected (inherits middleware)
- [ ] Page mounts inside existing accountant layout (Topbar stays)
- [ ] Two-column shell renders correctly at full width
- [ ] Sidebar is sticky and clears the 70px Topbar
- [ ] All 7 sections + Quick Reference render with correct content
- [ ] Scrollspy activates correct sidebar link as user scrolls
- [ ] Responsive: collapses to single column at ≤ 860px
- [ ] Smooth scroll works on anchor links
- [ ] Missing CSS tokens scoped locally, no globals modified
