import os
import re
import base64
import datetime
import numpy as np
import cv2
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from paddleocr import PaddleOCR
import boto3

app = FastAPI()

ocr = PaddleOCR(use_angle_cls=True, lang='en', use_gpu=False)

s3 = boto3.client(
    's3',
    endpoint_url=os.environ.get('AWS_ENDPOINT', 'http://minio:9000'),
    aws_access_key_id=os.environ.get('AWS_ACCESS_KEY_ID', 'minio'),
    aws_secret_access_key=os.environ.get('AWS_SECRET_ACCESS_KEY', 'minio123'),
    region_name=os.environ.get('AWS_DEFAULT_REGION', 'us-east-1'),
    config=boto3.session.Config(signature_version='s3v4'),
)


class ExtractRequest(BaseModel):
    file_path: str | None = None
    image_base64: str | None = None


def _deskew(gray: np.ndarray) -> np.ndarray:
    _, thresh = cv2.threshold(gray, 0, 255, cv2.THRESH_BINARY_INV + cv2.THRESH_OTSU)
    coords = np.column_stack(np.where(thresh > 0))
    if len(coords) == 0:
        return gray
    angle = cv2.minAreaRect(coords)[-1]
    if angle < -45:
        angle = -(90 + angle)
    else:
        angle = -angle
    if abs(angle) <= 0.5:
        return gray
    h, w = gray.shape
    M = cv2.getRotationMatrix2D((w / 2, h / 2), angle, 1.0)
    return cv2.warpAffine(gray, M, (w, h), flags=cv2.INTER_CUBIC, borderMode=cv2.BORDER_REPLICATE)


def _preprocess(img_bytes: bytes) -> np.ndarray:
    arr = np.frombuffer(img_bytes, dtype=np.uint8)
    img = cv2.imdecode(arr, cv2.IMREAD_COLOR)
    if img is None:
        raise ValueError("Could not decode image")

    # Upscale small images — PaddleOCR works best at 1500px+ wide
    h, w = img.shape[:2]
    if w < 1500:
        scale = 1500 / w
        img = cv2.resize(img, (int(w * scale), int(h * scale)), interpolation=cv2.INTER_CUBIC)

    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    gray = _deskew(gray)

    # Gentle denoising — h=4 preserves thin text; h=10 blurs it
    gray = cv2.fastNlMeansDenoising(gray, h=4)

    # CLAHE instead of equalizeHist — adapts locally, better for uneven receipt lighting
    clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
    gray = clahe.apply(gray)

    # Mild unsharp mask to sharpen text edges
    blurred = cv2.GaussianBlur(gray, (0, 0), sigmaX=1.0)
    gray = cv2.addWeighted(gray, 1.5, blurred, -0.5, 0)

    rgb = cv2.cvtColor(gray, cv2.COLOR_GRAY2RGB)
    return rgb


def _parse_date(text: str) -> str | None:
    patterns = [
        (r'\b(\d{1,2})[/\-](\d{1,2})[/\-](\d{4})\b', lambda m: f"{m.group(3)}-{int(m.group(1)):02d}-{int(m.group(2)):02d}"),
        (r'\b(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{1,2}),?\s+(\d{4})\b',
         lambda m: datetime.datetime.strptime(f"{m.group(1)} {m.group(2)} {m.group(3)}", "%B %d %Y").strftime("%Y-%m-%d")),
        (r'\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+(\d{1,2}),?\s+(\d{4})\b',
         lambda m: datetime.datetime.strptime(f"{m.group(1)} {m.group(2)} {m.group(3)}", "%b %d %Y").strftime("%Y-%m-%d")),
    ]
    for pattern, formatter in patterns:
        match = re.search(pattern, text, re.IGNORECASE)
        if match:
            try:
                return formatter(match)
            except Exception:
                continue
    return None


def _parse_amount(lines: list[str]) -> float | None:
    # Philippine receipt keywords — ordered by specificity
    total_keywords = (
        r'(grand\s*total|total\s*amount\s*due|total\s*amount|total\s*due|'
        r'amount\s*due|net\s*amount|total\s*sales|total\s*purchase|'
        r'less\s*vat|amount\s*payable|payable\s*amount|total)'
    )
    # Match amounts with or without decimals, with or without peso sign
    amount_pattern = r'[₱P]?\s*([\d,]+(?:\.\d{1,2})?)'

    for line in reversed(lines):
        if re.search(total_keywords, line, re.IGNORECASE):
            nums = re.findall(amount_pattern, line)
            if nums:
                try:
                    return float(nums[-1].replace(',', ''))
                except ValueError:
                    continue

    # Fallback: last line containing a number that looks like a total
    for line in reversed(lines):
        nums = re.findall(amount_pattern, line)
        if nums:
            try:
                val = float(nums[-1].replace(',', ''))
                if val > 0:
                    return val
            except ValueError:
                continue
    return None


def _parse_vat(lines: list[str]) -> float | None:
    vat_keywords = r'(vat|12%|output\s*tax|input\s*tax|value.added\s*tax|vatable)'
    amount_pattern = r'[₱P]?\s*([\d,]+(?:\.\d{1,2})?)'
    for line in lines:
        if re.search(vat_keywords, line, re.IGNORECASE):
            nums = re.findall(amount_pattern, line)
            if nums:
                try:
                    return float(nums[-1].replace(',', ''))
                except ValueError:
                    continue
    return None


def _parse_or_number(lines: list[str]) -> str | None:
    pattern = r'(?:OR\s*No\.?|O\.R\.?|Receipt\s*No\.?|Invoice\s*No\.?)\s*[:\-]?\s*([A-Za-z0-9\-]+)'
    for line in lines:
        match = re.search(pattern, line, re.IGNORECASE)
        if match:
            return match.group(1).strip()
    return None


def _parse_tin(lines: list[str]) -> str | None:
    tin_pattern = r'\b(\d{3}[-\s]\d{3}[-\s]\d{3}(?:[-\s]\d{4})?)\b'
    for line in lines:
        if re.search(r'\btin\b', line, re.IGNORECASE):
            match = re.search(tin_pattern, line)
            if match:
                return match.group(1).strip()
    for line in lines:
        match = re.search(tin_pattern, line)
        if match:
            return match.group(1).strip()
    return None


def _parse_line_items(lines: list[str]) -> list[dict]:
    items = []
    item_pattern = re.compile(r'^(.+?)\s+([\d,]+\.\d{2})\s*$')
    skip_keywords = re.compile(r'(total|vat|tax|amount|grand|subtotal|discount)', re.IGNORECASE)
    for line in lines:
        line = line.strip()
        if len(line) < 5:
            continue
        if skip_keywords.search(line):
            continue
        match = item_pattern.match(line)
        if match:
            desc = match.group(1).strip()
            amt = float(match.group(2).replace(',', ''))
            if desc and amt > 0:
                items.append({'description': desc, 'amount': amt})
    return items


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

        img_array = _preprocess(img_bytes)
        result = ocr.ocr(img_array, cls=True)

        if not result or not result[0]:
            return {
                "merchant": None,
                "date": None,
                "amount": None,
                "vat_amount": None,
                "or_number": None,
                "tin": None,
                "line_items": [],
                "confidence": 0.0,
            }

        text_lines = []
        confidences = []
        for line in result[0]:
            if line and len(line) >= 2:
                text = line[1][0]
                conf = line[1][1]
                text_lines.append(text)
                confidences.append(conf)

        full_text = "\n".join(text_lines)
        avg_confidence = float(np.mean(confidences)) if confidences else 0.0

        merchant = text_lines[0].strip() if text_lines else None
        date = _parse_date(full_text)
        amount = _parse_amount(text_lines)
        vat_amount = _parse_vat(text_lines)
        or_number = _parse_or_number(text_lines)
        tin = _parse_tin(text_lines)
        line_items = _parse_line_items(text_lines)

        return {
            "merchant": merchant,
            "date": date,
            "amount": amount,
            "vat_amount": vat_amount,
            "or_number": or_number,
            "tin": tin,
            "line_items": line_items,
            "confidence": round(avg_confidence, 4),
        }

    except HTTPException:
        raise
    except Exception:
        raise HTTPException(status_code=422, detail="OCR extraction failed")


@app.get("/health")
def health():
    return {"status": "ok"}
