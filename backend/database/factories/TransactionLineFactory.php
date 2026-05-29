<?php

namespace Database\Factories;

use App\Models\Document;
use Illuminate\Database\Eloquent\Factories\Factory;

class TransactionLineFactory extends Factory
{
    public function definition(): array
    {
        return [
            'document_id'  => Document::factory(),
            'account_id'   => null,
            'account_code' => null,
            'type'         => $this->faker->randomElement(['income', 'expense']),
            'category'     => $this->faker->words(2, true),
            'amount'       => $this->faker->randomFloat(2, 10, 5000),
            'description'  => $this->faker->sentence(3),
            'date'         => $this->faker->dateTimeBetween('-1 year', 'now')->format('Y-m-d'),
        ];
    }
}
