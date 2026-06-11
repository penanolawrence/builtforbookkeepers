<?php

namespace Tests\Feature;

use App\Models\Company;
use App\Models\Document;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AccountantClientsIndexTest extends TestCase
{
    use RefreshDatabase;

    private User $accountant;

    protected function setUp(): void
    {
        parent::setUp();
        $this->accountant = User::factory()->create(['role' => 'accountant']);
    }

    public function test_returns_paginated_shape(): void
    {
        Company::factory()->count(3)->create(['accountant_id' => $this->accountant->id]);

        $response = $this->actingAs($this->accountant)
            ->getJson('/api/accountant/clients?per_page=2&page=1');

        $response->assertOk()
            ->assertJsonStructure([
                'data' => [['id', 'name', 'queueCounts']],
                'total', 'perPage', 'currentPage', 'lastPage',
                'summary' => ['needAttention', 'pendingReview', 'allClear'],
            ])
            ->assertJsonPath('total', 3)
            ->assertJsonPath('lastPage', 2)
            ->assertJsonCount(2, 'data');
    }

    public function test_second_page_returns_remaining_items(): void
    {
        Company::factory()->count(3)->create(['accountant_id' => $this->accountant->id]);

        $response = $this->actingAs($this->accountant)
            ->getJson('/api/accountant/clients?per_page=2&page=2');

        $response->assertOk()
            ->assertJsonPath('currentPage', 2)
            ->assertJsonCount(1, 'data');
    }

    public function test_search_filters_by_company_name(): void
    {
        Company::factory()->create(['name' => 'Reyes Bakery',    'accountant_id' => $this->accountant->id]);
        Company::factory()->create(['name' => 'Santos Trading',  'accountant_id' => $this->accountant->id]);

        $response = $this->actingAs($this->accountant)
            ->getJson('/api/accountant/clients?search=Reyes');

        $response->assertOk()
            ->assertJsonPath('total', 1)
            ->assertJsonPath('data.0.name', 'Reyes Bakery');
    }

    public function test_search_is_case_insensitive(): void
    {
        Company::factory()->create(['name' => 'Reyes Bakery', 'accountant_id' => $this->accountant->id]);

        $response = $this->actingAs($this->accountant)
            ->getJson('/api/accountant/clients?search=reyes');

        $response->assertOk()->assertJsonPath('total', 1);
    }

    public function test_queue_counts_embedded_per_client(): void
    {
        $company = Company::factory()->create(['accountant_id' => $this->accountant->id]);
        Document::factory()->create([
            'company_id' => $company->id, 'status' => 'parked', 'flag' => 'RED',
        ]);
        Document::factory()->create([
            'company_id' => $company->id, 'status' => 'parked', 'flag' => 'YELLOW',
        ]);
        Document::factory()->create([
            'company_id' => $company->id, 'status' => 'parked', 'flag' => 'GREEN',
        ]);

        $response = $this->actingAs($this->accountant)
            ->getJson('/api/accountant/clients');

        $response->assertOk()
            ->assertJsonPath('data.0.queueCounts.red',    1)
            ->assertJsonPath('data.0.queueCounts.yellow', 1)
            ->assertJsonPath('data.0.queueCounts.green',  1);
    }

    public function test_non_parked_documents_not_counted_in_queue(): void
    {
        $company = Company::factory()->create(['accountant_id' => $this->accountant->id]);
        // approved docs should not appear in queue counts
        Document::factory()->create([
            'company_id' => $company->id, 'status' => 'approved', 'flag' => 'GREEN',
        ]);

        $response = $this->actingAs($this->accountant)
            ->getJson('/api/accountant/clients');

        $response->assertOk()
            ->assertJsonPath('data.0.queueCounts.red',    0)
            ->assertJsonPath('data.0.queueCounts.yellow', 0)
            ->assertJsonPath('data.0.queueCounts.green',  0);
    }

    public function test_summary_reflects_all_clients_not_just_current_page(): void
    {
        $company1 = Company::factory()->create(['accountant_id' => $this->accountant->id]);
        $company2 = Company::factory()->create(['accountant_id' => $this->accountant->id]);
        Document::factory()->create([
            'company_id' => $company1->id, 'status' => 'parked', 'flag' => 'RED',
        ]);

        // Sorted latest('id'), company2 (created last) is on page 1; company1 (with RED) is on page 2.
        // Request page 2 — company1 with its RED doc is visible here, but summary must still reflect all clients.
        $response = $this->actingAs($this->accountant)
            ->getJson('/api/accountant/clients?per_page=1&page=2');

        $response->assertOk()
            ->assertJsonPath('summary.needAttention', 1);
    }

    public function test_summary_need_attention_counts_companies_with_red(): void
    {
        $c1 = Company::factory()->create(['accountant_id' => $this->accountant->id]);
        $c2 = Company::factory()->create(['accountant_id' => $this->accountant->id]);
        Document::factory()->create(['company_id' => $c1->id, 'status' => 'parked', 'flag' => 'RED']);
        Document::factory()->create(['company_id' => $c1->id, 'status' => 'parked', 'flag' => 'RED']); // 2 RED on same company

        $response = $this->actingAs($this->accountant)->getJson('/api/accountant/clients');

        $response->assertOk()
            ->assertJsonPath('summary.needAttention', 1)   // 1 company has red, not 2 docs
            ->assertJsonPath('summary.pendingReview',  2);  // 2 total RED+YELLOW docs
    }

    public function test_summary_all_clear_requires_green_and_no_red_yellow(): void
    {
        $c1 = Company::factory()->create(['accountant_id' => $this->accountant->id]);
        $c2 = Company::factory()->create(['accountant_id' => $this->accountant->id]);
        Document::factory()->create(['company_id' => $c1->id, 'status' => 'parked', 'flag' => 'GREEN']);
        // c2 has no parked docs at all — not "all clear" (no green)

        $response = $this->actingAs($this->accountant)->getJson('/api/accountant/clients');

        $response->assertOk()->assertJsonPath('summary.allClear', 1);
    }

    public function test_only_returns_own_clients(): void
    {
        $other = User::factory()->create(['role' => 'accountant']);
        Company::factory()->create(['accountant_id' => $other->id]);
        Company::factory()->create(['accountant_id' => $this->accountant->id]);

        $response = $this->actingAs($this->accountant)->getJson('/api/accountant/clients');

        $response->assertOk()->assertJsonPath('total', 1);
    }
}
