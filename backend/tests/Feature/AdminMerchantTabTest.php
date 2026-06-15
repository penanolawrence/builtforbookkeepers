<?php

namespace Tests\Feature;

use App\Models\Company;
use App\Models\Document;
use App\Models\Merchant;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AdminMerchantTabTest extends TestCase
{
    use RefreshDatabase;

    private User $admin;
    private Company $company;

    protected function setUp(): void
    {
        parent::setUp();
        $this->admin   = User::factory()->create(['role' => 'admin']);
        $this->company = Company::factory()->create();
    }

    public function test_index_returns_merchants_with_document_count(): void
    {
        $merchant = Merchant::factory()->create([
            'company_id' => $this->company->id,
            'name'       => 'Acme Corp',
            'tin'        => '123-456-789',
            'address'    => '123 Main St',
        ]);
        $document = Document::factory()->create([
            'company_id' => $this->company->id,
        ]);
        $document->merchant_id = $merchant->id;
        $document->save();

        $response = $this->actingAs($this->admin)
            ->getJson("/api/admin/clients/{$this->company->id}/merchants");

        $response->assertOk()
            ->assertJsonCount(1)
            ->assertJsonPath('0.id', $merchant->id)
            ->assertJsonPath('0.name', 'Acme Corp')
            ->assertJsonPath('0.tin', '123-456-789')
            ->assertJsonPath('0.address', '123 Main St')
            ->assertJsonPath('0.documentCount', 1);
    }

    public function test_store_creates_merchant(): void
    {
        $response = $this->actingAs($this->admin)
            ->postJson("/api/admin/clients/{$this->company->id}/merchants", [
                'name'    => 'New Vendor',
                'tin'     => '999-000-111',
                'address' => '456 Side St',
            ]);

        $response->assertCreated()
            ->assertJsonPath('name', 'New Vendor')
            ->assertJsonPath('documentCount', 0);

        $this->assertDatabaseHas('merchants', [
            'company_id' => $this->company->id,
            'name'       => 'New Vendor',
        ]);
    }

    public function test_store_requires_name(): void
    {
        $response = $this->actingAs($this->admin)
            ->postJson("/api/admin/clients/{$this->company->id}/merchants", []);

        $response->assertUnprocessable()
            ->assertJsonValidationErrors(['name']);
    }

    public function test_update_changes_merchant_fields(): void
    {
        $merchant = Merchant::factory()->create([
            'company_id' => $this->company->id,
            'name'       => 'Old Name',
        ]);

        $response = $this->actingAs($this->admin)
            ->patchJson("/api/admin/merchants/{$merchant->id}", [
                'name'    => 'New Name',
                'tin'     => '777-888-999',
                'address' => 'New Address',
            ]);

        $response->assertOk()
            ->assertJsonPath('name', 'New Name')
            ->assertJsonPath('tin', '777-888-999');

        $this->assertDatabaseHas('merchants', ['id' => $merchant->id, 'name' => 'New Name']);
    }

    public function test_destroy_deletes_merchant_without_documents(): void
    {
        $merchant = Merchant::factory()->create(['company_id' => $this->company->id]);

        $response = $this->actingAs($this->admin)
            ->deleteJson("/api/admin/merchants/{$merchant->id}");

        $response->assertOk();
        $this->assertDatabaseMissing('merchants', ['id' => $merchant->id]);
    }

    public function test_destroy_returns_422_when_merchant_has_documents(): void
    {
        $merchant = Merchant::factory()->create(['company_id' => $this->company->id]);
        $document = Document::factory()->create([
            'company_id' => $this->company->id,
        ]);
        $document->merchant_id = $merchant->id;
        $document->save();

        $response = $this->actingAs($this->admin)
            ->deleteJson("/api/admin/merchants/{$merchant->id}");

        $response->assertUnprocessable()
            ->assertJsonPath('message', 'Cannot delete a merchant with linked documents.');

        $this->assertDatabaseHas('merchants', ['id' => $merchant->id]);
    }
}
