import os
import re
import base64
import numpy as np
import cv2
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from paddleocr import PaddleOCR
import boto3

app = FastAPI()

ocr = PaddleOCR(use_textline_orientation=True, lang='en')

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

    # Gentle denoising — h=4 preserves thin text
    gray = cv2.fastNlMeansDenoising(gray, h=4)

    # CLAHE — adapts locally, better for uneven receipt lighting
    clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
    gray = clahe.apply(gray)

    # Mild unsharp mask to sharpen text edges
    blurred = cv2.GaussianBlur(gray, (0, 0), sigmaX=1.0)
    gray = cv2.addWeighted(gray, 1.5, blurred, -0.5, 0)

    return cv2.cvtColor(gray, cv2.COLOR_GRAY2RGB)


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
            return {"raw_text": "", "raw_lines": [], "confidence": 0.0}

        all_lines = []
        for line in result[0]:
            if line and len(line) >= 2:
                text = line[1][0].strip()
                conf = float(line[1][1])
                all_lines.append({"text": text, "confidence": conf})

        # Filter noise: drop lines that are clearly border/separator artifacts
        # - confidence < 0.5  →  OCR isn't sure what it read
        # - pure repetition of border chars (I, |, -, =, ., _) with no real text
        _border_only = re.compile(r'^[I\|\-=\.\s_]+$')
        clean_lines = [
            l for l in all_lines
            if l["confidence"] >= 0.5 and not _border_only.match(l["text"]) and len(l["text"]) >= 2
        ]

        # All lines (including noise) kept for raw_lines so nothing is hidden in logs
        raw_lines = [
            {"text": l["text"], "confidence": round(l["confidence"], 4)}
            for l in all_lines
        ]

        text_for_ai = "\n".join(l["text"] for l in clean_lines)
        all_confidences = [l["confidence"] for l in all_lines]

        return {
            "raw_text":   text_for_ai,
            "raw_lines":  raw_lines,
            "confidence": round(float(np.mean(all_confidences)), 4) if all_confidences else 0.0,
        }

    except HTTPException:
        raise
    except Exception:
        raise HTTPException(status_code=422, detail="OCR extraction failed")


@app.get("/health")
def health():
    return {"status": "ok"}
