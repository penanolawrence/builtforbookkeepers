<?php

namespace Tests\Feature;

use App\Models\Company;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ClientBirTypeFilterTest extends TestCase
{
    use RefreshDatabase;

    public function test_accountant_can_filter_clients_by_vat(): void
    {
        $accountant = User::factory()->create(['role' => 'accountant']);
        Company::factory()->create(['accountant_id' => $accountant->id, 'bir_type' => 'vat',     'name' => 'VAT Co']);
        Company::factory()->create(['accountant_id' => $accountant->id, 'bir_type' => 'non_vat', 'name' => 'NonVAT Co']);

        $response = $this->actingAs($accountant)
            ->getJson('/api/accountant/clients?bir_type=vat')
            ->assertOk();

        $names = collect($response->json('data'))->pluck('name');
        $this->assertContains('VAT Co',       $names);
        $this->assertNotContains('NonVAT Co', $names);
    }

    public function test_accountant_can_filter_clients_by_non_vat(): void
    {
        $accountant = User::factory()->create(['role' => 'accountant']);
        Company::factory()->create(['accountant_id' => $accountant->id, 'bir_type' => 'vat',     'name' => 'VAT Co']);
        Company::factory()->create(['accountant_id' => $accountant->id, 'bir_type' => 'non_vat', 'name' => 'NonVAT Co']);

        $response = $this->actingAs($accountant)
            ->getJson('/api/accountant/clients?bir_type=non_vat')
            ->assertOk();

        $names = collect($response->json('data'))->pluck('name');
        $this->assertNotContains('VAT Co',    $names);
        $this->assertContains('NonVAT Co',    $names);
    }

    public function test_admin_can_filter_clients_by_vat(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);
        Company::factory()->create(['bir_type' => 'vat',     'name' => 'VAT Co']);
        Company::factory()->create(['bir_type' => 'non_vat', 'name' => 'NonVAT Co']);

        $response = $this->actingAs($admin)
            ->getJson('/api/admin/clients?birType=vat')
            ->assertOk();

        $names = collect($response->json('data'))->pluck('name');
        $this->assertContains('VAT Co',       $names);
        $this->assertNotContains('NonVAT Co', $names);
    }

    public function test_admin_can_filter_clients_by_non_vat(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);
        Company::factory()->create(['bir_type' => 'vat',     'name' => 'VAT Co']);
        Company::factory()->create(['bir_type' => 'non_vat', 'name' => 'NonVAT Co']);

        $response = $this->actingAs($admin)
            ->getJson('/api/admin/clients?birType=non_vat')
            ->assertOk();

        $names = collect($response->json('data'))->pluck('name');
        $this->assertNotContains('VAT Co',    $names);
        $this->assertContains('NonVAT Co',    $names);
    }
}
