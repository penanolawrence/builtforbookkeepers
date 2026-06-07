<?php

namespace Tests\Feature;

use App\Models\Account;
use App\Models\Company;
use App\Models\Document;
use App\Models\TransactionLine;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class QueueReviewTest extends TestCase
{
    use RefreshDatabase;

    private User $accountant;
    private Company $company;
    private Document $document;
    private Account $expenseAccount;

    protected function setUp(): void
    {
        parent::setUp();

        $this->accountant = User::factory()->create(['role' => 'accountant']);

        $this->company = Company::factory()->create([
            'accountant_id' => $this->accountant->id,
            'bir_type'      => 'non_vat',
        ]);

        $this->document = Document::factory()->create([
            'company_id'    => $this->company->id,
            'status'        => 'parked',
            'merchant_name' => 'MERALCO',
            'document_date' => '2026-05-20',
            'document_type' => 'expense',
            'payment_method'=> 'cash',
            'flag'          => 'GREEN',
        ]);

        $this->expenseAccount = Account::factory()->create([
            'company_id' => $this->company->id,
            'code'       => '5100',
            'name'       => 'Utilities Expense',
            'type'       => 'expense',
        ]);

        // Cash account required by JournalEntryService
        Account::factory()->create([
            'company_id' => $this->company->id,
            'code'       => '1001',
            'name'       => 'Cash on Hand',
            'type'       => 'cash',
        ]);
    }

    public function test_show_includes_transaction_lines(): void
    {
        TransactionLine::factory()->create([
            'document_id'  => $this->document->id,
            'account_id'   => $this->expenseAccount->id,
            'account_code' => '5100',
            'type'         => 'expense',
            'amount'       => 1200.00,
            'description'  => 'Meralco bill',
            'date'         => '2026-05-20',
        ]);

        $response = $this->actingAs($this->accountant)
            ->getJson("/api/queue/{$this->document->id}");

        $response->assertOk();
        $response->assertJsonCount(1, 'transactionLines');
        $response->assertJsonPath('transactionLines.0.accountCode', '5100');
        $response->assertJsonPath('transactionLines.0.accountName', 'Utilities Expense');
        $response->assertJsonPath('transactionLines.0.type', 'expense');
        $this->assertEquals(1200.0, $response->json('transactionLines.0.amount'));
        $response->assertJsonPath('transactionLines.0.date', '2026-05-20');
    }

    public function test_approve_with_field_overrides_stores_diff(): void
    {
        $this->document->update([
            'merchant_name' => 'MERALCO',
            'document_date' => '2026-05-20',
        ]);

        TransactionLine::factory()->create([
            'document_id'  => $this->document->id,
            'account_id'   => $this->expenseAccount->id,
            'account_code' => '5100',
            'type'         => 'expense',
            'amount'       => 1200.00,
        ]);

        $response = $this->actingAs($this->accountant)
            ->postJson("/api/queue/{$this->document->id}/approve", [
                'fields' => [
                    'merchantName' => 'Manila Electric Company',
                    'date'         => '2026-05-25',
                    'declaredType' => 'expense',
                    'paymentMethod'=> 'cash',
                ],
            ]);

        $response->assertOk();

        $overrides = $this->document->fresh()->field_overrides;
        $this->assertNotNull($overrides);
        $this->assertEquals($this->accountant->id, $overrides['overriddenBy']);

        $fieldKeys = collect($overrides['fields'])->pluck('field')->all();
        $this->assertContains('merchantName', $fieldKeys);
        $this->assertContains('date', $fieldKeys);
        $this->assertNotContains('declaredType', $fieldKeys);
        $this->assertNotContains('paymentMethod', $fieldKeys);

        $merchantOverride = collect($overrides['fields'])->firstWhere('field', 'merchantName');
        $this->assertEquals('MERALCO', $merchantOverride['original']);
        $this->assertEquals('Manila Electric Company', $merchantOverride['override']);
    }

    public function test_approve_without_changes_leaves_field_overrides_null(): void
    {
        TransactionLine::factory()->create([
            'document_id'  => $this->document->id,
            'account_id'   => $this->expenseAccount->id,
            'account_code' => '5100',
            'type'         => 'expense',
            'amount'       => 1200.00,
        ]);

        $response = $this->actingAs($this->accountant)
            ->postJson("/api/queue/{$this->document->id}/approve", [
                'fields' => [
                    'merchantName' => 'MERALCO',
                    'date'         => '2026-05-20',
                    'declaredType' => 'expense',
                    'paymentMethod'=> 'cash',
                ],
            ]);

        $response->assertOk();
        $this->assertNull($this->document->fresh()->field_overrides);
    }

    public function test_approve_updates_existing_transaction_lines(): void
    {
        $line = TransactionLine::factory()->create([
            'document_id'  => $this->document->id,
            'account_id'   => $this->expenseAccount->id,
            'account_code' => '5100',
            'type'         => 'expense',
            'amount'       => 1200.00,
        ]);

        $newAccount = Account::factory()->create([
            'company_id' => $this->company->id,
            'code'       => '5200',
            'name'       => 'Rent Expense',
            'type'       => 'expense',
        ]);

        $response = $this->actingAs($this->accountant)
            ->postJson("/api/queue/{$this->document->id}/approve", [
                'lines' => [[
                    'id'          => $line->id,
                    'accountId'   => $newAccount->id,
                    'accountCode' => '5200',
                    'amount'      => 1500.00,
                    'description' => 'Monthly rent',
                    'date'        => '2026-05-20',
                ]],
            ]);

        $response->assertOk();

        $updated = $line->fresh();
        $this->assertEquals('5200', $updated->account_code);
        $this->assertEquals('Monthly rent', $updated->description);
        $this->assertEquals('1500.00', $updated->amount);
    }

    public function test_approve_creates_new_transaction_lines(): void
    {
        TransactionLine::factory()->create([
            'document_id'  => $this->document->id,
            'account_id'   => $this->expenseAccount->id,
            'account_code' => '5100',
            'type'         => 'expense',
            'amount'       => 1200.00,
        ]);

        $response = $this->actingAs($this->accountant)
            ->postJson("/api/queue/{$this->document->id}/approve", [
                'lines' => [[
                    'type'         => 'expense',
                    'accountId'    => $this->expenseAccount->id,
                    'accountCode'  => '5100',
                    'amount'       => 300.00,
                    'description'  => 'Printer paper',
                    'date'         => '2026-05-20',
                ]],
            ]);

        $response->assertOk();
        $this->assertDatabaseHas('transaction_lines', [
            'document_id' => $this->document->id,
            'amount'      => '300.00',
            'description' => 'Printer paper',
        ]);
    }

    public function test_approve_deletes_removed_lines(): void
    {
        $line1 = TransactionLine::factory()->create([
            'document_id'  => $this->document->id,
            'account_id'   => $this->expenseAccount->id,
            'account_code' => '5100',
            'type'         => 'expense',
            'amount'       => 1200.00,
        ]);

        $line2 = TransactionLine::factory()->create([
            'document_id'  => $this->document->id,
            'account_id'   => $this->expenseAccount->id,
            'account_code' => '5100',
            'type'         => 'expense',
            'amount'       => 300.00,
        ]);

        $response = $this->actingAs($this->accountant)
            ->postJson("/api/queue/{$this->document->id}/approve", [
                'removedLineIds' => [$line2->id],
            ]);

        $response->assertOk();
        $this->assertDatabaseMissing('transaction_lines', ['id' => $line2->id]);
        $this->assertDatabaseHas('transaction_lines', ['id' => $line1->id]);
    }

    public function test_document_detail_includes_field_overrides(): void
    {
        $this->document->update([
            'status'          => 'approved',
            'approved_by'     => $this->accountant->id,
            'approved_at'     => now(),
            'field_overrides' => [
                'overriddenBy' => $this->accountant->id,
                'overriddenAt' => now()->toIso8601String(),
                'fields'       => [
                    ['field' => 'merchantName', 'original' => 'MERALCO', 'override' => 'Manila Electric Co.'],
                ],
                'lines' => [],
            ],
        ]);

        $client = User::factory()->create([
            'role'       => 'client',
            'company_id' => $this->company->id,
        ]);

        $response = $this->actingAs($client)
            ->getJson("/api/documents/{$this->document->id}");

        $response->assertOk();
        $response->assertJsonPath('fieldOverrides.fields.0.field', 'merchantName');
        $response->assertJsonPath('fieldOverrides.fields.0.original', 'MERALCO');
    }

    public function test_signed_url_accessible_to_accountant(): void
    {
        $response = $this->actingAs($this->accountant)
            ->getJson("/api/documents/{$this->document->id}/image");

        // 200 — not 403 or 404. URL may be null (MinIO not running in test), but endpoint must be accessible.
        $response->assertStatus(200);
    }
}
