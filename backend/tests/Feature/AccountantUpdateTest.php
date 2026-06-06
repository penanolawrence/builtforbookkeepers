<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AccountantUpdateTest extends TestCase
{
    use RefreshDatabase;

    private User $admin;
    private User $accountant;

    protected function setUp(): void
    {
        parent::setUp();
        $this->admin = User::factory()->create(['role' => 'admin']);
        $this->accountant = User::factory()->create([
            'role'   => 'accountant',
            'name'   => 'Old Name',
            'email'  => 'old@example.com',
            'mobile' => null,
        ]);
    }

    public function test_admin_can_update_accountant(): void
    {
        $response = $this->actingAs($this->admin)
            ->putJson("/api/admin/accountants/{$this->accountant->id}", [
                'name'   => 'New Name',
                'email'  => 'new@example.com',
                'mobile' => '+63 917 555 1234',
            ]);

        $response->assertOk()
            ->assertJsonFragment([
                'name'   => 'New Name',
                'email'  => 'new@example.com',
                'mobile' => '+63 917 555 1234',
            ]);

        $this->assertDatabaseHas('users', [
            'id'     => $this->accountant->id,
            'name'   => 'New Name',
            'email'  => 'new@example.com',
            'mobile' => '+63 917 555 1234',
        ]);
    }

    public function test_can_save_same_email_as_own(): void
    {
        $response = $this->actingAs($this->admin)
            ->putJson("/api/admin/accountants/{$this->accountant->id}", [
                'name'  => 'New Name',
                'email' => 'old@example.com',
            ]);

        $response->assertOk();
    }

    public function test_duplicate_email_of_another_user_fails(): void
    {
        User::factory()->create(['email' => 'taken@example.com']);

        $response = $this->actingAs($this->admin)
            ->putJson("/api/admin/accountants/{$this->accountant->id}", [
                'name'  => 'New Name',
                'email' => 'taken@example.com',
            ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['email']);
    }

    public function test_mobile_is_optional(): void
    {
        $response = $this->actingAs($this->admin)
            ->putJson("/api/admin/accountants/{$this->accountant->id}", [
                'name'  => 'New Name',
                'email' => 'new@example.com',
            ]);

        $response->assertOk();
    }

    public function test_name_is_required(): void
    {
        $response = $this->actingAs($this->admin)
            ->putJson("/api/admin/accountants/{$this->accountant->id}", [
                'email' => 'new@example.com',
            ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['name']);
    }
}
