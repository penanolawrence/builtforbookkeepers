# Multi-File Receipt Upload — Design Spec

**Date:** 2026-06-08
**Status:** Approved

## Goal

Allow clients to pick and upload multiple receipts at once from either the income or expense upload zone, with a single shared confirmation dialog and optional AI context note.

## Scope

Four frontend files change. No backend changes. No new files.

| File | Change |
|---|---|
| `frontend/src/components/upload/UploadZone.tsx` | Multi-select support — fire `File[]` instead of single `File` |
| `frontend/src/components/upload/TwoAreaUpload.tsx` | Prop type update to match |
| `frontend/src/app/client/upload/page.tsx` | State: single pending file → array of pending files |
| `frontend/src/components/upload/ConfirmUploadDialog.tsx` | Redesign for file list + shared note + sequential upload |

## Architecture

### UploadZone

- Add `multiple` attribute to both `fileInputRef` and `cameraInputRef` inputs.
- `onFileSelect: (file: File) => void` → `onFilesSelect: (files: File[]) => void`.
- On change/drop: collect all files from the event, validate each individually (same rules: JPG/PNG/PDF, max 10MB).
- Pass the valid subset up via `onFilesSelect`.
- Display a validation summary inline in the zone for rejected files: `"3 accepted · 1 rejected: foo.bmp — only JPG, PNG, PDF accepted."`

### TwoAreaUpload

- Update `onFilePicked` prop: `(file: File, declaredType: DeclaredType) => void` → `(files: File[], declaredType: DeclaredType) => void`.
- Pass through to `UploadZone.onFilesSelect`.

### upload/page.tsx

- Replace `pendingUpload: { file: File; declaredType: DeclaredType } | null` with `pendingFiles: Array<{ file: File; declaredType: DeclaredType }>`.
- `handleFilePicked(files: File[], declaredType: DeclaredType)` maps files to pending items and sets state.
- Dialog open condition: `pendingFiles.length > 0`.
- On cancel: `setPendingFiles([])`.

### ConfirmUploadDialog

Accepts `files: Array<{ file: File; declaredType: DeclaredType }>` instead of a single `file`.

**Header:** `"Upload 4 Income Documents"` (type label derived from `files[0].declaredType`; since each zone fires its own batch they will always be the same type).

**File list:** Scrollable list (max-height ~220px, overflow-y auto). Each row:
- File icon (📄)
- Filename (truncated) + size
- Income/Expense badge

**Note textarea:** Same as today — shared across all files in the batch, optional.

**Footer buttons:** Cancel | "Upload N files" (disabled while uploading).

**Upload logic:**
1. Set `uploading = true`, disable confirm button.
2. Loop through files sequentially — `await uploadDocument(f.file, f.declaredType, note)`.
3. Track failures in a local array.
4. After loop: `setPendingFiles([])`, invalidate query, show toast.
   - All succeeded: no toast (table update is sufficient feedback).
   - Some failed: `"2 of 4 uploads failed — please try again."`
   - All failed: `"Upload failed — please try again."`

## Data Flow

```
UploadZone (income)
  └─ onFilesSelect(File[])
       └─ TwoAreaUpload → onFilePicked(files, 'income')
            └─ page: setPendingFiles([...files.map(f => ({ file: f, declaredType: 'income' }))])
                  └─ ConfirmUploadDialog opens
                       └─ onConfirm(note)
                            └─ sequential uploadDocument() × N
                                 └─ queryClient.invalidateQueries(['client-documents-upload'])
```

## Error Handling

| Scenario | Behaviour |
|---|---|
| File too large or wrong type | Rejected silently from the batch; error shown inline in the zone |
| All files rejected by validation | `onFilesSelect` fires with empty array — dialog does not open |
| Network error on one file | Continue remaining uploads; report failures in final toast |
| All files fail to upload | Toast: "Upload failed — please try again." |

## What Does Not Change

- Desktop and mobile layouts are unchanged.
- The manual entry flow (`ManualEntryForm`) is unchanged.
- The re-upload flow (`reuploadDocument`) is unchanged.
- Backend API (`POST /documents`) is unchanged — called N times sequentially.
- The `count` badge on each zone reflects uploaded count for the month (unchanged).
