<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class TutorialFlagTest extends TestCase
{
    use RefreshDatabase;

    public function test_me_includes_has_seen_tutorial_false_by_default(): void
    {
        $accountant = User::factory()->create(['role' => 'accountant']);

        $this->actingAs($accountant)
            ->getJson('/api/auth/me')
            ->assertOk()
            ->assertJsonFragment(['hasSeenTutorial' => false]);
    }

    public function test_login_response_includes_has_seen_tutorial(): void
    {
        $accountant = User::factory()->create([
            'role' => 'accountant',
            'email' => 'acct@example.com',
        ]);

        $this->postJson('/api/auth/login', [
            'identifier' => 'acct@example.com',
            'password' => 'password',
        ])
            ->assertOk()
            ->assertJsonFragment(['hasSeenTutorial' => false]);
    }
}
