# Bookkeepers Landing Page Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign the marketing landing page to match the reference design — replacing the hero pug mascot with a full Review Queue browser mockup, folding BIRSection into FeaturesSection, dropping MascotBanner, and upgrading the FAQ to a client-side accordion.

**Architecture:** Eight discrete tasks in dependency order — page cleanup first, then component-by-component updates, hero rewrite last. Each task is committed independently. CSS lives in `landing.css` alongside the component it styles.

**Tech Stack:** Next.js 14 App Router, TypeScript, React, Jest + Testing Library, plain CSS (no Tailwind in landing — uses CSS vars from `theme.css`)

---

## File Map

| File | Action | Responsibility |
|------|--------|---------------|
| `frontend/src/app/page.tsx` | Modify | Remove BIRSection + MascotBanner; update metadata |
| `frontend/src/components/landing/MascotBanner.tsx` | **Delete** | No longer in design |
| `frontend/src/components/landing/__tests__/MascotBanner.test.tsx` | **Delete** | No longer in design |
| `frontend/src/components/landing/BIRSection.tsx` | **Delete** | Content absorbed into FeaturesSection |
| `frontend/src/components/landing/HowItWorksSection.tsx` | Modify | Add sub copy + AI chip on step 2 |
| `frontend/src/components/landing/FeaturesSection.tsx` | Modify | Add BIR callout banner below features grid |
| `frontend/src/components/landing/FAQSection.tsx` | Modify | Convert from static to client-side accordion |
| `frontend/src/components/landing/__tests__/FAQSection.test.tsx` | **Create** | Accordion behaviour tests |
| `frontend/src/components/landing/ReviewQueueMockup.tsx` | **Create** | Browser mockup server component |
| `frontend/src/components/landing/__tests__/ReviewQueueMockup.test.tsx` | **Create** | Mockup render tests |
| `frontend/src/components/landing/HeroSection.tsx` | Modify | Replace PugMascot with ReviewQueueMockup; update copy |
| `frontend/src/components/landing/__tests__/LandingPage.test.tsx` | Modify | Remove MascotBanner mock; remove BIR heading assertion; add new assertions |
| `frontend/src/app/landing.css` | Modify | Hero grid; mockup; AI chip; BIR callout; accordion styles |

---

## Task 1: Clean up page.tsx — remove BIRSection + MascotBanner, update metadata

**Files:**
- Modify: `frontend/src/app/page.tsx`

- [ ] **Step 1: Remove imports and JSX for BIRSection and MascotBanner**

Replace the full contents of `frontend/src/app/page.tsx` with:

```tsx
import type { Metadata } from 'next'
import './landing.css'
import { LandingNav }          from '@/components/landing/LandingNav'
import { HeroSection }         from '@/components/landing/HeroSection'
import { ProblemsSection }     from '@/components/landing/ProblemsSection'
import { HowItWorksSection }   from '@/components/landing/HowItWorksSection'
import { FeaturesSection }     from '@/components/landing/FeaturesSection'
import { PricingSection }      from '@/components/landing/PricingSection'
import { FAQSection }          from '@/components/landing/FAQSection'
import { FinalCTA }            from '@/components/landing/FinalCTA'
import { LandingFooter }       from '@/components/landing/LandingFooter'

export const metadata: Metadata = {
  title: 'Sofia Books — AI-Assisted Bookkeeping for Philippine SMEs',
  description:
    'Take on more clients, not more hours. Sofia Books organizes receipts, sorts everything into an AI-powered review queue, and generates BIR books on demand. ₱999/month.',
  openGraph: {
    title: 'Sofia Books — AI-Assisted Bookkeeping for Philippine SMEs',
    description:
      'Take on more clients, not more hours. Sofia Books organizes receipts, sorts everything into an AI-powered review queue, and generates BIR books on demand.',
    type: 'website',
  },
}

export default function LandingPage() {
  return (
    <div className="ld-page">
      <LandingNav />
      <main>
        <HeroSection />
        <ProblemsSection />
        <HowItWorksSection />
        <FeaturesSection />
        <PricingSection />
        <FAQSection />
        <FinalCTA />
      </main>
      <LandingFooter />
    </div>
  )
}
```

- [ ] **Step 2: Run the existing test suite to confirm it still passes**

```
cd frontend && npm test -- --testPathPattern="LandingPage" --watchAll=false
```

Expected: All tests PASS (MascotBanner mock is now a no-op; BIR heading assertion still passes because BIRSection.tsx still exists on disk).

- [ ] **Step 3: Commit**

```bash
git add frontend/src/app/page.tsx
git commit -m "refactor(landing): remove BIRSection and MascotBanner from page, update metadata"
```

---

## Task 2: Delete MascotBanner and BIRSection files

**Files:**
- Delete: `frontend/src/components/landing/MascotBanner.tsx`
- Delete: `frontend/src/components/landing/__tests__/MascotBanner.test.tsx`
- Delete: `frontend/src/components/landing/BIRSection.tsx`
- Modify: `frontend/src/components/landing/__tests__/LandingPage.test.tsx`

- [ ] **Step 1: Delete the three files**

```bash
rm frontend/src/components/landing/MascotBanner.tsx
rm frontend/src/components/landing/__tests__/MascotBanner.test.tsx
rm frontend/src/components/landing/BIRSection.tsx
```

- [ ] **Step 2: Update LandingPage.test.tsx**

Replace the full contents of `frontend/src/components/landing/__tests__/LandingPage.test.tsx` with:

```tsx
import { render, screen } from '@testing-library/react'
import LandingPage from '@/app/page'

jest.mock('@/components/landing/NavThemeIcon', () => ({
  NavThemeIcon: () => <button aria-label="Switch to dark mode">🌙</button>,
}))
jest.mock('@/components/landing/MobileDrawer', () => ({
  MobileDrawer: () => <div data-testid="mobile-drawer" />,
}))
jest.mock('@/components/login/PugMascot', () => () => <div data-testid="pug-mascot" />)

describe('LandingPage', () => {
  it('renders the main h1 headline', () => {
    render(<LandingPage />)
    expect(screen.getByRole('heading', { level: 1, name: /take on more clients/i })).toBeInTheDocument()
  })

  it('renders all section headings', () => {
    render(<LandingPage />)
    expect(screen.getByRole('heading', { name: /built for how philippine bookkeeping/i })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /from receipt to bir book/i })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /everything a bookkeeper needs/i })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /one plan/i })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /common questions/i })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /ready to take on more clients/i })).toBeInTheDocument()
  })

  it('shows the ₱999 price', () => {
    render(<LandingPage />)
    expect(screen.getByLabelText(/price: 999 pesos/i)).toBeInTheDocument()
  })

  it('renders the Log in link pointing to /login', () => {
    render(<LandingPage />)
    expect(screen.getByRole('link', { name: /log in/i })).toHaveAttribute('href', '/login')
  })

  it('renders Email us as a mailto link', () => {
    render(<LandingPage />)
    expect(screen.getByRole('link', { name: /email us/i })).toHaveAttribute('href', expect.stringContaining('mailto:'))
  })

  it('renders all 4 BIR book badges', () => {
    render(<LandingPage />)
    expect(screen.getByText('Cash Receipts Book')).toBeInTheDocument()
    expect(screen.getByText('Cash Disbursements Book')).toBeInTheDocument()
    expect(screen.getByText('General Journal')).toBeInTheDocument()
    expect(screen.getByText('General Ledger')).toBeInTheDocument()
  })
})
```

Note: The `bir-ready books` heading assertion is removed (that section is gone). The BIR book badges assertion stays — the badges will be present in FeaturesSection's callout after Task 4.

- [ ] **Step 3: Run tests — expect one failure**

```
cd frontend && npm test -- --testPathPattern="LandingPage" --watchAll=false
```

Expected: `renders all 4 BIR book badges` FAILS (badges not yet in FeaturesSection). All other tests PASS. This is expected — we'll fix it in Task 4.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "refactor(landing): delete MascotBanner and BIRSection components"
```

---

## Task 3: Update HowItWorksSection — sub copy + AI chip

**Files:**
- Modify: `frontend/src/components/landing/HowItWorksSection.tsx`
- Modify: `frontend/src/app/landing.css`

- [ ] **Step 1: Update HowItWorksSection.tsx**

Replace the full contents of `frontend/src/components/landing/HowItWorksSection.tsx` with:

```tsx
// src/components/landing/HowItWorksSection.tsx
const STEPS = [
  {
    title: 'Client uploads receipts',
    desc: 'From any phone browser — no app needed. Income and expense areas are clearly separated. GCash screenshots and Viber photos accepted.',
    aiChip: false,
  },
  {
    title: 'Sofia classifies and flags',
    desc: 'AI assigns categories, detects anomalies (duplicate receipts, VAT mismatches, spending spikes), and sorts items into a Red / Yellow / Green review queue.',
    aiChip: true,
  },
  {
    title: 'You review, approve, and export',
    desc: 'Batch-approve green items in one click. Red and yellow items get individual attention. Generate any BIR book instantly — formatted for loose-leaf submission.',
    aiChip: false,
  },
]

export function HowItWorksSection() {
  return (
    <section id="how-it-works" className="ld-section ld-section--alt" aria-labelledby="hiw-heading">
      <p className="ld-label">How it works</p>
      <h2 id="hiw-heading" className="ld-title">From receipt to BIR book in three steps</h2>
      <p className="ld-sub">
        No manual data entry. No spreadsheet gymnastics. Receipts in, BIR books out.
      </p>
      <ol className="ld-steps">
        {STEPS.map((s, i) => (
          <li key={s.title} className="ld-step">
            <div className="ld-step__num" aria-hidden="true">
              {i + 1}
              {i < STEPS.length - 1 && <div className="ld-step__line" />}
            </div>
            <div>
              <p className="ld-step__title">
                {s.title}
                {s.aiChip && <span className="ld-step__ai-chip">• AI</span>}
              </p>
              <p className="ld-step__desc">{s.desc}</p>
            </div>
          </li>
        ))}
      </ol>
    </section>
  )
}
```

- [ ] **Step 2: Add AI chip CSS to landing.css**

In `frontend/src/app/landing.css`, find the `/* ── How it works ── */` block and add the chip style after `.ld-step__desc`:

```css
.ld-step__ai-chip {
  display: inline-flex; align-items: center;
  background: var(--t-primary-soft); color: var(--t-primary);
  font-size: 10px; font-weight: 700; letter-spacing: 0.3px;
  padding: 2px 8px; border-radius: 999px;
  margin-left: 8px; vertical-align: middle;
}
```

- [ ] **Step 3: Run tests**

```
cd frontend && npm test -- --testPathPattern="LandingPage" --watchAll=false
```

Expected: Same result as before (one failing BIR badges test, rest pass). No regressions.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/components/landing/HowItWorksSection.tsx frontend/src/app/landing.css
git commit -m "feat(landing): add sub copy and AI chip to HowItWorksSection"
```

---

## Task 4: Update FeaturesSection — add BIR callout banner

**Files:**
- Modify: `frontend/src/components/landing/FeaturesSection.tsx`
- Modify: `frontend/src/app/landing.css`

- [ ] **Step 1: Update FeaturesSection.tsx**

Replace the full contents of `frontend/src/components/landing/FeaturesSection.tsx` with:

```tsx
// src/components/landing/FeaturesSection.tsx
const FEATURES = [
  { icon: '🚦', title: 'Red / Yellow / Green queue',  desc: 'Anomalies surface automatically. Green items batch-approve in one click. Red items require individual review.' },
  { icon: '🧾', title: '4 BIR books in one click',    desc: 'CRB, CDB, General Journal, and General Ledger — formatted for loose-leaf BIR submission.' },
  { icon: '💸', title: 'VAT auto-computation',         desc: '12% VAT split for VAT-registered clients. Full-amount posting for Non-VAT clients.' },
  { icon: '📊', title: 'Multi-client dashboard',       desc: 'All your clients in one screen. See who has anomalies or pending items before month-end hits.' },
  { icon: '🔁', title: 'Adjusting entries',            desc: 'Reclassify, reverse, or add entries with a full permanent audit trail.' },
  { icon: '📱', title: 'Mobile-first upload',          desc: 'Clients upload from any phone browser — no app install. GCash screenshots accepted.' },
]

const BIR_BOOKS = [
  'Cash Receipts Book',
  'Cash Disbursements Book',
  'General Journal',
  'General Ledger',
]

export function FeaturesSection() {
  return (
    <section id="features" className="ld-section" aria-labelledby="features-heading">
      <p className="ld-label">Features</p>
      <h2 id="features-heading" className="ld-title">
        Everything a bookkeeper needs. Nothing they don&rsquo;t.
      </h2>
      <ul className="ld-features__grid" role="list">
        {FEATURES.map((f) => (
          <li key={f.title} className="ld-feature-card">
            <p className="ld-feature-card__icon" aria-hidden="true">{f.icon}</p>
            <p className="ld-feature-card__title">{f.title}</p>
            <p className="ld-feature-card__desc">{f.desc}</p>
          </li>
        ))}
      </ul>

      <div className="ld-bir-callout" aria-label="BIR books generated">
        <div className="ld-bir-callout__copy">
          <p className="ld-bir-callout__title">BIR-ready books, always</p>
          <p className="ld-bir-callout__desc">
            Every approved transaction automatically flows into the four required
            books of accounts. Formatted for loose-leaf printing and BIR submission.
          </p>
        </div>
        <ul className="ld-bir-callout__chips" role="list">
          {BIR_BOOKS.map((b) => (
            <li key={b} className="ld-bir-callout__chip">{b}</li>
          ))}
        </ul>
      </div>
    </section>
  )
}
```

- [ ] **Step 2: Add BIR callout CSS and remove old BIR styles from landing.css**

In `frontend/src/app/landing.css`:

**Remove** the `/* ── BIR ── */` block:
```css
/* ── BIR ── */
.ld-bir__books { display: flex; gap: 8px; flex-wrap: wrap; margin: 14px 0 18px; }
.ld-bir__badge {
  background: var(--t-primary-soft); color: var(--t-primary-deep);
  font-size: 12px; font-weight: 700;
  padding: 6px 14px; border-radius: 999px;
  border: 1px solid var(--t-line);
}
.ld-bir__note { font-size: 13px; color: var(--t-muted); line-height: 1.6; }
.ld-bir__note strong { color: var(--t-ink); }
```

**Also remove** the `/* ── Mascot banner ── */` block (component deleted in Task 2):
```css
/* ── Mascot banner ── */
.ld-mascot-banner {
  display: flex; align-items: center; gap: 18px;
  background: var(--t-primary-soft); border: 1px solid var(--t-line);
  border-radius: 18px; padding: 20px 24px;
  box-shadow: var(--t-shadow);
}
.ld-mascot-banner__name { font-size: 13px; font-weight: 700; color: var(--t-primary); margin: 0 0 4px; }
.ld-mascot-banner__line { font-size: 14px; color: var(--t-ink); line-height: 1.55; margin: 0; }
```

**Add** after the `/* ── Features ── */` block:

```css
/* ── Features BIR callout ── */
.ld-bir-callout {
  display: flex; flex-wrap: wrap; gap: 20px;
  justify-content: space-between; align-items: flex-start;
  margin-top: 20px;
  background: var(--t-primary-soft);
  border-radius: 16px; padding: 24px;
}
.ld-bir-callout__copy { flex: 1; min-width: 220px; }
.ld-bir-callout__title {
  font-size: 15px; font-weight: 700; color: var(--t-ink); margin: 0 0 6px;
}
.ld-bir-callout__desc {
  font-size: 13px; color: var(--t-muted); line-height: 1.6; margin: 0;
}
.ld-bir-callout__chips {
  display: flex; flex-wrap: wrap; gap: 6px;
  align-items: flex-start; list-style: none; padding: 0; margin: 0;
}
.ld-bir-callout__chip {
  font-size: 12px; font-weight: 600; color: var(--t-primary);
  border: 1px solid var(--t-primary); background: var(--t-card);
  padding: 5px 14px; border-radius: 999px;
}
```

- [ ] **Step 3: Run tests — BIR badges test should now pass**

```
cd frontend && npm test -- --testPathPattern="LandingPage" --watchAll=false
```

Expected: ALL tests PASS. The `renders all 4 BIR book badges` test now finds the chips in FeaturesSection.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/components/landing/FeaturesSection.tsx frontend/src/app/landing.css
git commit -m "feat(landing): fold BIR callout into FeaturesSection, remove dead CSS"
```

---

## Task 5: Upgrade FAQSection to client-side accordion

**Files:**
- Create: `frontend/src/components/landing/__tests__/FAQSection.test.tsx`
- Modify: `frontend/src/components/landing/FAQSection.tsx`
- Modify: `frontend/src/app/landing.css`

- [ ] **Step 1: Write the failing FAQSection test**

Create `frontend/src/components/landing/__tests__/FAQSection.test.tsx`:

```tsx
import { render, screen, fireEvent } from '@testing-library/react'
import { FAQSection } from '../FAQSection'

describe('FAQSection', () => {
  it('renders all 5 questions as buttons', () => {
    render(<FAQSection />)
    expect(screen.getByRole('button', { name: /do my clients need to download an app/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /can i manage multiple sme clients/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /is it bir-compliant/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /what if the ai misclassifies/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /can clients see what the accountant is doing/i })).toBeInTheDocument()
  })

  it('opens the first item by default (aria-expanded=true)', () => {
    render(<FAQSection />)
    const firstBtn = screen.getByRole('button', { name: /do my clients need to download an app/i })
    expect(firstBtn).toHaveAttribute('aria-expanded', 'true')
  })

  it('second item is closed by default (aria-expanded=false)', () => {
    render(<FAQSection />)
    const secondBtn = screen.getByRole('button', { name: /can i manage multiple sme clients/i })
    expect(secondBtn).toHaveAttribute('aria-expanded', 'false')
  })

  it('clicking a closed item opens it', () => {
    render(<FAQSection />)
    const secondBtn = screen.getByRole('button', { name: /can i manage multiple sme clients/i })
    fireEvent.click(secondBtn)
    expect(secondBtn).toHaveAttribute('aria-expanded', 'true')
  })

  it('clicking the open item closes it', () => {
    render(<FAQSection />)
    const firstBtn = screen.getByRole('button', { name: /do my clients need to download an app/i })
    fireEvent.click(firstBtn)
    expect(firstBtn).toHaveAttribute('aria-expanded', 'false')
  })

  it('opening a new item closes the previously open item', () => {
    render(<FAQSection />)
    const secondBtn = screen.getByRole('button', { name: /can i manage multiple sme clients/i })
    fireEvent.click(secondBtn)
    const firstBtn = screen.getByRole('button', { name: /do my clients need to download an app/i })
    expect(firstBtn).toHaveAttribute('aria-expanded', 'false')
    expect(secondBtn).toHaveAttribute('aria-expanded', 'true')
  })
})
```

- [ ] **Step 2: Run to confirm the test fails**

```
cd frontend && npm test -- --testPathPattern="FAQSection" --watchAll=false
```

Expected: FAIL — `renders all 5 questions as buttons` fails because the current FAQSection uses `<dt>` not `<button>`.

- [ ] **Step 3: Rewrite FAQSection.tsx as a client-side accordion**

Replace the full contents of `frontend/src/components/landing/FAQSection.tsx` with:

```tsx
'use client'
import { useState } from 'react'

const FAQS = [
  {
    q: 'Do my clients need to download an app?',
    a: 'No. Sofia Books is fully web-based. Clients upload receipts from any phone browser — no app install needed.',
  },
  {
    q: 'Can I manage multiple SME clients from one account?',
    a: 'Yes. Your firm gets one account. You can create unlimited client workspaces and assign accountants to specific clients.',
  },
  {
    q: 'Is it BIR-compliant?',
    a: 'Yes. The system generates CRB, CDB, General Journal, and General Ledger formatted for loose-leaf BIR submission. VAT computation follows BIR rules.',
  },
  {
    q: 'What if the AI misclassifies a transaction?',
    a: 'Nothing posts to the books without your approval. Low-confidence items are flagged yellow so you can correct them before they go through.',
  },
  {
    q: 'Can clients see what the accountant is doing?',
    a: 'Clients see only their own uploaded documents and approved reports. They cannot see pending reviews, other clients, or the approval queue.',
  },
]

export function FAQSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(0)

  return (
    <section id="faq" className="ld-section" aria-labelledby="faq-heading">
      <p className="ld-label">FAQ</p>
      <h2 id="faq-heading" className="ld-title">Common questions</h2>
      <ul className="ld-faq__list" role="list">
        {FAQS.map(({ q, a }, i) => {
          const isOpen = openIndex === i
          return (
            <li key={q} className={`ld-faq__item${isOpen ? ' ld-faq__item--open' : ''}`}>
              <button
                className="ld-faq__btn"
                onClick={() => setOpenIndex(isOpen ? null : i)}
                aria-expanded={isOpen}
              >
                <span className="ld-faq__q">{q}</span>
                <svg className="ld-faq__chevron" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                  <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
              <div className="ld-faq__body" aria-hidden={!isOpen}>
                <p className="ld-faq__a">{a}</p>
              </div>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
```

- [ ] **Step 4: Replace the FAQ CSS block in landing.css**

Find and remove the `/* ── FAQ ── */` block:
```css
/* ── FAQ ── */
.ld-faq__list { display: flex; flex-direction: column; gap: 10px; }
.ld-faq__item {
  background: var(--t-card); border-radius: 14px;
  border: 1px solid var(--t-line); padding: 18px 20px;
  box-shadow: var(--t-shadow);
}
.ld-faq__q { font-size: 14px; font-weight: 700; color: var(--t-ink); margin: 0 0 6px; }
.ld-faq__a { font-size: 13px; color: var(--t-muted); line-height: 1.6; margin: 0; }
```

Replace with:
```css
/* ── FAQ accordion ── */
.ld-faq__list { display: flex; flex-direction: column; gap: 10px; list-style: none; padding: 0; margin: 0; }
.ld-faq__item {
  background: var(--t-card); border-radius: 14px;
  border: 1px solid var(--t-line); padding: 16px 20px;
  box-shadow: var(--t-shadow);
}
.ld-faq__btn {
  width: 100%; display: flex; justify-content: space-between; align-items: center;
  background: none; border: none; cursor: pointer; padding: 0; text-align: left; gap: 12px;
}
.ld-faq__q { font-size: 14px; font-weight: 700; color: var(--t-ink); margin: 0; }
.ld-faq__chevron {
  flex-shrink: 0; width: 16px; height: 16px; color: var(--t-muted);
  transition: transform 0.2s;
}
.ld-faq__item--open .ld-faq__chevron { transform: rotate(180deg); }
.ld-faq__body { overflow: hidden; max-height: 0; transition: max-height 0.25s ease; }
.ld-faq__item--open .ld-faq__body { max-height: 300px; }
.ld-faq__a { font-size: 13px; color: var(--t-muted); line-height: 1.6; margin: 10px 0 2px; }
```

- [ ] **Step 5: Run tests to confirm they pass**

```
cd frontend && npm test -- --testPathPattern="FAQSection" --watchAll=false
```

Expected: ALL 6 tests PASS.

- [ ] **Step 6: Run full suite to check for regressions**

```
cd frontend && npm test -- --watchAll=false
```

Expected: All tests PASS.

- [ ] **Step 7: Commit**

```bash
git add frontend/src/components/landing/__tests__/FAQSection.test.tsx frontend/src/components/landing/FAQSection.tsx frontend/src/app/landing.css
git commit -m "feat(landing): upgrade FAQSection to client-side accordion"
```

---

## Task 6: Create ReviewQueueMockup server component

**Files:**
- Create: `frontend/src/components/landing/__tests__/ReviewQueueMockup.test.tsx`
- Create: `frontend/src/components/landing/ReviewQueueMockup.tsx`
- Modify: `frontend/src/app/landing.css`

- [ ] **Step 1: Write the failing test**

Create `frontend/src/components/landing/__tests__/ReviewQueueMockup.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react'
import { ReviewQueueMockup } from '../ReviewQueueMockup'

describe('ReviewQueueMockup', () => {
  it('renders the Review Queue page title', () => {
    render(<ReviewQueueMockup />)
    expect(screen.getByText('Review Queue')).toBeInTheDocument()
  })

  it('renders all four stat card labels', () => {
    render(<ReviewQueueMockup />)
    expect(screen.getByText('Total Items')).toBeInTheDocument()
    expect(screen.getByText('Red Flags')).toBeInTheDocument()
    expect(screen.getByText('Yellow Flags')).toBeInTheDocument()
    expect(screen.getByText('Green / Ready')).toBeInTheDocument()
  })

  it('renders the Approve Selected button', () => {
    render(<ReviewQueueMockup />)
    expect(screen.getByText(/approve selected/i)).toBeInTheDocument()
  })

  it('renders RED, YEL, and GRN flag labels in transaction rows', () => {
    render(<ReviewQueueMockup />)
    expect(screen.getAllByText(/red/i).length).toBeGreaterThan(0)
    expect(screen.getAllByText(/yel/i).length).toBeGreaterThan(0)
    expect(screen.getAllByText(/grn/i).length).toBeGreaterThan(0)
  })

  it('renders the BIR books floating chip', () => {
    render(<ReviewQueueMockup />)
    expect(screen.getByText(/bir books/i)).toBeInTheDocument()
  })

  it('is wrapped in aria-hidden since it is decorative', () => {
    const { container } = render(<ReviewQueueMockup />)
    expect(container.firstChild).toHaveAttribute('aria-hidden', 'true')
  })
})
```

- [ ] **Step 2: Run to confirm the test fails**

```
cd frontend && npm test -- --testPathPattern="ReviewQueueMockup" --watchAll=false
```

Expected: FAIL — component does not exist yet.

- [ ] **Step 3: Create ReviewQueueMockup.tsx**

Create `frontend/src/components/landing/ReviewQueueMockup.tsx`:

```tsx
// src/components/landing/ReviewQueueMockup.tsx
export function ReviewQueueMockup() {
  return (
    <div className="ld-mockup" aria-hidden="true">

      {/* Browser chrome */}
      <div className="ld-mockup__chrome">
        <div className="ld-mockup__traffic">
          <span className="ld-mockup__dot ld-mockup__dot--red" />
          <span className="ld-mockup__dot ld-mockup__dot--yellow" />
          <span className="ld-mockup__dot ld-mockup__dot--green" />
        </div>
        <div className="ld-mockup__url">builtforbookkeepers.vercel.app/queue</div>
      </div>

      {/* App nav strip */}
      <div className="ld-mockup__appnav">
        <span className="ld-mockup__appnav-brand">🐾 Built for Bookkeepers</span>
        <div className="ld-mockup__appnav-links">
          <span>Dashboard</span>
          <span className="ld-mockup__appnav-active">
            Queue <span className="ld-mockup__badge">8</span>
          </span>
          <span>Adj. Entries</span>
          <span>My Clients</span>
        </div>
        <div className="ld-mockup__appnav-pills">
          <span className="ld-mockup__pill ld-mockup__pill--active">Sofia</span>
          <span className="ld-mockup__pill">Yoda</span>
        </div>
      </div>

      {/* Page content */}
      <div className="ld-mockup__content">
        <p className="ld-mockup__page-title">Review Queue</p>
        <p className="ld-mockup__page-sub">8 documents awaiting your approval</p>

        {/* Stat cards */}
        <div className="ld-mockup__stats">
          <div className="ld-mockup__stat">
            <span className="ld-mockup__stat-val">8</span>
            <span className="ld-mockup__stat-lbl">Total Items</span>
          </div>
          <div className="ld-mockup__stat ld-mockup__stat--red">
            <span className="ld-mockup__stat-val">2</span>
            <span className="ld-mockup__stat-lbl">Red Flags</span>
          </div>
          <div className="ld-mockup__stat ld-mockup__stat--yellow">
            <span className="ld-mockup__stat-val">2</span>
            <span className="ld-mockup__stat-lbl">Yellow Flags</span>
          </div>
          <div className="ld-mockup__stat ld-mockup__stat--green">
            <span className="ld-mockup__stat-val">4</span>
            <span className="ld-mockup__stat-lbl">Green / Ready</span>
          </div>
        </div>

        {/* Filter row */}
        <div className="ld-mockup__filters">
          <span className="ld-mockup__filter-pill">All Clients ▾</span>
          <span className="ld-mockup__filter-pill">All Flags ▾</span>
          <span className="ld-mockup__approve-btn">Approve Selected (4)</span>
        </div>

        {/* Transaction rows */}
        <div className="ld-mockup__table">
          <div className="ld-mockup__row ld-mockup__row--red">
            <span className="ld-mockup__flag ld-mockup__flag--red">⚠ RED</span>
            <span className="ld-mockup__client">ABC Trading Corp.</span>
            <span className="ld-mockup__type ld-mockup__type--income">Income</span>
            <span className="ld-mockup__amount">₱18,450.00</span>
            <span className="ld-mockup__date">May 20</span>
          </div>
          <div className="ld-mockup__row ld-mockup__row--red">
            <span className="ld-mockup__flag ld-mockup__flag--red">⚠ RED</span>
            <span className="ld-mockup__client">ABC Trading Corp.</span>
            <span className="ld-mockup__type">Expense</span>
            <span className="ld-mockup__amount">₱809.00</span>
            <span className="ld-mockup__date">Jun 10</span>
          </div>
          <div className="ld-mockup__row ld-mockup__row--yellow">
            <span className="ld-mockup__flag ld-mockup__flag--yellow">• YEL</span>
            <span className="ld-mockup__client">ABC Trading Corp.</span>
            <span className="ld-mockup__type">Expense</span>
            <span className="ld-mockup__amount">₱150.00</span>
            <span className="ld-mockup__date">Jun 9</span>
          </div>
          <div className="ld-mockup__row ld-mockup__row--green">
            <span className="ld-mockup__flag ld-mockup__flag--green">✓ GRN</span>
            <span className="ld-mockup__client">ABC Trading Corp.</span>
            <span className="ld-mockup__type">Expense</span>
            <span className="ld-mockup__amount">₱137.76</span>
            <span className="ld-mockup__date">Jun 10</span>
          </div>
          <div className="ld-mockup__row ld-mockup__row--green">
            <span className="ld-mockup__flag ld-mockup__flag--green">✓ GRN</span>
            <span className="ld-mockup__client">ABC Trading Corp.</span>
            <span className="ld-mockup__type">Expense</span>
            <span className="ld-mockup__amount">₱1,096.48</span>
            <span className="ld-mockup__date">Jun 10</span>
          </div>
        </div>
      </div>

      {/* Floating chip */}
      <div className="ld-mockup__chip">
        <strong>4×</strong> BIR books<br />in one click
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Add mockup CSS to landing.css**

Add the following block after the `/* ── Features BIR callout ── */` block in `frontend/src/app/landing.css`:

```css
/* ── Review Queue Mockup ── */
.ld-mockup {
  position: relative; border-radius: 12px; overflow: visible;
  border: 1px solid var(--t-line); box-shadow: var(--t-shadow);
  background: var(--t-card); font-size: 11px; line-height: 1.3;
}
.ld-mockup__chrome {
  display: flex; align-items: center; gap: 10px;
  background: var(--t-card-alt); border-bottom: 1px solid var(--t-line);
  padding: 8px 12px; border-radius: 12px 12px 0 0;
}
.ld-mockup__traffic { display: flex; gap: 5px; }
.ld-mockup__dot {
  width: 10px; height: 10px; border-radius: 999px; flex-shrink: 0;
}
.ld-mockup__dot--red    { background: #FF5F57; }
.ld-mockup__dot--yellow { background: #FEBC2E; }
.ld-mockup__dot--green  { background: #28C840; }
.ld-mockup__url {
  flex: 1; text-align: center;
  background: var(--t-surface); border: 1px solid var(--t-line);
  border-radius: 6px; padding: 3px 8px;
  font-size: 10px; color: var(--t-muted); overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}
.ld-mockup__appnav {
  display: flex; align-items: center; flex-wrap: wrap; gap: 8px;
  background: var(--t-card); border-bottom: 1px solid var(--t-line); padding: 7px 12px;
}
.ld-mockup__appnav-brand { font-weight: 700; color: var(--t-ink); font-size: 11px; white-space: nowrap; margin-right: 4px; }
.ld-mockup__appnav-links { display: flex; gap: 10px; align-items: center; flex: 1; }
.ld-mockup__appnav-links span { font-size: 10px; color: var(--t-muted); white-space: nowrap; }
.ld-mockup__appnav-active { color: var(--t-ink) !important; font-weight: 700; }
.ld-mockup__badge {
  display: inline-block; background: var(--t-primary); color: #fff;
  font-size: 9px; font-weight: 700; padding: 1px 5px; border-radius: 999px; margin-left: 2px;
}
.ld-mockup__appnav-pills { display: flex; gap: 4px; }
.ld-mockup__pill {
  font-size: 10px; font-weight: 600; padding: 3px 8px; border-radius: 999px;
  background: var(--t-card-alt); color: var(--t-muted); border: 1px solid var(--t-line);
}
.ld-mockup__pill--active {
  background: var(--t-primary-soft); color: var(--t-primary); border-color: var(--t-primary);
}
.ld-mockup__content { padding: 12px; }
.ld-mockup__page-title { font-size: 14px; font-weight: 800; color: var(--t-ink); margin: 0 0 2px; }
.ld-mockup__page-sub { font-size: 10px; color: var(--t-muted); margin: 0 0 10px; }
.ld-mockup__stats {
  display: grid; grid-template-columns: repeat(4, 1fr); gap: 6px; margin-bottom: 10px;
}
.ld-mockup__stat {
  background: var(--t-card-alt); border: 1px solid var(--t-line); border-radius: 8px; padding: 8px;
}
.ld-mockup__stat--red    { border-color: var(--t-tier-review-ring); }
.ld-mockup__stat--yellow { border-color: var(--t-tier-check-ring); }
.ld-mockup__stat--green  { border-color: var(--t-tier-ready-ring); }
.ld-mockup__stat-val { display: block; font-size: 16px; font-weight: 800; color: var(--t-ink); }
.ld-mockup__stat--red    .ld-mockup__stat-val { color: var(--t-tier-review-fg); }
.ld-mockup__stat--yellow .ld-mockup__stat-val { color: var(--t-tier-check-fg); }
.ld-mockup__stat--green  .ld-mockup__stat-val { color: var(--t-tier-ready-fg); }
.ld-mockup__stat-lbl { display: block; font-size: 9px; color: var(--t-muted); margin-top: 2px; }
.ld-mockup__filters { display: flex; gap: 6px; align-items: center; margin-bottom: 8px; }
.ld-mockup__filter-pill {
  font-size: 10px; color: var(--t-muted);
  border: 1px solid var(--t-line); border-radius: 6px; padding: 3px 8px;
  background: var(--t-card-alt);
}
.ld-mockup__approve-btn {
  margin-left: auto; font-size: 10px; font-weight: 700;
  background: var(--t-primary); color: #fff; padding: 4px 10px; border-radius: 6px;
}
.ld-mockup__table { display: flex; flex-direction: column; border-radius: 6px; overflow: hidden; }
.ld-mockup__row {
  display: grid; grid-template-columns: 50px 1fr 52px 62px 34px;
  gap: 4px; align-items: center; padding: 5px 6px;
  border-left: 3px solid transparent; font-size: 10px;
}
.ld-mockup__row--red    { background: var(--t-tier-review-bg); border-left-color: var(--t-tier-review-ring); }
.ld-mockup__row--yellow { background: var(--t-tier-check-bg);  border-left-color: var(--t-tier-check-ring); }
.ld-mockup__row--green  { background: var(--t-tier-ready-bg);  border-left-color: var(--t-tier-ready-ring); }
.ld-mockup__flag { font-weight: 700; font-size: 9px; }
.ld-mockup__flag--red    { color: var(--t-tier-review-fg); }
.ld-mockup__flag--yellow { color: var(--t-tier-check-fg); }
.ld-mockup__flag--green  { color: var(--t-tier-ready-fg); }
.ld-mockup__client { color: var(--t-ink); font-weight: 600; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.ld-mockup__type { color: var(--t-muted); }
.ld-mockup__type--income { color: var(--t-tier-ready-fg); font-weight: 600; }
.ld-mockup__amount { color: var(--t-ink); font-weight: 600; text-align: right; font-size: 9px; }
.ld-mockup__date { color: var(--t-muted); font-size: 9px; }
.ld-mockup__chip {
  position: absolute; bottom: -16px; left: 16px;
  background: var(--t-card); border: 1px solid var(--t-line);
  box-shadow: var(--t-shadow); border-radius: 10px; padding: 6px 12px;
  font-size: 11px; color: var(--t-ink); line-height: 1.4; white-space: nowrap;
}
```

- [ ] **Step 5: Run tests to confirm they pass**

```
cd frontend && npm test -- --testPathPattern="ReviewQueueMockup" --watchAll=false
```

Expected: ALL 6 tests PASS.

- [ ] **Step 6: Run full suite**

```
cd frontend && npm test -- --watchAll=false
```

Expected: All tests PASS.

- [ ] **Step 7: Commit**

```bash
git add frontend/src/components/landing/__tests__/ReviewQueueMockup.test.tsx frontend/src/components/landing/ReviewQueueMockup.tsx frontend/src/app/landing.css
git commit -m "feat(landing): create ReviewQueueMockup server component with full CSS"
```

---

## Task 7: Rewrite HeroSection — browser mockup + updated copy

**Files:**
- Modify: `frontend/src/components/landing/HeroSection.tsx`
- Modify: `frontend/src/app/landing.css`

- [ ] **Step 1: Rewrite HeroSection.tsx**

Replace the full contents of `frontend/src/components/landing/HeroSection.tsx` with:

```tsx
// src/components/landing/HeroSection.tsx
import { ReviewQueueMockup } from '@/components/landing/ReviewQueueMockup'

export function HeroSection() {
  return (
    <section id="hero" className="ld-hero" aria-labelledby="hero-heading">
      <div className="ld-hero__copy">
        <p className="ld-hero__badge">✦ Built for Philippine Bookkeepers</p>
        <h1 id="hero-heading" className="ld-hero__h1">
          Take on more clients,<br />
          <em>not more hours</em>
        </h1>
        <p className="ld-hero__sub">
          Sofia Books organizes your clients&rsquo; receipts, sorts everything into
          an AI-powered review queue, and generates your BIR books on demand — so
          you can grow without burning out.
        </p>
        <div className="ld-hero__ctas">
          <a href="#cta" className="ld-btn-primary">Get Started — ₱999/mo</a>
          <a href="#how-it-works" className="ld-btn-ghost">See how it works →</a>
        </div>
        <p className="ld-hero__trust">
          No contracts <span aria-hidden="true">·</span> Cancel anytime <span aria-hidden="true">·</span> Everything included
        </p>
      </div>

      <div className="ld-hero__mockup">
        <ReviewQueueMockup />
      </div>
    </section>
  )
}
```

- [ ] **Step 2: Update hero CSS in landing.css**

Find the `/* ── Hero ── */` block. Replace the entire block (from `/* ── Hero ── */` up to but not including `/* ── Anchor scroll offset ── */`) with:

```css
/* ── Hero ── */
.ld-hero {
  display: grid; grid-template-columns: 54fr 46fr;
  align-items: center; gap: 48px;
  padding: 64px max(24px, calc((100% - 1100px) / 2)) 72px;
  background: linear-gradient(145deg, var(--t-primary-soft) 0%, var(--t-surface) 60%);
}
.ld-hero__copy { min-width: 0; }
.ld-hero__badge {
  display: inline-flex; align-items: center; gap: 6px;
  background: var(--t-primary-soft); color: var(--t-primary-deep);
  font-size: 11px; font-weight: 700; letter-spacing: .6px;
  padding: 5px 13px; border-radius: 999px; margin-bottom: 18px;
}
.ld-hero__h1 {
  font-family: var(--font-display), sans-serif;
  font-size: clamp(28px, 5vw, 40px); font-weight: 900;
  color: var(--t-ink); line-height: 1.18; letter-spacing: -0.8px;
  margin: 0 0 14px;
}
.ld-hero__h1 em {
  color: var(--t-primary); font-style: italic;
}
.ld-hero__sub {
  font-size: 16px; color: var(--t-muted); line-height: 1.6;
  margin: 0 0 28px; max-width: 480px;
}
.ld-hero__ctas { display: flex; gap: 12px; flex-wrap: wrap; }
.ld-btn-primary {
  display: inline-flex; align-items: center;
  background: var(--t-primary); color: #fff;
  font-size: 14px; font-weight: 700;
  padding: 12px 24px; border-radius: 999px;
  text-decoration: none; transition: background 0.15s;
}
.ld-btn-primary:hover { background: var(--t-primary-deep); }
.ld-btn-ghost {
  display: inline-flex; align-items: center;
  background: var(--t-card); color: var(--t-muted);
  font-size: 14px; font-weight: 600;
  padding: 12px 20px; border-radius: 999px;
  border: 1px solid var(--t-line); text-decoration: none;
  transition: border-color 0.15s, color 0.15s;
}
.ld-btn-ghost:hover { border-color: var(--t-primary); color: var(--t-primary); }
.ld-hero__trust {
  margin-top: 16px; font-size: 12px; color: var(--t-muted);
  display: flex; gap: 8px; align-items: center; flex-wrap: wrap;
}
.ld-hero__mockup {
  min-width: 0;
  padding-bottom: 24px; /* breathing room for the floating chip */
}

@media (max-width: 768px) {
  .ld-hero {
    grid-template-columns: 1fr;
    padding: 40px 20px 40px;
    gap: 32px;
  }
  .ld-hero__mockup { order: 1; }
  .ld-hero__copy { text-align: center; order: 0; }
  .ld-hero__sub { max-width: 100%; }
  .ld-hero__ctas { justify-content: center; }
  .ld-hero__trust { justify-content: center; }
  .ld-btn-primary, .ld-btn-ghost { width: 100%; justify-content: center; }
}
```

- [ ] **Step 3: Run tests**

```
cd frontend && npm test -- --watchAll=false
```

Expected: All tests PASS. The `renders the main h1 headline` test still matches `/take on more clients/i`.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/components/landing/HeroSection.tsx frontend/src/app/landing.css
git commit -m "feat(landing): rewrite HeroSection with ReviewQueueMockup and updated copy"
```

---

## Task 8: Final LandingPage smoke test update

**Files:**
- Modify: `frontend/src/components/landing/__tests__/LandingPage.test.tsx`

- [ ] **Step 1: Add assertions for new hero copy**

In `frontend/src/components/landing/__tests__/LandingPage.test.tsx`, add two new test cases inside the `describe('LandingPage')` block:

```tsx
  it('renders "not more hours" in the hero h1', () => {
    render(<LandingPage />)
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(/not more hours/i)
  })

  it('renders the trust line copy', () => {
    render(<LandingPage />)
    expect(screen.getByText(/no contracts/i)).toBeInTheDocument()
  })
```

- [ ] **Step 2: Run the full suite to confirm everything passes**

```
cd frontend && npm test -- --watchAll=false
```

Expected: All tests PASS including the two new ones.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/landing/__tests__/LandingPage.test.tsx
git commit -m "test(landing): add assertions for new hero copy and trust line"
```

---

## Post-implementation checklist

- [ ] Run the dev server: `cd frontend && npm run dev`
- [ ] Open `http://localhost:3000` and verify:
  - Hero shows the Review Queue mockup on the right (desktop)
  - H1 shows italic pink "not more hours"
  - Trust line is visible below the CTAs
  - Features section ends with the BIR callout banner
  - FAQ items expand/collapse on click
  - First FAQ item is open by default
  - Theme toggle updates all mockup colors (Sofia ↔ Yoda)
  - Mobile layout: mockup below copy, single column
- [ ] Run full test suite one final time: `cd frontend && npm test -- --watchAll=false`
