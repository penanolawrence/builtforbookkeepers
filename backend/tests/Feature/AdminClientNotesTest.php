<?php

namespace Tests\Feature;

use App\Models\Company;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AdminClientNotesTest extends TestCase
{
    use RefreshDatabase;

    private User $admin;
    private Company $company;

    protected function setUp(): void
    {
        parent::setUp();
        $this->admin   = User::factory()->create(['role' => 'admin']);
        $this->company = Company::factory()->create();
    }

    public function test_admin_get_notes_returns_null_when_empty(): void
    {
        $this->actingAs($this->admin)
            ->getJson("/api/admin/clients/{$this->company->id}/notes")
            ->assertOk()
            ->assertJson(['notes' => null]);
    }

    public function test_admin_get_notes_returns_existing_notes(): void
    {
        $this->company->update(['accountant_notes' => 'Wholesale rice trader.']);

        $this->actingAs($this->admin)
            ->getJson("/api/admin/clients/{$this->company->id}/notes")
            ->assertOk()
            ->assertJson(['notes' => 'Wholesale rice trader.']);
    }

    public function test_admin_patch_notes_saves_text(): void
    {
        $this->actingAs($this->admin)
            ->patchJson("/api/admin/clients/{$this->company->id}/notes", [
                'notes' => 'Construction firm, lots of contractor EWT.',
            ])
            ->assertOk()
            ->assertJson(['message' => 'Saved.']);

        $this->assertDatabaseHas('companies', [
            'id'               => $this->company->id,
            'accountant_notes' => 'Construction firm, lots of contractor EWT.',
        ]);
    }

    public function test_admin_patch_notes_rejects_text_over_5000_chars(): void
    {
        $this->actingAs($this->admin)
            ->patchJson("/api/admin/clients/{$this->company->id}/notes", [
                'notes' => str_repeat('x', 5001),
            ])
            ->assertUnprocessable();
    }

    public function test_non_admin_cannot_access_admin_notes_route(): void
    {
        $accountant = User::factory()->create(['role' => 'accountant']);

        $this->actingAs($accountant)
            ->getJson("/api/admin/clients/{$this->company->id}/notes")
            ->assertForbidden();
    }
}
