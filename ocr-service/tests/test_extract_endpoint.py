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
    # Need 5+ lines for sectioning to apply; fewer than 5 goes all to body
    fake_img = np.zeros((1000, 600, 3), dtype=np.uint8)

    entries = [
        ("MERCHANT NAME", 0.97, 50),    # y=0.05  → header if 5+ lines
        ("Chicken Meal",  0.91, 310),   # y=0.31  → body
        ("150.00",        0.95, 320),   # y=0.32  → body
        ("Item Two",      0.90, 410),   # y=0.41  → body
        ("200.00",        0.93, 420),   # y=0.42  → body
        ("TOTAL 350.00",  0.96, 820),   # y=0.82  → footer
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
    assert "Item Two" in data["body"]
    assert "200.00" in data["body"]
    assert "TOTAL 350.00" in data["footer"]
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


def test_extract_noise_filter_excludes_low_quality_lines():
    # Lines that should be filtered out:
    # - confidence 0.3 (< 0.5 threshold)
    # - border-only text "------"
    # - single character "X"
    # Lines that should pass through:
    # - "MERCHANT NAME" (high confidence, normal text, y → header)
    # - "Item One" + "100.00" (body) and "TOTAL 100.00" (footer) to trigger full sectioning (≥ 5 clean)
    fake_img = np.zeros((1000, 600, 3), dtype=np.uint8)

    entries_all = [
        ("MERCHANT NAME", 0.97, 50),    # y=0.05 → header — should pass
        ("------",        0.92, 200),   # border-only → filtered
        ("X",             0.95, 250),   # single char → filtered
        ("Item One",      0.91, 310),   # y=0.31 → body — should pass
        ("100.00",        0.95, 320),   # y=0.32 → body — should pass
        ("NOISE",         0.30, 400),   # low confidence → filtered
        ("Item Two",      0.90, 500),   # y=0.50 → body — should pass (5th clean line for sectioning)
        ("TOTAL 100.00",  0.96, 820),   # y=0.82 → footer — should pass
    ]

    with patch.object(ocr_main, 's3') as mock_s3, \
         patch.object(ocr_main, '_preprocess', return_value=fake_img), \
         patch.object(ocr_main, 'ocr') as mock_ocr:

        mock_s3.get_object.return_value = {"Body": MagicMock(read=lambda: b'x')}
        mock_ocr.ocr.return_value = _make_paddle_result(entries_all)

        response = client.post("/extract", json={"file_path": "receipts/noisy.jpg"})

    assert response.status_code == 200
    data = response.json()

    # Filtered lines must not appear anywhere
    all_text = data["header"] + data["body"] + data["footer"]
    assert "------" not in all_text
    assert "X" not in all_text
    assert "NOISE" not in all_text

    # Clean lines must appear in the right sections
    assert "MERCHANT NAME" in data["header"]
    assert "Item One" in data["body"]
    assert "100.00" in data["body"]
    assert "TOTAL 100.00" in data["footer"]

    # raw_text must not contain filtered lines
    assert "------" not in data["raw_text"]
    assert "NOISE" not in data["raw_text"]
