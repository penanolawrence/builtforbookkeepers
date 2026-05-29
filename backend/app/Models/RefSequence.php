<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class RefSequence extends Model
{
    protected $table = 'ref_sequences';

    protected $fillable = [
        'company_id',
        'prefix',
        'last_seq',
    ];

    public function company(): BelongsTo
    {
        return $this->belongsTo(Company::class);
    }
}
