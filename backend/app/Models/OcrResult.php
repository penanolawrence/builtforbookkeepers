<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class OcrResult extends Model
{
    protected $fillable = [
        'document_id',
        'extracted_data',
        'confidence',
        'engine',
    ];

    protected $casts = [
        'extracted_data' => 'array',
        'confidence'     => 'float',
    ];

    public function document(): BelongsTo
    {
        return $this->belongsTo(Document::class);
    }
}
