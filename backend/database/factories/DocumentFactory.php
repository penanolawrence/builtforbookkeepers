<?php

namespace Database\Factories;

use App\Models\Company;
use Illuminate\Database\Eloquent\Factories\Factory;

class DocumentFactory extends Factory
{
    public function definition(): array
    {
        return [
            'company_id'        => Company::factory(),
            'uploaded_by'       => \App\Models\User::factory(),
            'original_filename' => $this->faker->word . '.jpg',
            'storage_path'      => 'documents/' . $this->faker->uuid . '.jpg',
            'file_hash'         => $this->faker->sha256,
            'file_type'         => 'jpg',
            'document_type'     => $this->faker->randomElement(['income', 'expense']),
            'status'            => 'parked',
            'internal_status'   => 'READY',
            'flag'              => 'GREEN',
            'is_no_receipt'     => false,
            'is_ocr_failed'     => false,
            'document_date'     => now()->toDateString(),
            'amount'            => $this->faker->randomFloat(2, 50, 10000),
        ];
    }
}
