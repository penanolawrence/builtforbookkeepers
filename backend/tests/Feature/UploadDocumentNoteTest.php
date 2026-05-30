<?php

namespace Tests\Feature;

use App\Models\Company;
use App\Models\Document;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Queue;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class UploadDocumentNoteTest extends TestCase
{
    use RefreshDatabase;

    public function test_note_is_stored_when_provided_on_upload(): void
    {
        Queue::fake();
        Storage::fake('s3');

        $company = Company::factory()->create();
        $user    = User::factory()->create([
            'company_id' => $company->id,
            'role'       => 'client',
        ]);

        $response = $this->actingAs($user)->postJson('/api/documents', [
            'file'          => UploadedFile::fake()->image('receipt.jpg', 100, 100),
            'declared_type' => 'income',
            'note'          => 'Monthly electricity bill from Meralco for May 2026, includes VAT',
        ]);

        $response->assertStatus(201);
        $this->assertDatabaseHas('documents', [
            'company_id' => $company->id,
            'note'       => 'Monthly electricity bill from Meralco for May 2026, includes VAT',
        ]);
    }

    public function test_note_is_null_when_not_provided(): void
    {
        Queue::fake();
        Storage::fake('s3');

        $company = Company::factory()->create();
        $user    = User::factory()->create([
            'company_id' => $company->id,
            'role'       => 'client',
        ]);

        $response = $this->actingAs($user)->postJson('/api/documents', [
            'file'          => UploadedFile::fake()->image('receipt.jpg', 100, 100),
            'declared_type' => 'income',
        ]);

        $response->assertStatus(201);
        $documentId = $response->json('documentId');
        $this->assertNull(Document::find($documentId)->note);
    }
}
