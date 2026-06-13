<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class PeriodClosing extends Model
{
    use HasUuids;

    protected $fillable = [
        'company_id',
        'period_year',
        'period_month',
        'closed_by',
        'closed_at',
    ];

    protected $casts = [
        'closed_at'    => 'datetime',
        'period_year'  => 'integer',
        'period_month' => 'integer',
    ];

    public function company(): BelongsTo
    {
        return $this->belongsTo(Company::class);
    }

    public function closer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'closed_by');
    }

    public function journalEntries(): HasMany
    {
        return $this->hasMany(JournalEntry::class);
    }
}
