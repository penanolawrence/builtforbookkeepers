# Cancel Document Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let clients withdraw (cancel) a document they submitted, adding a `CANCELLED` terminal status to the system.

**Architecture:** New DB migration adds `cancelled` to the documents status CHECK constraint. A single new controller method + route handles the cancel action (client-owned documents in PROCESSING/PARKED/RETURNED only). The frontend modal gains a confirmation dialog and Cancel button per applicable status, while `StatusBadge` and `DocumentsTable` are updated to display the new status.

**Tech Stack:** Laravel 11 (PHP), PostgreSQL (CHECK constraint for status enum), Next.js 14 App Router, TypeScript, shadcn/ui, TanStack Query

---

## File Map

| File | Change |
|---|---|
| `backend/database/migrations/2026_05_30_000023_add_cancelled_status_to_documents_table.php` | CREATE — adds `cancelled` to the documents status CHECK constraint |
| `backend/app/Http/Controllers/DocumentController.php` | MODIFY — add `cancel()` method |
| `backend/routes/api.php` | MODIFY — add `POST /documents/{id}/cancel` route |
| `backend/tests/Feature/CancelDocumentTest.php` | CREATE — feature tests for the cancel endpoint |
| `frontend/src/types/document.ts` | MODIFY — add `'CANCELLED'` to `DocumentStatus` |
| `frontend/src/lib/api/documents.ts` | MODIFY — add `cancelDocument()` |
| `frontend/src/components/documents/StatusBadge.tsx` | MODIFY — add `CANCELLED` entry |
| `frontend/src/components/documents/DocumentsTable.tsx` | MODIFY — add `CANCELLED` to STATUS_BADGE and noteText |
| `frontend/src/components/documents/DocumentDetailModal.tsx` | MODIFY — Cancel button, confirmation dialog, CANCELLED state |
| `frontend/src/app/client/documents/page.tsx` | MODIFY — `handleCancel` handler, pass `onCancel` prop |

---

## Task 1: Backend migration — add `cancelled` status

**Files:**
- Create: `backend/database/migrations/2026_05_30_000023_add_cancelled_status_to_documents_table.php`

- [ ] **Step 1: Create the migration**

```php
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        if (DB::getDriverName() !== 'sqlite') {
            DB::statement("ALTER TABLE documents DROP CONSTRAINT IF EXISTS documents_status_check");
            DB::statement("ALTER TABLE documents ADD CONSTRAINT documents_status_check CHECK (status IN ('processing','parked','posted','failed','returned','rejected','approved','cancelled'))");
        }
    }

    public function down(): void
    {
        if (DB::getDriverName() !== 'sqlite') {
            DB::statement("ALTER TABLE documents DROP CONSTRAINT IF EXISTS documents_status_check");
            DB::statement("ALTER TABLE documents ADD CONSTRAINT documents_status_check CHECK (status IN ('processing','parked','posted','failed','returned','rejected','approved'))");
        }
    }
};
```

- [ ] **Step 2: Run the migration**

```bash
docker compose exec backend php artisan migrate
```

Expected output includes: `2026_05_30_000023_add_cancelled_status_to_documents_table ........ running`

- [ ] **Step 3: Commit**

```bash
git add backend/database/migrations/2026_05_30_000023_add_cancelled_status_to_documents_table.php
git commit -m "feat: add cancelled to documents status constraint"
```

---

## Task 2: Backend cancel endpoint + tests

**Files:**
- Create: `backend/tests/Feature/CancelDocumentTest.php`
- Modify: `backend/app/Http/Controllers/DocumentController.php`
- Modify: `backend/routes/api.php`

- [ ] **Step 1: Write the failing tests**

Create `backend/tests/Feature/CancelDocumentTest.php`:

```php
<?php

namespace Tests\Feature;

use App\Models\Company;
use App\Models\Document;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class CancelDocumentTest extends TestCase
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

    public function test_client_can_cancel_processing_document(): void
    {
        $doc = Document::factory()->create([
            'company_id' => $this->company->id,
            'status'     => 'processing',
        ]);

        $response = $this->actingAs($this->client)
            ->postJson("/api/documents/{$doc->id}/cancel");

        $response->assertOk();
        $this->assertDatabaseHas('documents', [
            'id'     => $doc->id,
            'status' => 'cancelled',
        ]);
    }

    public function test_client_can_cancel_parked_document(): void
    {
        $doc = Document::factory()->create([
            'company_id' => $this->company->id,
            'status'     => 'parked',
        ]);

        $response = $this->actingAs($this->client)
            ->postJson("/api/documents/{$doc->id}/cancel");

        $response->assertOk();
        $this->assertDatabaseHas('documents', [
            'id'     => $doc->id,
            'status' => 'cancelled',
        ]);
    }

    public function test_client_can_cancel_returned_document(): void
    {
        $doc = Document::factory()->create([
            'company_id' => $this->company->id,
            'status'     => 'returned',
        ]);

        $response = $this->actingAs($this->client)
            ->postJson("/api/documents/{$doc->id}/cancel");

        $response->assertOk();
        $this->assertDatabaseHas('documents', [
            'id'     => $doc->id,
            'status' => 'cancelled',
        ]);
    }

    public function test_client_cannot_cancel_approved_document(): void
    {
        $doc = Document::factory()->create([
            'company_id' => $this->company->id,
            'status'     => 'approved',
        ]);

        $response = $this->actingAs($this->client)
            ->postJson("/api/documents/{$doc->id}/cancel");

        $response->assertUnprocessable();
        $this->assertDatabaseHas('documents', ['id' => $doc->id, 'status' => 'approved']);
    }

    public function test_client_cannot_cancel_rejected_document(): void
    {
        $doc = Document::factory()->create([
            'company_id' => $this->company->id,
            'status'     => 'rejected',
        ]);

        $response = $this->actingAs($this->client)
            ->postJson("/api/documents/{$doc->id}/cancel");

        $response->assertUnprocessable();
        $this->assertDatabaseHas('documents', ['id' => $doc->id, 'status' => 'rejected']);
    }

    public function test_client_cannot_cancel_another_companys_document(): void
    {
        $otherCompany = Company::factory()->create();
        $doc = Document::factory()->create([
            'company_id' => $otherCompany->id,
            'status'     => 'parked',
        ]);

        $response = $this->actingAs($this->client)
            ->postJson("/api/documents/{$doc->id}/cancel");

        $response->assertNotFound();
        $this->assertDatabaseHas('documents', ['id' => $doc->id, 'status' => 'parked']);
    }

    public function test_unauthenticated_user_cannot_cancel(): void
    {
        $doc = Document::factory()->create([
            'company_id' => $this->company->id,
            'status'     => 'parked',
        ]);

        $response = $this->postJson("/api/documents/{$doc->id}/cancel");

        $response->assertUnauthorized();
    }
}
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
docker compose exec backend php artisan test --filter=CancelDocumentTest
```

Expected: all 7 tests FAIL (route not found / method not defined).

- [ ] **Step 3: Add the `cancel()` method to `DocumentController`**

In `backend/app/Http/Controllers/DocumentController.php`, add this method after `reupload()`:

```php
public function cancel(string $id): JsonResponse
{
    $user     = auth()->user();
    $document = Document::where('id', $id)
        ->where('company_id', $user->company_id)
        ->firstOrFail();

    if (!in_array($document->status, ['processing', 'parked', 'returned'])) {
        return response()->json(['message' => 'This document cannot be cancelled.'], 422);
    }

    $document->update(['status' => 'cancelled']);

    return response()->json(['message' => 'Document withdrawn.']);
}
```

- [ ] **Step 4: Register the route**

In `backend/routes/api.php`, inside the `role:client` + `client.active` group, add after the existing `/reupload` line:

```php
Route::post('/documents/{id}/cancel', [DocumentController::class, 'cancel']);
```

- [ ] **Step 5: Run tests to confirm they pass**

```bash
docker compose exec backend php artisan test --filter=CancelDocumentTest
```

Expected: all 7 tests PASS.

- [ ] **Step 6: Commit**

```bash
git add backend/tests/Feature/CancelDocumentTest.php \
        backend/app/Http/Controllers/DocumentController.php \
        backend/routes/api.php
git commit -m "feat: add cancel document endpoint — client can withdraw PROCESSING/PARKED/RETURNED docs"
```

---

## Task 3: Frontend — types, API, and shared components

**Files:**
- Modify: `frontend/src/types/document.ts`
- Modify: `frontend/src/lib/api/documents.ts`
- Modify: `frontend/src/components/documents/StatusBadge.tsx`
- Modify: `frontend/src/components/documents/DocumentsTable.tsx`

- [ ] **Step 1: Add `CANCELLED` to `DocumentStatus` in `frontend/src/types/document.ts`**

Replace:
```ts
export type DocumentStatus = 'PROCESSING' | 'PARKED' | 'APPROVED' | 'RETURNED' | 'REJECTED'
```

With:
```ts
export type DocumentStatus = 'PROCESSING' | 'PARKED' | 'APPROVED' | 'RETURNED' | 'REJECTED' | 'CANCELLED'
```

- [ ] **Step 2: Add `cancelDocument()` to `frontend/src/lib/api/documents.ts`**

Append after the `getClientDocuments` function:

```ts
export async function cancelDocument(id: string): Promise<void> {
  await api.post(`/documents/${id}/cancel`)
}
```

- [ ] **Step 3: Add `CANCELLED` to `STATUS_CONFIG` in `frontend/src/components/documents/StatusBadge.tsx`**

Replace the `STATUS_CONFIG` object:

```ts
const STATUS_CONFIG: Record<DocumentStatus, { label: string; className: string }> = {
  PROCESSING: { label: 'Processing...', className: 'bg-blue-100 text-blue-800' },
  PARKED:     { label: 'In Review',     className: 'bg-yellow-100 text-yellow-800' },
  APPROVED:   { label: 'Approved',      className: 'bg-green-100 text-green-800' },
  RETURNED:   { label: 'Returned',      className: 'bg-orange-100 text-orange-800' },
  REJECTED:   { label: 'Rejected',      className: 'bg-red-100 text-red-800' },
  CANCELLED:  { label: 'Withdrawn',     className: 'bg-gray-100 text-gray-500' },
}
```

- [ ] **Step 4: Add `CANCELLED` to `DocumentsTable.tsx`**

Replace the `STATUS_BADGE` object:

```ts
const STATUS_BADGE: Record<DocumentStatus, { label: string; cls: string }> = {
  PROCESSING: { label: 'Processing', cls: 'bg-gray-100 text-gray-600' },
  PARKED:     { label: 'In Review',  cls: 'bg-yellow-100 text-yellow-700' },
  RETURNED:   { label: 'Returned',   cls: 'bg-red-100 text-red-700' },
  APPROVED:   { label: 'Approved',   cls: 'bg-green-100 text-green-700' },
  REJECTED:   { label: 'Rejected',   cls: 'bg-gray-100 text-gray-500' },
  CANCELLED:  { label: 'Withdrawn',  cls: 'bg-gray-100 text-gray-400' },
}
```

Also update the `noteText` function — add a `CANCELLED` case before the final `return`:

```ts
function noteText(doc: Document): { text: string; cls: string } {
  if (doc.status === 'RETURNED' && doc.returnNote) {
    const truncated = doc.returnNote.length > 50
      ? doc.returnNote.slice(0, 50) + '…'
      : doc.returnNote
    return { text: truncated, cls: 'text-red-600' }
  }
  if (doc.status === 'REJECTED' && doc.rejectionReason) {
    const truncated = doc.rejectionReason.length > 50
      ? doc.rejectionReason.slice(0, 50) + '…'
      : doc.rejectionReason
    return { text: truncated, cls: 'text-gray-500' }
  }
  if (doc.status === 'PARKED')     return { text: 'Awaiting accountant review', cls: 'text-gray-400' }
  if (doc.status === 'PROCESSING') return { text: 'Processing…', cls: 'text-gray-400 italic' }
  if (doc.status === 'CANCELLED')  return { text: 'Withdrawn by client', cls: 'text-gray-400' }
  return { text: '', cls: '' }
}
```

- [ ] **Step 5: Type check**

```bash
docker compose exec frontend npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/types/document.ts \
        frontend/src/lib/api/documents.ts \
        frontend/src/components/documents/StatusBadge.tsx \
        frontend/src/components/documents/DocumentsTable.tsx
git commit -m "feat: add CANCELLED status to frontend types, API, StatusBadge, DocumentsTable"
```

---

## Task 4: DocumentDetailModal — Cancel UI

**Files:**
- Modify: `frontend/src/components/documents/DocumentDetailModal.tsx`

- [ ] **Step 1: Update the import line**

At the top of `DocumentDetailModal.tsx`, the existing imports are already sufficient. No new imports needed — the confirmation dialog is built inline using the existing `cn` utility and button styles already used in the file.

- [ ] **Step 2: Update the inline `StatusBadge` map**

The `StatusBadge` function inside the modal (lines 39–53) has its own `map` record. Add `CANCELLED`:

```ts
function StatusBadge({ status }: { status: Document['status'] }) {
  const map: Record<Document['status'], { label: string; cls: string }> = {
    PROCESSING: { label: 'Processing', cls: 'bg-gray-100 text-gray-600' },
    PARKED:     { label: 'In Review',  cls: 'bg-yellow-100 text-yellow-700' },
    RETURNED:   { label: 'Returned',   cls: 'bg-red-100 text-red-700' },
    APPROVED:   { label: 'Approved',   cls: 'bg-green-100 text-green-700' },
    REJECTED:   { label: 'Rejected',   cls: 'bg-gray-100 text-gray-500' },
    CANCELLED:  { label: 'Withdrawn',  cls: 'bg-gray-100 text-gray-400' },
  }
  const { label, cls } = map[status]
  return (
    <span className={`inline-flex items-center text-[10px] font-semibold px-2 py-0.5 rounded-full ${cls}`}>
      {label}
    </span>
  )
}
```

- [ ] **Step 3: Update the `Props` interface and add `onCancel`**

Replace the `Props` interface:

```ts
interface Props {
  doc: Document | null
  onClose: () => void
  onReupload: (file: File) => void
  onCancel: () => void
}
```

- [ ] **Step 4: Update the `DocumentDetailModal` function signature and add cancel state**

Replace the function signature and add the `isCancelOpen` state:

```ts
export function DocumentDetailModal({ doc, onClose, onReupload, onCancel }: Props) {
  const [detail, setDetail]           = useState<Document | null>(null)
  const [isCancelOpen, setIsCancelOpen] = useState(false)
```

- [ ] **Step 5: Replace everything from `handleReuploadClick` to end of file**

In `DocumentDetailModal.tsx`, replace from the line `function handleReuploadClick()` all the way to the final closing `}` of the `DocumentDetailModal` function (the last line of the file). Keep everything above it (the `useEffect`, the early `if (!doc) return null`, and `const fullDoc = detail ?? doc`) unchanged.

```tsx
  function handleReuploadClick() {
    const input = Object.assign(document.createElement('input'), {
      type: 'file',
      accept: 'image/*,.pdf',
    })
    input.onchange = () => {
      const file = input.files?.[0]
      if (file) onReupload(file)
    }
    input.click()
  }

  const ref = doc.refNumber ?? `#${doc.id.slice(0, 8)}`

  const canCancel = ['PROCESSING', 'PARKED', 'RETURNED'].includes(doc.status)

  return (
    <>
      <Dialog open={!!doc} onOpenChange={(open) => { if (!open) onClose() }}>
        <DialogContent className="sm:max-w-4xl p-0 gap-0 overflow-hidden">

          {/* Header */}
          <div className="flex items-start justify-between px-6 pt-5 pb-4 border-b border-gray-100">
            <div>
              <div className="text-[15px] font-bold text-gray-900">{ref}</div>
              <MetaLine doc={doc} />
            </div>
            <StatusBadge status={doc.status} />
          </div>

          {/* Two-column body */}
          <div className="flex divide-x divide-gray-100 overflow-hidden max-h-[72vh]">

            {/* Left: receipt image */}
            <div className="w-2/5 p-5 overflow-y-auto">
              <ReceiptImage doc={fullDoc} />
              {fullDoc.merchantName && (
                <div className="mt-3 text-xs font-semibold text-gray-700">{fullDoc.merchantName}</div>
              )}
            </div>

            {/* Right: document details */}
            <div className="flex-1 p-5 overflow-y-auto space-y-4">

              {doc.status === 'PROCESSING' && (
                <>
                  <PipelineSteps doc={doc} />
                  <button
                    onClick={() => setIsCancelOpen(true)}
                    className="w-full border border-red-300 text-red-600 hover:bg-red-50 text-sm font-semibold py-2.5 rounded-lg transition-colors"
                  >
                    Cancel Document
                  </button>
                </>
              )}

              {doc.status === 'PARKED' && (
                <>
                  <TransactionLinesTable doc={fullDoc} />
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg px-4 py-3 text-xs text-yellow-800">
                    ⏳ Your accountant is reviewing this entry.
                  </div>
                  <button
                    onClick={() => setIsCancelOpen(true)}
                    className="w-full border border-red-300 text-red-600 hover:bg-red-50 text-sm font-semibold py-2.5 rounded-lg transition-colors"
                  >
                    Cancel Document
                  </button>
                </>
              )}

              {doc.status === 'RETURNED' && (
                <>
                  {fullDoc.returnNote && (
                    <div className="bg-red-50 border-[1.5px] border-red-300 rounded-lg px-4 py-3">
                      <div className="text-[10px] font-bold text-red-600 uppercase mb-1">Accountant Note</div>
                      <div className="text-xs text-gray-700 leading-relaxed">{fullDoc.returnNote}</div>
                    </div>
                  )}
                  <TransactionLinesTable doc={fullDoc} dimmed />
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => setIsCancelOpen(true)}
                      className="border border-red-300 text-red-600 hover:bg-red-50 text-sm font-semibold px-4 py-2.5 rounded-lg transition-colors"
                    >
                      Cancel Document
                    </button>
                    <button
                      onClick={handleReuploadClick}
                      className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold py-2.5 rounded-lg transition-colors"
                    >
                      Re-upload Document
                    </button>
                    {doc.expiresAt && <ExpiryCountdown expiresAt={doc.expiresAt} />}
                  </div>
                </>
              )}

              {doc.status === 'REJECTED' && (
                <>
                  {fullDoc.rejectionReason && (
                    <div className="bg-gray-50 border border-gray-200 rounded-lg px-4 py-3">
                      <div className="text-[10px] font-bold text-gray-500 uppercase mb-1">Rejection Reason</div>
                      <div className="text-xs text-gray-700 leading-relaxed">{fullDoc.rejectionReason}</div>
                    </div>
                  )}
                  <TransactionLinesTable doc={fullDoc} dimmed />
                  <div className="bg-gray-50 border border-gray-200 rounded-lg px-4 py-2.5 text-xs text-gray-500 text-center">
                    This document has been permanently excluded from your books.
                  </div>
                </>
              )}

              {doc.status === 'APPROVED' && (
                <>
                  <TransactionLinesTable doc={fullDoc} />
                  <div className="bg-green-50 border border-green-200 rounded-lg px-4 py-3 text-xs text-green-800">
                    ✅ Approved and posted to your books.
                  </div>
                </>
              )}

              {doc.status === 'CANCELLED' && (
                <div className="bg-gray-50 border border-gray-200 rounded-lg px-4 py-2.5 text-xs text-gray-500 text-center">
                  You withdrew this document.
                </div>
              )}

            </div>
          </div>

        </DialogContent>
      </Dialog>

      {/* Cancel confirmation dialog */}
      {canCancel && isCancelOpen && (
        <Dialog open={isCancelOpen} onOpenChange={setIsCancelOpen}>
          <DialogContent className="sm:max-w-sm">
            <div className="space-y-4 p-2">
              <div className="text-[15px] font-bold text-gray-900">Withdraw this document?</div>
              <div className="text-sm text-gray-500">This cannot be undone.</div>
              <div className="flex gap-3 pt-1">
                <button
                  onClick={() => setIsCancelOpen(false)}
                  className="flex-1 border border-gray-200 text-gray-700 hover:bg-gray-50 text-sm font-semibold py-2 rounded-lg transition-colors"
                >
                  Go back
                </button>
                <button
                  onClick={() => { setIsCancelOpen(false); onCancel() }}
                  className="flex-1 bg-red-600 hover:bg-red-700 text-white text-sm font-semibold py-2 rounded-lg transition-colors"
                >
                  Withdraw
                </button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  )
}
```

- [ ] **Step 6: Type check**

```bash
docker compose exec frontend npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 7: Commit**

```bash
git add frontend/src/components/documents/DocumentDetailModal.tsx
git commit -m "feat: DocumentDetailModal — cancel button, confirmation dialog, CANCELLED state display"
```

---

## Task 5: Wire up cancel in documents page

**Files:**
- Modify: `frontend/src/app/client/documents/page.tsx`

- [ ] **Step 1: Add `cancelDocument` import and `handleCancel` handler**

In `frontend/src/app/client/documents/page.tsx`, update the import line for documents API:

```ts
import { getDocuments, reuploadDocument, cancelDocument } from '@/lib/api/documents'
```

Add `handleCancel` after `handleReupload` inside `DocumentsContent`:

```ts
async function handleCancel() {
  if (!selectedDoc) return
  const docId = selectedDoc.id
  setSelectedDoc(null)
  try {
    await cancelDocument(docId)
    queryClient.invalidateQueries({ queryKey: ['client-docs', status, type, start, end] })
    toast({ title: 'Document withdrawn.' })
  } catch {
    toast({ title: 'Could not withdraw document', description: 'Please try again.', variant: 'destructive' })
  }
}
```

- [ ] **Step 2: Pass `onCancel` to `DocumentDetailModal`**

Replace:
```tsx
<DocumentDetailModal
  doc={selectedDoc}
  onClose={() => setSelectedDoc(null)}
  onReupload={handleReupload}
/>
```

With:
```tsx
<DocumentDetailModal
  doc={selectedDoc}
  onClose={() => setSelectedDoc(null)}
  onReupload={handleReupload}
  onCancel={handleCancel}
/>
```

- [ ] **Step 3: Type check**

```bash
docker compose exec frontend npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/app/client/documents/page.tsx
git commit -m "feat: wire up cancel document in client documents page"
```

---

## Done

All 5 tasks complete. The `CANCELLED` status flows end-to-end:
- Backend: migration, endpoint, 7 feature tests passing
- Frontend: type, API, table badge, status badge, modal UI, page handler
