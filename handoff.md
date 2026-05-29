# Sofia Books — Agent Handoff

**Date:** 2026-05-29  
**Status:** Plan approved, implementation not started  
**Next action:** Implement the multi-line transaction classification feature described below.

---

## Context

Sofia Books is a Philippine SME bookkeeping SaaS.  
**Stack:** Laravel 11 backend, Next.js 14 frontend, Claude Haiku AI classifier, PaddleOCR.  
Working directory: `c:\sofia-books`

---

## Problem Being Solved

The current system maps **one document → one account code → one amount.** This is wrong for documents that span multiple account categories.

**Example (upload path):**  
A receipt says: "Received payment — 500 for services, 500 for sales."  
Currently the AI picks one account code and one amount.  
It should produce **two lines** (Service Revenue 500, Sales Revenue 500) that tally to 1000.

**Example (manual entry):**  
User adds: "500 income from sales" and "200 bayad kuryente (electricity)."  
These should be two lines under one document, not two separate documents.

---

## Files to Know Before Starting

| File | Role |
|---|---|
| `backend/app/Services/AI/TransactionClassifier.php` | AI prompt + Claude API call |
| `backend/app/Jobs/ClassifyWithAI.php` | Reads AI result, writes to `documents` table |
| `backend/app/Http/Controllers/DocumentController.php` | `toListItem()` / `toDetail()` shapes API response |
| `backend/app/Models/Document.php` | Document model — currently has single `account_id` |
| `backend/database/migrations/2025_01_01_000006_create_documents_table.php` | Original documents schema |
| `frontend/src/types/document.ts` | TypeScript Document type |
| `frontend/src/components/documents/DocumentCard.tsx` | Current card component (being replaced) |
| `frontend/src/app/client/documents/page.tsx` | Client documents list page |

---

## Implementation Plan

Work through these steps in order.

---

### Step 1 — New `transaction_lines` migration + model

Create a new migration file in `backend/database/migrations/` named with today's date.

**Schema:**
```php
Schema::create('transaction_lines', function (Blueprint $table) {
    $table->uuid('id')->primary();
    $table->foreignUuid('document_id')->references('id')->on('documents')->cascadeOnDelete();
    $table->foreignUuid('account_id')->nullable()->references('id')->on('accounts')->nullOnDelete();
    $table->string('account_code')->nullable();
    $table->enum('type', ['income', 'expense']);
    $table->string('category')->nullable();
    $table->decimal('amount', 15, 2);
    $table->string('description')->nullable();
    $table->timestamps();

    $table->index('document_id');
});
```

**New model:** `backend/app/Models/TransactionLine.php`
```php
class TransactionLine extends Model
{
    use HasUuids;

    protected $fillable = [
        'document_id', 'account_id', 'account_code',
        'type', 'category', 'amount', 'description',
    ];

    protected $casts = ['amount' => 'decimal:2'];

    public function document(): BelongsTo
    {
        return $this->belongsTo(Document::class);
    }

    public function account(): BelongsTo
    {
        return $this->belongsTo(Account::class);
    }
}
```

---

### Step 2 — Update `Document` model

Add the relationship to `backend/app/Models/Document.php`:
```php
public function transactionLines(): HasMany
{
    return $this->hasMany(TransactionLine::class);
}
```

---

### Step 3 — Rewrite the AI prompt in `TransactionClassifier.php`

Replace the current single-classification prompt with one that returns an **array of lines**.

**New response shape:**
```json
{
  "lines": [
    {
      "accountCode": "4001",
      "type": "income",
      "category": "Service Revenue",
      "amount": 500.00,
      "description": "Services"
    },
    {
      "accountCode": "4002",
      "type": "income",
      "category": "Sales Revenue",
      "amount": 500.00,
      "description": "Product sales"
    }
  ],
  "totalAmount": 1000.00,
  "confidence": 0.9,
  "cleanedFields": {
    "merchant": "string or null",
    "date": "YYYY-MM-DD or null",
    "vat_amount": 0.00,
    "or_number": "string or null"
  }
}
```

**Key prompt rules to enforce:**
- `sum(lines[].amount)` MUST equal `totalAmount`
- Each `accountCode` must be a valid code from the Chart of Accounts provided in the system prompt
- Use one line for simple single-purpose documents; multiple lines only when the document clearly covers multiple categories
- `cleanedFields` is only populated on the OCR path; return `{}` for manual entry

**Also:** bump `maxTokens` from `512` to `1024`.

---

### Step 4 — Update `ClassifyWithAI.php`

Replace the block that sets `document->account_id` (lines 86–89) with logic that creates `TransactionLine` records:

```php
// Delete any existing lines (safe re-run)
$this->document->transactionLines()->delete();

// Create one line per AI result
foreach ($classification['lines'] ?? [] as $line) {
    $accountId = Account::where('company_id', $company->id)
        ->where('code', $line['accountCode'])
        ->value('id');

    $this->document->transactionLines()->create([
        'account_id'   => $accountId,
        'account_code' => $line['accountCode'],
        'type'         => $line['type'],
        'category'     => $line['category'],
        'amount'       => $line['amount'],
        'description'  => $line['description'] ?? null,
    ]);
}

// Set document category to the first line's category as a summary
$this->document->category = $classification['lines'][0]['category'] ?? $this->document->category;
```

Remove the old line that set `$this->document->account_id`.

---

### Step 5 — Update `DocumentController.php`

**In `index()` and `clientDocuments()`:** eager-load transaction lines to avoid N+1:
```php
$documents = $query->with('transactionLines')->latest()->get();
```

**In `toListItem()`:** add inflow/outflow:
```php
'inflow'  => (float) $d->transactionLines->where('type', 'income')->sum('amount'),
'outflow' => (float) $d->transactionLines->where('type', 'expense')->sum('amount'),
```

**In `show()`:** eager-load lines:
```php
$document = Document::with(['company', 'ocrResult', 'transactionLines.account'])->findOrFail($id);
```

**In `toDetail()`:** include lines:
```php
'transactionLines' => $d->transactionLines->map(fn($l) => [
    'id'          => $l->id,
    'accountCode' => $l->account_code,
    'accountName' => $l->account?->name,
    'type'        => $l->type,
    'category'    => $l->category,
    'amount'      => (float) $l->amount,
    'description' => $l->description,
])->values(),
```

---

### Step 6 — Frontend changes

**`frontend/src/types/document.ts`** — add to the `Document` interface:
```ts
inflow: number
outflow: number
transactionLines: {
  id: string
  accountCode: string | null
  accountName: string | null
  type: 'income' | 'expense'
  category: string | null
  amount: number
  description: string | null
}[]
```

**Replace `DocumentCard` list with a table in `frontend/src/app/client/documents/page.tsx`.**

Create a new component `frontend/src/components/documents/DocumentsTable.tsx` with these columns:

| Column | Data source |
|---|---|
| Reference | `doc.refNumber` or last 8 chars of `doc.id` |
| Source | Badge: "Upload" (grey) if `!doc.isNoReceipt`, "Manual" (blue) if `doc.isNoReceipt` |
| Uploaded Date | `doc.createdAt` formatted |
| Inflow | `doc.inflow` in green, `formatCurrency()` — blank if 0 |
| Outflow | `doc.outflow` in red, `formatCurrency()` — blank if 0 |
| Status | Existing `<StatusBadge>` component |
| Note | `doc.note` truncated to ~40 chars |

Each row is clickable → `router.push('/client/documents/${doc.id}')`.

---

## Open Question (confirm with user before starting)

**Manual entry scope:** Currently each row in the manual entry form creates one document. The user's example ("500 sales + 200 electricity = one document") implies the manual entry form should also support multiple line items per document.

**Ask the user:** Should manual entry be redesigned now to let users input multiple lines under one document, or is that a follow-up? Do not assume — confirm scope before touching the manual entry form or `ManualEntryRequest`.

---

## What NOT to change

- `documents.amount` — stays as the document total
- `documents.account_id` column — leave it in the DB; stop writing to it but do not drop it
- The OCR pipeline (`ProcessDocumentOCR` job) — untouched
- `DetectAnomalies` job — untouched
- The approval queue (`QueueTable`, `QueueItem`) — untouched for now
