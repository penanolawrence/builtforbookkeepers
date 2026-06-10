# Bookkeepers Landing Page — Redesign Spec
Date: 2026-06-10
Supersedes: `2026-06-10-bookkeepers-landing-design.md`

## Overview

Full redesign of the marketing landing page using `PROMPT - Rebuild Landing Page Locally.md` as reference, retaining improvements from the current implementation. Key changes: hero gains a high-fidelity Review Queue browser mockup, MascotBanner and standalone BIRSection are removed, BIR callout is folded into FeaturesSection, FAQSection becomes a client-side accordion.

---

## Page Structure

| # | Component | Change |
|---|-----------|--------|
| 1 | `LandingNav` | No change |
| 2 | `HeroSection` | Rewritten — browser mockup replaces pug mascot |
| 3 | `ProblemsSection` | No change (retained from current implementation) |
| 4 | `HowItWorksSection` | Copy update + AI chip on step 2 |
| 5 | `FeaturesSection` | BIR callout banner added at bottom |
| 6 | `PricingSection` | No change |
| 7 | `FAQSection` | Upgraded to client-side accordion |
| 8 | `FinalCTA` | No change |
| 9 | `LandingFooter` | No change |

**Removed:** `MascotBanner.tsx`, `BIRSection.tsx`

**New:** `ReviewQueueMockup.tsx` (server component, used inside HeroSection)

---

## Theme Variables

No new vars required. The mockup reuses existing tier vars from `theme.css`:

| Flag | Background | Border/Foreground |
|------|-----------|-------------------|
| RED  | `--t-tier-review-bg` | `--t-tier-review-ring` / `--t-tier-review-fg` |
| YEL  | `--t-tier-check-bg` | `--t-tier-check-ring` / `--t-tier-check-fg` |
| GRN  | `--t-tier-ready-bg` | `--t-tier-ready-ring` / `--t-tier-ready-fg` |

All mockup surface, card, text, and primary colors use `--t-*` vars so the mockup updates with the theme toggle.

---

## HeroSection

### Layout
Two-column grid (`54fr / 46fr`). Left = copy, right = `ReviewQueueMockup`. Stacks to single column on mobile (copy first, mockup below at reduced scale).

### Left — Copy changes from current

**H1:**
```
Take on more clients,
<em>not more hours</em>
```
`em` styled: `color: var(--t-primary); font-style: italic`

**Subheadline:**
> Sofia Books organizes your clients' receipts, sorts everything into an AI-powered review queue, and generates your BIR books on demand — so you can grow without burning out.

**CTAs:**
- Primary: `Get Started — ₱999/mo` → scrolls to `#cta` (unchanged)
- Ghost: `See how it works →` → scrolls to `#how-it-works` (was "Watch demo →")

**Trust line** (new, below CTAs):
```
No contracts · Cancel anytime · Everything included
```
Styled with `--t-muted`, small font, centered on mobile.

### Right — `ReviewQueueMockup` (new server component)

Pure HTML/CSS server component. All colors use CSS vars. Structure:

```
┌─────────────────────────────────────────────────┐
│ 🔴 🟡 🟢   builtforbookkeepers.vercel.app/queue │  browser chrome
├─────────────────────────────────────────────────┤
│ 🐾 Built for Bookkeepers  Dashboard  Queue(8)   │  app nav strip
│                Adj. Entries  My Clients  [Sofia][Yoda] │
├─────────────────────────────────────────────────┤
│ Review Queue                                    │  page header
│ 8 documents awaiting your approval              │
│ ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐   │
│ │   8    │ │   2    │ │   2    │ │   4    │   │  stat cards
│ │ Total  │ │  Red   │ │ Yellow │ │ Green  │   │
│ └────────┘ └────────┘ └────────┘ └────────┘   │
│ [All Clients ▾] [All Flags ▾]  [Approve (4)]  │  filter row
│─────────────────────────────────────────────────│
│ ▌RED  ABC Trading Corp.  Income   ₱18,450  May 20│  RED row
│ ▌RED  ABC Trading Corp.  Expense    ₱809  Jun 10 │
│ ▌YEL  ABC Trading Corp.  Expense    ₱150  Jun  9 │  YEL row
│ ☑GRN  ABC Trading Corp.  Expense    ₱138  Jun 10 │  GRN row
│ ☑GRN  ABC Trading Corp.  Expense  ₱1,096  Jun 10 │
└─────────────────────────────────────────────────┘
    └── floating chip: "4×  BIR books / in one click"
```

**Row colors:**
- RED rows: `background: var(--t-tier-review-bg)`, left border `3px solid var(--t-tier-review-ring)`, flag text `var(--t-tier-review-fg)`
- YEL rows: `background: var(--t-tier-check-bg)`, left border `3px solid var(--t-tier-check-ring)`, flag text `var(--t-tier-check-fg)`
- GRN rows: `background: var(--t-tier-ready-bg)`, checkbox accent `var(--t-primary)`, flag text `var(--t-tier-ready-fg)`

**Floating chip** (bottom-left of mockup):
- `background: var(--t-card)`, `border: 1px solid var(--t-line)`, `box-shadow: var(--t-shadow)`
- Bold "4×", smaller "BIR books / in one click"

**Browser chrome:**
- Traffic lights: hardcoded `#FF5F57`, `#FEBC2E`, `#28C840` (these are OS chrome colors, not theme-reactive)
- URL bar: `background: var(--t-card-alt)`, text `var(--t-muted)`
- Chrome strip: `background: var(--t-card)`

**App nav strip inside mockup:**
- Background: `var(--t-card)`
- Active item (Queue) gets `--t-primary` color + a count badge
- Sofia/Yoda pills use `--t-primary-soft` / `--t-primary` to hint at the theme toggle

---

## HowItWorksSection

**Copy changes only** (no structural change):

Label: `HOW IT WORKS`
Title: `From receipt to BIR book in three steps` ← already matches current
Sub (new): `No manual data entry. No spreadsheet gymnastics. Receipts in, BIR books out.`

**Step 2 AI chip:** Add a small `• AI` pill badge next to the step title "Sofia classifies and flags". Styled: `background: var(--t-primary-soft)`, `color: var(--t-primary)`, `border-radius: 999px`, `font-size: 11px`.

Step copy is already good — no changes needed.

---

## FeaturesSection

Six feature cards unchanged. New **BIR callout banner** added below the grid:

```
┌──────────────────────────────────────────────────────────────────┐
│  BIR-ready books, always                                         │  ← --t-primary-soft bg
│  Every approved transaction automatically flows into the four    │
│  required books of accounts. Formatted for loose-leaf printing.  │
│                                                                  │
│  [Cash Receipts Book]  [Cash Disbursements Book]                 │
│  [General Journal]     [General Ledger]                          │
└──────────────────────────────────────────────────────────────────┘
```

Pill chips: `border: 1px solid var(--t-primary)`, `color: var(--t-primary)`, `background: var(--t-card)`.

`BIRSection.tsx` is deleted. `BIRSection` import removed from the page.

---

## FAQSection

**Upgrade to client-side accordion** (`'use client'`):
- State: `openIndex: number | null`, default `0` (first item open)
- Clicking an item sets `openIndex` to that index; clicking the open item closes it (`openIndex → null`)
- Chevron icon rotates `180deg` when item is open (CSS transform, no extra JS)
- `aria-expanded` on button, `aria-hidden` on collapsed content

Five questions (unchanged from current):
1. Do my clients need to download an app?
2. Can I manage multiple SME clients from one account?
3. Is it BIR-compliant?
4. What if the AI misclassifies a transaction?
5. Can clients see what the accountant is doing?

---

## Component File Changes Summary

| File | Action |
|------|--------|
| `HeroSection.tsx` | Rewrite — add `ReviewQueueMockup`, update copy |
| `ReviewQueueMockup.tsx` | **Create new** — server component |
| `HowItWorksSection.tsx` | Add sub copy + AI chip on step 2 |
| `FeaturesSection.tsx` | Add BIR callout banner below grid |
| `FAQSection.tsx` | Convert to `'use client'` accordion |
| `MascotBanner.tsx` | Delete |
| `BIRSection.tsx` | Delete |
| `landing.css` | Add hero grid, mockup, AI chip, accordion, BIR callout styles |
| `frontend/src/app/page.tsx` | Remove BIRSection and MascotBanner imports/usage; update metadata description |

---

## Styling Notes

- Hero grid: `display: grid; grid-template-columns: 54fr 46fr; gap: 48px; align-items: center`
- Mockup wrapper: `border-radius: 12px; overflow: hidden; border: 1px solid var(--t-line); box-shadow: var(--t-shadow)`
- Floating chip: `position: absolute; bottom: -16px; left: 24px`
- Mobile (`max-width: 768px`): hero stacks to single column, mockup scales down (`transform: scale(0.85); transform-origin: top center`)
- Do not add `background` or `border-color` to CSS `transition` on elements using `var(--*)` — only transition `box-shadow`, `transform`, `color`, `opacity`

---

## Metadata Update

`frontend/src/app/page.tsx` metadata description updated to:
> `"Take on more clients, not more hours. Sofia Books organizes receipts, sorts everything into an AI-powered review queue, and generates BIR books on demand. ₱999/month."`

OG title unchanged.

---

## Out of Scope

- Demo video / modal
- Testimonials
- Contact form
- Animated mockup or scroll effects on the browser mockup
- Analytics scripts
- Multi-language
