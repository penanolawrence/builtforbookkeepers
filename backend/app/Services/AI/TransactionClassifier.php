<?php

namespace App\Services\AI;

use Anthropic\Client;
use App\Models\Company;

class TransactionClassifier
{
    private Client $client;

    public function __construct(?Client $client = null)
    {
        $this->client = $client ?? new Client(apiKey: config('services.anthropic.key'));
    }

    public function classify(array $inputData, Company $company, ?string $userNote = null): array
    {
        $accounts = $company->accounts()->where('is_active', true)->get()
            ->map(fn($a) => "{$a->code}: {$a->name} ({$a->type})")
            ->join("\n");

        $vatStatus = $company->bir_type === 'vat' ? 'VAT-Registered' : 'Non-VAT';

        $systemPrompt =
            "You are a bookkeeping assistant for a Philippine SME.\n" .
            "Client: {$company->name}\n" .
            "VAT Status: {$vatStatus}\n" .
            "Chart of Accounts:\n{$accounts}\n\n" .
            "Rules:\n" .
            "- Each line must use an account_code from the Chart of Accounts above.\n" .
            "- For simple single-type documents (all income OR all expense), sum(lines[].amount) MUST equal document.total_amount.\n" .
            "- For documents that contain BOTH income and expenses (e.g. a daily sales summary with a GROSS SALES figure and an EXPENSES BREAKDOWN section): " .
            "set document.total_amount to the GROSS SALES amount; " .
            "create income line(s) for the sales revenue; " .
            "AND create separate expense line(s) for each expense category listed. " .
            "Do NOT collapse everything into one income line.\n" .
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
            $messages = $this->buildImageMessages($inputData, $userNote);
        } elseif ($isOcrPath) {
            $messages = [['role' => 'user', 'content' => $this->buildOcrPrompt($inputData, $userNote)]];
        } else {
            $messages = [['role' => 'user', 'content' => $this->buildManualPrompt($inputData, $userNote)]];
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

    private function buildTool(): array
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
                            'merchant'     => ['type' => ['string', 'null'],
                                              'description' => 'Business or store name, or null'],
                            'date'         => ['type' => ['string', 'null'],
                                              'description' => 'YYYY-MM-DD or null'],
                            'total_amount' => ['type' => 'number',  'minimum' => 0.01,
                                              'description' => 'Final total amount on the document'],
                            'vat_amount'   => ['type' => ['number', 'null'], 'minimum' => 0],
                            'or_number'    => ['type' => ['string', 'null'],
                                              'description' => 'Official Receipt or invoice number'],
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
                                'amount'       => ['type' => 'number', 'minimum' => 0.01],
                                'account_code' => ['type' => 'string',
                                                   'description' => 'Code from the Chart of Accounts'],
                                'type'         => ['type' => 'string', 'enum' => ['income', 'expense']],
                                'category'     => ['type' => 'string',
                                                   'description' => 'Short category label'],
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
