<?php

namespace Tests\Unit;

use App\Services\AI\TransactionClassifier;
use Tests\TestCase;

class TransactionClassifierToolSchemaTest extends TestCase
{
    public function test_vat_amount_schema_has_description(): void
    {
        $classifier = new class extends TransactionClassifier {
            public function expose(): array { return $this->buildTool(); }
        };

        $schema = $classifier->expose();
        $vatProp = $schema['input_schema']['properties']['document']['properties']['vat_amount'];

        $this->assertArrayHasKey('description', $vatProp);
        $this->assertStringContainsString('12/112', $vatProp['description']);
        $this->assertStringContainsString('inclusive', strtolower($vatProp['description']));
        $this->assertStringContainsString('Return null', $vatProp['description']);
    }
}
