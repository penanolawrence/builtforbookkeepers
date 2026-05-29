<?php

namespace App\Services\AI;

use Anthropic\Client;
use App\Models\Company;

class TransactionClassifier
{
    public function classify(array $inputData, Company $company): array
    {
        $accounts = $company->accounts()->where('is_active', true)->get()
            ->map(fn($a) => "{$a->code}: {$a->name} ({$a->type})")
            ->join("\n");

        $vatStatus = $company->bir_type === 'vat' ? 'VAT-Registered' : 'Non-VAT';

        $systemPrompt = "You are a bookkeeping assistant for a Philippine SME. Your job is to " .
            "classify a transaction and suggest the correct account code(s) from the provided Chart of Accounts.\n" .
            "Client: {$company->name}\n" .
            "VAT Status: {$vatStatus}\n" .
            "Chart of Accounts:\n{$accounts}\n\n" .
            "Rules:\n" .
            "- Each line must use an accountCode from the Chart of Accounts above.\n" .
            "- sum(lines[].amount) MUST equal totalAmount.\n" .
            "- Use one line for simple single-purpose documents.\n" .
            "- Use multiple lines only when the document clearly covers multiple categories.\n" .
            "Respond ONLY with a JSON object. No explanation. No markdown. Raw JSON only.";

        $isOcrPath = array_key_exists('or_number', $inputData)
                  || array_key_exists('merchant', $inputData);

        if ($isOcrPath) {
            $userPrompt = "Clean and classify this transaction extracted from a receipt via OCR. " .
                "The text may be noisy — normalize dates to YYYY-MM-DD, amounts to float, " .
                "merchant names to proper case.\n" .
                "Raw OCR data: " . json_encode($inputData) . "\n\n" .
                "Return JSON with EXACTLY these keys:\n" .
                "{\n" .
                "  \"lines\": [\n" .
                "    {\n" .
                "      \"accountCode\": \"matching code from Chart of Accounts\",\n" .
                "      \"type\": \"income\" or \"expense\",\n" .
                "      \"category\": \"short category label\",\n" .
                "      \"amount\": 0.00,\n" .
                "      \"description\": \"brief description of what this line covers\"\n" .
                "    }\n" .
                "  ],\n" .
                "  \"totalAmount\": 0.00,\n" .
                "  \"confidence\": 0.0 to 1.0,\n" .
                "  \"cleanedFields\": {\n" .
                "    \"merchant\": \"cleaned name or null\",\n" .
                "    \"date\": \"YYYY-MM-DD or null\",\n" .
                "    \"vat_amount\": 0.00 or null,\n" .
                "    \"or_number\": \"string or null\"\n" .
                "  }\n" .
                "}";
        } else {
            // Manual entry path: lines array is already provided by the client
            $userPrompt = "The client has already split this transaction into lines. " .
                "Assign the correct account code and category to each line from the Chart of Accounts.\n" .
                "Transaction data: " . json_encode($inputData) . "\n\n" .
                "Return JSON with EXACTLY these keys:\n" .
                "{\n" .
                "  \"lines\": [\n" .
                "    {\n" .
                "      \"accountCode\": \"matching code from Chart of Accounts\",\n" .
                "      \"type\": \"income\" or \"expense\",\n" .
                "      \"category\": \"short category label\",\n" .
                "      \"amount\": 0.00,\n" .
                "      \"description\": \"same description as input\"\n" .
                "    }\n" .
                "  ],\n" .
                "  \"totalAmount\": 0.00,\n" .
                "  \"confidence\": 0.0 to 1.0,\n" .
                "  \"cleanedFields\": {}\n" .
                "}";
        }

        try {
            $client = new Client(apiKey: config('services.anthropic.key'));
            $response = $client->messages->create(
                maxTokens: 1024,
                messages:  [['role' => 'user', 'content' => $userPrompt]],
                model:     'claude-haiku-4-5-20251001',
                system:    $systemPrompt,
                temperature: 0.0,
            );

            $raw    = $response->content[0]->text;
            $result = json_decode($raw, true);

            if ($result === null || !isset($result['lines']) || !is_array($result['lines']) || empty($result['lines'])) {
                throw new \RuntimeException("Invalid AI response — expected non-empty 'lines' array: {$raw}");
            }

            return $result;
        } catch (\RuntimeException $e) {
            throw $e;
        } catch (\Exception $e) {
            throw new \RuntimeException("AI classification failed: " . $e->getMessage());
        }
    }
}
