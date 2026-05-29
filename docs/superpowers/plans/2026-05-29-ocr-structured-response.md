# OCR Structured Response Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Change `ocr-service/main.py` so the `/extract` endpoint returns `{ header, body, footer, raw_text, confidence }` instead of `{ raw_text, raw_lines, confidence }`, using PaddleOCR's bounding-box Y coordinates to split lines into receipt sections.

**Architecture:** A new pure helper `_section_lines()` holds the sectioning logic (testable in isolation). The `extract` endpoint is updated to preserve bounding-box coordinates from PaddleOCR, compute normalized Y for each line, call `_section_lines()`, and return the structured payload. No PHP backend files change — `raw_text` is preserved so the existing `array_key_exists('raw_text', ...)` guard in `ClassifyWithAI.php` continues to work.

**Tech Stack:** Python 3.11, FastAPI, PaddleOCR, OpenCV, pytest, httpx (for FastAPI TestClient).

**Spec:** `docs/superpowers/specs/2026-05-29-ocr-structured-response-design.md`

---

## File Map

| File | Action |
|---|---|
| `ocr-service/requirements-dev.txt` | Create — test dependencies (pytest, httpx) |
| `ocr-service/tests/__init__.py` | Create — makes `tests/` a package |
| `ocr-service/tests/conftest.py` | Create — adds `ocr-service/` to sys.path so tests can `import main` |
| `ocr-service/tests/test_section_lines.py` | Create — unit tests for `_section_lines()` |
| `ocr-service/tests/test_extract_endpoint.py` | Create — integration tests for `/extract` response shape |
| `ocr-service/main.py` | Modify — add `_section_lines()`, update `extract()` to use bounding boxes and return new structure |

---

## Task 1 — Test infrastructure

**Files:**
- Create: `ocr-service/requirements-dev.txt`
- Create: `ocr-service/tests/__init__.py`
- Create: `ocr-service/tests/conftest.py`

- [ ] **Step 1: Create `requirements-dev.txt`**

```
pytest==8.2.2
httpx==0.27.0
```

- [ ] **Step 2: Create `tests/__init__.py`**

Empty file — just makes `tests/` a Python package.

```python
```

- [ ] **Step 3: Create `tests/conftest.py`**

This adds the `ocr-service/` directory to `sys.path` so `import main` works from any test file.

```python
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))
```

- [ ] **Step 4: Install dev dependencies and verify pytest runs**

Run from inside `ocr-service/`:
```bash
pip install -r requirements-dev.txt
pytest tests/ -v
```

Expected: `no tests ran` (0 collected). No errors.

- [ ] **Step 5: Commit**

```bash
git add ocr-service/requirements-dev.txt ocr-service/tests/__init__.py ocr-service/tests/conftest.py
git commit -m "test: add pytest infrastructure for ocr-service"
```

---

## Task 2 — Unit tests for `_section_lines` (TDD)

**Files:**
- Create: `ocr-service/tests/test_section_lines.py`
- Modify: `ocr-service/main.py` (add `_section_lines`)

`_section_lines` takes a list of dicts `{"text": str, "confidence": float, "y": float}` (y is normalized 0–1) and returns `{"header": [...], "body": [...], "footer": [...]}`.

Sectioning thresholds:
- `y < 0.20` → `header`
- `0.20 <= y < 0.75` → `body`
- `y >= 0.75` → `footer`

If fewer than 5 clean lines, skip sectioning: `header = []`, `body = all texts`, `footer = []`.

- [ ] **Step 1: Write the failing tests**

Create `ocr-service/tests/test_section_lines.py`:

```python
import pytest
from main import _section_lines


def test_normal_receipt_sections_by_threshold():
    lines = [
        {"text": "MERCHANT NAME", "confidence": 0.97, "y": 0.05},
        {"text": "Item One",      "confidence": 0.92, "y": 0.30},
        {"text": "100.00",        "confidence": 0.95, "y": 0.31},
        {"text": "Item Two",      "confidence": 0.88, "y": 0.50},
        {"text": "200.00",        "confidence": 0.93, "y": 0.51},
        {"text": "TOTAL 300.00",  "confidence": 0.96, "y": 0.82},
    ]
    result = _section_lines(lines)
    assert result["header"] == ["MERCHANT NAME"]
    assert result["body"]   == ["Item One", "100.00", "Item Two", "200.00"]
    assert result["footer"] == ["TOTAL 300.00"]


def test_fewer_than_5_lines_all_go_to_body():
    lines = [
        {"text": "MERCHANT", "confidence": 0.97, "y": 0.10},
        {"text": "Item",     "confidence": 0.92, "y": 0.50},
        {"text": "100.00",   "confidence": 0.95, "y": 0.51},
        {"text": "TOTAL",    "confidence": 0.96, "y": 0.85},
    ]
    result = _section_lines(lines)
    assert result["header"] == []
    assert result["body"]   == ["MERCHANT", "Item", "100.00", "TOTAL"]
    assert result["footer"] == []


def test_empty_input_returns_empty_sections():
    result = _section_lines([])
    assert result == {"header": [], "body": [], "footer": []}


def test_empty_header_and_footer_are_lists_not_none():
    # 5+ lines all in body — header and footer must be [] not None
    lines = [
        {"text": "Item A", "confidence": 0.91, "y": 0.30},
        {"text": "50.00",  "confidence": 0.94, "y": 0.31},
        {"text": "Item B", "confidence": 0.89, "y": 0.45},
        {"text": "75.00",  "confidence": 0.92, "y": 0.46},
        {"text": "Item C", "confidence": 0.90, "y": 0.60},
    ]
    result = _section_lines(lines)
    assert result["header"] == []
    assert result["footer"] == []
    assert isinstance(result["body"], list)
    assert len(result["body"]) == 5


def test_boundary_y020_goes_to_body_not_header():
    lines = [
        {"text": "Header Line", "confidence": 0.95, "y": 0.19},
        {"text": "Body Line",   "confidence": 0.95, "y": 0.20},
        {"text": "Body Line 2", "confidence": 0.95, "y": 0.40},
        {"text": "Body Line 3", "confidence": 0.95, "y": 0.55},
        {"text": "Footer Line", "confidence": 0.95, "y": 0.75},
    ]
    result = _section_lines(lines)
    assert result["header"] == ["Header Line"]
    assert "Body Line" in result["body"]
    assert "Body Line 2" in result["body"]
    assert result["footer"] == ["Footer Line"]
```

- [ ] **Step 2: Run tests — verify they fail**

```bash
cd ocr-service && pytest tests/test_section_lines.py -v
```

Expected: `ImportError: cannot import name '_section_lines' from 'main'`

- [ ] **Step 3: Add `_section_lines` to `main.py`**

Add this function after the `_preprocess` function (before the `@app.post("/extract")` line):

```python
def _section_lines(clean_lines: list) -> dict:
    if len(clean_lines) < 5:
        return {
            "header": [],
            "body":   [l["text"] for l in clean_lines],
            "footer": [],
        }
    return {
        "header": [l["text"] for l in clean_lines if l["y"] < 0.20],
        "body":   [l["text"] for l in clean_lines if 0.20 <= l["y"] < 0.75],
        "footer": [l["text"] for l in clean_lines if l["y"] >= 0.75],
    }
```

- [ ] **Step 4: Run tests — verify they pass**

```bash
cd ocr-service && pytest tests/test_section_lines.py -v
```

Expected: 5 passed.

- [ ] **Step 5: Commit**

```bash
git add ocr-service/tests/test_section_lines.py ocr-service/main.py
git commit -m "feat: add _section_lines helper with unit tests"
```

---

## Task 3 — Update `extract` endpoint + integration tests

**Files:**
- Create: `ocr-service/tests/test_extract_endpoint.py`
- Modify: `ocr-service/main.py` (update `extract()`)

The endpoint must:
1. Capture `img_height` from the preprocessed image array (`img_array.shape[0]`)
2. Preserve `line[0]` (bounding box) from each PaddleOCR result
3. Compute `center_y = sum(pt[1] for pt in box) / 4`, then `y = center_y / img_height`
4. Store `y` on each line dict before filtering
5. Build `raw_text` from clean lines in document order (same as today)
6. Call `_section_lines(clean_lines)` to get sections
7. Return `{ header, body, footer, raw_text, confidence }` — no `raw_lines`

- [ ] **Step 1: Write the failing integration tests**

Create `ocr-service/tests/test_extract_endpoint.py`:

```python
import numpy as np
import pytest
from unittest.mock import patch, MagicMock
from fastapi.testclient import TestClient

import main as ocr_main
from main import app

client = TestClient(app)


def _make_paddle_result(entries):
    """
    entries: list of (text, confidence, center_y_pixels)
    Returns PaddleOCR-format result for an image where height is implied by center_y values.
    Box is a rectangle centred at (300, center_y) — only Y matters for sectioning.
    """
    lines = []
    for text, conf, cy in entries:
        box = [[100, cy - 10], [500, cy - 10], [500, cy + 10], [100, cy + 10]]
        lines.append([box, [text, conf]])
    return [lines]


def test_extract_returns_structured_sections():
    # img_height = 1000 px
    fake_img = np.zeros((1000, 600, 3), dtype=np.uint8)

    entries = [
        ("MERCHANT NAME", 0.97, 50),   # y=0.05  → header
        ("Chicken Meal",  0.91, 310),  # y=0.31  → body
        ("150.00",        0.95, 320),  # y=0.32  → body
        ("TOTAL 150.00",  0.96, 820),  # y=0.82  → footer
    ]

    with patch.object(ocr_main, 's3') as mock_s3, \
         patch.object(ocr_main, '_preprocess', return_value=fake_img), \
         patch.object(ocr_main, 'ocr') as mock_ocr:

        mock_s3.get_object.return_value = {"Body": MagicMock(read=lambda: b'x')}
        mock_ocr.ocr.return_value = _make_paddle_result(entries)

        response = client.post("/extract", json={"file_path": "receipts/test.jpg"})

    assert response.status_code == 200
    data = response.json()
    assert data["header"] == ["MERCHANT NAME"]
    assert "Chicken Meal" in data["body"]
    assert "150.00" in data["body"]
    assert "TOTAL 150.00" in data["footer"]
    assert "MERCHANT NAME" in data["raw_text"]
    assert isinstance(data["confidence"], float)


def test_extract_response_has_no_raw_lines_key():
    fake_img = np.zeros((1000, 600, 3), dtype=np.uint8)
    entries = [("MERCHANT", 0.97, 50), ("Item", 0.92, 310),
               ("100.00", 0.95, 320), ("TOTAL", 0.96, 820)]

    with patch.object(ocr_main, 's3') as mock_s3, \
         patch.object(ocr_main, '_preprocess', return_value=fake_img), \
         patch.object(ocr_main, 'ocr') as mock_ocr:

        mock_s3.get_object.return_value = {"Body": MagicMock(read=lambda: b'x')}
        mock_ocr.ocr.return_value = _make_paddle_result(entries)

        response = client.post("/extract", json={"file_path": "receipts/test.jpg"})

    assert "raw_lines" not in response.json()


def test_extract_empty_ocr_returns_empty_sections():
    fake_img = np.zeros((1000, 600, 3), dtype=np.uint8)

    with patch.object(ocr_main, 's3') as mock_s3, \
         patch.object(ocr_main, '_preprocess', return_value=fake_img), \
         patch.object(ocr_main, 'ocr') as mock_ocr:

        mock_s3.get_object.return_value = {"Body": MagicMock(read=lambda: b'x')}
        mock_ocr.ocr.return_value = None

        response = client.post("/extract", json={"file_path": "receipts/blank.jpg"})

    assert response.status_code == 200
    data = response.json()
    assert data["header"]     == []
    assert data["body"]       == []
    assert data["footer"]     == []
    assert data["raw_text"]   == ""
    assert data["confidence"] == 0.0


def test_extract_short_receipt_all_lines_in_body():
    # 4 lines total → fewer than 5 → all go to body
    fake_img = np.zeros((1000, 600, 3), dtype=np.uint8)
    entries = [
        ("MERCHANT", 0.97, 50),
        ("Item",     0.92, 400),
        ("100.00",   0.95, 410),
        ("TOTAL",    0.96, 850),
    ]

    with patch.object(ocr_main, 's3') as mock_s3, \
         patch.object(ocr_main, '_preprocess', return_value=fake_img), \
         patch.object(ocr_main, 'ocr') as mock_ocr:

        mock_s3.get_object.return_value = {"Body": MagicMock(read=lambda: b'x')}
        mock_ocr.ocr.return_value = _make_paddle_result(entries)

        response = client.post("/extract", json={"file_path": "receipts/short.jpg"})

    data = response.json()
    assert data["header"] == []
    assert data["footer"] == []
    assert len(data["body"]) == 4
```

- [ ] **Step 2: Run tests — verify they fail**

```bash
cd ocr-service && pytest tests/test_extract_endpoint.py -v
```

Expected: failures because the endpoint still returns the old shape (`raw_lines` present, no `header`/`body`/`footer`).

- [ ] **Step 3: Replace the `extract` function body in `main.py`**

Replace the entire `@app.post("/extract")` function with:

```python
@app.post("/extract")
def extract(req: ExtractRequest):
    try:
        if req.file_path:
            bucket = os.environ.get('AWS_BUCKET', 'sofia-documents')
            obj = s3.get_object(Bucket=bucket, Key=req.file_path)
            img_bytes = obj['Body'].read()
        elif req.image_base64:
            img_bytes = base64.b64decode(req.image_base64)
        else:
            raise HTTPException(status_code=422, detail="OCR extraction failed")

        img_array  = _preprocess(img_bytes)
        img_height = img_array.shape[0]
        result     = ocr.ocr(img_array, cls=True)

        if not result or not result[0]:
            return {"header": [], "body": [], "footer": [], "raw_text": "", "confidence": 0.0}

        all_lines = []
        for line in result[0]:
            if line and len(line) >= 2:
                box      = line[0]
                text     = line[1][0].strip()
                conf     = float(line[1][1])
                center_y = sum(pt[1] for pt in box) / 4
                y        = center_y / img_height
                all_lines.append({"text": text, "confidence": conf, "y": y})

        _border_only = re.compile(r'^[I\|\-=\.\s_]+$')
        clean_lines = [
            l for l in all_lines
            if l["confidence"] >= 0.5 and not _border_only.match(l["text"]) and len(l["text"]) >= 2
        ]

        raw_text        = "\n".join(l["text"] for l in clean_lines)
        all_confidences = [l["confidence"] for l in all_lines]
        avg_confidence  = round(float(np.mean(all_confidences)), 4) if all_confidences else 0.0

        sections = _section_lines(clean_lines)

        return {
            "header":     sections["header"],
            "body":       sections["body"],
            "footer":     sections["footer"],
            "raw_text":   raw_text,
            "confidence": avg_confidence,
        }

    except HTTPException:
        raise
    except Exception:
        raise HTTPException(status_code=422, detail="OCR extraction failed")
```

- [ ] **Step 4: Run all tests — verify everything passes**

```bash
cd ocr-service && pytest tests/ -v
```

Expected: 9 passed (5 unit + 4 integration).

- [ ] **Step 5: Commit**

```bash
git add ocr-service/tests/test_extract_endpoint.py ocr-service/main.py
git commit -m "feat: OCR /extract returns structured header/body/footer sections"
```

---

## Self-Review

| Spec requirement | Covered by |
|---|---|
| `header` section — top 20% of receipt | Task 2 (`_section_lines`), Task 3 (endpoint) |
| `body` section — middle 20–75% | Task 2, Task 3 |
| `footer` section — bottom 25% | Task 2, Task 3 |
| `raw_text` kept (clean lines, document order) | Task 3 Step 3 |
| `confidence` kept (average across all lines) | Task 3 Step 3 |
| `raw_lines` removed from response | Task 3 (not in return), test asserts key absent |
| Short receipt edge case (< 5 lines → all in body) | Task 2 test + Task 3 test |
| Empty sections return `[]` not omitted | Task 2 test |
| Y boundary at 0.20 goes to body | Task 2 test |
| Bounding box Y coordinates used (not discarded) | Task 3 Step 3 |
| No changes to PHP backend files | Not in file map |
