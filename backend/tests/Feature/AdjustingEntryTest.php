<?php

namespace Tests\Feature;

use App\Models\Account;
use App\Models\AdjustingEntry;
use App\Models\AdjustingEntryLine;
use App\Models\ChartOfAccountSubtype;
use App\Models\Company;
use App\Models\PeriodClosing;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AdjustingEntryTest extends TestCase
{
    use RefreshDatabase;

    private User $accountant;
    private Company $company;
    private Account $debitAccount;
    private Account $creditAccount;

    protected function setUp(): void
    {
        parent::setUp();

        $this->accountant = User::factory()->create(['role' => 'accountant']);

        $this->company = Company::factory()->create([
            'accountant_id' => $this->accountant->id,
            'bir_type'      => 'non_vat',
        ]);

        $this->debitAccount = Account::factory()->create([
            'company_id' => $this->company->id,
            'code'       => '5100',
            'name'       => 'Office Supplies',
            'type'       => 'expense',
        ]);

        $this->creditAccount = Account::factory()->create([
            'company_id' => $this->company->id,
            'code'       => '1001',
            'name'       => 'Cash on Hand',
            'type'       => 'cash',
        ]);
    }

    public function test_create_stores_subtype_and_description_per_line(): void
    {
        $subtype = ChartOfAccountSubtype::factory()->create(['name' => 'Office Supplies']);

        $response = $this->actingAs($this->accountant)
            ->postJson('/api/adjusting-entries', [
                'companyId' => $this->company->id,
                'date'      => '2026-06-02',
                'memo'      => 'Test entry',
                'type'      => 'Reclassification',
                'lines'     => [
                    [
                        'accountId'   => $this->debitAccount->id,
                        'subtypeId'   => $subtype->id,
                        'debit'       => 500.00,
                        'credit'      => null,
                        'description' => 'Pens and paper',
                    ],
                    [
                        'accountId'   => $this->creditAccount->id,
                        'subtypeId'   => null,
                        'debit'       => null,
                        'credit'      => 500.00,
                        'description' => null,
                    ],
                ],
            ]);

        $response->assertStatus(201);

        $debitLine = AdjustingEntryLine::where('account_id', $this->debitAccount->id)->first();
        $this->assertNotNull($debitLine);
        $this->assertEquals($subtype->id, $debitLine->subtype_id);
        $this->assertEquals('Pens and paper', $debitLine->description);

        $creditLine = AdjustingEntryLine::where('account_id', $this->creditAccount->id)->first();
        $this->assertNull($creditLine->subtype_id);
        $this->assertNull($creditLine->description);
    }

    public function test_show_returns_subtype_and_description_per_line(): void
    {
        $subtype = ChartOfAccountSubtype::factory()->create(['name' => 'Travel']);

        $entry = AdjustingEntry::create([
            'company_id'  => $this->company->id,
            'created_by'  => $this->accountant->id,
            'status'      => 'draft',
            'type'        => 'Reclassification',
            'entry_date'  => '2026-06-02',
            'description' => 'Test entry',
            'ref_number'  => 'ADJ-001',
        ]);

        AdjustingEntryLine::create([
            'adjusting_entry_id' => $entry->id,
            'account_id'         => $this->debitAccount->id,
            'subtype_id'         => $subtype->id,
            'debit'              => 500.00,
            'credit'             => null,
            'description'        => 'Flight to Cebu',
        ]);

        AdjustingEntryLine::create([
            'adjusting_entry_id' => $entry->id,
            'account_id'         => $this->creditAccount->id,
            'subtype_id'         => null,
            'debit'              => null,
            'credit'             => 500.00,
            'description'        => null,
        ]);

        $response = $this->actingAs($this->accountant)
            ->getJson("/api/adjusting-entries/{$entry->id}");

        $response->assertOk();
        $response->assertJsonPath('lines.0.subtypeId', $subtype->id);
        $response->assertJsonPath('lines.0.subtypeName', 'Travel');
        $response->assertJsonPath('lines.0.description', 'Flight to Cebu');
        $response->assertJsonPath('lines.1.subtypeId', null);
        $response->assertJsonPath('lines.1.description', null);
    }

    public function test_create_returns_422_when_period_is_closed(): void
    {
        $closing            = new PeriodClosing(['company_id' => $this->company->id, 'period_year' => 2025, 'period_month' => 1]);
        $closing->closed_by = $this->accountant->id;
        $closing->closed_at = now();
        $closing->save();

        $this->actingAs($this->accountant, 'sanctum')
             ->postJson('/api/adjusting-entries', [
                 'companyId' => $this->company->id,
                 'type'      => 'Reclassification',
                 'date'      => '2025-01-31',
                 'memo'      => 'Test',
                 'lines'     => [
                     ['accountId' => $this->debitAccount->id,  'debit' => 1000, 'credit' => null, 'description' => null],
                     ['accountId' => $this->creditAccount->id, 'debit' => null, 'credit' => 1000, 'description' => null],
                 ],
             ])
             ->assertUnprocessable()
             ->assertJsonFragment(['message' => 'The period Jan 2025 is locked. Adjusting entries cannot be posted to a closed period.']);
    }

    public function test_submit_returns_422_when_period_is_closed(): void
    {
        $entry = AdjustingEntry::factory()->create([
            'company_id' => $this->company->id,
            'created_by' => $this->accountant->id,
            'status'     => 'draft',
            'entry_date' => '2025-01-31',
        ]);

        $closing            = new PeriodClosing(['company_id' => $this->company->id, 'period_year' => 2025, 'period_month' => 1]);
        $closing->closed_by = $this->accountant->id;
        $closing->closed_at = now();
        $closing->save();

        $this->actingAs($this->accountant, 'sanctum')
             ->postJson("/api/adjusting-entries/{$entry->id}/submit")
             ->assertUnprocessable()
             ->assertJsonFragment(['message' => 'The period Jan 2025 is locked. Adjusting entries cannot be posted to a closed period.']);
    }

    public function test_update_stores_subtype_and_description_per_line(): void
    {
        $subtype = ChartOfAccountSubtype::factory()->create(['name' => 'Repairs']);

        $entry = AdjustingEntry::create([
            'company_id'  => $this->company->id,
            'created_by'  => $this->accountant->id,
            'status'      => 'draft',
            'type'        => 'Reclassification',
            'entry_date'  => '2026-06-02',
            'description' => 'Original memo',
            'ref_number'  => 'ADJ-001',
        ]);

        $this->actingAs($this->accountant)
            ->patchJson("/api/adjusting-entries/{$entry->id}", [
                'lines' => [
                    [
                        'accountId'   => $this->debitAccount->id,
                        'subtypeId'   => $subtype->id,
                        'debit'       => 300.00,
                        'credit'      => null,
                        'description' => 'Roof repair',
                    ],
                    [
                        'accountId'   => $this->creditAccount->id,
                        'subtypeId'   => null,
                        'debit'       => null,
                        'credit'      => 300.00,
                        'description' => null,
                    ],
                ],
            ])
            ->assertOk();

        $line = AdjustingEntryLine::where('account_id', $this->debitAccount->id)->first();
        $this->assertEquals($subtype->id, $line->subtype_id);
        $this->assertEquals('Roof repair', $line->description);
    }
}
