<?php

namespace Database\Factories;

use Illuminate\Database\Eloquent\Factories\Factory;

class AccountTypeFactory extends Factory
{
    public function definition(): array
    {
        static $prefix = 9000;

        return [
            'name'           => $this->faker->unique()->word(),
            'code_prefix'    => $prefix++,
            'normal_balance' => $this->faker->randomElement(['debit', 'credit']),
            'sort_order'     => $this->faker->numberBetween(1, 99),
        ];
    }
}
