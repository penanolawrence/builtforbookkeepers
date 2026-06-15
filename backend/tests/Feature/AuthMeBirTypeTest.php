<?php

namespace Tests\Feature;

use App\Models\Company;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AuthMeBirTypeTest extends TestCase
{
    use RefreshDatabase;

    public function test_me_includes_bir_type_for_client(): void
    {
        $company = Company::factory()->create(['bir_type' => 'non_vat']);
        $client  = User::factory()->create([
            'role'       => 'client',
            'company_id' => $company->id,
        ]);

        $this->actingAs($client)
            ->getJson('/api/auth/me')
            ->assertOk()
            ->assertJsonFragment(['birType' => 'non_vat']);
    }

    public function test_me_does_not_include_bir_type_for_accountant(): void
    {
        $accountant = User::factory()->create(['role' => 'accountant']);

        $this->actingAs($accountant)
            ->getJson('/api/auth/me')
            ->assertOk()
            ->assertJsonMissingPath('birType');
    }
}
