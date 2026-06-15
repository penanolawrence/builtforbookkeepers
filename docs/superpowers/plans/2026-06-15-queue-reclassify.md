# Queue Reclassify Button Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a "↻ Re-run AI" button to the QueueReviewModal that re-dispatches the AI classification pipeline for a parked document, resetting all extracted fields.

**Architecture:** New `POST /queue/{id}/reclassify` endpoint dispatches `PrepareDocumentForAI` (for receipt documents) or `ClassifyWithAI` directly (for manual entries). The frontend button calls this endpoint, shows a brief loading state, fires a toast, and closes the modal. The document remains `parked` and visible in the queue while the job runs.

**Tech Stack:** Laravel 11 (PHP), Next.js 14 (TypeScript), TanStack Query, shadcn/ui, Tailwind CSS.

---

## File Map

| File | Change |
|------|--------|
| `backend/routes/api.php` | Add `POST /queue/{id}/reclassify` route |
| `backend/app/Http/Controllers/QueueController.php` | Add `reclassify()` method |
| `backend/tests/Feature/QueueReclassifyTest.php` | Create — feature tests for the new endpoint |
| `frontend/src/lib/api/queue.ts` | Add `reclassifyItem()` function |
| `frontend/src/components/queue/QueueReviewModal.tsx` | Add `reclassifying` state + button in header |

---

## Task 1: Backend — reclassify endpoint

**Files:**
- Modify: `backend/routes/api.php`
- Modify: `backend/app/Http/Controllers/QueueController.php`

- [ ] **Step 1: Add the route**

In `backend/routes/api.php`, after the `reject` route (line ~92), add:

```php
Route::post('/queue/{id}/reclassify', [QueueController::class, 'reclassify']);
```

The surrounding block already looks like this — add the new line right after `/reject`:
```php
Route::post('/queue/{id}/approve',  [QueueController::class, 'approve']);
Route::post('/queue/{id}/return',   [QueueController::class, 'return']);
Route::post('/queue/{id}/reject',   [QueueController::class, 'reject']);
Route::post('/queue/{id}/reclassify', [QueueController::class, 'reclassify']); // add this
Route::post('/queue/batch-approve', [QueueController::class, 'batchApprove']);
```

- [ ] **Step 2: Add the controller method**

In `backend/app/Http/Controllers/QueueController.php`, the top of the file already imports `ClassifyWithAI` and `PrepareDocumentForAI` via `DocumentController` — but `QueueController` does not import them. Add these two use statements at the top with the other imports:

```php
use App\Jobs\ClassifyWithAI;
use App\Jobs\PrepareDocumentForAI;
```

Then add the `reclassify()` method to `QueueController`. Place it after the `reject()` method and before `batchApprove()`:

```php
public function reclassify(string $id): JsonResponse
{
    $document = Document::with('company')->findOrFail($id);
    $user     = auth()->user();

    if ($document->status !== 'parked') {
        return response()->json(['message' => 'Document is not in the queue.'], 422);
    }

    if ($user->role === 'accountant' && $document->company->accountant_id !== $user->id) {
        return response()->json(['message' => 'Forbidden.'], 403);
    }

    if ($document->is_no_receipt) {
        ClassifyWithAI::dispatch($document, null);
    } else {
        PrepareDocumentForAI::dispatch($document);
    }

    return response()->json(['message' => 'Reclassification queued.'], 202);
}
```

- [ ] **Step 3: Verify the app boots**

```bash
cd backend && php artisan route:list --path=queue
```

Expected output includes a line for `POST api/queue/{id}/reclassify`.

---

## Task 2: Backend — feature tests

**Files:**
- Create: `backend/tests/Feature/QueueReclassifyTest.php`

- [ ] **Step 1: Create the test file**

```php
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

        $other = User::factory()->create(['role' => 'accountant']);

        $response = $this->actingAs($other)
            ->postJson("/api/queue/{$this->document->id}/reclassify");

        $response->assertStatus(403);
        Queue::assertNothingPushed();
    }

    public function test_admin_can_reclassify_any_document(): void
    {
        Queue::fake();

        $admin = User::factory()->create(['role' => 'admin']);

        $response = $this->actingAs($admin)
            ->postJson("/api/queue/{$this->document->id}/reclassify");

        $response->assertStatus(202);
        Queue::assertPushed(PrepareDocumentForAI::class);
    }
}
```

- [ ] **Step 2: Run the tests — expect them to fail (endpoint not fully wired yet if Task 1 isn't done, otherwise they should pass)**

```bash
cd backend && php artisan test tests/Feature/QueueReclassifyTest.php --verbose
```

Expected: All 5 tests pass. If any fail, check the route is registered and the method exists.

- [ ] **Step 3: Commit**

```bash
git add backend/routes/api.php \
        backend/app/Http/Controllers/QueueController.php \
        backend/tests/Feature/QueueReclassifyTest.php
git commit -m "feat: add POST /queue/{id}/reclassify endpoint"
```

---

## Task 3: Frontend — API function + modal button

**Files:**
- Modify: `frontend/src/lib/api/queue.ts`
- Modify: `frontend/src/components/queue/QueueReviewModal.tsx`

- [ ] **Step 1: Add `reclassifyItem` to the API module**

In `frontend/src/lib/api/queue.ts`, add after `rejectItem`:

```ts
export async function reclassifyItem(id: string): Promise<void> {
  await api.post(`/queue/${id}/reclassify`)
}
```

- [ ] **Step 2: Import `reclassifyItem` in the modal**

In `frontend/src/components/queue/QueueReviewModal.tsx`, update the import from `@/lib/api/queue`:

```ts
import { getQueueItem, approveItem, returnItem, rejectItem, reclassifyItem } from '@/lib/api/queue'
```

- [ ] **Step 3: Add `reclassifying` state**

In `QueueReviewModal`, alongside the other state declarations (around line 225), add:

```ts
const [reclassifying, setReclassifying] = useState(false)
```

- [ ] **Step 4: Add the `handleReclassify` handler**

Add this function after `handleReject` and before `handleReturn` (or anywhere in the component body before the return):

```ts
const handleReclassify = async () => {
  setReclassifying(true)
  try {
    await reclassifyItem(documentId)
    toast({ title: 'Reclassifying… reopen this item once the AI finishes.' })
    onClose()
  } catch {
    toast({ title: 'Failed to queue reclassification. Please try again.', variant: 'destructive' })
    setReclassifying(false)
  }
}
```

- [ ] **Step 5: Update the modal header to include the button**

The current header (around line 337) is:

```tsx
<div className="px-6 pt-5 pb-4 pr-10 border-b border-t-line shrink-0 flex items-center justify-between">
  <div>
    <div className="text-[15px] font-bold text-t-ink">
      {item?.refNumber ?? `#${documentId.slice(0, 8)}`}
    </div>
    <div className="text-[11px] text-t-muted mt-0.5">{item?.clientName}</div>
  </div>
  {item?.flag && (
    <span className={`inline-flex items-center text-[10px] font-semibold px-2 py-0.5 rounded-full ${flagCls[item.flag] ?? ''}`}>
      {item.flag}
    </span>
  )}
</div>
```

Replace it with:

```tsx
<div className="px-6 pt-5 pb-4 pr-10 border-b border-t-line shrink-0 flex items-center justify-between">
  <div>
    <div className="text-[15px] font-bold text-t-ink">
      {item?.refNumber ?? `#${documentId.slice(0, 8)}`}
    </div>
    <div className="text-[11px] text-t-muted mt-0.5">{item?.clientName}</div>
  </div>
  <div className="flex items-center gap-3">
    <button
      onClick={handleReclassify}
      disabled={reclassifying || isLoading}
      className="border border-t-line text-t-muted hover:text-t-ink hover:border-t-ink text-[11px] px-2.5 py-1 rounded-md transition-colors disabled:opacity-50"
    >
      {reclassifying ? 'Queuing…' : '↻ Re-run AI'}
    </button>
    {item?.flag && (
      <span className={`inline-flex items-center text-[10px] font-semibold px-2 py-0.5 rounded-full ${flagCls[item.flag] ?? ''}`}>
        {item.flag}
      </span>
    )}
  </div>
</div>
```

- [ ] **Step 6: Verify TypeScript compiles**

```bash
cd frontend && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 7: Commit**

```bash
git add frontend/src/lib/api/queue.ts \
        frontend/src/components/queue/QueueReviewModal.tsx
git commit -m "feat: add Re-run AI button to QueueReviewModal"
```
