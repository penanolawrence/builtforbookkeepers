# VAT Scrape — Explicit-Only Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove AI-computed VAT (from VAT-inclusive text or TIN registration) so that `vat_amount` is only populated when a VAT figure is explicitly printed on the document.

**Architecture:** Two targeted string edits in `TransactionClassifier.php` — one in the tool schema `vat_amount` description, one in the system prompt VAT line rule. No new files, no schema migrations, no API changes.

**Tech Stack:** Laravel 11, PHPUnit.

**Reference spec:** `docs/superpowers/specs/2026-06-19-vat-scrape-explicit-only-design.md`

---

## File Structure

**Modify only:**
- `backend/app/Services/AI/TransactionClassifier.php` — two string changes (lines ~66–67 and ~303)
- `backend/tests/Unit/TransactionClassifierVatPromptTest.php` — update assertions to match new prompt text

---

### Task 1: Remove computed-VAT rules from the AI prompt

**Files:**
- Modify: `backend/app/Services/AI/TransactionClassifier.php`
- Modify: `backend/tests/Unit/TransactionClassifierVatPromptTest.php`

**Interfaces:**
- Produces: `vat_amount` tool schema description that accepts only explicitly printed VAT; updated system prompt VAT line rule without the "VAT-inclusive" parenthetical.

- [ ] **Step 1: Read the existing VAT prompt test to understand current assertions**

Run: `cd backend && php artisan test --filter TransactionClassifierVatPromptTest -- --verbose`

Note which strings the test currently asserts. The test file is at `backend/tests/Unit/TransactionClassifierVatPromptTest.php`.

- [ ] **Step 2: Update the `vat_amount` tool schema description**

In `backend/app/Services/AI/TransactionClassifier.php`, change line ~303:

```php
                            'vat_amount'     => [
                                'type'        => ['number', 'null'],
                                'minimum'     => 0,
                                'description' => 'VAT amount for this document. Use these rules in order: (1) If a VAT figure is explicitly printed, use that value. (2) If the document or user note says it is VAT-inclusive (e.g. "inclusive of VAT", "VAT inclusive", "inc. VAT"), calculate as total_amount × 12/112. (3) If the merchant/seller on the receipt is identified as VAT-registered — shown by text such as "VAT Reg. TIN", "VAT Registration No.", "VAT REG No.", or a TIN labeled as VAT-registered — the total is VAT-inclusive under Philippine tax law even if no VAT amount is printed; calculate as total_amount × 12/112. Return null only if none of the above apply.',
                            ],
```

to:

```php
                            'vat_amount'     => [
                                'type'        => ['number', 'null'],
                                'minimum'     => 0,
                                'description' => 'VAT amount explicitly printed on the document (e.g. labelled "VAT", "Output VAT", "VAT amount"). Return null if no VAT figure is explicitly shown.',
                            ],
```

- [ ] **Step 3: Update the system prompt VAT line rule**

In the same file, change lines ~66–67:

```php
                "- VAT line rule (client is VAT-Registered): when a VAT amount is present on the document " .
                "(either explicitly printed, or because the total is VAT-inclusive):\n" .
```

to:

```php
                "- VAT line rule (client is VAT-Registered): when a VAT amount is explicitly printed on the document:\n" .
```

- [ ] **Step 4: Update the VAT prompt test assertions**

Open `backend/tests/Unit/TransactionClassifierVatPromptTest.php`. Find any assertion that checks for strings removed in Steps 2–3, such as:
- `"VAT-inclusive"`
- `"12/112"`
- `"VAT Reg. TIN"`
- `"because the total is VAT-inclusive"`

Replace those assertions to match the new text. For example, if the test asserts the tool schema contains `"calculate as total_amount × 12/112"`, change it to assert `"VAT amount explicitly printed on the document"`. If the test asserts the system prompt contains `"explicitly printed, or because the total is VAT-inclusive"`, change it to assert `"when a VAT amount is explicitly printed on the document"`.

- [ ] **Step 5: Run the test suite to verify all pass**

Run: `cd backend && php artisan test --filter TransactionClassifierVatPromptTest`
Expected: all tests pass.

Then run the full suite to check for regressions:

Run: `cd backend && php artisan test`
Expected: all tests pass.

- [ ] **Step 6: Commit**

```bash
git add backend/app/Services/AI/TransactionClassifier.php backend/tests/Unit/TransactionClassifierVatPromptTest.php
git commit -m "fix: scrape vat_amount only when explicitly printed on document"
```

---

## Self-Review Notes

- **Spec coverage:** Both edits from the spec (tool schema description + system prompt parenthetical) are in Step 2 and Step 3. Manual income VAT rule (lines ~252–258) is untouched as specified.
- **Placeholder scan:** No TBD/TODO. Step 4 gives concrete guidance on what to look for and how to update.
- **Type consistency:** No new types introduced. `vat_amount` field name and `['number', 'null']` type are unchanged.
