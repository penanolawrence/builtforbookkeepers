# VAT Report — Design Spec

**Date:** 2026-06-14
**Status:** Approved

## Overview

Generate BIR-compliant VAT reports in PDF format for VAT-registered clients. Covers four reports: 2550M (monthly VAT return), 2550Q (quarterly VAT return), SLS (Summary List of Sales), and SLP (Summary List of Purchases). All roles (admin, accountant, client) can generate reports. Output is PDF only, in clean formatted layout (not a pixel-perfect BIR form replica).

---

## Architecture

Two parallel workstreams, both required:

**1. Merchant infrastructure**
A new `merchants` table scoped per company, auto-populated by AI during receipt classification. Each document gets a nullable `merchant_id`. The `ClassifyWithAI` job extracts merchant name and TIN from the receipt, looks up an existing merchant for that company, and creates one if not found.

**2. VatReportService + 4 PDF templates**
A single `VatReportService` with one method per report type, sharing a common query layer. VAT amounts come directly from existing journal entry lines — Input VAT from account 1101, Output VAT from account 2101. Four Blade PDF templates handle rendering. A new `VatReportController` handles routing, following the same pattern as the existing `ReportController`.

---

## Data Model

### New table: `merchants`

| Column | Type | Notes |
|---|---|---|
| `id` | bigint PK | |
| `company_id` | FK → companies | scoped per client |
| `name` | string | registered business name |
| `tin` | string, nullable | BIR TIN |
| `address` | string, nullable | |
| `created_at` | timestamp | |
| `updated_at` | timestamp | |

### Migration: `documents`

- Add nullable `merchant_id` (FK → `merchants`, `nullOnDelete`)

### Merchant matching logic (in `ClassifyWithAI`)

1. AI extracts `merchant_name` and `merchant_tin` from receipt image
2. Look up by `tin` first (exact match, scoped to `company_id`)
3. If no TIN match, look up by `name` (case-insensitive, scoped to `company_id`)
4. Create new merchant if no match found
5. Set `document.merchant_id`; leave null if AI extracts nothing

No changes to `journal_entry_lines` — VAT amounts are already captured via accounts 1101/2101 when journal entries are posted.

---

## Report Content

All reports include a header (company name, TIN, address, period covered) and a footer (generated date, report period).

### 2550M — Monthly VAT Return

Period selector: month + year

| Section | Value |
|---|---|
| Taxable Sales | Sum of (document.amount − document.vat_amount) for income docs in the month |
| Output VAT Due | Sum of account 2101 journal entry lines for the month |
| Taxable Purchases | Sum of (document.amount − document.vat_amount) for expense docs in the month |
| Input VAT Available | Sum of account 1101 journal entry lines for the month |
| Net VAT Payable | Output VAT − Input VAT |

### 2550Q — Quarterly VAT Return

Period selector: quarter (Q1–Q4) + year

Same sections as 2550M, with:
- Monthly breakdown table showing each of the 3 months in the quarter
- Quarter totals row at the bottom

### SLS — Summary List of Sales

Period selector: quarter + year

One row per income document:

| Column | Source |
|---|---|
| Date | `document.document_date` |
| OR/Invoice No. | `document.ref_number` (blank if null) |
| Buyer Name | `merchant.name` (blank if no merchant) |
| Buyer TIN | `merchant.tin` (blank if no merchant or TIN unknown) |
| Taxable Amount | `document.amount − document.vat_amount` |
| VAT Amount | `document.vat_amount` |
| Total Amount | `document.amount` |

Grand totals row at bottom (taxable amount, VAT, total).

### SLP — Summary List of Purchases

Period selector: quarter + year

One row per expense document:

| Column | Source |
|---|---|
| Date | `document.document_date` |
| Invoice No. | `document.ref_number` (blank if null) |
| Supplier Name | `merchant.name` (blank if unavailable) |
| Supplier TIN | `merchant.tin` (blank if unavailable) |
| Taxable Amount | `document.amount − document.vat_amount` |
| Input VAT | `document.vat_amount` |
| Total Amount | `document.amount` |

Grand totals row at bottom (taxable amount, input VAT, total).

---

## Backend

### New: `VatReportController`

Routes (same middleware + client-scoping as existing `ReportController`):

```
GET /reports/vat/2550m?client_id=&month=&year=
GET /reports/vat/2550m/pdf?client_id=&month=&year=

GET /reports/vat/2550q?client_id=&quarter=&year=
GET /reports/vat/2550q/pdf?client_id=&quarter=&year=

GET /reports/vat/sls?client_id=&quarter=&year=
GET /reports/vat/sls/pdf?client_id=&quarter=&year=

GET /reports/vat/slp?client_id=&quarter=&year=
GET /reports/vat/slp/pdf?client_id=&quarter=&year=
```

### New: `VatReportService`

Location: `app/Services/Report/VatReportService.php`

Methods:
- `monthly(Company $company, int $month, int $year): array`
- `quarterly(Company $company, int $quarter, int $year): array`
- `salesList(Company $company, int $quarter, int $year): array`
- `purchasesList(Company $company, int $quarter, int $year): array`

Shared internal query: fetches posted journal entry lines joined to accounts, filtered by company and date range. Input VAT = account code 1101 lines; Output VAT = account code 2101 lines.

### New: Blade PDF templates

- `resources/views/reports/vat/2550m.blade.php`
- `resources/views/reports/vat/2550q.blade.php`
- `resources/views/reports/vat/sls.blade.php`
- `resources/views/reports/vat/slp.blade.php`

Rendered via existing `PDFExportService`.

---

## Frontend

### New page: `/reports/vat`

Reuses existing components: `ReportBreadcrumb`, `ReportClientSelector`, `ReportToolbar`.

**Controls:**
- Report type tabs: `2550M | 2550Q | SLS | SLP`
- Period picker:
  - 2550M: month + year selectors
  - 2550Q, SLS, SLP: quarter (Q1–Q4) + year selectors
- "Download PDF" button — opens PDF in new tab (same pattern as income statement PDF)

**VAT guard:**
- If the selected client has `bir_type = 'non_vat'`, show a "This client is not VAT-registered" message in place of the controls.
- VAT reports are not surfaced in navigation for non-VAT clients.

### API client

New functions in `frontend/src/lib/api/reports.ts`:
- `downloadVat2550mPdf(clientId, month, year)`
- `downloadVat2550qPdf(clientId, quarter, year)`
- `downloadVatSlsPdf(clientId, quarter, year)`
- `downloadVatSlpPdf(clientId, quarter, year)`

---

## Out of Scope

- eBIRForms DAT file export
- Pixel-perfect BIR form replication
- Enforcing complete merchant/TIN data before report generation
- Summary List of Importations (SLI)
