<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Document extends Model
{
    use HasUuids, HasFactory;

    protected $fillable = [
        'company_id',
        'uploaded_by',
        'original_filename',
        'storage_path',
        'file_hash',
        'file_type',
        'status',
        'internal_status',
        'flag',
        'anomaly_reason',
        'document_type',
        'document_date',
        'ref_number',
        'merchant_id',
        'amount',
        'merchant_name',
        'vat_amount',
        'payment_method',
        'category',
        'account_id',
        'is_no_receipt',
        'is_ocr_failed',
        'return_note',
        'returned_by',
        'returned_at',
        'expires_at',
        'rejection_reason',
        'rejected_by',
        'rejected_at',
        'approved_by',
        'approved_at',
        'cancelled_by',
        'cancelled_at',
        'note',
        'field_overrides',
    ];

    protected $casts = [
        'anomaly_reason' => 'array',
        'document_date'  => 'date',
        'amount'         => 'decimal:2',
        'vat_amount'     => 'decimal:2',
        'is_no_receipt'  => 'boolean',
        'is_ocr_failed'  => 'boolean',
        'returned_at'    => 'datetime',
        'expires_at'     => 'datetime',
        'rejected_at'    => 'datetime',
        'approved_at'    => 'datetime',
        'cancelled_at'   => 'datetime',
        'field_overrides' => 'array',
    ];

    public function company(): BelongsTo
    {
        return $this->belongsTo(Company::class);
    }

    public function uploader(): BelongsTo
    {
        return $this->belongsTo(User::class, 'uploaded_by');
    }

    public function account(): BelongsTo
    {
        return $this->belongsTo(Account::class);
    }

    public function merchant(): BelongsTo
    {
        return $this->belongsTo(Merchant::class);
    }

    public function transactionLines(): HasMany
    {
        return $this->hasMany(TransactionLine::class);
    }

    public function scopeForQueue(Builder $query): Builder
    {
        return $query->where('status', 'parked')
                     ->orderByRaw("CASE flag WHEN 'RED' THEN 1 WHEN 'YELLOW' THEN 2 WHEN 'GREEN' THEN 3 END");
    }
}
