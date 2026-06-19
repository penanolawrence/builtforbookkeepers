<?php
// backend/tests/Feature/SubtypeTest.php

namespace Tests\Feature;

use App\Models\ChartOfAccountSubtype;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class SubtypeTest extends TestCase
{
    use RefreshDatabase;

    private User $accountant;

    protected function setUp(): void
    {
        parent::setUp();
        $this->accountant = User::factory()->create(['role' => 'accountant']);
    }

    private function makeSubtype(string $name): ChartOfAccountSubtype
    {
        return ChartOfAccountSubtype::create([
            'name'                 => $name,
            'chart_of_account_id' => null,
            'code'                 => null,
            'sort_order'           => 0,
        ]);
    }

    public function test_index_with_no_query_returns_all_user_created_subtypes(): void
    {
        $this->makeSubtype('Internet');
        $this->makeSubtype('Telephone');

        $this->actingAs($this->accountant)
            ->getJson('/api/subtypes')
            ->assertOk()
            ->assertJsonCount(2);
    }

    public function test_search_returns_empty_array_when_query_under_3_chars(): void
    {
        $this->makeSubtype('Internet');

        $this->actingAs($this->accountant)
            ->getJson('/api/subtypes?q=In')
            ->assertOk()
            ->assertExactJson([]);
    }

    public function test_search_returns_matching_subtypes_for_3_or_more_chars(): void
    {
        $this->makeSubtype('Internet');
        $this->makeSubtype('Telephone');
        $this->makeSubtype('Load');

        $this->actingAs($this->accountant)
            ->getJson('/api/subtypes?q=Int')
            ->assertOk()
            ->assertJsonCount(1)
            ->assertJsonFragment(['name' => 'Internet']);
    }

    public function test_search_is_case_insensitive(): void
    {
        $this->makeSubtype('Internet');

        $this->actingAs($this->accountant)
            ->getJson('/api/subtypes?q=int')
            ->assertOk()
            ->assertJsonFragment(['name' => 'Internet']);
    }

    public function test_create_stores_new_subtype_in_chart_of_account_subtypes(): void
    {
        $this->actingAs($this->accountant)
            ->postJson('/api/subtypes', ['name' => 'Internet'])
            ->assertStatus(201)
            ->assertJsonFragment(['name' => 'Internet']);

        $this->assertDatabaseHas('chart_of_account_subtypes', [
            'name'                 => 'Internet',
            'chart_of_account_id' => null,
            'code'                 => null,
        ]);
    }

    public function test_create_returns_existing_subtype_when_name_already_exists(): void
    {
        $existing = $this->makeSubtype('Internet');

        $this->actingAs($this->accountant)
            ->postJson('/api/subtypes', ['name' => 'Internet'])
            ->assertStatus(201)
            ->assertJsonFragment(['id' => $existing->id, 'name' => 'Internet']);

        $this->assertDatabaseCount('chart_of_account_subtypes', 1);
    }

    public function test_routes_require_authentication(): void
    {
        $this->getJson('/api/subtypes?q=int')->assertUnauthorized();
        $this->postJson('/api/subtypes', ['name' => 'test'])->assertUnauthorized();
    }
}
