<?php

namespace Tests\Feature;

use App\Models\Company;
use App\Models\Document;
use App\Models\Merchant;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AccountantMerchantTabTest extends TestCase
{
    use RefreshDatabase;

    private User $accountant;
    private Company $company;

    protected function setUp(): void
    {
        parent::setUp();
        $this->accountant = User::factory()->create(['role' => 'accountant']);
        $this->company    = Company::factory()->create(['accountant_id' => $this->accountant->id]);
    }

    public function test_index_returns_merchants_for_assigned_company(): void
    {
        $merchant = Merchant::factory()->create([
            'company_id' => $this->company->id,
            'name'       => 'Supplier X',
            'tin'        => '111-222-333',
        ]);

        $response = $this->actingAs($this->accountant)
            ->getJson("/api/accountant/clients/{$this->company->id}/merchants");

        $response->assertOk()
            ->assertJsonCount(1)
            ->assertJsonPath('0.id', $merchant->id)
            ->assertJsonPath('0.documentCount', 0);
    }

    public function test_index_returns_403_for_unassigned_company(): void
    {
        $other = Company::factory()->create();

        $response = $this->actingAs($this->accountant)
            ->getJson("/api/accountant/clients/{$other->id}/merchants");

        $response->assertForbidden();
    }

    public function test_store_creates_merchant(): void
    {
        $response = $this->actingAs($this->accountant)
            ->postJson("/api/accountant/clients/{$this->company->id}/merchants", [
                'name'    => 'New Vendor',
                'tin'     => '444-555-666',
                'address' => '789 Elm Ave',
            ]);

        $response->assertCreated()
            ->assertJsonPath('name', 'New Vendor')
            ->assertJsonPath('documentCount', 0);

        $this->assertDatabaseHas('merchants', [
            'company_id' => $this->company->id,
            'name'       => 'New Vendor',
        ]);
    }

    public function test_store_returns_403_for_unassigned_company(): void
    {
        $other = Company::factory()->create();

        $response = $this->actingAs($this->accountant)
            ->postJson("/api/accountant/clients/{$other->id}/merchants", ['name' => 'X']);

        $response->assertForbidden();
    }

    public function test_update_changes_merchant_fields(): void
    {
        $merchant = Merchant::factory()->create([
            'company_id' => $this->company->id,
            'name'       => 'Old Name',
        ]);

        $response = $this->actingAs($this->accountant)
            ->patchJson("/api/accountant/merchants/{$merchant->id}", [
                'name'    => 'Updated Name',
                'tin'     => '000-111-222',
                'address' => 'New Addr',
            ]);

        $response->assertOk()
            ->assertJsonPath('name', 'Updated Name');

        $this->assertDatabaseHas('merchants', ['id' => $merchant->id, 'name' => 'Updated Name']);
    }

    public function test_update_returns_403_for_merchant_on_unassigned_company(): void
    {
        $other    = Company::factory()->create();
        $merchant = Merchant::factory()->create(['company_id' => $other->id]);

        $response = $this->actingAs($this->accountant)
            ->patchJson("/api/accountant/merchants/{$merchant->id}", ['name' => 'X']);

        $response->assertForbidden();
    }

    public function test_destroy_deletes_merchant_without_documents(): void
    {
        $merchant = Merchant::factory()->create(['company_id' => $this->company->id]);

        $response = $this->actingAs($this->accountant)
            ->deleteJson("/api/accountant/merchants/{$merchant->id}");

        $response->assertOk();
        $this->assertDatabaseMissing('merchants', ['id' => $merchant->id]);
    }

    public function test_destroy_returns_422_when_merchant_has_documents(): void
    {
        $merchant = Merchant::factory()->create(['company_id' => $this->company->id]);
        $document = Document::factory()->create(['company_id' => $this->company->id]);
        $document->merchant_id = $merchant->id;
        $document->save();

        $response = $this->actingAs($this->accountant)
            ->deleteJson("/api/accountant/merchants/{$merchant->id}");

        $response->assertUnprocessable()
            ->assertJsonPath('message', 'Cannot delete a merchant with linked documents.');
    }

    public function test_destroy_returns_403_for_merchant_on_unassigned_company(): void
    {
        $other    = Company::factory()->create();
        $merchant = Merchant::factory()->create(['company_id' => $other->id]);

        $response = $this->actingAs($this->accountant)
            ->deleteJson("/api/accountant/merchants/{$merchant->id}");

        $response->assertForbidden();
    }
}
