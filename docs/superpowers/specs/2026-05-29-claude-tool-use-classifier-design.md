# TransactionClassifier — Tool Use + Structured OCR Input Design

**Date:** 2026-05-29
**Scope:** `TransactionClassifier.php`, `ClassifyWithAI.php`

---

## Problem

`TransactionClassifier::classify()` asks Claude to "return raw JSON only" via a text prompt. Claude sometimes wraps the response in markdown code fences (` ```json ... ``` `), causing `json_decode()` to return `null`. When that happens `ClassifyWithAI` throws a `RuntimeException`, the job fails, and **no `TransactionLine` records are ever created** — the document goes to YELLOW with "AI classification failed."

Two compounding issues:
1. Flat `raw_text` input gives Claude no spatial context — it can't tell which line is the merchant, which is an item, which is the total.
2. No schema enforcement — `type` can come back as `"Income"` (breaks DB enum), `amount` as `"₱220.00"` (breaks decimal cast).

---

## Goal

- **Zero JSON parse failures** — use Claude tool use (`tool_choice: force`) so the response is always a typed PHP array, never a string to decode.
- **Always generate `TransactionLine` records** — schema enforces `lines[]` is non-empty.
- **Better OCR extraction accuracy** — send `header` / `body` / `footer` sections so Claude knows where to look for each field.

---

## Files Changed

| File | Change |
|---|---|
| `backend/app/Services/AI/TransactionClassifier.php` | Full rewrite — tool use, sectioned OCR input |
| `backend/app/Jobs/ClassifyWithAI.php` | Update field reading (`document` replaces `cleanedFields`, `total_amount` replaces `totalAmount`) |

---

## Design

### 1. OCR Path — Input Structure

Current: `$inputData['raw_text']` — all lines joined flat.

New: build a prompt from the three sections the OCR service already returns:

```
Receipt sections extracted by OCR:

HEADER (store name, address, BIR TIN):
{header lines, one per line}

BODY (items, quantities, unit prices):
{body lines, one per line}

FOOTER (totals, VAT, OR number):
{footer lines, one per line}
```

If a section is empty, omit it. If all three are empty, fall back to `raw_text`.

This gives Claude spatial context: merchant name is in HEADER, line items are in BODY, totals and OR number are in FOOTER. It eliminates the common mistake of Claude picking a line-item amount as the document total.

### 2. Manual Path — Input Structure

Unchanged. Claude receives `declared_type`, `date`, `paymentMethod`, and `lines[]` (description + amount per line). Claude only fills in `account_code`, `type`, and `category` per line. `document.merchant`, `document.date`, `document.or_number` will be returned as `null` (ignored by Laravel since those fields are already set on the Document).

### 3. Tool Schema

A single tool named `classify_transaction` used for both paths.

```php
'tools' => [
    [
        'name'        => 'classify_transaction',
        'description' => 'Classify a Philippine SME transaction and return structured line items.',
        'input_schema' => [
            'type'       => 'object',
            'required'   => ['document', 'lines', 'confidence'],
            'properties' => [

                'document' => [
                    'type'       => 'object',
                    'required'   => ['total_amount'],
                    'properties' => [
                        'merchant'     => ['type' => ['string', 'null'], 'description' => 'Business or store name, or null'],
                        'date'         => ['type' => ['string', 'null'], 'description' => 'YYYY-MM-DD or null'],
                        'total_amount' => ['type' => 'number',  'minimum' => 0.01, 'description' => 'Final total on the receipt'],
                        'vat_amount'   => ['type' => ['number', 'null'], 'minimum' => 0],
                        'or_number'    => ['type' => ['string', 'null'], 'description' => 'Official Receipt or invoice number'],
                    ],
                ],

                'lines' => [
                    'type'     => 'array',
                    'minItems' => 1,
                    'items'    => [
                        'type'       => 'object',
                        'required'   => ['description', 'amount', 'account_code', 'type', 'category'],
                        'properties' => [
                            'description'  => ['type' => 'string', 'description' => 'What this line covers'],
                            'amount'       => ['type' => 'number', 'minimum' => 0.01],
                            'account_code' => ['type' => 'string', 'description' => 'Code from the Chart of Accounts'],
                            'type'         => ['type' => 'string', 'enum' => ['income', 'expense']],
                            'category'     => ['type' => 'string', 'description' => 'Short category label'],
                        ],
                    ],
                ],

                'confidence' => [
                    'type'    => 'number',
                    'minimum' => 0,
                    'maximum' => 1,
                    'description' => 'How confident Claude is in the classification (0–1)',
                ],
            ],
        ],
    ],
],
'tool_choice' => ['type' => 'tool', 'name' => 'classify_transaction'],
```

### 4. Extracting the Result in PHP

```php
$toolBlock = collect($response->content)->first(fn($c) => $c->type === 'tool_use');

if (!$toolBlock || $toolBlock->name !== 'classify_transaction') {
    throw new \RuntimeException("Claude did not call classify_transaction tool");
}

$result = (array) $toolBlock->input;
// $result['document'], $result['lines'], $result['confidence'] are all typed — no json_decode
```

No `json_decode`, no markdown stripping, no null checks on the outer structure.

### 5. Field Mapping — Claude Output → Laravel

| Claude field | Laravel target |
|---|---|
| `document.merchant` | `documents.merchant_name` |
| `document.date` | `documents.document_date` |
| `document.total_amount` | `documents.amount` |
| `document.vat_amount` | `documents.vat_amount` |
| `document.or_number` | `documents.ref_number` |
| `lines[].description` | `transaction_lines.description` |
| `lines[].amount` | `transaction_lines.amount` |
| `lines[].account_code` | `transaction_lines.account_code` + lookup for `account_id` |
| `lines[].type` | `transaction_lines.type` |
| `lines[].category` | `transaction_lines.category` |
| `confidence` | flag logic (< 0.6 → YELLOW) |
| `lines[0].category` | `documents.category` (summary label) |

### 6. ClassifyWithAI Changes

In `ClassifyWithAI::handle()`, update the OCR field reading block:

```php
// OLD
if (!$this->document->is_no_receipt && !empty($classification['cleanedFields'])) {
    $cleaned = $classification['cleanedFields'];
    $this->document->merchant_name = $cleaned['merchant'] ?? ...;
    $this->document->document_date = $cleaned['date']     ?? ...;
    $this->document->vat_amount    = $cleaned['vat_amount'] ?? ...;
    if (empty(...ref_number...) && !empty($cleaned['or_number'])) { ... }
    if (isset($classification['totalAmount'])) { $this->document->amount = ...; }
}

// NEW
if (!$this->document->is_no_receipt && !empty($classification['document'])) {
    $doc = $classification['document'];
    $this->document->merchant_name = $doc['merchant']     ?? $this->document->merchant_name;
    $this->document->document_date = $doc['date']         ?? $this->document->document_date;
    $this->document->vat_amount    = $doc['vat_amount']   ?? $this->document->vat_amount;
    if (empty($this->document->ref_number) && !empty($doc['or_number'])) {
        $this->document->ref_number = $doc['or_number'];
    }
    if (!empty($doc['total_amount'])) {
        $this->document->amount = $doc['total_amount'];
    }
}
```

No other changes to `ClassifyWithAI.php` — line creation loop is unchanged.

### 7. maxTokens

Bump from `1024` to `1536`. Tool use schemas add overhead; large Charts of Accounts in the system prompt also consume space.

### 8. Error Handling

- If `toolBlock` is null → throw `RuntimeException("Claude did not call classify_transaction tool")` — existing `failed()` handler catches this, parks document as YELLOW.
- Individual lines with `amount <= 0` or missing `account_code` — skip silently (defensive `continue` in the loop).
- `account_code` not found in Chart of Accounts — `account_id` stays null, `account_code` still stored — accountant reviews.

---

## What Does NOT Change

- `ProcessDocumentOCR.php` — unchanged; still passes full `$result` (including `header`, `body`, `footer`, `raw_text`) to `ClassifyWithAI`
- `ClassifyWithAI::failed()` — unchanged
- `TransactionLine` model and migration — unchanged
- Manual entry `DocumentController::manualEntry()` — unchanged
- `$isOcrPath` detection — stays as `array_key_exists('raw_text', $inputData)`; only the prompt *content* changes (uses `header`/`body`/`footer` from `$inputData` instead of flat `raw_text`)
