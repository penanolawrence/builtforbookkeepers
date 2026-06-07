<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Account extends Model
{
    use HasUuids, HasFactory;

    protected $fillable = [
        'company_id',
        'chart_of_account_id',
        'code',
        'name',
        'type',
        'is_system_managed',
        'is_active',
    ];

    protected $casts = [
        'is_system_managed' => 'boolean',
        'is_active'         => 'boolean',
    ];

    public function company(): BelongsTo
    {
        return $this->belongsTo(Company::class);
    }

    public function chartOfAccount(): BelongsTo
    {
        return $this->belongsTo(ChartOfAccount::class);
    }
}
