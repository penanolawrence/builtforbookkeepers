<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class AdjustingEntryLine extends Model
{
    protected $fillable = [
        'adjusting_entry_id',
        'account_id',
        'subtype_id',
        'debit',
        'credit',
        'description',
    ];

    protected $casts = [
        'debit'  => 'decimal:2',
        'credit' => 'decimal:2',
    ];

    public function adjustingEntry(): BelongsTo
    {
        return $this->belongsTo(AdjustingEntry::class);
    }

    public function account(): BelongsTo
    {
        return $this->belongsTo(Account::class);
    }

    public function subtype(): BelongsTo
    {
        return $this->belongsTo(Subtype::class);
    }
}
