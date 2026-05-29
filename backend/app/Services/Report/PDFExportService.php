<?php

namespace App\Services\Report;

use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Http\Response;

class PDFExportService
{
    public function exportReport(string $view, array $data, string $filename): Response
    {
        $pdf = Pdf::loadView($view, $data);
        return $pdf->download("{$filename}.pdf");
    }
}
