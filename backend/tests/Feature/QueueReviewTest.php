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
    }

    public function test_show_includes_transaction_lines(): void
    {
        $account = Account::factory()->create([
            'company_id' => $this->company->id,
            'code'       => '5100',
            'name'       => 'Utilities Expense',
            'type'       => 'expense',
        ]);

        TransactionLine::factory()->create([
            'document_id'  => $this->document->id,
            'account_id'   => $account->id,
            'account_code' => '5100',
            'type'         => 'expense',
            'category'     => 'Utilities',
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
}
