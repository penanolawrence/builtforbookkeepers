# VAT Scrape — Explicit-Only Design

**Date:** 2026-06-19

## Problem

The `vat_amount` tool schema description in `TransactionClassifier.php` tells the AI to compute VAT via `total × 12/112` whenever it detects VAT-inclusive language (e.g. "inc. VAT") or a VAT-registered TIN on the document. This computed value is incorrect in practice — it produces wrong `vat_amount` values on both sales invoices and expense receipts.

## Decision

Only populate `vat_amount` when a VAT figure is **explicitly printed** on the document. If no VAT line is visible, return `null`. No computation from VAT-inclusive text or TIN registration.

## Changes

**File:** `backend/app/Services/AI/TransactionClassifier.php`

**Change 1 — tool schema `vat_amount` description (line ~303):**

Remove rules (2) and (3). New description:

> "VAT amount explicitly printed on the document (e.g. labelled 'VAT', 'Output VAT', 'VAT amount'). Return null if no VAT figure is explicitly shown."

**Change 2 — system prompt VAT line rule (lines ~66–73):**

Trim the parenthetical `(either explicitly printed, or because the total is VAT-inclusive)` so it reads:

> "when a VAT amount is explicitly printed on the document"

## Scope

- 2 string edits in 1 file.
- The manual income VAT rule (lines ~252–258) is unaffected — it applies to manually entered entries, not document scraping.
- The `1101`/`2101` VAT line creation logic is unaffected — it still fires whenever `vat_amount` is non-null.
