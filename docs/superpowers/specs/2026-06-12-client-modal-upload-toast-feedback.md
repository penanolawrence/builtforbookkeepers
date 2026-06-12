# Client Modal Upload — Toast Feedback

**Date:** 2026-06-12

## Problem

When an accountant or admin uploads files on behalf of a client through `SubmitTab` (inside `ClientModal` / `ClientDetailModal`), there is no visual feedback during or after the upload. The confirm button stays active while files are uploading, and no success toast fires on completion. `ManualEntryForm` also silently swallows errors.

## Scope

Three files, no backend changes needed.

---

## Changes

### 1. `ConfirmUploadDialog` — add `uploading` prop

- Accept `uploading?: boolean` prop.
- While `uploading` is true: disable the confirm button, change its label to "Uploading…", and prevent dialog dismissal via `onOpenChange`.

### 2. `SubmitTab` — pass state + add success toast

- Pass the existing `uploading` state into `ConfirmUploadDialog`.
- After `handleConfirmUpload` completes with zero failures, show a success toast: `"X file(s) submitted — processing…"`.
- Partial-failure and full-failure error toasts remain unchanged.

### 3. `ManualEntryForm` — add error toast

- Import `useToast`.
- In `handleSubmit`, catch errors and show a destructive toast: `"Submission failed — please try again."`.
- Button already shows "Submitting…" and is disabled during submission; no change needed there.

---

## Toast messages

| Event | Variant | Title |
|---|---|---|
| All files uploaded | default | `"X file(s) submitted — processing…"` |
| Some files failed | destructive | `"X of Y uploads failed — please try again."` |
| All files failed | destructive | `"Upload failed — please try again."` |
| Manual entry error | destructive | `"Submission failed — please try again."` |

---

## Files changed

| File | Change |
|---|---|
| `frontend/src/components/upload/ConfirmUploadDialog.tsx` | Add `uploading` prop, disable + relabel confirm button |
| `frontend/src/components/upload/SubmitTab.tsx` | Pass `uploading` to dialog, add success toast |
| `frontend/src/components/upload/ManualEntryForm.tsx` | Add error toast on catch |
