# Help Page Update — Design Spec

**Date:** 2026-06-15
**Status:** Approved

---

## Overview

Update `HelpPageContent.tsx` and `HelpSidebarNav.tsx` to reflect three features added since the help page was originally written: the VAT Report rework (full-page 4-tab view), the Non-VAT Report (2551Q), and the Merchant TIN field in the queue review modal. The change also corrects the section numbering to give BIR tax reports their own dedicated section.

---

## Section Structure

| # | Old Title | New Title | Change |
|---|---|---|---|
| 1 | Who Does What | Who Does What | None |
| 2 | Transaction Flow | Transaction Flow | None |
| 3 | Flag Colors | Flag Colors | None |
| 4 | Approval Queue | Approval Queue | Add Merchant TIN callout |
| 5 | Corrections | Corrections | None |
| 6 | BIR Books and Reports | BIR Books | Title trimmed; content unchanged |
| 7 | Client Setup | BIR Tax Reports | Replaced with new section |
| 8 | *(none)* | Client Setup | Old Section 7 content + 1 line on birType |
| — | Quick Reference | Quick Reference | None |

---

## Section 4 — Approval Queue (addition)

After the existing "Special Cases in the Queue" table, add a callout block:

> **Merchant TIN (expense transactions only):** When reviewing an expense, a "Merchant TIN" field appears in the document details panel. Fill this in if the supplier's TIN is visible on the receipt — it's required for the BIR Summary List of Purchases (SLP) report.

Use the existing `.callout` class, consistent with the "Batch Approval Shortcut" callout already in this section.

---

## Section 6 — BIR Books (edit)

**Heading:** Change from "BIR Books and Reports" → "BIR Books"

**Section id:** Keep `id="reports"` (sidebar link unchanged for this section).

**Callout text:** Change "All four books are formatted for loose-leaf printing and BIR binding. VAT computation (12/112 split) is handled automatically for VAT-registered clients." — no change needed here.

**Table:** Unchanged (CRB, CDB, GJ, GL).

---

## Section 7 — BIR Tax Reports (new)

**Section id:** `id="tax-reports"`

**Eyebrow:** Section 7

**Heading:** BIR Tax Reports

**Lead paragraph:**
> The system generates two types of BIR tax reports depending on the client's VAT status. Which report a client sees is determined by their BIR type, set when the account was created.

### Subhead: For VAT-registered clients — VAT Report

Paragraph: *"Accessible at Reports → VAT Report. A full-page view with four tabs:"*

Table using `.dtable`:

| Tab | What it is | Filter |
|---|---|---|
| 2550M | Monthly VAT return — taxable sales, output VAT, taxable purchases, input VAT, net VAT payable | Month + Year |
| 2550Q | Quarterly VAT return — same columns, broken down by month with a quarter total | Quarter + Year |
| SLS | Summary List of Sales — one row per income transaction, includes buyer TIN | Quarter + Year |
| SLP | Summary List of Purchases — one row per expense transaction, includes supplier TIN | Quarter + Year |

Callout using `.callout`:
> Select a client (accountant/admin only), choose your filters, click **View** to preview on screen, then **Download PDF**.

### Subhead: For non-VAT registered clients — Non-VAT Report (2551Q)

Paragraph:
> Accessible at Reports → Non-VAT Report. A single-tab page showing Quarterly Percentage Tax at 3% of gross receipts. The table lists gross receipts and percentage tax per month in the quarter, with a quarter total. This covers BIR Form 2551Q, filed quarterly.

### Subhead: Who sees what

Use the existing `.dtable` style:

| Portal | What they see |
|---|---|
| Accountant / Admin | Both VAT Report and Non-VAT Report cards are always visible. The client selector on each report page only shows clients of the matching BIR type. |
| Client | Only their own report card appears, based on their BIR type (VAT-registered or Non-VAT). |

---

## Section 8 — Client Setup (moved from Section 7)

**Section id:** `id="clients"` (unchanged from old Section 7)

**Eyebrow:** Section 8

**Heading:** Setting Up a New Client

**Content:** Copy verbatim from current Section 7, then extend Step 1 body with one sentence:

Current Step 1 body ends with:
> Required: business name, mobile number, VAT status (VAT-registered or Non-VAT), and plan type.

Append:
> The VAT status also determines which BIR tax report the client can access — VAT-registered clients see the VAT Report, non-VAT clients see the Non-VAT Report (2551Q).

Steps 2–4 unchanged.

---

## Sidebar Nav Changes

**File:** `frontend/src/components/help/HelpSidebarNav.tsx`

Update `NAV_ITEMS`:

```ts
const NAV_ITEMS = [
  { id: 'overview',    label: '1. Who Does What'    },
  { id: 'transaction', label: '2. Transaction Flow'  },
  { id: 'flags',       label: '3. Flag Colors'       },
  { id: 'approval',   label: '4. Approval Queue'    },
  { id: 'corrections', label: '5. Corrections'       },
  { id: 'reports',     label: '6. BIR Books'         },  // was '6. BIR Books and Reports'
  { id: 'tax-reports', label: '7. BIR Tax Reports'   },  // new
  { id: 'clients',     label: '8. Client Setup'      },  // was '7. Client Setup'
  { id: 'status',      label: 'Quick Reference'      },
]
```

---

## Files Changed

| File | Change |
|---|---|
| `frontend/src/components/help/HelpPageContent.tsx` | Section 4 callout, Section 6 title, new Section 7, Section 8 (old S7 + 1 line) |
| `frontend/src/components/help/HelpSidebarNav.tsx` | Update `NAV_ITEMS` labels and add `tax-reports` entry |

No route files, no layout files, no CSS changes required.

---

## Checklist

- [ ] Section 4: Merchant TIN callout added after Special Cases table
- [ ] Section 6: heading trimmed to "BIR Books", `id` unchanged
- [ ] Section 7: new BIR Tax Reports section with `id="tax-reports"`, eyebrow, lead, VAT table, non-VAT paragraph, who-sees-what table
- [ ] Section 8: old Client Setup content under new eyebrow "Section 8", Step 1 extended with birType line
- [ ] Sidebar `NAV_ITEMS`: item 6 label updated, item 7 added, item 8 label updated
- [ ] All three help portals (accountant, client, admin) unaffected — they use `HelpPageContent` directly
