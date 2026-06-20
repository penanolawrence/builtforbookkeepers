<?php

namespace Tests\Unit;

use App\Models\Account;
use App\Models\Company;
use App\Services\AI\TransactionClassifier;
use PHPUnit\Framework\TestCase;

class TransactionClassifierAccountantNoteTest extends TestCase
{
    private function makeClassifierCapturingSystem(?string &$capturedSystem): TransactionClassifier
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
                'description'  => 'Rice purchase',
                'amount'       => 100.00,
                'account_code' => '6001',
                'type'         => 'expense',
                'category'     => 'Cost of Goods Sold',
                'date'         => null,
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

            protected function fetchSubtypes(): string { return 'Cost of Goods Sold'; }

            protected function callApi(array $params): mixed
            {
                $this->capture = $params['system'];
                return $this->fakeResponse;
            }
        };
    }

    private function makeCompany(): Company
    {
        $account       = new Account();
        $account->code = '6001';
        $account->name = 'Cost of Goods Sold';
        $account->type = 'expense';

        $collection = collect([$account]);

        $queryStub = new class($collection) extends \Illuminate\Database\Eloquent\Relations\HasMany {
            public function __construct(private \Illuminate\Support\Collection $rows)
            {}

            public function where(mixed ...$args): static { return $this; }

            public function get($columns = ['*']): \Illuminate\Support\Collection
            {
                return $this->rows;
            }
        };

        $company           = $this->createMock(Company::class);
        $company->name     = 'Test Rice Trader';
        $company->bir_type = 'non-vat';
        $company->method('accounts')->willReturn($queryStub);

        return $company;
    }

    public function test_accountant_note_appears_in_system_prompt(): void
    {
        $system     = null;
        $classifier = $this->makeClassifierCapturingSystem($system);
        $company    = $this->makeCompany();

        $classifier->classify(
            ['raw_text' => 'Receipt from supplier'],
            $company,
            null,
            null,
            'Rice and grocery retailer. Main supplier is Magsaysay Trading.',
        );

        $this->assertNotNull($system);
        $this->assertStringContainsString(
            'Client Context (set by accountant)',
            $system,
        );
        $this->assertStringContainsString(
            'Rice and grocery retailer. Main supplier is Magsaysay Trading.',
            $system,
        );
    }

    public function test_no_accountant_note_block_when_null(): void
    {
        $system     = null;
        $classifier = $this->makeClassifierCapturingSystem($system);
        $company    = $this->makeCompany();

        $classifier->classify(['raw_text' => 'Some receipt'], $company, null, null, null);

        $this->assertStringNotContainsString('Client Context (set by accountant)', $system);
    }

    public function test_no_accountant_note_block_when_empty_string(): void
    {
        $system     = null;
        $classifier = $this->makeClassifierCapturingSystem($system);
        $company    = $this->makeCompany();

        $classifier->classify(['raw_text' => 'Some receipt'], $company, null, null, '   ');

        $this->assertStringNotContainsString('Client Context (set by accountant)', $system);
    }
}
