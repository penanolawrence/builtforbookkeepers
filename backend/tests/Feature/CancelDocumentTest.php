<?php

namespace Tests\Feature;

use App\Models\Company;
use App\Models\Document;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class CancelDocumentTest extends TestCase
{
    use RefreshDatabase;

    private User $client;
    private Company $company;

    protected function setUp(): void
    {
        parent::setUp();

        $this->company = Company::factory()->create();
        $this->client  = User::factory()->create([
            'role'       => 'client',
            'company_id' => $this->company->id,
        ]);
    }

    public function test_client_can_cancel_processing_document(): void
    {
        $doc = Document::factory()->create([
            'company_id' => $this->company->id,
            'status'     => 'processing',
        ]);

        $response = $this->actingAs($this->client)
            ->postJson("/api/documents/{$doc->id}/cancel");

        $response->assertOk();
        $this->assertDatabaseHas('documents', [
            'id'     => $doc->id,
            'status' => 'cancelled',
        ]);
    }

    public function test_client_can_cancel_parked_document(): void
    {
        $doc = Document::factory()->create([
            'company_id' => $this->company->id,
            'status'     => 'parked',
        ]);

        $response = $this->actingAs($this->client)
            ->postJson("/api/documents/{$doc->id}/cancel");

        $response->assertOk();
        $this->assertDatabaseHas('documents', [
            'id'     => $doc->id,
            'status' => 'cancelled',
        ]);
    }

    public function test_client_can_cancel_returned_document(): void
    {
        $doc = Document::factory()->create([
            'company_id' => $this->company->id,
            'status'     => 'returned',
        ]);

        $response = $this->actingAs($this->client)
            ->postJson("/api/documents/{$doc->id}/cancel");

        $response->assertOk();
        $this->assertDatabaseHas('documents', [
            'id'     => $doc->id,
            'status' => 'cancelled',
        ]);
    }

    public function test_client_cannot_cancel_approved_document(): void
    {
        $doc = Document::factory()->create([
            'company_id' => $this->company->id,
            'status'     => 'approved',
        ]);

        $response = $this->actingAs($this->client)
            ->postJson("/api/documents/{$doc->id}/cancel");

        $response->assertUnprocessable();
        $this->assertDatabaseHas('documents', ['id' => $doc->id, 'status' => 'approved']);
    }

    public function test_client_cannot_cancel_rejected_document(): void
    {
        $doc = Document::factory()->create([
            'company_id' => $this->company->id,
            'status'     => 'rejected',
        ]);

        $response = $this->actingAs($this->client)
            ->postJson("/api/documents/{$doc->id}/cancel");

        $response->assertUnprocessable();
        $this->assertDatabaseHas('documents', ['id' => $doc->id, 'status' => 'rejected']);
    }

    public function test_client_cannot_cancel_another_companys_document(): void
    {
        $otherCompany = Company::factory()->create();
        $doc = Document::factory()->create([
            'company_id' => $otherCompany->id,
            'status'     => 'parked',
        ]);

        $response = $this->actingAs($this->client)
            ->postJson("/api/documents/{$doc->id}/cancel");

        $response->assertNotFound();
        $this->assertDatabaseHas('documents', ['id' => $doc->id, 'status' => 'parked']);
    }

    public function test_unauthenticated_user_cannot_cancel(): void
    {
        $doc = Document::factory()->create([
            'company_id' => $this->company->id,
            'status'     => 'parked',
        ]);

        $response = $this->postJson("/api/documents/{$doc->id}/cancel");

        $response->assertUnauthorized();
    }
}
