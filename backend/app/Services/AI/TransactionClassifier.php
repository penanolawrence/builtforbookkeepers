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

    public function classify(array $inputData, Company $company): array
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
            "- sum(lines[].amount) MUST equal document.total_amount.\n" .
            "- Use one line for simple single-purpose documents.\n" .
            "- Use multiple lines when the document clearly covers multiple categories or multiple dates.\n" .
            "- For each line, always try to assign a date (YYYY-MM-DD). " .
            "For multi-date documents (e.g. daily sales records), each row has its own date. " .
            "For manual entries, extract any date mentioned in the description text " .
            "(e.g. 'kita kahapon 2026-05-28' → date: '2026-05-28'). " .
            "Return null only if you truly cannot determine the date for that specific line.";

        $isOcrPath   = array_key_exists('raw_text', $inputData);
        $userPrompt  = $isOcrPath
            ? $this->buildOcrPrompt($inputData)
            : $this->buildManualPrompt($inputData);

        try {
            $response = $this->callApi([
                'maxTokens'   => 1536,
                'messages'    => [['role' => 'user', 'content' => $userPrompt]],
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
            tool_choice: $params['tool_choice'],
        );
    }

    private function buildOcrPrompt(array $inputData): string
    {
        $sections = [];

        if (!empty($inputData['header'])) {
            $sections[] = "HEADER (store name, address, BIR TIN):\n" .
                          implode("\n", $inputData['header']);
        }
        if (!empty($inputData['body'])) {
            $sections[] = "BODY (items, quantities, unit prices):\n" .
                          implode("\n", $inputData['body']);
        }
        if (!empty($inputData['footer'])) {
            $sections[] = "FOOTER (totals, VAT, OR number):\n" .
                          implode("\n", $inputData['footer']);
        }

        if (empty($sections)) {
            $sections[] = "Full receipt text:\n" . ($inputData['raw_text'] ?? '');
        }

        return "You are reading a receipt photographed by a Philippine SME client.\n" .
               "The text below was extracted by OCR — it may contain noise or misread characters.\n\n" .
               "Receipt sections:\n\n" . implode("\n\n", $sections) . "\n\n" .
               "Extract all structured fields and classify the transaction " .
               "using the classify_transaction tool.";
    }

    private function buildManualPrompt(array $inputData): string
    {
        return "The client has manually entered this transaction. " .
               "Assign the correct account_code and category to each line from the Chart of Accounts. " .
               "Also extract any dates mentioned in the description text " .
               "(e.g. 'kita kahapon 2026-05-28' → date: '2026-05-28').\n\n" .
               "Transaction data: " . json_encode($inputData) . "\n\n" .
               "Classify using the classify_transaction tool. " .
               "For document.merchant, document.date, document.or_number — return null " .
               "(those fields are already set on the document).";
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
