<?php

namespace Tests\Feature;

use App\Models\Company;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AccountantClientNotesTest extends TestCase
{
    use RefreshDatabase;

    private User $accountant;
    private Company $company;

    protected function setUp(): void
    {
        parent::setUp();
        $this->accountant = User::factory()->create(['role' => 'accountant']);
        $this->company    = Company::factory()->create(['accountant_id' => $this->accountant->id]);
    }

    public function test_get_notes_returns_null_when_empty(): void
    {
        $this->actingAs($this->accountant)
            ->getJson("/api/accountant/clients/{$this->company->id}/notes")
            ->assertOk()
            ->assertJson(['notes' => null]);
    }

    public function test_get_notes_returns_existing_notes(): void
    {
        $this->company->update(['accountant_notes' => 'Rice trader, main expense is supplier payments.']);

        $this->actingAs($this->accountant)
            ->getJson("/api/accountant/clients/{$this->company->id}/notes")
            ->assertOk()
            ->assertJson(['notes' => 'Rice trader, main expense is supplier payments.']);
    }

    public function test_patch_notes_saves_text(): void
    {
        $this->actingAs($this->accountant)
            ->patchJson("/api/accountant/clients/{$this->company->id}/notes", [
                'notes' => 'Sari-sari store, mostly cash income.',
            ])
            ->assertOk()
            ->assertJson(['message' => 'Saved.']);

        $this->assertDatabaseHas('companies', [
            'id'               => $this->company->id,
            'accountant_notes' => 'Sari-sari store, mostly cash income.',
        ]);
    }

    public function test_patch_notes_accepts_null(): void
    {
        $this->company->update(['accountant_notes' => 'Old notes']);

        $this->actingAs($this->accountant)
            ->patchJson("/api/accountant/clients/{$this->company->id}/notes", ['notes' => null])
            ->assertOk();

        $this->assertDatabaseHas('companies', [
            'id'               => $this->company->id,
            'accountant_notes' => null,
        ]);
    }

    public function test_patch_notes_rejects_text_over_5000_chars(): void
    {
        $this->actingAs($this->accountant)
            ->patchJson("/api/accountant/clients/{$this->company->id}/notes", [
                'notes' => str_repeat('a', 5001),
            ])
            ->assertUnprocessable();
    }

    public function test_get_notes_returns_403_for_unassigned_company(): void
    {
        $other = Company::factory()->create();

        $this->actingAs($this->accountant)
            ->getJson("/api/accountant/clients/{$other->id}/notes")
            ->assertForbidden();
    }

    public function test_patch_notes_returns_403_for_unassigned_company(): void
    {
        $other = Company::factory()->create();

        $this->actingAs($this->accountant)
            ->patchJson("/api/accountant/clients/{$other->id}/notes", ['notes' => 'x'])
            ->assertForbidden();
    }
}
