# Upload Context Note Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** After a file is dropped on the upload page, show a confirmation dialog where users can optionally add context for the AI classifier; store that note on the Document and inject it into the Claude prompt.

**Architecture:** A new `ConfirmUploadDialog` component intercepts the file-pick event in `upload/page.tsx` before the upload API call. The note travels through `FormData` → `DocumentController` → `documents.note` column → `ClassifyWithAI` → `TransactionClassifier` where it's appended to whichever prompt path is used (image, OCR, or manual). The note is already returned by `toListItem()` and `toDetail()`, and the TypeScript type already has `note: string | null`, so only the modal UI needs updating for display.

**Tech Stack:** Laravel 11 (PHPUnit feature tests), Next.js 14 App Router, TypeScript, shadcn/ui (Dialog), Tailwind CSS

---

## File Map

| File | Action | Responsibility |
|---|---|---|
| `backend/app/Http/Requests/Document/UploadDocumentRequest.php` | Modify | Accept nullable `note` field |
| `backend/app/Http/Controllers/DocumentController.php` | Modify | Store `note` in `upload()` |
| `backend/app/Services/AI/TransactionClassifier.php` | Modify | Accept `?string $userNote`, inject into all three prompt builders |
| `backend/app/Jobs/ClassifyWithAI.php` | Modify | Pass `$this->document->note` to classifier |
| `backend/tests/Feature/UploadDocumentNoteTest.php` | Create | Feature test: note stored on upload |
| `backend/tests/Unit/TransactionClassifierNoteTest.php` | Create | Unit test: note appears in prompt |
| `frontend/src/lib/api/documents.ts` | Modify | Add `note?: string` param to `uploadDocument` |
| `frontend/src/components/upload/TwoAreaUpload.tsx` | Modify | Rename `onUpload` → `onFilePicked` |
| `frontend/src/app/client/upload/page.tsx` | Modify | Add `pendingUpload` state, two-step handlers, render dialog |
| `frontend/src/components/upload/ConfirmUploadDialog.tsx` | Create | Modal with file card + context textarea |
| `frontend/src/components/documents/DocumentDetailModal.tsx` | Modify | Show note row in `DocMetaCard` |

---

## Task 1: Backend — Validate and store the note

**Files:**
- Modify: `backend/app/Http/Requests/Document/UploadDocumentRequest.php`
- Modify: `backend/app/Http/Controllers/DocumentController.php:38-50`
- Create: `backend/tests/Feature/UploadDocumentNoteTest.php`

- [ ] **Step 1: Write the failing test**

Create `backend/tests/Feature/UploadDocumentNoteTest.php`:

```php
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
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd backend && php artisan test tests/Feature/UploadDocumentNoteTest.php
```

Expected: both tests FAIL (note validation not yet added, note not stored).

- [ ] **Step 3: Add note validation to UploadDocumentRequest**

In `backend/app/Http/Requests/Document/UploadDocumentRequest.php`, update `rules()`:

```php
public function rules(): array
{
    return [
        'file'          => ['required', 'file', 'mimes:jpg,jpeg,png,pdf', 'max:10240'],
        'declared_type' => ['required', 'string', 'in:income,expense'],
        'note'          => ['nullable', 'string', 'max:1000'],
    ];
}
```

- [ ] **Step 4: Store note in DocumentController::upload()**

In `backend/app/Http/Controllers/DocumentController.php`, update the `Document::create([...])` call in `upload()` (currently lines 38–50). Add `'note' => $request->note` to the array:

```php
$document = Document::create([
    'company_id'        => $company->id,
    'uploaded_by'       => $user->id,
    'original_filename' => $request->file('file')->getClientOriginalName(),
    'storage_path'      => $path,
    'file_type'         => $request->file('file')->getClientOriginalExtension(),
    'file_hash'         => $hash,
    'document_type'     => $request->declared_type,
    'status'            => 'processing',
    'internal_status'   => 'PENDING',
    'is_no_receipt'     => false,
    'is_ocr_failed'     => false,
    'note'              => $request->note,
]);
```

- [ ] **Step 5: Run tests to verify they pass**

```bash
cd backend && php artisan test tests/Feature/UploadDocumentNoteTest.php
```

Expected: both tests PASS.

- [ ] **Step 6: Commit**

```bash
git add backend/app/Http/Requests/Document/UploadDocumentRequest.php \
        backend/app/Http/Controllers/DocumentController.php \
        backend/tests/Feature/UploadDocumentNoteTest.php
git commit -m "feat: accept and store user note on document upload"
```

---

## Task 2: Backend — Inject note into AI classifier prompts

**Files:**
- Modify: `backend/app/Services/AI/TransactionClassifier.php`
- Create: `backend/tests/Unit/TransactionClassifierNoteTest.php`

- [ ] **Step 1: Write the failing test**

Create `backend/tests/Unit/TransactionClassifierNoteTest.php`:

```php
<?php

namespace Tests\Unit;

use App\Models\Account;
use App\Models\Company;
use App\Services\AI\TransactionClassifier;
use PHPUnit\Framework\TestCase;

class TransactionClassifierNoteTest extends TestCase
{
    private function makeClassifierWithCapture(?array &$capturedMessages): TransactionClassifier
    {
        $fakeToolInput = [
            'document' => [
                'merchant'     => null,
                'date'         => null,
                'total_amount' => 100.00,
                'vat_amount'   => null,
                'or_number'    => null,
            ],
            'lines' => [[
                'description'  => 'Electricity',
                'amount'       => 100.00,
                'account_code' => '6001',
                'type'         => 'expense',
                'category'     => 'Utilities',
                'date'         => null,
            ]],
            'confidence' => 0.9,
        ];

        $fakeBlock       = new \stdClass();
        $fakeBlock->type = 'tool_use';
        $fakeBlock->name = 'classify_transaction';
        $fakeBlock->input = $fakeToolInput;

        $fakeResponse          = new \stdClass();
        $fakeResponse->content = [$fakeBlock];

        return new class($fakeResponse, $capturedMessages) extends TransactionClassifier {
            public function __construct(
                private mixed $fakeResponse,
                private ?array &$capture,
            ) {
                // skip parent constructor — no real API client needed
            }

            protected function callApi(array $params): mixed
            {
                $this->capture = $params['messages'];
                return $this->fakeResponse;
            }
        };
    }

    private function makeCompany(): Company
    {
        $account       = new Account();
        $account->code = '6001';
        $account->name = 'Utilities';
        $account->type = 'expense';

        $company              = $this->createMock(Company::class);
        $company->name        = 'Test Co';
        $company->bir_type    = 'non-vat';

        $collection = collect([$account]);
        $queryMock  = $this->createMock(\Illuminate\Database\Eloquent\Builder::class);
        $queryMock->method('get')->willReturn($collection);
        $queryMock->method('where')->willReturnSelf();

        $company->method('accounts')->willReturn($queryMock);

        return $company;
    }

    public function test_user_note_appears_in_ocr_prompt(): void
    {
        $messages = null;
        $classifier = $this->makeClassifierWithCapture($messages);
        $company    = $this->makeCompany();

        $inputData = [
            'raw_text' => 'Meralco electricity bill total 100',
        ];

        $classifier->classify($inputData, $company, 'Monthly electricity bill from Meralco');

        $this->assertNotNull($messages);
        $promptText = is_string($messages[0]['content'])
            ? $messages[0]['content']
            : json_encode($messages[0]['content']);

        $this->assertStringContainsString(
            'Monthly electricity bill from Meralco',
            $promptText
        );
    }

    public function test_no_note_context_block_when_note_is_null(): void
    {
        $messages = null;
        $classifier = $this->makeClassifierWithCapture($messages);
        $company    = $this->makeCompany();

        $inputData = ['raw_text' => 'Some receipt'];

        $classifier->classify($inputData, $company, null);

        $promptText = is_string($messages[0]['content'])
            ? $messages[0]['content']
            : json_encode($messages[0]['content']);

        $this->assertStringNotContainsString('User-provided context', $promptText);
    }
}
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd backend && php artisan test tests/Unit/TransactionClassifierNoteTest.php
```

Expected: FAIL — `classify()` does not yet accept a third argument.

- [ ] **Step 3: Update TransactionClassifier::classify() signature and prompt builders**

In `backend/app/Services/AI/TransactionClassifier.php`, make these changes:

**3a — Update `classify()` signature** (line 17):
```php
public function classify(array $inputData, Company $company, ?string $userNote = null): array
```

**3b — Pass `$userNote` to each message builder** (lines 51–57):
```php
if ($isImagePath) {
    $messages = $this->buildImageMessages($inputData, $userNote);
} elseif ($isOcrPath) {
    $messages = [['role' => 'user', 'content' => $this->buildOcrPrompt($inputData, $userNote)]];
} else {
    $messages = [['role' => 'user', 'content' => $this->buildManualPrompt($inputData, $userNote)]];
}
```

**3c — Update `buildImageMessages()`** (line 107) to accept and append the note:
```php
private function buildImageMessages(array $inputData, ?string $userNote = null): array
{
    $noteBlock = $userNote
        ? "\n\nUser-provided context: \"{$userNote}\"\nUse this as additional context when classifying the document."
        : '';

    return [[
        'role'    => 'user',
        'content' => [
            [
                'type'   => 'image',
                'source' => [
                    'type'       => 'base64',
                    'media_type' => $inputData['media_type'] ?? 'image/jpeg',
                    'data'       => $inputData['image_base64'],
                ],
            ],
            [
                'type' => 'text',
                'text' => "This is a document photographed by a Philippine SME client.\n\n" .
                          "It may be a receipt, invoice, daily sales summary, or cash collection report.\n\n" .
                          "If it contains BOTH a gross sales/income figure AND an expenses breakdown, " .
                          "create income line(s) for the sales AND separate expense line(s) — do not merge them.\n\n" .
                          "Extract all structured fields and classify the transaction using the classify_transaction tool." .
                          $noteBlock,
            ],
        ],
    ]];
}
```

**3d — Update `buildOcrPrompt()`** (line 132) to accept and append the note:
```php
private function buildOcrPrompt(array $inputData, ?string $userNote = null): string
{
    $noteBlock = $userNote
        ? "\n\nUser-provided context: \"{$userNote}\"\nUse this as additional context when classifying the document."
        : '';

    $sections = [];

    if (!empty($inputData['header'])) {
        $sections[] = "HEADER (store name, address, BIR TIN, document title):\n" .
                      implode("\n", $inputData['header']);
    }
    if (!empty($inputData['body'])) {
        $sections[] = "BODY (main content: items, sales entries, time-slot collections, expense categories):\n" .
                      implode("\n", $inputData['body']);
    }
    if (!empty($inputData['footer'])) {
        $sections[] = "FOOTER (totals, VAT, OR number, net amounts):\n" .
                      implode("\n", $inputData['footer']);
    }

    $rawText = $inputData['raw_text'] ?? '';

    if (empty($sections)) {
        return "You are reading a document photographed by a Philippine SME client.\n" .
               "The text below was extracted by OCR — it may contain noise, truncated words, or misread characters.\n\n" .
               "Full text:\n{$rawText}\n\n" .
               "This may be a receipt, invoice, daily sales summary, or cash collection report.\n\n" .
               "If it contains BOTH a gross sales/income figure AND an expenses breakdown, " .
               "create income line(s) for the sales AND separate expense line(s) — do not merge them.\n\n" .
               "Extract all structured fields and classify the transaction using the classify_transaction tool." .
               $noteBlock;
    }

    return "You are reading a document photographed by a Philippine SME client.\n" .
           "The text below was extracted by OCR — it may contain noise, truncated words, or misread characters.\n\n" .
           "Document sections:\n\n" . implode("\n\n", $sections) . "\n\n" .
           "Full text (use this to cross-reference amounts and labels that may be split across sections):\n{$rawText}\n\n" .
           "This may be a receipt, invoice, daily sales summary, or cash collection report.\n\n" .
           "If it contains BOTH a gross sales/income figure AND an expenses breakdown, " .
           "create income line(s) for the sales AND separate expense line(s) — do not merge them.\n\n" .
           "Extract all structured fields and classify the transaction using the classify_transaction tool." .
           $noteBlock;
}
```

**3e — Update `buildManualPrompt()`** (line 171) to accept and append the note:
```php
private function buildManualPrompt(array $inputData, ?string $userNote = null): string
{
    $noteBlock = $userNote
        ? "\n\nUser-provided context: \"{$userNote}\"\nUse this as additional context when classifying the document."
        : '';

    return "The client has manually entered this transaction. " .
           "Assign the correct account_code and category to each line from the Chart of Accounts. " .
           "Also extract any dates mentioned in the description text " .
           "(e.g. 'kita kahapon 2026-05-28' → date: '2026-05-28').\n\n" .
           "Transaction data: " . json_encode($inputData) . "\n\n" .
           "Classify using the classify_transaction tool. " .
           "For document.merchant, document.date, document.or_number — return null " .
           "(those fields are already set on the document)." .
           $noteBlock;
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
cd backend && php artisan test tests/Unit/TransactionClassifierNoteTest.php
```

Expected: both tests PASS.

- [ ] **Step 5: Commit**

```bash
git add backend/app/Services/AI/TransactionClassifier.php \
        backend/tests/Unit/TransactionClassifierNoteTest.php
git commit -m "feat: inject user note into AI classifier prompts"
```

---

## Task 3: Backend — Wire ClassifyWithAI to pass document note

**Files:**
- Modify: `backend/app/Jobs/ClassifyWithAI.php:60-61`

- [ ] **Step 1: Update the classify() call in ClassifyWithAI**

In `backend/app/Jobs/ClassifyWithAI.php`, update the classifier call (currently line 61):

```php
// STEP C — Classify
$classifier     = new TransactionClassifier();
$classification = $classifier->classify($inputData, $company, $this->document->note);
```

- [ ] **Step 2: Run the full test suite to check nothing broke**

```bash
cd backend && php artisan test
```

Expected: all tests PASS.

- [ ] **Step 3: Commit**

```bash
git add backend/app/Jobs/ClassifyWithAI.php
git commit -m "feat: pass document note to AI classifier in ClassifyWithAI job"
```

---

## Task 4: Frontend — Add note param to uploadDocument API function

**Files:**
- Modify: `frontend/src/lib/api/documents.ts:4-13`

- [ ] **Step 1: Update uploadDocument signature**

In `frontend/src/lib/api/documents.ts`, update the `uploadDocument` function:

```typescript
export async function uploadDocument(
  file: File,
  declaredType: DeclaredType,
  note?: string
): Promise<{ documentId: string }> {
  const form = new FormData()
  form.append('file', file)
  form.append('declared_type', declaredType)
  if (note) form.append('note', note)
  const { data } = await api.post<{ documentId: string }>('/documents', form)
  return data
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/lib/api/documents.ts
git commit -m "feat: add note param to uploadDocument API function"
```

---

## Task 5: Frontend — Create ConfirmUploadDialog component

**Files:**
- Create: `frontend/src/components/upload/ConfirmUploadDialog.tsx`

- [ ] **Step 1: Create the component**

Create `frontend/src/components/upload/ConfirmUploadDialog.tsx`:

```tsx
'use client'

import { useState } from 'react'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import type { DeclaredType } from '@/types/document'

interface Props {
  open: boolean
  file: File | null
  declaredType: DeclaredType
  onConfirm: (note: string) => void
  onCancel: () => void
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024 * 1024) return `~${Math.round(bytes / 1024)} KB`
  return `~${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function ConfirmUploadDialog({ open, file, declaredType, onConfirm, onCancel }: Props) {
  const [note, setNote] = useState('')

  function handleConfirm() {
    onConfirm(note.trim())
    setNote('')
  }

  function handleCancel() {
    setNote('')
    onCancel()
  }

  const title = declaredType === 'income' ? 'Upload Income Document' : 'Upload Expense Document'
  const typeBadgeCls = declaredType === 'income'
    ? 'bg-green-100 text-green-700'
    : 'bg-red-100 text-red-700'
  const typeLabel = declaredType === 'income' ? 'Income' : 'Expense'

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) handleCancel() }}>
      <DialogContent className="sm:max-w-lg">
        <div className="space-y-5 p-1">

          {/* Title */}
          <div className="text-[15px] font-bold text-gray-900">{title}</div>

          {/* File card */}
          {file && (
            <div className="flex items-center gap-3 rounded-lg border border-gray-200 bg-gray-50 px-4 py-3">
              <div className="text-2xl">📄</div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold text-gray-800 truncate">{file.name}</div>
                <div className="text-[11px] text-gray-400 mt-0.5">
                  {typeLabel} · {formatFileSize(file.size)} · dropped
                </div>
              </div>
              <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-full shrink-0 ${typeBadgeCls}`}>
                {typeLabel}
              </span>
            </div>
          )}

          {/* Context section */}
          <div className="space-y-2">
            <div>
              <span className="text-sm font-semibold text-gray-800">Add context for our AI </span>
              <span className="text-sm text-gray-400">(optional but helpful)</span>
            </div>
            <p className="text-xs text-gray-500">
              Describe what this document is — the more you tell us, the more accurately we can classify it.
            </p>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="e.g. Monthly electricity bill from Meralco for May 2026, includes VAT"
              rows={4}
              className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm text-gray-800 placeholder:text-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
            />
            <p className="text-xs text-gray-400">
              <span className="font-semibold text-gray-500">Tips:</span>{' '}
              Mention the supplier or customer name, what the payment is for, or any special
              classification (e.g. &quot;this is a VAT-exempt sale&quot; or &quot;petty cash reimbursement&quot;).
            </p>
          </div>

          {/* Footer buttons */}
          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={handleCancel}
              className="flex-1 border border-gray-200 text-gray-700 hover:bg-gray-50 text-sm font-semibold py-2.5 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold py-2.5 rounded-lg transition-colors"
            >
              Confirm &amp; Upload
            </button>
          </div>

        </div>
      </DialogContent>
    </Dialog>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/components/upload/ConfirmUploadDialog.tsx
git commit -m "feat: add ConfirmUploadDialog component with context textarea"
```

---

## Task 6: Frontend — Wire page and TwoAreaUpload for two-step flow

**Files:**
- Modify: `frontend/src/components/upload/TwoAreaUpload.tsx`
- Modify: `frontend/src/app/client/upload/page.tsx`

- [ ] **Step 1: Update TwoAreaUpload to rename onUpload → onFilePicked**

Replace the entire content of `frontend/src/components/upload/TwoAreaUpload.tsx`:

```tsx
'use client'

import { useState } from 'react'
import { UploadZone } from './UploadZone'
import { ManualEntryForm } from './ManualEntryForm'
import type { DeclaredType } from '@/types/document'

interface Props {
  onFilePicked: (file: File, declaredType: DeclaredType) => void
  onManualSuccess: (documentId: string) => void
  incomeCount?: number
  expenseCount?: number
}

export function TwoAreaUpload({ onFilePicked, onManualSuccess, incomeCount, expenseCount }: Props) {
  const [manualOpen, setManualOpen] = useState(false)

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-4">
        <UploadZone
          declaredType="income"
          onFileSelect={(file) => onFilePicked(file, 'income')}
          count={incomeCount}
        />
        <UploadZone
          declaredType="expense"
          onFileSelect={(file) => onFilePicked(file, 'expense')}
          count={expenseCount}
        />
      </div>

      <button
        type="button"
        onClick={() => setManualOpen(true)}
        className="w-full py-3 bg-white border-2 border-dashed border-indigo-200 rounded-lg text-sm font-semibold text-indigo-600 hover:bg-indigo-50 transition-colors"
      >
        No physical receipt? Enter manually
      </button>

      <ManualEntryForm
        open={manualOpen}
        onClose={() => setManualOpen(false)}
        onSuccess={(id) => {
          setManualOpen(false)
          onManualSuccess(id)
        }}
      />
    </div>
  )
}
```

- [ ] **Step 2: Update upload/page.tsx to add two-step upload flow**

Replace the entire content of `frontend/src/app/client/upload/page.tsx`:

```tsx
'use client'

import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { TwoAreaUpload } from '@/components/upload/TwoAreaUpload'
import { ConfirmUploadDialog } from '@/components/upload/ConfirmUploadDialog'
import { DocumentsTable } from '@/components/documents/DocumentsTable'
import { DocumentDetailModal } from '@/components/documents/DocumentDetailModal'
import { uploadDocument, getDocuments, reuploadDocument, cancelDocument } from '@/lib/api/documents'
import { useToast } from '@/hooks/use-toast'
import type { DeclaredType, Document } from '@/types/document'

export default function UploadPage() {
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const [selectedDoc, setSelectedDoc] = useState<Document | null>(null)
  const [pendingUpload, setPendingUpload] = useState<{
    file: File
    declaredType: DeclaredType
  } | null>(null)

  const { data: allDocs = [] } = useQuery({
    queryKey: ['client-documents-upload'],
    queryFn: () => getDocuments(),
    refetchInterval: 8000,
  })

  const now = new Date()
  const thisMonth = allDocs.filter((d) => {
    const c = new Date(d.createdAt)
    return c.getMonth() === now.getMonth() && c.getFullYear() === now.getFullYear()
  })
  const incomeCount  = thisMonth.filter((d) => d.declaredType === 'income').length
  const expenseCount = thisMonth.filter((d) => d.declaredType === 'expense').length

  const inProgress = allDocs.filter((d) =>
    ['PROCESSING', 'PARKED', 'RETURNED'].includes(d.status)
  )

  function handleFilePicked(file: File, declaredType: DeclaredType) {
    setPendingUpload({ file, declaredType })
  }

  async function handleConfirmUpload(note: string) {
    if (!pendingUpload) return
    const { file, declaredType } = pendingUpload
    setPendingUpload(null)
    try {
      await uploadDocument(file, declaredType, note || undefined)
      queryClient.invalidateQueries({ queryKey: ['client-documents-upload'] })
    } catch {
      toast({ title: 'Upload failed', description: 'Please try again.', variant: 'destructive' })
    }
  }

  function handleManualSuccess(_documentId: string) {
    queryClient.invalidateQueries({ queryKey: ['client-documents-upload'] })
    toast({ title: 'Entry submitted — processing…' })
  }

  async function handleReupload(file: File) {
    if (!selectedDoc) return
    const docId = selectedDoc.id
    setSelectedDoc(null)
    try {
      await reuploadDocument(docId, file)
      queryClient.invalidateQueries({ queryKey: ['client-documents-upload'] })
      toast({ title: 'Re-uploaded — processing your document…' })
    } catch {
      toast({ title: 'Re-upload failed', description: 'Please try again.', variant: 'destructive' })
    }
  }

  async function handleCancel() {
    if (!selectedDoc) return
    const docId = selectedDoc.id
    setSelectedDoc(null)
    try {
      await cancelDocument(docId)
      queryClient.invalidateQueries({ queryKey: ['client-documents-upload'] })
      toast({ title: 'Document withdrawn.' })
    } catch {
      toast({ title: 'Could not withdraw document', description: 'Please try again.', variant: 'destructive' })
    }
  }

  return (
    <div className="space-y-5">
      <div>
        <div className="text-lg font-bold text-gray-900 tracking-tight mb-0.5">Upload Documents</div>
        <div className="text-xs text-gray-400">Drop files into the correct zone below</div>
      </div>

      <TwoAreaUpload
        onFilePicked={handleFilePicked}
        onManualSuccess={handleManualSuccess}
        incomeCount={incomeCount}
        expenseCount={expenseCount}
      />

      <ConfirmUploadDialog
        open={pendingUpload !== null}
        file={pendingUpload?.file ?? null}
        declaredType={pendingUpload?.declaredType ?? 'income'}
        onConfirm={handleConfirmUpload}
        onCancel={() => setPendingUpload(null)}
      />

      <DocumentsTable
        docs={inProgress}
        onRowClick={setSelectedDoc}
        title="In Progress"
        subtitle="Posted items removed automatically · Click a row for details"
      />

      <DocumentDetailModal
        doc={selectedDoc}
        onClose={() => setSelectedDoc(null)}
        onReupload={handleReupload}
        onCancel={handleCancel}
      />
    </div>
  )
}
```

- [ ] **Step 3: Check TypeScript compiles**

```bash
cd frontend && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/components/upload/TwoAreaUpload.tsx \
        frontend/src/app/client/upload/page.tsx
git commit -m "feat: wire two-step upload flow with confirmation dialog"
```

---

## Task 7: Frontend — Show note in DocumentDetailModal

**Files:**
- Modify: `frontend/src/components/documents/DocumentDetailModal.tsx:69-93` (the `DocMetaCard` function)

- [ ] **Step 1: Add note row to DocMetaCard**

In `frontend/src/components/documents/DocumentDetailModal.tsx`, update the `DocMetaCard` function (lines 69–93). Add the note row after the Status row:

```tsx
function DocMetaCard({ doc }: { doc: Document }) {
  const date = doc.date ?? doc.createdAt.slice(0, 10)
  return (
    <div className="mt-3 rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 space-y-2 text-xs">
      {doc.merchantName && (
        <div className="flex items-center justify-between">
          <span className="text-gray-500">Merchant</span>
          <span className="font-semibold text-gray-800">{doc.merchantName}</span>
        </div>
      )}
      <div className="flex items-center justify-between">
        <span className="text-gray-500">Date</span>
        <span className="font-semibold text-gray-800">{date}</span>
      </div>
      <div className="flex items-center justify-between">
        <span className="text-gray-500">Declared type</span>
        <TypeBadge type={doc.declaredType} />
      </div>
      <div className="flex items-center justify-between">
        <span className="text-gray-500">Status</span>
        <StatusBadge status={doc.status} />
      </div>
      {doc.note && (
        <div className="pt-1 border-t border-gray-200">
          <div className="text-gray-500 mb-1">Note</div>
          <div className="text-gray-700 leading-relaxed">{doc.note}</div>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Check TypeScript compiles**

```bash
cd frontend && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/documents/DocumentDetailModal.tsx
git commit -m "feat: show user note in document detail modal"
```

---

## Verification

- [ ] **Run all backend tests**

```bash
cd backend && php artisan test
```

Expected: all tests pass including the two new test classes.

- [ ] **Run TypeScript check**

```bash
cd frontend && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Manual smoke test**
  1. Open the upload page
  2. Drop a file onto the Income zone
  3. Confirm the dialog appears with the file name, size, and Income badge
  4. Type a note and click "Confirm & Upload"
  5. Confirm the document appears in the In Progress table
  6. Click the row to open DocumentDetailModal
  7. Once processing completes, confirm the note is visible in the left column under Status
