<?php

namespace Tests\Feature;

use App\Jobs\ClassifyWithAI;
use App\Jobs\PrepareDocumentForAI;
use App\Models\Company;
use App\Models\Document;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Queue;
use Tests\TestCase;

class QueueReclassifyTest extends TestCase
{
    use RefreshDatabase;

    private User $accountant;
    private Company $company;
    private Document $document;

    protected function setUp(): void
    {
        parent::setUp();

        $this->accountant = User::factory()->create(['role' => 'accountant']);

        $this->company = Company::factory()->create([
            'accountant_id' => $this->accountant->id,
        ]);

        $this->document = Document::factory()->create([
            'company_id'    => $this->company->id,
            'status'        => 'parked',
            'is_no_receipt' => false,
        ]);
    }

    public function test_reclassify_dispatches_prepare_job_for_receipt_document(): void
    {
        Queue::fake();

        $response = $this->actingAs($this->accountant)
            ->postJson("/api/queue/{$this->document->id}/reclassify");

        $response->assertStatus(202);
        $response->assertJson(['message' => 'Reclassification queued.']);
        Queue::assertPushed(PrepareDocumentForAI::class, fn ($job) => $job->document->id === $this->document->id);
    }

    public function test_reclassify_dispatches_classify_job_for_manual_entry(): void
    {
        Queue::fake();

        $this->document->update(['is_no_receipt' => true]);

        $response = $this->actingAs($this->accountant)
            ->postJson("/api/queue/{$this->document->id}/reclassify");

        $response->assertStatus(202);
        Queue::assertPushed(ClassifyWithAI::class, fn ($job) => $job->document->id === $this->document->id);
    }

    public function test_reclassify_returns_422_when_document_not_parked(): void
    {
        Queue::fake();

        $this->document->update(['status' => 'approved']);

        $response = $this->actingAs($this->accountant)
            ->postJson("/api/queue/{$this->document->id}/reclassify");

        $response->assertStatus(422);
        Queue::assertNothingPushed();
    }

    public function test_reclassify_returns_403_for_unassigned_accountant(): void
    {
        Queue::fake();

        /** @var User $other */
        $other = User::factory()->create(['role' => 'accountant']);

        $response = $this->actingAs($other)
            ->postJson("/api/queue/{$this->document->id}/reclassify");

        $response->assertStatus(403);
        Queue::assertNothingPushed();
    }

    public function test_admin_can_reclassify_any_document(): void
    {
        Queue::fake();

        /** @var User $admin */
        $admin = User::factory()->create(['role' => 'admin']);

        $response = $this->actingAs($admin)
            ->postJson("/api/queue/{$this->document->id}/reclassify");

        $response->assertStatus(202);
        Queue::assertPushed(PrepareDocumentForAI::class, fn ($job) => $job->document->id === $this->document->id);
    }
}
