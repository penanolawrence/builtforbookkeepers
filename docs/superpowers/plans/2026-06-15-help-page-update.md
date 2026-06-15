# Help Page Update Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Update the shared `HelpPageContent` component and `HelpSidebarNav` to document the VAT Report rework, Non-VAT Report (2551Q), and Merchant TIN field — and renumber sections accordingly.

**Architecture:** Two surgical file edits. `HelpSidebarNav.tsx` gets one new NAV_ITEMS entry and two label/numbering updates. `HelpPageContent.tsx` gets a one-callout addition in Section 4, a title trim in Section 6, a new Section 7 (BIR Tax Reports), and the old Client Setup promoted to Section 8 with one extended sentence. All three help route pages (accountant, client, admin) use `HelpPageContent` directly — no route changes needed.

**Tech Stack:** Next.js 14 App Router, React, TypeScript, Jest + React Testing Library

---

## File Map

| File | Action |
|---|---|
| `frontend/src/app/accountant/help/__tests__/page.test.tsx` | Modify — update section count assertion, add new heading/content checks |
| `frontend/src/components/help/HelpSidebarNav.tsx` | Modify — update NAV_ITEMS (6 label, add 7, renumber 7→8) |
| `frontend/src/components/help/HelpPageContent.tsx` | Modify — Section 4 callout, Section 6 title, new Section 7, Section 8 |

---

## Task 1: Update tests to reflect new structure

**Files:**
- Modify: `frontend/src/app/accountant/help/__tests__/page.test.tsx`

- [ ] **Step 1: Replace the existing section-headings test and add new assertions**

Open `frontend/src/app/accountant/help/__tests__/page.test.tsx` and replace the entire file contents with:

```tsx
import { render, screen } from '@testing-library/react'
import HelpPage from '../page'

jest.mock('@/components/help/HelpSidebarNav', () => ({
  HelpSidebarNav: () => <aside data-testid="sidebar-nav" />,
}))

describe('HelpPage', () => {
  it('renders the page heading', () => {
    render(<HelpPage />)
    expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument()
    expect(screen.getByText(/Sofia Books/)).toBeInTheDocument()
  })

  it('renders all 8 section headings', () => {
    render(<HelpPage />)
    expect(screen.getByText('Who Does What')).toBeInTheDocument()
    expect(screen.getByText(/How a Transaction Enters/)).toBeInTheDocument()
    expect(screen.getByText(/Flag Colors/)).toBeInTheDocument()
    expect(screen.getByText('The Approval Queue')).toBeInTheDocument()
    expect(screen.getByText(/Correcting a Posted/)).toBeInTheDocument()
    expect(screen.getByText('BIR Books')).toBeInTheDocument()
    expect(screen.getByText('BIR Tax Reports')).toBeInTheDocument()
    expect(screen.getByText(/Setting Up a New Client/)).toBeInTheDocument()
  })

  it('renders the Merchant TIN callout in the Approval Queue section', () => {
    render(<HelpPage />)
    expect(screen.getByText(/Merchant TIN/)).toBeInTheDocument()
    expect(screen.getByText(/Summary List of Purchases/)).toBeInTheDocument()
  })

  it('renders the VAT report tab descriptions', () => {
    render(<HelpPage />)
    expect(screen.getByText('2550M')).toBeInTheDocument()
    expect(screen.getByText('2550Q')).toBeInTheDocument()
    expect(screen.getByText('SLS')).toBeInTheDocument()
    expect(screen.getByText('SLP')).toBeInTheDocument()
  })

  it('renders the Non-VAT 2551Q description', () => {
    render(<HelpPage />)
    expect(screen.getByText(/2551Q/)).toBeInTheDocument()
    expect(screen.getByText(/3% of gross receipts/)).toBeInTheDocument()
  })

  it('renders the Quick Reference section', () => {
    render(<HelpPage />)
    expect(screen.getByText('Transaction Status Lifecycle')).toBeInTheDocument()
  })

  it('renders the sidebar nav', () => {
    render(<HelpPage />)
    expect(screen.getByTestId('sidebar-nav')).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run the tests to confirm they fail**

```bash
cd frontend && npx jest src/app/accountant/help/__tests__/page.test.tsx --no-coverage
```

Expected: FAIL — "renders all 8 section headings" fails (no "BIR Tax Reports" heading yet), Merchant TIN, VAT tabs, and 2551Q tests also fail.

---

## Task 2: Update HelpSidebarNav

**Files:**
- Modify: `frontend/src/components/help/HelpSidebarNav.tsx`

- [ ] **Step 1: Update NAV_ITEMS**

Replace the `NAV_ITEMS` constant (lines 5–14) in `frontend/src/components/help/HelpSidebarNav.tsx`:

```ts
const NAV_ITEMS = [
  { id: 'overview',    label: 'Who Does What',    num: '1' },
  { id: 'transaction', label: 'Transaction Flow',  num: '2' },
  { id: 'flags',       label: 'Flag Colors',       num: '3' },
  { id: 'approval',    label: 'Approval Queue',    num: '4' },
  { id: 'corrections', label: 'Corrections',       num: '5' },
  { id: 'reports',     label: 'BIR Books',         num: '6' },
  { id: 'tax-reports', label: 'BIR Tax Reports',   num: '7' },
  { id: 'clients',     label: 'Client Setup',      num: '8' },
  { id: 'status',      label: 'Quick Reference',   num: '—' },
]
```

Changes from old:
- Item 6: `label` changed from `'BIR Reports'` → `'BIR Books'`
- Item 7: new entry `{ id: 'tax-reports', label: 'BIR Tax Reports', num: '7' }`
- Old item 7 (`clients`): `num` changed from `'7'` → `'8'`

- [ ] **Step 2: Run the tests — should still fail on HelpPageContent tests but sidebar change is safe**

```bash
cd frontend && npx jest src/app/accountant/help/__tests__/page.test.tsx --no-coverage
```

Expected: same failures as before (HelpPageContent not yet updated). No new failures.

---

## Task 3: Update HelpPageContent — Section 4 (Merchant TIN callout)

**Files:**
- Modify: `frontend/src/components/help/HelpPageContent.tsx`

- [ ] **Step 1: Add Merchant TIN callout after the Special Cases table**

In `frontend/src/components/help/HelpPageContent.tsx`, find the Special Cases table (around line 202) which ends with:

```tsx
            </table>

            <p className="subhead">What Happens When You Return a Document</p>
```

Insert the callout between the closing `</table>` and the `<p className="subhead">What Happens...` line:

```tsx
            </table>

            <div className="callout" style={{ marginTop: 20 }}>
              <strong>Merchant TIN (expense transactions only):</strong> When reviewing an expense, a &quot;Merchant TIN&quot; field appears in the document details panel. Fill this in if the supplier&apos;s TIN is visible on the receipt — it&apos;s required for the BIR Summary List of Purchases (SLP) report.
            </div>

            <p className="subhead">What Happens When You Return a Document</p>
```

- [ ] **Step 2: Run the tests**

```bash
cd frontend && npx jest src/app/accountant/help/__tests__/page.test.tsx --no-coverage
```

Expected: "Merchant TIN" and "Summary List of Purchases" tests now pass. VAT tabs and 2551Q tests still fail.

---

## Task 4: Update HelpPageContent — Section 6 title

**Files:**
- Modify: `frontend/src/components/help/HelpPageContent.tsx`

- [ ] **Step 1: Trim the Section 6 heading**

Find the Section 6 heading (around line 240):

```tsx
          {/* S6: BIR REPORTS */}
          <div className="section" id="reports">
            <div className="eyebrow"><span className="pip" />Section 6</div>
            <h2>BIR Books and Reports</h2>
```

Change to:

```tsx
          {/* S6: BIR BOOKS */}
          <div className="section" id="reports">
            <div className="eyebrow"><span className="pip" />Section 6</div>
            <h2>BIR Books</h2>
```

The `id`, table content, and callout text inside Section 6 are unchanged.

- [ ] **Step 2: Run the tests**

```bash
cd frontend && npx jest src/app/accountant/help/__tests__/page.test.tsx --no-coverage
```

Expected: "BIR Books" heading assertion now passes. VAT tabs and 2551Q tests still fail.

---

## Task 5: Update HelpPageContent — New Section 7 (BIR Tax Reports) and Section 8 (Client Setup)

**Files:**
- Modify: `frontend/src/components/help/HelpPageContent.tsx`

- [ ] **Step 1: Replace the old Section 7 (Client Setup) with new Section 7 + Section 8**

Find the existing Section 7 block. It starts with:

```tsx
          {/* S7: CLIENT SETUP */}
          <div className="section" id="clients">
            <div className="eyebrow"><span className="pip" />Section 7</div>
            <h2>Setting Up a New Client</h2>
```

Replace the entire old Section 7 block (from `{/* S7: CLIENT SETUP */}` through its closing `</div>`) with the following two sections. The first is the new Section 7, the second is the relocated Client Setup as Section 8.

Paste this in place of the old Section 7:

```tsx
          {/* S7: BIR TAX REPORTS */}
          <div className="section" id="tax-reports">
            <div className="eyebrow"><span className="pip" />Section 7</div>
            <h2>BIR Tax Reports</h2>
            <p className="section-lead">The system generates two types of BIR tax reports depending on the client&apos;s VAT status. Which report a client sees is determined by their BIR type, set when the account was created.</p>

            <p className="subhead">For VAT-registered clients — VAT Report</p>
            <p style={{ color: 'var(--hiw-muted)', fontSize: 14, marginBottom: 14 }}>Accessible at Reports → VAT Report. A full-page view with four tabs:</p>
            <table className="dtable">
              <thead><tr><th>Tab</th><th>What it is</th><th>Filter</th></tr></thead>
              <tbody>
                <tr><td>2550M</td><td>Monthly VAT return — taxable sales, output VAT, taxable purchases, input VAT, net VAT payable</td><td>Month + Year</td></tr>
                <tr><td>2550Q</td><td>Quarterly VAT return — same columns, broken down by month with a quarter total</td><td>Quarter + Year</td></tr>
                <tr><td>SLS</td><td>Summary List of Sales — one row per income transaction, includes buyer TIN</td><td>Quarter + Year</td></tr>
                <tr><td>SLP</td><td>Summary List of Purchases — one row per expense transaction, includes supplier TIN</td><td>Quarter + Year</td></tr>
              </tbody>
            </table>
            <div className="callout">Select a client (accountant/admin only), choose your filters, click <strong>&quot;View&quot;</strong> to preview on screen, then <strong>&quot;Download PDF&quot;</strong>.</div>

            <p className="subhead" style={{ marginTop: 32 }}>For non-VAT registered clients — Non-VAT Report (2551Q)</p>
            <p style={{ color: 'var(--hiw-muted)', fontSize: 14, marginBottom: 20 }}>Accessible at Reports → Non-VAT Report. A single-tab page showing Quarterly Percentage Tax at 3% of gross receipts. The table lists gross receipts and percentage tax per month in the quarter, with a quarter total. This covers BIR Form 2551Q, filed quarterly.</p>

            <p className="subhead">Who sees what</p>
            <table className="dtable">
              <thead><tr><th>Portal</th><th>What they see</th></tr></thead>
              <tbody>
                <tr><td>Accountant / Admin</td><td>Both VAT Report and Non-VAT Report cards are always visible. The client selector on each report page only shows clients of the matching BIR type.</td></tr>
                <tr><td>Client</td><td>Only their own report card appears, based on their BIR type (VAT-registered or Non-VAT).</td></tr>
              </tbody>
            </table>
          </div>

          {/* S8: CLIENT SETUP */}
          <div className="section" id="clients">
            <div className="eyebrow"><span className="pip" />Section 8</div>
            <h2>Setting Up a New Client</h2>
            <p className="section-lead">You add clients directly from your account. The process takes a few minutes.</p>
            <div className="timeline">
              <div className="tl-item"><div className="tl-num">1</div><div className="tl-body"><h3>Fill in the client&apos;s details</h3><p>Go to <strong>Clients → Add New Client</strong>. Required: business name, mobile number, VAT status (VAT-registered or Non-VAT), and plan type. The VAT status also determines which BIR tax report the client can access — VAT-registered clients see the VAT Report, non-VAT clients see the Non-VAT Report (2551Q).</p></div></div>
              <div className="tl-item"><div className="tl-num">2</div><div className="tl-body"><h3>System generates an invite link</h3><p>A one-time link is created for the client to set their own password. If an email was provided it&apos;s sent automatically. Otherwise copy the link and send via Viber, SMS, or in person.</p></div></div>
              <div className="tl-item"><div className="tl-num">3</div><div className="tl-body"><h3>Client sets up their account</h3><p>The client clicks the link, enters their name and a password, and lands on their dashboard. The link works once and expires after 30 days.</p></div></div>
              <div className="tl-item"><div className="tl-num">4</div><div className="tl-body"><h3>If the client never used the link</h3><p>Go to <strong>Client Profile → Reset Access</strong> to generate a new invite link. Same process as the initial setup.</p></div></div>
            </div>
          </div>
```

- [ ] **Step 2: Run all help page tests**

```bash
cd frontend && npx jest src/app/accountant/help/__tests__/page.test.tsx --no-coverage
```

Expected: ALL tests pass.

- [ ] **Step 3: Run the full frontend test suite to check for regressions**

```bash
cd frontend && npx jest --no-coverage
```

Expected: all tests pass.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/app/accountant/help/__tests__/page.test.tsx \
        frontend/src/components/help/HelpSidebarNav.tsx \
        frontend/src/components/help/HelpPageContent.tsx
git commit -m "feat: update help page with BIR Tax Reports section and Merchant TIN note"
```

---

## Self-Review

**Spec coverage:**
- [x] Section 4: Merchant TIN callout — Task 3
- [x] Section 6: title trimmed to "BIR Books" — Task 4
- [x] Section 7: new BIR Tax Reports with VAT tabs table, Non-VAT 2551Q, who-sees-what table — Task 5
- [x] Section 8: Client Setup relocated, Step 1 extended with birType line — Task 5
- [x] Sidebar NAV_ITEMS: item 6 label, new item 7, item 8 renumbered — Task 2
- [x] Tests updated to cover new headings and content — Task 1

**Placeholder scan:** No TBD, TODO, or vague steps. All code blocks are complete.

**Type consistency:** No types introduced. All class names (`section`, `dtable`, `callout`, `tl-item`, `tl-num`, `tl-body`, `subhead`, `section-lead`, `eyebrow`, `pip`, `timeline`) match existing usage in `HelpPageContent.tsx`.
