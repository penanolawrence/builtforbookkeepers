# Chart of Accounts Improvements — Design Spec
**Date:** 2026-06-19

## Overview

Introduce industry-aware Chart of Accounts provisioning for Sofia Books SME clients. Instead of seeding every client with all 50+ COA accounts, each client receives only the accounts relevant to their business type. Withholding tax accounts (EWT and WTC) are also added to the master COA to support future alphalist reporting.

---

## Goals

- Prevent COA pollution — clients only see accounts relevant to their industry
- Support 6 industry types: Retail, Services, Restaurant/F&B, Construction, Professional Services, Manufacturing
- Add EWT and WTC payable accounts to every client for BIR alphalist readiness
- Keep the master COA and industry mapping seeder/code-managed (no admin UI for now)

---

## Data Model

### 1. `companies` table — new column

```
industry_type: enum, nullable
  values: retail | services | restaurant | construction | professional_services | manufacturing
```

Nullable because admin/accountant may not know the industry at client creation time. Confirmed and written at setup page completion.

### 2. New pivot table: `chart_of_account_industries`

| Column | Type | Notes |
|--------|------|-------|
| `id` | bigint PK | |
| `chart_of_account_id` | FK → `chart_of_accounts` | |
| `industry` | enum (same 6 values) | |

COA accounts with **no rows** in this pivot are **universal** — seeded for every client regardless of industry. Industry-specific accounts have one or more rows here pointing to the industries they belong to.

### 3. New withholding tax COA accounts (universal)

Added to the master COA under Liabilities (2xxx series). All 6 are universal — every client gets them.

| Code | Name | Category |
|------|------|----------|
| 2210 | EWT Payable - Professional Fees (10%/15%) | EWT |
| 2211 | EWT Payable - Rental (5%) | EWT |
| 2212 | EWT Payable - Services (2%) | EWT |
| 2213 | EWT Payable - Goods & Supplies (1%) | EWT |
| 2214 | EWT Payable - Contractors (2%) | EWT |
| 2220 | Withholding Tax on Compensation Payable | WTC |

These EWT codes map to BIR ATC categories and are the foundation for the future alphalist report.

---

## COA Industry Mapping

### Universal accounts (all clients)
- All cash and bank accounts
- Accounts Receivable, Prepaid Expenses, other current assets
- All liability accounts (VAT payable, loans, accruals)
- All new withholding tax accounts (2210–2220)
- Owner's Equity accounts
- Basic expense accounts: Salaries & Wages, Rent, Utilities, Office Supplies, Depreciation, Communications
- Service Revenue (4010) — general enough for all industries

### Industry-specific accounts

**Retail**
- Merchandise Inventory
- Sales Revenue
- Sales Returns & Allowances
- COGS - Merchandise

**Restaurant / F&B**
- Food Inventory
- Beverage Inventory
- Sales Revenue
- COGS - Food Cost
- COGS - Beverage Cost

**Construction**
- Construction Materials Inventory
- Retention Receivable
- Contract Revenue
- COGS - Materials
- COGS - Labor (Subcontractors)
- COGS - Equipment

**Professional Services**
- Professional Fee Revenue
- Unbilled Revenue (Work in Progress)

**Manufacturing**
- Raw Materials Inventory
- Work-in-Progress Inventory
- Finished Goods Inventory
- COGS - Raw Materials
- COGS - Direct Labor
- COGS - Manufacturing Overhead

**Services**
- Deferred Revenue
- Unbilled Revenue

> Existing COGS accounts that are currently seeded universally are moved to industry-specific, so clients only see COGS relevant to them.

---

## Client Creation Flow (Two-Phase)

### Phase 1 — Admin/Accountant creates client

- `industry_type` is **optional** on `CreateClientRequest` (both Admin and Accountant versions)
- Saved to `companies.industry_type` if provided; left `null` if not
- `seedDefaultAccounts()` is **not called here**
- `ClientModal.tsx` gets an optional Industry Type dropdown after the BIR Type field

### Phase 2 — Client completes setup page

- `industry_type` is **required** on the setup form
- If admin/accountant already set it, the dropdown is pre-filled; client may still change it
- On submit:
  1. Save `industry_type` to the company (overrides any admin-set value)
  2. Call `ChartOfAccountsService::seedDefaultAccounts($company)` — this is the single authoritative trigger for account provisioning
- Setup submission is blocked if `industry_type` is empty

---

## Service Layer: `seedDefaultAccounts()`

Updated query logic:

```
ChartOfAccount
  WHERE does NOT exist in chart_of_account_industries (universal)
  OR EXISTS in chart_of_account_industries WHERE industry = company->industry_type
→ insert into company's accounts table
```

No changes to the accounts table schema — this is purely a filter on what gets inserted.

---

## Seeder Structure

| Seeder | Responsibility |
|--------|---------------|
| `ChartOfAccountSeeder` | Updated — adds withholding tax accounts (2210–2220), marks existing COGS accounts as industry-specific |
| `ChartOfAccountIndustrySeeder` | New — populates `chart_of_account_industries` pivot with industry tags per account |
| `DatabaseSeeder` | Updated — runs `ChartOfAccountIndustrySeeder` after `ChartOfAccountSeeder` |

---

## Frontend Changes

### `ClientModal.tsx` (Admin and Accountant)
- Add optional **Industry Type** `<Select>` dropdown after BIR Type field
- Options: Retail, Services, Restaurant / F&B, Construction, Professional Services, Manufacturing
- Not required — form submits without it

### Setup page (`/setup`)
- Add required **Industry Type** `<Select>` dropdown
- Pre-filled from `company.industry_type` if already set
- Required — "Finish Setup" button disabled until selected
- Position: after theme selection, before submit button

---

## Backend Request Validation

**`Admin\CreateClientRequest` and `Accountant\CreateClientRequest`:**
```
industry_type: nullable | enum[retail,services,restaurant,construction,professional_services,manufacturing]
```

**Setup endpoint request:**
```
industry_type: required | enum[retail,services,restaurant,construction,professional_services,manufacturing]
```

---

## Out of Scope (for now)

- Admin UI for managing the master COA or industry mappings
- Multiple industries per client
- Re-seeding accounts if a client changes their industry after setup
- Alphalist report generation (this design only lays the COA foundation)
