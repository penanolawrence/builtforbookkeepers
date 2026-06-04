# Page Redesign — Design Spec

**Date:** 2026-06-04
**Status:** Approved

---

## Problem

All pages outside the dashboard use inconsistent, ad-hoc layouts: small `text-lg` headings, no summary cards, filter toolbars baked into table card headers, and no max-width constraint. The dashboard and login already have a polished visual language; the remaining pages need to be brought up to the same standard.

---

## Solution

Apply a unified page layout system to 10 pages across all three roles (client, accountant, admin). Every page follows the same top-to-bottom structure. Design handoff HTML files are in `design_handoff_pages/` — each is fully self-contained with Sofia/Yoda theme toggle.

---

## Page Layout (universal)

All pages share this structure, top to bottom:

| Zone | Spec |
|---|---|
| **Content constraint** | `max-width: 1280px; margin: 0 auto; padding: 28px 36px` |
| **Breadcrumb** | `font-size: 13px`, `color: muted`, active segment `ink / 600`, chevron separators in `faint` |
| **Page header row** | flex row, space-between. Left: `h1` Bricolage 800 / 34px / `letter-spacing: -.025em` + subtitle `muted / 14.5px`. Right: action buttons |
| **Summary cards strip** | `display: flex; gap: 14px`. Each card: `card` bg, `line` border, `border-radius: 16px`, `padding: 16px 20px`, label `11px / 700 / faint / uppercase / .06em`, value Bricolage 800 / 26px, subnote `12px / faint` |
| **Filter bar** | `display: flex; gap: 10px`. Dropdowns `height: 40px / border-radius: 11px / border: 1.5px solid line / card bg / 13.5px 600`. Date fields same style with calendar icon. Entry count right-aligned `13px / muted / 500` |
| **Table card** | `card` bg, `line` border, `border-radius: 20px`, `overflow: hidden`, shadow. Card header row `18px 24px` padding with icon + Bricolage 700/16px title + count badge + optional tier badge. Column headers `12px 24px / 11px / 700 / faint / uppercase / .06em`. Rows `13px 24px`, `lineSoft` dividers, alternating `cardAlt` on even rows. "In Review" / flagged rows get `3px` left-border accent. Footer `14px 24px / 2px solid line / cardAlt bg` |

**Button styles:**
- `PrimaryBtn`: `linear-gradient(150deg, primary, primaryDeep)`, white, `border-radius: 12px`, `padding: 12px 20px`, `14px / 700`, glow shadow
- `GhostBtn`: `border: 1px solid line`, `card` bg, `border-radius: 12px`, `padding: 10px 16px`, `13.5px / 600`

**Chip styles:**
- Source chips: `padding: 3px 10px; border-radius: 8px; 12.5px / 600`. Manual → `pending` tier colors; Upload → `chipBg + line border + muted`
- Status chips: `border-radius: 999px; padding: 4px 12px; 12.5px / 700`. Tier mapping below
- Type chips (Income/Expense): semantic green / semantic red, `border-radius: 8px`

**Status → tier mapping:**

| Status | Tier |
|---|---|
| In Review | review |
| Check Needed | check |
| Approved | ready |
| Pending | check |
| Draft | pending |
| Processing | pending |
| Rejected | review |
| Active | ready |
| Overdue | check |
| Suspended | review |
| Inactive | pending |
| Pending Invite | check |

---

## Pages

### 1. Documents — `/client/documents`
- **Breadcrumb:** My Business › Documents
- **Cards:** Total Entries · Total Inflow (ready.fg) · Total Outflow (review.fg) · Net Flow (ready/review.fg)
- **Filters:** All Statuses · All Types · Date range (start/end)
- **Columns:** Reference · Source · Uploaded · Inflow · Outflow · Status · Note
- **Actions:** Export (ghost) · Add Entry (primary)
- **Row accent:** In Review rows get `review.fg` left border

### 2. Upload Documents — `/client/upload`
- **Breadcrumb:** My Business › Upload Documents
- **Cards:** Income This Month (ready.fg) · Expense This Month (review.fg) · In Progress (check.fg)
- **Content:** Two upload zone cards side by side (income/expense). Each zone has: icon chip (semantic green/red), drop area with dashed border, browse/photo buttons, formats hint
- **CTA:** Full-width `linear-gradient(150deg, primary, primaryDeep)` "Enter manually" button between zones and table
- **Below CTA:** In Progress table card (same column structure as Documents, without Note column)

### 3. Review Queue — `/accountant/queue` · `/admin/queue`
- **Breadcrumb:** Dashboard › Review Queue
- **Cards:** Total Items · RED Flags (review.fg) · Yellow Flags (check.fg) · Green / Ready (ready.fg)
- **Filters:** All Clients · All Flags · (Admin version also shows: All Accountants)
- **Action (right of filter bar):** Approve Selected (N) — primary button, N = count of GREEN-flagged selected items
- **Columns:** ☐ checkbox · Flag chip · Client · Reference · Type chip · Inflow · Outflow · Uploaded
- **Row accent:** RED rows → `review` tier bg + left border; YELLOW rows → `check` tier bg + left border
- **Flag chips:** RED → semantic `#FEE2E2 / #B91C1C`; YELLOW → semantic `#FEF3C7 / #92400E`; GREEN → semantic `#DCFCE7 / #166534`

### 4. My Clients — `/accountant/clients`
- **Breadcrumb:** Dashboard › My Clients
- **Cards:** Total Clients · Need Attention (review.fg, clients with RED > 0) · Pending Review (check.fg, total RED+YEL items) · All Clear (ready.fg)
- **Filters:** Search input
- **Columns:** Business Name · VAT · Plan · RED · YEL · GRN (tier badge cells)
- **Actions:** None in header

### 5. Adjusting Entries — `/accountant/adjusting-entries`
- **Breadcrumb:** Dashboard › Adjusting Entries
- **Cards:** Total Entries · Pending (check.fg) · Approved (ready.fg) · Draft (pending.fg)
- **Filters:** All Clients · All Statuses
- **Columns:** Type chip · Client · Description · Date · Debit (ready.fg) · Credit (review.fg) · Status chip
- **Actions:** + New Entry (primary)
- **Table badge:** "N pending" in check tier

### 6. Clients — `/admin/clients`
- **Breadcrumb:** Admin › Clients
- **Cards:** Total · Active (ready.fg) · Overdue (check.fg) · Suspended (review.fg)
- **Filters:** Search · All Statuses · All Accountants
- **Columns:** Business Name · VAT · Plan · Status chip · Accountant
- **Actions:** + New Client (primary)

### 7. Accountants — `/admin/accountants`
- **Breadcrumb:** Admin › Accountants
- **Cards:** Total · Active (ready.fg) · Pending Invite (check.fg) · Suspended (review.fg)
- **Filters:** All Statuses
- **Columns:** Name (with avatar initials) · Email · Status chip · Clients count · Last Active · Actions (context buttons)
- **Actions:** + Invite Accountant (primary)
- **Row actions:** Active → "Deactivate" (review tier button); Pending Invite → "Resend Invite" (ghost)

### 8. Billing — `/admin/billing`
- **Breadcrumb:** Admin › Billing
- **Cards:** Total Payments · Total Received (ready.fg) · This Month (primary) · Active Clients
- **Filters:** All Clients · Date range (start/end)
- **Columns:** Client · Amount (ready.fg) · Date Received · Reference · Recorded By
- **Actions:** Receive Payment (primary)
- **Footer:** payment count + total amount

### 9. Income Statement — `/client/reports/income-statement`
- **Breadcrumb:** Reports › Income Statement
- **Subtitle:** "Approved transactions only"
- **No summary cards** — toolbar leads directly to table
- **Toolbar card** (`card` bg, `border-radius: 14px`, shadow): Period label · Start date field · End date field · Generate (primary) · Export PDF (ghost, right-aligned)
- **Table structure:** INCOME section header (cardAlt row) → expandable income rows (chevron toggle) → Total Income subtotal (ready.fg) → EXPENSES section header → expandable expense rows → Total Expenses subtotal (review.fg) → Net Income/Loss footer row (full-width, tier bg color based on profit/loss)
- **Expandable rows:** click to reveal sub-category breakdown indented at `pl-52px`

### 10. Expense Breakdown — `/client/reports/expense-breakdown`
- **Breadcrumb:** Reports › Expense Breakdown
- **Subtitle:** "Approved transactions only"
- **No summary cards**
- **Toolbar card:** same as Income Statement (Period · dates · Generate · Export PDF)
- **Columns:** Category · Amount (review.fg, right-aligned) · % of Total (bar + percentage, right-aligned)
- **Bar:** `height: 6px; border-radius: 3px; review.fg at 50% opacity`, scaled to max row width of 140px
- **Footer:** Total Expenses · 100%

### 11. BIR Books — `/client/reports/bir`
- **Breadcrumb:** Reports › BIR Books
- **Subtitle:** "For reference only — your accountant handles official submission"
- **No summary cards**
- **Toolbar card:** Book tab switcher (CRB / CDB / GJ / GL, pill-style with active gradient) · Date range · Account picker dropdown (visible only when GL tab is active) · View (primary) · Export PDF (ghost)
- **Book tab switcher:** `surface` bg container, `border-radius: 10px`, active tab gets `linear-gradient(150deg, primary, primaryDeep)` white text, inactive tabs `muted` text
- **Table columns by book:**
  - CRB/CDB: Date · Reference · Particulars · Inflow/Outflow (ready/review.fg) · Running Balance
  - GJ: Date · Reference · Particulars · Debit (ready.fg) · Credit (review.fg)
  - GL: Date · Reference · Particulars · Debit · Credit · Balance

---

## Report Pages — No Summary Cards

Income Statement, Expense Breakdown, and BIR Books skip the summary cards strip entirely. The toolbar card (date range + generate/view button + export) is the second element after the page header, immediately above the table card. This keeps report pages focused and avoids re-displaying totals that are already prominent in the table footer.

---

## Design Handoff Files

All handoffs are in `design_handoff_pages/` at the project root:

```
design_handoff_pages/
  Documents.html
  Upload.html
  Queue.html
  My-Clients.html
  Adjusting-Entries.html
  Clients-Admin.html
  Accountants.html
  Billing.html
  Income-Statement.html
  Expense-Breakdown.html
  BIR-Books.html
```

Each file is fully self-contained (React + inline Babel, Google Fonts via CDN) with working Sofia/Yoda theme toggle.

---

## Out of Scope

- Dashboard page — already redesigned, not touched
- Reports picker page (`/client/reports`) — deferred
- Admin queue page — same implementation as accountant queue; use same handoff
- Admin adjusting entries page — same implementation as accountant version
- Modal dialogs (ManualEntryForm, ConfirmUploadDialog, QueueReviewModal, PaymentModal, NewEntryModal) — not part of this redesign
- Individual report sub-pages (accountant-facing versions of Income Statement, Expense Breakdown, BIR Books) — same layout as client versions; handled in implementation

---

## Success Criteria

- All 10 pages match their design handoff at 1280px viewport
- Max-width constraint (`max-width: 1280px; margin: 0 auto`) applied to all pages
- Page headings use Bricolage Grotesque 800 / 34px / `letter-spacing: -.025em`
- Summary cards present on all non-report pages; absent on report pages
- All status/source/type chips use `t-tier-*` CSS variables (no hardcoded colors)
- Sofia/Yoda themes both render correctly
- No regression on existing dashboard, login, or modal components
