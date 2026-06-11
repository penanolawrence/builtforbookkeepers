# Submit Tab — Client Modals Design

**Date:** 2026-06-11
**Scope:** Accountant `ClientDetailModal` and Admin `ClientModal`

## Overview

Add a 4th **"Submit"** tab to both client modals that allows accountants and admins to upload income/expense documents or create manual entries on behalf of a client. Reuses the existing `TwoAreaUpload` + `ManualEntryForm` + `ConfirmUploadDialog` component stack.

## Backend

### Authorization

Both `DocumentController::upload()` and `DocumentController::manualEntry()` accept an optional `client_id` request param.

When `client_id` is present:
- **Admin role:** always allowed — resolve target company via `client_id`
- **Accountant role:** verify the client is assigned to the authenticated accountant; return 403 if not
- Company used for the document is the resolved client's company

When `client_id` is absent: falls back to `$user->company_id` (existing behavior for client self-upload — no behavior change).

The authorization guard is added at the top of each method before company resolution.

## Frontend API Layer

`uploadDocument(file, declaredType, note?, clientId?)` — add optional `clientId` param; include as `client_id` in FormData when provided.

`createManualEntry(payload & { clientId? })` — add optional `clientId` to payload; include as `client_id` in JSON body when provided.

No changes to return types or error handling.

## Component Changes

### `TwoAreaUpload`

Add optional `clientId?: string` prop. Thread it:
- Into the `uploadDocument` call
- Into `ManualEntryForm` as a new optional `clientId` prop

Layout, validation, and `ConfirmUploadDialog` behavior unchanged.

### `ManualEntryForm`

Add optional `clientId?: string` prop. Pass to `createManualEntry` when provided.

## New Submit Tab

Add `submit` as the 4th tab value in both modals.

| Modal | `clientId` source |
|---|---|
| `ClientDetailModal` (accountant) | `client.id` from props |
| `ClientModal` (admin) | `clientId` from modal state |

Tab content:

```tsx
<TwoAreaUpload
  clientId={clientId}
  onFilePicked={handleFilePicked}
  onManualSuccess={handleManualSuccess}
/>
```

On `onManualSuccess` and after `ConfirmUploadDialog` completes, invalidate the client documents query so the Documents tab reflects the new entries immediately.

## Authorization Summary

| Role | Allowed clients |
|---|---|
| Admin | Any client |
| Accountant | Only clients assigned to them |
| Client | Self only (unchanged) |
