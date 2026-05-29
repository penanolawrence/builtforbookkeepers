# Design: MinIO Presigned URL Public Hostname Fix

**Date:** 2026-05-30  
**Status:** Approved

## Problem

`Storage::disk('s3')->temporaryUrl()` generates presigned URLs using `AWS_ENDPOINT` as the base (`http://minio:9000`). This is the Docker-internal hostname — reachable by backend containers but not by the browser. The browser can only reach MinIO via `localhost:9000` in dev, or a public domain in production.

## Approach

URL rewrite after generation. Add a `MINIO_PUBLIC_URL` env var representing the browser-accessible base URL for the storage service. After calling `temporaryUrl()`, replace the internal endpoint hostname with the public one.

If `MINIO_PUBLIC_URL` is unset (e.g., production using real AWS S3), no rewrite occurs and the presigned URL is returned as-is.

## Changes

### 1. `config/filesystems.php` — `s3` disk

Add one key to the `s3` disk config:

```php
's3' => [
    // existing keys unchanged
    'public_url' => env('MINIO_PUBLIC_URL'),
],
```

### 2. `app/Http/Controllers/DocumentController.php` — `documentImage()`

After generating the presigned URL, apply the hostname rewrite:

```php
$url       = Storage::disk('s3')->temporaryUrl($document->storage_path, now()->addMinutes(15));
$expiresAt = now()->addMinutes(15)->toIso8601String();

$publicBase   = config('filesystems.disks.s3.public_url');
$internalBase = config('filesystems.disks.s3.endpoint');
if ($publicBase && $internalBase) {
    $url = str_replace(rtrim($internalBase, '/'), rtrim($publicBase, '/'), $url);
}

return response()->json(['url' => $url, 'expiresAt' => $expiresAt]);
```

### 3. Environment variables

**.env (dev):**
```
MINIO_PUBLIC_URL=http://localhost:9000
```

**Production `.env` / secrets (MinIO):**
```
MINIO_PUBLIC_URL=https://storage.sofiabooks.com
```

**Production (AWS S3):** `MINIO_PUBLIC_URL` is left unset — no rewrite needed.

## Behaviour by Environment

| Environment     | `AWS_ENDPOINT`        | `MINIO_PUBLIC_URL`               | Result               |
|-----------------|-----------------------|----------------------------------|----------------------|
| Local dev       | `http://minio:9000`   | `http://localhost:9000`          | Hostname rewritten   |
| Prod (MinIO)    | `http://minio:9000`   | `https://storage.sofiabooks.com` | Hostname rewritten   |
| Prod (AWS S3)   | *(not set)*           | *(not set)*                      | URL unchanged        |

## Scope

- 1 config key added
- 4 lines added to one controller method
- 1 env var added to `.env` (dev) and production secrets
- No new files, no new abstractions
