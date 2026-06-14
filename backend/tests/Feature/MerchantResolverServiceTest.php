<?php

namespace Tests\Feature;

use App\Models\Company;
use App\Models\Document;
use App\Models\Merchant;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class MerchantResolverServiceTest extends TestCase
{
    use RefreshDatabase;

    public function test_merchant_belongs_to_company(): void
    {
        $company  = Company::factory()->create();
        $merchant = Merchant::factory()->create(['company_id' => $company->id]);

        $this->assertEquals($company->id, $merchant->company->id);
    }

    public function test_document_belongs_to_merchant(): void
    {
        $user     = User::factory()->create();
        $company  = Company::factory()->create();
        $merchant = Merchant::factory()->create(['company_id' => $company->id]);
        $document = Document::factory()->create([
            'company_id'  => $company->id,
            'uploaded_by' => $user->id,
            'merchant_id' => $merchant->id,
        ]);

        $this->assertEquals($merchant->id, $document->merchant->id);
    }
}
