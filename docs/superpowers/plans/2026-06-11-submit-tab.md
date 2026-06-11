# Submit Tab — Client Modals Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a "Submit" tab to the accountant `ClientDetailModal` and admin `ClientModal` so accountants/admins can upload income/expense documents or create manual entries on behalf of a client.

**Architecture:** Extend the existing `upload()` and `manualEntry()` backend endpoints with an optional `client_id` param (admin: always allowed; accountant: must be their assigned client). Thread `clientId` through the frontend API layer and upload components, then add a new `SubmitTab` component that wraps `TwoAreaUpload` + `ConfirmUploadDialog` and is rendered as the 4th tab in both modals.

**Tech Stack:** Laravel 11 (PHP), Next.js 14 App Router, TypeScript, React Query, shadcn/ui

---

## File Map

| Action | File |
|--------|------|
| Modify | `backend/app/Http/Controllers/DocumentController.php` |
| Create | `backend/tests/Feature/SubmitOnBehalfTest.php` |
| Modify | `frontend/src/lib/api/documents.ts` |
| Modify | `frontend/src/components/upload/ManualEntryForm.tsx` |
| Modify | `frontend/src/components/upload/TwoAreaUpload.tsx` |
| Create | `frontend/src/components/upload/SubmitTab.tsx` |
| Modify | `frontend/src/components/accountant/ClientDetailModal.tsx` |
| Modify | `frontend/src/components/admin/ClientModal.tsx` |

---

## Task 1: Backend — extend `upload()` with `client_id`

**Files:**
- Modify: `backend/app/Http/Controllers/DocumentController.php:20-24`

- [ ] **Step 1: Write the failing test** (create `backend/tests/Feature/SubmitOnBehalfTest.php` with upload tests only — manual entry tests added in Task 2)

```php
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
        $this->assertDatabaseHas('documents', ['company_id' => $company->id]);
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
        $this->assertDatabaseHas('documents', ['company_id' => $company->id]);
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
}
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd backend && php artisan test --filter SubmitOnBehalfTest
```

Expected: 4 failures — upload method still resolves company from `$user->company_id` only.

- [ ] **Step 3: Implement — replace lines 22-23 of `DocumentController::upload()`**

Replace:
```php
$user    = auth()->user();
$company = Company::findOrFail($user->company_id);
```

With:
```php
$user = auth()->user();

if ($request->filled('client_id')) {
    $company = Company::findOrFail($request->client_id);

    if ($user->role === 'accountant' && $company->accountant_id !== $user->id) {
        return response()->json(['message' => 'Forbidden.'], 403);
    }
} else {
    $company = Company::findOrFail($user->company_id);
}
```

The rest of the `upload()` method is unchanged — it already uses `$company->id` throughout.

- [ ] **Step 4: Run the upload tests — expect 4 passing**

```bash
cd backend && php artisan test --filter SubmitOnBehalfTest
```

Expected: 4 tests pass (manual entry tests not yet written — that's fine).

- [ ] **Step 5: Commit**

```bash
git add backend/app/Http/Controllers/DocumentController.php backend/tests/Feature/SubmitOnBehalfTest.php
git commit -m "feat(backend): extend upload endpoint to accept client_id for admin/accountant"
```

---

## Task 2: Backend — extend `manualEntry()` with `client_id`

**Files:**
- Modify: `backend/app/Http/Controllers/DocumentController.php:241-244`
- Modify: `backend/tests/Feature/SubmitOnBehalfTest.php` (append tests)

- [ ] **Step 1: Append manual entry tests to `SubmitOnBehalfTest.php`**

Add these methods inside the `SubmitOnBehalfTest` class, after `test_upload_without_client_id_uses_own_company`:

```php
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
    $this->assertDatabaseHas('documents', ['company_id' => $company->id]);
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
    $this->assertDatabaseHas('documents', ['company_id' => $company->id]);
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
```

- [ ] **Step 2: Run the new tests to verify they fail**

```bash
cd backend && php artisan test --filter SubmitOnBehalfTest
```

Expected: 3 new failures (the 4 upload tests still pass).

- [ ] **Step 3: Implement — replace lines 243-244 of `DocumentController::manualEntry()`**

Replace:
```php
$user       = auth()->user();
$company    = Company::findOrFail($user->company_id);
$refService = new RefSequenceService();
```

With:
```php
$user = auth()->user();

if ($request->filled('client_id')) {
    $company = Company::findOrFail($request->client_id);

    if ($user->role === 'accountant' && $company->accountant_id !== $user->id) {
        return response()->json(['message' => 'Forbidden.'], 403);
    }
} else {
    $company = Company::findOrFail($user->company_id);
}

$refService = new RefSequenceService();
```

- [ ] **Step 4: Run all `SubmitOnBehalfTest` tests — expect 7 passing**

```bash
cd backend && php artisan test --filter SubmitOnBehalfTest
```

Expected: 7 tests pass.

- [ ] **Step 5: Run full test suite to check for regressions**

```bash
cd backend && php artisan test
```

Expected: all tests pass.

- [ ] **Step 6: Commit**

```bash
git add backend/app/Http/Controllers/DocumentController.php backend/tests/Feature/SubmitOnBehalfTest.php
git commit -m "feat(backend): extend manualEntry endpoint to accept client_id for admin/accountant"
```

---

## Task 3: Frontend API — add `clientId` to `uploadDocument` and `createManualEntry`

**Files:**
- Modify: `frontend/src/lib/api/documents.ts`

- [ ] **Step 1: Update `uploadDocument` signature (lines 4-15)**

Replace:
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

With:
```typescript
export async function uploadDocument(
  file: File,
  declaredType: DeclaredType,
  note?: string,
  clientId?: string
): Promise<{ documentId: string }> {
  const form = new FormData()
  form.append('file', file)
  form.append('declared_type', declaredType)
  if (note) form.append('note', note)
  if (clientId) form.append('client_id', clientId)
  const { data } = await api.post<{ documentId: string }>('/documents', form)
  return data
}
```

- [ ] **Step 2: Update `createManualEntry` signature (lines 64-80)**

Replace:
```typescript
export async function createManualEntry(payload: {
  declaredType: DeclaredType
  date: string
  paymentMethod: string
  lines: ManualEntryLine[]
}): Promise<{ documentId: string }> {
  const { data } = await api.post<{ documentId: string }>('/documents/manual', {
    declared_type:  payload.declaredType,
    date:           payload.date,
    payment_method: payload.paymentMethod,
    lines:          payload.lines.map((l) => ({
      description: l.description,
      amount:      l.amount,
    })),
  })
  return data
}
```

With:
```typescript
export async function createManualEntry(payload: {
  declaredType: DeclaredType
  date: string
  paymentMethod: string
  lines: ManualEntryLine[]
  clientId?: string
}): Promise<{ documentId: string }> {
  const { data } = await api.post<{ documentId: string }>('/documents/manual', {
    declared_type:  payload.declaredType,
    date:           payload.date,
    payment_method: payload.paymentMethod,
    lines:          payload.lines.map((l) => ({
      description: l.description,
      amount:      l.amount,
    })),
    ...(payload.clientId ? { client_id: payload.clientId } : {}),
  })
  return data
}
```

- [ ] **Step 3: Verify TypeScript compiles cleanly**

```bash
cd frontend && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/lib/api/documents.ts
git commit -m "feat(api): add optional clientId to uploadDocument and createManualEntry"
```

---

## Task 4: `ManualEntryForm` — add `clientId` prop

**Files:**
- Modify: `frontend/src/components/upload/ManualEntryForm.tsx`

- [ ] **Step 1: Add `clientId` to the Props interface (lines 14-18)**

Replace:
```typescript
interface Props {
  open: boolean
  onClose: () => void
  onSuccess: (documentId: string) => void
}
```

With:
```typescript
interface Props {
  open: boolean
  onClose: () => void
  onSuccess: (documentId: string) => void
  clientId?: string
}
```

- [ ] **Step 2: Destructure `clientId` from props (line 24)**

Replace:
```typescript
export function ManualEntryForm({ open, onClose, onSuccess }: Props) {
```

With:
```typescript
export function ManualEntryForm({ open, onClose, onSuccess, clientId }: Props) {
```

- [ ] **Step 3: Pass `clientId` to `createManualEntry` (inside `handleSubmit`, lines 78-86)**

Replace:
```typescript
const { documentId } = await createManualEntry({
  declaredType:  type,
  date,
  paymentMethod,
  lines: filledLines.map((l) => ({
    description: l.description.trim(),
    amount:      parseFloat(l.amount),
  })),
})
```

With:
```typescript
const { documentId } = await createManualEntry({
  declaredType:  type,
  date,
  paymentMethod,
  lines: filledLines.map((l) => ({
    description: l.description.trim(),
    amount:      parseFloat(l.amount),
  })),
  clientId,
})
```

- [ ] **Step 4: Verify TypeScript compiles cleanly**

```bash
cd frontend && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/upload/ManualEntryForm.tsx
git commit -m "feat(upload): add clientId prop to ManualEntryForm"
```

---

## Task 5: `TwoAreaUpload` — add `clientId` prop

**Files:**
- Modify: `frontend/src/components/upload/TwoAreaUpload.tsx`

- [ ] **Step 1: Add `clientId` to the Props interface (lines 8-13)**

Replace:
```typescript
interface Props {
  onFilePicked: (files: File[], declaredType: DeclaredType) => void
  onManualSuccess: (documentId: string) => void
  incomeCount?: number
  expenseCount?: number
}
```

With:
```typescript
interface Props {
  onFilePicked: (files: File[], declaredType: DeclaredType) => void
  onManualSuccess: (documentId: string) => void
  incomeCount?: number
  expenseCount?: number
  clientId?: string
}
```

- [ ] **Step 2: Destructure `clientId` and pass it to `ManualEntryForm` (line 15 and line 45)**

Replace:
```typescript
export function TwoAreaUpload({ onFilePicked, onManualSuccess, incomeCount, expenseCount }: Props) {
```

With:
```typescript
export function TwoAreaUpload({ onFilePicked, onManualSuccess, incomeCount, expenseCount, clientId }: Props) {
```

Replace:
```typescript
<ManualEntryForm
  open={manualOpen}
  onClose={() => setManualOpen(false)}
  onSuccess={(id) => {
    setManualOpen(false)
    onManualSuccess(id)
  }}
/>
```

With:
```typescript
<ManualEntryForm
  open={manualOpen}
  onClose={() => setManualOpen(false)}
  onSuccess={(id) => {
    setManualOpen(false)
    onManualSuccess(id)
  }}
  clientId={clientId}
/>
```

- [ ] **Step 3: Verify TypeScript compiles cleanly**

```bash
cd frontend && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/components/upload/TwoAreaUpload.tsx
git commit -m "feat(upload): thread clientId prop through TwoAreaUpload to ManualEntryForm"
```

---

## Task 6: Create `SubmitTab` component

**Files:**
- Create: `frontend/src/components/upload/SubmitTab.tsx`

`SubmitTab` manages the `pendingFiles` state and `ConfirmUploadDialog` locally, mirroring the pattern in `client/upload/page.tsx` but scoped to a `clientId` and a caller-supplied query key prefix for invalidation.

- [ ] **Step 1: Create `frontend/src/components/upload/SubmitTab.tsx`**

```typescript
'use client'

import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useToast } from '@/hooks/use-toast'
import { TwoAreaUpload } from './TwoAreaUpload'
import { ConfirmUploadDialog } from './ConfirmUploadDialog'
import { uploadDocument } from '@/lib/api/documents'
import type { DeclaredType } from '@/types/document'

interface PendingFile {
  file: File
  declaredType: DeclaredType
}

interface Props {
  clientId: string
  docsQueryKey: unknown[]
}

export function SubmitTab({ clientId, docsQueryKey }: Props) {
  const qc                                  = useQueryClient()
  const { toast }                           = useToast()
  const [pendingFiles, setPendingFiles]     = useState<PendingFile[]>([])
  const [uploading,    setUploading]        = useState(false)

  function handleFilePicked(files: File[], declaredType: DeclaredType) {
    if (uploading) return
    setPendingFiles(files.map((file) => ({ file, declaredType })))
  }

  async function handleConfirmUpload(note: string) {
    const batch = pendingFiles
    setPendingFiles([])
    setUploading(true)
    const failed: string[] = []
    for (const { file, declaredType } of batch) {
      try {
        await uploadDocument(file, declaredType, note || undefined, clientId)
      } catch {
        failed.push(file.name)
      }
    }
    setUploading(false)
    qc.invalidateQueries({ queryKey: docsQueryKey })
    if (failed.length > 0) {
      const total = batch.length
      toast({
        title: failed.length === total
          ? 'Upload failed — please try again.'
          : `${failed.length} of ${total} uploads failed — please try again.`,
        variant: 'destructive',
      })
    }
  }

  function handleManualSuccess() {
    qc.invalidateQueries({ queryKey: docsQueryKey })
    toast({ title: 'Entry submitted — processing…' })
  }

  return (
    <div style={{ padding: '20px 28px' }}>
      <TwoAreaUpload
        clientId={clientId}
        onFilePicked={handleFilePicked}
        onManualSuccess={handleManualSuccess}
      />
      <ConfirmUploadDialog
        open={pendingFiles.length > 0}
        files={pendingFiles}
        onConfirm={handleConfirmUpload}
        onCancel={() => setPendingFiles([])}
      />
    </div>
  )
}
```

- [ ] **Step 2: Verify TypeScript compiles cleanly**

```bash
cd frontend && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/upload/SubmitTab.tsx
git commit -m "feat(upload): add SubmitTab component for on-behalf-of upload/manual-entry"
```

---

## Task 7: Add Submit tab to `ClientDetailModal` (accountant)

**Files:**
- Modify: `frontend/src/components/accountant/ClientDetailModal.tsx`

- [ ] **Step 1: Extend the `Tab` type (line 13)**

Replace:
```typescript
type Tab = 'overview' | 'documents' | 'coa'
```

With:
```typescript
type Tab = 'overview' | 'documents' | 'coa' | 'submit'
```

- [ ] **Step 2: Add `SubmitTab` import at the top of the file**

After the existing imports, add:
```typescript
import { SubmitTab } from '@/components/upload/SubmitTab'
```

- [ ] **Step 3: Add the Submit tab to the tabs array (lines 386-389)**

Replace:
```typescript
const tabs: { id: Tab; label: string }[] = [
  { id: 'overview',  label: 'Overview' },
  { id: 'documents', label: 'Documents' },
  { id: 'coa',       label: 'Chart of Accounts' },
```

With:
```typescript
const tabs: { id: Tab; label: string }[] = [
  { id: 'overview',  label: 'Overview' },
  { id: 'documents', label: 'Documents' },
  { id: 'coa',       label: 'Chart of Accounts' },
  { id: 'submit',    label: 'Submit' },
```

- [ ] **Step 4: Add the Submit tab content panel**

In the tab content area, after the existing `{tab === 'coa' && ...}` block, add:

```typescript
{tab === 'submit' && (
  <SubmitTab
    clientId={client.id}
    docsQueryKey={['client-modal-docs', client.id]}
  />
)}
```

- [ ] **Step 5: Verify TypeScript compiles cleanly**

```bash
cd frontend && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/components/accountant/ClientDetailModal.tsx
git commit -m "feat(accountant): add Submit tab to ClientDetailModal"
```

---

## Task 8: Add Submit tab to `ClientModal` (admin, detail mode only)

**Files:**
- Modify: `frontend/src/components/admin/ClientModal.tsx`

- [ ] **Step 1: Extend the `Tab` type (line 24)**

Replace:
```typescript
type Tab = 'overview' | 'documents' | 'coa'
```

With:
```typescript
type Tab = 'overview' | 'documents' | 'coa' | 'submit'
```

- [ ] **Step 2: Add `SubmitTab` import**

After the existing imports, add:
```typescript
import { SubmitTab } from '@/components/upload/SubmitTab'
```

- [ ] **Step 3: Add Submit to the tab list in `DetailMode` (line 500)**

Replace:
```typescript
{(['overview', 'documents', 'coa'] as Tab[]).map((t) => (
```

With:
```typescript
{(['overview', 'documents', 'coa', 'submit'] as Tab[]).map((t) => (
```

- [ ] **Step 4: Update the tab label ternary (line 510)**

Replace:
```typescript
{t === 'overview' ? 'Overview' : t === 'documents' ? 'Documents' : 'Chart of Accounts'}
```

With:
```typescript
{t === 'overview' ? 'Overview' : t === 'documents' ? 'Documents' : t === 'coa' ? 'Chart of Accounts' : 'Submit'}
```

- [ ] **Step 5: Add the Submit tab content panel**

After the `{tab === 'coa' && ...}` block, add:

```typescript
{tab === 'submit' && (
  <SubmitTab
    clientId={clientId}
    docsQueryKey={['admin-client-docs', clientId]}
  />
)}
```

- [ ] **Step 6: Verify TypeScript compiles cleanly**

```bash
cd frontend && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 7: Commit**

```bash
git add frontend/src/components/admin/ClientModal.tsx
git commit -m "feat(admin): add Submit tab to ClientModal detail mode"
```
