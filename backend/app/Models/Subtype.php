<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Subtype extends Model
{
    use HasUuids, HasFactory;

    protected $fillable = ['name'];

    public function transactionLines(): HasMany
    {
        return $this->hasMany(TransactionLine::class);
    }
}
