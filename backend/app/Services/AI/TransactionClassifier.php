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
            "classify a transaction and suggest the correct account code from the provided Chart of Accounts.\n" .
            "Client: {$company->name}\n" .
            "VAT Status: {$vatStatus}\n" .
            "Chart of Accounts:\n{$accounts}\n\n" .
            "Respond ONLY with a JSON object. No explanation. No markdown. Raw JSON only.";

        $isOcrPath = array_key_exists('or_number', $inputData) || array_key_exists('merchant', $inputData);

        if ($isOcrPath) {
            $userPrompt = "Clean and classify this transaction extracted from a receipt via OCR. " .
                "The text may be noisy — normalize dates to YYYY-MM-DD, amounts to float, " .
                "merchant names to proper case.\n" .
                "Raw OCR data: " . json_encode($inputData) . "\n\n" .
                "Return JSON with these exact keys:\n" .
                "{\n" .
                "  \"type\": \"income\" or \"expense\",\n" .
                "  \"category\": \"short category label\",\n" .
                "  \"accountCode\": \"matching code from the Chart of Accounts above\",\n" .
                "  \"confidence\": 0.0 to 1.0,\n" .
                "  \"cleanedFields\": {\n" .
                "    \"merchant\": \"cleaned merchant name or null\",\n" .
                "    \"date\": \"YYYY-MM-DD or null\",\n" .
                "    \"amount\": 0.00,\n" .
                "    \"vat_amount\": 0.00 or null,\n" .
                "    \"or_number\": \"string or null\"\n" .
                "  }\n" .
                "}";
        } else {
            $userPrompt = "Classify this transaction and suggest the correct account code.\n" .
                "Transaction data: " . json_encode($inputData) . "\n\n" .
                "Return JSON with these exact keys:\n" .
                "{\n" .
                "  \"type\": \"income\" or \"expense\",\n" .
                "  \"category\": \"short category label\",\n" .
                "  \"accountCode\": \"matching code from the Chart of Accounts above\",\n" .
                "  \"confidence\": 0.0 to 1.0,\n" .
                "  \"cleanedFields\": {}\n" .
                "}";
        }

        try {
            $client = new Client(apiKey: config('services.anthropic.key'));
            $response = $client->messages->create(
                maxTokens: 512,
                messages: [['role' => 'user', 'content' => $userPrompt]],
                model: 'claude-haiku-4-5-20251001',
                system: $systemPrompt,
                temperature: 0.0,
            );

            $raw = $response->content[0]->text;
            $result = json_decode($raw, true);

            if ($result === null) {
                throw new \RuntimeException("Invalid AI response: {$raw}");
            }

            return $result;
        } catch (\RuntimeException $e) {
            throw $e;
        } catch (\Exception $e) {
            throw new \RuntimeException("AI classification failed: " . $e->getMessage());
        }
    }
}
