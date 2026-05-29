<?php

namespace App\Services\Ref;

use App\Models\Company;
use App\Models\RefSequence;
use Illuminate\Support\Facades\DB;

class RefSequenceService
{
    public function nextRef(Company $co, string $prefix): string
    {
        $row = DB::transaction(function () use ($co, $prefix) {
            $row = RefSequence::where('company_id', $co->id)
                ->where('prefix', $prefix)
                ->lockForUpdate()
                ->first();

            if (!$row) {
                $row = RefSequence::create([
                    'company_id' => $co->id,
                    'prefix'     => $prefix,
                    'last_seq'   => 0,
                ]);
            }

            $row->last_seq += 1;
            $row->save();

            return $row;
        });

        return "{$prefix}-" . str_pad($row->last_seq, 4, '0', STR_PAD_LEFT);
    }
}
