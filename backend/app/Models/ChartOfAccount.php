<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class ChartOfAccount extends Model
{
    use HasUuids, HasFactory;

    protected $fillable = ['account_type_id', 'code', 'name', 'atc_code', 'ewt_rate', 'is_active', 'sort_order'];

    protected $casts = ['is_active' => 'boolean'];

    public function getEwtRateAttribute(): ?string
    {
        $value = $this->attributes['ewt_rate'] ?? null;
        return $value !== null ? number_format((float) $value, 2, '.', '') : null;
    }

    public function accountType(): BelongsTo
    {
        return $this->belongsTo(AccountType::class);
    }

    public function subtypes(): HasMany
    {
        return $this->hasMany(ChartOfAccountSubtype::class);
    }

    public function industryTags(): HasMany
    {
        return $this->hasMany(ChartOfAccountIndustry::class);
    }
}
