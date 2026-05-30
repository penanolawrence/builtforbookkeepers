<?php
// backend/tests/Feature/SubtypeTest.php

namespace Tests\Feature;

use App\Models\Subtype;
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

    public function test_search_returns_empty_array_when_query_under_3_chars(): void
    {
        Subtype::factory()->create(['name' => 'Internet']);

        $this->actingAs($this->accountant)
            ->getJson('/api/subtypes?q=In')
            ->assertOk()
            ->assertExactJson([]);
    }

    public function test_search_returns_matching_subtypes_for_3_or_more_chars(): void
    {
        Subtype::factory()->create(['name' => 'Internet']);
        Subtype::factory()->create(['name' => 'Telephone']);
        Subtype::factory()->create(['name' => 'Load']);

        $this->actingAs($this->accountant)
            ->getJson('/api/subtypes?q=Int')
            ->assertOk()
            ->assertJsonCount(1)
            ->assertJsonFragment(['name' => 'Internet']);
    }

    public function test_search_is_case_insensitive(): void
    {
        Subtype::factory()->create(['name' => 'Internet']);

        $this->actingAs($this->accountant)
            ->getJson('/api/subtypes?q=int')
            ->assertOk()
            ->assertJsonFragment(['name' => 'Internet']);
    }

    public function test_create_stores_new_subtype_and_returns_it(): void
    {
        $this->actingAs($this->accountant)
            ->postJson('/api/subtypes', ['name' => 'Internet'])
            ->assertStatus(201)
            ->assertJsonFragment(['name' => 'Internet']);

        $this->assertDatabaseHas('subtypes', ['name' => 'Internet']);
    }

    public function test_create_returns_existing_subtype_when_name_already_exists(): void
    {
        $existing = Subtype::factory()->create(['name' => 'Internet']);

        $this->actingAs($this->accountant)
            ->postJson('/api/subtypes', ['name' => 'Internet'])
            ->assertStatus(201)
            ->assertJsonFragment(['id' => $existing->id, 'name' => 'Internet']);

        $this->assertDatabaseCount('subtypes', 1);
    }

    public function test_routes_require_authentication(): void
    {
        $this->getJson('/api/subtypes?q=int')->assertUnauthorized();
        $this->postJson('/api/subtypes', ['name' => 'test'])->assertUnauthorized();
    }
}
