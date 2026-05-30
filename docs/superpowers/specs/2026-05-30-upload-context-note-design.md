# Upload Context Note — Design Spec

**Date:** 2026-05-30  
**Status:** Approved

---

## Problem

When a user uploads a document, the AI classifier has no information beyond the image/OCR text and the declared income/expense type. Users often know details about a document that the OCR cannot extract (e.g. "this is a Meralco bill for May, includes VAT") — passing that context to Claude would improve classification accuracy.

The `note` column already exists on the `documents` table (migration `2026_05_29_000020_add_note_to_documents_table.php`) and is in `Document::$fillable`, but is never populated or used.

---

## Solution

Add an optional confirmation step between file drop/selection and the actual upload. After the user picks a file, a modal appears showing the file info and an optional textarea for context. On confirm, the note is stored on the Document and injected into the Claude prompt.

---

## Architecture

```
UploadZone (onFilePicked) 
  → upload/page.tsx sets pendingUpload state
  → ConfirmUploadDialog (file card + textarea)
  → handleConfirmUpload(note)
  → uploadDocument(file, type, note)
  → POST /documents { file, declared_type, note }
  → DocumentController stores note on Document
  → ClassifyWithAI passes note to TransactionClassifier
  → Claude prompt includes user-provided context
  → toDetail() returns note
  → DocumentDetailModal renders note
```

---

## Section 1 — Frontend: Confirmation Dialog

### UploadZone (`frontend/src/components/upload/UploadZone.tsx`)

- Rename `onUpload` prop to `onFilePicked`
- It fires immediately on drop or browse-select — no upload happens inside UploadZone
- No other logic changes

### upload/page.tsx (`frontend/src/app/client/upload/page.tsx`)

New state:
```typescript
const [pendingUpload, setPendingUpload] = useState<{
  file: File
  declaredType: 'income' | 'expense'
} | null>(null)
```

- `handleFilePicked(file, declaredType)` — sets `pendingUpload`, opens dialog
- `handleConfirmUpload(note: string)` — calls `uploadDocument(pendingUpload.file, pendingUpload.declaredType, note)`, then clears `pendingUpload`
- `handleCancelUpload()` — clears `pendingUpload`

Render `<ConfirmUploadDialog>` below the upload zones, controlled by `pendingUpload !== null`.

### New component: ConfirmUploadDialog (`frontend/src/components/upload/ConfirmUploadDialog.tsx`)

Props:
```typescript
interface ConfirmUploadDialogProps {
  open: boolean
  file: File | null
  declaredType: 'income' | 'expense'
  onConfirm: (note: string) => void
  onCancel: () => void
}
```

Layout (shadcn `Dialog`):
- **Title:** "Upload Income Document" or "Upload Expense Document"
- **File card:** document icon, filename, type badge (green "Income" / red "Expense"), formatted file size, "dropped" tag
- **Context section:**
  - Label: "Add context for our AI" with "(optional but helpful)" in muted text
  - Subtext: "Describe what this document is — the more you tell us, the more accurately we can classify it."
  - `Textarea` with placeholder: `e.g. Monthly electricity bill from Meralco for May 2026, includes VAT`
  - Tips line: **Tips:** Mention the supplier or customer name, what the payment is for, or any special classification (e.g. "this is a VAT-exempt sale" or "petty cash reimbursement").
- **Footer:** Cancel button + "Confirm & Upload" primary button
- Internal state: `note: string` (controlled textarea)
- On confirm: calls `onConfirm(note.trim())`
- On cancel or dialog close: calls `onCancel()`

### API (`frontend/src/lib/api/documents.ts`)

`uploadDocument(file, declaredType, note?: string)`:
- Add `note` parameter (optional, defaults to empty string)
- Append to FormData: `formData.append('note', note ?? '')`

---

## Section 2 — Backend: Store the Note

### UploadDocumentRequest (`backend/app/Http/Requests/Document/UploadDocumentRequest.php`)

Add to `rules()`:
```php
'note' => ['nullable', 'string', 'max:1000'],
```

### DocumentController `upload()` (`backend/app/Http/Controllers/DocumentController.php`)

In the `Document::create([...])` call, add:
```php
'note' => $request->note,
```

The `note` column is already in `Document::$fillable` — no model changes needed.

---

## Section 3 — AI Classifier: Include Note in Prompt

### ClassifyWithAI (`backend/app/Jobs/ClassifyWithAI.php`)

Pass the document's note as a third argument to the classifier:
```php
TransactionClassifier::classify($inputData, $company, $this->document->note)
```

### TransactionClassifier (`backend/app/Services/AI/TransactionClassifier.php`)

`classify()` signature gains `?string $userNote = null`.

Each prompt builder appends this block when `$userNote` is non-empty:

```
User-provided context: "<note>"
Use this as additional context when classifying the document.
```

This is appended at the end of the user message content, just before the classification instruction, for all three paths (image, OCR, manual).

---

## Section 4 — Document Detail Modal: Show the Note

### DocumentController `toDetail()` (`backend/app/Http/Controllers/DocumentController.php`)

Add to the returned array:
```php
'note' => $d->note,
```

### TypeScript Document type (`frontend/src/types/document.ts`)

Add to the `Document` interface:
```typescript
note: string | null
```

### DocumentDetailModal (`frontend/src/components/documents/DocumentDetailModal.tsx`)

In the document metadata section (alongside merchant, date, etc.), render a "Note" row when `document.note` is non-null:
- Label: "Note"
- Value: `document.note` as plain text
- Uses the existing label/value styling pattern in the modal

---

## What Is Not Changed

- `documents.amount` — untouched
- `documents.account_id` — untouched
- Manual entry form (`ManualEntryForm`) — no note field added (manual entries have per-line descriptions already)
- OCR pipeline (`ProcessDocumentOCR`) — untouched; note is read in `ClassifyWithAI` after OCR completes
- `DetectAnomalies` job — untouched

---

## Files Touched

| File | Change |
|---|---|
| `frontend/src/components/upload/UploadZone.tsx` | Rename `onUpload` → `onFilePicked` |
| `frontend/src/app/client/upload/page.tsx` | Add pending state, confirmation handlers |
| `frontend/src/components/upload/ConfirmUploadDialog.tsx` | New component |
| `frontend/src/lib/api/documents.ts` | Add `note` param to `uploadDocument` |
| `frontend/src/types/document.ts` | Add `note: string \| null` |
| `frontend/src/components/documents/DocumentDetailModal.tsx` | Render note row |
| `backend/app/Http/Requests/Document/UploadDocumentRequest.php` | Add note validation |
| `backend/app/Http/Controllers/DocumentController.php` | Store note, return note in toDetail |
| `backend/app/Jobs/ClassifyWithAI.php` | Pass note to classifier |
| `backend/app/Services/AI/TransactionClassifier.php` | Accept and inject note into prompt |
