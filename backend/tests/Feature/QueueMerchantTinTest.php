<?php

namespace Tests\Feature;

use App\Models\Account;
use App\Models\Company;
use App\Models\Document;
use App\Models\Merchant;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class QueueMerchantTinTest extends TestCase
{
    use RefreshDatabase;

    private User $accountant;
    private Company $company;
    private Document $document;

    protected function setUp(): void
    {
        parent::setUp();

        $this->accountant = User::factory()->create(['role' => 'accountant']);

        $this->company = Company::factory()->create([
            'accountant_id' => $this->accountant->id,
        ]);

        $this->document = Document::factory()->create([
            'company_id'    => $this->company->id,
            'status'        => 'parked',
            'document_type' => 'expense',
            'merchant_name' => 'Acme Corp',
        ]);

        Account::factory()->create([
            'company_id' => $this->company->id,
            'code'       => '1001',
            'name'       => 'Cash on Hand',
            'type'       => 'cash',
        ]);

        Account::factory()->create([
            'company_id' => $this->company->id,
            'code'       => '5100',
            'name'       => 'Utilities Expense',
            'type'       => 'expense',
        ]);
    }

    public function test_show_returns_merchant_tin_when_linked(): void
    {
        $merchant = Merchant::factory()->create([
            'company_id' => $this->company->id,
            'name'       => 'Acme Corp',
            'tin'        => '123-456-789-000',
        ]);

        $this->document->merchant_id = $merchant->id;
        $this->document->save();

        $response = $this->actingAs($this->accountant)
            ->getJson("/api/queue/{$this->document->id}");

        $response->assertOk();
        $response->assertJsonPath('merchantTin', '123-456-789-000');
    }

    public function test_show_returns_null_merchant_tin_when_no_merchant(): void
    {
        $response = $this->actingAs($this->accountant)
            ->getJson("/api/queue/{$this->document->id}");

        $response->assertOk();
        $response->assertJsonPath('merchantTin', null);
    }

    public function test_approve_links_existing_merchant_by_tin(): void
    {
        $merchant = Merchant::factory()->create([
            'company_id' => $this->company->id,
            'name'       => 'Acme Corp',
            'tin'        => '999-888-777-000',
        ]);

        $response = $this->actingAs($this->accountant)
            ->postJson("/api/queue/{$this->document->id}/approve", [
                'fields' => [
                    'merchantTin'   => '999-888-777-000',
                    'merchantName'  => 'Acme Corp',
                    'declaredType'  => 'expense',
                    'paymentMethod' => 'cash',
                ],
            ]);

        $response->assertOk();
        $this->assertEquals($merchant->id, $this->document->fresh()->merchant_id);
    }

    public function test_approve_creates_new_merchant_when_tin_is_new(): void
    {
        $response = $this->actingAs($this->accountant)
            ->postJson("/api/queue/{$this->document->id}/approve", [
                'fields' => [
                    'merchantTin'   => '111-222-333-000',
                    'merchantName'  => 'Acme Corp',
                    'declaredType'  => 'expense',
                    'paymentMethod' => 'cash',
                ],
            ]);

        $response->assertOk();
        $this->assertNotNull($this->document->fresh()->merchant_id);
        $this->assertDatabaseHas('merchants', [
            'tin'        => '111-222-333-000',
            'company_id' => $this->company->id,
        ]);
    }
}
