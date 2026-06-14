<?php

namespace Tests\Unit;

use App\Models\Account;
use App\Models\Company;
use App\Services\AI\TransactionClassifier;
use PHPUnit\Framework\TestCase;

class TransactionClassifierVatPromptTest extends TestCase
{
    private function makeClassifierCapturingSystem(?string &$capturedSystem): TransactionClassifier
    {
        $fakeToolInput = [
            'document' => [
                'merchant' => null, 'date' => null,
                'total_amount' => 100.00, 'vat_amount' => null, 'or_number' => null,
            ],
            'lines' => [[
                'description' => 'Test', 'amount' => 100.00,
                'account_code' => '5100', 'type' => 'expense',
                'category' => 'Miscellaneous', 'date' => null,
            ]],
            'confidence' => 0.9,
        ];

        $fakeBlock        = new \stdClass();
        $fakeBlock->type  = 'tool_use';
        $fakeBlock->name  = 'classify_transaction';
        $fakeBlock->input = $fakeToolInput;

        $fakeResponse          = new \stdClass();
        $fakeResponse->content = [$fakeBlock];

        return new class($fakeResponse, $capturedSystem) extends TransactionClassifier {
            public function __construct(
                private mixed $fakeResponse,
                private ?string &$capture,
            ) {}

            protected function fetchSubtypes(): string { return 'Miscellaneous'; }

            protected function callApi(array $params): mixed
            {
                $this->capture = $params['system'];
                return $this->fakeResponse;
            }
        };
    }

    private function makeCompany(string $birType): Company
    {
        $account       = new Account();
        $account->code = '5100';
        $account->name = 'Expense Account';
        $account->type = 'expense';

        $collection = collect([$account]);

        $queryStub = new class($collection) extends \Illuminate\Database\Eloquent\Relations\HasMany {
            public function __construct(private \Illuminate\Support\Collection $rows)
            {}

            public function where(mixed ...$args): static { return $this; }
            public function get($columns = ['*']): \Illuminate\Support\Collection { return $this->rows; }
        };

        $company = $this->getMockBuilder(Company::class)
            ->onlyMethods(['accounts'])
            ->disableOriginalConstructor()
            ->getMock();
        $company->forceFill(['name' => 'Test Company', 'bir_type' => $birType]);
        $company->method('accounts')->willReturn($queryStub);

        return $company;
    }

    public function test_vat_client_system_prompt_instructs_input_vat_account(): void
    {
        $system     = null;
        $classifier = $this->makeClassifierCapturingSystem($system);
        $company    = $this->makeCompany('vat');

        $classifier->classify(['raw_text' => 'Receipt total 1120'], $company);

        $this->assertNotNull($system);
        $this->assertStringContainsString('1101', $system);
        $this->assertStringContainsString('Input VAT', $system);
        $this->assertStringContainsString('2101', $system);
        $this->assertStringContainsString('Output VAT', $system);
        $this->assertStringContainsString('NET', $system);
    }

    public function test_non_vat_client_system_prompt_does_not_mention_input_vat_account(): void
    {
        $system     = null;
        $classifier = $this->makeClassifierCapturingSystem($system);
        $company    = $this->makeCompany('non_vat');

        $classifier->classify(['raw_text' => 'Receipt total 100'], $company);

        $this->assertNotNull($system);
        $this->assertStringNotContainsString('1101', $system);
        $this->assertStringNotContainsString('Input VAT', $system);
        $this->assertStringContainsString('Non-VAT', $system);
    }
}
