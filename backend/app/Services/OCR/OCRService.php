<?php

namespace App\Services\OCR;

use App\Exceptions\OcrFailedException;
use App\Models\Document;
use Illuminate\Support\Facades\Http;

class OCRService
{
    public function extractFromDocument(Document $doc): array
    {
        $url = rtrim(env('OCR_SERVICE_URL', 'http://ocr-service:8001'), '/') . '/extract';

        try {
            $response = Http::timeout(130)->post($url, [
                'file_path' => $doc->storage_path,
            ]);

            if ($response->status() === 422 || $response->failed()) {
                throw new OcrFailedException("OCR service returned status {$response->status()}");
            }

            return $response->json();
        } catch (OcrFailedException $e) {
            throw $e;
        } catch (\Exception $e) {
            throw new OcrFailedException("OCR service failed: " . $e->getMessage());
        }
    }
}
