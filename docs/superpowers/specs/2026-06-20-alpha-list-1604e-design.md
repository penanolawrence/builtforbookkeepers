# Alpha List 1604-E — Design Spec
**Date:** 2026-06-20
**Scope:** BIR Form 1604-E alpha list report — viewable in-app with CSV and PDF export. Custom date range. Client-facing under Reports.

---

## Overview

The 1604-E alpha list is an annual BIR submission listing all payees from whom the company withheld Expanded Withholding Tax (EWT) during the period. Each row represents one payee + ATC combination, showing the consolidated gross income payment and EWT amount withheld.

Out of scope for this feature: 1604-C (compensation/payroll) and 1604-F (final withholding tax).

---

## 1. Data Layer

### Migration
Add two nullable columns to `chart_of_accounts`:
- `atc_code` — `string`, nullable (e.g. `WC010`)
- `ewt_rate` — `decimal(5,2)`, nullable (e.g. `10.00`)

No other tables are modified.

### Seeder Update (`ChartOfAccountSeeder` or a dedicated migration seeder)
Populate `atc_code` and `ewt_rate` for the six EWT payable accounts:

| Account Code | Name                    | ATC    | Rate (%) |
|--------------|-------------------------|--------|----------|
| 2210         | EWT — Professional Fees | WC010  | 10.00    |
| 2211         | EWT — Rental            | WC158  | 5.00     |
| 2212         | EWT — Services          | WC120  | 2.00     |
| 2213         | EWT — Goods & Supplies  | WC100  | 1.00     |
| 2214         | EWT — Contractors       | WC140  | 2.00     |
| 2215         | EWT — Commissions       | WC160  | 10.00    |

---

## 2. Backend

### `AlphaListService` (`app/Services/BIR/AlphaListService.php`)

**Query:** Fetch `JournalEntryLine` records where:
- `company_id` matches
- `entry_date` is within the date range
- The associated `Account.code` is one of `2210–2215` (EWT payable accounts)
- The line has a non-zero `credit` (EWT withheld amount)

**Eager loads:** `lines.account`, `document.merchant`

**Row construction per line:**
- `tin` — `document.merchant.tin`
- `payeeName` — `document.merchant.name` (fallback: `document.merchant_name`)
- `address` — `document.merchant.address`
- `atcCode` — `account.atc_code`
- `natureOfIncome` — `account.name` (e.g. "EWT — Professional Fees")
- `ewtAmount` — `line.credit`
- `rate` — `account.ewt_rate`
- `grossPayment` — `ewtAmount / (rate / 100)` (derived)

**Grouping:** Rows are grouped by `(merchant_id, account_id)` and summed — one output row per payee per ATC. Payees without a linked merchant (no TIN) are still included, using `merchant_name` as fallback and blank TIN.

**Return value:** Array of grouped rows sorted by payee name then ATC code.

### Controller (`app/Http/Controllers/AlphaListController.php`)

```
GET /api/client/reports/alpha-list?start=YYYY-MM-DD&end=YYYY-MM-DD
GET /api/client/reports/alpha-list?start=YYYY-MM-DD&end=YYYY-MM-DD&format=csv
```

- JSON response: `{ rows: [...], period: { start, end } }`
- CSV response: streams a properly formatted CSV file with BIR-standard column headers
- PDF: backend-generated via a dedicated endpoint (same pattern as `downloadBIRBookPDF` / `downloadReportPDF` in `lib/api/bir.ts` and `lib/api/reports.ts`)

### Route
Registered under the authenticated client middleware group, alongside existing BIR report routes.

---

## 3. Frontend

### Reports page (`/client/reports/page.tsx`)
Add a new report card:
- **Title:** Alpha List (1604-E)
- **Description:** Summary of expanded withholding tax withheld per payee, for BIR 1604-E filing.
- **CTA:** View Report →
- Clicking opens the existing date-range modal (no additional selectors needed)
- On confirm, navigates to `/client/reports/alpha-list?start=...&end=...`

### Alpha List page (`/client/reports/alpha-list/page.tsx`)
Fetches from the API and renders:
- `ReportToolbar` with **Export CSV** and **Export PDF** buttons
- `AlphaListTable` component
- `BIREmptyState` when no rows are returned

### `AlphaListTable` component (`/components/reports/AlphaListTable.tsx`)
Renders a table with columns:

| Col | Field | Notes |
|-----|-------|-------|
| # | Row number | Sequential |
| TIN | `tin` | Blank if no merchant TIN |
| Payee Name | `payeeName` | |
| Address | `address` | |
| ATC | `atcCode` | e.g. WC010 |
| Nature of Income | `natureOfIncome` | e.g. Professional Fees |
| Gross Payment | `grossPayment` | Formatted as currency |
| Rate | `rate` | e.g. 10% |
| EWT Withheld | `ewtAmount` | Formatted as currency |

Totals row at the bottom for Gross Payment and EWT Withheld columns.

---

## 4. Export Formats

### CSV
- Column headers match the table above
- Numbers unformatted (no peso sign, comma-separated values)
- UTF-8 with BOM for Excel compatibility
- Filename: `alpha-list-1604e-{start}-{end}.csv`

### PDF
- Follows existing BIR report PDF layout
- Company name and period shown in header
- Same columns as table view
- Filename: `alpha-list-1604e-{start}-{end}.pdf`

---

## 5. Edge Cases

- **No merchant linked:** Use `document.merchant_name` for payee name, leave TIN and address blank
- **Zero EWT rows:** Show `BIREmptyState`
- **Multiple invoices, same payee + ATC:** Consolidated into one row (summed)
- **Date range spanning multiple years:** Allowed — user controls the range
