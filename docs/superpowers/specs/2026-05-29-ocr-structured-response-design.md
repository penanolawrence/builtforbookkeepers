# OCR Structured Response — Sectioned Payload

**Date:** 2026-05-29
**Status:** Approved
**Scope:** OCR Python service only — changes what `/extract` returns to Laravel. No changes to Laravel or Claude prompt in this spec.

---

## Problem

The current `/extract` response is a flat blob of joined text:

```json
{
  "raw_text": "LINE1\nLINE2\n...",
  "raw_lines": [{ "text": "...", "confidence": 0.94 }],
  "confidence": 0.93
}
```

Claude receives this as a single unstructured string and must simultaneously figure out which lines are the merchant name, which are line items, and which is the total — all from noisy OCR text. This produces unreliable transaction lines because:

- Claude has no spatial context (header vs body vs footer)
- It must guess which number is the grand total vs a line-item price
- Spatial information (Y coordinates) is available from PaddleOCR but currently discarded

---

## Decision

Approach B was chosen: **structured sections with plain text strings, no per-line confidence, no hints object.**

---

## New `/extract` Response Structure

```json
{
  "header": [
    "JOLLIBEE FOOD CORPORATION",
    "123 Main Street Manila",
    "TIN: 123-456-789-000",
    "OR No.: OR-12345",
    "Date: 05/29/2026"
  ],
  "body": [
    "Chicken Joy Meal",
    "150.00",
    "Jolly Spaghetti",
    "89.00"
  ],
  "footer": [
    "Sub-Total 239.00",
    "VAT (12%) 25.61",
    "TOTAL 239.00",
    "CASH 300.00",
    "CHANGE 61.00"
  ],
  "raw_text": "JOLLIBEE FOOD CORPORATION\n123 Main Street Manila\n...",
  "confidence": 0.94
}
```

### Field definitions

| Field | Type | Description |
|---|---|---|
| `header` | `string[]` | Lines from the top 20% of the receipt (merchant name, address, TIN, date, OR number) |
| `body` | `string[]` | Lines from the middle 20–75% of the receipt (line items, descriptions, prices) |
| `footer` | `string[]` | Lines from the bottom 25% of the receipt (subtotals, VAT, total, payment, change) |
| `raw_text` | `string` | All clean lines joined with `\n` in document order — same as current `raw_text`. Used as fallback and for logging. |
| `confidence` | `float` | Average confidence across all detected lines — same as current. |

---

## Sectioning Logic

PaddleOCR returns bounding box corners (`line[0]`) for each detected text region as four `[x, y]` pixel coordinates. Currently `line[0]` is discarded. The new logic:

1. Compute the center-Y of each bounding box:
   ```python
   center_y = sum(pt[1] for pt in box) / 4
   ```

2. Normalize to 0–1 by dividing by image height (after upscaling):
   ```python
   y = center_y / img_height
   ```

3. Assign to section by threshold:

   | Normalized Y | Section |
   |---|---|
   | `< 0.20` | `header` |
   | `0.20 – 0.75` | `body` |
   | `>= 0.75` | `footer` |

4. Apply existing noise filter **before** sectioning (confidence ≥ 0.5, no border-only chars, length ≥ 2). Only clean lines are sectioned.

5. `raw_text` is built from clean lines in document order (same as today).

### Edge case: short receipts

If the total number of clean lines after filtering is **fewer than 5**, skip sectioning entirely:
- `header = []`
- `body` = all clean lines
- `footer = []`

This prevents unreliable splits on very short or minimal receipts.

### Empty sections

A section with no lines is always returned as `[]` — never omitted. The Laravel backend can always rely on all three keys being present.

---

## Downstream Note

`ClassifyWithAI.php` detects the OCR path by checking `array_key_exists('raw_text', $inputData)` — this still works because `raw_text` is kept. However, `TransactionClassifier.php` currently builds its Claude prompt from `raw_text` only and ignores the sections. The backend will not benefit from the structured sections until `TransactionClassifier` is updated in a follow-on spec.

---

## What Does NOT Change

- The noise filter logic (`confidence >= 0.5`, border-char regex, `len >= 2`)
- Image preprocessing (upscaling, CLAHE, deskew, denoise, sharpen)
- The `confidence` calculation (average across all detected lines including noise)
- `raw_lines` is **removed** from the response (it was only used for logging; `raw_text` covers that)
- `OCRService.php` — no change needed; it just passes the JSON response through
- `ProcessDocumentOCR.php` — no change needed
- `ClassifyWithAI.php` and `TransactionClassifier.php` — not in scope for this spec

---

## Files Changed

| File | Change |
|---|---|
| `ocr-service/main.py` | Preserve `line[0]` bounding boxes, compute center-Y, normalize, split into header/body/footer, build `raw_text` from clean lines in order, remove `raw_lines` from response |
