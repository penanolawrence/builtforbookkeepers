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
