<?php

namespace Tests\Feature;

use App\Models\Account;
use App\Models\Company;
use App\Models\Document;
use App\Models\TransactionLine;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Queue;
use Tests\TestCase;

class TransactionLinesTest extends TestCase
{
    use RefreshDatabase;

    private User $client;
    private Company $company;

    protected function setUp(): void
    {
        parent::setUp();

        $this->company = Company::factory()->create([
            'bir_type' => 'non_vat',
        ]);

        $this->client = User::factory()->create([
            'role'       => 'client',
            'company_id' => $this->company->id,
        ]);
    }

    public function test_document_list_includes_inflow_and_outflow(): void
    {
        $doc = Document::factory()->create([
            'company_id'   => $this->company->id,
            'document_type' => 'income',
            'status'        => 'approved',
        ]);

        TransactionLine::factory()->create([
            'document_id' => $doc->id,
            'type'        => 'income',
            'amount'      => 500.00,
        ]);

        TransactionLine::factory()->create([
            'document_id' => $doc->id,
            'type'        => 'income',
            'amount'      => 300.00,
        ]);

        $response = $this->actingAs($this->client)
            ->getJson('/api/documents');

        $response->assertOk();
        $response->assertJsonFragment([
            'inflow'  => 800.0,
            'outflow' => 0.0,
        ]);
    }

    public function test_document_detail_includes_transaction_lines(): void
    {
        $account = Account::factory()->create([
            'company_id'  => $this->company->id,
            'code'        => '4001',
            'name'        => 'Sales Revenue',
            'type'        => 'income',
        ]);

        $doc = Document::factory()->create([
            'company_id'    => $this->company->id,
            'document_type' => 'income',
            'status'        => 'approved',
        ]);

        TransactionLine::factory()->create([
            'document_id'  => $doc->id,
            'account_id'   => $account->id,
            'account_code' => '4001',
            'type'         => 'income',
            'category'     => 'Sales Revenue',
            'amount'       => 1000.00,
            'description'  => 'Product sales',
        ]);

        $response = $this->actingAs($this->client)
            ->getJson("/api/documents/{$doc->id}");

        $response->assertOk();
        $response->assertJsonCount(1, 'transactionLines');
        $response->assertJsonFragment([
            'accountCode' => '4001',
            'accountName' => 'Sales Revenue',
            'type'        => 'income',
            'amount'      => 1000.0,
            'description' => 'Product sales',
        ]);
    }

    public function test_manual_entry_new_format_creates_one_document_with_lines(): void
    {
        Queue::fake();

        $payload = [
            'declared_type'  => 'expense',
            'date'           => '2026-05-29',
            'payment_method' => 'Cash',
            'lines'          => [
                ['description' => 'Bayad kuryente', 'amount' => 200.00],
                ['description' => 'Office supplies', 'amount' => 150.00],
            ],
        ];

        $response = $this->actingAs($this->client)
            ->postJson('/api/documents/manual', $payload);

        $response->assertCreated();
        $response->assertJsonStructure(['documentId']);

        // One document created (not two)
        $this->assertDatabaseCount('documents', 1);

        $docId = $response->json('documentId');

        // Two pre-classification lines created
        $this->assertDatabaseCount('transaction_lines', 2);
        $this->assertDatabaseHas('transaction_lines', [
            'document_id' => $docId,
            'description' => 'Bayad kuryente',
            'amount'      => '200.00',
            'type'        => 'expense',
        ]);
        $this->assertDatabaseHas('transaction_lines', [
            'document_id' => $docId,
            'description' => 'Office supplies',
            'amount'      => '150.00',
            'type'        => 'expense',
        ]);
    }

    public function test_manual_entry_old_format_is_rejected(): void
    {
        // Old format with 'entries' array should now fail validation
        $payload = [
            'entries' => [
                ['declared_type' => 'expense', 'date' => '2026-05-29', 'amount' => 200, 'payment_method' => 'Cash'],
            ],
        ];

        $response = $this->actingAs($this->client)
            ->postJson('/api/documents/manual', $payload);

        $response->assertUnprocessable(); // 422
    }

    public function test_outflow_zero_for_income_document(): void
    {
        $doc = Document::factory()->create([
            'company_id'    => $this->company->id,
            'document_type' => 'income',
            'status'        => 'parked',
        ]);

        TransactionLine::factory()->create([
            'document_id' => $doc->id,
            'type'        => 'income',
            'amount'      => 750.00,
        ]);

        $response = $this->actingAs($this->client)
            ->getJson('/api/documents');

        $response->assertJsonFragment([
            'inflow'  => 750.0,
            'outflow' => 0.0,
        ]);
    }

    public function test_transaction_line_date_is_stored_and_cast(): void
    {
        $doc = Document::factory()->create([
            'company_id'    => $this->company->id,
            'document_type' => 'income',
            'document_date' => '2026-05-29',
        ]);

        TransactionLine::factory()->create([
            'document_id' => $doc->id,
            'type'        => 'income',
            'amount'      => 2500.00,
            'date'        => '2026-05-25',
        ]);

        $line = TransactionLine::where('document_id', $doc->id)->first();

        $this->assertNotNull($line->date);
        $this->assertInstanceOf(\Carbon\Carbon::class, $line->date);
        $this->assertEquals('2026-05-25', $line->date->toDateString());
    }

    public function test_transaction_line_date_null_is_allowed_for_pre_classification_rows(): void
    {
        $doc = Document::factory()->create([
            'company_id'    => $this->company->id,
            'document_date' => '2026-05-29',
        ]);

        $line = TransactionLine::factory()->create([
            'document_id' => $doc->id,
            'type'        => 'expense',
            'amount'      => 100.00,
            'date'        => null,
        ]);

        $this->assertNull($line->fresh()->date);
    }

    public function test_document_detail_includes_line_date(): void
    {
        $doc = Document::factory()->create([
            'company_id'    => $this->company->id,
            'document_type' => 'income',
            'status'        => 'approved',
        ]);

        TransactionLine::factory()->create([
            'document_id' => $doc->id,
            'type'        => 'income',
            'amount'      => 1000.00,
            'date'        => '2026-05-25',
        ]);

        $response = $this->actingAs($this->client)
            ->getJson("/api/documents/{$doc->id}");

        $response->assertOk();
        $response->assertJsonPath('transactionLines.0.date', '2026-05-25');
    }
}
