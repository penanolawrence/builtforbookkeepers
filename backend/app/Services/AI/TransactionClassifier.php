<?php

namespace App\Services\AI;

use Anthropic\Client;
use App\Models\ChartOfAccountSubtype;
use App\Models\Company;

class TransactionClassifier
{
    private Client $client;

    public function __construct(?Client $client = null)
    {
        $this->client = $client ?? new Client(apiKey: config('services.anthropic.key'));
    }

    public function classify(array $inputData, Company $company, ?string $userNote = null, ?string $declaredType = null): array
    {
        $accountsQuery = $company->accounts()->where('is_active', true);

        if ($declaredType === 'expense') {
            $accountsQuery->whereIn('type', ['expense', 'asset', 'liability', 'equity']);
        } elseif ($declaredType === 'income') {
            $accountsQuery->whereIn('type', ['income', 'asset', 'liability', 'equity']);
        }

        $accounts = $accountsQuery->get()
            ->map(fn($a) => "{$a->code}: {$a->name} ({$a->type})")
            ->join("\n");

        $subtypes = $this->fetchSubtypes();

        $vatStatus = $company->bir_type === 'vat' ? 'VAT-Registered' : 'Non-VAT';

        $systemPrompt =
            "You are a bookkeeping assistant for a Philippine SME.\n" .
            "Client: {$company->name}\n" .
            "VAT Status: {$vatStatus}\n" .
            "Chart of Accounts:\n{$accounts}\n\n" .
            "Available Subtypes (use exact names only):\n{$subtypes}\n\n" .
            "Rules:\n" .
            "- Each line must use an account_code from the Chart of Accounts above.\n" .
            "- Each line's category MUST be an exact name from the Available Subtypes list above. " .
            "Pick the closest match. Do not invent new category names.\n" .
            "- sum(lines[].amount) MUST equal document.total_amount.\n";

        if ($declaredType) {
            $opposite     = $declaredType === 'expense' ? 'income' : 'expense';
            $systemPrompt .=
                "- The client declared this document as: {$declaredType}. " .
                "ALL lines MUST be type '{$declaredType}' — no exceptions. " .
                "Even if the document contains figures that look like {$opposite}, " .
                "ignore them completely. Do not create any lines for the opposite type.\n";
        } else {
            $systemPrompt .=
                "- For documents that contain BOTH income and expenses (e.g. a daily sales summary with a GROSS SALES figure and an EXPENSES BREAKDOWN section): " .
                "set document.total_amount to the GROSS SALES amount; " .
                "create income line(s) for the sales revenue; " .
                "AND create separate expense line(s) for each expense category listed. " .
                "Do NOT collapse everything into one income line.\n";
        }

        if ($company->bir_type === 'vat') {
            $systemPrompt .=
                "- VAT line rule (client is VAT-Registered): when a VAT amount is present on the document " .
                "(either explicitly printed, or because the total is VAT-inclusive):\n" .
                "  * Create a SEPARATE line for the VAT amount.\n" .
                "  * For expense documents: assign the VAT line to account code 1101 (Input VAT).\n" .
                "  * For income documents: assign the VAT line to account code 2101 (Output VAT).\n" .
                "  * All other expense/income lines must use NET amounts: each line's amount = (the printed AMOUNT column value for that line) ÷ 1.12. Do NOT use the full line total without dividing.\n" .
                "  * Example: receipt AMOUNT column shows ₱25.00 for an item → net expense line = 25.00 ÷ 1.12 = 22.32.\n" .
                "  * sum(lines[].amount) must still equal document.total_amount (the gross total).\n";
        } else {
            $systemPrompt .=
                "- Non-VAT client: include any VAT in the relevant expense or income account — do not create a separate VAT line.\n";
        }

        $systemPrompt .=
            "- For itemized receipts that have an AMOUNT (or TOTAL) column: that column is already QTY × UNIT PRICE — the receipt has done the math. Use only the AMOUNT column as the line amount and disregard the QTY column.\n" .
            "- Use one line for simple single-purpose documents.\n" .
            "- Use multiple lines when the document covers multiple categories, multiple dates, or has an expenses breakdown.\n" .
            "- For each line, always try to assign a date (YYYY-MM-DD). " .
            "For multi-date documents (e.g. daily sales records), each row has its own date. " .
            "For manual entries, extract any date mentioned in the description text " .
            "Return null only if you truly cannot determine the date for that specific line.\n" .
            "- Today's date is " . now()->format('Y-m-d') . ". Dates must never be in the future — transactions cannot be dated after today. " .
            "If an extracted date is in the future, it is likely a misread (e.g. month and day swapped). " .
            "Try swapping month and day to get a valid past date; if that also fails, return null.";

        $isImagePath = array_key_exists('image_base64', $inputData);
        $isOcrPath   = array_key_exists('raw_text', $inputData);

        if ($isImagePath) {
            $messages = $this->buildImageMessages($inputData, $userNote, $declaredType);
        } elseif ($isOcrPath) {
            $messages = [['role' => 'user', 'content' => $this->buildOcrPrompt($inputData, $userNote)]];
        } else {
            $vatIncome = $company->bir_type === 'vat' && $declaredType === 'income';
            $messages  = [['role' => 'user', 'content' => $this->buildManualPrompt($inputData, $userNote, $vatIncome)]];
        }

        try {
            $response = $this->callApi([
                'maxTokens'   => 1536,
                'messages'    => $messages,
                'model'       => 'claude-haiku-4-5-20251001',
                'system'      => $systemPrompt,
                'temperature' => 0.0,
                'tools'       => [$this->buildTool()],
                'tool_choice' => ['type' => 'tool', 'name' => 'classify_transaction'],
            ]);

            $toolBlock = collect($response->content)
                ->first(fn($c) => $c->type === 'tool_use');

            if (!$toolBlock || $toolBlock->name !== 'classify_transaction') {
                throw new \RuntimeException("Claude did not call classify_transaction tool");
            }

            // SDK decodes JSON with associative: true, so input is already a native PHP array
            // (including nested objects like lines[*]); (array) cast is a safe no-op guard.
            $result = (array) $toolBlock->input;

            if (empty($result['lines']) || !is_array($result['lines'])) {
                throw new \RuntimeException("classify_transaction tool returned no lines");
            }

            return $result;

        } catch (\RuntimeException $e) {
            throw $e;
        } catch (\Exception $e) {
            throw new \RuntimeException("AI classification failed: " . $e->getMessage());
        }
    }

    protected function callApi(array $params): mixed
    {
        return $this->client->messages->create(
            maxTokens:   $params['maxTokens'],
            messages:    $params['messages'],
            model:       $params['model'],
            system:      $params['system'],
            temperature: $params['temperature'],
            tools:       $params['tools'],
            toolChoice:  $params['tool_choice'],
        );
    }

    private function buildNoteBlock(?string $userNote): string
    {
        return ($userNote !== null && trim($userNote) !== '')
            ? "\n\nUser-provided context: \"{$userNote}\"\nUse this as additional context when classifying the document."
            : '';
    }

    private function buildImageMessages(array $inputData, ?string $userNote = null, ?string $declaredType = null): array
    {
        $parts = ["This is a document photographed by a Philippine SME client."];

        if ($declaredType) {
            $parts[] = "The client uploaded this as an {$declaredType} document.";
        }

        if ($userNote !== null && trim($userNote) !== '') {
            $parts[] = "The client has provided the following note about this document:\n\"{$userNote}\"\n" .
                       "Use this note as the primary guide when extracting transaction details — " .
                       "it may clarify the merchant, amounts, dates, or what the document covers.";
        }

        if ($declaredType) {
            $opposite = $declaredType === 'expense' ? 'income' : 'expense';
            $parts[]  = "Only extract {$declaredType} transactions from this document.\n" .
                        "Even if the document contains {$opposite} figures, ignore them completely.\n" .
                        "Classify ALL lines as {$declaredType} — no exceptions.";
        } else {
            $parts[] = "It may be a receipt, invoice, daily sales summary, or cash collection report.\n\n" .
                       "If it contains BOTH a gross sales/income figure AND an expenses breakdown, " .
                       "create income line(s) for the sales AND separate expense line(s) — do not merge them.";
        }

        $parts[] = "Extract all structured fields and classify the transaction using the classify_transaction tool.";

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
                    'text' => implode("\n\n", $parts),
                ],
            ],
        ]];
    }

    private function buildOcrPrompt(array $inputData, ?string $userNote = null): string
    {
        $noteBlock = $this->buildNoteBlock($userNote);

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

    private function buildManualPrompt(array $inputData, ?string $userNote = null, bool $vatIncome = false): string
    {
        $noteBlock = $this->buildNoteBlock($userNote);

        $vatIncomeInstruction = '';
        if ($vatIncome) {
            $vatIncomeInstruction =
                "\n\nVAT income rule: This client is VAT-registered and this is an income entry. " .
                "Always treat the entered amounts as VAT-inclusive. " .
                "Compute vat_amount = total_amount × 12/112. " .
                "Create a separate Output VAT line assigned to account 2101.";
        }

        return "The client has manually entered this transaction. " .
               "Assign the correct account_code and category to each line from the Chart of Accounts. " .
               "Also extract any dates mentioned in the description text " .
               "(e.g. 'kita kahapon 2026-05-28' → date: '2026-05-28').\n\n" .
               "Transaction data: " . json_encode($inputData) . "\n\n" .
               "Classify using the classify_transaction tool. " .
               "For document.merchant, document.date, document.or_number — return null " .
               "(those fields are already set on the document)." .
               $vatIncomeInstruction .
               $noteBlock;
    }

    protected function fetchSubtypes(): string
    {
        return ChartOfAccountSubtype::orderBy('name')->pluck('name')->join("\n");
    }

    protected function buildTool(): array
    {
        return [
            'name'         => 'classify_transaction',
            'description'  => 'Classify a Philippine SME transaction and return structured line items.',
            'input_schema' => [
                'type'       => 'object',
                'required'   => ['document', 'lines', 'confidence'],
                'properties' => [

                    'document' => [
                        'type'       => 'object',
                        'required'   => ['total_amount'],
                        'properties' => [
                            'merchant'       => ['type' => ['string', 'null'],
                                                'description' => 'Business or store name, or null'],
                            'merchant_tin'   => ['type' => ['string', 'null'],
                                                'description' => 'TIN number of the merchant/seller visible on the receipt (e.g. 123-456-789-000), or null if not shown'],
                            'date'           => ['type' => ['string', 'null'],
                                                'description' => 'YYYY-MM-DD or null'],
                            'total_amount'   => ['type' => 'number',  'minimum' => 0.01,
                                                'description' => 'Final total amount on the document'],
                            'vat_amount'     => [
                                'type'        => ['number', 'null'],
                                'minimum'     => 0,
                                'description' => 'VAT amount for this document. Use these rules in order: (1) If a VAT figure is explicitly printed, use that value. (2) If the document or user note says it is VAT-inclusive (e.g. "inclusive of VAT", "VAT inclusive", "inc. VAT"), calculate as total_amount × 12/112. (3) If the merchant/seller on the receipt is identified as VAT-registered — shown by text such as "VAT Reg. TIN", "VAT Registration No.", "VAT REG No.", or a TIN labeled as VAT-registered — the total is VAT-inclusive under Philippine tax law even if no VAT amount is printed; calculate as total_amount × 12/112. Return null only if none of the above apply.',
                            ],
                            'or_number'      => ['type' => ['string', 'null'],
                                                'description' => 'Official Receipt or invoice number'],
                            'payment_method' => [
                                'type'        => ['string', 'null'],
                                'enum'        => ['cash', 'gcash', 'maya', 'bank', null],
                                'description' => 'Payment method visible on the document (e.g. GCash QR, Maya logo, bank transfer slip). Return null if not determinable — the system defaults to cash.',
                            ],
                        ],
                    ],

                    'lines' => [
                        'type'     => 'array',
                        'minItems' => 1,
                        'items'    => [
                            'type'       => 'object',
                            'required'   => ['description', 'amount', 'account_code', 'type', 'category'],
                            'properties' => [
                                'description'  => ['type' => 'string',
                                                   'description' => 'What this line covers'],
                                'amount'       => ['type' => 'number', 'minimum' => 0.01,
                                                   'description' => 'The net amount for this line after VAT split (for VAT-registered clients) or the gross amount (for non-VAT clients). For VAT-registered clients: take the printed AMOUNT column value and divide by 1.12. For itemized receipts with an AMOUNT or TOTAL column: use only that column — it is already QTY × UNIT PRICE, so disregard QTY.'],
                                'account_code' => ['type' => 'string',
                                                   'description' => 'Code from the Chart of Accounts'],
                                'type'         => ['type' => 'string', 'enum' => ['income', 'expense']],
                                'category'     => ['type' => 'string',
                                                   'description' => 'Exact subtype name from the Available Subtypes list in the system prompt. Must match exactly.'],
                                'date'         => [
                                    'type'        => ['string', 'null'],
                                    'description' => 'YYYY-MM-DD posting date for this specific line. ' .
                                                     'For multi-date documents, each row gets its own date. ' .
                                                     'For manual entries, extract from description text. ' .
                                                     'Return null only if you cannot determine the date.',
                                ],
                            ],
                        ],
                    ],

                    'confidence' => [
                        'type'    => 'number',
                        'minimum' => 0,
                        'maximum' => 1,
                        'description' => 'How confident you are in the classification (0–1)',
                    ],
                ],
            ],
        ];
    }
}
