<?php

namespace App\Services\Merchant;

use App\Models\Merchant;

class MerchantResolverService
{
    public function resolve(string $companyId, ?string $name, ?string $tin): ?Merchant
    {
        if (!$name && !$tin) {
            return null;
        }

        if ($tin) {
            $merchant = Merchant::where('company_id', $companyId)
                ->where('tin', $tin)
                ->first();
            if ($merchant) {
                return $merchant;
            }
        }

        if ($name) {
            $merchant = Merchant::where('company_id', $companyId)
                ->whereRaw('LOWER(name) = ?', [strtolower($name)])
                ->first();
            if ($merchant) {
                return $merchant;
            }
        }

        return Merchant::create([
            'company_id' => $companyId,
            'name'       => $name,
            'tin'        => $tin,
        ]);
    }
}
