<?php

namespace Tests\Unit;

use App\Models\Account;
use App\Models\Company;
use App\Services\AI\TransactionClassifier;
use PHPUnit\Framework\TestCase;

class TransactionClassifierManualVatIncomeTest extends TestCase
{
    private function makeClassifierCapturingUserMessage(?string &$capturedMessage): TransactionClassifier
    {
        $fakeToolInput = [
            'document' => [
                'merchant' => null, 'date' => null,
                'total_amount' => 100.00, 'vat_amount' => 10.71,
                'or_number' => null, 'payment_method' => null,
            ],
            'lines' => [
                [
                    'description' => 'Sales income', 'amount' => 89.29,
                    'account_code' => '4100', 'type' => 'income',
                    'category' => 'Sales Revenue', 'date' => null,
                ],
                [
                    'description' => 'Output VAT', 'amount' => 10.71,
                    'account_code' => '2101', 'type' => 'income',
                    'category' => 'VAT Payable', 'date' => null,
                ],
            ],
            'confidence' => 0.9,
        ];

        $fakeBlock        = new \stdClass();
        $fakeBlock->type  = 'tool_use';
        $fakeBlock->name  = 'classify_transaction';
        $fakeBlock->input = $fakeToolInput;

        $fakeResponse          = new \stdClass();
        $fakeResponse->content = [$fakeBlock];

        return new class($fakeResponse, $capturedMessage) extends TransactionClassifier {
            public function __construct(
                private mixed $fakeResponse,
                private ?string &$capture,
            ) {}

            protected function fetchSubtypes(): string { return 'Sales Revenue'; }

            protected function callApi(array $params): mixed
            {
                $this->capture = $params['messages'][0]['content'];
                return $this->fakeResponse;
            }
        };
    }

    private function makeCompany(string $birType): Company
    {
        $account       = new Account();
        $account->code = '4100';
        $account->name = 'Sales Revenue';
        $account->type = 'income';

        $collection = collect([$account]);

        $queryStub = new class($collection) extends \Illuminate\Database\Eloquent\Relations\HasMany {
            public function __construct(private \Illuminate\Support\Collection $rows) {}
            public function where(mixed ...$args): static { return $this; }
            public function whereIn(mixed ...$args): static { return $this; }
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

    private function manualInputData(): array
    {
        return ['lines' => [['description' => 'Sales', 'amount' => 100.00]]];
    }

    public function test_vat_client_income_manual_entry_prompt_includes_vat_inclusive_rule(): void
    {
        $message    = null;
        $classifier = $this->makeClassifierCapturingUserMessage($message);
        $company    = $this->makeCompany('vat');

        $classifier->classify($this->manualInputData(), $company, null, 'income');

        $this->assertNotNull($message);
        $this->assertStringContainsString('VAT income rule', $message);
        $this->assertStringContainsString('VAT-inclusive', $message);
        $this->assertStringContainsString('12/112', $message);
        $this->assertStringContainsString('2101', $message);
    }

    public function test_vat_client_expense_manual_entry_prompt_does_not_include_vat_inclusive_rule(): void
    {
        $message    = null;
        $classifier = $this->makeClassifierCapturingUserMessage($message);
        $company    = $this->makeCompany('vat');

        $classifier->classify($this->manualInputData(), $company, null, 'expense');

        $this->assertNotNull($message);
        $this->assertStringNotContainsString('VAT income rule', $message);
        $this->assertStringNotContainsString('12/112', $message);
    }

    public function test_non_vat_client_income_manual_entry_prompt_does_not_include_vat_inclusive_rule(): void
    {
        $message    = null;
        $classifier = $this->makeClassifierCapturingUserMessage($message);
        $company    = $this->makeCompany('non_vat');

        $classifier->classify($this->manualInputData(), $company, null, 'income');

        $this->assertNotNull($message);
        $this->assertStringNotContainsString('VAT income rule', $message);
        $this->assertStringNotContainsString('12/112', $message);
    }
}
