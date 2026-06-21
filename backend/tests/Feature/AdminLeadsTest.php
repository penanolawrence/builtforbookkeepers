<?php

namespace Tests\Feature;

use App\Models\Lead;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AdminLeadsTest extends TestCase
{
    use RefreshDatabase;

    private User $admin;

    protected function setUp(): void
    {
        parent::setUp();
        $this->admin = User::factory()->create(['role' => 'admin']);
    }

    public function test_index_returns_paginated_leads(): void
    {
        Lead::factory()->count(15)->create();

        $this->actingAs($this->admin)
            ->getJson('/api/admin/leads')
            ->assertOk()
            ->assertJsonStructure([
                'data' => [['id', 'contact', 'message', 'is_read', 'created_at']],
                'pagination' => ['currentPage', 'perPage', 'total'],
            ])
            ->assertJsonPath('pagination.perPage', 10)
            ->assertJsonPath('pagination.total', 15)
            ->assertJsonCount(10, 'data');
    }

    public function test_index_filter_unread_returns_only_unread(): void
    {
        Lead::factory()->count(3)->create(['is_read' => false]);
        Lead::factory()->count(2)->create(['is_read' => true]);

        $response = $this->actingAs($this->admin)
            ->getJson('/api/admin/leads?filter=unread')
            ->assertOk();

        $this->assertCount(3, $response->json('data'));
        foreach ($response->json('data') as $lead) {
            $this->assertFalse($lead['is_read']);
        }
    }

    public function test_index_filter_read_returns_only_read(): void
    {
        Lead::factory()->count(3)->create(['is_read' => false]);
        Lead::factory()->count(2)->create(['is_read' => true]);

        $response = $this->actingAs($this->admin)
            ->getJson('/api/admin/leads?filter=read')
            ->assertOk();

        $this->assertCount(2, $response->json('data'));
        foreach ($response->json('data') as $lead) {
            $this->assertTrue($lead['is_read']);
        }
    }

    public function test_index_unread_leads_appear_before_read(): void
    {
        Lead::factory()->create(['is_read' => true]);
        Lead::factory()->create(['is_read' => false]);

        $data = $this->actingAs($this->admin)
            ->getJson('/api/admin/leads')
            ->assertOk()
            ->json('data');

        $this->assertFalse($data[0]['is_read']);
        $this->assertTrue($data[1]['is_read']);
    }

    public function test_toggle_read_marks_unread_lead_as_read(): void
    {
        $lead = Lead::factory()->create(['is_read' => false]);

        $this->actingAs($this->admin)
            ->patchJson("/api/admin/leads/{$lead->id}/toggle-read")
            ->assertOk()
            ->assertJsonPath('is_read', true);

        $this->assertDatabaseHas('leads', ['id' => $lead->id, 'is_read' => true]);
    }

    public function test_toggle_read_marks_read_lead_as_unread(): void
    {
        $lead = Lead::factory()->create(['is_read' => true]);

        $this->actingAs($this->admin)
            ->patchJson("/api/admin/leads/{$lead->id}/toggle-read")
            ->assertOk()
            ->assertJsonPath('is_read', false);

        $this->assertDatabaseHas('leads', ['id' => $lead->id, 'is_read' => false]);
    }

    public function test_non_admin_cannot_list_leads(): void
    {
        $accountant = User::factory()->create(['role' => 'accountant']);

        $this->actingAs($accountant)
            ->getJson('/api/admin/leads')
            ->assertForbidden();
    }

    public function test_non_admin_cannot_toggle_lead(): void
    {
        $lead = Lead::factory()->create();
        $accountant = User::factory()->create(['role' => 'accountant']);

        $this->actingAs($accountant)
            ->patchJson("/api/admin/leads/{$lead->id}/toggle-read")
            ->assertForbidden();
    }
}
