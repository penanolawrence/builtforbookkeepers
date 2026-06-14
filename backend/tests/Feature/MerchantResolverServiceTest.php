<?php

namespace Tests\Feature;

use App\Models\Company;
use App\Models\Document;
use App\Models\Merchant;
use App\Models\User;
use App\Services\Merchant\MerchantResolverService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class MerchantResolverServiceTest extends TestCase
{
    use RefreshDatabase;

    private MerchantResolverService $service;
    private Company $company;

    protected function setUp(): void
    {
        parent::setUp();
        $this->service = new MerchantResolverService();
        $this->company = Company::factory()->create();
    }

    public function test_returns_null_when_both_name_and_tin_are_null(): void
    {
        $result = $this->service->resolve($this->company->id, null, null);

        $this->assertNull($result);
        $this->assertDatabaseCount('merchants', 0);
    }

    public function test_finds_existing_merchant_by_tin(): void
    {
        $existing = Merchant::factory()->create([
            'company_id' => $this->company->id,
            'tin'        => '123-456-789-000',
            'name'       => 'Old Name',
        ]);

        $result = $this->service->resolve($this->company->id, 'Different Name', '123-456-789-000');

        $this->assertEquals($existing->id, $result->id);
        $this->assertDatabaseCount('merchants', 1);
    }

    public function test_tin_lookup_is_scoped_to_company(): void
    {
        $otherCompany = Company::factory()->create();
        Merchant::factory()->create([
            'company_id' => $otherCompany->id,
            'tin'        => '999-888-777-000',
        ]);

        $result = $this->service->resolve($this->company->id, 'My Supplier', '999-888-777-000');

        $this->assertNotNull($result);
        $this->assertEquals($this->company->id, $result->company_id);
        $this->assertDatabaseCount('merchants', 2);
    }

    public function test_finds_existing_merchant_by_name_case_insensitive(): void
    {
        $existing = Merchant::factory()->create([
            'company_id' => $this->company->id,
            'name'       => 'Jollibee',
            'tin'        => null,
        ]);

        $result = $this->service->resolve($this->company->id, 'JOLLIBEE', null);

        $this->assertEquals($existing->id, $result->id);
        $this->assertDatabaseCount('merchants', 1);
    }

    public function test_creates_new_merchant_when_no_match(): void
    {
        $result = $this->service->resolve($this->company->id, 'New Supplier', '111-222-333-000');

        $this->assertNotNull($result);
        $this->assertEquals('New Supplier', $result->name);
        $this->assertEquals('111-222-333-000', $result->tin);
        $this->assertEquals($this->company->id, $result->company_id);
        $this->assertDatabaseCount('merchants', 1);
    }

    public function test_tin_takes_precedence_over_name_for_lookup(): void
    {
        $byTin = Merchant::factory()->create([
            'company_id' => $this->company->id,
            'tin'        => '111-000-000-000',
            'name'       => 'TIN Match',
        ]);
        Merchant::factory()->create([
            'company_id' => $this->company->id,
            'tin'        => null,
            'name'       => 'Name Match',
        ]);

        $result = $this->service->resolve($this->company->id, 'Name Match', '111-000-000-000');

        $this->assertEquals($byTin->id, $result->id);
    }

    public function test_merchant_belongs_to_company(): void
    {
        $company  = Company::factory()->create();
        $merchant = Merchant::factory()->create(['company_id' => $company->id]);

        $this->assertEquals($company->id, $merchant->company->id);
    }

    public function test_document_belongs_to_merchant(): void
    {
        $user     = User::factory()->create();
        $merchant = Merchant::factory()->create(['company_id' => $this->company->id]);
        $document = Document::factory()->create([
            'company_id'  => $this->company->id,
            'uploaded_by' => $user->id,
            'merchant_id' => $merchant->id,
        ]);

        $this->assertEquals($merchant->id, $document->merchant->id);
    }
}
