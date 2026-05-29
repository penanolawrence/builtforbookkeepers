<?php

namespace Tests\Feature;

use App\Models\Company;
use App\Models\Document;
use App\Models\User;
use Illuminate\Contracts\Filesystem\Filesystem;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class GetSignedUrlTest extends TestCase
{
    use RefreshDatabase;

    private User $client;
    private Company $company;

    protected function setUp(): void
    {
        parent::setUp();

        $this->company = Company::factory()->create();
        $this->client  = User::factory()->create([
            'role'       => 'client',
            'company_id' => $this->company->id,
        ]);
    }

    public function test_url_rewrites_internal_endpoint_to_public_url(): void
    {
        config(['filesystems.disks.s3.endpoint'   => 'http://minio:9000']);
        config(['filesystems.disks.s3.public_url' => 'http://localhost:9000']);

        $mockDisk = \Mockery::mock(Filesystem::class);
        $mockDisk->shouldReceive('temporaryUrl')
            ->once()
            ->andReturn('http://minio:9000/sofia-documents/documents/test.png?X-Amz-Signature=abc');

        Storage::shouldReceive('disk')->with('s3')->andReturn($mockDisk);

        $document = Document::factory()->create([
            'company_id'    => $this->company->id,
            'storage_path'  => 'documents/test.png',
            'is_no_receipt' => false,
        ]);

        $response = $this->actingAs($this->client)
            ->getJson("/api/documents/{$document->id}/image");

        $response->assertOk();
        $this->assertStringContainsString('localhost:9000', $response->json('url'));
        $this->assertStringNotContainsString('minio:9000', $response->json('url'));
        $response->assertJsonStructure(['url', 'expiresAt']);
    }

    public function test_url_is_unchanged_when_no_public_url_configured(): void
    {
        config(['filesystems.disks.s3.endpoint'   => null]);
        config(['filesystems.disks.s3.public_url' => null]);

        $rawUrl = 'https://s3.amazonaws.com/sofia-documents/documents/test.png?X-Amz-Signature=abc';

        $mockDisk = \Mockery::mock(Filesystem::class);
        $mockDisk->shouldReceive('temporaryUrl')
            ->once()
            ->andReturn($rawUrl);

        Storage::shouldReceive('disk')->with('s3')->andReturn($mockDisk);

        $document = Document::factory()->create([
            'company_id'    => $this->company->id,
            'storage_path'  => 'documents/test.png',
            'is_no_receipt' => false,
        ]);

        $response = $this->actingAs($this->client)
            ->getJson("/api/documents/{$document->id}/image");

        $response->assertOk();
        $this->assertSame($rawUrl, $response->json('url'));
    }

    public function test_returns_null_url_for_no_receipt_document(): void
    {
        $document = Document::factory()->create([
            'company_id'    => $this->company->id,
            'is_no_receipt' => true,
        ]);

        $response = $this->actingAs($this->client)
            ->getJson("/api/documents/{$document->id}/image");

        $response->assertOk();
        $response->assertJson(['url' => null]);
    }
}
