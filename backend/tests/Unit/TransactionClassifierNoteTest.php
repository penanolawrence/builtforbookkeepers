<?php

namespace Tests\Unit;

use App\Models\Account;
use App\Models\Company;
use App\Services\AI\TransactionClassifier;
use PHPUnit\Framework\TestCase;

class TransactionClassifierNoteTest extends TestCase
{
    private function makeClassifierWithCapture(?array &$capturedMessages): TransactionClassifier
    {
        $fakeToolInput = [
            'document' => [
                'merchant'     => null,
                'date'         => null,
                'total_amount' => 100.00,
                'vat_amount'   => null,
                'or_number'    => null,
            ],
            'lines' => [[
                'description'  => 'Electricity',
                'amount'       => 100.00,
                'account_code' => '6001',
                'type'         => 'expense',
                'category'     => 'Utilities',
                'date'         => null,
            ]],
            'confidence' => 0.9,
        ];

        $fakeBlock       = new \stdClass();
        $fakeBlock->type = 'tool_use';
        $fakeBlock->name = 'classify_transaction';
        $fakeBlock->input = $fakeToolInput;

        $fakeResponse          = new \stdClass();
        $fakeResponse->content = [$fakeBlock];

        return new class($fakeResponse, $capturedMessages) extends TransactionClassifier {
            public function __construct(
                private mixed $fakeResponse,
                private ?array &$capture,
            ) {
                // skip parent constructor — no real API client needed
            }

            protected function callApi(array $params): mixed
            {
                $this->capture = $params['messages'];
                return $this->fakeResponse;
            }
        };
    }

    private function makeCompany(): Company
    {
        $account       = new Account();
        $account->code = '6001';
        $account->name = 'Utilities';
        $account->type = 'expense';

        $collection = collect([$account]);

        // PHPUnit 12 has no addMethods(); HasMany proxies where() via __call so we
        // cannot stub it on a mock. Use a concrete anonymous stub instead.
        $queryStub = new class($collection) extends \Illuminate\Database\Eloquent\Relations\HasMany {
            public function __construct(private \Illuminate\Support\Collection $rows)
            {
                // skip Relation constructor — no DB connection needed
            }

            public function where(mixed ...$args): static
            {
                return $this;
            }

            public function get($columns = ['*']): \Illuminate\Support\Collection
            {
                return $this->rows;
            }
        };

        $company           = $this->createMock(Company::class);
        $company->name     = 'Test Co';
        $company->bir_type = 'non-vat';
        $company->method('accounts')->willReturn($queryStub);

        return $company;
    }

    public function test_user_note_appears_in_ocr_prompt(): void
    {
        $messages = null;
        $classifier = $this->makeClassifierWithCapture($messages);
        $company    = $this->makeCompany();

        $inputData = [
            'raw_text' => 'Meralco electricity bill total 100',
        ];

        $classifier->classify($inputData, $company, 'Monthly electricity bill from Meralco');

        $this->assertNotNull($messages);
        $promptText = is_string($messages[0]['content'])
            ? $messages[0]['content']
            : json_encode($messages[0]['content']);

        $this->assertStringContainsString(
            'Monthly electricity bill from Meralco',
            $promptText
        );
    }

    public function test_user_note_appears_in_ocr_prompt_with_sections(): void
    {
        $messages = null;
        $classifier = $this->makeClassifierWithCapture($messages);
        $company    = $this->makeCompany();

        $inputData = [
            'raw_text' => 'Meralco electricity bill total 100',
            'header'   => ['MERALCO', 'Account No. 123-456'],
            'body'     => ['Electricity charges: 100.00'],
            'footer'   => ['Total Amount Due: 100.00'],
        ];

        $classifier->classify($inputData, $company, 'Monthly electricity bill from Meralco');

        $this->assertNotNull($messages);
        $promptText = is_string($messages[0]['content'])
            ? $messages[0]['content']
            : json_encode($messages[0]['content']);

        $this->assertStringContainsString(
            'Monthly electricity bill from Meralco',
            $promptText
        );
    }

    public function test_no_note_context_block_when_note_is_null(): void
    {
        $messages = null;
        $classifier = $this->makeClassifierWithCapture($messages);
        $company    = $this->makeCompany();

        $inputData = ['raw_text' => 'Some receipt'];

        $classifier->classify($inputData, $company, null);

        $promptText = is_string($messages[0]['content'])
            ? $messages[0]['content']
            : json_encode($messages[0]['content']);

        $this->assertStringNotContainsString('User-provided context', $promptText);
    }
}
