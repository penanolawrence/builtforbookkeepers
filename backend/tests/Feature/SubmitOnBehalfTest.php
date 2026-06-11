<?php

namespace Tests\Feature;

use App\Models\Company;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Queue;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class SubmitOnBehalfTest extends TestCase
{
    use RefreshDatabase;

    private function makeAccountant(): User
    {
        return User::factory()->create(['role' => 'accountant']);
    }

    private function makeClientCompany(string $accountantId): Company
    {
        return Company::factory()->create(['accountant_id' => $accountantId]);
    }

    private function makeAdmin(): User
    {
        return User::factory()->create(['role' => 'admin']);
    }

    public function test_admin_can_upload_for_any_client(): void
    {
        Queue::fake();
        Storage::fake('s3');

        $accountant = $this->makeAccountant();
        $company    = $this->makeClientCompany($accountant->id);
        $admin      = $this->makeAdmin();

        $response = $this->actingAs($admin)->postJson('/api/documents', [
            'file'          => UploadedFile::fake()->image('receipt.jpg'),
            'declared_type' => 'income',
            'client_id'     => $company->id,
        ]);

        $response->assertStatus(201);
        $this->assertDatabaseHas('documents', ['company_id' => $company->id, 'uploaded_by' => $admin->id]);
    }

    public function test_accountant_can_upload_for_assigned_client(): void
    {
        Queue::fake();
        Storage::fake('s3');

        $accountant = $this->makeAccountant();
        $company    = $this->makeClientCompany($accountant->id);

        $response = $this->actingAs($accountant)->postJson('/api/documents', [
            'file'          => UploadedFile::fake()->image('receipt.jpg'),
            'declared_type' => 'expense',
            'client_id'     => $company->id,
        ]);

        $response->assertStatus(201);
        $this->assertDatabaseHas('documents', ['company_id' => $company->id, 'uploaded_by' => $accountant->id]);
    }

    public function test_accountant_cannot_upload_for_unassigned_client(): void
    {
        Queue::fake();
        Storage::fake('s3');

        $accountant      = $this->makeAccountant();
        $otherAccountant = $this->makeAccountant();
        $company         = $this->makeClientCompany($otherAccountant->id);

        $response = $this->actingAs($accountant)->postJson('/api/documents', [
            'file'          => UploadedFile::fake()->image('receipt.jpg'),
            'declared_type' => 'income',
            'client_id'     => $company->id,
        ]);

        $response->assertStatus(403);
    }

    public function test_upload_without_client_id_uses_own_company(): void
    {
        Queue::fake();
        Storage::fake('s3');

        $company = Company::factory()->create();
        $user    = User::factory()->create(['company_id' => $company->id, 'role' => 'client']);

        $response = $this->actingAs($user)->postJson('/api/documents', [
            'file'          => UploadedFile::fake()->image('receipt.jpg'),
            'declared_type' => 'income',
        ]);

        $response->assertStatus(201);
        $this->assertDatabaseHas('documents', ['company_id' => $company->id]);
    }

    public function test_admin_can_create_manual_entry_for_any_client(): void
    {
        Queue::fake();

        $accountant = $this->makeAccountant();
        $company    = $this->makeClientCompany($accountant->id);
        $admin      = $this->makeAdmin();

        $response = $this->actingAs($admin)->postJson('/api/documents/manual', [
            'declared_type'  => 'expense',
            'date'           => '2026-06-11',
            'payment_method' => 'Cash',
            'lines'          => [['description' => 'Office supplies', 'amount' => 500]],
            'client_id'      => $company->id,
        ]);

        $response->assertStatus(201);
        $this->assertDatabaseHas('documents', ['company_id' => $company->id, 'uploaded_by' => $admin->id]);
    }

    public function test_accountant_can_create_manual_entry_for_assigned_client(): void
    {
        Queue::fake();

        $accountant = $this->makeAccountant();
        $company    = $this->makeClientCompany($accountant->id);

        $response = $this->actingAs($accountant)->postJson('/api/documents/manual', [
            'declared_type'  => 'income',
            'date'           => '2026-06-11',
            'payment_method' => 'Cash',
            'lines'          => [['description' => 'Service fee', 'amount' => 1000]],
            'client_id'      => $company->id,
        ]);

        $response->assertStatus(201);
        $this->assertDatabaseHas('documents', ['company_id' => $company->id, 'uploaded_by' => $accountant->id]);
    }

    public function test_accountant_cannot_create_manual_entry_for_unassigned_client(): void
    {
        Queue::fake();

        $accountant      = $this->makeAccountant();
        $otherAccountant = $this->makeAccountant();
        $company         = $this->makeClientCompany($otherAccountant->id);

        $response = $this->actingAs($accountant)->postJson('/api/documents/manual', [
            'declared_type'  => 'income',
            'date'           => '2026-06-11',
            'payment_method' => 'Cash',
            'lines'          => [['description' => 'Service fee', 'amount' => 1000]],
            'client_id'      => $company->id,
        ]);

        $response->assertStatus(403);
    }
}
