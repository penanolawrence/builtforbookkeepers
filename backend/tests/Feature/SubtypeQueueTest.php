<?php

namespace Tests\Feature;

use App\Models\Account;
use App\Models\Company;
use App\Models\Document;
use App\Models\Subtype;
use App\Models\TransactionLine;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Queue;
use Tests\TestCase;

class SubtypeQueueTest extends TestCase
{
    use RefreshDatabase;

    private User $accountant;
    private Company $company;
    private Document $document;

    protected function setUp(): void
    {
        parent::setUp();
        Queue::fake();

        $this->accountant = User::factory()->create(['role' => 'accountant']);

        $this->company = Company::factory()->create([
            'accountant_id' => $this->accountant->id,
            'bir_type'      => 'non_vat',
        ]);

        $this->document = Document::factory()->create([
            'company_id' => $this->company->id,
            'status'     => 'parked',
        ]);
    }

    public function test_queue_show_includes_subtype_id_and_name_on_lines(): void
    {
        $subtype = Subtype::factory()->create(['name' => 'Internet']);
        TransactionLine::factory()->create([
            'document_id' => $this->document->id,
            'subtype_id'  => $subtype->id,
        ]);

        $this->actingAs($this->accountant)
            ->getJson("/api/queue/{$this->document->id}")
            ->assertOk()
            ->assertJsonFragment([
                'subtypeId'   => $subtype->id,
                'subtypeName' => 'Internet',
            ]);
    }

    public function test_queue_show_returns_null_subtype_when_line_has_no_subtype(): void
    {
        TransactionLine::factory()->create([
            'document_id' => $this->document->id,
            'subtype_id'  => null,
        ]);

        $this->actingAs($this->accountant)
            ->getJson("/api/queue/{$this->document->id}")
            ->assertOk()
            ->assertJsonFragment([
                'subtypeId'   => null,
                'subtypeName' => null,
            ]);
    }

    public function test_approve_updates_line_subtype_id(): void
    {
        $account = Account::factory()->create([
            'company_id' => $this->company->id,
            'type'       => 'expense',
        ]);

        // Cash account required by JournalEntryService
        Account::factory()->create([
            'company_id' => $this->company->id,
            'code'       => '1001',
            'name'       => 'Cash on Hand',
            'type'       => 'cash',
        ]);

        // Document must have account_id set for JournalEntryService
        $this->document->update([
            'account_id'    => $account->id,
            'document_type' => 'expense',
            'document_date' => now()->toDateString(),
            'amount'        => 500,
        ]);

        $oldSubtype = Subtype::factory()->create(['name' => 'Load']);
        $newSubtype = Subtype::factory()->create(['name' => 'Internet']);

        $line = TransactionLine::factory()->create([
            'document_id'  => $this->document->id,
            'account_id'   => $account->id,
            'account_code' => $account->code,
            'type'         => 'expense',
            'subtype_id'   => $oldSubtype->id,
            'amount'       => 500,
        ]);

        $this->actingAs($this->accountant)
            ->postJson("/api/queue/{$this->document->id}/approve", [
                'lines' => [
                    [
                        'id'        => $line->id,
                        'subtypeId' => $newSubtype->id,
                    ],
                ],
            ])
            ->assertOk();

        $this->assertDatabaseHas('transaction_lines', [
            'id'         => $line->id,
            'subtype_id' => $newSubtype->id,
        ]);
    }
}
