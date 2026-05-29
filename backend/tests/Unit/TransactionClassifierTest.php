<?php

namespace Tests\Unit;

use App\Models\Company;
use App\Services\AI\TransactionClassifier;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class TransactionClassifierTest extends TestCase
{
    use RefreshDatabase;

    // -----------------------------------------------------------------------
    // Fake response helpers
    // -----------------------------------------------------------------------

    private function fakeToolResponse(array $lines, array $document = []): object
    {
        $block = (object) [
            'type'  => 'tool_use',
            'name'  => 'classify_transaction',
            'input' => [
                'document' => array_merge([
                    'merchant'     => 'TEST STORE',
                    'date'         => '2026-05-29',
                    'total_amount' => array_sum(array_column($lines, 'amount')),
                    'vat_amount'   => null,
                    'or_number'    => null,
                ], $document),
                'lines'      => $lines,
                'confidence' => 0.95,
            ],
        ];

        return (object) ['content' => [$block]];
    }

    private function defaultLine(array $overrides = []): array
    {
        return array_merge([
            'description'  => 'Test item',
            'amount'       => 100.00,
            'account_code' => '4001',
            'type'         => 'income',
            'category'     => 'Sales Revenue',
            'date'         => '2026-05-29',
        ], $overrides);
    }

    private function makeCompany(): Company
    {
        return Company::factory()->create(['bir_type' => 'non_vat']);
    }

    // -----------------------------------------------------------------------
    // Spy subclass — captures params sent to Claude, returns fake response
    // -----------------------------------------------------------------------

    private function makeClassifier(mixed $fakeResponse): TransactionClassifier
    {
        return new class($fakeResponse) extends TransactionClassifier {
            public array $capturedParams = [];

            public function __construct(private mixed $fakeResp)
            {
                // skip parent constructor — no real client needed
            }

            protected function callApi(array $params): mixed
            {
                $this->capturedParams = $params;
                return $this->fakeResp;
            }
        };
    }

    // -----------------------------------------------------------------------
    // Tests
    // -----------------------------------------------------------------------

    public function test_classify_returns_lines_and_document_from_tool_response(): void
    {
        $company  = $this->makeCompany();
        $response = $this->fakeToolResponse([$this->defaultLine()]);
        $cls      = $this->makeClassifier($response);

        $result = $cls->classify(['raw_text' => 'TEST', 'header' => [], 'body' => [], 'footer' => []], $company);

        $this->assertArrayHasKey('lines', $result);
        $this->assertArrayHasKey('document', $result);
        $this->assertCount(1, $result['lines']);
        $this->assertEquals('4001', $result['lines'][0]['account_code']);
    }

    public function test_classify_throws_when_no_tool_block_returned(): void
    {
        $company      = $this->makeCompany();
        $fakeResponse = (object) ['content' => [(object) ['type' => 'text', 'text' => 'oops']]];
        $cls          = $this->makeClassifier($fakeResponse);

        $this->expectException(\RuntimeException::class);
        $this->expectExceptionMessageMatches('/classify_transaction/');

        $cls->classify(['raw_text' => 'TEST', 'header' => [], 'body' => [], 'footer' => []], $company);
    }

    public function test_ocr_prompt_includes_header_body_footer_sections(): void
    {
        $company = $this->makeCompany();
        $cls     = $this->makeClassifier($this->fakeToolResponse([$this->defaultLine()]));

        $cls->classify([
            'raw_text' => 'ignored',
            'header'   => ['JOLLIBEE FOOD CORP', 'TIN: 001-234-567'],
            'body'     => ['Chicken Joy x2', '220.00'],
            'footer'   => ['Total: 220.00', 'OR No: 9999'],
        ], $company);

        $userMessage = $cls->capturedParams['messages'][0]['content'];

        $this->assertStringContainsString('HEADER', $userMessage);
        $this->assertStringContainsString('JOLLIBEE FOOD CORP', $userMessage);
        $this->assertStringContainsString('BODY', $userMessage);
        $this->assertStringContainsString('Chicken Joy x2', $userMessage);
        $this->assertStringContainsString('FOOTER', $userMessage);
        $this->assertStringContainsString('OR No: 9999', $userMessage);
    }

    public function test_ocr_prompt_falls_back_to_raw_text_when_sections_empty(): void
    {
        $company = $this->makeCompany();
        $cls     = $this->makeClassifier($this->fakeToolResponse([$this->defaultLine()]));

        $cls->classify([
            'raw_text' => 'SOME RAW TEXT HERE',
            'header'   => [],
            'body'     => [],
            'footer'   => [],
        ], $company);

        $userMessage = $cls->capturedParams['messages'][0]['content'];
        $this->assertStringContainsString('SOME RAW TEXT HERE', $userMessage);
    }

    public function test_manual_prompt_includes_lines_and_date_extraction_instruction(): void
    {
        $company = $this->makeCompany();
        $cls     = $this->makeClassifier($this->fakeToolResponse([$this->defaultLine()]));

        $cls->classify([
            'declared_type' => 'expense',
            'date'          => '2026-05-29',
            'paymentMethod' => 'Cash',
            'lines'         => [['description' => 'kita kahapon 2026-05-28', 'amount' => 500]],
        ], $company);

        $userMessage = $cls->capturedParams['messages'][0]['content'];
        $this->assertStringContainsString('kita kahapon', $userMessage);
        $this->assertStringContainsString('date', strtolower($userMessage));
    }

    public function test_tool_schema_enforces_date_per_line_and_required_fields(): void
    {
        $company = $this->makeCompany();
        $cls     = $this->makeClassifier($this->fakeToolResponse([$this->defaultLine()]));

        $cls->classify(['raw_text' => 'x', 'header' => [], 'body' => [], 'footer' => []], $company);

        $tools      = $cls->capturedParams['tools'];
        $this->assertCount(1, $tools);
        $schema     = $tools[0]['input_schema'];
        $lineProps  = $schema['properties']['lines']['items']['properties'];

        $this->assertArrayHasKey('date', $lineProps);
        $this->assertArrayHasKey('account_code', $lineProps);
        $this->assertContains('income', $lineProps['type']['enum']);
        $this->assertContains('expense', $lineProps['type']['enum']);

        // tool_choice must force the tool
        $this->assertEquals(['type' => 'tool', 'name' => 'classify_transaction'], $cls->capturedParams['tool_choice']);
    }

    public function test_per_line_date_is_returned_in_result(): void
    {
        $company = $this->makeCompany();
        $lines   = [
            $this->defaultLine(['date' => '2026-05-25', 'amount' => 2500.00]),
            $this->defaultLine(['date' => '2026-05-26', 'amount' => 3000.00]),
        ];
        $cls = $this->makeClassifier($this->fakeToolResponse($lines, ['total_amount' => 5500.00]));

        $result = $cls->classify(['raw_text' => 'x', 'header' => [], 'body' => [], 'footer' => []], $company);

        $this->assertEquals('2026-05-25', $result['lines'][0]['date']);
        $this->assertEquals('2026-05-26', $result['lines'][1]['date']);
    }
}
